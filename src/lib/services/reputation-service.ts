// TrustScore Stage 7 — ReputationService (directive §29 flags/flag_evidence,
// §33 human review, §36 Verified Reputation + Resolution History components).
//
// The reputation layer: flags with evidence → human-reviewed resolution →
// optional subject appeal. Anti-gaming is a design property, not an
// afterthought:
//   * filing a flag requires a live L2+ Trust Identity (a verified human,
//     not a fresh anonymous account)
//   * one OPEN/UNDER_REVIEW flag per reporter→subject pair
//   * at most 3 flags per rolling 7-day window per reporter
//   * at least one evidence item at submission; description must be substantive
//   * the reporter is MASKED to the subject (retaliation shield) — the full
//     record stays available to the subject via NDPA DSR export
//   * decisions are HUMAN (REVIEWER role) — no automated significant
//     decisions in Stage 7 (NDPC guidance; DPIA gate belongs to Stage 8)
//
// Verified interactions (limited Stage 7 form): each DISTINCT verified member
// (current L2+) who ran a consent-backed check on the subject via handle,
// trust link or QR in the last 90 days counts once — +3 reputation points,
// capped at 15. Cleared flags (UNFOUNDED/DISMISSED after human review) give
// +2 resolution-history points, capped at 10. Confirmed flags feed Confirmed
// Risk (−25, cap −50) — computed by the score engine via the same queries.
//
// Red lines: a flag is a report to the platform — never a public accusation;
// the locked subject-facing language never asserts the subject is "safe" or
// "fraudulent" — outcomes are statements about reviewed evidence only.

import { db } from "@/lib/db";
import { recordAudit } from "@/lib/services/audit-service";
import { notifyUser } from "@/lib/services/notification-service";

export const FLAG_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // rolling reporter quota window
export const FLAG_WINDOW_MAX = 3; // max flags per reporter per window
export const APPEAL_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // subject appeal window after a decision
export const FLAGS_RETAIN = 50; // max rows surfaced in read models

export const FLAG_CATEGORIES = [
  "FRAUD",
  "IMPERSONATION",
  "NON_PAYMENT",
  "SCAM",
  "HARASSMENT",
  "OTHER",
] as const;

export type FlagCategory = (typeof FLAG_CATEGORIES)[number];

export const FLAG_CATEGORY_LABELS: Record<string, string> = {
  FRAUD: "Fraud or deception",
  IMPERSONATION: "Impersonation",
  NON_PAYMENT: "Payment or delivery failure",
  SCAM: "Scam",
  HARASSMENT: "Harassment or abuse",
  OTHER: "Other serious concern",
};

export const FLAG_STATUS_LABELS: Record<string, string> = {
  OPEN: "Open — awaiting your response",
  UNDER_REVIEW: "Under human review",
  RESOLVED_CONFIRMED: "Confirmed after review",
  RESOLVED_UNFOUNDED: "Cleared — unfounded",
  RESOLVED_DISMISSED: "Cleared — dismissed",
  WITHDRAWN: "Withdrawn by reporter",
};

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function maskHandle(handle: string): string {
  if (handle.length <= 2) return "@**";
  return `@${handle.slice(0, 2)}${"*".repeat(Math.min(4, Math.max(2, handle.length - 2)))}`;
}

// Effective (freshness-aware) assurance level — same semantics as the score
// engine: a stale government verification contributes nothing.
export async function effectiveAssuranceLevel(userId: string): Promise<number> {
  const identity = await db.trustIdentity.findUnique({
    where: { userId },
    select: { status: true, assuranceLevel: true, expiresAt: true },
  });
  if (!identity) return 0;
  const live =
    identity.status === "VERIFIED" && (identity.expiresAt?.getTime() ?? 0) > Date.now();
  return live ? identity.assuranceLevel : 0;
}

