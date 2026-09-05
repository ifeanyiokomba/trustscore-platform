// TrustScore Stage 5 — PassportService (directive §5 Trust Passport).
// Share tokens / Trust Link, public trust-card views (anti-enumeration,
// view-counted, receipted), identity security center (sessions, notifications),
// trust receipts, and NDPA §36 DSR self-service (export + delete).
//
// Red lines enforced here (directive §50/§59):
// - The public card NEVER says "this person is safe" — only
//   "No confirmed adverse signals found".
// - Raw share tokens exist only in the owner's UI (once) and the viewer's URL.
//   At rest: sha256 only. No NIN/PII ever in URLs, logs or receipts.
// - Unknown tokens return a generic 404 (enumeration resistance).

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { randomBytes, createHash } from "crypto";
import { sha256Hex, hashIp, verifyPassword } from "@/lib/platform/crypto";
import { recordAudit } from "@/lib/services/audit-service";
import { notifyUser } from "@/lib/services/notification-service";
import {
  getScoreSnapshot,
  syncCredentials,
  getCredentialsForUser,
} from "@/lib/services/trustscore-service";
import { getSessionUser } from "@/lib/platform/session";

export const SHARE_SCOPES = ["PROFILE", "SIGNALS", "ATTRIBUTES", "SCORE"] as const;
export type ShareScope = (typeof SHARE_SCOPES)[number];

export const DSR_EXPORT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const RECEIPTS_RETAIN = 50;
const PUBLIC_CARD_LANGUAGE = {
  adverse: "No confirmed adverse signals found",
  disclaimer:
    "A TrustScore summarizes recorded verification evidence. It is not a guarantee that a person is safe to deal with.",
};

function newRawShareToken(): string {
  return `ts_${randomBytes(24).toString("base64url")}`;
}

function shareHash(raw: string): string {
  return sha256Hex(`share:${raw}`);
}

// ---------------------------------------------------------------------------
// Read model — GET /api/v1/passport/me
// ---------------------------------------------------------------------------

export async function getPassportForUser(userId: string, currentToken?: string) {
  const [user, snapshot, credentials, shareTokens, receipts, sessions, notifications, identity, activeSessionCount] =
    await Promise.all([
      db.userAccount.findUnique({
        where: { id: userId },
        select: { displayName: true, handle: true, email: true, createdAt: true, status: true },
      }),
      getScoreSnapshot(userId),
      getCredentialsForUser(userId),
      db.shareToken.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      db.trustReceipt.findMany({
        where: { userId },
        orderBy: { viewedAt: "desc" },
        take: 20,
      }),
      db.session.findMany({
        where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
        take: 10, // most recent devices; activeSessionCount carries the total
      }),
      db.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      db.trustIdentity.findUnique({
        where: { userId },
        select: { status: true, assuranceLevel: true, expiresAt: true },
      }),
      db.session.count({
        where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      }),
    ]);

  const now = Date.now();
  const shapedTokens = shareTokens.map((t) => {
    const expired =
      t.status === "ACTIVE" && (t.expiresAt.getTime() <= now || t.views >= t.maxViews);
    const status = t.status === "ACTIVE" && expired ? "EXPIRED" : t.status;
    return {
      id: t.id,
      scopes: JSON.parse(t.scopes) as string[],
      maxViews: t.maxViews,
      views: t.views,
      viewsLeft: Math.max(0, t.maxViews - t.views),
      status,
      expiresAt: t.expiresAt.toISOString(),
      revokedAt: t.revokedAt?.toISOString() ?? null,
      lastViewedAt: t.lastViewedAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
    };
  });

  // Security events: the user's own actions PLUS anonymous viewer events on
  // their share tokens PLUS Stage 6 named safety checks + trust requests
  // (subject linkage — the owner sees who-checked-when).
  const securityEvents = await db.auditEvent.findMany({
    where: {
      OR: [
        { actorId: userId },
        {
          AND: [
            { action: { in: ["SHARE_TOKEN_VIEWED", "SHARE_TOKEN_BLOCKED"] } },
            { subjectType: "ShareToken", subjectId: { in: shareTokens.map((t) => t.id) } },
          ],
        },
        {
          AND: [
            { action: { in: ["SAFETY_CHECK_RUN", "TRUST_REQUEST_SENT"] } },
            { subjectType: "UserAccount", subjectId: userId },
          ],
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, action: true, createdAt: true },
  });

  return {
    profile: user
      ? {
          displayName: user.displayName,
          handle: user.handle,
          email: user.email,
          memberSince: user.createdAt.toISOString(),
          status: user.status,
        }
      : null,
    assurance: {
      level:
        identity &&
        identity.status === "VERIFIED" &&
        (identity.expiresAt?.getTime() ?? 0) > Date.now()
          ? identity.assuranceLevel
          : 0,
    },
    score: snapshot,
    credentials,
    shareTokens: shapedTokens,
    receipts: receipts.map((r) => {
      let shown: Record<string, unknown> = {};
      try {
        shown = JSON.parse(r.cardShown) as Record<string, unknown>;
      } catch {
        shown = {};
      }
      return {
        id: r.id,
        viewerLabel: r.viewerLabel,
        channel: r.channel,
        viewedAt: r.viewedAt.toISOString(),
        shown,
      };
    }),
    sessions: sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      ipHashPrefix: s.ipHash ? `${s.ipHash.slice(0, 8)}…` : null,
      current: currentToken ? s.tokenHash === sha256Hex(currentToken) : false,
    })),
    activeSessionCount,
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadNotifications: notifications.filter((n) => n.readAt === null).length,
    securityEvents: securityEvents.map((e) => ({
      id: e.id,
      action: e.action,
      createdAt: e.createdAt.toISOString(),
    })),
    cardLanguage: PUBLIC_CARD_LANGUAGE,
  };
}

