# Customer Language — US Residential Property Management, Pre-Renewal Retention

Created: 2026-08-22

Vocabulary reference for writing to property managers about resident retention and lease renewals. Fourth in the series, after `docs/build-1-content-strategy/customer-language.md` (vendor insurance paperwork), `build-2` (maintenance triage) and `build-3` (make-ready sequencing). Same buyer, fourth working vocabulary.

**Do not assume the earlier three transfer.** Builds 1 to 3 are all about **operational objects** — a certificate, a work order, a unit in turn. Every one of them has a defined completion state and a vendor on the other end. This build is about a **person deciding whether to stay**, and the other end of every message is a resident. That changes the tone, the legal exposure, and what an overclaim costs. Build 3 could say "the painter finished and nobody told you" and be safely concrete. Nothing here is that concrete, because a renewal decision has no timestamp.

The single most important inherited rule: **build 3 affects days vacant, not days on market.** This build sits one step earlier than both. It affects whether the unit becomes vacant at all, and only through a human doing something about what a resident said.

## Source quality — read this first

Better than the previous three, with a new problem.

**Primary practitioner voice is still unreached.** Reddit is blocked, BiggerPockets and the multifamily Facebook groups need a login. Nothing below is a property manager talking to another property manager unprompted.

**The new problem is that this category has heavy vendor content marketing.** Retention is a crowded software market, so most of what ranks is written by a company selling retention software. Numbers repeat across sites without attribution and trace back to the same two or three surveys. Treat any statistic without a named survey behind it as unusable.

Available, in descending order of trustworthiness:

1. **Named industry surveys with disclosed method** — NAA on turnover cost, the NAA/AppFolio 2025 study of 1,984 professionals, Zego's 2026 resident experience report, Buildium's 2026 industry report. These are the load-bearing numbers.
2. **Legal and compliance analysis** — HUD's 2024 guidance on algorithmic tools, and the fair-housing commentary on AI in resident communication. The most decision-useful material in this file.
3. **Vendor product pages** — EliseAI's renewals page, Colleen AI's launch announcement. Facts about how competitors behave, stated by them. Strong competitive evidence, worthless as market evidence.
4. **Category marketing and listicles** — retention guides from software vendors. Pain phrasing sometimes mirrors real complaints; every claim is a claim.

**What is missing:** the resident's voice, and the manager's shorthand for the resident who leaves quietly. Treat everything tonally unverified.

---

## Terminology

| Term | Usage |
|---|---|
| **doors** | Unit of company scale. "A 300-door portfolio." Never "units" for company size |
| **resident** | The person in the home. **Use this, not tenant.** The industry moved years ago; "tenant" reads as dated or adversarial, and appears mainly in legal contexts |
| **renewal** | The resident signing on for another term |
| **non-renewal** | The resident leaving at lease end. The event that costs money |
| **notice** | The resident telling you they are leaving. "They gave notice" |
| **renewal offer** | The formal document with the new rate. **This build never sends one and never discusses one** |
| **retention rate** / **renewal rate** | Share of expiring leases that renew. Used interchangeably in practice; retention is slightly broader |
| **lease expiration** / **lease end date** | The date. The only input that decides who gets contacted |
| **expirations** | The cohort. "We've got forty expirations in Q1" |
| **lease expiration management** | Spreading expirations across the calendar so they do not cluster. Adjacent discipline, not this |
| **turn** / **turnover** | What happens after a non-renewal. Build 3's whole subject; here it is the cost, not the process |
| **turnover cost** | The all-in cost of one non-renewal. Roughly $3,872-4,000 in apartments |
| **days vacant** | Build 3's metric. Downstream of this one |
| **resident experience** | The category name vendors use. Fine to reference, weak to claim |
| **NPS / ORA / satisfaction score** | Survey outputs. ORA is J Turner's index. Measurement, not intervention |
| **exit survey** / **move-out survey** | Asking why they left, after they have left. **The thing this build argues is too late** |
| **reasonable accommodation** | A change to a rule or policy for a resident with a disability. A regulated category with real exposure |
| **assistance animal / ESA** | The most common accommodation request and the most commonly mishandled |
| **habitability** | Conditions affecting whether the home is fit to live in. Legally weighted, not just a repair |