async function assuranceLevelsFor(userIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (userIds.length === 0) return out;
  const rows = await db.trustIdentity.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, status: true, assuranceLevel: true, expiresAt: true },
  });
  const now = Date.now();
  for (const r of rows) {
    const live = r.status === "VERIFIED" && (r.expiresAt?.getTime() ?? 0) > now;
    out.set(r.userId, live ? r.assuranceLevel : 0);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Flag submission (reporter side)
// ---------------------------------------------------------------------------

export interface EvidenceInput {
  kind: "TEXT" | "LINK";
  content: string;
}

export type CreateFlagResult =
  | { ok: true; flagId: string }
  | { ok: false; code: "ASSURANCE_REQUIRED" | "SELF_FLAG" | "SUBJECT_NOT_FOUND" | "DUPLICATE_OPEN" | "FLAG_WINDOW" };

export async function createFlag(
  reporter: { id: string; handle: string },
  input: { subjectHandle: string; category: string; description: string; evidence: EvidenceInput[] }
): Promise<CreateFlagResult> {
  // Anti-gaming gate 1 — verified human behind the report.
  const level = await effectiveAssuranceLevel(reporter.id);
  if (level < 2) return { ok: false, code: "ASSURANCE_REQUIRED" };

  const handle = input.subjectHandle.trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(handle)) {
    return { ok: false, code: "SUBJECT_NOT_FOUND" };
  }
  const subject = await db.userAccount.findUnique({
    where: { handle },
    select: { id: true, handle: true, displayName: true, status: true },
  });
  if (!subject || subject.status !== "ACTIVE") {
    return { ok: false, code: "SUBJECT_NOT_FOUND" };
  }
  if (subject.id === reporter.id) return { ok: false, code: "SELF_FLAG" };

  // Anti-gaming gate 2 — one open case per pair.
  const open = await db.flag.findFirst({
    where: {
      reporterId: reporter.id,
      subjectId: subject.id,
      status: { in: ["OPEN", "UNDER_REVIEW"] },
    },
    select: { id: true },
  });
  if (open) return { ok: false, code: "DUPLICATE_OPEN" };

  // Anti-gaming gate 3 — rolling weekly quota (flag wars are expensive).
  const windowStart = new Date(Date.now() - FLAG_WINDOW_MS);
  const recent = await db.flag.count({
    where: { reporterId: reporter.id, createdAt: { gte: windowStart } },
  });
  if (recent >= FLAG_WINDOW_MAX) return { ok: false, code: "FLAG_WINDOW" };

  const flag = await db.flag.create({
    data: {
      reporterId: reporter.id,
      subjectId: subject.id,
      category: input.category,
      description: input.description.trim(),
      evidenceCount: input.evidence.length,
      evidence: {
        create: input.evidence.map((e) => ({
          submittedById: reporter.id,
          role: "REPORTER",
          kind: e.kind,
          content: e.content.trim(),
        })),
      },
    },
  });

  await notifyUser(
    subject.id,
    "SECURITY",
    "A member filed a flag against your profile",
    `A verified member reported a ${FLAG_CATEGORY_LABELS[input.category] ?? input.category.toLowerCase()} concern. You can respond with your side of the story — a human reviews every case before anything affects your TrustScore. Reporter identities are masked to prevent retaliation.`
  );
  await recordAudit({
    actorType: "USER",
    actorId: reporter.id,
    action: "FLAG_SUBMITTED",
    subjectType: "UserAccount",
    subjectId: subject.id,
    metadata: { category: input.category, evidenceCount: input.evidence.length },
  });
  return { ok: true, flagId: flag.id };
}

// ---------------------------------------------------------------------------
// Subject response / reporter withdrawal / subject appeal
// ---------------------------------------------------------------------------

export type RespondResult =
  | { ok: true }
  | { ok: false; code: "NOT_FOUND" | "NOT_SUBJECT" | "NOT_OPEN" | "ALREADY_RESPONDED" };