// ---------------------------------------------------------------------------
// Share tokens
// ---------------------------------------------------------------------------

export interface CreateShareInput {
  ttlHours: number;
  maxViews: number;
  scopes: string[];
}

export async function createShareToken(userId: string, input: CreateShareInput) {
  const raw = newRawShareToken();
  const expiresAt = new Date(Date.now() + input.ttlHours * 3600_000);
  const row = await db.shareToken.create({
    data: {
      userId,
      tokenHash: shareHash(raw),
      scopes: JSON.stringify(input.scopes),
      maxViews: input.maxViews,
      expiresAt,
    },
  });
  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "SHARE_TOKEN_CREATED",
    subjectType: "ShareToken",
    subjectId: row.id,
    metadata: {
      ttlHours: input.ttlHours,
      maxViews: input.maxViews,
      scopeSet: input.scopes.join(","),
    },
  });
  await notifyUser(
    userId,
    "SECURITY",
    "Trust link created",
    `A new trust link was created. It can be opened ${input.maxViews} time${input.maxViews === 1 ? "" : "s"} and expires ${new Date(expiresAt).toLocaleString("en-NG")}. Every open is recorded to your trust receipts.`
  );
  return {
    // Raw token: returned exactly ONCE — the client must persist/QR it now.
    token: raw,
    linkPath: `/?trust=${raw}`,
    id: row.id,
    scopes: input.scopes,
    maxViews: input.maxViews,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function revokeShareToken(userId: string, tokenId: string): Promise<"REVOKED" | "NOT_FOUND" | "ALREADY"> {
  const row = await db.shareToken.findFirst({ where: { id: tokenId, userId } });
  if (!row) return "NOT_FOUND";
  if (row.status === "REVOKED") return "ALREADY";
  await db.shareToken.update({
    where: { id: row.id },
    data: { status: "REVOKED", revokedAt: new Date() },
  });
  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "SHARE_TOKEN_REVOKED",
    subjectType: "ShareToken",
    subjectId: row.id,
    metadata: { views: row.views },
  });
  return "REVOKED";
}

// ---------------------------------------------------------------------------
// Public trust card view — GET /api/v1/passport/public/:token (no auth)
// ---------------------------------------------------------------------------

export type PublicViewResult =
  | {
      outcome: "OK";
      card: Record<string, unknown>;
      // Internal fields (never returned by the anonymous public route):
      subject: { id: string; displayName: string; handle: string };
      shareTokenId: string;
      scopes: string[];
      attributes: { key: string; value: string }[];
    }
  | { outcome: "NOT_FOUND" }
  | { outcome: "EXPIRED"; reason: "EXPIRED" | "REVOKED" | "VIEW_LIMIT" }
  | { outcome: "RATE_LIMITED" };