**The distinction that carries the honesty:** this affects **whether an issue is known before the renewal decision**. It does not affect the renewal rate on its own, and it does not price the renewal. Copy that slides from "found the problem" to "saved the renewal" is overclaiming, and an operator who has run retention programs will catch it.

**Who actually does this work.** A property manager or ops lead sends renewal outreach; the owner signs the contract and cares about the P&L. In a 150-600 door shop these are often two people, occasionally one.

---

## The timing, and why it is the subject

| Window | What the industry does | What this build does |
|---|---|---|
| 120 days | Nothing, usually | Watchlist only. No contact |
| **90 days** | Recommended point to **start the renewal process** and send the offer | Sends **a question, not an offer**. Rent and renewal wording are blocked |
| 60 days | Follow up if no response to the offer | Nudge, but only to residents who never replied |
| 30 days | Final notice; month-to-month conversions | Internal handoff to leasing. **No resident email at all** |

**The two facts that must both be said.**

**Ninety days is already the recommended practice.** Industry guidance explicitly says to trigger renewals at ninety days rather than sixty, so there is a window to gauge intent and address dissatisfaction while something can still be done. This build did not discover that window. It follows it.

**What is different is what fills the window.** The standard 90-day action is an offer, and an offer invites a price conversation. This sends an open question and is forbidden from mentioning price at all. That distinction is the entire product and it is defensible. "We contact residents earlier" is not.

---

## Pain phrasing worth borrowing

- "The first time we talk to them about renewing is when we send the offer."
- "We find out why they left in the exit survey."
- "They said they were happy right up until they gave notice."
- The resident reply that is the whole demo: *"We're happy here but the extractor fan in the bathroom has been broken since summer and I've reported it twice."*

**Four findings that matter more than the phrasing:**

**Managers and residents disagree about why people leave.** Managers attribute non-renewals to life changes and things outside their control. Residents report rent, maintenance and communication — all controllable. Both groups are describing the same departures. This is the most useful single insight available to this build, because it means the manager's own explanation of their renewal rate is evidence of the problem rather than a description of it.

**The complaint is often hidden inside a compliment.** "We're happy here, but…" reads as positive and gets skimmed. Nothing in builds 1 to 3 has an equivalent, because a vendor saying "done" is unambiguous and a resident saying "we're fine" is not. This is the sharpest demonstrable moment in the product.

**Nobody has a field for "problems found before the renewal decision."** Like build 3's unrecorded lost days, the absence is structural: exit surveys record reasons after the fact, satisfaction surveys record scores unconnected to any lease clock, and renewal reports record outcomes. There is no existing measure of a fixable problem caught in time, which is both the opportunity and the reason no prospect is currently tracking it.

**Reactive work crowds this out.** Property management leaders report spending about two-thirds of their time on routine and reactive work. A ninety-day check-in is exactly the kind of task that is obviously worth doing and never gets done, because nothing breaks when it is skipped.

---

## The numbers

Use these. Named surveys, current, specific enough to survive scrutiny.

| Fact | Figure | Source |
|---|---|---|
| Cost of one non-renewal | **$3,872-4,000** per unit, all in | NAA |
| Average resident retention | **57%**, down from 60% in 2024 | Zego 2026 Resident Experience Report |
| Share of units turning annually | roughly **43%** | Derived from the above |
| National renewal rate | **55-57%** | Multiple 2026 industry sources |
| H1 2026 market-rate renewals | **56%** signed, renewal price growth averaging 3.5% | LeaseLock / Willett |
| Days vacant between residents | **34.4 days**, up from about 30 in early 2020 | Industry reporting, 2026 |
| Manager time on reactive and routine work | **66%**, versus 33% on strategic work | NAA + AppFolio, 1,984 professionals, 2025 |
| AI adoption in property management | **20% to 58%** in one year; only **8%** had fully automated any process | Buildium 2026 |
| Retention software stack cost | **$4-12 per unit per month**, most operators $5-8 | Category pricing analysis, 2026 |
| Renewal workflow as a PMS add-on | **$1-2 per unit per month** | Same |
| Satisfaction survey tooling | **$0.50-1.50 per unit per month**, target response rate 30-40%, often incentivised with $25 credits | Same |

