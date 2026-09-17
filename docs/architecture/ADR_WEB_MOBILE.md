# ADR-002: Web-Primary, Mobile-as-Consumer Strategy

**Status:** ACCEPTED (Batch 0, 2026-09-17)
**Context:** directive §30–§31, §65; sandbox constraints; official NINAuth mobile guidance status.

---

## Decision

1. **Next.js 16 remains the primary application** (web MVP complete: landing, auth+NINAuth, dashboard 8 tabs, public Trust Links).
2. **One shared domain + API** (`/v1/*`) is the single source of truth; mobile will be a *consumption surface*, not a parallel product.
3. **Mobile client build is gated**, not abandoned: it begins when (a) official NINAuth mobile/SDK guidance exists (currently UNCONFIRMED — no published Expo/RN path, no deep-link spec), or (b) the web product is pilot-stable and the callback/deep-link contract is pinned against the partner sandbox.
4. Interim mobile posture: mobile-first responsive web; PWA manifest/installability is a Batch-13 candidate.

## Rationale

- The audit found **zero mobile-unready endpoints**: every mobile-MVP capability (sessions, passport, checks, QR, history, credentials, notifications, security, privacy/DSR, settings, appeals) is already an API-backed capability.
- The official citizen surface is the NINAuth *app itself* (no citizen web/PWA) — TrustScore mobile must not attempt to replicate NINAuth's job, only consume our API.
- Sandbox has no Expo/Flutter runtime; building a mobile client here would be untestable theater, violating the QA-standard rule (directive §56).

## Mobile non-negotiables (when the gate opens — Batch 4)

- PKCE authorization-code via **system browser** (never embedded webviews)
- No client secrets, no backend tokens in app storage; session token via deep-link exchange, stored in Keychain/Keystore
- Biometric gate for app entry; native camera for QR scan
- Offline-tolerant UX for interrupted NINAuth redirects (directive §65: backgrounding, deep-link return, expired/cancelled flows, poor camera, low-data)

## Consequences

- Web single-route constraint (sandbox) is documented and accepted; production splits routes.
- The API contract discipline (zod-strict, requestId, versioned) is treated as the mobile contract too — no mobile-only endpoints without a web/API-first design.
- Mobile E2E (G19) blocked with the client, not forgotten.