// A NAMED viewer (Stage 6 Safety Check): an authenticated member opening the
// trust link through the verifier console. The receipt + audit record WHO
// checked (their handle), not just that someone did.
export interface NamedViewer {
  id: string;
  displayName: string;
  handle: string;
}

export async function viewPublicCard(
  rawToken: string,
  req?: NextRequest,
  viewer?: NamedViewer
): Promise<PublicViewResult> {
  if (!/^ts_[A-Za-z0-9_-]{20,60}$/.test(rawToken)) {
    return { outcome: "NOT_FOUND" };
  }
  const row = await db.shareToken.findUnique({ where: { tokenHash: shareHash(rawToken) } });
  if (!row) return { outcome: "NOT_FOUND" }; // generic — enumeration-resistant

  const now = Date.now();
  if (row.status === "REVOKED") return { outcome: "EXPIRED", reason: "REVOKED" };
  if (row.expiresAt.getTime() <= now) return { outcome: "EXPIRED", reason: "EXPIRED" };
  if (row.views >= row.maxViews) return { outcome: "EXPIRED", reason: "VIEW_LIMIT" };

  const user = await db.userAccount.findUnique({
    where: { id: row.userId },
    select: { id: true, displayName: true, handle: true, status: true },
  });
  if (!user || user.status !== "ACTIVE") return { outcome: "EXPIRED", reason: "REVOKED" };

  const scopes = JSON.parse(row.scopes) as string[];
  const snapshot = await getScoreSnapshot(user.id);
  const [credentials, identity] = await Promise.all([
    getCredentialsForUser(user.id),
    db.trustIdentity.findUnique({
      where: { userId: user.id },
      include: {
        identifiers: true,
        attributes: { where: { status: "ACTIVE" } },
      },
    }),
  ]);

  // Count the view + write the receipt BEFORE returning the card — the view
  // is the product (directive: who-checked-you is logged).
  const shown: Record<string, unknown> = {
    status: snapshot.status,
    score: snapshot.score,
    confidence: snapshot.confidence,
    riskBand: snapshot.riskBand,
  };
  await db.shareToken.update({
    where: { id: row.id },
    data: { views: { increment: 1 }, lastViewedAt: new Date() },
  });
  await db.trustReceipt.create({
    data: {
      userId: user.id,
      shareTokenId: row.id,
      viewerLabel: viewer ? `Safety Check by @${viewer.handle}` : "Trust link viewer",
      channel: viewer ? "SAFETY_CHECK" : "TRUST_LINK",
      cardShown: JSON.stringify(shown),
      ipHash: req
        ? hashIp(
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
              req.headers.get("x-real-ip")
          )
        : null,
    },
  });
  // Prune receipts: keep the most recent RECEIPTS_RETAIN per user.
  const stale = await db.trustReceipt.findMany({
    where: { userId: user.id },
    orderBy: { viewedAt: "desc" },
    skip: RECEIPTS_RETAIN,
    select: { id: true },
  });
  if (stale.length > 0) {
    await db.trustReceipt.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
  }

  if (row.views === 0) {
    // First open of this link — the owner wants to know.
    await notifyUser(
      user.id,
      "SECURITY",
      "Your Trust Card was viewed",
      viewer
        ? `@${viewer.handle} opened your trust link for the first time (Safety Check). The check is recorded in your trust receipts.`
        : "Someone opened your trust link for the first time. The check is recorded in your trust receipts."
    );
  }
  await recordAudit({
    actorType: viewer ? "USER" : "ANONYMOUS",
    actorId: viewer?.id,
    action: "SHARE_TOKEN_VIEWED",
    subjectType: "ShareToken",
    subjectId: row.id,
    metadata: { views: row.views + 1, viewsLeft: Math.max(0, row.maxViews - row.views - 1) },
  });

  const now2 = Date.now();
  const signalChips: Record<string, unknown>[] = [];
  if (identity && scopes.includes("SIGNALS")) {
    for (const i of identity.identifiers) {
      if (i.status !== "ACTIVE") continue;
      if ((i.expiresAt?.getTime() ?? 0) <= now2) continue;
      signalChips.push({
        type: i.type,
        hint: i.hint,
        verifiedAt: i.verifiedAt.toISOString(),
        expiresAt: i.expiresAt?.toISOString() ?? null,
      });
    }
  }

  const card: Record<string, unknown> = {
    viewerNotice: "This check was recorded to the owner's trust receipts.",
    language: PUBLIC_CARD_LANGUAGE,
    freshness: {
      computedAt: snapshot.computedAt,
      expiresAt: snapshot.expiresAt,
    },
  };
  if (scopes.includes("PROFILE")) {
    card.profile = {
      displayName: user.displayName,
      handle: user.handle,
    };
  }
  if (scopes.includes("SCORE")) {
    card.score = {
      status: snapshot.status,
      score: snapshot.score,
      confidence: snapshot.confidence,
      riskBand: snapshot.riskBand,
      components: snapshot.components,
    };
    card.assurance = { level: identity?.status === "VERIFIED" ? identity.assuranceLevel : 0 };
  }
  if (scopes.includes("SIGNALS")) {
    card.signals = signalChips;
  }
  if (scopes.includes("ATTRIBUTES") && identity) {
    card.attributes = identity.attributes
      .filter((a) => (a.expiresAt?.getTime() ?? Infinity) > now2)
      .map((a) => ({ key: a.key, value: a.value }));
  }
  card.credentialsCount = credentials.filter(
    (c) => c.status === "ACTIVE" && (c.expiresAt ? Date.parse(c.expiresAt) > now2 : true)
  ).length;
  return {
    outcome: "OK",
    card,
    // Internal context for the Safety Check service (Stage 6). The anonymous
    // public route strips these before responding.
    subject: { id: user.id, displayName: user.displayName, handle: user.handle },
    shareTokenId: row.id,
    scopes,
    attributes: (card.attributes as { key: string; value: string }[] | undefined) ?? [],
  };
}