**The worked example, and how to present it.** A 5,000-door portfolio slipping from 60% to 57% retention takes on about 150 extra turns a year, roughly **$600,000** at $4,000 a turn. Scale it down for the ICP: a 300-door portfolio losing three percentage points is about nine extra non-renewals, roughly **$36,000 a year**. Present it as arithmetic a reader can redo with their own turnover cost, never as a benchmark and never as a result this build produced.

**The pricing contrast is the strongest structural number.** A retention stack at $5-8 per unit is $1,500-2,400 a month on 300 doors. This is $350-600 flat. That is a different shape of cost, not a discount, and it should be presented as a consequence of being one automation rather than a platform.

**Treat vendor outcome claims as claims.** EliseAI reports 85% of AI adopters seeing improved satisfaction and 77% improved renewal rates. That is a vendor surveying its own market. Cite it as what the category claims, never as evidence this build works.

---

## The competitive landscape

**This category is crowded and well funded.** Copy implying nobody is working on retention is false and instantly disprovable.

**Direct, and closer than any competitor in builds 1-3:**

- **EliseAI Renewals** — proactively checks in with residents, answers lease-term questions, guides them through renewal without staff chasing.
- **Colleen AI (Lease AI)** — generative AI engaging residents **ahead of the standard 90-day lease expiration timeline**. Their own words. This is the same timing argument.

**Adjacent:** Funnel Leasing (CRM, single guest card through renewal), Zego (resident experience), Rentana (renewal pricing).
**Measurement, not intervention:** SatisFacts, J Turner (ORA, TALi).
**Already paid for:** renewal workflow inside ResMan, Yardi, AppFolio and others, typically a $1-2/unit add-on.

**Three things that cannot be claimed:**

1. **Ninety-day timing.** Standard recommended practice.
2. **Early resident engagement.** Colleen AI markets exactly this. So does EliseAI.
3. **AI drafting resident messages.** The most common AI use case in the industry.

**What actually differentiates, in order of how well it survives a sceptical operator:**

**The message is not a renewal pitch and cannot become one.** The competitors above exist to move a resident toward signing; they answer lease-term questions and guide the renewal. This one is *blocked* from mentioning rent, renewal terms, lease changes, deadlines or money, at draft time and again at send time. It asks one open question and routes the answer. That is a different job, not a better version of the same job.

**No resident-facing message is ever sent without a person approving that specific message.** AI renewal assistants converse autonomously by design — that is their value. Here, three separate message types require three separate taps.

**Compliance-sensitive replies are caught by fixed rules before the model runs.** Accommodation requests, habitability, legal threats and discrimination concerns are pattern-matched deterministically rather than left to a model to notice.

**Flat fee instead of per-unit.** See the pricing note above.

---

## The fair-housing material

**This is the most decision-useful research in the file and the easiest to get wrong.**

The facts, as published:

- **HUD guidance issued May 2024** made explicit that algorithmic tools are subject to the Fair Housing Act, that disparate outcomes are actionable regardless of intent, and that not knowing is not a defence.
- Compliance analysis warns that **language models cannot reliably distinguish a pet-rent question from an assistance-animal accommodation request**.
- The risk is characterised as being about **how you respond** — denying wrongly, delaying too long, or asking a question you are not allowed to ask.
- Critically: an AI that gives **frictionless service to ordinary questions but routes protected-class requests into a slower queue can itself constitute disparate impact**.

**How to use this, and how not to.**