export async function respondToFlag(
  subjectId: string,
  flagId: string,
  input: { response: string; evidence: EvidenceInput[] }
): Promise<RespondResult> {
  const flag = await db.flag.findUnique({ where: { id: flagId } });
  if (!flag) return { ok: false, code: "NOT_FOUND" };
  if (flag.subjectId !== subjectId) return { ok: false, code: "NOT_SUBJECT" };
  if (flag.status !== "OPEN") {
    return flag.status === "UNDER_REVIEW" && flag.subjectRespondedAt
      ? { ok: false, code: "ALREADY_RESPONDED" }
      : { ok: false, code: "NOT_OPEN" };
  }

  await db.flagEvidence.createMany({
    data: [
      {
        flagId: flag.id,
        submittedById: subjectId,
        role: "SUBJECT",
        kind: "TEXT",
        content: input.response.trim(),
      },
      ...input.evidence.map((e) => ({
        flagId: flag.id,
        submittedById: subjectId,
        role: "SUBJECT" as const,
        kind: e.kind,
        content: e.content.trim(),
      })),
    ],
  });
  await db.flag.update({
    where: { id: flag.id },
    data: {
      status: "UNDER_REVIEW",
      subjectRespondedAt: new Date(),
      evidenceCount: { increment: 1 + input.evidence.length },
    },
  });

  await notifyUser(
    flag.reporterId,
    "SYSTEM",
    "Your flag is now under human review",
    "The member you flagged has responded with their side. A TrustScore reviewer will examine the evidence and decide. You will be notified of the outcome."
  );
  await recordAudit({
    actorType: "USER",
    actorId: subjectId,
    action: "FLAG_RESPONSE",
    subjectType: "Flag",
    subjectId: flag.id,
    metadata: { evidenceCount: input.evidence.length },
  });
  return { ok: true };
}

export type WithdrawResult =
  | { ok: true }
  | { ok: false; code: "NOT_FOUND" | "NOT_REPORTER" | "NOT_WITHDRAWABLE" };

export async function withdrawFlag(reporterId: string, flagId: string): Promise<WithdrawResult> {
  const flag = await db.flag.findUnique({ where: { id: flagId } });
  if (!flag) return { ok: false, code: "NOT_FOUND" };
  if (flag.reporterId !== reporterId) return { ok: false, code: "NOT_REPORTER" };
  if (flag.status !== "OPEN") return { ok: false, code: "NOT_WITHDRAWABLE" };

  await db.flag.update({ where: { id: flag.id }, data: { status: "WITHDRAWN" } });
  await notifyUser(
    flag.subjectId,
    "SYSTEM",
    "A flag against you was withdrawn",
    "The reporter withdrew their flag before a decision. It has no effect on your TrustScore and will not appear in checks."
  );
  await recordAudit({
    actorType: "USER",
    actorId: reporterId,
    action: "FLAG_WITHDRAWN",
    subjectType: "UserAccount",
    subjectId: flag.subjectId,
    metadata: {},
  });
  return { ok: true };
}

export type AppealResult =
  | { ok: true; appealId: string }
  | { ok: false; code: "NOT_FOUND" | "NOT_SUBJECT" | "NOT_CONFIRMED" | "WINDOW_CLOSED" | "ALREADY_APPEALED" };

export async function fileAppeal(
  subjectId: string,
  flagId: string,
  input: { reason: string }
): Promise<AppealResult> {
  const flag = await db.flag.findUnique({
    where: { id: flagId },
    include: { resolution: true, appeal: true },
  });
  if (!flag) return { ok: false, code: "NOT_FOUND" };
  if (flag.subjectId !== subjectId) return { ok: false, code: "NOT_SUBJECT" };
  if (flag.status !== "RESOLVED_CONFIRMED" || !flag.resolution) {
    return { ok: false, code: "NOT_CONFIRMED" };
  }
  if (flag.appeal) return { ok: false, code: "ALREADY_APPEALED" };
  const decidedAt = flag.resolution.decidedAt.getTime();
  if (Date.now() - decidedAt > APPEAL_WINDOW_MS) {
    return { ok: false, code: "WINDOW_CLOSED" };
  }

  const appeal = await db.flagAppeal.create({
    data: { flagId: flag.id, appellantId: subjectId, reason: input.reason.trim() },
  });
  await notifyUser(
    subjectId,
    "SECURITY",
    "Appeal filed — under human review",
    "Your appeal of a confirmed flag is queued for a reviewer. The reviewer examines the original evidence, your response and your appeal reason. You will be notified when the appeal is decided."
  );
  await recordAudit({
    actorType: "USER",
    actorId: subjectId,
    action: "APPEAL_FILED",
    subjectType: "Flag",
    subjectId: flag.id,
    metadata: {},
  });
  return { ok: true, appealId: appeal.id };
}

