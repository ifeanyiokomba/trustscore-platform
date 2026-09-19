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
import { isAutomatedDecisionsEnabled } from "@/lib/services/engine-service";
import type { ShareAnalytics } from "@/lib/types";

export const SHARE_SCOPES = ["PROFILE", "SIGNALS", "ATTRIBUTES", "SCORE"] as const;
export type ShareScope = (typeof SHARE_SCOPES)[number];

export const DSR_EXPORT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const RECEIPTS_RETAIN = 50;
const RECEIPTS_READ_WINDOW = 20;
// Batch 5 — freshness nudges: an ACTIVE credential whose horizon is inside
// NUDGE_SOON_DAYS (or already past) produces a VERIFICATION notification on
// the /passport/me read path, deduped per (user, type, title) for a week.
const NUDGE_SOON_MS = 14 * 24 * 60 * 60 * 1000;
const NUDGE_DEDUPE_MS = 7 * 24 * 60 * 60 * 1000;
const PUBLIC_CARD_LANGUAGE = {
  adverse: "No confirmed adverse signals found",
  disclaimer:
    "A TrustScore summarizes recorded verification evidence. It is not a guarantee that a person is safe to deal with.",
};

// Batch 5 — receipt channels with display metadata (icon keys resolved by the
// frontend): anonymous link opens, named member Safety Checks, B2B API checks.
export const RECEIPT_CHANNELS = ["TRUST_LINK", "SAFETY_CHECK", "API_CHECK"] as const;
export type ReceiptChannel = (typeof RECEIPT_CHANNELS)[number];

function newRawShareToken(): string {
  return `ts_${randomBytes(24).toString("base64url")}`;
}

function shareHash(raw: string): string {
  return sha256Hex(`share:${raw}`);
}

// ---------------------------------------------------------------------------
// Batch 5 — freshness nudges (owner read path only, never public reads)
// ---------------------------------------------------------------------------

// Credential read-model rows (subset of CredentialInfo used here).
interface NudgeCredential {
  type: string;
  label: string;
  status: string;
  expiresAt: string | null;
}

/**
 * Emit freshness nudge notifications for ACTIVE credentials whose horizon is
 * inside 14 days (or past) and for a VERIFIED government identity inside its
 * own horizon. Dedupe: a (type, title) notification for this user created in
 * the last 7 days (read or unread) suppresses a re-issue. Returns the number
 * of notifications created. Bodies carry LABELS only — never raw values.
 */
