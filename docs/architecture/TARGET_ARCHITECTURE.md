# TARGET_ARCHITECTURE — TrustScore

**Status:** authoritative target · **Derived from:** Batch 0 audit + NINAuth contract research (2026-09-17) · **Supersedes:** ad-hoc stage notes

---

## 1. System shape (target)

```
┌────────────────────────── Consumers ──────────────────────────┐
│  Web (Next.js 16 — primary)      Mobile (Expo/RN — gated)     │
│  same /v1 API · cookie session   token session · no secrets   │
└───────────────┬──────────────────────────────┬────────────────┘
                │ HTTPS (relative paths)       │
┌───────────────▼──────────────────────────────▼────────────────┐
│  API layer — /v1/* (auth: session | API key)                   │
│  zod-strict · rate-limited · requestId-correlated · audited    │
├────────────────────────────────────────────────────────────────┤
│  Service layer — identity · consent · evidence · passport ·     │
│  safety · reputation · engine · trust-decision · network ·      │
│  devportal · audit · notifications · webhooks · insights        │
├────────────────────────────────────────────────────────────────┤
│  Provider layer (the ONLY layer that knows external truth)     │
│  ┌────────── IdentityProvider ──────────┐  ┌─ Others ──────┐   │
│  │ MOCK │ LOOPBACK │ NINAuthLIVE(gated)│  │ phone/liveness│   │
│  └──────────────────────────────────────┘  └───────────────┘   │
│  transport (HMAC·timeout·retry·breaker·metrics) · scope-guard  │
│  credential vault (AES-256-GCM, write-only)                    │
├────────────────────────────────────────────────────────────────┤
│  Data — Prisma (SQLite today → PostgreSQL on evidence triggers)│
│  Workers — webhook delivery · (future: queue consumers)        │
└────────────────────────────────────────────────────────────────┘
```

## 2. Non-negotiable invariants

1. **Identity rail:** NINAuth is the identity anchor. TrustScore stores masked provider subjects + peppered fingerprints — never raw NIN/BVN. The scope-guard tripwire is permanent (official `pii-fields` catalog includes `nin`).
2. **Data path:** `provider response → granted scopes → allowed attributes → normalization → minimal storage`. Wholesale persistence is a code-review blocker.
3. **Consent first-class:** every identity access records requester/purpose/scopes/policy-version/provider/session/withdrawal-state.
4. **Honest providers:** MOCK/LOOPBACK/LIVE with hard gates; degraded → honest UNKNOWN, never fabricated positives.
5. **Explainable trust:** every decision carries score, confidence, band, status, signals, policy version, freshness, timestamp; snapshots reproducible (inputsHash).
6. **Separation of concerns:** UserAccount ≠ TrustIdentity ≠ NIN ≠ Phone — structurally enforced.
7. **Secrets:** client secret, signing keys, pepper — backend-only, env/vault, never in URLs/logs/responses.

## 3. Deployment evolution (sandbox → pilot → production)

| Stage | Shape | Notes |
| --- | --- | --- |
| Sandbox (now) | Next dev + 2 mini-services + SQLite | single instance; in-memory rate limits OK |
| Pilot (Batch 15) | Standalone Next + SQLite (backup cron) + mini-services as processes | measure: verification completion, latency, consent rates |
| Production | Next (2+ replicas) · PostgreSQL · Redis (rate/cache) · queue+workers · CDN · observability | triggers documented in DATABASE_AUDIT §5; CD with rollback (Batch 12) |

## 4. NINAuth LIVE integration slot (when partner credentials arrive)

The adapter swap checklist = `docs/research/NINAUTH_CONTRACT_MATRIX.md` UNCONFIRMED rows:
1. Base URLs (sandbox→prod), client credentials via vault
2. Token-endpoint client-auth method; scope vocabulary → capability-mapping table
3. ID-token validation → partner JWKS (replace shared-secret HMAC; same validation chain)
4. Error table mapping → safe user-facing messages
5. Webhook event contract → inbound worker verification
6. **Production IP allow-listing** (official requirement) → egress strategy doc
7. requestReason catalog → our consent purposes (PR1)
8. Postman enterprise endpoints (sharecode/verify, QR sessions) → Safety Check modalities (G9)

## 5. Observability targets

Existing: per-provider transport metrics, circuit events, admin console, usage/day, webhook delivery logs, audit events. To add in batches: p50/p95/p99 per API route (Batch 12), verification funnel metrics (Batch 15 pilot), alerting rules (Batch 12).
