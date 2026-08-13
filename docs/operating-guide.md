# Operating Guide

Last updated: 2026-08-13

This guide explains how to run and test the local renewal-retention demo from the board and n8n UI. It avoids automated verifier commands on purpose. The only reset path you should use during normal rehearsal is the demo reset in WF5.

## What You Need Ready

- Local n8n running at `http://localhost:5678`.
- n8n credentials named `OpenAI account`, `Gmail account`, and `Telegram account`.
- n8n Data Tables named `leases`, `outreach_log`, and `config`.
- The five demo workflows imported and active:
  - WF1 Roster Ingestion
  - WF2 Dashboard
  - WF3 Draft, Approval, and Send
  - WF4 Reply Matching, Classification, and Routing
  - WF5 Daily Sweep, Error Alerts, and Reset
- The board open at `http://localhost:5678/webhook/board`.
- Telegram visible so you can see manager alerts.
- The test Gmail inbox visible so you can see the outbound check-in and send a reply back.

Do not run a live prospect demo against real tenant data. This build is a proof of concept using the committed demo roster and reply fixtures.

## The Main Rule

Use the board as the main control surface.

The reset is intentionally hidden from the board. Everything prospect-facing should happen from the board: view the portfolio, generate drafts, approve, send, and check replies.

## Start From A Clean Demo

Use WF5's reset demo path before every rehearsal.

Reset endpoint: `POST http://localhost:5678/webhook/reset-demo`

You can call it from n8n, from an API client, or from your local demo reset helper. This is the only reset helper this guide expects.

After reset, expect:

- `leases` has exactly 40 rows.
- `outreach_log` is empty.
- All workflow-owned sending state is clean: no drafts, no reference tokens, no sent timestamps, no approved rows, no opted-out rows.
- The demo-priority tenant is Avery Brooks in Cedar Row 9.
- Avery's email is replaced with the local `config.demo_recipient_email`.
- The board loads without showing any reset button.

## Step 1: Open The Board

Open `http://localhost:5678/webhook/board`.

Expect to see:

- `40 of 168` units represented in the demo portfolio.
- `14 in the 90-day window`.
- `8 need attention`.
- Lease cohorts grouped into 120, 90, 60, and 30-day windows.
- A flagged-row panel showing messy roster rows, including invalid email, missing email, ambiguous date, expired lease, blank lease end date, duplicate unit, and short-tenure cases.

What this proves:

WF1 and WF2 are working together. The roster has been normalized into the Data Tables, and the dashboard can read the current state.

## Optional: Test Roster Upload

Use this when you want to prove WF1 directly instead of relying on the reset path.

Open `http://localhost:5678/form/roster-upload`.

Upload `fixtures/roster-demo.csv`.

Expect:

- The upload returns 40 loaded rows.
- The upload reports 8 flagged rows.
- Blank CSV rows are ignored.
- Messy rows are kept visible with notes instead of being dropped.
- Re-uploading the same file still leaves 40 lease rows.
- Existing workflow-owned state, such as sent status or opt-out state, is not wiped by a roster re-upload.

What this proves:

WF1 can take the CSV a property manager would export, normalize it, flag messy data, and preserve automation state on later uploads.

## Step 2: Generate 90-Day Check-Ins

Click `Generate check-ins for the 90-day window`.

Expect:

- The 90-day eligible rows move from `PENDING` into draft review.
- Most or all eligible rows show as `Draft ready`.
- If a draft fails guardrails twice, it shows as `Needs wording` instead of being silently approved.
- Drafts include the tenant's first name and a reference token in the subject, such as `[R-CE9B]`.
- Drafts do not mention rent, renewal terms, legal notices, deadlines, or lease changes.
- Drafts ask one soft check-in question.

What this proves:

WF3 is selecting the correct 90-day cohort, using OpenAI to draft check-ins, and applying deterministic safety checks before anything can be approved.

## Step 3: Review, Edit, Approve, Or Skip

Go to the approval queue.

Use these controls:

- `Approve` approves one draft.
- `Skip` removes a row from the send path.
- `Save edit` stores manager wording changes.
- `Approve all` approves every currently safe draft in the queue.

For a safe manual email test, approve only Avery Brooks unless you intentionally want to send a larger batch. The board's `Send approved` button sends every row currently in `APPROVED`.

Try one safe edit:

- Change wording slightly while keeping the same soft check-in intent.
- Save it.
- The edit should persist on reload.

Try one unsafe edit:

- Add wording about rent, renewal terms, legal notice, or a deadline.
- The board should reject it and keep the row out of approved sending.

What this proves:

WF3 keeps a real human approval gate. Manager edits are allowed, but unsafe edited text is blocked before approval or send.

## Step 4: Send Approved Check-Ins

Click `Send approved`.

For the cleanest manual test, approve only Avery Brooks first. That should produce one outbound email to your configured demo recipient.

Expect:

- The approved row briefly moves through `Sending`.
- The successful row becomes `SENT`.
- Gmail receives a plain-text email from the configured Gmail account.
- The subject keeps the reference token, such as `[R-CE9B]`.
- The body includes the demo-safe sender identity and footer.
- `outreach_log` records a `SENT` event.

Now click `Send approved` again.

Expect:

- No second email is sent for the same row.
- The row remains `SENT`.
- There is no duplicate `SENT` outcome for that approved row.

What this proves:

WF3's send path is idempotent. It locks approved rows before Gmail sends, so a second click finds nothing eligible.

## Step 5: Test A Live Reply

Use the Gmail inbox that received Avery's email.

Reply to the email without changing the subject. Keeping the `[R-xxxx]` token in the subject gives the matcher the strongest signal.

For the main grievance demo, use this reply:

`We're happy here but the extractor fan in the bathroom has been broken since summer and I've reported it twice.`

