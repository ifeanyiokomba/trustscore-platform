# Independent Audit — External Review

**Reviewer:** Claude (Anthropic), acting as an external reviewer with no role in building this codebase
**Date:** 2026-09-19
**Scope reviewed:** full clone of `main` (single commit `fefe7c5`) — source tree, Prisma schema, `next.config.ts`, `.env.example`/`.gitignore`, git history, `npm audit` against declared dependencies, and a `tsc --noEmit` pass against the actual project `tsconfig.json`
**Relationship to `docs/audit/*`:** those documents were produced by the same agent/session that built the code, in the same pass. That's not a criticism — they're detailed and mostly accurate — but self-graded audits share a blind spot by construction. This document is independent: verified directly against current source, not against the other audit docs' claims. Where the two disagree, it's noted explicitly.

Severity scale matches the existing convention in this folder: **P0** blocks safe handling of real user data · **P1** must-fix soon · **P2** scheduled · **P3** backlog/hygiene.

## Summary

| ID | Severity | Finding | Status |
|---|---|---|---|
| F1 | P0 | Security-critical secrets silently fall back to hardcoded, now-public defaults if unset in production | **Fixed this pass** |
| F2 | P1 | CSP allows `'unsafe-inline'` for `script-src` in production, not just dev | Open |
| F3 | P1 | 9 known CVEs (5 high) in the dependency tree, all traceable to 3 unused packages | Open (trivial fix identified) |
| F4 | P1 | No CI/CD — zero `.github/workflows`, zero `.yml` files anywhere in the repo | Open |
| F5 | P2 | `typescript: { ignoreBuildErrors: true }` — production build succeeds even with real type errors | Open (3 live errors confirmed, see below) |
| F6 | P2 | Rate limiter trusts client-supplied `X-Forwarded-For` with no documented trusted-proxy boundary | Open |
| F7 | P2 | Login rate limit is per-IP only — no per-account throttle against distributed credential stuffing | Open |
| F8 | P2 | `SECURITY_AUDIT.md` claims session "UA + hashed-IP binding"; `getSessionUser()` records both but enforces neither | Open (doc accuracy + minor gap) |
| F9 | P2 | No deployment/infra config anywhere; architecture (SQLite, in-memory rate limiter, in-memory IP salt) requires a single persistent-disk instance | Open (already tracked as G13/G14) |
| F10 | P3 | `next-auth` and `z-ai-web-dev-sdk` are unused dependencies | Open |
| F11 | P3 | scrypt cost factor (N=16384) is workable but on the low end of current guidance | Open |
| F12 | P3 | Per-process IP-hash salt resets on every restart — breaks cross-restart correlation | Open |

## F1 — Secret fallbacks (P0) — **fixed this pass**

Four secrets had the same pattern: `process.env.X ?? "<dev default>"`, with no check anywhere that `X` was actually set once `NODE_ENV=production`. Since this repo is public, every one of those default strings is public knowledge:

```
src/lib/providers/credential-vault.ts     VAULT_MASTER_KEY        ?? "ts_dev_only_vault_master_key"
src/lib/providers/liveness-provider.ts    SIGNAL_PEPPER           ?? "ts_backend_only_signal_pepper"
src/lib/providers/phone-provider.ts       SIGNAL_PEPPER           ?? "ts_backend_only_signal_pepper"
src/lib/providers/ninauth.ts              NINAUTH_CLIENT_SECRET   ?? "ts_backend_only_mock_partner_secret"
src/lib/providers/ninauth.ts              LOOPBACK_SIGNING_SECRET ?? "ts_backend_only_loopback_signing_secret"
```

`SIGNAL_PEPPER` is what turns phone numbers and NIN references into peppered fingerprints — the whole privacy model rests on it staying secret. `credential-vault.ts` even defined a `vaultUsesDefaultKey` flag to detect this exact condition, but nothing ever read it — the flag was wired to nothing.

