# Termii Design Research — Inspiration Analysis for TrustScore

> **Task ID 0-2b** · Research date: 2026-09-17 (sandbox clock) · Status: COMPLETE
> **Purpose:** Termii (termii.com) is the designated design-inspiration source for TrustScore's marketing/product surfaces. This document extracts *principles* we may learn from — and explicitly fences off everything we must NOT copy.
> **Method:** Live fetches via page_reader of termii.com home, /pricing, /products/signals, /about, developers.termii.com (intro + messaging), plus a font/color audit of the homepage CSS. All quotes below are verbatim from those pages and cited.

**Primary sources fetched:**
- Home: https://termii.com/
- Pricing: https://termii.com/pricing
- Product page (Signals): https://termii.com/products/signals
- About: https://termii.com/about
- Developer docs: https://developers.termii.com/ and https://developers.termii.com/messaging

**What Termii is (context):** A Lagos-founded (2017, YC W20) "transaction reliability and intelligence layer for financial systems" — CPaaS repositioned around one guarantee: OTPs, fraud checks, payment alerts and transaction signals never fail silently. Products: **Signals** (routing/failover/fraud scoring control layer), **Engage** (campaigns), **Resolve** (omnichannel inbox), **Ayla** (AI intelligence layer, trained on 3B+ transaction signals). Claimed traction: 3B+ transactions processed, 190+ countries, 99.9% uptime SLA, <50ms signal scoring; customers include Paystack, Moniepoint, Chipper Cash, PiggyVest, Wema Bank, ByteDance. [termii.com/, termii.com/about]

---

## A. Product clarity — packaging capabilities around concrete outcomes

**What Termii does.** Every product is named after a *verb-outcome*, not a technology. The homepage's product cards each carry: a one-word name, a live mini-metric badge, a benefit headline, and one sentence of mechanism ([termii.com/](https://termii.com/)):

| Termii product | Mini-metric | Headline | Mechanism sentence |
|---|---|---|---|
| **Signals** | `<50ms · 0.98 · deliver` | "Every transaction signal, guaranteed" | "Score delivery confidence, route the best path and block fraud in real time, before any signal fires." |
| **Engage** | `3 channels` | "Every customer, engaged the right way" | "AI-powered campaigns, segments and journeys across SMS, WhatsApp and email, all timed by Ayla." |
| **Resolve** | `5 channels · "I didn't get my OTP" replied on WhatsApp · resolved ✓` | "Every request, resolved in one place" | "One shared inbox for WhatsApp, Email, Live chat, Instagram and Messenger." |
| **Ayla AI** | `3B+ trained` | "The intelligence layer behind every decision" | "Trained on 3B+ real transaction signals, Ayla scores, routes, monitors and resolves…" |

The pattern: **name → live proof chip → outcome headline → one-sentence mechanism**. A buyer understands the offer in ~5 seconds without knowing what an SMS gateway is.

**Translation to TrustScore's five verbs.** Our capability set should be packaged the same way — outcome-named, proof-chipped, one-mechanism-sentence each:

