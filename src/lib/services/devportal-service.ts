// TrustScore Stage 9 — DeveloperPortalService (B2B portal core).
//
// ApiClient lifecycle: create (SANDBOX default), LIVE upgrade (typed
// confirmation — honesty label, providers stay MOCK), mock-billing plans
// with REAL daily quotas. ApiKeys: mint (raw shown ONCE, sha256 at rest),
// revoke, per-key counters. Team RBAC: OWNER / DEVELOPER / VIEWER enforced
// server-side via requireMembership — membership IS visibility.
//
// Honest billing: FREE (40 checks/day, 2 keys) and STARTER (500 checks/day,
// 5 keys) — quotas are enforced for real; the PLAN CARD states plainly that
// no payment processor is connected (mock billing). LIVE likewise states
// that identity providers remain contract-first MOCK.
//
// Usage: per-key daily rollups (ApiUsageDay, 90-day retention) + bounded
// per-request events (last 100 per key). Nothing in here carries PII.

import { db } from "@/lib/db";
import { randomBytes } from "crypto";
import { sha256Hex } from "@/lib/platform/crypto";
import { recordAudit } from "@/lib/services/audit-service";
import { generateWebhookSecret, getRecentDeliveries, processDueDeliveries, ShapedDelivery } from "@/lib/services/webhook-service";

export const MAX_CLIENTS_PER_USER = 3;
export const MAX_KEYS_PER_CLIENT: Record<string, number> = { FREE: 2, STARTER: 5 };
export const DAILY_QUOTA: Record<string, number> = { FREE: 40, STARTER: 500 };
export const KEY_TTL_DAYS = 365;

export type TeamRole = "OWNER" | "DEVELOPER" | "VIEWER";

const USAGE_DAYS_RETAINED = 90;
const USAGE_EVENTS_RETAINED = 100;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// RBAC — membership is the visibility grant
// ---------------------------------------------------------------------------

export interface Membership {
  clientId: string;
  userId: string;
  role: TeamRole;
}

export async function getMembership(
  userId: string,
  clientId: string
): Promise<Membership | null> {
  const row = await db.apiTeamMember.findUnique({
    where: { clientId_userId: { clientId, userId } },
  });
  return row ? { clientId: row.clientId, userId: row.userId, role: row.role as TeamRole } : null;
}

// requireRole — throws typed errors the routes translate to HTTP codes.
export class PortalError extends Error {
  code: "NOT_FOUND" | "FORBIDDEN";
  constructor(code: "NOT_FOUND" | "FORBIDDEN", message: string) {
    super(message);
    this.code = code;
  }
}

export async function requireRole(
  userId: string,
  clientId: string,
  min: TeamRole
): Promise<Membership> {
  const membership = await getMembership(userId, clientId);
  if (!membership) throw new PortalError("NOT_FOUND", "No such API client.");
  const rank: Record<TeamRole, number> = { VIEWER: 0, DEVELOPER: 1, OWNER: 2 };
  if (rank[membership.role] < rank[min]) {
    throw new PortalError("FORBIDDEN", "Your team role does not allow this action.");
  }
  return membership;
}

// ---------------------------------------------------------------------------
// Client lifecycle
// ---------------------------------------------------------------------------

export type CreateClientResult =
  | { ok: true; client: PortalClient }
  | { ok: false; code: "VALIDATION" | "LIMIT" };

export async function createClient(
  userId: string,
  input: { name: string; environment?: string }
): Promise<CreateClientResult> {
  const name = input.name.trim();
  if (name.length < 3 || name.length > 60) return { ok: false, code: "VALIDATION" };
  if (input.environment && !["SANDBOX", "LIVE"].includes(input.environment)) {
    return { ok: false, code: "VALIDATION" };
  }
  const owned = await db.apiClient.count({ where: { ownerId: userId } });
  // Team memberships of OTHER people's clients do not count against you;
  // a member can OWN at most 3 clients (sandbox scale, honest quota).
  if (owned >= MAX_CLIENTS_PER_USER) return { ok: false, code: "LIMIT" };
  const row = await db.apiClient.create({
    data: { ownerId: userId, name, environment: input.environment ?? "SANDBOX" },
  });
  await db.apiTeamMember.create({
    data: { clientId: row.id, userId, role: "OWNER", addedById: userId },
  });
  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "DEV_CLIENT_CREATED",
    subjectType: "ApiClient",
    subjectId: row.id,
    metadata: { environment: row.environment },
  });
  const client = await getPortalClient(row.id, userId);
  return { ok: true, client: client! };
}

