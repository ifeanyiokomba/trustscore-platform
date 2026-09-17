# NINAuth — Official Documentation Research (Batch 0, Task 0-2a)

**Purpose:** single source of truth for what NIMC's NINAuth *actually documents*, separating DOCUMENTED fact from UNCONFIRMED assumption, so TrustScore's LIVE integration is built against the real contract and never against invented details.

**Method:** synthesis of official NINAuth pages (ninauth.nimc.gov.ng), the official Postman collection ("NINAuth API Documentation [v1.0.1]"), and the NINAuth enterprise-dashboard JS bundle. All raw extracts in `/tmp/ninauth/`. Zero new claims invented; every gap is marked **UNCONFIRMED**.

**Fetched:** 2026-09-17 (all URLs below confirmed HTTP 200 on that date; the /status page itself read "Last updated: September 17, 2026 at 07:52 UTC — All systems are in normal operation").

**Companion doc:** `NINAUTH_CONTRACT_MATRIX.md` (row-by-row capability matrix with our MOCK posture per cell).

---

## 1. Executive summary

**NINAuth is Nigeria's official identity consent gateway, owned and operated by the National Identity Management Commission (NIMC).** It lets a person prove who they are to an organization without exposing their raw National Identification Number (NIN), through two user-controlled channels — **QR codes** and **Share Codes** — plus a passwordless **"Authenticate with NINAuth"** sign-in flow for services, and a set of restricted enterprise verification APIs. [about-nin-auth]

It provides, concretely:

- **Privacy-preserving verification:** "Identity verification without exposing the NIN" — only share codes or QR codes are used; the NIN is never directly requested or shared in the mainstream flows. [dg_01]
- **Consent-first data sharing:** no data flows unless the user explicitly approves, and only the data fields explicitly approved are shared. [dg_01, dg_05]
- **Real-time validation against NIMC's authoritative database**, with per-event audit trails. [dg_05]
- **Passwordless delegated authentication** for third-party services (OAuth 2.0 authorization-code + PKCE, S256), returning a signed assertion. [dg_07, dg_08]
- **A digital ID Wallet** (DID/VC-aligned) holding PII, verified credentials, third-party and self-declared credentials. [wallet, about-nin-auth]
- **An enterprise/partner API** (the Postman collection) covering share-code verification, dynamic/static QR sessions, in-person verification, and — restricted — raw-NIN, demography, phone-number and face-match checks. [postman]

**Standards claimed:** OAuth 2.0 (RFC 6749), OpenID Connect v1.0, WebAuthn, FIDO UAF, W3C DID v1.0, VC v1.1, DIDComm v2, DWN, OSIA (Secure Identity Alliance), NIST SP 800-63 (referenced), NDPA 2023, PKI/ECC via the National PKI (with NITDA), NTP timestamping, and a private permissioned DLT for transaction-record metadata only (no PII on ledger, no smart contracts). [about-nin-auth, standards-adopted]

**Access model:** organizations reach NINAuth only through approved intermediaries. An **Enterprise** (private org) connects via an approved **Verification Partner**; a **Government User** connects via an **Aggregator**; a Verification Partner itself connects via an **Aggregator**. NIMC bills Aggregators on transaction volume; partner pricing is private. Onboarding decisions take ~5–7 business days per step. [enterprises, verification-partner, government-users]

**Critical caveat for TrustScore:** the official OAuth surface is described **prose-only with relative paths** (`/oauth/authorize`, `/oauth/token`, `/oauth/userinfo`) and **no scope strings, no token schemas, no error codes, and no full base URL** are published in any fetched source. The Postman collection contains **only the enterprise verification API**, not the OAuth endpoints. Everything on the OAuth wire format is UNCONFIRMED until partner sandbox credentials arrive.

---

## 2. Identity model (NIN, NINAuth app, wallet, partners)

### 2.1 The NIN and NIMC's role
- NIMC is the issuing authority and "has primary responsibility for maintaining the security of your identity data"; NIMC "centrally manages and protects your NIN and associated details." [privacy-and-security]
- Over 100 million Nigerians have a NIN (more than half the population). [about-nin-auth]

### 2.2 The NINAuth mobile app (the citizen-side identity holder)
- Android + iOS only. **"There is no web version or PWA for individuals: anything presenting itself as a NINAuth web login for citizens is not NINAuth."** Every identity action a person takes — approving, sharing, revoking — happens in the app. [dg_06]
- App store links: Google Play `com.ninauth.mobile`; Apple App Store `id6744244380`. [get-started]
- **Onboarding does the biometric binding:** "onboarding runs a face verification: a live capture, checked for liveness, matched against the photograph on that NIN record at NIMC." A working front camera is required. [dg_06]
- **Enrolment is one-NIN-per-app-instance:** "NINAuth enrolment binds each app instance to one NIN through a liveness-checked face match against the national identity record." A successful sign-in is therefore "a unique, deduplicated, verified individual." [dg_07]
- **Offline capability:** a user can sign in to the app offline with device biometrics (fingerprint/face unlock) and share identity data offline. [dg_06]
- Sign-up entry point on the marketing site: "Sign up with your NIN" (`/sign-up`). [individuals]

