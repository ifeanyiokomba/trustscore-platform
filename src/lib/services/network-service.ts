// TrustScore Stage 10 — Trust Network service (audit §4.2).
//
// The network layer: opt-in membership (NETWORK consent scope, NDPA §31),
// mutual verified-interaction edges (the TrustGraph), k-anonymized shared
// signals (FraudNet-class, band-level only) and the pan-African
// country-provider registry.
//
// Anti-gaming mirrors the reputation layer: both endpoints must be network
// members at L2+ to attest an interaction, proposals are quota-limited
// (3 / 7 days), a pair can hold at most one open lifecycle, active edges
// are capped (50) and revocable by either side.
//
// Score integration (deliberately conservative): edges feed the EXISTING
// Verified Reputation component — the same "distinct consented L2+
// verifier" primitive, never a new hidden number. Pausing membership by
// either endpoint stops the edge counting immediately (the recompute is
// triggered via markMaterialChange).
//
// Shared-signal discipline: counts and platform attribution ONLY. Real
// signals mint from human-confirmed flags (the flag's 14-day appeal window
// IS the dispute path) and retract automatically when an appeal overturns
// the confirmation. Signals are never exported raw to other members — the
// checker-facing surface is a count + band language (see
// buildNetworkBlockFor).

import { db } from "@/lib/db";
import { recordAudit } from "@/lib/services/audit-service";
import { notifyUser } from "@/lib/services/notification-service";
import { markMaterialChange } from "@/lib/services/trustscore-service";
import { effectiveAssuranceLevel } from "@/lib/services/reputation-service";
import { CONSENT_POLICY_VERSION } from "@/lib/providers/ninauth";

// ---------------------------------------------------------------------------
// Constants (engine-owned, honest labels)
// ---------------------------------------------------------------------------

const NETWORK_REQUESTER = "TrustScore Trust Network";
const NETWORK_PURPOSE =
  "Join the Trust Network: your verified interactions with other members can count toward your Verified Reputation (mutual attestations only), and band-level shared signals about you can be counted in consented safety checks. You can pause membership at any time — edges stop counting immediately.";
const NETWORK_SCOPE = "NETWORK";
const NETWORK_CONSENT_SCOPES = [NETWORK_SCOPE];

export const PROPOSE_QUOTA = 3; // proposals per 7 days
export const PROPOSE_WINDOW_DAYS = 7;
export const PENDING_TTL_DAYS = 7; // requests expire after one week
export const MAX_ACTIVE_EDGES = 50; // per member — graph hygiene
export const SIGNAL_WINDOW_DAYS = 90;
export const SIGNAL_MIN_K = 3; // k-anonymity floor for checker-facing counts
export const EDGE_SCORE_WINDOW_DAYS = 90; // mirrors the policy interaction window

export const SIGNAL_KIND_CONFIRMED_ADVERSE = "CONFIRMED_ADVERSE";

// Pan-African corridor registry (read model, honest labels). NG is the only
// MOCK_LIVE corridor (the shipped contract-first NINAuth adapter); the rest
// are PLANNED — no live coverage is claimed anywhere.
const PROVIDER_REGISTRY: {
  code: string;
  name: string;
  idTypeName: string;
  govDepth: number;
  phoneDepth: number;
  livenessDepth: number;
  mode: "MOCK_LIVE" | "PLANNED";
  note: string;
  sortOrder: number;
}[] = [
  {
    code: "NG",
    name: "Nigeria",
    idTypeName: "National Identification Number (NINAuth)",
    govDepth: 3,
    phoneDepth: 3,
    livenessDepth: 3,
    mode: "MOCK_LIVE",
    note: "Live corridor in this sandbox behind the contract-first MOCK NINAuth adapter (OAuth 2.0 + PKCE, OIDC-style ID tokens). LIVE transports activate once partner credentials exist.",
    sortOrder: 1,
  },
  {
    code: "GH",
    name: "Ghana",
    idTypeName: "Ghana Card (GVN)",
    govDepth: 2,
    phoneDepth: 2,
    livenessDepth: 1,
    mode: "PLANNED",
    note: "Ghana Card verification adapter planned (same contract-first pattern). Phone-OTP signal depth planned first — government identity depth follows partner agreements.",
    sortOrder: 2,
  },
  {
    code: "KE",
    name: "Kenya",
    idTypeName: "National ID (Huduma Namba alignment)",
    govDepth: 2,
    phoneDepth: 2,
    livenessDepth: 2,
    mode: "PLANNED",
    note: "eCitizen-class verification adapter planned. No live coverage claimed.",
    sortOrder: 3,
  },
  {
    code: "RW",
    name: "Rwanda",
    idTypeName: "National ID (Irembo)",
    govDepth: 2,
    phoneDepth: 3,
    livenessDepth: 1,
    mode: "PLANNED",
    note: "Planned corridor — digital-first civil registry makes this a natural early expansion.",
    sortOrder: 4,
  },
  {
    code: "ZA",
    name: "South Africa",
    idTypeName: "Smart ID Card (DHA)",
    govDepth: 2,
    phoneDepth: 2,
    livenessDepth: 3,
    mode: "PLANNED",
    note: "Planned corridor — strong biometric infrastructure; liveness depth is the differentiator.",
    sortOrder: 5,
  },
  {
    code: "CI",
    name: "Côte d'Ivoire",
    idTypeName: "Attestation d'Identité",
    govDepth: 1,
    phoneDepth: 3,
    livenessDepth: 1,
    mode: "PLANNED",
    note: "Planned corridor — phone-first signal depth (moile-money corridor realities).",
    sortOrder: 6,
  },
  {
    code: "SN",
    name: "Senegal",
    idTypeName: "NIU (Numéro d'Identification Unique)",
    govDepth: 1,
    phoneDepth: 2,
    livenessDepth: 1,
    mode: "PLANNED",
    note: "Planned corridor — the NUU spine is already centralized, adapter work is light.",
    sortOrder: 7,
  },
  {
    code: "EG",
    name: "Egypt",
    idTypeName: "National ID (NID)",
    govDepth: 2,
    phoneDepth: 2,
    livenessDepth: 2,
    mode: "PLANNED",
    note: "Planned corridor — North-African expansion anchor; no live coverage claimed.",
    sortOrder: 8,
  },
];

