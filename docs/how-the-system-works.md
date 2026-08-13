# How The System Works

Last updated: 2026-08-13

This proof of concept helps a property manager find tenant issues before the renewal conversation starts.

It does not replace the property manager's renewal process. It does not send legal notices. It does not decide rent. It does not answer tenants. It asks a soft check-in question, reads the reply, and routes anything risky to a human.

## The Simple Version

A property manager uploads a lease roster.

The system finds leases coming up in the next 120 days and shows them on a dashboard. At the 90-day point, it drafts short check-in emails. A manager reviews and approves those messages before anything sends.

When a tenant replies, the system reads the reply, decides whether it is clean or needs attention, updates the dashboard, and sends a Telegram alert to the manager when a human should step in.

## The Tools Used

| Tool or service | What it does |
|---|---|
| n8n | Runs the automation workflows locally for the demo. |
| n8n Data Tables | Stores the demo lease roster, message status, and reply log. |
| OpenAI | Drafts 90-day check-in emails and classifies tenant replies. |
| Gmail | Sends approved check-in emails and reads tenant replies. |
| Telegram | Sends manager alerts for risk, compliance, opt-out, unmatched replies, daily digests, and workflow errors. |
| Demo dashboard | Gives the manager one page to review leases, drafts, approvals, sent messages, and risky replies. |
| CSV roster | Supplies the lease data for the proof of concept. No property-management-system integration is used in this demo. |

## The Five Workflows

### WF1: Roster Ingestion

WF1 takes the lease roster CSV and turns it into clean demo records.

It checks names, emails, move-in dates, lease end dates, duplicate units, missing fields, and messy rows. It does not hide bad data. If a row has a problem, the row still appears on the board with a note.

It groups leases by lease end date only:

- 120 days
- 90 days
- 60 days
- 30 days

That matters. The system does not choose tenants based on who they are, where they live, payment history, protected characteristics, or any model score. The timing comes from the lease end date.

### WF2: Dashboard

WF2 serves the local dashboard.

The dashboard shows the leases coming up in the next four months, the rows that need data attention, the 90-day approval queue, and the at-risk reply feed.

It is the main demo screen. The manager can generate check-ins, approve drafts, send approved emails, and check replies from this board.

### WF3: Draft, Approval, And Send

WF3 handles the outbound check-in.

At 90 days, it uses OpenAI to draft short, personal check-in emails. These are not renewal offers. They do not include rent, legal terms, deadlines, or lease-change language.

Before anything can send, the manager sees the draft on the dashboard. The manager can edit it, approve it, skip it, or approve the batch.

After approval, Gmail sends the message. Each email includes a small reference code in the subject so replies can be matched back to the right lease.

WF3 also prevents duplicate sends. If someone clicks send twice, the same approved row should not send twice.

### WF4: Reply Matching, Classification, And Routing

WF4 handles tenant replies.

It first matches the reply to the right lease using the reference code in the subject. If that is missing, it can fall back to the sender email. If it still cannot match the reply, it alerts the manager instead of guessing.

Then it reads the tenant's message.

Clear positive replies can be marked as staying. Anything with a grievance, question, uncertainty, opt-out, low confidence, legal concern, habitability issue, discrimination concern, or accommodation request routes to a human.

Telegram gets an alert with the tenant, unit, reply quote, classification, urgency, and suggested next step.

The system never drafts a tenant response. For sensitive replies, the board explicitly says: `Routed to you. No response was drafted.`

### WF5: Daily Sweep, Reset, And Alerts

WF5 covers demo operations.

Every day at 08:00, it refreshes the lease timing on the board. If a check-in was sent more than 15 days ago and there has been no meaningful reply, the row becomes an escalation for human follow-up.

WF5 also sends a short Telegram digest so the manager can see the current counts.

For rehearsals, WF5 has a reset path that restores the demo to the original 40-row fixture state. That reset is hidden from the prospect-facing board.

WF5 also sends Telegram alerts when workflows fail, so problems are visible during testing.

## What Happens In A Demo

1. The board opens with 40 demo leases from a 168-unit portfolio.
2. The manager sees 14 leases in the 90-day window.
3. The manager clicks generate.
4. OpenAI drafts soft check-in emails.
5. The manager reviews the drafts.
6. The manager approves the safe messages.
7. Gmail sends the approved message to the demo recipient.
8. The recipient replies with a tenant issue.
9. WF4 matches and classifies the reply.
10. Telegram alerts the manager.
11. The dashboard moves the row to at risk and shows the reply.

The main point is simple: the property manager sees a hidden tenant issue while there is still time to fix it.

## What The System Looks For In Replies

The system separates replies into practical buckets:

- Staying
- Wavering
- Leaving
- Grievance
- Maintenance issue
- Neighbor or parking issue
- Property condition issue
- Opt-out
- Compliance-sensitive issue
- Unclear or low-confidence reply
- No-signal reply, such as an out-of-office email

Clean, confident, positive replies can stay green.

Everything else goes to a human.

## The Safety Boundaries

The system is built around a few hard boundaries:

- A human approves every outbound tenant email.
- The 90-day email is a check-in, not a renewal notice.
- The email does not mention rent, renewal terms, lease changes, legal notices, or deadlines.
- Tenant replies do not receive automated answers.
- Sensitive replies route to a human.
- Tenant matching is deterministic. The model does not decide who a reply belongs to.
- Cohort timing is based only on lease end date.
- Opt-outs are honored.

These boundaries are the product. The system is meant to surface risk early, not take over the property manager's judgment.

## What Data The Demo Uses

The demo stores only what it needs:

- Tenant name
- First name
- Unit
- Email
- Move-in date
- Lease end date
- Current workflow status
- Draft message, if generated
- Send timestamp, if sent
- Reply log, if a reply is processed

The demo does not use financial data, screening data, Social Security numbers, IDs, payment history, maintenance history, or protected-characteristic data.

## What This Proof Of Concept Does Not Do

- It does not integrate with Buildium, Rentec, AppFolio, Propertyware, or any other PMS.
- It does not send SMS.
- It does not send legal notices.
- It does not create renewal offers.
- It does not decide rent.
- It does not predict renewal probability.
- It does not track whether the manager fixed the issue after the alert.
- It does not run on production hosting.
- It does not include client authentication, data retention policy, DPA, or production security hardening.

Those are production decisions. The proof of concept exists to show the workflow: roster in, check-in drafted, manager approves, Gmail sends, tenant replies, risk routes to a human.

## Why It Matters

Most renewal processes start too late. By the time the formal renewal offer goes out, the tenant may have already decided to leave.

This system creates an earlier conversation. It gives the manager a chance to hear about the noisy fan, unresolved repair, parking issue, neighbor problem, or accommodation request before the renewal conversation becomes a yes-or-no decision.

One small issue fixed early can be cheaper than one avoidable turnover.