### 2.3 The NINAuth Wallet
- Stores: **PII** (name, DOB, NIN), **Verified Credentials** (government-issued: driver's license, voter's card, tax ID, passport), **Trusted Third-Party Credentials** (insurance, professional bodies), **Self-Declared Credentials** (gym membership, event tickets). [wallet]
- Ecosystem roles: **Issuers** of digital ID/documents, **Wallet Users**, **Wallet Service Providers (WASPs)** — intermediaries linking businesses to the wallet ecosystem. The only named WASP shown on the page: **VAULTACCESS**. [wallet, wallet-service-providers]
- Data shared from the wallet is "digitally signed, government-verified … authenticated at the source (NIMC and relevant authorities)." [wallet]
- Wallet data request flow (WASP page): user selects **"Verify with NINAuth Wallet"** → platform generates a QR code **or short share code** → user authorizes → platform instantly receives verified government-backed data. [wallet-service-providers]

### 2.4 Organizational roles and the partner chain
| Role | Definition | Connects via | Cost bearer |
|---|---|---|---|
| Enterprise | Private org in Nigeria consuming verification | approved identity **Verification Partner** | agreement + pricing with the Verification Partner (private) |
| Verification Partner | Private org performing verification on behalf of others (ID check, facial authentication, liveness detection) | a designated **Aggregator** | Aggregator invoices; NIMC charges Aggregators on transaction volume |
| Government User (MDA) | Nigerian government agency/ministry | an approved **Aggregator** | Aggregator invoices |
| Aggregator | (implied) volume intermediary between NIMC and partners/users | — | billed by NIMC on transaction volume |
| WASP | Wallet Application Service Provider | NINAuth Wallet technical specs | — |

[enterprises, verification-partner, government-users, wallet-service-providers]

- Eligibility (Enterprise and Verification Partner alike): NDPA compliance, physical Nigerian presence (subject to Nigerian law), informed consent from clients for NINAuth matching, purpose limitation ("using NINAuth solely for the purpose(s) for which access has been granted"), robust security/access controls with logging and monitoring, compliance reporting, submission to independent audits. [enterprises, verification-partner]
- The enterprise dashboard (`app.ninauth.nimc.gov.ng`) has role-scoped routes for `enterprise`, `aggregator`, `mda`, and `agent`, plus verification-compliance documents, billing/top-up (standard packages, plan selection, price calculation), team members, documents, and settings. [app-bundle.js route strings]
- NINAuth "is designed to strengthen and not replace existing KYC protocols." [enterprises]
- An **approved-partners public search** exists so citizens can verify that a requesting company is an approved enterprise or verification partner "before you consent." [approved-partners]

---

## 3. Authentication & verification flows (as actually documented)

### 3.1 QR Code Flow — Enterprise-Initiated [dg_03, dg_04, postman]
1. Enterprise generates a QR code (dynamic: time-bound **2 minutes**, per-request; static: reusable, with a request type like "Account opening").
2. User scans with the NINAuth app; the app shows the requesting enterprise's details, request reason, requested data fields, and (static codes) the request type.
3. User approves or rejects in real time.
4. Enterprise retrieves the consented, verified data (via the session verification-report endpoint); the process is recorded for traceability.

Dynamic QR session lifecycle (Postman):
- `POST /api/v1/integration/enterprise/online/session/create` with `{enterpriseId, dataRequested[], requestReason}` → `201` with `{expires, qrCode, qrCodeBase64, requestId, sessionId}`.
- `GET /api/v1/integration/enterprise/online/session/regenerate/{Session_ID}` re-issues an expired-but-unused dynamic QR.
- `POST /api/v1/integration/enterprise/online/session/verification-report` with `{enterpriseId, sessionId, provisionalId, provisionalIdName, requestId}` → returns **only the requested fields** (sample shows `biographicData: {firstName, lastName}` for a session that requested exactly those).
- Static: `POST /api/v1/integration/enterprise/online/static/generate` with `{enterpriseId, dataRequested[], requestReason, requestType}` → `201` with `{dataRequested[], qrCode, qrCodeBase64}`.

