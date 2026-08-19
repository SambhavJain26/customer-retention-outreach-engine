# Renewal Retention Demo Operating Guide

Last updated: 2026-08-19

This is the exact guide for presenting and testing the renewal-retention proof of concept. Follow it in order. At every step, it tells you what to do, what to say, what should happen, and what a failure looks like.

The main prospect demo takes about 10 minutes. The full confidence check covers every important branch and takes longer.

## What The Demo Must Prove

By the end of the main demo, the prospect should have seen this complete story:

1. A property manager can see upcoming lease expiries in one place.
2. The system identifies the 90-day check-in group from lease end dates.
3. OpenAI drafts a soft resident check-in, but nothing sends automatically.
4. A manager reviews and approves the message.
5. Gmail sends the approved message once.
6. A resident replies with an issue.
7. The system matches the reply, classifies it, updates the board, and alerts the manager in Telegram.
8. The system does not draft or send a reply to the resident.

## The Demo Setup

The demo uses these visible tools:

- **Renewal Retention Board:** the manager's main screen.
- **Gmail:** sends the approved check-in and receives the resident's reply.
- **Telegram:** alerts the manager when a reply needs human attention.
- **n8n:** runs the five workflows behind the scenes and shows execution history when you need to diagnose a failure.
- **OpenAI:** writes the first draft and classifies replies.
- **n8n Data Tables:** hold the local demo roster, workflow state, and activity log.

The demo uses synthetic residents. Do not use real tenant data.

## Before The Prospect Joins

Allow 10 to 15 minutes for this preparation.

### 1. Start The Local Demo

Confirm Docker Desktop is running and open n8n at:

`http://localhost:5678`

In n8n, confirm these workflows are active:

- WF1 Roster Ingestion
- WF2 Dashboard
- WF3 Draft, Approval, and Send
- WF4 Reply Matching, Classification, and Routing
- WF5 Daily Sweep, Error Alerts, and Reset

Expected result: all five workflows show as active and no workflow has a visible credential warning.

Failure signal: a workflow is inactive, a credential is missing, or n8n does not load. Do not start the live demo until this is fixed.

### 2. Reset The Demo

This is the only helper script used in this guide. From the repository folder, run:

`./scripts/reset-demo.ps1`

Expected result:

- The reset reports success.
- Exactly 40 lease rows are restored.
- The activity log is empty.
- All residents return to `PENDING`.
- Drafts, approvals, send times, reply states, reference codes, and opt-outs are cleared.
- Avery Brooks at Cedar Row 9 remains the demo-priority resident.
- Avery's email points to the test recipient configured in n8n.

Failure signal: the reset returns an HTTP error, takes more than three minutes, or does not restore 40 rows. Open WF5's latest execution in n8n and inspect the first failed node.

### 3. Prepare The Three Demo Windows

Open these before the call:

1. Board: `http://localhost:5678/webhook/board`
2. The Gmail inbox configured as the demo recipient
3. The Telegram chat used for manager alerts

Keep n8n open in a fourth tab, but do not lead the demo from it. n8n is your diagnostic view.

In Gmail:

- Make sure you can send a reply from the demo recipient.
- Keep the inbox on screen so the new check-in is easy to find.
- Do not reuse an old processed reply for the live moment.

In Telegram:

- Confirm the correct manager chat is open.
- Keep phone and desktop notification sounds muted.

### 4. Confirm The Clean Board

Refresh the board.

You should see:

- `40 of 168` units represented
- `14 in the 90-day window`
- `8 need attention`
- Pipeline columns for the 120, 90, 60, and 30-day groups
- Tabs named `Pipeline`, `Approval queue`, and `At-risk feed`
- No reset button
- No Stage 5, Stage 6, or other placeholder message

Failure signal: the counts differ, old sent or at-risk rows remain, or the board shows no leases. Run the reset once more. If the result is unchanged, inspect the latest WF5 reset execution and then WF2.

## The 10-Minute Prospect Demo

Do not test every edge case during the prospect demo. Show one clean, complete story first.

### Demo Step 1: Frame The Problem

Show the Pipeline tab.

Say:

> Most renewal processes begin with a formal offer. This starts earlier. It asks residents a simple check-in question while the property team still has time to uncover and address an issue.

Point out the four lease-expiry windows, the 14 residents in the 90-day group, and the `8 need attention` control.

Click `8 need attention` and show that messy roster rows remain visible.

Say:

> The workflow does not silently discard bad data. Missing emails, unclear dates, duplicate units, and other problems stay visible for a person to correct.

Expected result: the page scrolls to `Rows Needing Attention` and shows eight flagged rows with reasons.

