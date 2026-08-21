# Product Marketing Context

**Document version:** v3
**Last updated:** 2026-08-22

> **v2 is superseded and must not be used.** It described build 3, make-ready sequencing. This document describes build 4, pre-renewal resident retention. Different problem, different mechanism, same buyer and same delivery model.

## Product Overview

**One-liner:** Custom AI automation, built inside a property management company's existing tools, that asks every resident one open question ninety days before their lease ends, reads what the answer actually means, and puts the ones that need a person in front of a person.

**What it does:** Groups residents into 120, 90, 60 and 30-day windows from lease end date alone. At ninety days it drafts a short check-in per resident that is deliberately **not** a renewal offer: guardrails block rent, renewal terms, lease changes, legal language, deadlines and monetary amounts before a draft reaches the manager. The manager approves each message individually from Telegram. When a resident replies, the system matches the reply to the right resident by a reference code carried in the subject line, classifies what it means, updates Airtable, and alerts the manager with the resident's own words and one suggested next step. It will draft the reply too, and the fix-confirmation after the issue is closed. It never sends any of them without a separate human tap.

**Product category:** None. Not a named software product, not SaaS, not an app. Nothing to install, nothing to log into, no seats. A custom automation build delivered as a service.

**Product type:** Consulting / service delivery. Each client gets their own automation on their own infrastructure: their n8n instance, their Airtable base, their mailbox, their Telegram.

**Business model:** One-time setup fee plus a monthly fee for the client's own instance. Setup $1,000-1,800, monthly $350-600. First two clients priced lower ($600 setup, $300/month) while the model is unproven. Priced against avoided turnover, not hours worked.

**The sentence that carries the positioning:** the renewal conversation normally starts with an offer. This starts ninety days earlier with a question, and the system is forbidden from discussing the offer at all.

## What the manager actually touches

There is no dashboard. A custom HTML board was built during development and then deleted, for the second build running. The client already owned better surfaces.

| Surface | What happens there | Who owns it |
|---|---|---|
| Airtable | Residents, cohorts, drafts, replies, classifications, open issues, and the metrics scoreboard. Drafts are editable here and whatever the table holds at approval time is what sends | The client |
| Telegram | Approval cards, at-risk alerts, reply drafting, resolution, and the daily digest. Every decision is a button | The client |
| The resident's own email | Residents receive a plain message and reply normally. Nothing to install, no portal, no account | The resident |
| n8n | Runs the five workflows. The manager never leads from it | The client's instance |

## Target Audience

**Target companies:** US residential property management companies, roughly 150-600 doors, with resident email addresses and lease end dates in an exportable form. Scattered-site single-family and small multifamily both fit.

**Why that size band.** Above it, the enterprise resident-experience and renewal platforms are a genuine fit and often the right purchase. Below roughly 100 doors there are too few expirations per quarter for the cadence to be worth automating.

**Decision-makers:** Owner or principal. This is a P&L conversation about avoided turnover. The property manager or ops lead is the daily user and internal champion; they rarely sign.

**Primary use case:** Finding out which residents have an unresolved problem while there is still time to fix it, rather than discovering it from a non-renewal.

**Jobs to be done:**
- Hear about a fixable complaint before the renewal decision is made, not after.
- Stop losing the resident who never complained loudly enough to get noticed.
- Have a record of what was said, when, and who acted on it.

## Personas

| Persona | Cares about | Challenge | Value promised |
|---|---|---|---|
| Owner / principal (buyer) | Turnover cost, occupancy, renewal rate | Knows the renewal rate but not why anyone left | A named, dated list of the issues found before each renewal decision, and whether they were closed |
| Property manager (daily user) | Not being blindsided; not writing the same email forty times | Renewal outreach is a manual batch nobody has time to personalise | Forty drafted messages in under a minute, each one approved individually, and an alert when a reply needs them |

## Problems & Pain Points

**Core problem:** By the time a resident is asked about renewing, the decision is usually already made. The renewal offer is the first contact many residents get, and it arrives as a price, which invites a price answer. Whatever was actually wrong — the repair reported twice, the parking, the noise — never enters the conversation, because nobody asked while it still mattered.

**The second problem, which is subtler and better:** a resident who replies "we're happy here, but the extractor fan has been broken since summer" reads as a positive reply. It gets skimmed and closed. The complaint is in the second half of a sentence that opens with praise.

**What it costs them:**
- Roughly **$3,872-$4,000 per non-renewal** in make-ready, vacancy loss, marketing and leasing costs.
- Average retention has fallen from **60% to 57%**, so about 43% of units turn every year.
- Units sit vacant about **34.4 days** between residents, up from roughly 30 in early 2020.

**Why alternatives fall short:**
- Annual satisfaction surveys ask everyone at once, at a time unconnected to anyone's lease, and need incentives to reach a 30-40% response rate.
- Renewal workflow bundled in the PMS sends the offer. It does not ask what is wrong first.
- AI renewal assistants are built to convert the renewal. They answer lease questions and guide residents to sign, which is a different job from finding out what is broken.
- Doing it by hand works and some managers do it. It stops working somewhere above about thirty expirations a quarter.

