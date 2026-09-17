# MOBILE AUDIT — Batch 0

**Scope:** directive §30–31, §65 (mobile strategy, MVP scope, QA standard) against sandbox reality and official NINAuth mobile guidance.

---

## 1. Official mobile guidance status (researched 2026-09-17)

The official NINAuth developer material documents **web/enterprise** integration (OAuth+PKCE, share codes, QR sessions) but contains **no published mobile SDK, no Expo/React Native integration path, and no deep-link/callback specification** — all UNCONFIRMED (see `NINAUTH_CONTRACT_MATRIX.md` rows 17–18). The NINAuth *citizen* surface is the NINAuth mobile app itself; there is deliberately **no citizen web/PWA** ("anything presenting itself as a NINAuth web login for citizens is not NINAuth").

## 2. Sandbox reality

No Flutter/Expo/React Native runtime exists in this environment. Directive §30 mandates **one shared domain + API** consumed by web and mobile — which is exactly what the `/api/v1/*` contract provides.

## 3. Strategy verdict (ADR_WEB_MOBILE records the decision)

- **Web (Next.js) remains the primary application** — audit confirms no change necessary (directive §30).
- **Mobile = same API, cookieless token flow.** The B2B surface already proves the pattern (API keys); a mobile client would use: PKCE authorization-code with system browser (no embedded webviews per OAuth BCP), backend-issued session token exchanged via deep link, secure storage (Keychain/Keystore), biometric gate for app entry, QR scan via native camera.
- **No client secrets in the app. Ever.** (directive §31 — already our law.)
- Mobile build begins when: (a) official mobile guidance exists OR (b) the web product is pilot-stable and the deep-link callback contract can be pinned against the partner sandbox. Until then, mobile-first *responsiveness* + PWA-lite installability of the web app is the honest mobile posture.

## 4. Mobile MVP scope (directive §31) — mapped and deferred with gates

```
Splash, Onboarding, Login(NINAuth), Home, Passport, Safety Check, Scan QR,
Trust History, Credentials, Notifications, Security, Privacy, Settings, Appeals
```
All of these already exist as **API-backed capabilities** (sessions, passport, checks, QR, history, credentials, notifications, security center, privacy/DSR, settings, appeals) — the mobile client is a *consumption surface*, not a new domain. The audit finds **zero mobile-unready endpoints**: every capability is reachable over the versioned API with proper auth.

## 5. Mobile QA standard (directive §65) — planned, not runnable here

Interrupted-redirect, backgrounding, deep-link return, expired/cancelled verification, poor camera, low-data mode — all recorded as the mobile test plan in the roadmap (Batch 4), executed when a mobile runtime exists.

## 6. Findings

| ID | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| M1 | P2 | No official mobile SDK guidance → cannot pin native flow | Blocked on partner; ADR documents the contingency |
| M2 | P2 | Mobile client build deferred until pilot-stable web + pinned callbacks | Roadmap Batch 4 (gated) |
| M3 | P3 | Consider PWA manifest + installability as interim mobile presence | Batch 13 candidate |