Failure signal: the link does nothing or the panel is empty. The board renderer is not reading the reset data correctly; inspect the latest WF2 execution after the call.

### Demo Step 2: Generate The 90-Day Check-Ins

Scroll to the top and click `Generate check-ins for the 90-day window (14)`.

While it runs, say:

> OpenAI is writing a short check-in for each eligible resident. This is not a renewal offer. The workflow blocks rent, legal, lease-change, deadline, and renewal language before a draft reaches the manager.

Expected result:

- The button changes to `Generating...`.
- Within about 30 seconds, a message reports how many drafts were generated.
- The page reloads into the `Approval queue`.
- Safe rows show `Draft ready`.
- Any draft that failed the checks twice shows `Needs wording` instead of passing silently.

Failure signal: the button returns an error, stays busy for more than one minute, or the approval queue remains empty. Open WF3's latest execution and look for an OpenAI credential, model-access, or draft-check failure.

### Demo Step 3: Show The Human Approval Gate

In the Approval queue, find **Avery Brooks, Cedar Row 9**.

Read the subject and body aloud or let the prospect scan them. Point out:

- Avery's first name appears in the message.
- The subject contains a reference code such as `[R-xxxx]`.
- The message asks one soft question.
- It does not discuss rent, terms, deadlines, legal notices, or a renewal offer.

Say:

> OpenAI creates a draft. The property manager keeps control. They can edit it, approve it, or skip it, and nothing sends until they press Send approved.

Do **not** click `Approve all` in the live demo. The send button sends every approved row. Approve only Avery so the demo sends one email to the controlled recipient.

Expected result: Avery's card has editable subject and body fields plus `Save edit`, `Approve`, and `Skip` controls.

Failure signal: Avery is missing, the card has no controls, or the subject has no reference code. Do not send. Reset after the call and inspect WF3 generation.

### Demo Step 4: Approve One Draft

Click `Approve` on Avery's card.

Expected result:

- A confirmation appears.
- The page reloads.
- Avery is approved.
- The footer shows one approved message ready to send.
- The `Send approved` button becomes available.

Say:

> This approval is stored. Refreshing the board does not lose the manager's decision.

Failure signal: the approval count stays at zero or Avery returns to draft state. Inspect the latest WF3 approval execution.

### Demo Step 5: Send The Approved Check-In

Click `Send approved` once.

Say:

> Gmail receives only rows that have passed the checks and have explicit manager approval. The workflow locks each row before sending so a second click cannot send the same message again.

Expected result:

- The button changes to `Sending...`.
- A message reports `Sent 1 check-ins.`
- The board reloads.
- Avery becomes `SENT`.
- The email appears in the demo Gmail inbox.
- The subject keeps the `[R-xxxx]` reference code.
- The email is plain text and includes the demo sender/footer identity.

Allow up to one minute for Gmail delivery.

Failure signal: the board shows `SEND_FAILED`, reports zero sends, or Gmail has no message after one minute. Open WF3's latest execution and inspect the Gmail node. Continue the meeting by showing the generated draft and explaining that reply routing can be demonstrated with an already received test email.

### Demo Step 6: Create The Resident Issue

Open the new email in the demo recipient inbox. Click Reply and leave the subject unchanged so the reference code remains in the thread.

Send this exact reply:

> We're happy here but the extractor fan in the bathroom has been broken since summer and I've reported it twice.

Wait until Gmail shows the reply as sent. Return to the board and open the `At-risk feed` tab.

Say:

> This is the moment the workflow is designed to catch: the resident sounds positive, but there is an unresolved maintenance grievance underneath the positive opening.

### Demo Step 7: Check And Route The Reply

Click `Check for replies now` once.

Expected result:

- The button changes to `Checking...`.
- A message reports at least one processed reply and one alert.
- The board reloads into the At-risk feed.
- Avery moves to `AT_RISK`.
- The feed shows the resident, unit, reply quote, and suggested human action.
- The badges show `GRIEVANCE`, `MAINTENANCE`, and `HIGH`.
- Telegram receives a manager alert with the same issue.

Allow up to one minute for the reply check and classification.

Failure signal: zero replies are processed. Confirm the reply is unread, came from the demo recipient, kept the reference code, and has not already been processed. If it still fails, inspect WF4's latest execution.

Failure signal: the reply is processed but no alert appears. Check the board first. If Avery is `AT_RISK`, classification worked and Telegram alone failed. Inspect WF4's Telegram node after the call.

### Demo Step 8: Prove There Was No Automated Resident Response

Refresh the Gmail thread.