// ---------------------------------------------------------------------------
// Credential revocation (manual — sticks)
// ---------------------------------------------------------------------------

export async function revokeCredential(
  userId: string,
  credentialId: string
): Promise<"REVOKED" | "NOT_FOUND" | "ALREADY"> {
  const row = await db.credential.findFirst({ where: { id: credentialId, userId } });
  if (!row) return "NOT_FOUND";
  if (row.status === "REVOKED" && row.manualRevoked) return "ALREADY";
  await db.credential.update({
    where: { id: row.id },
    data: { status: "REVOKED", revokedAt: new Date(), manualRevoked: true },
  });
  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "CREDENTIAL_REVOKED",
    subjectType: "Credential",
    subjectId: row.id,
    metadata: { type: row.type },
  });
  await notifyUser(
    userId,
    "SECURITY",
    "Credential revoked",
    `Your "${row.type.replace(/_/g, " ").toLowerCase()}" credential was revoked. It will no longer appear on your Trust Card until the underlying signal is re-verified.`
  );
  return "REVOKED";
}

// ---------------------------------------------------------------------------
// Security center — sessions
// ---------------------------------------------------------------------------

export async function revokeSessionById(
  userId: string,
  sessionId: string,
  currentToken: string | undefined
): Promise<{ outcome: "REVOKED" | "NOT_FOUND" | "IS_CURRENT" }> {
  const row = await db.session.findFirst({
    where: { id: sessionId, userId, revokedAt: null },
  });
  if (!row) return { outcome: "NOT_FOUND" };
  if (currentToken && row.tokenHash === sha256Hex(currentToken)) {
    return { outcome: "IS_CURRENT" };
  }
  await db.session.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "SESSION_REVOKED",
    subjectType: "Session",
    subjectId: row.id,
  });
  return { outcome: "REVOKED" };
}

export function currentSessionToken(req: NextRequest): string | undefined {
  return req.cookies.get("ts_session")?.value;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function listNotifications(userId: string) {
  const rows = await db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return {
    notifications: rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    })),
    unread: rows.filter((n) => n.readAt === null).length,
  };
}

export async function markNotificationsRead(userId: string, id?: string): Promise<number> {
  const where = id ? { userId, id } : { userId, readAt: null };
  const res = await db.notification.updateMany({ where, data: { readAt: new Date() } });
  return res.count;
}

// ---------------------------------------------------------------------------
// DSR — NDPA §36 self-service
// ---------------------------------------------------------------------------