async function maybeFreshnessNudges(
  userId: string,
  credentials: NudgeCredential[],
  identity: { status: string; expiresAt: Date | null } | null
): Promise<number> {
  const now = Date.now();
  const soonCutoff = now + NUDGE_SOON_MS;
  const dedupeSince = new Date(now - NUDGE_DEDUPE_MS);
  let created = 0;

  const nudgeOnce = async (title: string, body: string): Promise<void> => {
    const existing = await db.notification.findFirst({
      where: {
        userId,
        type: "VERIFICATION",
        title,
        createdAt: { gt: dedupeSince },
      },
      select: { id: true },
    });
    if (existing) return;
    await notifyUser(userId, "VERIFICATION", title, body);
    created += 1;
  };

  for (const c of credentials) {
    // Nudge only rows that still carry their source (read-model ACTIVE, or
    // ACTIVE-in-DB past-horizon rows surfaced as EXPIRED). Manually/source
    // REVOKED rows are intentional states — an expiry nudge would be noise.
    if ((c.status !== "ACTIVE" && c.status !== "EXPIRED") || !c.expiresAt) continue;
    const exp = Date.parse(c.expiresAt);
    if (Number.isNaN(exp)) continue;
    if (exp <= now) {
      await nudgeOnce(
        "Credential expired",
        `${c.label} — renew to keep your Trust Score current.`
      );
    } else if (exp <= soonCutoff) {
      await nudgeOnce(
        "Credential expiring soon",
        `${c.label} — renew to keep your Trust Score current.`
      );
    }
  }

  // The government identity 90-day horizon: same nudge family, own title.
  if (identity && identity.status === "VERIFIED" && identity.expiresAt) {
    const exp = identity.expiresAt.getTime();
    if (exp <= now) {
      await nudgeOnce(
        "Government identity expired",
        "Government identity verified — renew to keep your Trust Score current."
      );
    } else if (exp <= soonCutoff) {
      await nudgeOnce(
        "Government identity expiring soon",
        "Government identity verified — renew to keep your Trust Score current."
      );
    }
  }

  return created;
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
        take: RECEIPTS_READ_WINDOW,
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

  // Batch 5 — receipts richness: join each receipt's share token so the owner
  // can see WHICH link was opened and whether that link is still live. The
  // join is owner-scoped (userId must match) so a stray shareTokenId can
  // never surface another user's link metadata. Only non-PII linkage
  // metadata leaves the DB (status + scopes + view counters); raw tokens and
  // IP hashes never do.
  const receiptTokenIds = [
    ...new Set(receipts.map((r) => r.shareTokenId).filter((x): x is string => !!x)),
  ];
  const receiptTokens = receiptTokenIds.length
    ? await db.shareToken.findMany({
        where: { id: { in: receiptTokenIds }, userId },
        select: { id: true, scopes: true, status: true, expiresAt: true, views: true, maxViews: true },
      })
    : [];
  const tokenById = new Map(receiptTokens.map((t) => [t.id, t]));
  const shapeLink = (
    tokenId: string | null
  ): {
    status: string | null;
    scopes: string[];
    token: { status: string; scopes: string[]; views: number; maxViews: number } | null;
  } => {
    if (!tokenId) return { status: null, scopes: [], token: null };
    const t = tokenById.get(tokenId);
    // token: null when the receipt predates linkage or the row no longer
    // resolves (owner-scoped join came back empty).
    if (!t) return { status: null, scopes: [], token: null };
    const expired =
      t.status === "ACTIVE" && (t.expiresAt.getTime() <= now || t.views >= t.maxViews);
    const status = t.status === "ACTIVE" && expired ? "EXPIRED" : t.status;
    const scopes = JSON.parse(t.scopes) as string[];
    return {
      status,
      scopes,
      token: { status, scopes, views: t.views, maxViews: t.maxViews },
    };
  };

  // Batch 5 — receipts header stats: total retained + per-channel counts
  // (pruning keeps at most RECEIPTS_RETAIN per user).
  const [totalReceipts, channelGroups] = await Promise.all([
    db.trustReceipt.count({ where: { userId } }),
    db.trustReceipt.groupBy({ by: ["channel"], where: { userId }, _count: { _all: true } }),
  ]);
  const byChannel: Record<string, number> = {};
  for (const g of channelGroups) {
    byChannel[g.channel] = g._count._all;
  }
  const receiptsStats = {
    total: totalReceipts,
    byChannel,
  };

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
  // PLUS Stage 7 flag/appeal events about them (subject linkage — the owner
  // sees who-checked-when and flag milestones).
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
            { action: { in: ["SAFETY_CHECK_RUN", "TRUST_REQUEST_SENT", "FLAG_SUBMITTED", "FLAG_RESOLUTION", "APPEAL_DECIDED"] } },
            { subjectType: "UserAccount", subjectId: userId },
          ],
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, action: true, createdAt: true },
  });

  // Batch 5 — freshness nudges (read path): an ACTIVE credential whose
  // expiresAt is inside the 14-day horizon (or already past) and a VERIFIED
  // government identity inside its own horizon each produce a VERIFICATION
  // notification, deduped per (type, title) for 7 days. Labels only — no
  // raw values in bodies.
  const nudged = await maybeFreshnessNudges(userId, credentials, identity);
  let shapedNotifications = notifications;
  if (nudged > 0) {
    // Keep this response self-consistent when a nudge just landed.
    shapedNotifications = await db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }

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
      // Batch 5 — token linkage (additive): which link was opened, its live
      // status and the scopes it discloses. null status = no link recorded
      // (pre-Stage-5-shape rows) or the token row no longer resolves.
      // `token` (task 3-a) is the same linkage as a nested object with the
      // link's view counters; linkStatus/linkScopes stay for the receipts card.
      const link = shapeLink(r.shareTokenId);
      return {
        id: r.id,
        viewerLabel: r.viewerLabel,
        channel: r.channel,
        viewedAt: r.viewedAt.toISOString(),
        shown,
        shareTokenId: r.shareTokenId,
        linkStatus: link.status,
        linkScopes: link.scopes,
        token: link.token,
      };
    }),
    // Batch 5 — receipts header stats (additive): total retained + per channel.
    receiptsStats,
    sessions: sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      ipHashPrefix: s.ipHash ? `${s.ipHash.slice(0, 8)}…` : null,
      current: currentToken ? s.tokenHash === sha256Hex(currentToken) : false,
    })),
    activeSessionCount,
    notifications: shapedNotifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadNotifications: shapedNotifications.filter((n) => n.readAt === null).length,
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
// Batch 5 — share-link analytics (owner-only)
// ---------------------------------------------------------------------------