// ---------------------------------------------------------------------------
// Reviewer side — queue + decisions
// ---------------------------------------------------------------------------

export interface ReviewerContext {
  id: string;
  role: string;
}

function isReviewer(user: ReviewerContext): boolean {
  return user.role === "REVIEWER";
}

export async function getReviewQueue(reviewer: ReviewerContext) {
  if (!isReviewer(reviewer)) return null;

  const flags = await db.flag.findMany({
    where: { status: { in: ["UNDER_REVIEW", "OPEN"] } },
    orderBy: [{ status: "desc" }, { createdAt: "asc" }], // responded cases first, oldest first
    take: FLAGS_RETAIN,
    include: {
      evidence: { orderBy: { createdAt: "asc" } },
      reporter: { select: { id: true, handle: true, displayName: true } },
      subject: { select: { id: true, handle: true, displayName: true } },
      appeal: true,
    },
  });
  const appeals = await db.flagAppeal.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: FLAGS_RETAIN,
    include: {
      flag: {
        include: {
          evidence: { orderBy: { createdAt: "asc" } },
          reporter: { select: { id: true, handle: true, displayName: true } },
          subject: { select: { id: true, handle: true, displayName: true } },
          resolution: true,
        },
      },
      appellant: { select: { id: true, handle: true, displayName: true } },
    },
  });

  const parties = [
    ...flags.flatMap((f) => [f.reporter.id, f.subject.id]),
    ...appeals.flatMap((a) => [a.flag.reporter.id, a.flag.subject.id]),
  ];
  const levels = await assuranceLevelsFor(parties);

  return {
    queue: flags.map((f) => ({
      id: f.id,
      category: f.category,
      description: f.description,
      status: f.status,
      createdAt: f.createdAt.toISOString(),
      subjectRespondedAt: f.subjectRespondedAt?.toISOString() ?? null,
      reporter: {
        handle: f.reporter.handle,
        displayName: f.reporter.displayName,
        assuranceLevel: levels.get(f.reporter.id) ?? 0,
      },
      subject: {
        handle: f.subject.handle,
        displayName: f.subject.displayName,
        assuranceLevel: levels.get(f.subject.id) ?? 0,
      },
      evidence: f.evidence.map((e) => ({
        id: e.id,
        role: e.role,
        kind: e.kind,
        content: e.content,
        createdAt: e.createdAt.toISOString(),
      })),
    })),
    appeals: appeals.map((a) => ({
      id: a.id,
      reason: a.reason,
      createdAt: a.createdAt.toISOString(),
      flag: {
        id: a.flag.id,
        category: a.flag.category,
        description: a.flag.description,
        status: a.flag.status,
        createdAt: a.flag.createdAt.toISOString(),
        reporter: { handle: a.flag.reporter.handle, displayName: a.flag.reporter.displayName },
        subject: { handle: a.flag.subject.handle, displayName: a.flag.subject.displayName },
        resolution: a.flag.resolution
          ? {
              outcome: a.flag.resolution.outcome,
              rationale: a.flag.resolution.rationale,
              decidedAt: a.flag.resolution.decidedAt.toISOString(),
            }
          : null,
        evidence: a.flag.evidence.map((e) => ({
          id: e.id,
          role: e.role,
          kind: e.kind,
          content: e.content,
          createdAt: e.createdAt.toISOString(),
        })),
      },
    })),
    reviewerHandleNote:
      "Decisions are attributed to you as reviewer and published to both parties. You cannot decide a case you filed.",
  };
}