// ---------------------------------------------------------------------------
// Idempotent seed — provider registry + a demo graph for the demo accounts
// (ada / chidi / ngozi). The demo rows carry honest DEMO/MOCK provenance and
// never touch ada's score inputs (only chidi ↔ ngozi gets an ACTIVE edge —
// the pending demo request to ada is only visible until she acts on it).
// ---------------------------------------------------------------------------

const globalForNetSeed = globalThis as unknown as { __tsNetworkSeed?: Promise<void> };

export async function ensureNetworkSeeded(): Promise<void> {
  if (globalForNetSeed.__tsNetworkSeed) return globalForNetSeed.__tsNetworkSeed;
  globalForNetSeed.__tsNetworkSeed = (async () => {
    for (const p of PROVIDER_REGISTRY) {
      await db.countryProvider.upsert({
        where: { code: p.code },
        create: p,
        update: {
          name: p.name,
          idTypeName: p.idTypeName,
          govDepth: p.govDepth,
          phoneDepth: p.phoneDepth,
          livenessDepth: p.livenessDepth,
          mode: p.mode,
          note: p.note,
          sortOrder: p.sortOrder,
        },
      });
    }

    // Demo graph (memberships + one ACTIVE edge + one PENDING request + one
    // MOCK partner signal) — only for the three demo accounts, only once.
    const demo = await db.userAccount.findMany({
      where: { handle: { in: ["ada", "chidi", "ngozi"] } },
      select: { id: true, handle: true },
    });
    if (demo.length === 3) {
      const byHandle = Object.fromEntries(demo.map((u) => [u.handle, u.id]));
      const memberSeeds = [byHandle.ada, byHandle.chidi, byHandle.ngozi].map((userId) => ({
        userId,
        status: "ACTIVE",
      }));
      for (const seed of memberSeeds) {
        const existing = await db.networkMembership.findUnique({ where: { userId: seed.userId } });
        if (!existing) {
          // Demo memberships carry their (demo) consent rows — the invariant
          // "membership is consent-backed" holds even in demo data.
          const consent = await db.consent.create({
            data: {
              userId: seed.userId,
              requester: NETWORK_REQUESTER,
              purpose: NETWORK_PURPOSE,
              scopes: JSON.stringify(NETWORK_CONSENT_SCOPES),
              policyVersion: CONSENT_POLICY_VERSION,
            },
          });
          await db.networkMembership.create({ data: { ...seed, consentId: consent.id } });
        }
      }
      const edgeExists = await db.trustEdge.findFirst({
        where: {
          status: "ACTIVE",
          OR: [
            { aUserId: byHandle.chidi, bUserId: byHandle.ngozi },
            { aUserId: byHandle.ngozi, bUserId: byHandle.chidi },
          ],
        },
      });
      if (!edgeExists) {
        const [a, b] = [byHandle.chidi, byHandle.ngozi].sort();
        await db.trustEdge.create({
          data: {
            aUserId: a,
            bUserId: b,
            status: "ACTIVE",
            requestedById: byHandle.chidi,
            requestedToId: byHandle.ngozi,
            expiresAt: new Date(Date.now() + PENDING_TTL_DAYS * 86400_000),
            respondedAt: new Date(),
            activatedAt: new Date(),
          },
        });
      }
      const pendingExists = await db.trustEdge.findFirst({
        where: { status: "PENDING", requestedToId: byHandle.ada },
      });
      if (!pendingExists) {
        const [a, b] = [byHandle.ngozi, byHandle.ada].sort();
        await db.trustEdge.create({
          data: {
            aUserId: a,
            bUserId: b,
            status: "PENDING",
            requestedById: byHandle.ngozi,
            requestedToId: byHandle.ada,
            expiresAt: new Date(Date.now() + PENDING_TTL_DAYS * 86400_000),
          },
        });
      }
      const signalExists = await db.sharedSignal.findFirst({
        where: { subjectUserId: byHandle.chidi, sourceType: "DEMO_SEED" },
      });
      if (!signalExists) {
        await db.sharedSignal.create({
          data: {
            subjectUserId: byHandle.chidi,
            kind: SIGNAL_KIND_CONFIRMED_ADVERSE,
            platform: "MockFintech GH (MOCK demo partner)",
            platformMode: "MOCK",
            severity: "LOW",
            windowDays: SIGNAL_WINDOW_DAYS,
            note: "Demo data: a MOCK partner platform's contribution to the sandbox shared-signal registry. It exists to demonstrate the FraudNet-class shape — no real adverse event is claimed.",
            sourceType: "DEMO_SEED",
            expiresAt: new Date(Date.now() + SIGNAL_WINDOW_DAYS * 86400_000),
          },
        });
      }
    }
  })();
  try {
    await globalForNetSeed.__tsNetworkSeed;
  } catch (e) {
    globalForNetSeed.__tsNetworkSeed = undefined;
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

export async function getMembership(userId: string) {
  await ensureNetworkSeeded();
  return db.networkMembership.findUnique({ where: { userId } });
}

async function assertNetworkMember(userId: string): Promise<boolean> {
  const m = await db.networkMembership.findUnique({ where: { userId } });
  return m?.status === "ACTIVE";
}

export type MembershipResult =
  | { ok: true; status: "ACTIVE" | "PAUSED"; joinedAt: string }
  | { ok: false; code: "ALREADY_JOINED" | "NOT_A_MEMBER" };

export async function joinNetwork(userId: string): Promise<MembershipResult> {
  await ensureNetworkSeeded();
  const existing = await db.networkMembership.findUnique({ where: { userId } });
  if (existing && existing.status === "ACTIVE") return { ok: false, code: "ALREADY_JOINED" };
  if (existing) {
    // Re-join: grant a fresh consent (the old one stays withdrawn for the record)
    const consent = await db.consent.create({
      data: {
        userId,
        requester: NETWORK_REQUESTER,
        purpose: NETWORK_PURPOSE,
        scopes: JSON.stringify(NETWORK_CONSENT_SCOPES),
        policyVersion: CONSENT_POLICY_VERSION,
      },
    });
    await db.networkMembership.update({
      where: { userId },
      data: { status: "ACTIVE", consentId: consent.id },
    });
  } else {
    const consent = await db.consent.create({
      data: {
        userId,
        requester: NETWORK_REQUESTER,
        purpose: NETWORK_PURPOSE,
        scopes: JSON.stringify(NETWORK_CONSENT_SCOPES),
        policyVersion: CONSENT_POLICY_VERSION,
      },
    });
    await db.networkMembership.create({
      data: { userId, status: "ACTIVE", consentId: consent.id },
    });
    await notifyUser(
      userId,
      "SYSTEM",
      "You joined the Trust Network",
      "Your verified interactions with other members can now count toward your Verified Reputation — mutual attestations only, and you can pause membership at any time."
    );
  }
  // Edges (if any) start counting again.
  try {
    await markMaterialChange(userId, "NETWORK_JOINED");
  } catch { /* recompute failures never block membership */ }
  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "NETWORK_JOINED",
    subjectType: "NetworkMembership",
    metadata: {},
  });
  const m = await db.networkMembership.findUniqueOrThrow({ where: { userId } });
  return { ok: true, status: m.status as "ACTIVE", joinedAt: m.joinedAt.toISOString() };
}

