// PUT    /api/v1/engine/admin/providers/:key/credential — Stage 13 (ADMIN):
//        store a provider credential in the vault { keyId, secret, note? }.
//        The secret is encrypted (AES-256-GCM) at rest, NEVER returned by any
//        read (masked hint only), and saving rotates the previous credential
//        to RETIRED (single-active).
// DELETE — revoke the ACTIVE credential for this provider (immediate).

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { PROVIDER_KEYS, type ProviderKey } from "@/lib/providers/transport";
import { saveCredential, revokeCredential, listCredentials } from "@/lib/providers/credential-vault";
import { recordAudit } from "@/lib/services/audit-service";

const PutSchema = z
  .object({
    keyId: z.string().trim().min(3).max(64),
    secret: z.string().min(12).max(256),
    note: z.string().trim().max(200).optional(),
  })
  .strict();

function parseKey(key: string): ProviderKey | null {
  return PROVIDER_KEYS.includes(key as ProviderKey) ? (key as ProviderKey) : null;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const requestId = newRequestId();
  const { key } = await params;
  const provider = parseKey(key);

  const user = await getSessionUser(req);
  if (!user) return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  if (user.role !== "ADMIN") {
    return jsonError(403, "FORBIDDEN", "Provider administration is restricted to platform admins.", requestId);
  }
  if (!provider) {
    return jsonError(404, "UNKNOWN_PROVIDER", `Unknown provider key: ${key}.`, requestId);
  }
  const rl = rateLimit(`vault-save:${user.id}`, 6, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many credential operations. Wait a minute.", requestId);
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }
  const parsed = PutSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(
      422,
      "VALIDATION_ERROR",
      first?.message ?? "keyId (3-64 chars) and secret (12-256 chars) are required.",
      requestId
    );
  }

  const entry = await saveCredential({
    provider,
    keyId: parsed.data.keyId,
    secret: parsed.data.secret,
    note: parsed.data.note,
    createdBy: user.handle,
  });
  await recordAudit({
    actorType: "USER",
    actorId: user.id,
    action: "PROVIDER_CREDENTIAL_SAVED",
    subjectType: "ProviderCredential",
    subjectId: entry.id,
    requestId,
    metadata: { provider, keyId: entry.keyId, hint: entry.hint }, // hint only — never the secret
  });

  return jsonOk({
    credential: entry,
    vault: await listCredentials(),
    note: `Credential stored for ${provider} (encrypted AES-256-GCM; previous credential retired). The secret is never returned again — reads surface the masked hint only.`,
    requestId,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const requestId = newRequestId();
  const { key } = await params;
  const provider = parseKey(key);

  const user = await getSessionUser(req);
  if (!user) return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  if (user.role !== "ADMIN") {
    return jsonError(403, "FORBIDDEN", "Provider administration is restricted to platform admins.", requestId);
  }
  if (!provider) {
    return jsonError(404, "UNKNOWN_PROVIDER", `Unknown provider key: ${key}.`, requestId);
  }

  const revoked = await revokeCredential(provider);
  if (!revoked) {
    return jsonError(409, "NO_ACTIVE_CREDENTIAL", `No ACTIVE credential stored for ${provider}.`, requestId);
  }
  await recordAudit({
    actorType: "USER",
    actorId: user.id,
    action: "PROVIDER_CREDENTIAL_REVOKED",
    subjectType: "ProviderCredential",
    subjectId: `${provider}:active`,
    requestId,
    metadata: { provider },
  });

  return jsonOk({
    provider,
    vault: await listCredentials(),
    note: `ACTIVE credential for ${provider} revoked — LIVE posture will refuse to activate until a new one is stored.`,
    requestId,
  });
}