export type LiveUpgradeResult =
  | { ok: true; client: PortalClient }
  | { ok: false; code: "NOT_FOUND" | "FORBIDDEN" | "CONFIRM_REQUIRED" | "ALREADY_LIVE" };

export async function enableLive(
  userId: string,
  clientId: string,
  confirm: string
): Promise<LiveUpgradeResult> {
  try {
    await requireRole(userId, clientId, "OWNER");
  } catch (e) {
    return { ok: false, code: (e as PortalError).code };
  }
  const row = await db.apiClient.findUnique({ where: { id: clientId } });
  if (!row) return { ok: false, code: "NOT_FOUND" };
  if (row.environment === "LIVE") return { ok: false, code: "ALREADY_LIVE" };
  if (confirm !== "I UNDERSTAND") return { ok: false, code: "CONFIRM_REQUIRED" };
  await db.apiClient.update({
    where: { id: clientId },
    data: { environment: "LIVE", liveEnabledAt: new Date() },
  });
  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "DEV_CLIENT_LIVE_ENABLED",
    subjectType: "ApiClient",
    subjectId: clientId,
    metadata: { environment: "LIVE" },
  });
  const client = await getPortalClient(clientId, userId);
  return { ok: true, client: client! };
}

export type PlanResult =
  | { ok: true; client: PortalClient }
  | { ok: false; code: "NOT_FOUND" | "FORBIDDEN" | "VALIDATION" };

export async function setPlan(
  userId: string,
  clientId: string,
  plan: string
): Promise<PlanResult> {
  try {
    await requireRole(userId, clientId, "OWNER");
  } catch (e) {
    return { ok: false, code: (e as PortalError).code };
  }
  if (!["FREE", "STARTER"].includes(plan)) return { ok: false, code: "VALIDATION" };
  await db.apiClient.update({ where: { id: clientId }, data: { plan } });
  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "DEV_PLAN_CHANGED",
    subjectType: "ApiClient",
    subjectId: clientId,
    metadata: { plan },
  });
  const client = await getPortalClient(clientId, userId);
  return { ok: true, client: client! };
}

// ---------------------------------------------------------------------------
// API keys — raw key exists ONLY in the mint response
// ---------------------------------------------------------------------------

export interface MintedKey {
  id: string;
  name: string;
  keyPrefix: string;
  scope: string;
  expiresAt: string;
  createdAt: string;
  rawKey: string; // shown exactly once — never persisted, never logged
}

export type MintResult =
  | { ok: true; key: MintedKey }
  | { ok: false; code: "NOT_FOUND" | "FORBIDDEN" | "LIMIT" | "VALIDATION" };