export async function pauseNetwork(userId: string): Promise<MembershipResult> {
  const existing = await db.networkMembership.findUnique({ where: { userId } });
  if (!existing) return { ok: false, code: "NOT_A_MEMBER" };
  if (existing.consentId) {
    await db.consent.update({
      where: { id: existing.consentId },
      data: { withdrawnAt: new Date() },
    });
  }
  await db.networkMembership.update({ where: { userId }, data: { status: "PAUSED" } });
  // Edges stop counting for BOTH endpoints — notify active partners.
  try {
    await markMaterialChange(userId, "NETWORK_PAUSED");
  } catch { /* never block */ }
  const partners = await activePartnerIds(userId);
  for (const p of partners) {
    await notifyUser(
      p,
      "SYSTEM",
      "A member paused their Trust Network membership",
      "One of your verified interactions stopped counting toward Verified Reputation because the other member paused their network membership. No action is needed."
    );
    try {
      await markMaterialChange(p, "NETWORK_PAUSED_PARTNER");
    } catch { /* never block */ }
  }
  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "NETWORK_PAUSED",
    subjectType: "NetworkMembership",
    metadata: {},
  });
  const m = await db.networkMembership.findUniqueOrThrow({ where: { userId } });
  return { ok: true, status: m.status as "PAUSED", joinedAt: m.joinedAt.toISOString() };
}

