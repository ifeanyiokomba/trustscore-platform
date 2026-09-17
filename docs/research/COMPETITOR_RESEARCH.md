# Competitor Research — Nigeria/Africa Identity-Verification Landscape + Portable-Trust Players

> **Task ID 0-2b** · Research date: 2026-09-17 (sandbox clock) · Status: COMPLETE
> **Purpose:** Map the competitive field around TrustScore ("NINAuth proves the identity. TrustScore builds the portable trust layer around that identity."), classify each player as competitor / supplier / partner / fallback / future adapter, and state TrustScore's differentiation and defensible strategic position.
> **Method:** Live page_reader fetches of vendor sites + docs, plus web searches. Pricing is quoted only where published; third-party estimates are marked. Anything not confirmed by a fetched source is marked **UNCONFIRMED**. Internal cross-reference: `/home/z/my-project/docs/STAGE0_AUDIT.md` (Stage-0 pricing validation).

**Primary sources fetched (2026-09-17):**
- https://dojah.io/ · https://dojah.io/pricing · https://docs.dojah.io/
- https://smileidentity.com/ · https://docs.smileidentity.com/
- https://youverify.co/
- https://verifyme.ng/ · https://qoreid.com/
- Search-verified: prembly.com (YC page, TechCrunch), sardine.ai (search), prove.com (search), poyverify.com (search), veriff.com (search), thecable.ng (VerifyMe/QoreID), helloduty.com + capterra.com (Smile ID pricing estimates), g2.com/softwareadvice.com (Youverify pricing listings), biometricupdate.com (VerifyMe/NIMC).

---

## 1. Dojah — dojah.io

**What they do (core product).** Nigerian-founded (Lagos/SF) "anti-fraud infrastructure" and KYC/AML compliance platform. Two hubs: **Anti-Fraud Hub** ("rule-based and event-based approach to fraud prevention… AML Compliance, Transaction Monitoring, Reconciliation, Credit Check") and **Identity Hub** (KYC-KYB, document analysis, biometric verification, address verification). Products span Gov ID Verification (NIN/BVN/SIM ID/Passport), Document/Biometric/Address Verification, Financial Connection, IP & Device Check, Email/Phone Check, Liveness, AML Watchlist, plus no-code widgets ("Easy Lookup / Easy Connect / Easy Onboard / Easy Detect"). [dojah.io/, docs.dojah.io/]

**Pricing signals (published).** Transparent PAYG tiers on the pricing page: "Starting Out — as low as **$0.06 per API call**"; "Optimizing — as low as **$0.04 per API call**" (volume tier), with test credentials, developer support, customization, discounts, account management, white-labelling as tier add-ons. Channel/rate-card specifics per ID type are sales-mediated. [dojah.io/pricing]

**Strengths.**
- Very broad catalog: 120+ ID checks & data sources; "<3s average verification; 5 official SDK clients" (docs homepage claims). [docs.dojah.io]
- Excellent progressive-adoption DX: four integration paths — Dashboard (no code), EasyOnboard (visual flow builder + shareable link), hosted Widget (drop-in), full API/SDKs — "Every path runs the same verification engine underneath." [docs.dojah.io]
- Docs are strong and modern (Mintlify-style): task-based landing ("What do you want to do?"), full API reference with live examples, `llms.txt` index for LLM consumption, sandbox (`sandbox.dojah.io`), webhooks (`event: kyc.completed`), official clients (PHP, Python, Go, Java, TypeScript; `npm i react-dojah`, `pip install dojah`), industry "verification stacks" recipes (Fintech / Lending / Crypto / Betting, each a 4-step chain: ID lookup → liveness → AML → monitoring). [docs.dojah.io]
- Vertical recipes = packaged risk thinking, Nigeria-first data depth, active developer community (Slack), case studies (CDCare, Vesicash, ZendWallet, Baobab, Cleva). [dojah.io/]