**Emotional tension:** The owner knows the renewal rate and cannot explain it. Managers attribute non-renewals to life changes; residents report rent, maintenance and communication. Both are describing the same departures.

## Competitive Landscape

**This category is occupied by capable, well-funded products.** Any copy implying nobody has thought about resident retention is false and an operator will know it immediately.

| Competitor | What it is | Honest read |
|---|---|---|
| EliseAI | AI across leasing and resident services, with a dedicated Renewals product that proactively checks in, answers lease-term questions and guides residents through renewal | Strong product, real overlap on early outreach. It converses with residents autonomously; this build never does |
| Colleen AI (Lease AI) | Generative AI that engages residents ahead of the standard 90-day renewal timeline | The closest positional competitor. Early engagement is explicitly their pitch too |
| Funnel Leasing | Multifamily CRM with a single guest card from inquiry through renewal, native Yardi/RealPage/Entrata integration | A system of record. Different purchase |
| SatisFacts / J Turner (ORA, TALi) | Resident satisfaction surveys and loyalty indices, the multifamily incumbents | Measurement, not intervention. Complementary rather than competing |
| PMS-native renewal workflow (ResMan, Yardi, AppFolio and others) | Renewal tracking and offer sending, typically a $1-2/unit add-on | If the client is already paying for it and only wants offers sent, this is enough. Say so |
| Zego | Resident experience platform and the source of the retention benchmark everyone cites | Broader platform play |

**What cannot be claimed:**

- **Ninety-day timing is not a differentiator.** Industry guidance already recommends starting the renewal process at ninety days rather than sixty, precisely to leave time to address dissatisfaction. This build follows best practice; it did not invent it.
- **Early resident engagement is not a differentiator.** Colleen AI markets engaging ahead of the 90-day timeline. EliseAI markets proactive renewal check-ins.
- **AI drafting is not a differentiator.** Resident communication is the most common AI use case in property management.

**What is actually different, in order of how well it survives scrutiny:**

1. **The message is not a renewal pitch and structurally cannot become one.** Guardrails reject rent, renewal terms, lease changes, deadlines, money and legal wording at draft time and again at send time. Competitors in this space exist to move a resident toward signing. This exists to find out what is wrong.
2. **No resident-facing message is ever sent without a person approving that specific message.** Not the check-in, not the reply, not the confirmation. AI renewal assistants converse autonomously by design.
3. **Compliance-sensitive replies are identified by fixed rules before the model is consulted.** Accommodation requests, habitability, legal threats and discrimination concerns are flagged deterministically, not by asking a language model to notice.
4. **It costs a flat monthly fee instead of per-unit.** A retention stack runs $4-12 per unit per month. At 300 doors that is $1,200-$3,600 monthly. This is $350-600 flat.
5. **The client owns the instance.** If the builder disappears, any n8n developer can maintain it.

**The fair-housing argument, which is the strongest one available and must be used carefully.** HUD guidance issued in May 2024 made clear that algorithmic tools fall under the Fair Housing Act, that disparate outcomes are actionable regardless of intent, and that not knowing is not a defence. Published compliance analysis warns that language models cannot reliably tell a pet-rent question from an assistance-animal accommodation request, and — importantly — that an AI which handles ordinary questions instantly but routes protected-class requests into a slower queue can itself constitute disparate impact.

That second point shaped the build. Every reply category gets the same treatment and the same drafting speed; the difference is that a compliance flag is surfaced to the manager, not that the resident waits longer. Do not write copy implying the system refuses to help with accommodation requests. It flags them for a human and drafts at the same speed as anything else.

## Differentiation

**Key differentiators:**
- Cohorts derive from lease end date and nothing else. No behavioural data, no payment history, no personal characteristics.
- Guardrails run twice — at drafting and again at send — so wording a manager typed themselves is checked exactly like wording the model produced.
- Replies are matched deterministically by reference code, then exact sender address. A reply that matches neither raises an unmatched alert and is attached to nobody.
- A second tap cannot send a second message. Every send checks current state first.
- Silence is a tracked state. A resident contacted and never heard from escalates rather than being forgotten.
- The whole loop closes: issue found, replied to, marked resolved, and confirmed with the resident, with the resolution time recorded.

**Why customers choose us:** they watch the mechanism run against their own roster before paying, and get told plainly when a cheaper option they already own would do the job.

## Objections

| Objection | Response |
|---|---|
| "Isn't this what EliseAI or Colleen already do?" | Partly, and if they want a renewal conversion assistant those are better products. This one is forbidden from discussing the renewal. It exists to surface problems, not to close signatures. |
| "We already survey residents." | Surveys measure. This intervenes, on each resident's own lease clock, and routes the answer to a person the same day. They work well together. |
| "My PMS already sends renewal offers." | Then keep using it. This runs ninety days earlier and asks a different question. If all they want is offers sent, say the PMS is enough. |
| "Residents won't reply to an email." | Some will not. Reply rate is the number the pilot lives or dies on, and it should be measured before committing rather than promised. |
| "What if the AI says something that gets me sued?" | It cannot discuss rent, renewal, lease terms, deadlines or legal matters — those are blocked, and blocked again on the way out. Nothing reaches a resident without a person approving that specific message. |
| "What happens if you disappear?" | Everything runs on infrastructure in the client's name. Any n8n developer can maintain it. |