The last point is the one that changes the design argument. An earlier version of this build refused to draft anything for a compliance-flagged reply. That instinct looks cautious and is arguably the opposite: it creates exactly the two-tier pattern the analysis warns about, where an ordinary maintenance complaint gets an instant drafted reply and a disability accommodation request gets silence and a longer wait.

The build now drafts for every category at the same speed. The compliance flag changes what the **manager** sees, not what the **resident** experiences. Write it that way.

**Never write:**
- that the system refuses to help with accommodation requests
- that it "won't touch" fair-housing matters
- anything implying protected-class replies get less service
- legal advice, or any claim that using this makes a client compliant

**Do write:**
- that these categories are flagged by fixed rules rather than left to a model
- that a person reads every one before anything goes out
- that HUD has said algorithmic tools are in scope and intent is not a defence

**Say plainly that this is not legal advice and that a client's own counsel owns the policy.**

---

## Conventions to get right

**Resident, not tenant.** The single most visible tell of someone writing from outside the industry.

**Cohort selection is from lease end date only.** No behavioural data, no payment history, nothing about the person. Say this explicitly — it is both true and the thing a compliance-aware operator will ask about.

**The check-in is not an offer.** Never describe it as "reaching out about their renewal." It asks whether anything is unresolved. The renewal is not mentioned.

**Turnover cost is the client's number.** $3,872-4,000 is the apartment benchmark. Scattered-site single-family runs differently. Present the figure as configurable and use the client's own where possible.

**Exposure is surfaced, not saved.** The metric shows turnover cost attached to residents currently flagged at risk, and moves to "recovered" when the issue is closed. It is not money earned. If a line implies the automation banked $3,900, cut it.

**No renewal-rate promise.** The proof of concept proves the loop runs. Whether it changes renewals needs a full cycle, a baseline and a comparison. Say so before a prospect asks.

**Reply rate is the pilot's live variable.** As in build 3's vendor reply rate: below a low threshold the automated half is fiction. Recommend measuring it rather than promising it.

---

## Rules for the copy

1. Use **resident**, **doors**, **expirations**, **non-renewal**, **notice**, **turnover cost** unglossed. Never **tenant** except in a legal context.
2. Never write **units** for company scale.
3. Never claim the 90-day window, early engagement, or AI drafting as novel.
4. Never blur "found the problem" into "saved the renewal."
5. Never present the $36,000 or $600,000 examples as results. They are arithmetic offered for the reader to redo.
6. Never present fixture verification as a customer outcome. There is no client yet. Say so plainly.
7. Never imply protected-class replies receive slower or lesser service, and never give legal advice.
8. Do not disparage EliseAI, Colleen, or the PMS-native tools. Name who should buy them: an operator wanting renewal conversion should buy a renewal assistant.
9. There is **no board and no dashboard**. One was built and deleted, for the second build running. Never describe a screen the client logs into.
10. Treat vendor outcome statistics as category claims, never as evidence.
11. Flag any phrase that is invention rather than sourced, so it can be replaced after real practitioner research.

---

## Sources