**Weaknesses.**
- Positioning is tooling/coverage breadth ("one-size-fits-all… customizable") rather than a reusable trust outcome — verifications are per-call, per-business; nothing portable accrues to the end user. [dojah.io/]
- No consumer-facing trust surface (individuals can't carry a Dojah verification anywhere).
- Brand/design language is functional-enterprise; heavy SEO pages (compare-pages) rather than outcome storytelling.

**Relationship to TrustScore: SUPPLIER / FUTURE ADAPTER (primary candidate).** Dojah commoditizes exactly the layer we do NOT need to own: NIN/BVN/CAC lookups at $0.04–0.06/call. They fit our provider-router model as a verification adapter behind the NINAuth spine, and as fallback when NINAuth is degraded. They are also a *nominal competitor* for any business that mistakes "KYC API" for trust infrastructure.

**TrustScore differentiation.** Dojah answers *"is this ID real?"* per call, per customer, inside one business. TrustScore answers *"what has this person's government-verified identity earned them — everywhere?"*: consent-driven, portable, reusable trust (passport, safety check, reputation with due process) built on the NINAuth spine. We would happily route a lookup through Dojah; they cannot offer the individual a trust passport.

**API/DX notes.** Best-in-class among the Nigerian players reviewed (task-based docs, llms.txt, sandbox, SDKs, webhooks, widgets, no-code flows). Any TrustScore adapter for Dojah inherits a clean REST contract. [docs.dojah.io]

---

## 2. Smile ID — smileidentity.com

**What they do (core product).** Pan-African (built SF, proven in African markets) **AI-native identity verification**: Onboarding (government-database checks, documents + biometrics), **Authentication** (re-verification at high-stakes moments — login, new device, transaction approval), **AML Screening** (1,000+ global/local sanctions, PEP, adverse-media, continuous monitoring). Claims: 500M+ identity checks completed; "4 of 5 top Nigerian banks and 3 of 4 South African BNPL leaders trust Smile ID"; Mastercard partnership; in-house-trained biometric/deepfake models; false-rejection rate 1–1.5%; SDKs built for low-light/low-bandwidth/device-range conditions. [smileidentity.com/]

**Pricing signals (NOT published on-site — no public rate card; sales-led).** Third-party estimates (mark as estimates): document verification ≈ **USD 0.10–0.30/check**, full biometric KYC ≈ **USD 0.30–1.00**, AML screening from ≈ **USD 0.05** [helloduty.com, via search]; Capterra lists a "starting price $1.20 per [verification]" [capterra.com, via search]. Our Stage-0 audit reached the same ranges. **UNCONFIRMED as current list pricing — sales quotes required.**

**Strengths.**
- Deepest biometric/liveness stack on the continent; anti-deepfake posture is current and marketable.
- Async-first API model that is genuinely well-designed: submit → `202 Accepted` with `job_id`/`user_id` → result via webhook callback; every result carries `status` + human-readable `message` + machine-readable `reason`. [docs.smileidentity.com]
- Docs (GitBook, V3) are excellent: llms.txt index, markdown export, AI doc assistant, clear product-category map (onboarding with/without biometrics, business onboarding, authentication, fraud checks). [docs.smileidentity.com]
- Network-intelligence moat: 500M+ checks feed their fraud models. [smileidentity.com/]

**Weaknesses.**
- B2B per-check economics again: verifications accrue to the business, not the person. No portable identity/trust product for end users.
- Pricing opacity (sales-led) signals enterprise focus; startups self-serve less.
- Their "trust" language is about verification accuracy, not a reusable trust asset. [smileidentity.com/]

**Relationship to TrustScore: SUPPLIER (liveness/biometric adapter) + PARTNER candidate.** Our `liveness-provider.ts` contract (jobId, capture window, verdict `{passed, livenessScore, faceMatchScore…}`) was designed Smile-ID-class; a LIVE adapter integrating Smile ID (or equivalent) is the natural Stage-next step for biometric signal depth. Their Authentication product (re-verify at high-stakes moments) is conceptually adjacent to our PROTECT/SHARE — watch for collision, but their unit remains the check, not the person's portable trust.

**TrustScore differentiation.** Smile ID proves *this face is this person, now*. TrustScore turns repeated proofs (and reputation, safety, resolution history) into a **portable, consent-scoped trust passport** with freshness, receipts, and due process. They are the strongest "prove the human" supplier; they do not build the person's cross-platform trust equity.

**API/DX notes.** Async job model + explicit reason codes + webhooks is the pattern our engine already mirrors (MOCK providers, decision freshness). Their docs' "every result reports status, message, reason — use them together" is the same honesty ethic as our verdicts. [docs.smileidentity.com]

---

## 3. Youverify — youverify.co

**What they do (core product).** Nigerian-origin compliance platform that has **pivoted upmarket and West**: the current site is "AML & Fraud Compliance for US Banks" — a FRAML (fraud + AML) suite called **Cowork** with five acts: Customer Onboarding (KYC, anti-deepfake liveness, 145 jurisdictions), Fraud Insights (device/browser fingerprint, IP/Tor/emulator/remote-tool detection, "140+ signals per session, <300ms to score"), Transaction Monitoring, Case Management, Regulatory Reporting (SARs/CTRs drafted from case files), plus **Vyra**, an AI compliance copilot/agent-builder ("Describe the control. Vyra builds the agent… Nothing files without a human approval"). Claims: 1,400+ businesses and tier-1 banks; SOC 2 Type II, ISO 27001/27018/42001, GDPR/NDPR/POPIA/CCPA; West/East/Southern Africa + Europe/Americas/Middle East/Asia data-residency regions "from Q4 2026". [youverify.co/]

**Pricing signals.** Not published on the fetched site (demo-led). Third-party listings: G2 — "2 pricing editions, starting at $60 / 200 customers per month (KYB: $60 / 200 businesses/month)"; SoftwareAdvice — "starting at $60.00 per month, free trial". [g2.com, softwareadvice.com via search] **UNCONFIRMED as current offer — these listings may lag their US repositioning.** Stage-0 audit had classified them "enterprise-only, not public."

**Strengths.**
- Story-driven marketing ("Every customer is a story… scroll to follow both") — the most Termii-like narrative discipline among KYC vendors reviewed; landing demonstrates the product via a two-entity journey (Marcus/Hudson Freight) instead of feature lists. [youverify.co/]
- Certification bench is the deepest in Africa's IDV cohort (SOC 2 Type II + three ISOs, incl. 42001 AI governance).
- Full FRAML workflow suite + AI copilot with human-in-the-loop guardrails ("The agent never gets the last word").

**Weaknesses.**
- Strategic attention has moved to US banks/FRAML — the Nigerian/African per-verification mass market is no longer their center of gravity (they still serve it, but the homepage sells FinCEN, not NIMC). [youverify.co/]
- Enterprise pricing motion; no individual/portable trust product.
- The suite is heavy: onboarding + monitoring + cases + filings is a compliance department, not a trust layer a marketplace can call in one request.

**Relationship to TrustScore: COMPETITOR (adjacent) — declining overlap.** In Africa they remain a KYC/AML rival for wallet/bank budgets; strategically they are exiting our lane toward US FRAML. Potential FUTURE ADAPTER for business-verification (KYB) signals if their African API remains open.

**TrustScore differentiation.** Youverify sells compliance operations to institutions. TrustScore sells *portable trust outcomes* to platforms and individuals: verify once with NINAuth, then CHECK/SHARE/PROTECT/RESOLVE across counterparties. Their Vyra guardrail copy ("never gets the last word… every step logged and reversible") is philosophically aligned with our REVIEW_REQUIRED/appeals design — our shared instinct confirms the market wants governed, explainable decisions.

**API/DX notes.** Site-level only (fetch of youverify.co/pricing failed — nginx error from reader; UNCONFIRMED pricing page state). Developers link exists in nav; docs not fetched this round. Their marketing shows deep product-UI demos, implying good tooling, but DX cannot be graded without the docs. [youverify.co/]

---

## 4. VerifyMe Nigeria — verifyme.ng (incl. QoreID, Pluto, Gova)

**What they do (core product).** Pioneer Nigerian identity-verification company ("Tackling Africa's Credibility Gap"), NIMC-aligned ("real-time ID verifications backed by NIMC" [biometricupdate.com, via search]). Now a house of three products: **QoreID** (B2B identity/analytics API platform — see §5), **Pluto** (all-in-one background checks for hiring: remote candidate verification, ID + facial recognition double-layer, risk-scored reports, crime reporting), **Gova** (agent network — "Africa's largest network of verification agents… physical/last-mile verification"). Claims: 500M identities verified, 400K addresses verified, 10K customers onboarded; customers incl. Moniepoint (KYE), ALT Finance. [verifyme.ng/, thecable.ng]

**Pricing signals.** None published on the fetched pages ("Sign up, it's free" / "Request a Demo" motions). **UNCONFIRMED** — sales-led.

**Strengths.**
- Last-mile/physical verification moat (agent network) that pure-API players lack — addresses and asset inspections "within 24 hours". [qoreid.com]
- Employment/background-check niche (Pluto/KYE) with real enterprise adoption (Moniepoint testimonial). [verifyme.ng/]
- Long NIMC-adjacent operating history in Nigeria.

**Weaknesses.**
- Fragmented brand architecture (VerifyMe vs QoreID vs Pluto vs Gova) dilutes the story; the verifyme.ng site is thin compared to Dojah/Smile.
- Same per-check economics: verifications accrue to businesses, not individuals.
- No portable-trust/consent product for end users.

**Relationship to TrustScore: COMPETITOR (legacy) + FUTURE ADAPTER (physical/last-mile signals).** Their agent network is the only asset we could not mock or API our way to — a future Gova adapter could feed *address-verified* trust signals into the passport.

**TrustScore differentiation.** VerifyMe verifies facts about a person for a business. TrustScore accumulates those facts (with the person's consent) into a portable trust identity with freshness, receipts, and dispute rights. Different unit of value: their report vs our passport.

**API/DX notes.** QoreID marketing: "One endpoint. Multiple verifications… SDKs and APIs… Low code workflows… VeriLinks (verify with just a link, no integration required)" [qoreid.com]. Docs not fetched; developer surface appears mid-tier vs Dojah/Smile. UNCONFIRMED doc quality.

---

## 5. QoreID — qoreid.com (VerifyMe's B2B arm; distinct from Qore, the BaaS company)

**What they do (core product).** "Trusted onboarding and customer analytics": identity verification + **credit scores & consumer analytics** + fraud prevention engine + last-mile workflows, positioned for CBN Tier II/III compliant onboarding ("Integrate in half the time and reduce your overall cost for conducting KYC Tier II/III CBN compliant customer onboarding"). Industries: banking, lending, ecommerce, insurance, telcos. Claims 500+ businesses on its "trust infrastructure". Products listed: AI-Powered Authentication, Instant Identity Verification, Business Verification, Last Mile Verification, Remote Asset Verification, Fraud Prevention Engine, Consumer Insights, Verifind. [qoreid.com/]

**Pricing signals.** None published. **UNCONFIRMED** — demo-led ("Book a Demo", "Create Account").

**Strengths.**
- The only African player reviewed that explicitly couples identity with **credit/consumer analytics** — closest to "trust as data" thinking.
- Workflow/no-code orientation (VeriLinks shareable verification links; visual workflow builder) lowers integration friction for non-developers. [qoreid.com/]

**Weaknesses.**
- Credit-bureau framing: trust ≈ creditworthiness for lenders; no person-centric consent passport, no reputation dispute loop for individuals.
- Marketing site is feature-dense but outcome-thin (lists capabilities, tells few stories).

**Relationship to TrustScore: COMPETITOR (conceptual nearest in Africa) + FUTURE ADAPTER (credit/consumer-insight signal feed).** They use the phrase "trust infrastructure" for onboarding rails — but it is lender-facing. A future QoreID adapter could add an income/credit trust signal to the passport with user consent.

**TrustScore differentiation.** QoreID monetizes what businesses can learn about a person. TrustScore monetizes what a person's verified identity can *carry with them* — consent-scoped, portable, with network effects across verifiers. Their credit scores describe risk to lenders; our trust passport represents standing to everyone (landlord, marketplace, employer, dater).

**API/DX notes.** See VerifyMe §4 — shared platform. UNCONFIRMED beyond marketing claims.

**Note on "Qore" (qore.co):** distinct company — Africa's Banking-as-a-Service/core-banking infrastructure provider [himalayas.app via search]. Adjacent financial infrastructure, not identity verification; not a direct TrustScore competitor. Potential future partner if trust checks embed into embedded-finance flows. **UNCONFIRMED details.**

---

## 6. Prembly (formerly Identitypass) — prembly.com *(additional African player found)*

**What they do.** Nigerian YC-backed (founded 2021 by Niyi Adegboye and Lanre Ogungbe) identity-verification API suite for emerging markets: "Identity Verification, KYC, AML & Fraud Prevention Solutions… comprehensive suite of verification, fraud prevention, and monitoring tools" (IdentityPass, and sibling products); $2.8M seed (2022). ~80 employees. [prembly.com, ycombinator.com/companies/prembly, techcrunch.com — all via search]

**Pricing signals.** None fetched this round. **UNCONFIRMED.** Stage-0 audit grouped them with the $0.04–0.30/call cohort.

**Relationship to TrustScore: COMPETITOR (KYC API) + FUTURE ADAPTER.** Same commoditized-lookup lane as Dojah, with less market share.

**Differentiation.** Identical to the Dojah/Smile argument: they sell checks; we sell accumulated, portable trust on government-verified identity. **UNCONFIRMED current product breadth** (site not fetched).

---

## 7. Portable-trust / reputation-passport players (global scan)

These are the conceptually closest companies to TrustScore's "portable trust layer" thesis — none is Africa/NINAuth-native:

- **Prove (prove.com) — "Trust Score®":** "a real-time measure of phone number reputation that uses behavioral and phone intelligence signals to measure fraud risk" (marketplace.fico.com listing; prove.com via search). Phone-centric (US), proprietary signal network; the registered "Trust Score®" mark is theirs — **our product naming must avoid that exact phrase** (we say TrustScore as a brand; legal review flagged in Stage 0; keep distinct styling and never "Trust Score®"). Relationship: **conceptual competitor, different geography and anchor (phone vs NIN).**
- **Trust Stamp (truststamp.io):** biometric identity + "FICO-like Trust Score" for marketplace users (e.g., historic Facebook Marketplace integration; prnewswire via search). Relationship: **conceptual predecessor** — proves demand for portable person-level trust scores; never scaled to Africa. **UNCONFIRMED current product state.**
- **Sardine (sardine.ai):** "identity, payments, compliance, and AI… detect fraud earlier"; $70M Series C (Feb 2025), behavioral intelligence focus (search: sardine.ai, fincrimecentral.com). Sells risk infrastructure to fintechs/crypto — **not portable, not person-owned.** Relationship: **competitor in risk-scoring infrastructure; possible pattern-partner for marketplace risk.**
- **POY Verify (poyverify.com):** "Reputation Passport — a portable trust identity that carries your verified reputation across every platform on the internet"; publishes a "6-Signal Trust Ceiling System" for platform-side granular risk control (search snippets; site fetch failed). **The closest wording to our thesis found.** UNCONFIRMED scale/traction — appears early-stage. Relationship: **direct conceptual competitor to watch; validate their market and differentiate on NINAuth-native, government-verified anchoring + consent/receipt/due-process depth.**
- **Marketplace IDV incumbents (Socure, Trulioo, Veriff):** verify users *per marketplace*; e.g., Veriff publishes "$0.80 per verification, $49/mo min" self-serve (veriff.com via search) — a useful global price ceiling for commoditized verification. None offer person-owned portability. Relationship: **suppliers/benchmarks, not portable-trust competitors.**
- **Didit (didit.me):** KYC provider publishing thought leadership on marketplace reputation systems (search) — signals that IDV vendors see "reputation" as the next layer they can't easily own. **UNCONFIRMED product direction.**

---

## Strategic position — why the KYC layer is commoditized and where TrustScore's defensible value is

**The commoditization math (validated this round).** African KYC lookups are published or estimated at **~$0.04–0.06/call (Dojah, published)**, **~$0.10–0.30 document / ~$0.30–1.00 biometric / ~$0.05 AML (Smile ID, third-party estimates)**, with global self-serve at **$0.80 (Veriff, published)** and Youverify/QoreID/Prembly sales-led in the same band. Five-plus vendors sell the same NIN/BVN/CAC rails with near-identical DX (task docs, sandboxes, webhooks, SDKs — Dojah and Smile ID docs reviewed are genuinely good). Price converges toward telco/registry cost + thin margin; differentiation collapses into coverage tables and SEO compare-pages. **Nobody wins a durable moat selling lookups.**

**Where TrustScore's defensible value sits (and why incumbents can't follow quickly):**

1. **Consent-driven portable trust (the passport).** Incumbents' business model requires *re-charging per check per business*. A person-owned, consent-scoped, revocable trust passport inverts the economics: verify once (NINAuth spine), reuse everywhere — value accrues through *network effects between verifiers*, not lookup volume. An incumbent adopting this cannibalizes its per-call revenue; that's why Dojah/Smile/QoreID structurally won't lead here.
2. **Reputation with due process.** A trust score without appeal rights is a black box (and, in the EU AI Act era, a liability — High-Risk Automated Decision-Making considerations our REVIEW_REQUIRED/appeals flow already respects). Flags → response → appeal → reviewer decision → recomputed score, receipted, is a *governance* moat, not a feature.
3. **Safety check as a network primitive.** CHECK answers "should I trust this counterparty in *this* transaction, *now*?" — freshness-aware, policy-visible, honest UNKNOWN when providers degrade (the Termii "sent ≠ delivered" ethic applied to trust). Each answered check enriches the network (with consent) — the data moat incumbents' per-call model can't accumulate.
4. **NINAuth-native anchoring.** Government-verified identity as the spine (per our Stage-0 NINAuth research) makes the passport *hard to forge by design* and gives us the only trust layer whose root of trust is the state's — suppliers like Dojah/Smile become adapters behind it, i.e., **our COGS, not our competitors' moat**.
5. **The flywheel.** More individuals verify → richer consent-scoped signals → better checks → more verifiers join → more reason for individuals to maintain standing → more individuals verify. Every incumbent's model is linear (calls sold); ours is compounding (network). The nearest conceptual rivals (Prove's phone-anchored Trust Score®, POY's Reputation Passport) are neither government-anchored nor Africa-native.

**Procurement implication for our roadmap:** treat Dojah/Smile/QoreID as **adapters + fallback chain** behind the NINAuth spine (provider router already models this), keep per-lookup spend as a commodity input, and invest everything user-visible in the layers no one sells: portable consent, freshness-honest decisions, receipts, dispute due process, and the verifier network.

**Watchlist:** (a) POY Verify's traction (nearest thesis match); (b) Smile ID Authentication creeping toward portability; (c) Youverify's US pivot draining African KYC competition (supplier leverage shifts to Dojah/QoreID); (d) NIMC/NINAuth policy changes (upstream risk to the spine); (e) Prove's "Trust Score®" trademark hygiene in our copy.

---

## Comparison table (summary)

| Player | Core unit | Published/estimated price | Africa/NIN depth | Person-portable? | Relationship to TrustScore |
|---|---|---|---|---|---|
| Dojah | KYC/AML API call | **$0.04–0.06/call (published)** | Deep (NIN/BVN/CAC) | No | Supplier / future adapter; nominal competitor |
| Smile ID | Biometric KYC check | ~$0.10–0.30 doc / $0.30–1.00 biometric (3rd-party est.) | Deep, pan-African | No | Supplier (liveness adapter) + partner candidate |
| Youverify | FRAML suite seat/workflow | $60/mo listings (3rd-party; lagging?) | Was deep; now US-focused | No | Adjacent competitor, declining overlap; future KYB adapter |
| VerifyMe / QoreID | Verification report / onboarding workflow | Not published | Deep + last-mile agents + credit analytics | No | Competitor (legacy) + future adapter (agents, credit signals) |
| Prembly | KYC API call | UNCONFIRMED | Nigeria | No | Competitor (KYC API) + future adapter |
| Qore (qore.co) | Core-banking/BaaS | UNCONFIRMED | Africa | No | Adjacent infrastructure; future partner |
| Prove "Trust Score®" | Phone-reputation score | Enterprise (UNCONFIRMED) | None (US) | Partially (phone-anchored) | Conceptual competitor; trademark watch |
| Trust Stamp | Biometric trust score | UNCONFIRMED | None | Partially | Conceptual predecessor |
| Sardine | Risk/fraud infrastructure | Enterprise (UNCONFIRMED) | None | No | Risk-infra competitor/pattern partner |
| POY Verify | "Reputation Passport" | UNCONFIRMED | None | Yes (thesis match) | Closest conceptual competitor — watch |
| Veriff (benchmark) | Verification | **$0.80/verification (published)** | None | No | Global price benchmark |

*Sources for the table rows are the per-section citations above. Third-party pricing marked est.; unpublished marked UNCONFIRMED.*
