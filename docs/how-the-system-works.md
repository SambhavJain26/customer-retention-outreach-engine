# How The Renewal Retention System Works

Last updated: 2026-08-21

## The Problem

**Problem statement:** Property managers often enter the renewal conversation without a timely, organized view of the resident concerns that may influence whether someone stays or leaves.

Property teams often learn about a resident's real concern too late.

The formal renewal process may tell the team whether a resident plans to stay, but it does not always reveal what has been shaping that decision: an unresolved repair, a recurring parking problem, poor communication, a safety concern, or a question that no one has answered.

By the time a renewal offer goes out, the resident may already have made a decision.

There is a second problem. Property managers spend much of their week on routine and reactive work. That makes it hard to check in personally with every resident at the right time, read every reply closely, and make sure the important ones reach the right person.

The result is a gap between lease administration and resident experience. The lease date is known. The resident's concerns often are not.

## Is This A Real Industry Problem?

Yes. Current property-management research supports four parts of the problem.

### Turnover Has A Material Cost

The National Apartment Association reported an average turn cost of about **$4,000 per unit**, including lost rent, concessions, and maintenance. Its report also noted a gap between why property managers think residents leave and what residents report: renters ranked rent, safety, poor maintenance, and management communication among their leading concerns. [National Apartment Association: Resident Retention at All-Time High](https://naahq.org/news/resident-retention-all-time-high)

That does not mean every resident can or should be retained. It means avoidable turnover deserves attention because one missed concern can carry a real operating cost.

### Managers And Residents Do Not Always See The Same Problem

Zego's 2026 resident-experience research reports that average retention fell from 60% in 2024 to 57%. Property managers tended to attribute non-renewals to external life changes, while renters pointed to controllable factors such as rent increases, poor maintenance, and security concerns. [Zego: 2026 Resident Experience Management Report](https://www.gozego.com/publications-media/state-of-resident-experience-management/)

This is the visibility problem the system addresses. It gives residents an earlier opportunity to say what is happening, rather than asking the property team to infer it from a renewal outcome.

### Property Teams Are Stuck In Reactive Work

Research from the National Apartment Association and AppFolio surveyed 1,984 industry professionals in 2025. The report says property-management leaders spend 66% of their time on routine operational and reactive work, while only 33% goes to stakeholder engagement and strategic work. [AppFolio and NAA: 2025 property-management performance findings](https://www.appfolio.com/newsroom/technology-implementation-now-a-top-challenge-for-real-estate-leaders)

That supports demand for a workflow that handles timing, first drafts, logging, and routing while leaving judgment and resident relationships with the property team.

### The Market Is Already Asking For Automation With Human Oversight

Buildium reports that property-management AI adoption rose from 20% in 2024 to 58% in 2025, but only 8% of companies had fully automated any process. Its research also links proactive maintenance with owner value, trust, and resident retention. [Buildium: 2026 State of the Property Management Industry](https://www.buildium.com/resource/2026-property-management-industry-report/)

AppFolio's 2025 AI research identifies resident communication as the most common property-management AI use case. The same research stresses human oversight, checking outputs, and using AI within existing policies and laws. [AppFolio: State of AI in Property Management](https://www.appfolio.com/blog/ai-report)

Taken together, these findings point to demand for systems that remove repetitive coordination and help people respond sooner, with the property manager still in control.

## What The Research Does And Does Not Prove

The evidence validates the problem: retention matters, turnover is costly, maintenance and communication influence resident decisions, property teams are heavily reactive, and the industry is adopting AI for resident communication.

It does **not** prove that this proof of concept increases renewals. That claim would require a live pilot with real portfolios, a comparison group or baseline, and measured outcomes over a renewal cycle.

The cited studies are industry and vendor-sponsored surveys rather than controlled academic trials. They provide directional evidence of market demand and operating priorities, but they should not be presented as guaranteed financial results.

## The Solution

**Solution statement:** Start a controlled resident check-in before formal renewal, then turn each reply into a visible signal and route anything important to a person.

The Renewal Retention System creates an early-warning loop before the formal renewal conversation.

It uses the lease end date to identify residents approaching renewal, prepares a short 90-day check-in, requires a manager to approve it, sends it through Gmail, and watches for the resident's reply.

When a reply arrives, the system looks for the signal underneath the words. A resident can sound positive and still mention a repair that has been ignored. Another may ask for an accommodation. A third may say they are leaving, wavering, or do not want more email.

The system brings those signals to the property manager. It does not make the decision for them.

## The Complete Flow

### 1. The Lease Roster Enters The System

The property manager supplies a CSV export containing resident name, unit, email, move-in date, and lease end date.

The roster is loaded into Airtable and checked. Questionable rows stay visible instead of being quietly dropped: missing emails, unclear dates, duplicate units, and expired leases are each flagged with the reason, ready for a person to correct.

For this proof of concept, the roster contains synthetic data. A production version would receive approved data from the client's property-management system or reporting process.

### 2. Upcoming Leases Become Visible

Residents are grouped into four windows — 120, 90, 60, and 30 days before lease end — derived from the lease end date alone.

The timing comes only from the lease end date. OpenAI does not choose who enters a group, and the system does not use payment history, screening information, protected characteristics, or a prediction score.

Airtable gives the manager everything in one table:

- The lease-expiry pipeline
- The draft approval queue
- The at-risk reply feed

### 3. OpenAI Prepares The 90-Day Check-In

At the 90-day point, **WF3: Draft, Approval, and Send** asks OpenAI to prepare a short, personal check-in.

The message is deliberately limited. It asks how things are going. It is not a renewal offer, legal notice, rent discussion, or lease negotiation.

Before the manager sees the draft, the workflow checks it for unsafe or unsuitable language. It blocks rent or money language, renewal or legal wording, deadlines, generic greetings, missing resident names, excessive questions, and messages outside the allowed length.

If a draft fails the checks twice it is marked as needing the manager's wording. It is never quietly passed through.

### 4. A Manager Decides What Sends

Each draft arrives in Telegram as a card. The manager can approve it, skip it, edit the wording from the chat, or page to the next one. Wording can also be edited directly in Airtable, and whatever the table holds at the moment of approval is what sends.

Nothing sends until a manager approves it and then chooses `Send approved`.

The workflow checks edited text again. This keeps the same boundaries in place even after a manual change.

### 5. Gmail Sends The Approved Message

Gmail sends approved check-ins from the configured account.

Each subject contains a small reference code. The resident does not need to do anything with it; the code helps the system connect a reply to the correct lease.

The send process also protects against duplicate clicks. Once a row begins sending, the same approved row cannot be picked up again by a second click.

### 6. The Resident Replies Normally

The resident replies in Gmail as they would to any email.

**WF4: Reply Matching, Classification, and Routing** first connects the reply to the correct lease. It uses the reference code in the email subject, then the sender's email as a fallback.

If neither method produces a clear match, the workflow alerts the manager. It does not guess.

### 7. OpenAI Reads The Meaning; Rules Decide The Route

OpenAI classifies the resident's message. It can identify signals such as:

- Planning to stay
- Wavering
- Planning to leave
- Maintenance or property-condition grievance
- Neighbor or parking issue
- A question that needs a person
- Opt-out request
- Accommodation, habitability, legal, or discrimination concern
- Unclear or low-confidence meaning
- No real resident signal, such as an out-of-office response

Fixed workflow rules decide what happens next.

A clean, confident staying message with no grievance, sensitive issue, or question can be recorded as `STAYING`.

Everything that needs judgment becomes `AT_RISK` and goes to a person. Telegram sends the manager the resident, unit, reply quote, category, urgency, and suggested next action.

Obvious automatic replies are recorded without creating a false risk alert.

### 8. The Property Manager Takes Over

Airtable records the reply and why it was routed, and the Telegram alert carries the resident's own words, the reason, and the suggested next step.

For sensitive messages, it displays:

`Routed to you. No response was drafted.`

That line defines the system's role. It detects and organizes the signal. The property team owns the response, repair, accommodation process, legal review, and renewal decision.

### 9. The Daily Sweep Keeps The Queue Current

**WF5: Daily Sweep, Error Alerts, and Reset** refreshes lease timing each morning at 08:00 in the local n8n timezone.

If a check-in was sent more than 15 days ago and no meaningful reply arrived, the row becomes an escalation for human follow-up. Existing draft, approval, risk, staying, and opt-out states remain intact unless a specific rule changes them.

Telegram receives a short daily count of the portfolio's current state. WF5 also alerts the manager when a workflow fails.

The proof of concept includes a hidden reset for rehearsals. Clients and residents do not see that control.

## What Each Tool Does

| Tool | Role |
|---|---|
| **Airtable** | The manager's screen and the system of record. Every resident, status, draft, reply, issue, and metric lives here. Drafts can be edited directly in the table. |
| **Telegram** | The action surface. Approvals, edits, alerts, and resolutions all happen through buttons in a private chat with the property bot. |
| **n8n** | Runs the workflows that connect everything. Invisible during normal use. |
| **OpenAI** | Writes the first draft of every outbound message and reads the meaning of every reply. It never decides who a reply belongs to and never sends anything. |
| **Gmail** | The only channel that reaches a resident. |

There is no separate web application to log into, and nothing to install.

## The Human Boundaries

These are enforced in code, not by prompting:

- **No resident-facing message is ever sent automatically.** OpenAI drafts; a manager
  approves each individual message before it leaves. Check-ins, replies, and
  fix-confirmations all require a separate, explicit approval.
- **Guardrails run twice** — when a message is drafted and again at the moment it is
  sent. Wording a manager typed themselves is checked exactly like wording the model
  produced. Rent, renewal terms, lease changes, legal language, deadlines, monetary
  amounts, and promised outcomes are all refused.
- **Resident selection uses the lease end date and nothing else.** No behavioural data,
  no payment history, no personal characteristics.
- **Replies are matched deterministically** by a reference code carried in the subject
  line, then by exact sender address. If neither matches, the system says it cannot
  identify the sender rather than attaching the reply to a guessed resident.
- **Compliance-sensitive replies are flagged before the model is consulted.**
  Accommodation requests, habitability complaints, legal threats, and discrimination
  concerns are caught by fixed rules and marked for the manager to read personally.
- **Opting out is permanent** and removes the resident from all future outreach.
- **A double tap cannot send twice.** Every send checks the resident's current state first.
- **Failures are loud.** A failed send is recorded and reported; a failed workflow alerts
  the manager with the workflow, step, and error.

## What The Proof Of Concept Proves Today

The working demo proves that the full information loop can operate:

1. Load and check a lease roster.
2. Group leases by time to expiry.
3. Draft 90-day resident check-ins.
4. Hold every message for manager approval.
5. Send an approved message through Gmail once.
6. Match a resident reply to the lease.
7. Identify maintenance, risk, opt-out, questions, and sensitive content.
8. Update Airtable and alert the manager in Telegram, then close the issue once it is fixed and confirm that with the resident.
9. Avoid automated resident responses.
10. Escalate old sends that receive no meaningful reply.

The completed demo uses 40 synthetic lease rows representing the upcoming expiries in a 168-unit portfolio. It runs locally and has passed three cold-start rehearsals.

## What A Client Pilot Must Measure

A real pilot should test whether this process changes operating outcomes. Useful measures include:

- Percentage of eligible residents reached at the intended time
- Draft approval, edit, and rejection rates
- Resident reply rate
- Number and type of concerns found before formal renewal
- Time from risk alert to manager follow-up
- Number of unresolved issues closed before the renewal decision
- Renewal rate compared with the client's prior baseline
- Avoided turnover cost, using the client's own accounting

The last two measures matter most, but they require a complete renewal cycle. The proof of concept should not promise them in advance.

## What Production Would Add

This is a local proof of concept, not a production deployment.

A production version would require:

- Connection to the client's approved property-management system or data export
- Client-approved message policy and brand voice
- Defined team ownership and response deadlines
- Proper user access and authentication
- Security, privacy, retention, and audit policies
- Compliance and legal review for the client's location and portfolio
- Production email and notification setup
- Monitoring, support, and recovery procedures
- Pilot reporting against the client's baseline

The core idea remains the same: contact residents early, keep a person in control, and bring hidden concerns to the property team before the renewal decision is already made.
