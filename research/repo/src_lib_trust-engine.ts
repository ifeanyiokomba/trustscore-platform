import type {
  Evidence,
  RiskBand,
  TrustDecision,
  TrustDimensions,
  TrustScoreResult,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Trust Policy — configurable, versioned, evolvable without rewriting logic.
// Dimensions (per directive):
//   Identity Confidence   0..200
//   Account Confidence    0..200
//   Phone Confidence       0..100
//   Reputation/Risk       -250..+100
//   Resolution/Consistency -100..+100
// Final score constrained: 300 ≤ score ≤ 1000
// ---------------------------------------------------------------------------

export interface TrustPolicyConfig {
  version: string;
  base: number; // 300 — floor
  weights: {
    identity: number; // 200
    account: number; // 200
    phone: number; // 100
    reputationMax: number; // 250 (negative weight cap)
    reputationBonus: number; // 100
    resolutionMax: number; // 100
  };
  bands: Array<{ band: RiskBand; min: number; max: number }>;
  decisions: Record<
    RiskBand,
    TrustDecision
  >;
}

export const DEFAULT_POLICY: TrustPolicyConfig = {
  version: "2025.03.1",
  base: 300,
  weights: {
    identity: 200,
    account: 200,
    phone: 100,
    reputationMax: 250,
    reputationBonus: 100,
    resolutionMax: 100,
  },
  bands: [
    { band: "CRITICAL", min: 300, max: 449 },
    { band: "HIGH", min: 450, max: 549 },
    { band: "ELEVATED", min: 550, max: 649 },
    { band: "MODERATE", min: 650, max: 749 },
    { band: "LOW", min: 750, max: 849 },
    { band: "VERY_LOW", min: 850, max: 1000 },
  ],
  decisions: {
    CRITICAL: "DECLINE",
    HIGH: "DECLINE",
    ELEVATED: "REVIEW",
    MODERATE: "REVIEW",
    LOW: "APPROVE",
    VERY_LOW: "APPROVE",
    UNKNOWN: "INSUFFICIENT",
  },
};

const SIGNAL_WEIGHTS: Record<string, { dim: keyof TrustDimensions; pts: number }> = {
  IDENTITY_VERIFIED: { dim: "identity", pts: 200 },
  NIN_VERIFIED: { dim: "identity", pts: 150 },
  BVN_EXISTS: { dim: "identity", pts: 100 },
  FACE_MATCH: { dim: "identity", pts: 50 },

  ACCOUNT_NAME_VERIFIED: { dim: "account", pts: 200 },
  ACCOUNT_NAME_MISMATCH: { dim: "account", pts: -200 },

  PHONE_ACTIVE: { dim: "phone", pts: 100 },
  PHONE_INACTIVE: { dim: "phone", pts: -100 },

  NO_CONFIRMED_FRAUD_FLAGS: { dim: "reputation", pts: 100 },
  ACTIVE_FRAUD_FLAG: { dim: "reputation", pts: -250 },
  RESOLVED_FRAUD_FLAG: { dim: "resolution", pts: -50 },
  PREVIOUS_CHECKS_PASS: { dim: "resolution", pts: 60 },

  FACE_MISMATCH: { dim: "identity", pts: -80 },
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function computeTrustScore(
  evidence: Evidence[],
  policy: TrustPolicyConfig = DEFAULT_POLICY,
  opts: { hasActiveFlag?: boolean; hasResolvedFlag?: boolean; previousChecksPass?: boolean } = {}
): TrustScoreResult {
  const dimensions: TrustDimensions = {
    identity: 0,
    account: 0,
    phone: 0,
    reputation: 0,
    resolution: 0,
  };

  const signals: string[] = [];

  for (const ev of evidence) {
    const w = SIGNAL_WEIGHTS[ev.kind];
    if (!w) continue;
    dimensions[w.dim] += w.pts * Math.max(0.35, ev.confidence);
    if (ev.confidence >= 0.6) signals.push(ev.kind);
  }

  // policy-derived reputation bonuses (no evidence-based flags handled above)
  if (opts.hasActiveFlag) {
    dimensions.reputation += -250;
    signals.push("ACTIVE_FRAUD_FLAG");
  }
  if (!opts.hasActiveFlag && evidence.some((e) => e.kind === "ACCOUNT_NAME_VERIFIED" || e.kind === "IDENTITY_VERIFIED" || e.kind === "PHONE_ACTIVE")) {
    if (!signals.includes("NO_CONFIRMED_FRAUD_FLAGS")) {
      dimensions.reputation += policy.weights.reputationBonus;
      signals.push("NO_CONFIRMED_FRAUD_FLAGS");
    }
  }
  if (opts.hasResolvedFlag) {
    dimensions.resolution += -50;
    if (!signals.includes("RESOLVED_FRAUD_FLAG")) signals.push("RESOLVED_FRAUD_FLAG");
  }
  if (opts.previousChecksPass) {
    dimensions.resolution += 60;
    if (!signals.includes("PREVIOUS_CHECKS_PASS")) signals.push("PREVIOUS_CHECKS_PASS");
  }

  // clamp each dimension to its allowed range
  dimensions.identity = clamp(dimensions.identity, 0, policy.weights.identity);
  dimensions.account = clamp(dimensions.account, 0, policy.weights.account);
  dimensions.phone = clamp(dimensions.phone, 0, policy.weights.phone);
  dimensions.reputation = clamp(dimensions.reputation, -policy.weights.reputationMax, policy.weights.reputationBonus);
  dimensions.resolution = clamp(dimensions.resolution, -policy.weights.resolutionMax, policy.weights.resolutionMax);

  // sufficiency check: need at least one identity OR account evidence
  const sufficient = evidence.some(
    (e) =>
      ["IDENTITY_VERIFIED", "ACCOUNT_NAME_VERIFIED", "NIN_VERIFIED", "BVN_EXISTS", "PHONE_ACTIVE"].includes(
        e.kind
      ) && e.confidence >= 0.5
  );

  if (!sufficient) {
    return {
      score: -1,
      riskBand: "UNKNOWN",
      decision: "INSUFFICIENT",
      signals: ["INSUFFICIENT_EVIDENCE"],
      dimensions,
      policyVersion: policy.version,
      calculatedAt: new Date().toISOString(),
    };
  }

  const raw =
    policy.base + dimensions.identity + dimensions.account + dimensions.phone + dimensions.reputation + dimensions.resolution;
  const score = clamp(raw, 300, 1000);

  const band = policy.bands.find((b) => score >= b.min && score <= b.max)?.band ?? "UNKNOWN";
  const decision = policy.decisions[band] ?? "INSUFFICIENT";

  return {
    score,
    riskBand: band,
    decision,
    signals: Array.from(new Set(signals)),
    dimensions,
    policyVersion: policy.version,
    calculatedAt: new Date().toISOString(),
  };
}

export function bandToColor(band: RiskBand): string {
  switch (band) {
    case "VERY_LOW":
      return "var(--ts-very-low)";
    case "LOW":
      return "var(--ts-low)";
    case "MODERATE":
      return "var(--ts-moderate)";
    case "ELEVATED":
      return "var(--ts-elevated)";
    case "HIGH":
      return "var(--ts-high)";
    case "CRITICAL":
      return "var(--ts-critical)";
    default:
      return "var(--ts-unknown)";
  }
}

export function bandLabel(band: RiskBand): string {
  switch (band) {
    case "VERY_LOW":
      return "Very Low Risk";
    case "LOW":
      return "Low Risk";
    case "MODERATE":
      return "Moderate Risk";
    case "ELEVATED":
      return "Elevated Risk";
    case "HIGH":
      return "High Risk";
    case "CRITICAL":
      return "Critical Risk";
    default:
      return "Unknown";
  }
}

export function decisionLabel(d: TrustDecision): string {
  switch (d) {
    case "APPROVE":
      return "Approve";
    case "REVIEW":
      return "Manual Review";
    case "DECLINE":
      return "Decline";
    default:
      return "Insufficient Evidence";
  }
}
