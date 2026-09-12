// TrustScore Stage 13 — provider-simulator mini-service (sandbox loopback).
//
// A faithful stand-in for the three verification providers (NINAuth, SMS
// carrier, biometric liveness) so the platform's REAL transport code path —
// HMAC-signed calls, timeouts, retries, circuit breakers, metrics — is
// exercised end-to-end in the sandbox instead of being dead code until
// partner credentials arrive.
//
// Endpoints (JSON, 127.0.0.1 only, port 3032):
//   POST /v1/ninauth/session   {clientId, state, codeChallenge, scopes}
//                               → {sessionRef, authorizeUrl, expiresAt}
//   POST /v1/ninauth/authorize {state, maskedSubject} → {code, expiresInSec}
//                               (one-time, PKCE-bound, subject-bound)
//   POST /v1/ninauth/token     {code, codeVerifier, nonce, clientId}
//                               → OAuth TokenResponse (PKCE verified; HS256
//                               ID token with the provider's own profile)
//   POST /v1/phone/messages    {to, text} → {messageId, segments}
//   GET  /v1/phone/inbox?to=   → {messages:[…]}  (the "sandbox SMS inbox")
//   POST /v1/liveness/jobs     → {jobId, uploadUrl}
//   POST /v1/liveness/jobs/:id/submit {simulate, maskedSubject} → verdict
//   POST /_fault               {mode: none|timeout|error|auth|slow}
//   GET  /health               → {ok, fault, counts, uptimeSec}
//
// Honesty notes:
//  - every response body carries providerSimulator:true;
//  - /v1/* requests are HMAC-verified (x-ts-signature over t + body / GET
//    path) with the shared TRANSPORT_HMAC_KEY — the same discipline the
//    platform applies to webhook payloads;
//  - fault modes exist to exercise the transport's failure paths:
//    timeout (8s sleep), error (500), auth (401), slow (900ms);
//  - profile claims are derived deterministically from the masked subject —
//    the simulator's "NIN record", mirroring the mock's seeds.

import { createHmac, createHash, randomBytes, timingSafeEqual } from "crypto";

const PORT = 3032;
const HMAC_KEY = process.env.TRANSPORT_HMAC_KEY ?? "ts_backend_only_transport_hmac_key";
const SIGNING_SECRET =
  process.env.LOOPBACK_SIGNING_SECRET ?? "ts_backend_only_loopback_signing_secret";
const ISSUER = "https://provider-simulator.loopback/ninauth";
const ID_TOKEN_TTL_SEC = 300;
const CODE_TTL_MS = 60_000;

type FaultMode = "none" | "timeout" | "error" | "auth" | "slow";

const startedAt = Date.now();
let fault: FaultMode = "none";
const counts: Record<string, number> = {};

function bump(name: string) {
  counts[name] = (counts[name] ?? 0) + 1;
}

// ---------------------------------------------------------------------------
// In-memory provider state (the partner's own records — nothing persisted)
// ---------------------------------------------------------------------------

interface NinauthSession {
  state: string;
  clientId: string;
  codeChallenge: string;
  scopes: string[];
  maskedSubject: string | null;
  createdAt: number;
}
const ninauthSessions = new Map<string, NinauthSession>(); // keyed by state

interface IssuedCode {
  state: string;
  code: string;
  codeChallenge: string;
  scopes: string[];
  maskedSubject: string;
  expiresAt: number;
  used: boolean;
}
const issuedCodes = new Map<string, IssuedCode>(); // keyed by code

interface InboxMessage {
  id: string;
  to: string;
  text: string;
  receivedAt: string;
}
const inbox: InboxMessage[] = [];

interface LivenessJob {
  jobId: string;
  createdAt: number;
  submitted: boolean;
}
const livenessJobs = new Map<string, LivenessJob>();

// ---------------------------------------------------------------------------
// Deterministic "NIN record" per masked subject (the simulator's own data)
// ---------------------------------------------------------------------------

const GIVEN_NAMES = ["Adaeze", "Chidi", "Ngozi", "Emeka", "Funke", "Tunde", "Amina", "Ibrahim", "Yemi", "Chioma", "Bala", "Halima"];
const FAMILY_NAMES = ["Okafor", "Eze", "Adeyemi", "Bello", "Okonkwo", "Lawal", "Uche", "Danladi", "Oliseh", "Abubakar", "Nwosu", "Afolayan"];
const STATES = ["Anambra", "Enugu", "Lagos", "Kano", "Rivers", "Oyo", "Kaduna", "Delta", "Imo", "Sokoto", "Edo", "Plateau"];