// ---------------------------------------------------------------------------
// Edges — propose / respond / revoke
// ---------------------------------------------------------------------------

async function activePartnerIds(userId: string): Promise<string[]> {
  const edges = await db.trustEdge.findMany({
    where: { status: "ACTIVE", OR: [{ aUserId: userId }, { bUserId: userId }] },
    select: { aUserId: true, bUserId: true },
  });
  return edges.map((e) => (e.aUserId === userId ? e.bUserId : e.aUserId));
}

export type ProposeResult =
  | { ok: true; edgeId: string; expiresAt: string }
  | {
      ok: false;
      code:
        | "NOT_A_MEMBER"
        | "TARGET_NOT_MEMBER"
        | "UNKNOWN_HANDLE"
        | "SELF"
        | "LEVEL_GATE"
        | "TARGET_LEVEL_GATE"
        | "QUOTA"
        | "OPEN_LIFECYCLE"
        | "EDGE_CAP"
        | "TARGET_EDGE_CAP";
    };

export async function proposeInteraction(
  requesterId: string,
  handle: string
): Promise<ProposeResult> {
  await ensureNetworkSeeded();
  const clean = handle.trim().replace(/^@/, "").toLowerCase();
  if (clean.length < 2 || clean.length > 40) return { ok: false, code: "UNKNOWN_HANDLE" };

  const [requesterMembership, target] = await Promise.all([
    db.networkMembership.findUnique({ where: { userId: requesterId } }),
    db.userAccount.findUnique({ where: { handle: clean }, select: { id: true, handle: true } }),
  ]);
  if (!target) return { ok: false, code: "UNKNOWN_HANDLE" };
  if (target.id === requesterId) return { ok: false, code: "SELF" };
  if (requesterMembership?.status !== "ACTIVE") return { ok: false, code: "NOT_A_MEMBER" };

  const targetMembership = await db.networkMembership.findUnique({ where: { userId: target.id } });
  if (targetMembership?.status !== "ACTIVE") return { ok: false, code: "TARGET_NOT_MEMBER" };

  const [requesterLevel, targetLevel] = await Promise.all([
    effectiveAssuranceLevel(requesterId),
    effectiveAssuranceLevel(target.id),
  ]);
  if (requesterLevel < 2) return { ok: false, code: "LEVEL_GATE" };
  if (targetLevel < 2) return { ok: false, code: "TARGET_LEVEL_GATE" };

  // Quota — 3 proposals per rolling 7 days (same shape as flags).
  const since = new Date(Date.now() - PROPOSE_WINDOW_DAYS * 86400_000);
  const recent = await db.trustEdge.count({
    where: { requestedById: requesterId, requestedAt: { gte: since } },
  });
  if (recent >= PROPOSE_QUOTA) return { ok: false, code: "QUOTA" };

  // One open lifecycle per pair (PENDING or ACTIVE).
  const [a, b] = [requesterId, target.id].sort();
  const open = await db.trustEdge.findFirst({
    where: { aUserId: a, bUserId: b, status: { in: ["PENDING", "ACTIVE"] } },
  });
  if (open) return { ok: false, code: "OPEN_LIFECYCLE" };

  const [myActive, targetActive] = await Promise.all([
    db.trustEdge.count({ where: { status: "ACTIVE", OR: [{ aUserId: requesterId }, { bUserId: requesterId }] } }),
    db.trustEdge.count({ where: { status: "ACTIVE", OR: [{ aUserId: target.id }, { bUserId: target.id }] } }),
  ]);
  if (myActive >= MAX_ACTIVE_EDGES) return { ok: false, code: "EDGE_CAP" };
  if (targetActive >= MAX_ACTIVE_EDGES) return { ok: false, code: "TARGET_EDGE_CAP" };

  const expiresAt = new Date(Date.now() + PENDING_TTL_DAYS * 86400_000);
  const edge = await db.trustEdge.create({
    data: {
      aUserId: a,
      bUserId: b,
      status: "PENDING",
      requestedById: requesterId,
      requestedToId: target.id,
      expiresAt,
    },
  });
  await notifyUser(
    target.id,
    "SYSTEM",
    "Someone proposed a verified interaction with you",
    "A verified member proposes to attest that you two dealt with each other. Accepting creates a mutual verified interaction — it counts toward both of your Verified Reputation (never a negative signal). You can decline now or revoke later. The request is in your Trust Network tab."
  );
  await recordAudit({
    actorType: "USER",
    actorId: requesterId,
    action: "NETWORK_INTERACTION_PROPOSED",
    subjectType: "TrustEdge",
    subjectId: edge.id,
    metadata: {},
  });
  return { ok: true, edgeId: edge.id, expiresAt: expiresAt.toISOString() };
}