**QR payload (decoded from the collection's sample values):** the `qrCode` string is base64 of an **HS256 JWT** whose payload is `{"exp": <unix>, "requestCode": "<26-char ULID-like id>", "type": "dynamic"}`. *(Sample-derived; the signing key is obviously not published.)*

### 3.2 Share Code Flow — User-Initiated [dg_03, get-started, postman]
1. User opens the NINAuth app and generates a **Share Code** — a **6-character alphanumeric code**, **time-limited**, that must be submitted **in uppercase**.
2. The enterprise collects it and validates via the NINAuth **dashboard or API**: `POST /api/v1/integration/enterprise/sharecode/verify/{Enterprise_ID}` with `{shareCode, requestReason}`.
3. On success the enterprise receives the consented, verified data (`biographicData`, `biometricData[]` (face photo, base64), `contactData`, `requestId`).
4. The process is recorded for traceability.

The Share Code is positioned for remote/after-hours verification "when the user is not physically present" (e.g., financial institutions outside business hours). [postman folder description]

### 3.3 Authenticate with NINAuth — passwordless service sign-in [dg_07]
- User presses **"Continue with NINAuth"** (or similar) on the service's sign-in screen.
- The service issues an authentication request; NINAuth resolves it to the user's app, **displaying your registered client identity, name, logo, and the requested scope**.
- The user approves (via authentication code or QR scan); NINAuth returns the assertion; the service establishes its session.
- **The signed assertion contains:** "the claims the user approved, verification status, the scoped attributes, a consent reference, and the issued-at timestamp." **"Validate the signature before establishing a session."**
- Security properties NIMC claims for it: every account resolves to a biometrically enrolled (deduplicated) identity — "defeats bot registration, synthetic accounts and multi-accounting at the identity layer"; no password/credential database to breach ("what you hold are signed, scoped assertions rather than raw identifiers"); consent capture and audit at the protocol level (each approval logged to the user's consent history and returned as a **consent reference**).

### 3.4 Single sign-on (SSO) [dg_08]
- Session federation **across one organisation's registered services only**; "it never crosses organisational boundaries." SSO "performs no new verification, it propagates one that already happened." Single-service orgs have no use for it.
- Developer mechanics (see §4): repeat the same authorize flow from each service; NINAuth decides whether a fresh full authentication is needed or the existing org session can satisfy the request.

### 3.5 In-person verification (assisted) [postman]
- For users without mobile/internet: `POST /api/v1/integration/enterprise/in-person/create/{Enterprise_ID}` with `{nin, requestReason, selfieImage.image}` — **the selfie image also serves as consent** — then complete via the shared verification-report endpoint.
- Face-match variant (gov security agencies only): `POST /api/v1/integration/enterprise/in-person/create-with-face-auth/{Enterprise_ID}` with `{nin, requestReason, liveliness_images[4], selfieImage}` → `{requestId, sessionId, faceAuthStatus: "approved", statusReason: "Match"}`.

### 3.6 Restricted / legacy flows [postman, get-started]
- **Raw-NIN verification** (`POST /api/v1/integration/enterprise/raw-nin/verify/{Enterprise_ID}`, body `{nin, requestReason}`): "being phased out by NIMC and is currently restricted to financial institutions and government agencies."
- **Demography search** (`.../demography-data/verify/{Enterprise_ID}`, body `{firstName, lastName, dateOfBirth (DD-MM-YYYY), gender, requestReason}`): government security agencies only; returns close matches; response includes a `consentID`.
- **Phone-number verification** (`.../phonenumbers/verify/{Enterprise_ID}`, body `{phone, requestReason}`): government security agencies only; returns NIN data linked to a phone number.
- The marketing framing of raw-NIN: "NINAuth uses existing Raw NIN data you securely provide to match it against official government records… NINAuth does not collect raw NINs directly from users." [get-started]

### 3.7 Business sign-in with RC number — **NOT DOCUMENTED**
No fetched official source describes a "sign in with RC number" or any business-identity authentication flow. The closest artifacts are: enterprise **registration** requires CAC documents (`cac_memart`, `cac_certificate` uploads) and directors' details **including NINs** [postman]; and news coverage of CAC/NIN linkage is generic (web search `s_rc`). **UNCONFIRMED / likely absent** as a public flow. TrustScore must not build against it.

---

## 4. OAuth / OIDC contract (everything the sources actually say)

All of the following comes from **one page** — the Developers Guide "Single sign-on" section [dg_08] — plus the assertion description in "Authenticate with NINAuth" [dg_07]. The Postman collection contains **no OAuth endpoints at all**.

### 4.1 Authorization request
- Trigger: "Add a NINAuth sign-in button to each registered service. On click, generate a fresh PKCE verifier and state, then redirect the user to **`/oauth/authorize`**."
- Query parameters (verbatim list): **`client_id`, `app_id`, `redirect_uri`, `response_type=code`, requested `scope`, `state`, `code_challenge`, `code_challenge_method=S256`**.
- "NINAuth owns the hosted login, QR or code entry, app approval, and consent polling."
- On approval it "redirects back to your registered callback with **`code`** and **`state`**."
- **Full URL: UNCONFIRMED.** The docs give only the relative path. (Hints from search results, third-party: a `ssologin.nimc.gov.ng` "NINAuth Web Integration" surface exists; unverified.) The task brief's `/api/v1/oauth/token` path form is **not present in any fetched source**.

### 4.2 Token exchange
- "Your backend exchanges that code at **`/oauth/token`** with the original `code_verifier`, then uses the returned tokens or calls **`/oauth/userinfo`** when a direct profile lookup is needed."
- Request fields: `code` + `code_verifier` (client authentication fields **UNCONFIRMED** — the enterprise API uses `client-id`/`client-secret` headers, but whether the OAuth endpoints do is not documented).
- Response fields (token schema, TTLs, refresh semantics): **UNCONFIRMED**.

### 4.3 PKCE (S256) [dg_08]
- "Generate a private `code_verifier` and keep it **in browser storage**. It is not sent during the first redirect."
- "Send NINAuth a hashed public challenge: `code_challenge = SHA256(code_verifier)` with `code_challenge_method=S256`."
- After sign-in and consent, NINAuth redirects back with an authorization code; "that code alone is not enough to receive tokens." The service exchanges the code with the original verifier; "NINAuth validates that the verifier hashes back to the original challenge before returning tokens."
- Rationale given: a stolen authorization code cannot be completed without the private verifier.
- Note: the guide's wording is written for a browser-hosted (public) client. TrustScore's backend-held verifier (confidential client) is a strict hardening of the same mechanism, not a contradiction.

### 4.4 `state`
- Generated fresh per request, sent on the authorize redirect, and returned on the callback ("redirects back … with `code` and `state`"). Anti-CSRF purpose implied by the flow. **No format/length specified.**

### 4.5 `nonce`
- **Not mentioned anywhere in the fetched official sources.** (OIDC is claimed as an adopted standard on the About page, and TrustScore's mock validates an ID-token nonce, but NINAuth's nonce support is **UNCONFIRMED**.)

### 4.6 ID token / signed assertion [dg_07]
- Contents (prose): the claims the user approved, verification status, the scoped attributes, a **consent reference**, and the issued-at timestamp.
- Obligation: "Validate the signature before establishing a session."
- Signature algorithm, key distribution (JWKS?), issuer/audience values, expiry: **UNCONFIRMED**. (Context: the standards page claims PKI/ECC and the dashboard exposes RSA "crypto keys … used to encrypt and decrypt NIN verification requests" [developers-chunk.js], but no signing-key publication mechanism is documented.)

### 4.7 UserInfo
- Exists as `/oauth/userinfo` ("when a direct profile lookup is needed"). Request/response shape, auth method, scopes: **UNCONFIRMED**.

### 4.8 Refresh token
- **Not mentioned in any fetched source.** "uses the returned tokens" (plural) is the only hint. **UNCONFIRMED.**

### 4.9 Enterprise-API authentication (contrast — fully documented)
The Postman enterprise endpoints do **not** use OAuth tokens; they use **HTTP headers `client-id` and `client-secret` on every protected request**, plus an **Enterprise ID** (distinct from client-id) in the path, and (production) **IP whitelisting**. [postman collection description]

---

## 5. Scopes & consent model

### 5.1 What "scope" means in the docs
- The OAuth flow refers to a "**requested scope**" shown to the user at approval time, and "**scoped attributes**" returned in the assertion. [dg_07, dg_08]
- **No scope strings/names are published anywhere in the fetched sources.** The full scope vocabulary is **UNCONFIRMED** until sandbox access.

### 5.2 Field-level consent (the verification APIs' analog — fully documented)
- The verification APIs take an explicit **`dataRequested[]`** array (e.g. `["firstName","lastName"]`), and the verification-report response returns **only those fields**. [postman]
- The canonical field vocabulary is served by **`GET /api/v1/integration/enterprise/pii-fields`** — 50+ fields addressed as paths: `nin`, `biographicData.firstName`, `biographicData.lastName`, `biographicData.middleName`, `biographicData.dateOfBirth`, `biographicData.gender`, `biographicData.birthCountry/birthState/birthLga`, `biographicData.nationality`, `biographicData.maritalStatus`, `biographicData.maidenName`, `biographicData.religion`, `biographicData.height`, `biographicData.physicalStatus`, `biographicData.educationLevel`, `biographicData.employmentStatus`, `biographicData.profession`, `biographicData.enrolledAt`, `biographicData.deathVerification`, `biographicData.residence*` (addressLine1/2, LGA, state, town, status, country), `biographicData.origin*` (country, LGA, place, state), `biographicData.nextOfKin*` (10 fields), `biographicData.previous{First,Last,Middle}Name`, `biographicData.otherName`, spoken/read-write languages, `biometricData`, `biometricData.image` (photo), `contactData.email`, `contactData.phone1`, `contactData.phone2`, `credentialData`. [postman]
- Requested vs granted semantics: "Enterprises receive only the fields they request, not the entire identity dataset" [dg_05]; "Only the data fields explicitly approved by the user are shared" [dg_01]; the user sees the requested fields (and request reason / request type) in the app before approving or rejecting in real time [postman Online Verification folder, dg_03]. In the assertion, the user-approved claims are what come back [dg_07].

### 5.3 Request reasons (purpose binding)
- Every verification call carries a **`requestReason`** drawn from a **fixed catalog** served by `GET /api/v1/integration/enterprise/request-reasons` — 39 keys, e.g. `taxationEnrollment`, `medical`, `educationExam`, `employmentRecruitment`, `creditBackgroundCheck`, `financialProducts`, `insurance`, `nyscCheck`, `efccCheck`, `passportImmigration`, `pensionEnrollment`, `telecommunicationSimReg`, `physicalAccess`, `logicalVirtualAccess`, `defence`, `leaCheck`, `blacklistPolitical`, `blacklistSocial`, `crimePrisonIncarceration`, `legalCourts`, `clearanceForPoliticalOffice`, transport modes (`aviationTransport`, `roadTransport`, `maritimeTransport`, `railwayTransport`), `entertainment`, `socioCulturalEnrollment`, `corporateAffairs{Director,Shareholder,Trustee}`, `taxation{Enrollment,Assessment,Enforcement}`, `education{Exam,Admission,Promotion}`, `employment{Recruitment,Enrollment,Dismissal}`, `telecommunicationIotReg`. [postman]

### 5.4 Consent properties
- Consent-First: "No data is shared unless the user explicitly approves the request." [dg_01]
- Every approval is logged to the user's **consent history** and returned to the service as a **consent reference** in the assertion. [dg_07]
- The demography/phone endpoints return a **`consentID`**. [postman]
- Legal edge: NIMC may disclose personal information to law enforcement/security agencies **without consent** in legally authorized circumstances (e.g., national-security investigations). [privacy-and-security]
- Enterprises/partners must obtain **informed consent** for NINAuth matching and are audited on purpose limitation. [enterprises, verification-partner]

---

## 6. Security requirements (for integrators)

From the Postman collection description [postman] and dashboard bundle [app-bundle/developers-chunk]:

1. **Credential handling:** `client-id` (public identifier) + `client-secret` (confidential) issued at onboarding via the NINAuth Dashboard; the secret authenticates **all** protected API requests (headers). Secret regeneration is supported and "will invalidate the current client secret and generate a new one for this verification partner."
2. **IP whitelisting:** production access is restricted to **whitelisted static IPs**; "mandatory in production and cannot be bypassed"; whitelist changes are logged and auditable.
3. **Callback URL registration** via the dashboard ("Configure your callback URL to receive verification responses").
4. **Enterprise IDs:** each enterprise created under the partner gets a unique Enterprise ID, "distinct from the client-id."
5. **Webhooks:** "Add your webhook URL to receive verification events from NINAuth." (Event names, payloads, signature scheme: **UNCONFIRMED**.)
6. **Crypto keys:** the dashboard lets partners "generate, copy or download the cryptographic keys used to encrypt and decrypt NIN verification requests" — described as **RSA public/private keys** ("Manage your RSA public and private keys for secure NIN authentication"); "Ensure your private key is stored securely and never shared." Active-key status is surfaced (`No active public/private key found` states).
7. **Assertion validation:** integrators must "validate the signature before establishing a session" [dg_07]; PKCE S256 on the OAuth flow [dg_08].
8. **Sandbox-first:** "Use your credentials to test the API endpoints in a sandbox environment … Test in Sandbox before switching to production."
9. Platform-side assurances NIMC makes: encryption in transit and at rest; data decryptable only by the consented organization; "NINAuth does not store your personal information"; transaction data retained only the minimum period required by law/audit; regular independent security assessments and penetration testing; NDPA alignment; DLT-backed immutable transaction metadata (transaction IDs, timestamps, verifier IDs, verification types — no PII); NTP-synchronized timestamps; personnel subject to criminal charges for violations. [privacy-and-security, standards-adopted]
10. **Anti-phishing posture for enterprise users:** "Before signing in, confirm the address bar shows the official NINAuth domain, every time" — enterprise credentials "unlock verification of citizens," making them a target. [dg_06]

---

## 7. Mobile integration guidance (Expo / React Native)

**There is no official NINAuth mobile SDK or Expo/React Native integration guidance in any fetched source.** Specifically:

- The official developers guide covers web-style OAuth redirects and QR/share-code flows, plus button/brand rules — nothing about native app integration, app-links/deep-links, or custom URL schemes. [developers-guide]
- Web searches for NINAuth + Expo/SDK/npm surface only **generic third-party** OAuth/Expo content (Beyond Identity, Better Auth, Logto) and the mobile app's own store listings — no NINAuth SDK. [s_expo, s_sdk, s_npm]
- The only NPM-adjacent hit is the marketing site itself ("NINAuth Web Integration — ssologin.nimc.gov.ng"), which is NIMC's own SSO surface, not a package. [s_npm]
- Mobile-app requirements that exist concern the **citizen** app (Android/iOS, front camera, offline biometric unlock), not integrator apps. [dg_06]

**Consequence for TrustScore:** our current web-based "Continue with NINAuth" (redirect/approve/callback) is the only documented integration shape. Any future React-Native/Expo client would have to re-derive the flow (system browser + redirect, or the QR flow) without official guidance — **UNCONFIRMED territory**; ask the partner when sandbox credentials arrive.

---

## 8. Branding requirements for integrating products

From "NINAuth button guidelines" [dg_09] and "Logo and brand use" [dg_010]:

**Button**
- Two allowed styles: **white-filled (`#FFFFFF`)** (default — "pairs with your service's interface") or **green-filled (`#008643`)** (where more emphasis is needed). Do **not** recolor to match your brand palette.
- Hover states: white → `#D1FAE5G` *(sic — as printed on the page; not a valid hex, presumably `#D1FAE5`)*; green → `#036B45`. No other hover styling.
- Labels: signing in → **"Continue with NINAuth"** or **"Sign in with NINAuth"**; verifying identity → **"Verify with NINAuth"** or **"Authenticate with NINAuth"**.
- "NINAuth" is **one word** in all labels — never "NIN Auth", "NinAuth", "NIN-Auth", "NINAUTH".
- Use your own typeface at your primary button's text size; **sans serif recommended** to match the logo.
- Border radius and width/height should match your own primary button; never render the NINAuth button smaller than surrounding sign-in options; **≥44px touch target** on touch interfaces.
- Accessibility: the NINAuth **logo** element needs `aria-label="NIN Auth"` (two words) so screen readers don't spell it out.

**Logo**
- Use the supplied asset pack (`NINAuth-brand-assets.zip`: full colour / reverse / monochrome logos, light & dark buttons, SVG/PNG/EPS). Full colour on light backgrounds, reverse on dark/photography, monochrome for one-ink contexts.
- Endorsement rule: "You may state that your service supports NINAuth. Avoid any use that suggests NIMC endorses, certifies or ranks your organisation or product. **Integration is not endorsement.**"

TrustScore compliance note: our white "Continue with NINAuth" primary button with emerald accents (Stage 16) already follows the white-filled default; keep the aria-label and the no-endorsement rule in all marketing copy (this also matters for the "Trust Score®"-style trademark hygiene flagged in COMPETITOR_RESEARCH.md).

---

## 9. What NINAuth establishes vs. does NOT

### NINAuth establishes
- A **unique, deduplicated, biometrically bound individual**: app enrolment = liveness-checked face match against the NIMC NIN record; one NIN per app instance. [dg_06, dg_07]
- **Real-time verification against the authoritative NIMC database** for the requested fields, with signed delivery and consent references. [dg_05, dg_07]
- **Field-level, purpose-bound, user-approved data release** with audit trails on both sides. [dg_01, dg_03, dg_05, postman]
- **Verified-status signals** (e.g., `faceAuthStatus: "approved"` / `statusReason: "Match"` on the gov face-auth flow). [postman]
- **Session-level authentication** for services via signed assertions; org-scoped SSO propagation. [dg_07, dg_08]

### NINAuth does NOT
- **Does not expose the raw NIN** in the mainstream flows (raw-NIN APIs exist but are restricted to FIs/government and are being phased out). [dg_01, dg_05, postman]
- **Does not provide a citizen web login** ("anything presenting itself as a NINAuth web login for citizens is not NINAuth"). [dg_06]
- **Does not replace KYC** — it "strengthens and [does] not replace" existing KYC protocols. [enterprises]
- **Does not cross organizational SSO boundaries** and SSO "performs no new verification." [dg_08]
- **Does not rank, certify, endorse, or score** integrating organizations. [dg_010]
- **Does not (in the fetched docs) publish**: OAuth scope names, token schemas, error codes, SDKs, webhook payload formats, rate limits, or the OAuth base URL. (All UNCONFIRMED.)
- **Biometric binding is at app enrolment (and in restricted per-transaction gov flows)** — the standard QR/share-code/assertion flows rely on the already-bound app instance + user approval, not a fresh biometric check per verification. Do not claim per-transaction biometric proof. [dg_06, dg_07]
- **No documented reputation/risk/assurance scoring** of any kind — that layer is TrustScore's own value-add and must be presented as ours, not NIMC's. [dg_010 endorsement rule]

---

## 10. Error handling

**No API error codes are documented in any fetched official source.** Documented fragments only:

- Response envelope is `{status, success, message, data}` with HTTP 200/201 on the documented successes. [postman]
- Enterprise lifecycle status example: `"status": "awaiting_approval"` after registration. [postman]
- Face-auth result vocabulary: `faceAuthStatus: "approved"`, `statusReason: "Match"`. [postman]
- Portal client-side messages (dashboard JS, not the public API contract): "Unauthenticated. Please log in again.", "Access forbidden. You do not have permission to perform this action.", "No response from server. Please check your network connection.", "Request timed out. Please try again or check your connection.", "The file you uploaded is too large…". [api-chunk.js]
- Share-code failure modes implied by requirements: expired/invalid code, lowercase submission. [postman folder description]

**TrustScore must treat the LIVE error-code table as UNCONFIRMED** and derive it from sandbox behavior; our current mock codes (`SCOPE_INVALID`, `RAW_IDENTIFIER_BLOCKED`, `state_mismatch`, `code_replay`…) are our own contract, not NINAuth's.

---

## 11. Implications for TrustScore (build-on-top guidance)

1. **Never store raw NIN — and never request it.** The `pii-fields` catalog *does* include `nin` (for the restricted raw-NIN track), so a future LIVE payload could legally contain it. Our `scope-guard.ts` raw-identifier tripwire (`nin`, `bvn`, `national_id`, … → `RAW_IDENTIFIER_BLOCKED`, nothing persisted, SYSTEM audit) is exactly the right guard — keep it mandatory for every NINAuth-derived writer.
2. **Consent-first is contractual, not cosmetic.** NIMC's eligibility terms require informed consent, purpose limitation, logging, compliance reporting, and audit submission [enterprises]. Our consent screens (identity flow + `NINAUTH_AUTHENTICATION` purpose override) and per-scope opt-in mirror the documented UX (client identity + logo + requested scope shown before approval; consent reference returned).
3. **Granted-scope is authoritative.** The documented behavior — response contains only `dataRequested`/approved fields; assertion contains "the claims the user approved" — validates our pipeline stance: `granted-scopes → allowed-attributes → normalization → minimal-storage`. Never persist provider payload fields that no granted scope declared, even if NINAuth sends them.
4. **Distinguish the two "share" primitives — loudly.** A **NINAuth Share Code** is a 6-char uppercase alphanumeric, user-generated in the NINAuth app, one-time/time-limited, redeemed by an *enterprise* against the NINAuth API. A **TrustScore Share Token** is our passport construct (`ts_` + base64url 24B, hashed at rest, revocable, receipted). Different issuer, direction, lifetime, and trust basis. Keep names, docs, and UI copy disjoint ("NINAuth Share Code" vs "TrustScore Share Token") and never let one impersonate the other.
5. **Our OAuth shape is directionally right but unverifiable until sandbox.** We implement authorization-code + PKCE S256, state, one-time hashed codes (60s), ID-token validation (signature/issuer/audience/expiry/nonce), backend-only secret — all consistent with the guide. But the real **authorize/token/userinfo URLs, scope strings, token schemas, and error codes are UNCONFIRMED**; our `/api/v1/auth/ninauth/{start,approve,callback}` are *our wrapper routes*, and `approve` is explicitly our mock-app surface that disappears in LIVE. Budget a contract-verification sprint when credentials arrive (Stage 13 gate).
6. **Nonce discipline:** the guide documents `state` but never `nonce`. Keep our nonce validation (it's OIDC-correct and the About page claims OIDC adoption) but do not describe it as NINAuth-documented.
7. **Partner track for going LIVE (private org):** Enterprise track via an approved Verification Partner — eligibility (NDPA, Nigerian presence), agreement, ~5–7 business days, then NIMC dashboard onboarding: client-id/client-secret/base_url, static IP whitelisting (mandatory), callback URL registration, Enterprise ID creation, sandbox testing, go-live. Our `.env`/posture gate should model exactly these knobs (`base_url`, `client-id`, `client-secret`, `enterprise_id`, whitelisted egress IP, callback URL).
8. **Verification-partner posture is a plausible TrustScore future state** (performing verification on behalf of others via an Aggregator) — that's where the share-code/QR enterprise APIs would become our product surface.
9. **Branding:** keep the white/green button rules, one-word "NINAuth", `aria-label="NIN Auth"` on the logo, ≥44px touch target, and the "integration is not endorsement" rule in every public claim about NIMC/NINAuth. Our score must always be attributed to TrustScore, never NIMC.
10. **Reliability vocabulary:** the public /status page components (QRcode Auth Service, Sharecode Verification, Biometric Verification, ID Check Services, Email/OTP-SMS Authentication) are the official names to use in our provider-health/degraded-posture UX when LIVE.
11. **Webhooks exist** (dashboard-configurable, "verification events") — our webhook-worker mini-service is the right architectural slot, but event names/payload/signature are UNCONFIRMED; design the LIVE adapter interface now, fill semantics later.
12. **Freshness:** NINAuth verification is real-time at verification time; NIMC retains transaction data only the minimum period required by law/audit. Our 90-day identity-freshness horizon and freshness-honest decisions remain TrustScore policy choices on top, not NINAuth guarantees.

---

## 12. Sources (all fetched 2026-09-17)

**Official NINAuth website (ninauth.nimc.gov.ng):**
- Home — https://ninauth.nimc.gov.ng/
- About NINAuth — https://ninauth.nimc.gov.ng/about-nin-auth
- Developers Guide (index) — https://ninauth.nimc.gov.ng/developers-guide
  - Sections (hash-routed on the same URL): What is NINAuth? · What is the NINAuth flow? · NINAuth use cases · How is NINAuth different from previous verification flows? · Device and browser requirements · Authenticate with NINAuth · Single sign-on · NINAuth button guidelines · Logo and brand use
- Get Started — https://ninauth.nimc.gov.ng/get-started
- For Individuals — https://ninauth.nimc.gov.ng/individuals
- Download — https://ninauth.nimc.gov.ng/download
- For Business (Enterprises) — https://ninauth.nimc.gov.ng/enterprises
- Verification Partner — https://ninauth.nimc.gov.ng/verification-partner
- Government Users — https://ninauth.nimc.gov.ng/government-users
- Wallet — https://ninauth.nimc.gov.ng/wallet
- Wallet Service Providers (WASPs) — https://ninauth.nimc.gov.ng/wallet-service-providers
- Approved Partners — https://ninauth.nimc.gov.ng/approved-partners
- Standards Adopted — https://ninauth.nimc.gov.ng/standards-adopted
- Privacy and Security — https://ninauth.nimc.gov.ng/privacy-and-security
- Operational Status — https://ninauth.nimc.gov.ng/status
- Sitemap — https://ninauth.nimc.gov.ng/sitemap.xml
- App: Google Play https://play.google.com/store/apps/details?id=com.ninauth.mobile · Apple App Store https://apps.apple.com/gb/app/ninauth/id6744244380
- Get-started PDF (referenced): "Get Started with NINAuth Mobile App for Secure Authentication" (site /pdfs/ link)

**Official API documentation:**
- Postman: "NINAuth API Documentation [v1.0.1]" — https://documenter.getpostman.com/view/42869517/2sAYdmk815 (collection + documented request/response examples)
- NINAuth enterprise/developer dashboard — https://app.ninauth.nimc.gov.ng (JS bundle routes/strings analyzed)

**Third-party corroboration (context only, not contract):**
- NIMC press release: "NIMC Launches NIN Authentication Service (NINAuth)…" — https://nimc.gov.ng/press-releases/nimc-launches-nin-authentication-service-(ninauth)-for-secure-and-seamless-identity-authentication-&-verification-for-all-government-services
- Vanguard (May 6, 2025), The Nation (May 7, 2025), BusinessDay (Jun 24, 2025), idtechwire (May 15, 2025) — launch coverage
- Build Studio NG API listing — https://www.buildstudio.com.ng (claims docs at app.ninauth.nimc.gov.ng/developers)
- De-Unique Services guide — https://deuniqueservicesltd.co.uk/what-is-ninauth-complete-guide-to-nin-authentication
- ssologin.nimc.gov.ng ("NINAuth Web Integration") — search-result surface, content UNCONFIRMED

**Internal repo sources (TrustScore MOCK posture):** `src/lib/providers/ninauth.ts`, `src/lib/providers/scope-guard.ts`, `src/lib/services/ninauth-auth-service.ts`, `src/lib/services/passport-service.ts`, `src/app/api/v1/auth/ninauth/**`, `mini-services/provider-simulator`, `docs/STAGE0_AUDIT.md`.
