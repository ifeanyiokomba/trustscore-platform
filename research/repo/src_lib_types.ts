// TrustScore shared domain types (used across API + UI).

export type SubjectType = "PHONE" | "BANK_ACCOUNT" | "PERSON" | "IDENTITY";

export type VerificationKind = "PHONE" | "ACCOUNT" | "FACE" | "IDENTITY";

export type ProviderName =
  | "NIBSS"
  | "NIMC"
  | "DOJAH"
  | "SMILE_ID"
  | "YOUVERIFY"
  | "MOCK";

export type VerificationStatus =
  | "VERIFIED"
  | "FAILED"
  | "PROVIDER_ERROR"
  | "TIMEOUT"
  | "PARTIAL"
  | "LOW_CONFIDENCE";

export type RiskBand =
  | "VERY_LOW"
  | "LOW"
  | "MODERATE"
  | "ELEVATED"
  | "HIGH"
  | "CRITICAL"
  | "UNKNOWN";

export type TrustDecision =
  | "APPROVE"
  | "REVIEW"
  | "DECLINE"
  | "INSUFFICIENT";

export type EvidenceKind =
  | "IDENTITY_VERIFIED"
  | "ACCOUNT_NAME_VERIFIED"
  | "ACCOUNT_NAME_MISMATCH"
  | "PHONE_ACTIVE"
  | "PHONE_INACTIVE"
  | "FACE_MATCH"
  | "FACE_MISMATCH"
  | "BVN_EXISTS"
  | "NIN_VERIFIED"
  | "NO_CONFIRMED_FRAUD_FLAGS"
  | "ACTIVE_FRAUD_FLAG"
  | "RESOLVED_FRAUD_FLAG"
  | "PREVIOUS_CHECKS_PASS"
  | "INSUFFICIENT_EVIDENCE";

export interface Evidence {
  kind: EvidenceKind | string;
  value: string;
  confidence: number; // 0..1
  provider: string;
  observedAt: string;
  expiresAt?: string;
}

export interface ProviderResult {
  status: VerificationStatus;
  confidence: number;
  evidence: Evidence[];
  raw?: Record<string, unknown>;
  latencyMs: number;
  provider: ProviderName;
}

export interface TrustDimensions {
  identity: number; // 0..200
  account: number; // 0..200
  phone: number; // 0..100
  reputation: number; // -250..+100
  resolution: number; // -100..+100
}

export interface TrustScoreResult {
  score: number; // 300..1000 or -1 for UNKNOWN
  riskBand: RiskBand;
  decision: TrustDecision;
  signals: string[];
  dimensions: TrustDimensions;
  policyVersion: string;
  calculatedAt: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
}

export const PROVIDER_INFO: Record<
  ProviderName,
  {
    label: string;
    role: string;
    jurisdiction: string;
    real: boolean;
    description: string;
  }
> = {
  NIBSS: {
    label: "NIBSS",
    role: "Account name enquiry (NIP)",
    jurisdiction: "Nigeria",
    real: true,
    description:
      "Validates bank-account details before transactions via the NIBSS Name Enquiry service (single/picture/bulk). Requires approved institutional access.",
  },
  NIMC: {
    label: "NIMC",
    role: "Identity verification (NIN)",
    jurisdiction: "Nigeria",
    real: true,
    description:
      "Authorized identity-verification source for the National Identification Number. We store only normalized evidence — never raw NIN centrally.",
  },
  DOJAH: {
    label: "Dojah",
    role: "KYC / Identity orchestration",
    jurisdiction: "Nigeria / Pan-Africa",
    real: true,
    description:
      "Commercial KYC orchestration across NIN, BVN, bank, phone and document verification. Replaceable adapter.",
  },
  SMILE_ID: {
    label: "Smile ID",
    role: "Biometric + document verification",
    jurisdiction: "Pan-Africa",
    real: true,
    description:
      "Face-match and document verification with liveness. Used as a biometric-similarity evidence source.",
  },
  YOUVERIFY: {
    label: "Youverify",
    role: "KYC / background checks",
    jurisdiction: "Nigeria",
    real: true,
    description:
      "Identity, address and business verification. Replaceable adapter behind the provider router.",
  },
  MOCK: {
    label: "Mock Sandbox",
    role: "Test harness",
    jurisdiction: "—",
    real: false,
    description:
      "Deterministic test provider that simulates verified, failed, provider_error, timeout, partial and low_confidence results. NEVER represents a live government or bank integration.",
  },
};