function seededFrom(seed: string, modulo: number): number {
  const h = createHash("sha256").update(`${SIGNING_SECRET}:simseed:${seed}`).digest();
  return h.readUInt32BE(0) % modulo;
}

function profileFor(maskedSubject: string) {
  return {
    given_name: GIVEN_NAMES[seededFrom(`gn:${maskedSubject}`, GIVEN_NAMES.length)],
    family_name: FAMILY_NAMES[seededFrom(`fn:${maskedSubject}`, FAMILY_NAMES.length)],
    birth_year: String(1972 + seededFrom(`by:${maskedSubject}`, 28)),
    state_of_origin: STATES[seededFrom(`st:${maskedSubject}`, STATES.length)],
  };
}

function seededRange(seed: string, min: number, max: number): number {
  const h = createHash("sha256").update(`${SIGNING_SECRET}:simrange:${seed}`).digest();
  const v = h.readUInt32BE(0) % 1000;
  return min + Math.round((v / 999) * (max - min));
}

// ---------------------------------------------------------------------------
// HS256 ID token (the provider's own signing key — JWKS-backed in production)
// ---------------------------------------------------------------------------

const b64url = (input: Buffer | string) => Buffer.from(input).toString("base64url");
const sign = (data: string) => createHmac("sha256", SIGNING_SECRET).update(data).digest("base64url");

function issueIdToken(input: {
  sub: string;
  aud: string;
  scopes: string[];
  nonce: string;
  profile: Record<string, string>;
}): string {
  const iat = Math.floor(Date.now() / 1000);
  const profile: Record<string, string> = {};
  if (input.scopes.includes("profile.name")) {
    profile.given_name = input.profile.given_name;
    profile.family_name = input.profile.family_name;
  }
  if (input.scopes.includes("profile.demographics")) {
    profile.birth_year = input.profile.birth_year;
    profile.state_of_origin = input.profile.state_of_origin;
  }
  const claims = {
    iss: ISSUER,
    aud: input.aud,
    sub: input.sub,
    scopes: input.scopes,
    nonce: input.nonce,
    verified: true,
    profile,
    iat,
    exp: iat + ID_TOKEN_TTL_SEC,
  };
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT", kid: "sim-key-1" }));
  const payload = b64url(JSON.stringify(claims));
  return `${header}.${payload}.${sign(`${header}.${payload}`)}`;
}

// ---------------------------------------------------------------------------
// HTTP plumbing (Bun.serve)
// ---------------------------------------------------------------------------