Then return to the board and click `Check for replies now`.

Expect:

- The button reports processed and alerted counts.
- Telegram receives a manager alert.
- Avery's row moves to `AT_RISK`.
- The at-risk feed shows the reply quote.
- Classification badges show `GRIEVANCE`, `MAINTENANCE`, and `HIGH`.
- The suggested human action tells the manager to follow up.

What this proves:

WF4 can read an unread Gmail reply, match it to the lease by reference token, classify the content, update the board, and alert the manager.

## Step 6: Test A Compliance-Sensitive Reply

Use another reply to the same tokenized thread, or reset and repeat the send step first if you want a clean run.

Use this reply:

`My mother moved in with me and she uses a walker - is it possible to get a grab bar put in the bathroom?`

Click `Check for replies now`.

Expect:

- Telegram receives an alert.
- The board routes the row to human review.
- The at-risk feed shows an accommodation or compliance flag.
- The feed includes the exact line: `Routed to you. No response was drafted.`

What this proves:

WF4 detects sensitive replies and refuses to draft or send any tenant response. The workflow surfaces the issue to a human.

## Step 7: Test No-Signal Replies

Send or submit an out-of-office style reply:

`I am out of the office until 14 August with limited access to email.`

Expect:

- The event is logged as `NO_SIGNAL`.
- No Telegram alert is sent.
- The tenant row is not moved to at risk because there is no meaningful tenant signal.
- OpenAI classification is skipped for obvious no-signal text.

What this proves:

WF4 avoids noise. Auto-replies and similar non-tenant signals do not create false risk alerts.

## Step 8: Test Opt-Out

Send or submit this reply:

`stop emailing me`

Expect:

- The row is marked `opted_out=true`.
- The row routes to human attention.
- Telegram receives an alert.
- Future generation and sending exclude that row.

What this proves:

Opt-out state is persistent workflow state, not a one-time note.

## Step 9: Test Unmatched Replies

To test unmatched behavior, send a reply from an address that is not in the roster and does not include a known `[R-xxxx]` token.

Expect:

- Telegram receives an unmatched-reply alert.
- `outreach_log` records `UNMATCHED_REPLY`.
- No lease row is assigned.
- No tenant status is changed.

What this proves:

The system refuses to guess tenant identity. It would rather alert a human than attach a reply to the wrong person.

## Step 10: Run The Daily Sweep

WF5 runs the sweep daily at 08:00 in the local n8n timezone. You can also run the `POST /daily-sweep` webhook from n8n or an API client when rehearsing.

Sweep endpoint: `POST http://localhost:5678/webhook/daily-sweep`

Expect:

- Lease days and cohorts are recomputed from lease end dates.
- Existing workflow states are preserved unless a sweep rule changes them.
- Old `SENT` rows with no meaningful reply after more than 15 days become `ESCALATE`.
- Rows with meaningful reply logs do not become non-response escalations.
- `AT_RISK`, `STAYING`, `DRAFT`, `APPROVED`, recent `SENT`, and `opted_out=true` rows are not reset.
- Telegram receives a one-line digest with recomputed, escalated, at-risk, and staying counts.

What this proves:

WF5 keeps the board current and flags non-response without sending tenant email.

## Step 11: Test Error Alerts

WF5 includes a verifier-only error test path.

Error test endpoint: `POST http://localhost:5678/webhook/stage7-test-error`

Expect:

- The test path intentionally fails.
- Telegram receives an error alert.
- The alert includes workflow context, failing node context when available, the error message, timestamp, and execution link when n8n provides one.

What this proves:

The demo has visible failure notification instead of relying only on buried execution history.

## Status Meanings

- `PENDING`: Eligible roster row waiting for a workflow action.
- `DRAFT`: OpenAI generated a guardrail-passing draft for manager review.
- `REVIEW_FAILED`: Drafting failed guardrails twice and needs manager wording.
- `APPROVED`: Manager approved the draft and it is eligible for send.
- `SENDING`: WF3 locked the row for Gmail sending.
- `SENT`: Gmail send succeeded and the send was logged.
- `SEND_FAILED`: Gmail send failed and the row needs attention.
- `AT_RISK`: Reply needs a human because it contains a grievance, compliance issue, opt-out, question, uncertainty, or low confidence.
- `STAYING`: Clean, high-confidence positive reply with no grievance, no compliance flag, and no question.
- `ESCALATE`: Sent more than 15 days ago with no meaningful reply.

## What Should Never Happen

- No tenant email sends before manager approval.
- No legal notice is generated.
- No rent increase, renewal offer, deadline, or lease-term wording appears in generated check-ins.
- No tenant reply is drafted or sent automatically.
- No model chooses which tenant a reply belongs to.
- No reset button appears on the prospect-facing board.
- No Gmail Trigger competes with the manual `Check for replies now` demo path.

## Clean Up After Testing

Use the WF5 reset demo path again:

`POST http://localhost:5678/webhook/reset-demo`

After cleanup, confirm the board is back to:

- 40 lease rows.
- Empty `outreach_log`.
- No drafts, approvals, sent rows, reply states, or opt-outs.
- Ready for the next rehearsal.

## Common Problems

If generation fails, check the OpenAI credential and model access in n8n. The board should fail visibly rather than approving bad text.

If Gmail does not send, check the Gmail credential and n8n execution history. You can still show reply classification with a manual reply payload, but the live inbox moment depends on Gmail.

If a reply is not found, confirm it is unread, not from the Gmail sender account, not already labeled `processed`, and still has the `[R-xxxx]` subject token.

If Telegram does not alert, use the board as the source of truth. Telegram is the notification channel; the board and Data Tables hold the demo state.

If timing gets slow after many rehearsals, reset the demo. Large leftover `outreach_log` history slows the POC duplicate check.
