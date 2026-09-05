# TrustScore

> **The trust infrastructure for transactions, identity and reputation across Africa.** Nigeria-first.

Before you send money, extend credit, hire, rent, sell on credit, or enter a transaction — obtain a fast, **explainable** trust assessment. TrustScore sits *above* existing KYC/identity infrastructure as a trust-decision and reputation layer, normalizing authorized evidence from identity, banking, telecom and reputation systems.

> ⚠️ **This deployment uses MOCK sandbox providers only.** No live government or bank integration is claimed or implied. Every verification result is simulated to exercise provider-resilience paths.

## Product principles

1. **Trust over growth** — never generate fake verification data; never imply a mock is a live integration.
2. **Evidence before score** — a score is an aggregation of evidence, never an unexplained number.
3. **Explainability** — every score returns its signals, dimensions and policy version.
4. **Human appeal** — a person can contest a materially harmful decision (Flag → Resolution).
5. **Data minimization** — raw NIN/BVN are **hashed**; only masked references are stored centrally.
6. **Provider independence** — Primary → Secondary → Fallback → Manual Review.

## Stack

- **Next.js 16** (App Router) + **TypeScript 5**
- **Tailwind CSS v4** + **shadcn/ui** (New York) + **Lucide** icons + **Framer Motion**
- **Prisma ORM** + SQLite (evidence-graph domain model)
- **Recharts** (B2B analytics) + **next-themes** (dark mode) + **Zustand** (nav state) + **Sonner** (toasts)

## Trust Decision Engine

| Dimension | Range |
|---|---|
| Identity confidence | 0 – 200 |
| Account confidence | 0 – 200 |
| Phone confidence | 0 – 100 |
| Reputation / risk | −250 … +100 |
| Resolution / consistency | −100 … +100 |

Final score constrained `300 ≤ score ≤ 1000` (or `−1` = `UNKNOWN` when evidence is insufficient).

| Band | Range | Decision |
|---|---|---|
| CRITICAL | 300–449 | Decline |
| HIGH | 450–549 | Decline |
| ELEVATED | 550–649 | Review |
| MODERATE | 650–749 | Review |
| LOW | 750–849 | Approve |
| VERY_LOW | 850–1000 | Approve |
| UNKNOWN | — | Insufficient evidence |

> Ranges are **provisional**, not actuarially validated until validated against real data. `UNKNOWN is not bad — it is honest.`

## Domain model (evidence graph)

`Person ≠ Phone ≠ BankAccount`. Relationships are time-bound.

```
Person, Organization, Phone, BankAccount, IdentityReference (hashed), Device
        ↓
  Verification → Evidence (kind, confidence, provider, expiresAt)
        ↓
   TrustScore (signals, dimensions, policyVersion)
        ↓
   Flags → Resolutions → FraudSignals (risk-signal network)
```

## What's inside

| Section | What it does |
|---|---|
| **Overview** | Product vision, problem, principles, architecture, provider matrix, risk bands |
| **Consumer App** | Onboard → trust dashboard with gauge, dimensions, signals, QR trust link |
| **Safety Check** | Live phone / account / identity / face verification → trust assessment |
| **Trust Profile** | Public `@handle` profiles (privacy-first — reveals only normalized evidence) |
| **Flag Center** | Dispute lifecycle PRIVATE→UNDER_REVIEW→CONFIRMED/DISMISSED + human review |
| **FraudNet** | Shared risk-signal network (not a public blacklist); check & report |
| **B2B Dashboard** | API keys (mint/revoke), webhooks, audit log, charts, usage |
| **Compliance** | NDPA/NDPC living matrix, data inventory, provider matrix, unresolved legal questions |
| **API Explorer** | Try every endpoint live |

## Getting started

```bash
bun install
bun run db:push     # create SQLite schema
bun run prisma/seed.ts   # seed demo persons + flags + signals
bun run dev         # http://localhost:3000
bun run lint
```

Environment: `DATABASE_URL=file:./db/custom.db` (see `.env`, not committed).

## Mock providers (replaceable adapters)

| Provider | Capability | Real? |
|---|---|---|
| NIBSS | Account name enquiry (NIP) | adapter spec |
| NIMC | NIN identity verification | adapter spec |
| Dojah | KYC orchestration | adapter spec |
| Smile ID | Biometric + document verification | adapter spec |
| Youverify | KYC / background checks | adapter spec |
| **MOCK Sandbox** | Simulated verified/failed/error/timeout/partial/low_confidence | ✓ (this build) |

## Compliance posture

Internal living record, **not legal advice**. Treats compliance as an architectural requirement. Explicitly flags legal uncertainty (e.g. credit-bureau classification under CBN regulation, blacklist treatment of community fraud signals). See the in-app **Compliance** section.

## License

Proprietary — All rights reserved. © TrustScore.