export async function mintApiKey(
  userId: string,
  clientId: string,
  name: string
): Promise<MintResult> {
  try {
    await requireRole(userId, clientId, "DEVELOPER");
  } catch (e) {
    return { ok: false, code: (e as PortalError).code };
  }
  const label = name.trim();
  if (label.length < 3 || label.length > 40) return { ok: false, code: "VALIDATION" };
  const client = await db.apiClient.findUnique({ where: { id: clientId } });
  if (!client) return { ok: false, code: "NOT_FOUND" };
  const keyCap = MAX_KEYS_PER_CLIENT[client.plan] ?? 2;
  const active = await db.apiKey.count({ where: { clientId, status: "ACTIVE" } });
  if (active >= keyCap) return { ok: false, code: "LIMIT" };
  const envTag = client.environment === "LIVE" ? "live" : "sandbox";
  const secret = randomBytes(24).toString("hex"); // 192-bit
  const rawKey = `tsk_${envTag}_${secret}`;
  const row = await db.apiKey.create({
    data: {
      clientId,
      name: label,
      keyPrefix: rawKey.slice(0, 14),
      keyHash: sha256Hex(rawKey),
      expiresAt: new Date(Date.now() + KEY_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "API_KEY_MINTED",
    subjectType: "ApiKey",
    subjectId: row.id,
    metadata: { keyPrefix: row.keyPrefix, environment: client.environment },
  });
  return {
    ok: true,
    key: {
      id: row.id,
      name: row.name,
      keyPrefix: row.keyPrefix,
      scope: row.scope,
      expiresAt: row.expiresAt!.toISOString(),
      createdAt: row.createdAt.toISOString(),
      rawKey,
    },
  };
}

export type RevokeResult =
  | { ok: true }
  | { ok: false; code: "NOT_FOUND" | "FORBIDDEN" | "ALREADY_REVOKED" };

export async function revokeApiKey(userId: string, keyId: string): Promise<RevokeResult> {
  const key = await db.apiKey.findUnique({ where: { id: keyId }, include: { client: true } });
  if (!key) return { ok: false, code: "NOT_FOUND" };
  try {
    await requireRole(userId, key.clientId, "DEVELOPER");
  } catch (e) {
    // A member without visibility gets NOT_FOUND (no existence leak).
    return { ok: false, code: (e as PortalError).code };
  }
  if (key.status !== "ACTIVE") return { ok: false, code: "ALREADY_REVOKED" };
  await db.apiKey.update({ where: { id: keyId }, data: { status: "REVOKED", revokedAt: new Date() } });
  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "API_KEY_REVOKED",
    subjectType: "ApiKey",
    subjectId: keyId,
    metadata: { keyPrefix: key.keyPrefix },
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Webhook configuration
// ---------------------------------------------------------------------------

function validWebhookUrl(url: string, environment: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
  if (environment === "LIVE") {
    // LIVE posture: https only, no localhost/private hosts. (Sandbox-honest —
    // underlying providers remain MOCK either way.)
    if (parsed.protocol !== "https:") return false;
    const h = parsed.hostname;
    if (h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0" || h.endsWith(".local")) {
      return false;
    }
  }
  return true;
}

export type WebhookConfigResult =
  | {
      ok: true;
      client: PortalClient;
      secret?: string; // present ONLY when (re)generated — shown once
    }
  | { ok: false; code: "NOT_FOUND" | "FORBIDDEN" | "VALIDATION" };

export async function configureWebhook(
  userId: string,
  clientId: string,
  input: { url: string; rotateSecret: boolean }
): Promise<WebhookConfigResult> {
  try {
    await requireRole(userId, clientId, "DEVELOPER");
  } catch (e) {
    return { ok: false, code: (e as PortalError).code };
  }
  const client = await db.apiClient.findUnique({ where: { id: clientId } });
  if (!client) return { ok: false, code: "NOT_FOUND" };
  const url = input.url.trim();
  if (url === "") {
    await db.apiClient.update({ where: { id: clientId }, data: { webhookUrl: null } });
    await recordAudit({
      actorType: "USER",
      actorId: userId,
      action: "WEBHOOK_CONFIGURED",
      subjectType: "ApiClient",
      subjectId: clientId,
      metadata: { enabled: false },
    });
    return { ok: true, client: (await getPortalClient(clientId, userId))! };
  }
  if (!validWebhookUrl(url, client.environment)) {
    return { ok: false, code: "VALIDATION" };
  }
  const newSecret = input.rotateSecret || !client.webhookSecret ? generateWebhookSecret() : null;
  await db.apiClient.update({
    where: { id: clientId },
    data: { webhookUrl: url, ...(newSecret ? { webhookSecret: newSecret } : {}) },
  });
  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "WEBHOOK_CONFIGURED",
    subjectType: "ApiClient",
    subjectId: clientId,
    metadata: { enabled: true, rotateSecret: Boolean(newSecret) },
  });
  return {
    ok: true,
    client: (await getPortalClient(clientId, userId))!,
    ...(newSecret ? { secret: newSecret } : {}),
  };
}

// ---------------------------------------------------------------------------
// Team management (OWNER only)
// ---------------------------------------------------------------------------

export type AddMemberResult =
  | { ok: true; client: PortalClient }
  | { ok: false; code: "NOT_FOUND" | "FORBIDDEN" | "VALIDATION" | "DUPLICATE" | "SELF_OWNER" };

export async function addTeamMember(
  userId: string,
  clientId: string,
  input: { identifier: string; role: string }
): Promise<AddMemberResult> {
  try {
    await requireRole(userId, clientId, "OWNER");
  } catch (e) {
    return { ok: false, code: (e as PortalError).code };
  }
  if (!["DEVELOPER", "VIEWER"].includes(input.role)) return { ok: false, code: "VALIDATION" };
  const ident = input.identifier.trim().replace(/^@/, "").toLowerCase();
  if (!ident) return { ok: false, code: "VALIDATION" };
  const target = await db.userAccount.findFirst({
    where: { OR: [{ handle: ident }, { email: input.identifier.trim() }] },
  });
  if (!target) return { ok: false, code: "VALIDATION" };
  if (target.id === userId) return { ok: false, code: "SELF_OWNER" };
  const existing = await db.apiTeamMember.findUnique({
    where: { clientId_userId: { clientId, userId: target.id } },
  });
  if (existing) return { ok: false, code: "DUPLICATE" };
  await db.apiTeamMember.create({
    data: { clientId, userId: target.id, role: input.role, addedById: userId },
  });
  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "DEV_TEAM_MEMBER_ADDED",
    subjectType: "ApiTeamMember",
    subjectId: `${clientId}:${target.id}`,
    metadata: { role: input.role },
  });
  const client = await getPortalClient(clientId, userId);
  return { ok: true, client: client! };
}