- [NAA — Crunching the Numbers on Turnover Costs](https://naahq.org/news/crunching-numbers-turnover-costs) — per-unit turnover cost
- [NAA — Resident Retention at All-Time High](https://naahq.org/news/resident-retention-all-time-high) — ~$4,000 per non-renewal; the gap between manager and resident explanations
- [NAA — The Art of Tenant Retention](https://naahq.org/art-tenant-retention) — retention practice framing
- [Zego — 2026 Resident Experience Management Report](https://www.gozego.com/publications-media/state-of-resident-experience-management/) — retention 60% to 57%; managers cite life changes, residents cite rent, maintenance and security
- [Zego — Resident retention ideas](https://www.gozego.com/articles/resident-retention-ideas/) — category framing
- [AppFolio / NAA — 2025 performance findings](https://www.appfolio.com/newsroom/technology-implementation-now-a-top-challenge-for-real-estate-leaders) — 1,984 professionals; 66% of leadership time on reactive and routine work
- [AppFolio — State of AI in Property Management](https://www.appfolio.com/blog/ai-report) — resident communication as the most common AI use case; human oversight emphasis
- [Buildium — 2026 State of the Property Management Industry](https://www.buildium.com/resource/2026-property-management-industry-report/) — AI adoption 20% to 58%; only 8% fully automated any process
- [LeaseLock / Greg Willett — Resident retention and renewal pricing power](https://leaselock.com/greg-willett-signposts-multifamily-resident-retention-renewal-pricing-power/) — 56% of H1 2026 expirations renewing; 3.5% renewal price growth
- [RentCafe — Apartment lease renewal timeline](https://www.rentcafe.com/blog/renting/apartment-lease-renewal-timeline/) — the 90-day renewal timeline from the resident's side
- [EmerickTech — When to send lease renewal notices](https://emericktech.com/property-management/when-to-send-lease-renewal-notice/) — trigger at 90 days rather than 60, to leave a window for addressing dissatisfaction
- [Second Nature — Lease renewal checklist](https://www.secondnature.com/blog/lease-renewal-checklist/) — 90 / 60 / 30 cadence
- [EliseAI — Renewals](https://eliseai.com/renewals) — proactive check-ins, lease-term answers, guided renewal without staff chasing
- [EliseAI — 85% of operators agree](https://eliseai.com/blog/85-of-operators-agree-happier-residents-start-with-ai) — 85% improved satisfaction, 77% improved renewal rates. Vendor survey; cite as a category claim only
- [Colleen AI — Lease AI launch](https://www.businesswire.com/news/home/20231026239973/en/Colleen-Debuts-Lease-AI-to-Automate-and-Optimize-Resident-Renewals-and-Retention-for-Multifamily-Property-Management-Companies) — engaging residents ahead of the standard 90-day timeline
- [Funnel Leasing — Prospect and resident AI platforms](https://funnelleasing.com/top-prospect-and-resident-ai-platforms-for-multifamily/) — CRM positioning and competitive overview
- [J Turner Research — Resident surveys](https://www.jturnerresearch.com/solutions/surveys/resident-surveys) — ORA and TALi, the survey incumbents
- [Neiboroughly — Resident retention software 2026](https://neiboroughly.com/resources/resident-retention-software/) — stack pricing $4-12/unit/mo; renewal workflow $1-2 as a PMS add-on; surveys $0.50-1.50; 30-40% target response rate
- [ResMan — Winning renewals](https://www.myresman.com/blog/winning-renewals-practical-strategies-for-multifamily-teams-to-boost-resident-retention) — PMS-native renewal workflow
- [Multifamily Dive — The hidden legal risk of AI apartment leasing tools](https://www.multifamilydive.com/news/ai-leasing-tools-hidden-legal-risk-ada-compliance/817626/) — accessibility and ADA exposure in AI resident tools
- [Rental Housing Journal — A Caution on AI: fair-housing violations in communication and payments](https://rentalhousingjournal.com/a-caution-on-ai-the-possibility-of-fair-housing-violations-in-communication-and-payments/) — communication-side fair-housing risk
- [Haven — Leasing AI and fair housing compliance glossary](https://www.usehaven.ai/post/leasing-ai-and-fair-housing-compliance-glossary) — HUD May 2024 guidance on algorithmic tools; intent not a defence
- [The AI Consulting Network — AI reasonable accommodation request process 2026](https://www.theaiconsultingnetwork.com/blog/ai-reasonable-accommodation-requests-process-2026) — two-tier service as disparate impact; models unable to separate a pet-rent question from an ESA request
- [Leasey.AI — Multi-jurisdictional fair housing compliance](https://www.leasey.ai/resources/research/multi-jurisdictional-fair-housing-compliance-for-large-landlords) — responding wrongly, delaying, or asking an illegal question as the risk surface
- Internal: `04-renewal-retention-loop.md`, `foundation-4-renewals-retention.md`, `docs/how-the-system-works.md`, `docs/operating-guide.md`, `progress-notes.md`, `.agents/product-marketing.md` v3