**Anti-persona:** portfolios large enough that an enterprise resident-experience platform fits properly; operators without resident email addresses; anyone wanting an autonomous assistant that talks to residents unattended; anyone who wants renewal pricing optimisation, which this deliberately does not touch.

## Switching Dynamics

**Push:** A renewal rate nobody can explain, and non-renewals whose stated reason arrives too late to act on.

**Pull:** A dated list of specific problems found before each renewal decision, and evidence of which ones were closed.

**Habit:** Sending the renewal offer and seeing what comes back feels like the process, because it has always been the process.

**Anxiety:** Whether residents reply at all; whether an AI touching resident communication creates legal exposure; trusting a solo builder with no track record.

## Customer Language

**How they describe the problem:**
- "We find out why they left in the exit survey."
- "The first time we talk to them about renewing is when we send the offer."
- "They said they were happy right up until they gave notice."

**How they describe us:** No customer language exists. No client has used this. Do not fabricate quotes.

**Words to use:** the automation, the check-in, the cohort, the approval, the resident, the property manager, your Airtable, your own instance.

**Words to avoid:** my platform, my tool, my product, my software, the app, the dashboard, the board, users, sign up, tenants when residents will do. There is no board in this build and nothing anyone logs into.

**Glossary:**

| Term | Meaning |
|---|---|
| Cohort | The 120, 90, 60 or 30-day group, derived from lease end date only |
| Check-in | The 90-day message. Not a renewal offer, and structurally cannot become one |
| Reference code | The `[R-xxxx]` token in the subject line that matches a reply to a resident |
| Guardrail | The deterministic check that rejects rent, renewal, legal, deadline and money wording |
| Compliance flag | Accommodation request, habitability, legal threat, discrimination concern. Detected by fixed rules before the model runs |
| At risk | A reply that needs a person |
| Turnover exposure | Residents currently at risk, valued at the client's own turnover cost |
| Reply assist | A drafted response to a resident, held until the manager approves it |

## Brand Voice

**Tone:** Understated, incident-report register. Short declaratives, real numbers, first person, US spelling. No hype, no exclamation points, at most one em dash per document and zero is better.

**Style:** Every capability claim names the specific part of the automation responsible. Limits are stated before a prospect finds them.

**Personality:** Honest, unhurried, structurally cautious, willing to disqualify itself, and willing to name the competitor a prospect should buy instead.

## Proof Points

**Metrics:** None from a real client. The mechanism has been verified live against forty synthetic residents: fourteen of fourteen drafts passing guardrails, a single approved send, a refused duplicate send, a refused skip on an already-contacted resident, a real Gmail reply matched by reference code on the first attempt and classified as a high-urgency maintenance grievance, an accommodation request flagged before the model ran, a drafted reply sent only after approval, an issue resolved and confirmed with the resident, an unmatched reply attached to nobody, and an audit confirming every outbound email corresponded to an explicit human tap. **This is testing, not a customer result, and must never be presented as one.**

**Customers:** None yet. This would be the first. Say so plainly.

**Testimonials:** None.

**Value themes:**

| Theme | Proof |
|---|---|
| The complaint hidden inside a compliment gets caught | A reply opening "we're happy here" was classified as a high-urgency maintenance grievance with a specific next action |
| Nothing reaches a resident without a person | Three separate message types, three separate approvals, verified by log audit |
| The model never decides who a reply belongs to | Matching is by reference code then exact sender; unmatched replies are assigned to nobody |
| The loop closes | Issue opened, answered, resolved and confirmed, with resolution time recorded |

## Goals

**Primary business goal:** Land a first paying pilot in the target band.

**Key conversion action:** A low-pressure invitation to run the mechanism against the prospect's own next-quarter expirations. The ask is a CSV of name, unit, lease end date, move-in date and email. No financials, no screening data, no system access.

**Current metrics:** None from real usage. Local verification is an implementation-readiness signal and must not be blended with customer outcomes.

## Changelog

*Newest first.*
- **v3 (2026-08-22)** — Rewritten for build 4, pre-renewal resident retention. Replaces the make-ready sequencing context entirely. Competitive section built from live research: EliseAI Renewals, Colleen AI's Lease AI, Funnel, the survey incumbents, and PMS-native renewal add-ons. Records that 90-day timing and early engagement are industry-standard and cannot be claimed. Adds the HUD 2024 algorithmic-tools guidance and the disparate-impact risk of two-tier AI service, which is why every reply category is drafted at the same speed with the compliance flag surfaced rather than the resident deprioritised.
- v2 (2026-08-18) — Build 3, make-ready sequencing. **Superseded.**
- v1 (2026-08-04) — Initial context. **Superseded.**