Expected result: there is no new automated email to the resident.

On the board, point to the suggested human action.

Say:

> The system finds the issue and routes it. It does not answer the resident, promise a repair, make a legal statement, or negotiate a renewal. A property manager decides what happens next.

This is the end of the core product story.

### Demo Step 9: Close The Demo

Say:

> The proof of concept shows the full loop: lease data in, early check-in drafted, manager approval, one controlled send, reply understood, and the right issue routed to a person. A production version would connect this flow to your property-management system, policies, and team ownership rules.

Then ask the prospect how they handle these three points today:

- When does their team first contact residents before renewal?
- Where do unresolved resident concerns become visible?
- Who owns follow-up when a reply mixes positive intent with a grievance?

## Full System Confidence Check

Run this section during rehearsal, not during the main prospect story. Reset between branches when you want clean evidence.

### Test Roster Upload And Data Quality

Open `http://localhost:5678/form/roster-upload` and upload `fixtures/roster-demo.csv`.

Expected result:

- 40 rows are loaded and eight rows are flagged.
- Blank CSV lines are ignored.
- Problem rows stay visible with reasons.
- Uploading the same file again still leaves 40 rows.
- A repeated upload does not erase workflow-owned send or opt-out state.

Failure signal: the count increases to 80, flagged rows disappear, or prior workflow state is reset. Inspect WF1's most recent execution.

After this test, run the reset helper before continuing.

### Test Manager Edits

Generate drafts and find Avery's card.

For a safe edit, make a small wording change that keeps Avery's first name and asks one soft question. Click `Save edit`, then refresh.

Expected result: the edited wording remains.

For an unsafe edit, add a rent amount, renewal term, legal notice, or deadline. Try to save or approve it.

Expected result: the board rejects the text and the row does not become approved.

Failure signal: unsafe wording becomes `APPROVED`. Stop all sending and inspect WF3's approval checks.

### Test Skip

Click `Skip` on a draft you will not send.

Expected result: the row leaves the current send path and does not increase the approved count.

Failure signal: the skipped row remains eligible for `Send approved`.

### Test Duplicate-Send Protection

Reset, generate drafts, approve only Avery, and click `Send approved`.

After Avery becomes `SENT`, click `Send approved` again if the button remains available, or refresh and confirm there is no approved work left.

Expected result:

- Gmail receives one email for Avery, not two.
- Avery remains `SENT`.
- The activity log contains one successful send for that row.

Failure signal: a second email arrives. Stop the demo and inspect WF3's lock-before-send path.

### Test A Compliance-Sensitive Reply

Reply in the tokenized Gmail thread with:

> My mother moved in with me and she uses a walker - is it possible to get a grab bar put in the bathroom?

Click `Check for replies now`.

Expected result:

- The reply routes to human attention.
- Telegram receives an alert.
- The board shows an accommodation or compliance flag.
- The feed displays: `Routed to you. No response was drafted.`
- Gmail shows no automated response to the resident.

Failure signal: the reply is marked as a clean staying response, or any resident response is drafted or sent. Stop and inspect WF4.

### Test A Clean Staying Reply

Use a tokenized thread and send:

> All good here, we're planning to stay. Thanks for checking in.

Click `Check for replies now`.

Expected result: the row becomes `STAYING`, the reply is logged, and no human-risk alert is required.

Failure signal: a clean, confident reply is marked at risk without a visible reason. Inspect WF4's classification result and computed routing.

### Test Staying With A Question

Send:

> We'd love to stay another year - what are the terms going to look like?

Click `Check for replies now`.

Expected result: the positive intent does not bypass the human route. Because the resident asked a question about terms, the row becomes `AT_RISK` and Telegram alerts the manager.

Failure signal: the row becomes `STAYING` with no human alert.

### Test Opt-Out

Send `stop emailing me`, then click `Check for replies now`.

Expected result:

- The resident is marked opted out.
- The row routes to human attention.
- Telegram receives an alert.
- Later draft generation excludes that row.

Failure signal: the resident remains eligible for future outreach.

### Test A No-Signal Message

Send this out-of-office-style message in a tokenized thread:

> I am out of the office until 14 August with limited access to email.

Click `Check for replies now`.

Expected result:

- The event is recorded as `NO_SIGNAL`.
- No Telegram risk alert is sent.
- The resident is not moved to `AT_RISK`.
- OpenAI classification is skipped for this obvious auto-reply pattern.

Failure signal: the row becomes at risk or Telegram receives a resident-risk alert.

### Test An Unmatched Reply

