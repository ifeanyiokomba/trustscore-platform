# DOMAIN_MODEL — TrustScore

**Source of truth:** `prisma/schema.prisma` (39 models). This document explains the *semantics* the schema enforces.

---

## 1. The identity quartet (the central invariant)

```
UserAccount ──(1:1)── TrustIdentity ──(1:N)── IdentityIdentifier   [external anchors, PEPPERED]
      │                    │
      │                    └──(1:N)── IdentityAttribute             [consent-scoped values]
      │                    └──(1:N)── Evidence                      [provenance-bearing facts]
      │
      └──(N:M via TrustEdge, NetworkMembership — Trust Network)
```

- **UserAccount** — a platform account (email, handle, role, status). Can exist pre-verification.
- **TrustIdentity** — the *verified identity* domain object: assurance level, freshness horizon, link to the NINAuth verification evidence. This is what a Trust Passport presents.
- **IdentityIdentifier** — external anchors (NINAuth subject, phone) as **salted sha256 fingerprints + masked hints**. Enables matching without storage of raw values.
- **Phone** is *not* an account key — it's an evidence-backed attribute (PhoneVerification sessions → PHONE_VERIFIED evidence).

**NINAuth login binding:** `UserAccount.ninauthSubjectMasked` + fingerprint from a validated authentication assertion — a masked provider reference, never a NIN.

## 2. Evidence graph (directive §17)

Every `Evidence`: type (NINAUTH_IDENTITY_VERIFIED / PHONE_VERIFIED / LIVENESS_VERIFIED / CREDENTIAL_VERIFIED / FLAG_CONFIRMED / FLAG_DISMISSED / DISPUTE_RESOLVED …), source, provider, providerMode, subject, verificationSession, consent, confidence, observedAt, expiresAt, status, provenance JSON. Trust Identity assurance and the Trust Engine consume only evidence — never raw claims.

## 3. Consent (directive §16)

`Consent`: requester, purpose, requestedScopes[], grantedScopes[], policyVersion, provider, session, status, timestamps, withdrawnAt. Withdrawal is honored downstream (attributes hidden; checks UNAVAILABLE). The B2B check path additionally receipts the *named business* to the subject (`TrustReceipt`).

## 4. Trust computation

```
Evidence ─► Signal Engine ─► Risk Engine ─► Trust Policy (ScoringPolicy, versioned,
                                                     DPIA-gated, simulate-before-activate)
                      ─► TrustScoreSnapshot (inputsHash, policyVersion, explanation[])
                      ─► status: NEW|VERIFIED|ESTABLISHED|CAUTION|HIGH_RISK|REVIEW_REQUIRED
                      ─► band: LOW|MEDIUM|HIGH + freshness (computedAt→expiresAt)
```

Reproducibility: snapshot inputsHash + policy version ⇒ any historical score is recomputable; appeals freeze → review → optional recompute, all audited.

## 5. Reputation & due process

`Flag` (allegation) → mandatory `FlagEvidence` → reviewer queue (`FlagResolution`: CONFIRMED/DISMISSED with reasoning, audited) → subject `FlagAppeal` (freeze/recompute) → `REVIEW_REQUIRED` state during review. Gates: L2 reporters, quotas, one-open-flag-per-pair. An unverified allegation never behaves like a confirmed incident (weighting only on confirmed).

## 6. Sharing artifacts (directive §12 — never conflated)

- **TrustScore ShareToken** (ours): scoped, expiring, max-view-capped passport link + QR Trust Card; revocable; every view receipted.
- **NINAuth Share Code / dynamic QR** (theirs): official enterprise redemption artifacts (6-char codes; 2-minute JWT QRs). Future Safety Check *input modality* (G9) — never stored as our artifact.

## 7. B2B tenancy

`ApiClient` (org) → `ApiTeamMember` (RBAC) → `ApiKey` (hashed) → `TrustDecision` (per-check audit + purpose **[Batch 0 addition]**) → `ApiUsageDay/Event` (metering) → `WebhookDelivery` (signed, retried). Tenant isolation enforced in the service layer (caller scoping), never trusted from client input.

## 8. Planned extensions (modeled in roadmap)

- **Business identity (G8):** `Business` (RC reference as fingerprint), `AuthorizedRepresentative` binding to a verified TrustIdentity — model-only until the official business flow is confirmed.
- **Trust Network anti-collusion (G17):** reporter-reliability weights derived from confirmed/dismissed flag history; collusion graph analysis on TrustEdges.