- **VERIFY** → *"Identity signals that verify the first time."* Proof chips: `NINAuth spine`, `phone + biometric`, `per-signal confidence`. Mechanism: "Government-verified identity (NINAuth), phone and liveness signals collected once — each scored for confidence and freshness." (Our existing identity-signals + assurance-ladder surfaces already embody this; the landing/cards should say it in one line.)
- **CHECK** → *"Know who you're dealing with, before it costs you."* Proof chips: `TRUST/SAFE/WARN verdicts`, `decision freshness`, `policy-visible`. Mechanism: "One safety check scores a counterparty's standing before a transaction, with the reasoning shown." (Termii's Fraud Guard card — "Block bad actors. Clear real customers." — is the direct analogue; see I for what not to copy.)
- **SHARE** → *"Proof that carries."* Proof chips: `scoped claims`, `expiry + receipts`, `revoke anytime`. Mechanism: "Share a time-boxed trust passport — only the claims you choose, with a receipt trail of who checked it."
- **PROTECT** → *"Your trust, monitored."* Proof chips: `safety settings`, `alerts`, `session control`. Mechanism: "Set the safety posture on your identity; get notified when something material changes."
- **RESOLVE** → *"Every dispute, resolved with due process."* Proof chips: `flags → appeal → decision`, `reviewer queue`, `audit trail`. Mechanism: "Flags, appeals and decisions in one place — never a silent score drop." (Termii Resolve's promise "Every request, resolved in one place" is the structural analogue.)

**Principle to adopt:** each product card must survive the "so what" test in one line — outcome first, mechanism second, technology never (the word "API" appears in Termii's marketing only inside the developer section).

---

## B. Signal-centric storytelling — "signal" as the unit of product

Termii's core repositioning move: it stopped selling "messages" and started selling **signals** — "a one-time password, a fraud check, a transaction confirmation… When those signals fail, people can't access their money, authenticate their identity, or trust that a payment went through." ([termii.com/about](https://termii.com/about)). Everything orbits the signal: it is *scored* (<50ms delivery confidence), *routed* (best channel), *confirmed* (delivery verified, not just sent), and *recovered* (agents close the loop) — the 6-step pipeline "Ingest → Score → Route → Send → Confirm → Recover" ([termii.com/](https://termii.com/)). Ayla is "trained on 3B+ real transaction signals." Even pricing is per-signal ("Fraud Guard $0.0015 / signal" — [termii.com/pricing](https://termii.com/pricing)).

**Why this matters for TrustScore.** We already made the same move — our atomic unit is the *identity/trust signal*. Termii's discipline shows how far to push it:

1. **One word, everywhere.** Termii uses "signal" in the hero, the metrics ticker ("<50ms signal scoring"), the product names' descriptions, the AI story, pricing, and even the dashboard ("Stay on top of your signals", "View signal logs — every message you've sent, with delivery status"). We should be equally relentless with **trust signal**: a verification is a signal; a credential is a signal; a flag is a signal; a share is a signal event. Our Signals card, Score Insights, and share receipts are all "signal log" surfaces.
2. **Signals have a lifecycle.** Termii's pipeline maps almost 1:1 to ours: *Ingest* (collect signal via NINAuth/phone/biometric) → *Score* (confidence + contribution to TrustScore) → *Route* (which claims enter the passport vs stay private) → *Share* (dispatch to a verifier) → *Confirm* (receipt recorded) → *Recover/Resolve* (dispute, appeal, correct).
3. **Signals are countable and training data.** Termii's credibility stat is denominated in signals (3B+). Our long-run equivalent is *verified trust signals / passports shared / checks answered* — network-effect metrics, not vanity "users".
4. **Signal honesty.** Termii's sharpest line: "'Sent' isn't 'delivered.' You find out about drop-off far too late." ([termii.com/products/signals](https://termii.com/products/signals)). Our equivalent honesty: **"Verified once" isn't "verified now"** — freshness matters, and a stale signal must be labeled stale. This is already our verification-freshness contract; the marketing should say it as bluntly as Termii says theirs.

---

## C. Operational confidence surfacing — delivery, speed, uptime, monitoring, fallback

Termii makes *operational reliability* a marketing asset, not a status-page footnote ([termii.com/](https://termii.com/)):

- **Constant metrics ticker** (repeated marquee): "3B+ transactions processed · 190+ countries reached · 99.9% uptime SLA · <50ms signal scoring · 4 channels, one API · 24/7 monitoring & DDoS protection."
- **Channel health dashboard as hero art** on the Signals page: live "Delivery rate" per channel (SMS 99.4% / WhatsApp 99.8% / Voice 97.1% / Email 99.6%) plus "Active route — Vendor A WhatsApp · fallback SMS · delivered."
- **Pre-execution confidence:** "Scores every signal in <50ms — delivery confidence, fraud risk, and channel health, all scored pre-execution."
- **Confirmed-delivery analytics:** "Confirmed-delivery reporting, not just dispatch receipts" — the honesty distinction again.
- **Monitoring without configuration:** "Monitors 24/7 with no configuration needed — no thresholds to tune, no dashboards to maintain."

**Translation to TrustScore (what to surface, and where):**

| Termii surface | TrustScore equivalent |
|---|---|
| Delivery rate per channel | **Provider availability & posture** (NINAuth / phone / liveness adapters — MOCK vs LIVE, healthy vs degraded) — we already have provider-posture surfaces; they belong in marketing screenshots too |
| `<50ms signal scoring` | **Decision latency + decision freshness** ("check answered in <Xms"; "score recomputed on every material signal") |
| 99.9% uptime SLA | Our honest posture: single-instance Stage-16 demo — do NOT claim an SLA we don't have; when LIVE, publish the real one |
| "Sent ≠ delivered" | **"Checked once ≠ current"**: verification freshness (age of each signal), confidence bands, and the honest UNKNOWN verdict when providers are degraded |
| 24/7 monitoring, DDoS | Continuous provider monitoring, alerting on material score moves (we already notify on material drops only — that's a differentiator worth surfacing) |
| Active route + fallback shown live | **Fallback chain visibility**: "NINAuth → adapter retry → degraded (decision: UNKNOWN)" shown in the engine/transport history |

**Principle to adopt:** reliability and honesty metrics are first-class marketing content — but only the ones we can truthfully claim. Termii's numbers are theirs (see I); ours must be measured, not mimicked.

---

## D. Developer experience — API, integration simplicity, docs, webhooks

What Termii shows on its marketing page for developers ([termii.com/](https://termii.com/), [developers.termii.com](https://developers.termii.com/)):

1. **"Your first signal in three lines of code. A REST API that respects your time."** — code tabs (cURL / Node.js / Python / PHP / send.sh) with a complete request+response pair (POST /api/sms/send with `channel: "dnd"` and the `200` response body shown inline).
2. **Webhooks as a headline feature:** "13 signed webhook event types, HMAC-SHA256 — `signal.scored → … → agent.task.escalated`" — the event lifecycle is shown as a named sequence.
3. **Intelligent defaults:** "Set `channel: "auto"` and Ayla picks the path." One parameter that encodes the whole routing brain.
4. **Docs quality** ([developers.termii.com](https://developers.termii.com/)): task-organized sidebar (Introduction, Authentication, Error, Signals, Messaging, Token, Engage, Insights, Events and Reports, Balance, Status, History); full-text "Search pages, endpoints, parameters, and examples"; **EN/FR localization**; a Postman collection; community SDKs ("Ship your products faster & in any language… SDKs provided by our community of open source developers"); **per-account regional base URLs** ("used to route your request to the appropriate 'regulatory region'"); every page stamped "Updated at".
5. **Dashboard DX:** the marketing page shows the real app — API key with copy button, base URL, quick-access task cards ("Send messages via API", "View signal logs", "API docs").

**Translation to TrustScore:**
- Our dev story should lead with **one endpoint + one decision**: `POST /api/v1/trust/check` (or the check surface) with a request/response pair shown inline, tabs (cURL/Node/Python), and our sandbox (MOCK posture) framed as Termii frames test credentials: zero-friction first call.
- **Signed webhooks with a named event lifecycle** — we have webhook infrastructure (`dev/webhook-sink`, events in the catalog); document them as Termii does: count them, name them, show the chain (e.g., `identity.verified → score.recomputed → check.requested → share.receipt` — our actual names, not theirs).
- **Honest defaults:** our `channel:"auto"` analogue is the provider fallback chain + policy engine — one integration, the engine routes.
- Docs: keep our plain-language ⇄ technical toggle (Stage 16) — it exceeds Termii's pattern; add an "Updated at" per page and full-text search as we grow.
- Do NOT copy their copy ("A REST API that respects your time") — see I.

---

## E. Fallback / reliability philosophy — routing, confirmation, recovery

Termii's reliability philosophy is its spine ([termii.com/products/signals](https://termii.com/products/signals)):

- **Problem framing:** "One vendor, one point of failure — when your only provider degrades, every message degrades with it." / "Failover is a fire drill — recovery happens by hand, after customers have already complained." / "No line of sight — 'Sent' isn't 'delivered.'"
- **Solution:** "Send once. Signals scores the live options per message and delivers on the path most likely to land, with **automatic failover the moment a route degrades**."
- **Pipeline:** "From API call to confirmed delivery. One infrastructure layer. Every channel." — Ingest → Score → Route → Send → **Confirm** → **Recover** ("Agents close the loop").
- **Comparison table** ("Traditional messaging vs Signals"): static single-vendor routing vs intelligent per-message routing; manual recovery vs automatic failover; "sent" receipts vs confirmed-delivery analytics; downtime vs maximum delivery.
- Pricing makes failover a *product*, not a feature: "Auto Failover $0.0005 / failover" ([termii.com/pricing](https://termii.com/pricing)).

**Translation to TrustScore — this maps directly onto our provider router and verdict semantics:**
1. **Provider fallback chain = Termii's channel routing.** NINAuth primary → adapter retries (Dojah/Smile/QoreID class) → circuit-breaker. Our transport-observability and provider-posture surfaces are our "channel health" panel.
2. **Retry = failover.** Our lazy retry + webhook-worker additive path survives restarts — the "automatic failover" story, told honestly at single-instance scale.
3. **Degraded state = honest UNKNOWN.** Termii refuses to report "sent" as "delivered"; we refuse to report a guess as a verdict. When providers are degraded we return UNKNOWN with provider posture attached — never silently optimistic. This is our "confirmed delivery" ethic.
4. **Recover = RESOLVE.** Termii's sixth step ("agents close the loop") is our reputation/dispute loop: flag → respond → appeal → reviewer decision → score recomputed. Termii's Resolve inbox is the customer-facing version; our reviewer queue is the governance version.
5. **Marketing the philosophy:** a "Traditional KYC vs TrustScore" comparison table (repeated per-vendor lookups vs verified-once reusable trust; opaque risk scores vs explained contributions; silent drops vs receipted material changes) is a legitimate *structural* homage — with our own rows, our own words, our own honest claims.

---

## F. Landing page structure — section-by-section (termii.com home)

Observed order and the job each section does:

| # | Section (verbatim-ish) | Job it does |
|---|---|---|
| 1 | **Hero**: "Every Transaction Guaranteed." + subhead ("Prevent transactions like logins, payments, checkouts, fraud alerts, and OTPs from failing, using AI across SMS, WhatsApp, voice and email.") + dual CTA ("Start building" / "Book a demo") + reassurance strip ("Free to start · 190+ countries · 99.9% uptime SLA") + **product-UI vignette** (delivery-success check for "Chase Bank", Ayla status line, transaction card with Verified/Secured/Sent/Confirmed chips) | Outcome guarantee + who it's for + zero-risk start + the product shown working, in the first viewport |
| 2 | **Logo strip**: "Trusted by leading fintechs, banks and institutions globally" | Borrowed authority, immediately |
| 3 | **Metrics marquee** (scrolling ticker): 3B+ · 190+ · 99.9% · <50ms · 4 channels · 24/7 | Scale + operational credibility as ambient motion |
| 4 | **Problem**: "Transaction triggered. OTP sent. But did it arrive?" + "Platforms send and forget. But the cost of these failures is real." + 4 failure cards (OTP never arrives / fraud alert fires too late / payment fails at 2am / no fallback path) | Name the pain concretely, with narratives (session times out, "they don't retry") |
| 5 | **Solution pivot**: "Multiple transactions. Failures avoided." + 4 product cards (Signals/Engage/Resolve/Ayla, each with live proof chip — section A) | Capabilities as outcomes, one glance |
| 6 | **Developer section**: "Your first signal in three lines of code." + code tabs + "13 signed webhook event types, HMAC-SHA256" + event chain | Builders' trust: integration is trivial and observable |
| 7 | **Integrations grid**: "Works with the stack you already run on… No rip-and-replace" | De-risk adoption |
| 8 | **How it works**: 6 numbered steps (Ingest → Score → Route → Send → Confirm → Recover) + "Signals fan out across four channels, with automatic failover when a route degrades" | Mental model of the machine, in order of execution |
| 9 | **Use-case grid**: "Every interaction, across your entire stack" — OTP & Authentication / Fraud Detection / Payment Signals / Transactional Alerts / Customer Engagement / Customer Resolution (with "94% closed without a human") | Breadth of outcomes per audience |
| 10 | **Ayla section**: "Meet Ayla. The intelligence layer behind every decision." + 4 capability cards + "Ayla is online · Monitoring 3B+ transactions annually" + ask-anything dashboard mock | Personify the intelligence; make the engine a character |
| 11 | **Compliance**: "Built for regulated industries. Certified, licensed and audited." + animated counters (3B+/190+/99.9%) | Enterprise gate: certifications as floor not ceiling |
| 12 | **Blog highlights**: 2 product-teaching posts | Content depth signal |
| 13 | **Customer stories**: "Trusted by Africa's best — the companies that run on Termii's signal layer" — 9 named stories each with a one-line outcome | Proof, denominated in outcomes |
| 14 | **Product guides**: "Everything you need to get started" — 4 guides, honestly labeled "Coming soon" | Promise of self-serve (with honesty about gaps) |
| 15 | **Dashboard preview**: app.termii.ai/overview mock — wallet, subscriptions, quick-access tasks, API key + base URL, testimonial | "This is what Tuesday looks like" |
| 16 | **Final CTA**: "Ready to start — Your customers trust you at the moment that matters most. Every OTP, payment signal, fraud check, and alert is a promise. Termii makes sure you keep it." + dual CTA + support email | Emotional close: trust as a promise kept |

**Structural lessons for our landing (principles, not layout):**
1. **Guarantee in the hero, product-UI as hero art** — our hero should show a trust check / passport working (verdict chips, freshness, confidence), not abstractions.
2. **Problem before product** — 3–4 concrete failure narratives of *repeated KYC / unverifiable strangers / silent risk* before we present the five verbs.
3. **Developers get their own early section** with real request/response pairs — our audience includes the builders who will call the Trust Decision API.
4. **A numbered pipeline** for "how a trust decision happens" (e.g., Request → Verify → Score → Decide → Share → Resolve — ours, not theirs).
5. **Comparison table** traditional vs ours (E.5).
6. **Honest "coming soon"** labels — we already do this in the roadmap; keep it.
7. **Emotional close on kept promises** — our version must be our own words (see I).

---

## G. Visual design language — observations (principles only)

From the fetched homepage CSS/HTML (page_reader, 2026-09-17):

- **Typography:** **DM Sans** (UI/body) paired with **DM Mono** (code, API keys, IDs, status chips, transaction amounts). Principle: *humanist sans for humans, monospace for machine truth* — data and identifiers are visually segregated from prose. Display headlines are set in the sans at heavy weights, tight leading, sentence case with a period ("Every Transaction Guaranteed.").
- **Color:** **Dark-first landing** — near-black charcoal surfaces (`#1a1b1d`, `#232426`, `#26272a` panels) alternating with near-white `#fafafa` sections; a **single green accent** (`#34a873`, with lighter `#00c48c`/`#2ecc97` variants) reserved for "signal OK / delivered / verified" semantics; slate grays (`#94a3b8`, `#e2e8f0`) for structure; rare yellow highlight (`#fff154`) and blue (`#2776b2`) accents; semantic red/green only in status contexts.
- **Density & layout:** marketing sections are card-grids (usually 4-up) with generous vertical rhythm; product surfaces are *dense dashboards* (wallet, subscriptions, tables, quick-access tiles) rendered inside browser-chrome mockups (macOS traffic-light dots `#ff5f57`/`#febc2e`/`#28c840` visible in CSS).
- **Motion patterns (from structure/scripts):** odometer-style **animated counters** for credibility numbers (individual digit elements for 3B+, 190+, 99.9%); a **scrolling marquee ticker** of stats; **live-feed simulations** (delivery events appearing sequentially); progress/transient states ("Processing transfer… → Transfer confirmed"); dashboard mocks with subtle entrance motion. Principle: *motion is used to animate data and proof, not decoration* — numbers roll, events land, states resolve.
- **Imagery:** no stock photography observed — the visual system is **product UI as illustration** (transaction cards, inboxes, channel-health panels, chat threads with Ayla).

**What this means for TrustScore (keep OUR system, steal the principles):**
- We already run **Fraunces + Geist** with an **emerald trust palette** and a Framer Motion design system — none of that changes. Termii validates the *pattern*: one accent color reserved for trust/OK semantics; alternating light/dark section rhythm; product-UI-as-hero-art; motion reserved for data (our score sparklines, receipt toasts, tab-intro rises already follow this).
- One specific idea worth adopting: **a monospace voice for machine truth** (IDs, verdicts, event names, policy keys) — we already use monospace in the technical spec sheet (Stage 16); consider extending it to verdict chips and share receipts as a deliberate semantic, using our existing stack (Geist Mono is part of the Geist family).
- Termii's dark-first charcoal is *theirs*; our emerald-on-light trust identity stays ours. Do not re-skin toward charcoal.

---

## H. Copywriting patterns

Verbatim examples with the pattern named (all from [termii.com/](https://termii.com/), [termii.com/products/signals](https://termii.com/products/signals), [termii.com/about](https://termii.com/about), [termii.com/pricing](https://termii.com/pricing)):

1. **The guarantee headline (noun + period):** "Every Transaction Guaranteed." / "Every message. Every channel. Delivered without fail." → our grammar can mirror the *rhythm* (short declaratives ending in periods) without reusing the sentence.
2. **Question-hook problem framing:** "Transaction triggered. OTP sent. But did it arrive?" → our analogue: "KYC done. Verified where? … Every vendor makes them start again." (draft our own).
3. **The honest distinction:** "'Sent' isn't 'delivered.'" → ours: "Verified once isn't verified now." / "A score you can't question isn't trust."
4. **Specificity as credibility:** "<50ms signal scoring", "13 signed webhook event types, HMAC-SHA256", "94% closed without a human", "0.98 · deliver", "Fraud Guard $0.0015 / signal" — numbers with units and limits, not adjectives.
5. **Promise framing (emotional close):** "Every OTP, payment signal, fraud check, and alert is a promise. Termii makes sure you keep it."
6. **Verb-led, outcome-named products and features:** Signals, Engage, Resolve; Auto Failover, Fraud Guard, Delivery Analytics. Feature names are verb-phrases describing what you get.
7. **Personified engine:** "Meet Ayla… she scores, routes, monitors, and resolves, so your engineers can take a break." The AI is a colleague, not a feature list.
8. **Failure narratives in second person:** "Customer attempts payment at 2am. Vendor OTP never arrives. Silent failures for hours before anyone notices." Concrete scenes, concrete consequences.
9. **Anti-posturing of incumbents:** "Platforms send and forget." / "Not batch-and-blast." They name the lazy status quo before presenting the alternative.
10. **Values as provable claims:** "Reliability is the product", "Intelligence over configuration", "Security without compromise — ISO 27001, and SOC 2 are the floor, not the ceiling."
11. **Story-as-timeline:** About page is a year-by-year timeline (2017 founded → 2019 OTP infra → 2020 YC W20 → 2023 $5M seed → 2025 Ayla, 1B+ transactions) — progress told as compounding.

**Rules for our writers:** outcome verbs; numbers with units; name the status quo's failure honestly; personify the *engine* (our policy/explainability, not an invented mascot); never claim a certification or SLA we don't hold; end on a kept promise.

---

## I. DO NOT COPY — the explicit fence

**We adopt principles (structure, honesty, rhythm, information architecture). We never adopt expression.** The following are Termii's proprietary or distinctive assets and are off-limits:

1. **Brand & names:** "Termii", the Termii logo/wordmark, "Ayla" (their AI persona), "Termii Elevate". We must not name any product, engine, or mascot anything confusable with these, and must not create an AI persona whose name/backstory mimics Ayla's.
2. **Colors:** their green `#34a873` (+ `#00c48c`/`#2ecc97` family) and their charcoal set `#1a1b1d`/`#232426`/`#26272a` as a system, the `#fff154` yellow highlight, `#2776b2` blue. Our emerald palette and light-first identity remain untouched; do not "re-skin toward Termii".
3. **Typography:** their **DM Sans + DM Mono** pairing. We stay **Fraunces + Geist** (mono via Geist Mono). Do not switch fonts to resemble them.
4. **Copy — verbatim or near-verbatim reuse is prohibited**, including but not limited to: "Transactions guaranteed" / "Every Transaction Guaranteed."; "A REST API that respects your time"; "Your first signal in three lines of code"; "Sent isn't delivered"; "Every OTP, payment signal, fraud check, and alert is a promise. Termii makes sure you keep it."; "Your customers trust you at the moment that matters most"; "so your engineers can take a break"; "Not batch-and-blast". (The *patterns* in H are learnable; the *sentences* are theirs.)
5. **Product naming scheme as brand:** the exact product trio **Signals / Engage / Resolve** and feature names **Auto Failover, Fraud Guard** as branded product names. Generic nouns ("signal", "fallback", "failover") remain normal English we already use (we have a Signals card and signal-service); the branded *suite* naming is theirs. Our suite is VERIFY / CHECK / SHARE / PROTECT / RESOLVE — distinct.
6. **Layouts & components:** their specific compositions — the odometer digit-roll counters, the scrolling metrics marquee, the 6-step "Ingest→Score→Route→Send→Confirm→Recover" diagram, the browser-chrome mock styling, the wallet/quick-access dashboard composition, the channel-health panel design, their comparison-table styling, the Ayla chat mock. We may have *a* pipeline diagram, *a* comparison table, *a* metrics strip — designed in our system, with our own steps, wording, and visual language.
7. **Illustrations & media:** all Termii product screenshots, dashboard mocks, video content, blog imagery, customer logos and testimonials (Paystack, Moniepoint, Chipper Cash, ByteDance, etc.) may never appear in our materials, even as "inspiration" placeholders.
8. **Proprietary claims & numbers:** 3B+ transactions, 190+ countries, 99.9% uptime SLA, <50ms scoring, 13 webhook event types, 94% autonomous closure — these are *their* measured facts. We may cite them only as attributed facts about Termii (e.g., in this doc); we must never imply them about TrustScore.
9. **Pricing structure mimicry:** their metered per-signal/per-failover pricing architecture as *expression* (e.g., "$0.0015/signal"-style line items copied 1:1). Our pricing model, when introduced, must be derived from our own cost base (and note our KYC-layer economics in COMPETITOR_RESEARCH.md).
10. **Their content:** blog articles, help-desk guides, the "Trust Center" structure verbatim, timeline narrative structure with our years inserted wholesale.

**Working rule for every future PR:** if a reviewer can paste our sentence/screenshot next to Termii's and call it a match — it doesn't ship. Principles over pixels.

---

## Appendix: Termii fact sheet (for citations)

- Founded 2017, Lagos, by Emmanuel Gbolade, Awe Ayomide, Idowu Atinuke; YC W20 (2020); $5M seed (2023) led by Fintech Collective + Ventures Platform (TechCrunch: $3.65M new, ~$5M total). [termii.com/about]
- Positioning: "the transaction reliability and intelligence layer for financial systems across emerging markets and beyond." [termii.com/about]
- Products: Signals (control layer: sender IDs, devices, routing, failover), Engage (campaigns/segments/journeys), Resolve (omnichannel inbox), Ayla (AI layer). [termii.com/, termii.com/products/signals]
- Pricing (published, USD): WhatsApp Business Account $50/mo per account; Connections (BYOP) $0.0001/transaction; **Fraud Guard $0.0015/signal; Auto Failover $0.0005/failover**; channel fees (SMS/WhatsApp/Email) billed per transaction on top, "rates vary by destination and channel… talk to sales for your current rate card"; custom bundles for banks/processors/telcos (volume pricing, private cloud, white-glove onboarding). Currencies: USD/NGN/FCFA. [termii.com/pricing]
- Developer surface: REST + JSON; regional base URLs per account; Postman collection; community SDKs; EN/FR docs; docs areas: Introduction, Authentication, Error, Signals, Messaging (API, Sender ID, WhatsApp Templates, WhatsApp Free Form, Email), Token, Engage (Phonebooks, Contacts, Campaign), Insights, Events and Reports, Balance, Status, History. [developers.termii.com]
- Reliability language: "automatic failover the moment a route degrades", "confirmed-delivery reporting, not just dispatch receipts", "99.9% uptime SLA", "24/7 monitoring & DDoS protection". [termii.com/, termii.com/products/signals]
- Design system (observed in CSS): DM Sans + DM Mono; charcoal dark theme `#1a1b1d/#232426/#26272a`, `#fafafa` light, green accent `#34a873`; odometer counters; marquee ticker; browser-chrome mocks. [termii.com/ CSS via page_reader, 2026-09-17]