export type DecisionResult =
  | { ok: true; outcome: string; subjectId: string }
  | { ok: false; code: "NOT_FOUND" | "NOT_REVIEWER" | "NOT_DECIDABLE" | "CONFLICT" };

export async function decideFlag(
  reviewer: ReviewerContext,
  flagId: string,
  input: { outcome: "CONFIRMED" | "UNFOUNDED" | "DISMISSED"; rationale: string }
): Promise<DecisionResult> {
  if (!isReviewer(reviewer)) return { ok: false, code: "NOT_REVIEWER" };
  const flag = await db.flag.findUnique({ where: { id: flagId } });
  if (!flag) return { ok: false, code: "NOT_FOUND" };
  if (!["OPEN", "UNDER_REVIEW"].includes(flag.status)) return { ok: false, code: "NOT_DECIDABLE" };
  // Conflict of interest — a reviewer never decides their own case.
  if (flag.reporterId === reviewer.id || flag.subjectId === reviewer.id) {
    return { ok: false, code: "CONFLICT" };
  }

  const newStatus =
    input.outcome === "CONFIRMED"
      ? "RESOLVED_CONFIRMED"
      : input.outcome === "UNFOUNDED"
        ? "RESOLVED_UNFOUNDED"
        : "RESOLVED_DISMISSED";

  await db.flagResolution.create({
    data: {
      flagId: flag.id,
      reviewerId: reviewer.id,
      outcome: input.outcome,
      rationale: input.rationale.trim(),
      fraudSignal: input.outcome === "CONFIRMED",
    },
  });
  await db.flag.update({ where: { id: flag.id }, data: { status: newStatus } });

  if (input.outcome === "CONFIRMED") {
    await notifyUser(
      flag.subjectId,
      "SECURITY",
      "A flag against you was confirmed after human review",
      "A reviewer examined the evidence and confirmed the concern. It now appears as a confirmed risk signal on your TrustScore (−25, and your status changes). You have 14 days to appeal — an appeal sends the case to a fresh human review."
    );
    await notifyUser(
      flag.reporterId,
      "SYSTEM",
      "Your flag was reviewed: confirmed",
      "A TrustScore reviewer confirmed the concern you reported. Thank you — confirmed flags are one of the strongest protections the network has."
    );
  } else {
    const clearedLabel =
      input.outcome === "UNFOUNDED" ? "found to be unfounded" : "dismissed";
    await notifyUser(
      flag.subjectId,
      "SYSTEM",
      "A flag against you was cleared",
      `After human review, the flag was ${clearedLabel}. It does not appear in checks and contributes to your resolution history (+2, capped at 10). The reviewer's rationale is available in your Reputation tab.`
    );
    await notifyUser(
      flag.reporterId,
      "SYSTEM",
      `Your flag was reviewed: ${input.outcome.toLowerCase()}`,
      `A TrustScore reviewer ${clearedLabel === "found to be unfounded" ? "found the flag unfounded" : "dismissed the flag"}. Flagging is a serious action — thank you for raising the concern.`
    );
  }
  await recordAudit({
    actorType: "USER",
    actorId: reviewer.id,
    action: "FLAG_RESOLUTION",
    subjectType: "UserAccount",
    subjectId: flag.subjectId,
    metadata: { outcome: input.outcome },
  });
  return { ok: true, outcome: newStatus, subjectId: flag.subjectId };
}

export type AppealDecisionResult =
  | { ok: true; outcome: "UPHELD" | "OVERTURNED"; appellantId: string }
  | { ok: false; code: "NOT_FOUND" | "NOT_REVIEWER" | "NOT_PENDING" | "CONFLICT" };