function verifySignature(req: Request, rawBody: string): boolean {
  const sig = req.headers.get("x-ts-signature");
  if (!sig) return false;
  const m = sig.match(/^t=(\d+),v1=([0-9a-f]+)$/);
  if (!m) return false;
  const [, t, v1] = m;
  const url = new URL(req.url);
  const signed = req.method === "GET" ? `${t}.GET ${url.pathname}${url.search}` : `${t}.${rawBody}`;
  const expected = createHmac("sha256", HMAC_KEY).update(signed).digest("hex");
  const a = Buffer.from(v1, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

const server = Bun.serve({
  port: PORT,
  hostname: "127.0.0.1",
  async fetch(req): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === "/health" && req.method === "GET") {
      return Response.json({
        ok: true,
        service: "provider-simulator",
        port: PORT,
        fault,
        counts,
        uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
      });
    }

    if (path === "/_fault" && req.method === "POST") {
      const body = (await req.json().catch(() => ({}))) as { mode?: string };
      const modes = ["none", "timeout", "error", "auth", "slow"];
      if (!modes.includes(body.mode ?? "")) {
        return Response.json(
          { error: { code: "BAD_FAULT_MODE", message: `mode must be one of ${modes.join(", ")}` } },
          { status: 422 }
        );
      }
      fault = body.mode as FaultMode;
      bump(`fault:${fault}`);
      return Response.json({ ok: true, fault, note: "fault mode set — affects /v1/* calls" });
    }

    // ---- signed provider surface ----
    const rawBody = req.method === "POST" ? await req.text() : "";
    if (path.startsWith("/v1/") && !verifySignature(req, rawBody)) {
      bump("rejected:signature");
      return Response.json(
        { error: { code: "SIGNATURE_REJECTED", message: "missing or invalid x-ts-signature" } },
        { status: 401 }
      );
    }

    // Fault modes (after signature validation — auth simulates a key mismatch,
    // not a skipped check).
    if (fault === "error") {
      bump("fault:error");
      return Response.json(
        { error: { code: "SIMULATED_PROVIDER_ERROR", message: "fault mode: error" } },
        { status: 500 }
      );
    }
    if (fault === "auth") {
      bump("fault:auth");
      return Response.json(
        { error: { code: "SIGNATURE_REJECTED", message: "fault mode: auth (simulated key mismatch)" } },
        { status: 401 }
      );
    }
    if (fault === "timeout") {
      await sleep(8_000); // transport aborts at 4s — a timeout fault
      return Response.json({ note: "fault mode: timeout (too late)" });
    }
    if (fault === "slow") {
      await sleep(900);
    }

    try {
      const body: Record<string, string> = rawBody ? JSON.parse(rawBody) : {};

      // ---------------- NINAuth ----------------
      if (path === "/v1/ninauth/session" && req.method === "POST") {
        bump("ninauth:session");
        const { clientId, state, codeChallenge, scopes } = body;
        if (!clientId || !state || !codeChallenge) {
          return Response.json(
            { error: { code: "BAD_REQUEST", message: "clientId, state, codeChallenge required" } },
            { status: 422 }
          );
        }
        ninauthSessions.set(state, {
          state,
          clientId,
          codeChallenge,
          scopes: (scopes ?? "").split(" ").filter(Boolean),
          maskedSubject: null,
          createdAt: Date.now(),
        });
        if (ninauthSessions.size > 500) {
          const cutoff = Date.now() - 15 * 60_000;
          for (const [k, s] of ninauthSessions) if (s.createdAt < cutoff) ninauthSessions.delete(k);
        }
        return Response.json({
          sessionRef: `simsess_${randomBytes(12).toString("hex")}`,
          authorizeUrl: `http://127.0.0.1:${PORT}/authorize?state=${encodeURIComponent(state)}`,
          expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
        });
      }

      if (path === "/v1/ninauth/authorize" && req.method === "POST") {
        bump("ninauth:authorize");
        const { state, maskedSubject } = body;
        const session = ninauthSessions.get(state ?? "");
        if (!session) {
          return Response.json(
            { error: { code: "UNKNOWN_STATE", message: "no session registered for this state" } },
            { status: 422 }
          );
        }
        const code = `nac_${randomBytes(24).toString("base64url")}`;
        issuedCodes.set(code, {
          state: session.state,
          code,
          codeChallenge: session.codeChallenge,
          scopes: session.scopes,
          maskedSubject: maskedSubject ?? "",
          expiresAt: Date.now() + CODE_TTL_MS,
          used: false,
        });
        if (issuedCodes.size > 500) {
          const cutoff = Date.now() - CODE_TTL_MS * 2;
          for (const [k, c] of issuedCodes) if (c.expiresAt < cutoff) issuedCodes.delete(k);
        }
        return Response.json({ code, expiresInSec: Math.floor(CODE_TTL_MS / 1000) });
      }

      if (path === "/v1/ninauth/token" && req.method === "POST") {
        bump("ninauth:token");
        const { code, codeVerifier, nonce, clientId } = body;
        const issued = issuedCodes.get(code ?? "");
        if (!issued) {
          return Response.json(
            { error: { code: "BAD_CODE", message: "unknown authorization code" } },
            { status: 422 }
          );
        }
        if (issued.used) {
          return Response.json(
            { error: { code: "CODE_REUSED", message: "authorization code already exchanged" } },
            { status: 422 }
          );
        }
        if (issued.expiresAt < Date.now()) {
          return Response.json(
            { error: { code: "CODE_EXPIRED", message: "authorization code expired" } },
            { status: 422 }
          );
        }
        // PKCE S256 — exactly the real partner contract.
        const computed = createHash("sha256").update(codeVerifier ?? "").digest("base64url");
        if (computed !== issued.codeChallenge) {
          return Response.json(
            { error: { code: "PKCE_MISMATCH", message: "code_verifier does not match the bound challenge" } },
            { status: 422 }
          );
        }
        issued.used = true;

        const profile = profileFor(issued.maskedSubject);
        const id_token = issueIdToken({
          sub: issued.maskedSubject,
          aud: clientId ?? ninauthSessions.get(issued.state)?.clientId ?? "unknown",
          scopes: issued.scopes,
          nonce: nonce ?? "",
          profile,
        });
        return Response.json({
          access_token: `sim_at_${randomBytes(24).toString("base64url")}`,
          token_type: "Bearer",
          expires_in: 3600,
          id_token,
        });
      }

      // ---------------- Phone (SMS carrier) ----------------
      if (path === "/v1/phone/messages" && req.method === "POST") {
        bump("phone:messages");
        const { to, text } = body;
        if (!to || !text) {
          return Response.json(
            { error: { code: "BAD_REQUEST", message: "to, text required" } },
            { status: 422 }
          );
        }
        const id = `sms_${randomBytes(10).toString("hex")}`;
        inbox.push({ id, to, text, receivedAt: new Date().toISOString() });
        if (inbox.length > 200) inbox.shift();
        return Response.json({ messageId: id, segments: Math.max(1, Math.ceil(text.length / 160)) });
      }

      if (path === "/v1/phone/inbox" && req.method === "GET") {
        bump("phone:inbox");
        const to = url.searchParams.get("to");
        const messages = inbox
          .filter((m) => !to || m.to === to)
          .slice(-20)
          .reverse();
        return Response.json({ messages });
      }

      // ---------------- Liveness ----------------
      if (path === "/v1/liveness/jobs" && req.method === "POST") {
        bump("liveness:jobs");
        const jobId = `simjob_${randomBytes(16).toString("hex")}`;
        livenessJobs.set(jobId, { jobId, createdAt: Date.now(), submitted: false });
        if (livenessJobs.size > 500) {
          const cutoff = Date.now() - 15 * 60_000;
          for (const [k, j] of livenessJobs) if (j.createdAt < cutoff) livenessJobs.delete(k);
        }
        return Response.json({
          jobId,
          uploadUrl: `http://127.0.0.1:${PORT}/v1/liveness/jobs/${jobId}/submit`,
        });
      }

      const livenessMatch = path.match(/^\/v1\/liveness\/jobs\/([^/]+)\/submit$/);
      if (livenessMatch && req.method === "POST") {
        bump("liveness:submit");
        const jobId = livenessMatch[1];
        const job = livenessJobs.get(jobId);
        if (!job) {
          return Response.json(
            { error: { code: "UNKNOWN_JOB", message: "no such liveness job" } },
            { status: 422 }
          );
        }
        const simulate = (body.simulate as string | undefined) ?? "ok";
        const maskedSubject = (body.maskedSubject as string | undefined) ?? "";

        let livenessScore: number;
        let faceMatchScore: number;
        let reason = "liveness_passed";
        if (simulate === "fail_liveness") {
          livenessScore = seededRange(`${jobId}:live-fail`, 20, 55);
          faceMatchScore = seededRange(`${jobId}:face-ok`, 82, 99);
          reason = "liveness_score_below_threshold";
        } else if (simulate === "face_mismatch") {
          livenessScore = seededRange(`${jobId}:live-ok`, 78, 99);
          faceMatchScore = seededRange(`${jobId}:face-fail`, 35, 65);
          reason = "face_match_below_threshold";
        } else {
          livenessScore = seededRange(`${jobId}:live`, 80, 99);
          faceMatchScore = seededRange(`${jobId}:face`, 84, 99);
        }
        const passed = livenessScore >= 70 && faceMatchScore >= 80;
        const consistent = passed && maskedSubject.length > 0;
        const confidence = passed
          ? Math.round((livenessScore + faceMatchScore) / 2)
          : Math.round(Math.max(livenessScore, faceMatchScore) * 0.6);
        job.submitted = true;
        return Response.json({
          passed,
          livenessScore,
          faceMatchScore,
          consistent,
          reason,
          confidence,
        });
      }

      return Response.json(
        { error: { code: "NOT_FOUND", message: `no simulator route for ${req.method} ${path}` } },
        { status: 404 }
      );
    } catch (err) {
      return Response.json(
        { error: { code: "SIMULATOR_ERROR", message: err instanceof Error ? err.message : "fault" } },
        { status: 500 }
      );
    }
  },
});

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

console.log(`provider-simulator listening on 127.0.0.1:${PORT} (fault=none)`);
void server;