export type RemoveMemberResult =
  | { ok: true; client: PortalClient }
  | { ok: false; code: "NOT_FOUND" | "FORBIDDEN" | "OWNER_IMMUTABLE" };

export async function removeTeamMember(
  userId: string,
  clientId: string,
  memberId: string
): Promise<RemoveMemberResult> {
  try {
    await requireRole(userId, clientId, "OWNER");
  } catch (e) {
    return { ok: false, code: (e as PortalError).code };
  }
  const member = await db.apiTeamMember.findUnique({ where: { id: memberId } });
  if (!member || member.clientId !== clientId) return { ok: false, code: "NOT_FOUND" };
  if (member.role === "OWNER") return { ok: false, code: "OWNER_IMMUTABLE" };
  await db.apiTeamMember.delete({ where: { id: memberId } });
  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "DEV_TEAM_MEMBER_REMOVED",
    subjectType: "ApiTeamMember",
    subjectId: memberId,
    metadata: { role: member.role },
  });
  const client = await getPortalClient(clientId, userId);
  return { ok: true, client: client! };
}

// ---------------------------------------------------------------------------
// Usage accounting
// ---------------------------------------------------------------------------

export async function recordUsage(
  keyId: string,
  clientId: string,
  route: string,
  statusCode: number,
  outcome: string,
  latencyMs: number
): Promise<void> {
  await db.apiKey.update({
    where: { id: keyId },
    data: { totalRequests: { increment: 1 }, lastUsedAt: new Date() },
  });
  await db.apiUsageDay.upsert({
    where: { keyId_day: { keyId, day: todayKey() } },
    create: { keyId, clientId, day: todayKey(), checks: 1, errors: statusCode >= 400 ? 1 : 0 },
    update: {
      checks: { increment: 1 },
      errors: { increment: statusCode >= 400 ? 1 : 0 },
    },
  });
  await db.apiUsageEvent.create({
    data: { keyId, route, statusCode, outcome, latencyMs },
  });
  // Bounded retention (fire-and-forget discipline, awaited to keep tests deterministic)
  const events = await db.apiUsageEvent.findMany({
    where: { keyId },
    orderBy: { createdAt: "desc" },
    skip: USAGE_EVENTS_RETAINED,
    select: { id: true },
  });
  if (events.length > 0) {
    await db.apiUsageEvent.deleteMany({ where: { id: { in: events.map((e) => e.id) } } });
  }
}

export async function getDailyQuotaState(clientId: string, plan: string): Promise<number> {
  const since = todayKey();
  const rows = await db.apiUsageDay.aggregate({
    where: { clientId, day: since },
    _sum: { checks: true },
  });
  return DAILY_QUOTA[plan] - (rows._sum.checks ?? 0);
}

