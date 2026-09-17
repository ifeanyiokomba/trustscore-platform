# DATABASE AUDIT — Batch 0

**Scope:** `prisma/schema.prisma` (39 models), retention rules, migration posture. Directive §13, §44.

---

## 1. Domain model integrity — PASS

The four-way separation is structurally enforced:

```
UserAccount (platform account: email, displayName, handle, role, status)
   ≠ TrustIdentity (verified identity domain object: assurance, freshness)
   ≠ IdentityIdentifier (external anchors as PEPPERED fingerprints + masked hints)
   ≠ phone/email attributes (evidence-backed IdentityAttributes)
```

NINAuth login binding lives on UserAccount as a masked provider reference + fingerprint — never a raw NIN.

## 2. Model groups (39)

- **Identity core:** UserAccount, TrustIdentity, IdentityIdentifier, IdentityAttribute, Evidence, VerificationSession, VerificationEvent, Consent, NinAuthLoginSession
- **Signals:** PhoneVerification, LivenessSession
- **Trust products:** ScoringPolicy, DpiaRecord, TrustScoreSnapshot (inputsHash + policyVersion + explanation), Credential, ShareToken, TrustReceipt, DsrRequest, SafetyCheck, TrustRequest, Session
- **Reputation:** Flag, FlagEvidence, FlagResolution, FlagAppeal
- **Network:** NetworkMembership, TrustEdge, SharedSignal, CountryProvider
- **B2B:** ApiClient, ApiKey, ApiTeamMember, TrustDecision, ApiUsageDay, ApiUsageEvent, WebhookDelivery
- **Ops:** AuditEvent, Notification, ProviderCredential, TransportSnapshot, CircuitEvent, PlatformSetting

Every evidence-bearing model carries provenance (type/source/provider/providerMode/subject/session/consent/confidence/observedAt/expiresAt/status) — directive §17 satisfied.

## 3. Reproducibility (directive §25) — PASS

TrustScoreSnapshot stores `inputsHash` + `policyVersion` + explanation — historical scores are recomputable; appeals freeze → review → recompute with audit.

## 4. Retention / minimization — PASS

Rolling caps: 50 score snapshots (cursor-paginated), 50 safety checks, receipt provenance masked. DSR erasure cascades defined at service level.

## 5. SQLite vs PostgreSQL (directive §44) — decision: DEFER, with evidence

Current profile: single-instance dev sandbox, zero concurrency pressure, no transaction-length issues, `db:push` workflow. Directive explicitly forbids migrating "merely because a document said so." **Production trigger conditions (documented, not speculative):** pilot traffic with concurrent writes > ~10/s, multi-instance deployment (needs networked DB), or row-count growth where SQLite's single-writer lock shows p99 write latency. Migration path when triggered: schema validation → PostgreSQL provider flip → automated migration tests (Stage 12 batch).

## 6. Findings

| ID | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| DB1 | P2 | Business/RC-number entities absent (directive §53) | Batch 2: add Business + representative binding (model-only, no provider claims) |
| DB2 | P3 | No migration history (push-based) — production needs `migrate diff` baselining | Batch 12 |
| DB3 | P3 | TrustDecision lacks purpose column (pairs with AP1) | **Fix in Batch 0** (schema + service) |