**Fix applied:**
- Added `src/lib/platform/env-guard.ts` — `requireSecret(envVar, devFallback)` returns the dev fallback outside production, and **throws** in production if the var is unset, instead of silently degrading.
- Swapped all 5 call sites above to use it (one-line change per site, same fallback values preserved for dev/test).
- Added `src/instrumentation.ts` (the Next.js App Router boot hook — confirmed current for Next 16 via the official file-conventions doc: runs once, before the server accepts its first request, no experimental flag needed). It calls `assertCriticalSecretsAtBoot()`, which hard-requires `SIGNAL_PEPPER` and `VAULT_MASTER_KEY` unconditionally in production, and `NINAUTH_CLIENT_SECRET` only when `PROVIDER_LIVE_ENABLED=true` — so a legitimate MOCK-posture production deploy isn't blocked over a var it doesn't need yet. `LOOPBACK_SIGNING_SECRET` is intentionally left off the eager boot list (it protects transport to the local provider simulator, not real user data) but is still covered by the inline `requireSecret()` guard at its call site.

**Verified, not just written:** ran `npx tsc --noEmit` against the project's own `tsconfig.json` after generating the Prisma client. Zero errors in any of the 6 touched/added files. (5 pre-existing errors surfaced elsewhere — see F5, they're unrelated to this change and already existed before it.)

Net effect: it is no longer possible for the vault, the phone/NIN pepper, or the NINAuth client secret to silently operate on a publicly-known value in production. A misconfigured deploy now fails at boot with a clear message naming exactly which variable is missing, instead of quietly shipping.

## F2 — CSP `'unsafe-inline'` in production (P1)

`next.config.ts`: `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`. The `'unsafe-eval'` bit is correctly dev-only; `'unsafe-inline'` for scripts is **not** — it applies in production too, and it's the part that matters most: a CSP with `'unsafe-inline'` on `script-src` blocks very little XSS, since injected inline `<script>` tags still execute. This isn't a regression from a documented decision — nonce-based tightening is already the noted Batch 11 follow-up — just flagging that the CSP as it ships today is weaker than "PASS" suggests.

## F3 — Live dependency CVEs, unused packages (P1)

Ran `npm audit` against the declared `package.json` (fresh lockfile resolution): **9 vulnerabilities, 5 high** — `deepmerge-ts` (via `prisma`), `js-yaml` (via `@mdxeditor/editor`, includes CVE-2026-59870), `prismjs` (via `react-syntax-highlighter`, DOM clobbering), and `sharp` (multiple libvips/libheif CVEs).

Checked whether any of the three top-level packages are actually used: `grep -rln "@mdxeditor\|react-syntax-highlighter\|from \"sharp\"" src/` returns nothing, and `next/image` (which would pull in `sharp` implicitly) isn't used anywhere either. All three are dead weight. Removing them resolves all 9 current advisories without touching a single line of application code — no risky forced upgrades needed.

## F4 — No CI/CD (P1)

No `.github/workflows`, no `.yml`/`.yaml` file anywhere in the repo. The stage-matrix tests (`tests/stage*.py`) are genuine — real HTTP calls against a live dev server with seeded fixture accounts, not mocked units — but "green" is a manually-triggered, point-in-time claim with nothing enforcing it on every change. This isn't hypothetical: the worklog itself records the webhook/test route silently disappearing for a stretch (root-caused later to a `.gitignore` pattern swallowing product files) and a Stage 16 half-committed file breaking `tsc` — both caught by a human noticing, not a pipeline.

## F5 — `ignoreBuildErrors: true` (P2) — now with receipts