/**
 * Owner-scoped analytics for one share token: derived entirely from the
 * TrustReceipts written by viewPublicCard. Anti-enumeration: a token that
 * belongs to another user (or does not exist) returns null → 404, identical
 * to the revoke route. No raw tokens, no IP hashes, no viewer PII — counts
 * and receipt labels only. The ShareAnalytics response type lives in
 * src/lib/types.ts (single source of truth for the client mirror).
 */
export async function getShareAnalytics(
  userId: string,
  tokenId: string
): Promise<ShareAnalytics | null> {
  const token = await db.shareToken.findFirst({
    where: { id: tokenId, userId },
  });
  if (!token) return null;

  // Audit fires only for a resolved owner link (task 3-a): the ShareToken
  // cuid is the sole metadata — never raw tokens or viewer identifiers.
  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "SHARE_ANALYTICS_VIEWED",
    subjectType: "ShareToken",
    subjectId: tokenId,
    metadata: { tokenId },
  });

  // Receipts are gathered owner-scoped (userId belt-and-braces against
  // cross-linked rows) in viewedAt asc order: receipts[0] is the FIRST open,
  // the array tail carries the most recent ones.
  const receipts = await db.trustReceipt.findMany({
    where: { shareTokenId: token.id, userId },
    orderBy: { viewedAt: "asc" },
  });

  const now = Date.now();
  const expired =
    token.status === "ACTIVE" && (token.expiresAt.getTime() <= now || token.views >= token.maxViews);
  const status = token.status === "ACTIVE" && expired ? "EXPIRED" : token.status;

  const firstViewedAt = receipts.length > 0 ? receipts[0].viewedAt : null;

  const opensByChannel: Record<string, number> = {};
  for (const r of receipts) {
    opensByChannel[r.channel] = (opensByChannel[r.channel] ?? 0) + 1;
  }
  const uniqueIps = new Set(
    receipts.map((r) => r.ipHash).filter((h): h is string => !!h)
  );

  return {
    tokenId: token.id,
    scopes: JSON.parse(token.scopes) as string[],
    status,
    maxViews: token.maxViews,
    views: token.views,
    viewsLeft: Math.max(0, token.maxViews - token.views),
    lastViewedAt: token.lastViewedAt?.toISOString() ?? null,
    createdAt: token.createdAt.toISOString(),
    expiresAt: token.expiresAt.toISOString(),
    revokedAt: token.revokedAt?.toISOString() ?? null,
    firstViewedAt: firstViewedAt?.toISOString() ?? null,
    uniqueViewers: uniqueIps.size,
    opensByChannel,
    recentOpens: receipts.slice(-20).map((r) => ({
      viewedAt: r.viewedAt.toISOString(),
      channel: r.channel,
      viewerLabel: r.viewerLabel,
    })),
    firstOpenLatencyMinutes:
      firstViewedAt !== null
        ? Math.max(0, Math.round((firstViewedAt.getTime() - token.createdAt.getTime()) / 60_000))
        : null,
  };
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
  // Stage 9 — B2B API clients open trust links through the Trust Decision
  // API. Receipts then say the BUSINESS checked (channel API_CHECK), not a
  // member handle — who-checked-you stays precise.
  kind?: "MEMBER" | "API_CLIENT";
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
      viewerLabel: viewer
        ? viewer.kind === "API_CLIENT"
          ? `Trust API check by ${viewer.displayName}`
          : `Safety Check by @${viewer.handle}`
        : "Trust link viewer",
      channel: viewer ? (viewer.kind === "API_CLIENT" ? "API_CHECK" : "SAFETY_CHECK") : "TRUST_LINK",
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
        ? viewer.kind === "API_CLIENT"
          ? `${viewer.displayName} (an integrated business) opened your trust link for the first time via the Trust Decision API. The check is recorded in your trust receipts.`
          : `@${viewer.handle} opened your trust link for the first time (Safety Check). The check is recorded in your trust receipts.`
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
  const [user, identity, consents, evidence, credentials, shareTokens, receipts, sessions, notifications, audit, dsr, phoneVerifications, livenessSessions, verificationSessions, safetyChecks, trustRequests, flags, scoreSnapshots, apiClientsOwnedOrTeamed, myApiMemberships, myApiUsageDays, networkMembership, networkEdges, networkSignals] =
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
      // Stage 7 — full reputation record (reporter identities are unmasked in
      // the export: NDPA access right beats the UI retaliation shield).
      // Dangling-FK tolerance: handles resolve post-query (raw-SQL test
      // cleanups may have removed a counterparty).
      db.flag.findMany({
        where: { OR: [{ reporterId: userId }, { subjectId: userId }] },
        orderBy: { createdAt: "desc" },
        include: {
          evidence: { orderBy: { createdAt: "asc" } },
          resolution: true,
          appeal: true,
        },
      }),
      // Stage 8 — score snapshots with policy provenance (which rules produced
      // each score — the engine section below joins the policy summaries)
      db.trustScoreSnapshot.findMany({
        where: { userId },
        orderBy: { computedAt: "desc" },
        take: 20,
      }),
      // Stage 9 — B2B developer-portal footprint: owned clients, teams you
      // sit on, keys (prefixes — raw keys were never stored), webhook config
      // (URL only; the signing secret is regenerable, not exportable) and
      // usage counters.
      db.apiClient.findMany({
        where: { OR: [{ ownerId: userId }, { team: { some: { userId } } }] },
        include: {
          keys: true,
          team: { include: { user: { select: { handle: true } } } },
        },
      }),
      db.apiTeamMember.findMany({ where: { userId }, include: { client: true } }),
      db.apiUsageDay.findMany({ where: { client: { ownerId: userId } } }),
      // Stage 10 — Trust Network: membership, every attestation you were part
      // of (partner handles — your own data-subject record) and every shared
      // signal ever held about you (including retracted ones — full honesty).
      db.networkMembership.findUnique({ where: { userId } }),
      db.trustEdge.findMany({
        where: { OR: [{ aUserId: userId }, { bUserId: userId }] },
        orderBy: { requestedAt: "desc" },
      }),
      db.sharedSignal.findMany({
        where: { subjectUserId: userId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const networkPartnerIds = [
    ...new Set(
      networkEdges.map((e) => (e.aUserId === userId ? e.bUserId : e.aUserId))
    ),
  ];
  const networkPartners = networkPartnerIds.length
    ? await db.userAccount.findMany({
        where: { id: { in: networkPartnerIds } },
        select: { id: true, handle: true, displayName: true },
      })
    : [];
  // Flag counterparty handles (tolerant of dangling rows — see the flag
  // query note above).
  const flagPartyIds = [
    ...new Set(flags.flatMap((f) => [f.reporterId, f.subjectId])),
  ];
  const flagParties = flagPartyIds.length
    ? await db.userAccount.findMany({
        where: { id: { in: flagPartyIds } },
        select: { id: true, handle: true },
      })
    : [];
  const flagHandleOf = (id: string) =>
    flagParties.find((u) => u.id === id)?.handle ?? "deleted-member";

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
    reputation: {
      note: "Reporter identities are masked in the product UI to prevent retaliation; this export is your complete data-subject record (NDPA s.36) and includes them.",
      flags: flags.map((f) => ({
        id: f.id,
        role: f.reporterId === userId ? "reporter" : "subject",
        category: f.category,
        description: f.description,
        status: f.status,
        reporterHandle: flagHandleOf(f.reporterId),
        subjectHandle: flagHandleOf(f.subjectId),
        createdAt: f.createdAt,
        subjectRespondedAt: f.subjectRespondedAt,
        evidence: f.evidence.map((e) => ({
          id: e.id,
          role: e.role,
          kind: e.kind,
          content: e.content,
          submittedBy: e.submittedById === userId ? "you" : "counterparty",
          createdAt: e.createdAt,
        })),
        resolution: f.resolution
          ? {
              outcome: f.resolution.outcome,
              rationale: f.resolution.rationale,
              fraudSignal: f.resolution.fraudSignal,
              decidedAt: f.resolution.decidedAt,
            }
          : null,
        appeal: f.appeal
          ? {
              status: f.appeal.status,
              reason: f.appeal.reason,
              decisionNote: f.appeal.decisionNote,
              createdAt: f.appeal.createdAt,
              decidedAt: f.appeal.decidedAt,
            }
          : null,
      })),
    },
    // Stage 8 — Trust Engine: every score you were ever shown, which policy
    // version produced it, and its lifecycle state (frozen snapshots name the
    // pending appeal). Automated-significant-decisions status at export time.
    trustEngine: {
      note: "Each score you were shown names the versioned scoring policy that produced it. Policies change only through a new version covered by a completed DPIA — never silently.",
      automatedSignificantDecisions: await isAutomatedDecisionsEnabled(),
      snapshots: scoreSnapshots.map((s) => ({
        id: s.id,
        status: s.status,
        score: s.score,
        confidence: s.confidence,
        riskBand: s.riskBand,
        state: s.state,
        frozenReason: s.frozenReason,
        frozenAt: s.frozenAt,
        trigger: s.trigger,
        policyId: s.policyId,
        components: JSON.parse(s.components),
        explanation: JSON.parse(s.explanation),
        computedAt: s.computedAt,
        expiresAt: s.expiresAt,
      })),
    },
    // Stage 9 — B2B developer-portal footprint. Raw API keys were NEVER
    // stored (sha256 at rest) and the webhook signing secret is excluded —
    // it is regenerable from the portal, not exportable. Decisions made
    // ABOUT you via the Trust Decision API appear in trustReceipts above
    // (channel API_CHECK).
    apiPlatform: {
      note: "Your developer-portal footprint: API clients you own or sit on (team), key metadata (prefixes only — raw keys were never stored), webhook configuration and daily usage counters. Trust checks businesses ran on you are in trustReceipts (channel API_CHECK).",
      clients: apiClientsOwnedOrTeamed.map((c) => ({
        id: c.id,
        name: c.name,
        environment: c.environment,
        status: c.status,
        plan: c.plan,
        yourRole:
          myApiMemberships.find((m) => m.clientId === c.id)?.role ??
          (c.ownerId === userId ? "OWNER" : null),
        webhookUrl: c.webhookUrl,
        liveEnabledAt: c.liveEnabledAt,
        createdAt: c.createdAt,
        keys: c.keys.map((k) => ({
          name: k.name,
          keyPrefix: k.keyPrefix,
          status: k.status,
          scope: k.scope,
          totalRequests: k.totalRequests,
          lastUsedAt: k.lastUsedAt,
          createdAt: k.createdAt,
        })),
        team: c.team.map((m) => ({ handle: m.user.handle, role: m.role, createdAt: m.createdAt })),
      })),
      usage: myApiUsageDays.map((d) => ({ day: d.day, checks: d.checks, errors: d.errors })),
    },
    // Stage 10 — Trust Network record: membership state (and the consent
    // backing it — see consents above), every attestation lifecycle you were
    // part of with partner identities, and your full shared-signal history
    // (retracted rows included — your data-subject record is complete).
    trustNetwork: {
      note: "Your Trust Network record. Attestations are mutual and were accepted by both sides; revoked/declined rows are kept for your audit trail. Shared signals are k-anonymized counts in checks — here you see the complete rows, including retracted ones.",
      membership: networkMembership
        ? { status: networkMembership.status, joinedAt: networkMembership.joinedAt, consentId: networkMembership.consentId }
        : null,
      attestations: networkEdges.map((e) => {
        const partnerId = e.aUserId === userId ? e.bUserId : e.aUserId;
        const partner = networkPartners.find((p) => p.id === partnerId);
        return {
          id: e.id,
          yourRole: e.requestedById === userId ? "requester" : "invited",
          partnerHandle: partner?.handle ?? null,
          partnerName: partner?.displayName ?? null,
          status: e.status,
          requestedAt: e.requestedAt,
          respondedAt: e.respondedAt,
          activatedAt: e.activatedAt,
          revokedAt: e.revokedAt,
          revokedByYou: e.revokedById === userId,
          expiresAt: e.expiresAt,
        };
      }),
      sharedSignals: networkSignals.map((s) => ({
        id: s.id,
        kind: s.kind,
        platform: s.platform,
        platformMode: s.platformMode,
        severity: s.severity,
        note: s.note,
        sourceType: s.sourceType,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        retractedAt: s.retractedAt,
      })),
    },
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