export async function decideAppeal(
  reviewer: ReviewerContext,
  appealId: string,
  input: { outcome: "UPHELD" | "OVERTURNED"; note: string }
): Promise<AppealDecisionResult> {
  if (!isReviewer(reviewer)) return { ok: false, code: "NOT_REVIEWER" };
  const appeal = await db.flagAppeal.findUnique({
    where: { id: appealId },
    include: { flag: { include: { resolution: true } } },
  });
  if (!appeal) return { ok: false, code: "NOT_FOUND" };
  if (appeal.status !== "PENDING") return { ok: false, code: "NOT_PENDING" };
  if (appeal.flag.reporterId === reviewer.id || appeal.flag.subjectId === reviewer.id) {
    return { ok: false, code: "CONFLICT" };
  }

  const decidedAt = new Date();
  await db.flagAppeal.update({
    where: { id: appeal.id },
    data: {
      status: input.outcome,
      reviewerId: reviewer.id,
      decisionNote: input.note.trim(),
      decidedAt,
    },
  });

  if (input.outcome === "OVERTURNED") {
    // Redress: the confirmed flag flips to unfounded; the resolution row keeps
    // the original decision for the record, the flag status is the live truth.
    await db.flag.update({
      where: { id: appeal.flagId },
      data: { status: "RESOLVED_UNFOUNDED" },
    });
    await notifyUser(
      appeal.appellantId,
      "SYSTEM",
      "Your appeal succeeded — the flag was overturned",
      "A reviewer re-examined the case and overturned the confirmation. The flag now reads as cleared: the risk penalty is removed and it counts toward your resolution history. The reviewer's note is in your Reputation tab."
    );
    await notifyUser(
      appeal.flag.reporterId,
      "SYSTEM",
      "A flag you filed was overturned on appeal",
      "The subject appealed the confirmation and a reviewer overturned it. The flag now reads as unfounded and no longer affects their TrustScore."
    );
  } else {
    await notifyUser(
      appeal.appellantId,
      "SECURITY",
      "Your appeal was reviewed — the decision stands",
      "A reviewer re-examined the case and upheld the confirmation. The reviewer's note explains the reasoning. The flag remains a confirmed risk signal."
    );
    await notifyUser(
      appeal.flag.reporterId,
      "SYSTEM",
      "A flag you filed was upheld on appeal",
      "The subject appealed the confirmation; a reviewer re-examined the evidence and upheld it."
    );
  }
  await recordAudit({
    actorType: "USER",
    actorId: reviewer.id,
    action: "APPEAL_DECIDED",
    subjectType: "UserAccount",
    subjectId: appeal.appellantId,
    metadata: { outcome: input.outcome },
  });
  return { ok: true, outcome: input.outcome, appellantId: appeal.appellantId };
}

// ---------------------------------------------------------------------------
// Read model — GET /api/v1/reputation/me
// ---------------------------------------------------------------------------