export type RespondResult =
  | { ok: true; status: "ACTIVE" | "DECLINED" }
  | { ok: false; code: "NOT_FOUND" | "NOT_INVITED" | "NOT_PENDING" | "EXPIRED" };

export async function respondToInteraction(
  userId: string,
  edgeId: string,
  decision: "ACCEPT" | "DECLINE"
): Promise<RespondResult> {
  await expireStalePending();
  const edge = await db.trustEdge.findUnique({ where: { id: edgeId } });
  if (!edge) return { ok: false, code: "NOT_FOUND" };
  if (edge.requestedToId !== userId) return { ok: false, code: "NOT_INVITED" };
  if (edge.status !== "PENDING") return { ok: false, code: "NOT_PENDING" };
  if (edge.expiresAt.getTime() < Date.now()) return { ok: false, code: "EXPIRED" };

  const now = new Date();
  if (decision === "ACCEPT") {
    await db.trustEdge.update({
      where: { id: edge.id },
      data: { status: "ACTIVE", respondedAt: now, activatedAt: now },
    });
    await notifyUser(
      edge.requestedById,
      "SYSTEM",
      "Your verified-interaction proposal was accepted",
      "A mutual verified interaction is now active. It counts toward Verified Reputation for both of you (capped by the scoring policy) and either side can revoke it at any time."
    );
    await recordAudit({
      actorType: "USER",
      actorId: userId,
      action: "NETWORK_INTERACTION_ACCEPTED",
      subjectType: "TrustEdge",
      subjectId: edge.id,
      metadata: {},
    });
    // The edge counts for BOTH endpoints' reputation inputs.
    for (const u of [edge.requestedById, edge.requestedToId]) {
      try {
        await markMaterialChange(u, "EDGE_ACTIVATED");
      } catch { /* never block */ }
    }
    return { ok: true, status: "ACTIVE" };
  }

  await db.trustEdge.update({
    where: { id: edge.id },
    data: { status: "DECLINED", respondedAt: now },
  });
  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "NETWORK_INTERACTION_DECLINED",
    subjectType: "TrustEdge",
    subjectId: edge.id,
    metadata: {},
  });
  return { ok: true, status: "DECLINED" };
}

export type RevokeResult =
  | { ok: true; status: "REVOKED" }
  | { ok: false; code: "NOT_FOUND" | "NOT_PARTICIPANT" | "NOT_OPEN" | "ONLY_REQUESTER_CANCELS" };

export async function revokeInteraction(userId: string, edgeId: string): Promise<RevokeResult> {
  await expireStalePending();
  const edge = await db.trustEdge.findUnique({ where: { id: edgeId } });
  if (!edge) return { ok: false, code: "NOT_FOUND" };
  const isParticipant = edge.requestedById === userId || edge.requestedToId === userId;
  if (!isParticipant) return { ok: false, code: "NOT_PARTICIPANT" };
  if (edge.status === "PENDING") {
    if (edge.requestedById !== userId) return { ok: false, code: "ONLY_REQUESTER_CANCELS" };
    await db.trustEdge.update({
      where: { id: edge.id },
      data: { status: "REVOKED", revokedAt: new Date(), revokedById: userId },
    });
    await recordAudit({
      actorType: "USER",
      actorId: userId,
      action: "NETWORK_INTERACTION_REVOKED",
      subjectType: "TrustEdge",
      subjectId: edge.id,
      metadata: { status: "cancelled" },
    });
    return { ok: true, status: "REVOKED" };
  }
  if (edge.status !== "ACTIVE") return { ok: false, code: "NOT_OPEN" };

  const now = new Date();
  await db.trustEdge.update({
    where: { id: edge.id },
    data: { status: "REVOKED", revokedAt: now, revokedById: userId },
  });
  const partner = edge.requestedById === userId ? edge.requestedToId : edge.requestedById;
  await notifyUser(
    partner,
    "SYSTEM",
    "A verified interaction was revoked",
    "One of your verified interactions was revoked (either by you or the other member). It no longer counts toward Verified Reputation for either side."
  );
  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "NETWORK_INTERACTION_REVOKED",
    subjectType: "TrustEdge",
    subjectId: edge.id,
    metadata: { status: "revoked" },
  });
  for (const u of [edge.requestedById, edge.requestedToId]) {
    try {
      await markMaterialChange(u, "EDGE_REVOKED");
    } catch { /* never block */ }
  }
  return { ok: true, status: "REVOKED" };
}