async function pruneUsageDays(clientId: string): Promise<void> {
  const cutoff = new Date(Date.now() - USAGE_DAYS_RETAINED * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  await db.apiUsageDay.deleteMany({ where: { clientId, day: { lt: cutoff } } });
}

// ---------------------------------------------------------------------------
// Read models
// ---------------------------------------------------------------------------

export interface PortalKey {
  id: string;
  name: string;
  keyPrefix: string;
  scope: string;
  status: string;
  totalRequests: number;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface PortalTeamMember {
  id: string;
  userId: string;
  handle: string;
  displayName: string;
  role: TeamRole;
  isYou: boolean;
  createdAt: string;
}

export interface PortalClient {
  id: string;
  name: string;
  environment: string;
  status: string;
  plan: string;
  role: TeamRole; // YOUR role on this client
  quota: { plan: number; usedToday: number; remaining: number };
  usage: { day: string; checks: number; errors: number }[]; // last 14 days
  webhook: {
    url: string | null;
    hasSecret: boolean;
    secretCreatedAt: string | null;
    recentDeliveries: ShapedDelivery[];
  };
  keys: PortalKey[];
  team: PortalTeamMember[];
  decisionsCount: number;
  createdAt: string;
}

export async function getPortalClient(
  clientId: string,
  viewerId: string
): Promise<PortalClient | null> {
  const row = await db.apiClient.findUnique({
    where: { id: clientId },
    include: {
      keys: { orderBy: { createdAt: "desc" } },
      team: { include: { user: true }, orderBy: { createdAt: "asc" } },
      usageDays: { orderBy: { day: "desc" }, take: 14 },
    },
  });
  const membership = row ? await getMembership(viewerId, clientId) : null;
  if (!row || !membership) return null;

  const usedToday = row.usageDays
    .filter((d) => d.day === todayKey())
    .reduce((sum, d) => sum + d.checks, 0);
  const decisionsCount = await db.trustDecision.count({ where: { clientId: row.id } });

  // 14-day window, oldest → newest, zero-filled for chart continuity.
  const byDay = new Map(row.usageDays.map((d) => [d.day, d]));
  const usage: PortalClient["usage"] = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const d = byDay.get(day);
    usage.push({ day, checks: d?.checks ?? 0, errors: d?.errors ?? 0 });
  }

  return {
    id: row.id,
    name: row.name,
    environment: row.environment,
    status: row.status,
    plan: row.plan,
    role: membership.role,
    quota: {
      plan: DAILY_QUOTA[row.plan] ?? DAILY_QUOTA.FREE,
      usedToday,
      remaining: Math.max(0, (DAILY_QUOTA[row.plan] ?? DAILY_QUOTA.FREE) - usedToday),
    },
    usage,
    webhook: {
      url: row.webhookUrl,
      hasSecret: Boolean(row.webhookSecret),
      secretCreatedAt: null,
      recentDeliveries: await getRecentDeliveries(row.id, 5),
    },
    keys: row.keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      scope: k.scope,
      status: k.status,
      totalRequests: k.totalRequests,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      expiresAt: k.expiresAt?.toISOString() ?? null,
      revokedAt: k.revokedAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
    })),
    team: row.team.map((m) => ({
      id: m.id,
      userId: m.userId,
      handle: m.user.handle,
      displayName: m.user.displayName,
      role: m.role as TeamRole,
      isYou: m.userId === viewerId,
      createdAt: m.createdAt.toISOString(),
    })),
    decisionsCount,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getPortalForUser(userId: string): Promise<{
  clients: PortalClient[];
  limits: { maxClients: number; plans: Record<string, { quota: number; keys: number }> };
}> {
  await processDueDeliveries();
  const memberships = await db.apiTeamMember.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  const clients: PortalClient[] = [];
  for (const m of memberships) {
    const c = await getPortalClient(m.clientId, userId);
    if (c) {
      clients.push(c);
      await pruneUsageDays(m.clientId);
    }
  }
  return {
    clients,
    limits: {
      maxClients: MAX_CLIENTS_PER_USER,
      plans: {
        FREE: { quota: DAILY_QUOTA.FREE, keys: MAX_KEYS_PER_CLIENT.FREE },
        STARTER: { quota: DAILY_QUOTA.STARTER, keys: MAX_KEYS_PER_CLIENT.STARTER },
      },
    },
  };
}

// Decision history (business's own audit trail — masked inputs).
export async function getDecisions(
  userId: string,
  clientId: string,
  take = 50
): Promise<
  | {
      ok: true;
      decisions: {
        id: string;
        method: string;
        inputHint: string;
        outcome: string;
        requestId: string;
        createdAt: string;
        assessment: Record<string, unknown> | null;
      }[];
    }
  | { ok: false; code: "NOT_FOUND" | "FORBIDDEN" }
> {
  try {
    await requireRole(userId, clientId, "VIEWER");
  } catch (e) {
    return { ok: false, code: (e as PortalError).code };
  }
  await processDueDeliveries(clientId);
  const rows = await db.trustDecision.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    take,
  });
  return {
    ok: true,
    decisions: rows.map((r) => ({
      id: r.id,
      method: r.method,
      inputHint: r.inputHint,
      outcome: r.outcome,
      requestId: r.requestId,
      createdAt: r.createdAt.toISOString(),
      assessment: r.assessment ? (JSON.parse(r.assessment) as Record<string, unknown>) : null,
    })),
  };
}

// Webhook URL validation shared with the route layer.
export function isValidWebhookUrlForTest(url: string, environment: string): boolean {
  return validWebhookUrl(url, environment);
}