async function buildExportPayload(userId: string): Promise<Record<string, unknown>> {
  const [user, identity, consents, evidence, credentials, shareTokens, receipts, sessions, notifications, audit, dsr, phoneVerifications, livenessSessions, verificationSessions, safetyChecks, trustRequests] =
    await Promise.all([
      db.userAccount.findUnique({ where: { id: userId } }),
      db.trustIdentity.findUnique({
        where: { userId },
        include: { identifiers: true, attributes: true },
      }),
      db.consent.findMany({ where: { userId } }),
      db.evidence.findMany({ where: { userId } }),
      db.credential.findMany({ where: { userId } }),
      db.shareToken.findMany({ where: { userId } }),
      db.trustReceipt.findMany({ where: { userId } }),
      db.session.findMany({ where: { userId } }),
      db.notification.findMany({ where: { userId } }),
      db.auditEvent.findMany({ where: { actorId: userId }, orderBy: { createdAt: "desc" }, take: 200 }),
      db.dsrRequest.findMany({ where: { userId } }),
      db.phoneVerification.findMany({ where: { userId } }),
      db.livenessSession.findMany({ where: { userId } }),
      db.verificationSession.findMany({ where: { userId }, include: { events: true } }),
      db.safetyCheck.findMany({
        where: { OR: [{ verifierId: userId }, { subjectId: userId }] },
        orderBy: { createdAt: "desc" },
      }),
      db.trustRequest.findMany({
        where: { OR: [{ verifierId: userId }, { subjectId: userId }] },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  return {
    exportedAt: new Date().toISOString(),
    legalBasis: "Nigeria Data Protection Act 2023, s.36 — right of access to personal data",
    retentionNote:
      "This export contains every record TrustScore holds about you. Stored identifiers are already salted hashes — the raw values (NIN, phone number) were never stored and cannot be exported by anyone, including us.",
    account: user
      ? {
          email: user.email,
          displayName: user.displayName,
          handle: user.handle,
          status: user.status,
          createdAt: user.createdAt,
          acceptedTermsAt: user.acceptedTermsAt,
          passwordHash: user.passwordHash,
          passwordSalt: user.passwordSalt,
        }
      : null,
    trustIdentity: identity
      ? {
          status: identity.status,
          assuranceLevel: identity.assuranceLevel,
          provider: identity.provider,
          providerMode: identity.providerMode,
          providerIdentityRef: identity.providerIdentityRef,
          verifiedAt: identity.verifiedAt,
          expiresAt: identity.expiresAt,
          createdAt: identity.createdAt,
          identifiers: identity.identifiers,
          attributes: identity.attributes,
        }
      : null,
    consents,
    evidence,
    credentials: credentials.map((c) => ({ ...c, claims: JSON.parse(c.claims) })),
    shareTokens: shareTokens.map((t) => ({ ...t, scopes: JSON.parse(t.scopes) })),
    trustReceipts: receipts.map((r) => ({ ...r, cardShown: JSON.parse(r.cardShown) })),
    sessions: sessions.map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      revokedAt: s.revokedAt,
      userAgent: s.userAgent,
      ipHash: s.ipHash,
    })),
    notifications,
    auditEvents: audit,
    dsrRequests: dsr.map((d) => ({ ...d, payload: d.payload ? "<omitted: available via download>" : null })),
    phoneVerifications: phoneVerifications.map((p) => ({
      id: p.id,
      phoneHash: p.phoneHash,
      phoneHint: p.phoneHint,
      status: p.status,
      otpHash: p.otpHash,
      simSwapRisk: p.simSwapRisk,
      createdAt: p.createdAt,
      verifiedAt: p.verifiedAt,
    })),
    livenessSessions: livenessSessions.map((l) => ({
      id: l.id,
      jobId: l.jobId,
      status: l.status,
      result: l.result ? JSON.parse(l.result) : null,
      confidence: l.confidence,
      createdAt: l.createdAt,
      completedAt: l.completedAt,
    })),
    verificationSessions: verificationSessions.map((v) => ({
      id: v.id,
      provider: v.provider,
      status: v.status,
      flow: v.flow,
      scopes: JSON.parse(v.scopes),
      purpose: v.purpose,
      createdAt: v.createdAt,
      completedAt: v.completedAt,
      events: v.events.map((e) => ({ eventType: e.eventType, createdAt: e.createdAt })),
    })),
    safetyChecks: safetyChecks.map((c) => ({
      id: c.id,
      role: c.verifierId === userId ? "verifier" : "subject",
      method: c.method,
      assessment: JSON.parse(c.assessment),
      createdAt: c.createdAt,
    })),
    trustRequests: trustRequests.map((r) => ({
      id: r.id,
      role: r.verifierId === userId ? "verifier" : "subject",
      status: r.status,
      message: r.message,
      createdAt: r.createdAt,
      respondedAt: r.respondedAt,
    })),
  };
}

export async function createDsrExport(userId: string) {
  const payload = await buildExportPayload(userId);
  const payloadStr = JSON.stringify(payload, null, 2);
  const row = await db.dsrRequest.create({
    data: {
      userId,
      type: "EXPORT",
      status: "COMPLETED",
      detail: "Data export generated (NDPA §36 right of access)",
      payload: payloadStr,
      completedAt: new Date(),
      expiresAt: new Date(Date.now() + DSR_EXPORT_RETENTION_MS),
    },
  });
  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "DSR_EXPORT_COMPLETED",
    subjectType: "DsrRequest",
    subjectId: row.id,
    metadata: { exportBytes: payloadStr.length, type: "EXPORT" },
  });
  await notifyUser(
    userId,
    "SYSTEM",
    "Your data export is ready",
    "Your NDPA §36 data export has been generated and is available to download for 7 days."
  );
  return { id: row.id, bytes: payloadStr.length, expiresAt: row.expiresAt!.toISOString() };
}