export async function getReputationMe(userId: string) {
  const [user, myLevel, flagsAgainst, flagsFiled] = await Promise.all([
    db.userAccount.findUnique({
      where: { id: userId },
      select: { role: true, handle: true },
    }),
    effectiveAssuranceLevel(userId),
    db.flag.findMany({
      where: { subjectId: userId },
      orderBy: { createdAt: "desc" },
      take: FLAGS_RETAIN,
      include: {
        evidence: { orderBy: { createdAt: "asc" } },
        resolution: true,
        appeal: true,
        reporter: { select: { id: true, handle: true } },
      },
    }),
    db.flag.findMany({
      where: { reporterId: userId },
      orderBy: { createdAt: "desc" },
      take: FLAGS_RETAIN,
      include: {
        resolution: true,
        appeal: true,
        subject: { select: { id: true, handle: true } },
      },
    }),
  ]);

  const reporterLevels = await assuranceLevelsFor(
    flagsAgainst.map((f) => f.reporter.id)
  );

  const now = Date.now();
  const shapeEvidence = (e: {
    id: string;
    role: string;
    kind: string;
    content: string;
    createdAt: Date;
  }) => ({
    id: e.id,
    role: e.role,
    kind: e.kind,
    content: e.content,
    createdAt: e.createdAt.toISOString(),
  });

  const appealWindowEndsAt = (f: (typeof flagsAgainst)[number]) =>
    f.resolution ? new Date(f.resolution.decidedAt.getTime() + APPEAL_WINDOW_MS).toISOString() : null;

  const canAppeal = (f: (typeof flagsAgainst)[number]) =>
    f.status === "RESOLVED_CONFIRMED" &&
    !f.appeal &&
    f.resolution !== null &&
    now - f.resolution.decidedAt.getTime() <= APPEAL_WINDOW_MS;

  const confirmedCount = flagsAgainst.filter((f) => f.status === "RESOLVED_CONFIRMED").length;
  const clearedCount = flagsAgainst.filter((f) =>
    ["RESOLVED_UNFOUNDED", "RESOLVED_DISMISSED"].includes(f.status)
  ).length;

  return {
    role: user?.role ?? "USER",
    canFileFlags: myLevel >= 2,
    myAssuranceLevel: myLevel,
    flagWindow: { max: FLAG_WINDOW_MAX, days: 7 },
    appealWindowDays: 14,
    flagsAgainstMe: flagsAgainst.map((f) => {
      const subjectEvidence = f.evidence.filter((e) => e.role === "SUBJECT");
      const response = subjectEvidence.find((e) => e.kind === "TEXT") ?? null;
      return {
        id: f.id,
        category: f.category,
        categoryLabel: FLAG_CATEGORY_LABELS[f.category] ?? f.category,
        description: f.description,
        status: f.status,
        reporter: {
          maskedHandle: maskHandle(f.reporter.handle),
          assuranceLevel: reporterLevels.get(f.reporter.id) ?? 0,
        },
        evidence: f.evidence.filter((e) => e.role === "REPORTER").map(shapeEvidence),
        myResponse: response
          ? { content: response.content, at: response.createdAt.toISOString() }
          : null,
        myEvidence: subjectEvidence.filter((e) => e.kind !== "TEXT" || e !== response).map(shapeEvidence),
        resolution: f.resolution
          ? {
              outcome: f.resolution.outcome,
              rationale: f.resolution.rationale,
              decidedAt: f.resolution.decidedAt.toISOString(),
            }
          : null,
        appeal: f.appeal
          ? {
              status: f.appeal.status,
              reason: f.appeal.reason,
              decisionNote: f.appeal.decisionNote,
              decidedAt: f.appeal.decidedAt?.toISOString() ?? null,
            }
          : null,
        canRespond: f.status === "OPEN",
        canAppeal: canAppeal(f),
        appealWindowEndsAt: appealWindowEndsAt(f),
        createdAt: f.createdAt.toISOString(),
        subjectRespondedAt: f.subjectRespondedAt?.toISOString() ?? null,
      };
    }),
    flagsFiledByMe: flagsFiled.map((f) => ({
      id: f.id,
      subjectHandle: f.subject.handle,
      category: f.category,
      categoryLabel: FLAG_CATEGORY_LABELS[f.category] ?? f.category,
      description: f.description,
      status: f.status,
      evidenceCount: f.evidenceCount,
      resolution: f.resolution
        ? {
            outcome: f.resolution.outcome,
            rationale: f.resolution.rationale,
            decidedAt: f.resolution.decidedAt.toISOString(),
          }
        : null,
      appeal: f.appeal ? { status: f.appeal.status } : null,
      canWithdraw: f.status === "OPEN",
      createdAt: f.createdAt.toISOString(),
    })),
    stats: {
      openAgainstMe: flagsAgainst.filter((f) => ["OPEN", "UNDER_REVIEW"].includes(f.status)).length,
      confirmedAgainstMe: confirmedCount,
      clearedAgainstMe: clearedCount,
      filedByMe: flagsFiled.filter((f) => f.status !== "WITHDRAWN").length,
    },
    maskNote:
      "Reporter identities are masked in this view to prevent retaliation. Your full data-subject record (including reporter identifiers) is available in your NDPA data export.",
  };
}