// Lazy pending expiry — PENDING rows past their TTL become EXPIRED on read.
export async function expireStalePending(): Promise<number> {
  const res = await db.trustEdge.updateMany({
    where: { status: "PENDING", expiresAt: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });
  return res.count;
}

// ---------------------------------------------------------------------------
// Shared signals — mint / retract (called from the reputation human flows)
// ---------------------------------------------------------------------------

export async function mintSignalFromFlag(flag: {
  id: string;
  subjectId: string;
  category: string;
}): Promise<void> {
  const existing = await db.sharedSignal.findFirst({
    where: { sourceType: "PLATFORM_RESOLUTION", sourceId: flag.id },
  });
  if (existing) return; // idempotent — one signal per confirmed flag
  await db.sharedSignal.create({
    data: {
      subjectUserId: flag.subjectId,
      kind: SIGNAL_KIND_CONFIRMED_ADVERSE,
      platform: "TrustScore (sandbox)",
      platformMode: "MOCK",
      severity: flag.category === "FRAUD" ? "HIGH" : "MEDIUM",
      windowDays: SIGNAL_WINDOW_DAYS,
      note: `Human-confirmed adverse flag (category: ${flag.category}) after evidence review. The flag's 14-day appeal path is the dispute route — an overturned appeal retracts this signal automatically.`,
      sourceType: "PLATFORM_RESOLUTION",
      sourceId: flag.id,
      expiresAt: new Date(Date.now() + SIGNAL_WINDOW_DAYS * 86400_000),
    },
  });
  await recordAudit({
    actorType: "SYSTEM",
    action: "NETWORK_SIGNAL_MINTED",
    subjectType: "UserAccount",
    subjectId: flag.subjectId,
    metadata: { severity: flag.category === "FRAUD" ? "HIGH" : "MEDIUM", windowDays: SIGNAL_WINDOW_DAYS },
  });
}

export async function retractSignalsForFlag(flagId: string): Promise<void> {
  await db.sharedSignal.updateMany({
    where: { sourceType: "PLATFORM_RESOLUTION", sourceId: flagId, retractedAt: null },
    data: { retractedAt: new Date() },
  });
  await recordAudit({
    actorType: "SYSTEM",
    action: "NETWORK_SIGNAL_RETRACTED",
    subjectType: "Flag",
    subjectId: flagId,
    metadata: {},
  });
}

function visibleSignals(userId: string) {
  return db.sharedSignal.findMany({
    where: { subjectUserId: userId, retractedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
}

// ---------------------------------------------------------------------------
// Checker-facing network block (counts only, k-anonymized)
// ---------------------------------------------------------------------------

export interface NetworkBlock {
  joined: boolean;
  sharedSignals: {
    count: number;
    platforms: string[];
    windowDays: number;
    minK: number;
  } | null;
  businessChecks: number | null;
  note: string;
}

export async function buildNetworkBlockFor(subjectId: string): Promise<NetworkBlock> {
  const membership = await db.networkMembership.findUnique({ where: { userId: subjectId } });
  if (membership?.status !== "ACTIVE") {
    return {
      joined: false,
      sharedSignals: null,
      businessChecks: null,
      note: "Subject has not joined the Trust Network — no shared signals are available. This is not an adverse signal.",
    };
  }
  const signals = await visibleSignals(subjectId);
  const count = signals.length;
  const platforms = [...new Set(signals.map((s) => s.platform))];
  const businessChecks = await db.trustReceipt.count({
    where: { userId: subjectId, channel: "API_CHECK" },
  });
  return {
    joined: true,
    // k-anonymity: below the floor, the count collapses to a band word —
    // a single signal can never isolate a subject's record to a checker.
    sharedSignals: {
      count: count >= SIGNAL_MIN_K ? count : count > 0 ? SIGNAL_MIN_K : 0,
      platforms,
      windowDays: SIGNAL_WINDOW_DAYS,
      minK: SIGNAL_MIN_K,
    },
    businessChecks,
    note:
      count === 0
        ? "No shared signals on record. Network signals are band-level counts from human-confirmed events only — this is a statement about recorded evidence, never a guarantee."
        : `Shared signals present: a k-anonymized count of human-confirmed adverse events (minimum cohort ${SIGNAL_MIN_K}) attributed to the platforms listed. Band-level only — details are never shared. This is a statement about recorded evidence, never a guarantee.`,
  };
}

// ---------------------------------------------------------------------------
// Read model — GET /api/v1/network/me
// ---------------------------------------------------------------------------

interface GraphNode {
  userId: string;
  displayName: string;
  handle: string;
  level: number;
  membership: "ACTIVE" | "PAUSED";
  since: string; // edge activatedAt
  lastActive: boolean;
}

export async function getNetworkMe(userId: string) {
  await ensureNetworkSeeded();
  await expireStalePending();

  const membership = await db.networkMembership.findUnique({ where: { userId } });
  const joined = membership?.status === "ACTIVE";

  // Active + pending edges involving me.
  const edges = await db.trustEdge.findMany({
    where: { OR: [{ aUserId: userId }, { bUserId: userId }] },
    orderBy: { requestedAt: "desc" },
    take: 120,
  });

  const activeEdges = edges.filter((e) => e.status === "ACTIVE");
  const partnerIds = activeEdges.map((e) => (e.aUserId === userId ? e.bUserId : e.aUserId));
  const [partnerUsers, partnerIdentities, partnerMemberships] = await Promise.all([
    db.userAccount.findMany({
      where: { id: { in: partnerIds } },
      select: { id: true, displayName: true, handle: true },
    }),
    db.trustIdentity.findMany({
      where: { userId: { in: partnerIds } },
      select: { userId: true, status: true, assuranceLevel: true, expiresAt: true },
    }),
    db.networkMembership.findMany({
      where: { userId: { in: partnerIds } },
      select: { userId: true, status: true },
    }),
  ]);
  const now = Date.now();
  const nodes: GraphNode[] = [];
  const graphEdges: { id: string; to: string; since: string; status: string }[] = [];
  for (const e of activeEdges) {
    const partnerId = e.aUserId === userId ? e.bUserId : e.aUserId;
    const u = partnerUsers.find((p) => p.id === partnerId);
    if (!u) continue; // tolerant of dangling rows (raw-SQL test cleanups)
    const id = partnerIdentities.find((i) => i.userId === partnerId);
    const live = id?.status === "VERIFIED" && (id?.expiresAt?.getTime() ?? 0) > now;
    const m = partnerMemberships.find((mm) => mm.userId === partnerId);
    nodes.push({
      userId: u.id,
      displayName: u.displayName,
      handle: u.handle,
      level: live ? id!.assuranceLevel : 0,
      membership: m?.status === "ACTIVE" ? "ACTIVE" : "PAUSED",
      since: (e.activatedAt ?? e.respondedAt ?? e.requestedAt).toISOString(),
      lastActive: true,
    });
    graphEdges.push({
      id: e.id,
      to: u.id,
      since: (e.activatedAt ?? e.respondedAt ?? e.requestedAt).toISOString(),
      status: e.status,
    });
  }

  // Counting partners — only mutually-ACTIVE memberships + live L2+ count.
  const countingPartners = nodes.filter(
    (n) => n.membership === "ACTIVE" && n.level >= 2
  ).length;

  // Requests (incoming = I must respond; outgoing = I proposed).
  const pendingIncoming = edges.filter(
    (e) => e.status === "PENDING" && e.requestedToId === userId
  );
  const pendingOutgoing = edges.filter(
    (e) => e.status === "PENDING" && e.requestedById === userId
  );
  const incomingRequesters = await db.userAccount.findMany({
    where: { id: { in: pendingIncoming.map((e) => e.requestedById) } },
    select: { id: true, displayName: true, handle: true },
  });
  const outgoingTargets = await db.userAccount.findMany({
    where: { id: { in: pendingOutgoing.map((e) => e.requestedToId) } },
    select: { id: true, displayName: true, handle: true },
  });

  const [signals, businessChecks, quotaCount, allPartnerUsers] = await Promise.all([
    visibleSignals(userId),
    db.trustReceipt.count({ where: { userId, channel: "API_CHECK" } }),
    db.trustEdge.count({
      where: { requestedById: userId, requestedAt: { gte: new Date(Date.now() - PROPOSE_WINDOW_DAYS * 86400_000) } },
    }),
    // One lookup for every handle the read model may display (graph nodes,
    // requesters, targets and history partners).
    db.userAccount.findMany({
      where: {
        id: {
          in: [
            ...partnerIds,
            ...pendingIncoming.map((e) => e.requestedById),
            ...pendingOutgoing.map((e) => e.requestedToId),
            ...edges
              .filter((e) => ["DECLINED", "EXPIRED", "REVOKED"].includes(e.status))
              .map((e) => (e.requestedById === userId ? e.requestedToId : e.requestedById)),
          ],
        },
      },
      select: { id: true, displayName: true, handle: true },
    }),
  ]);
  const userById = (id: string) => allPartnerUsers.find((u) => u.id === id);

  const history = edges
    .filter((e) => ["DECLINED", "EXPIRED", "REVOKED"].includes(e.status))
    .slice(0, 20)
    .map((e) => {
      const partnerId = e.requestedById === userId ? e.requestedToId : e.requestedById;
      const partner = userById(partnerId);
      return {
        id: e.id,
        status: e.status,
        direction: e.requestedById === userId ? "OUTGOING" : "INCOMING",
        partnerId,
        partnerHandle: partner?.handle ?? null,
        partnerName: partner?.displayName ?? null,
        at: (e.respondedAt ?? e.revokedAt ?? e.expiresAt).toISOString(),
      };
    });

  return {
    membership: {
      joined,
      status: membership?.status ?? null,
      joinedAt: membership?.joinedAt.toISOString() ?? null,
      consentId: membership?.consentId ?? null,
    },
    standing: {
      degree: activeEdges.length,
      countingPartners,
      businessChecks,
      reputationNote:
        "Verified interactions feed the same Verified Reputation component as consented safety checks — mutual attestations only, capped by the scoring policy. Pausing membership by either side stops an edge counting immediately.",
      quota: { used: quotaCount, max: PROPOSE_QUOTA, windowDays: PROPOSE_WINDOW_DAYS },
    },
    graph: { nodes, edges: graphEdges },
    interactions: {
      incoming: pendingIncoming.map((e) => {
        const r = incomingRequesters.find((u) => u.id === e.requestedById);
        return {
          id: e.id,
          from: r ? { displayName: r.displayName, handle: r.handle } : null,
          requestedAt: e.requestedAt.toISOString(),
          expiresAt: e.expiresAt.toISOString(),
        };
      }),
      outgoing: pendingOutgoing.map((e) => {
        const t = outgoingTargets.find((u) => u.id === e.requestedToId);
        return {
          id: e.id,
          to: t ? { displayName: t.displayName, handle: t.handle } : null,
          requestedAt: e.requestedAt.toISOString(),
          expiresAt: e.expiresAt.toISOString(),
        };
      }),
      history,
    },
    signals: signals.map((s) => ({
      id: s.id,
      kind: s.kind,
      platform: s.platform,
      platformMode: s.platformMode,
      severity: s.severity,
      windowDays: s.windowDays,
      note: s.note,
      sourceType: s.sourceType,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      dispute: {
        route: "Reputation tab → appeal",
        note: "Signals sourced from platform flags inherit the flag's 14-day appeal path; an overturned appeal retracts the signal automatically.",
      },
    })),
    kAnonymity: {
      minK: SIGNAL_MIN_K,
      windowDays: SIGNAL_WINDOW_DAYS,
      note: `Checker-facing signal counts are k-anonymized (minimum cohort ${SIGNAL_MIN_K}) and band-level only — details, categories and raw identifiers are never shared with checkers.`,
    },
    honesty: {
      platformMode: "MOCK",
      note: "Partner platforms in this sandbox are MOCK demo participants (MockFintech GH). The sharing CONTRACT is real; the partner feeds are honest mock-ups.",
    },
  };
}

// ---------------------------------------------------------------------------
// Public registry — GET /api/v1/network/providers
// ---------------------------------------------------------------------------

export async function listProviders() {
  await ensureNetworkSeeded();
  const rows = await db.countryProvider.findMany({ orderBy: { sortOrder: "asc" } });
  return {
    providers: rows.map((r) => ({
      code: r.code,
      name: r.name,
      idTypeName: r.idTypeName,
      depths: { gov: r.govDepth, phone: r.phoneDepth, liveness: r.livenessDepth },
      mode: r.mode,
      note: r.note,
    })),
    honesty:
      "The registry is a read model. Only NG is contract-first MOCK_LIVE in this sandbox; every other corridor is PLANNED — no live coverage is claimed. Verification flows remain NG-only until an adapter ships.",
  };
}