export async function getDsrExportPayload(userId: string, requestId: string) {
  const row = await db.dsrRequest.findFirst({ where: { id: requestId, userId } });
  if (!row || row.type !== "EXPORT" || !row.payload) return null;
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
    return { expired: true as const };
  }
  return { expired: false as const, payload: row.payload, id: row.id };
}

export async function requestDsrDelete(
  req: NextRequest,
  password: string
): Promise<
  | { outcome: "OK"; exportFirst: { id: string } | null }
  | { outcome: "WRONG_PASSWORD" }
  | { outcome: "NOT_FOUND" }
> {
  const user = await getSessionUser(req);
  if (!user) return { outcome: "NOT_FOUND" };
  const row = await db.userAccount.findUnique({ where: { id: user.id } });
  if (!row) return { outcome: "NOT_FOUND" };
  if (!verifyPassword(password, row.passwordSalt, row.passwordHash)) {
    await recordAudit({
      actorType: "USER",
      actorId: user.id,
      action: "DSR_DELETE_REQUESTED",
      metadata: { outcome: "rejected" },
    });
    return { outcome: "WRONG_PASSWORD" };
  }

  // Final export snapshot (legal kindness — last chance to take your data).
  const exportRow = await db.dsrRequest.create({
    data: {
      userId: user.id,
      type: "EXPORT",
      status: "COMPLETED",
      detail: "Final export generated before account deletion",
      payload: JSON.stringify(await buildExportPayload(user.id), null, 2),
      completedAt: new Date(),
      expiresAt: new Date(Date.now() + DSR_EXPORT_RETENTION_MS),
    },
  });

  // Tombstone BEFORE the cascade wipe — AuditEvent has no FK to the user, so
  // it survives. Redacted: counts only, no PII.
  const counts = {
    consents: await db.consent.count({ where: { userId: user.id } }),
    evidence: await db.evidence.count({ where: { userId: user.id } }),
    receipts: await db.trustReceipt.count({ where: { userId: user.id } }),
  };
  await recordAudit({
    actorType: "USER",
    actorId: user.id,
    action: "DSR_DELETE_COMPLETED",
    subjectType: "UserAccount",
    subjectId: user.id,
    metadata: { deleted: true, requests: counts.consents + counts.evidence + counts.receipts },
  });

  await db.userAccount.delete({ where: { id: user.id } }); // cascade wipes identity spine
  return { outcome: "OK", exportFirst: { id: exportRow.id } };
}

export async function listDsrRequests(userId: string) {
  const rows = await db.dsrRequest.findMany({
    where: { userId },
    orderBy: { requestedAt: "desc" },
    take: 10,
    select: {
      id: true,
      type: true,
      status: true,
      detail: true,
      requestedAt: true,
      completedAt: true,
      expiresAt: true,
    },
  });
  return rows.map((r) => ({
    ...r,
    requestedAt: r.requestedAt.toISOString(),
    completedAt: r.completedAt?.toISOString() ?? null,
    expiresAt: r.expiresAt?.toISOString() ?? null,
  }));
}