`next.config.ts` sets `typescript: { ignoreBuildErrors: true }`, so `next build` succeeds regardless of type errors. Running `tsc --noEmit` directly against the real `tsconfig.json` (as part of verifying F1's fix) surfaced 3 **currently live** type errors this setting is masking right now, unrelated to anything touched in this pass:

```
src/lib/services/devportal-service.ts(560,34/58)   Property 'checks'/'errors' does not exist on type '{}'
src/lib/services/network-service.ts(716,7)          Type 'unknown[]' not assignable to 'string[]'
src/lib/services/score-insights-service.ts(309,7/310,7)  Type '{} | null' not assignable to 'number | null'
```

Left unfixed in this pass since they're outside the scoped P0 and touch service files not otherwise reviewed here — flagging with exact locations so they're a fast follow-up rather than a rediscovery. Happy to take these too if wanted.

## F6 — Rate-limit IP trust boundary undocumented (P2)

`src/lib/platform/http.ts` reads `x-forwarded-for` (first entry) as the client IP for rate limiting, with no stated assumption about which layer is trusted to set it. Correct if a proxy in front sanitizes the header; trivially spoofable — fresh rate-limit bucket per request — if this ever sits anywhere without one. Worth a one-line comment stating the assumption plus a deploy-time check, since nothing in the repo documents or enforces it today.

## F7 — No per-account login lockout (P2)

`src/app/api/v1/auth/login/route.ts` rate-limits by `login:<ip>` only (8/min). A distributed attempt spread across many IPs against one target account isn't throttled beyond the CPU cost scrypt already imposes per guess. Worth a secondary `login:<email-hash>` counter alongside the existing per-IP one.

## F8 — Session "binding" claim overstated (P2)

`SECURITY_AUDIT.md` lists "UA + hashed-IP binding" under Authentication PASS. Reading `getSessionUser()` in `src/lib/platform/session.ts`: it checks revocation, expiry, and account-active status only. The UA and IP hash are recorded on the session row (surfaced in the security-center UI, used in audit logs) but never compared against the current request. A stolen session cookie works from any device/network with no additional friction. Not necessarily the wrong call — IP binding breaks mobile users constantly — but the audit doc should say "recorded" rather than "binding," since binding implies enforcement.

## F9 — No deployment config; architecture is single-instance by construction (P2)

Already tracked internally (G13/G14) so not relitigating the decision — just confirming, by direct read, that it's still fully open: `output: "standalone"` + SQLite file + in-memory rate limiter (`http.ts`) + in-memory per-process IP salt (`crypto.ts`) together mean this can only run correctly as one long-lived process with persistent local disk. There's no Dockerfile, Render/Fly/Railway config, or anything else in the repo yet describing that target.

## F10–F12 — Hygiene (P3)

- `next-auth` (4.24.11) and `z-ai-web-dev-sdk`: zero imports anywhere in `src/`. The custom session system replaced `next-auth` entirely; `z-ai-web-dev-sdk` looks like scaffold-tool residue that landed in `dependencies` rather than being left out. Safe to remove both.
- `crypto.ts`: password hashing uses scrypt (N=16384, r=8, p=1) — sound, timing-safe compare — but N=16384 (2^14) is on the low end of current OWASP guidance where server headroom allows more. Not urgent.
- `crypto.ts`: the IP-hash salt is a per-process `globalThis` value regenerated on every restart, so the same real IP hashes differently after every deploy (and would differ per-instance in a multi-instance deploy, same root cause as F9). Forensics/analytics quirk, not an exploitable gap on its own.

## What's genuinely solid

Worth stating plainly rather than only listing gaps. The PII discipline is real, verified directly against the Prisma schema, not just claimed: no raw `nin`/`bvn`/phone field exists anywhere — every identifier is a peppered hash or a masked hint, consistently, backed by inline comments enforcing the discipline model-by-model. Session tokens are 256-bit random, hashed at rest, properly revocable. Webhook signing (`webhook-service.ts`) is a correct Stripe-style HMAC-over-timestamp scheme with per-client, rotatable secrets. B2B API key auth (`trustdecision-service.ts:101-145`) is well-built: environment-prefixed keys (`tsk_live_`/`tsk_sandbox_`), hashed lookup, separate per-IP auth-failure and per-key usage rate limits, daily quota enforcement. Git hygiene is clean — one curated commit, confirmed nothing secret-shaped was ever committed. None of the findings above require rearchitecting anything; they're close-the-gap items on a foundation that's already pointed the right direction.

---

## Addendum — TrustScore implementation record (2026-09-19)

This document is the external reviewer's text, landed verbatim above. The reviewer also delivered a patch (`trustscore-p0-fix.patch`: `src/lib/platform/env-guard.ts` + `src/instrumentation.ts` + 4 call-site edits). **That patch was intentionally NOT applied as-is** — by the time it arrived, the platform had shipped an equivalent, stricter implementation of the same fix during sec-batch-A. Applying the patch on top would have conflicted with the live wiring and re-introduced a weaker variant. Disposition of every finding against what actually shipped:

| ID | Reviewer finding | Shipped disposition |
|---|---|---|
| F1 | Secret fallbacks (P0) | **Fixed (different mechanism, stricter).** `src/lib/platform/boot-guard.ts`: `guardedSecret()` throws at module load in production (or `TS_BOOT_GUARD_STRICT=1`) when a secret is unset, dev-default, `.env.example`-placeholder, or <16 chars; dev logs one loud warning. Wired into all FIVE provider files (`credential-vault`, `ninauth`, `phone-provider`, `liveness-provider`, `google`) + module scope of `src/proxy.ts` (Next 16's middleware convention — runs before first request, same role the patch's `instrumentation.ts` would have played). `vaultUsesDefaultKey` now feeds `/api/v1/admin/security-posture`. |
| F2 | CSP `unsafe-inline` in prod | **Fixed.** CSP moved to `src/proxy.ts`: production emits a per-request nonce + `strict-dynamic` on `script-src` (verified 2/2 rendered scripts nonced under `TS_FORCE_NONCE_CSP=1`); dev keeps the HMR-compatible policy. Single policy source — removed from `next.config.ts`. |
| F3 | 9 CVEs via 3 unused deps | **Fixed.** `@mdxeditor/editor`, `react-syntax-highlighter`, `sharp` removed (grep-verified zero imports, `next/image` unused). All 9 advisories gone. |
| F4 | No CI | **Fixed.** `.github/workflows/ci.yml`: quality job (tsc + eslint + prisma generate + mini-services + dev server + full stage/batch/auth matrices with documented cooldowns) and an audit job (npm audit HIGH+ gate). Not yet exercised against a real GitHub Actions runner — next push validates it. |
| F5 | `ignoreBuildErrors: true` | **Fixed.** Flipped to `false` (type errors are real gate failures); the 3 live errors the reviewer surfaced in `devportal-service.ts` / `network-service.ts` / `score-insights-service.ts` were fixed first — tsc verified 0 errors before the flip. |
| F6 | XFF trust boundary | **Fixed.** `clientIp()` reads the RIGHTMOST `TS_TRUSTED_PROXY_HOPS` entries of `X-Forwarded-For` (proxy-appended hops are trustworthy; the leftmost entries the old code read are client-spoofable). Assumption documented in `.env.example` + code. |
| F7 | Per-IP-only login limit | **Fixed.** Per-account failure-only throttle (8 failures / 15 min, keyed `sha256(normalized identifier)`), enumeration-safe (buckets exist for unknown identifiers too). Verified: 9th attempt across 8 spoofed IPs → 429. |
| F8 | "UA + hashed-IP binding" overstated | **Fixed.** `SECURITY_AUDIT.md` corrected to "recorded, not enforced"; new `SESSION_DEVICE_CHANGE` audit event on mid-session UA drift (hard binding deliberately not enforced — mobile reality). |
| F9 | Single-instance architecture | **Acknowledged, deferred** (already tracked as G13/G14: Redis-backed limiter, persistent IP-hash salt). Observable via the admin security-posture endpoint. |
| F10 | Unused `next-auth` + `z-ai-web-dev-sdk` | **Fixed.** Both removed (zero imports verified). |
| F11 | scrypt N=16384 low end | **Acknowledged, deferred** — deliberate sandbox headroom choice; revisit with deployment batch. |
| F12 | Per-process IP-hash salt | **Acknowledged, deferred** — same root cause as F9/G13. |

One item the reviewer could not see from the clone: the local sandbox history after fefe7c5 had drifted into committing `.next/` cache files, `db/custom.db`, and `dev.log` (all unpushed — the public repo was still clean at the review point). That was corrected the same day: `.gitignore` rewritten, those paths untracked from the index, `.env` untracked (its committed content was only a benign local `DATABASE_URL` path, but the tracked path itself was a landmine for any future real secret).