Send a new email to the demo Gmail account from an address that is not in the roster. Do not include a known `[R-xxxx]` code in the subject.

Click `Check for replies now`.

Expected result:

- Telegram receives an unmatched-reply alert.
- The activity is recorded as `UNMATCHED_REPLY`.
- No lease is selected and no resident status changes.

Failure signal: the system attaches the message to a resident. Stop and inspect WF4.

### Confirm Reply Idempotency

After any reply has been processed, click `Check for replies now` again without sending another message.

Expected result: the same email does not create another log entry or another Telegram alert.

Failure signal: the same reply appears twice or sends a second identical alert.

### Confirm The Daily Sweep

WF5 runs the daily sweep at 08:00 in the n8n local timezone. It is a background operations feature, not part of the core live story.

To inspect it without another helper script:

1. Open WF5 in n8n.
2. Open its execution history after the scheduled run.
3. Inspect the Telegram digest and the board.

Expected result:

- Lease timing and cohorts are recalculated from lease end dates.
- Existing states remain intact unless a sweep rule changes them.
- A `SENT` row older than 15 days with no meaningful reply becomes `ESCALATE`.
- Meaningful replies prevent non-response escalation.
- Telegram receives counts for recomputed, escalated, at-risk, and staying rows.
- No resident email is sent.

Failure signal: the sweep resets drafts, approvals, at-risk rows, staying rows, or opt-outs; or it sends a resident email.

The clean fixture does not contain a naturally backdated sent row. The `ESCALATE` branch is best proved by the completed Stage 7 verification evidence instead of altering data during a prospect call.

### Confirm Workflow Error Alerts

WF5 contains an error-alert branch that reports workflow failures to Telegram. Do not intentionally break a workflow during a prospect call.

Open WF5's execution history and review the existing Stage 7 test-error execution.

Expected result: the Telegram error alert identifies the workflow, failed step when available, error message, time, and execution link.

Failure signal: a failed execution exists with no corresponding Telegram alert.

## Status Guide

| Status | Meaning | What You Should Do |
|---|---|---|
| `PENDING` | Waiting for the next workflow action | No action unless the row belongs in current outreach |
| `DRAFT` | A safe draft is ready | Review, edit, approve, or skip |
| `REVIEW_FAILED` | Draft checks failed twice | Write or revise the message manually |
| `APPROVED` | A manager approved the draft | Send when ready |
| `SENDING` | The row is locked for Gmail sending | Wait; do not approve or resend it |
| `SENT` | Gmail send succeeded | Wait for a reply or sweep follow-up |
| `SEND_FAILED` | Gmail send failed | Inspect WF3 before retrying |
| `AT_RISK` | A reply needs a person | Review the quote and suggested action |
| `STAYING` | A clean positive reply needs no risk route | Keep as a positive signal |
| `ESCALATE` | No meaningful reply after more than 15 days | Assign human follow-up |

## Fast Failure Diagnosis

| What You See | Most Likely Area | First Check |
|---|---|---|
| Board does not load | WF2 or n8n | Latest WF2 execution and n8n health |
| Wrong counts after reset | WF5 reset or Data Tables | Latest WF5 reset execution |
| Generate returns an error | WF3 or OpenAI | OpenAI credential and failed WF3 node |
| Unsafe draft reaches approval | WF3 checks | Stop sending and inspect approval execution |
| Approved email does not arrive | WF3 or Gmail | Gmail credential and Gmail send node |
| Same row sends twice | WF3 send lock | Stop sending and inspect row history |
| Reply is not found | Gmail search or matching | Unread state, sender, processed label, and reference code |
| Reply is misclassified | OpenAI or WF4 routing | Reply log and WF4 classification execution |
| Board changes but Telegram does not alert | Telegram | Telegram credential and send-message node |
| Sensitive reply gets an automated answer | Forbidden behavior | Stop immediately; WF4 must never send tenant email |

## What Must Never Happen

- No resident email sends before manager approval.
- No generated check-in contains rent, renewal terms, lease changes, legal notices, or deadlines.
- No workflow drafts or sends a response to a resident reply.
- No model decides which resident owns a reply.
- No unmatched reply is attached to a guessed resident.
- No opted-out resident remains eligible for outreach.
- No second click sends the same approved row twice.
- No reset control appears on the prospect-facing board.

## After The Demo

Run the reset helper again:

`./scripts/reset-demo.ps1`

Refresh the board and confirm:

- 40 lease rows
- 14 rows in the 90-day window
- Eight rows needing data attention
- Empty At-risk feed
- No drafts, approvals, sent rows, opt-outs, or reply states

The demo is ready for the next prospect.
