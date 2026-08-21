# Renewal Retention Demo Operating Guide (v2)

Last updated: 2026-08-21

This is the guide for presenting and testing the renewal-retention proof of concept.
The manager works from two surfaces only:

- **Airtable** — the filing cabinet. Every resident, status, draft, reply, and metric.
- **Telegram** — the action surface. Approvals, edits, alerts, and resolutions.

There is no web dashboard. n8n runs behind the scenes and is your diagnostic view, not
part of the story.

## What The Demo Must Prove

1. A messy lease export loads without silently dropping bad rows.
2. The 90-day group is identified from lease end dates alone.
3. OpenAI drafts a soft check-in per resident, and guardrails block rent, renewal,
   legal, lease-change, and deadline wording.
4. Nothing reaches a resident without a manager tapping a button.
5. A resident reply is matched to the right person by reference code, never by guesswork.
6. The system reads what the reply *means*, not just that it arrived.
7. The manager gets a drafted response, approves it, and it sends.
8. The issue is closed, confirmed with the resident, and the money moves from
   at-risk to recovered.

---

## Before You Record

Two minutes.

### 1. Start the stack

```bash
docker compose up -d n8n
```

### 2. Clear the Telegram chat

Telegram bakes buttons into a message when it is sent, so old cards keep old behaviour.

### 3. Run the only command

```bash
node scripts/v2/demo-start.js
```

It health-checks n8n, the public tunnel, and all five workflows; repairs the tunnel and
re-registers the bot webhook automatically if it has dropped; refuses to continue if anything
is still wrong; resets to 40 clean residents; and generates the 90-day check-ins. Telegram
receives the summary card and the first approval card about thirty seconds later.

Expected after the reset: 40 residents all `PENDING`, cohorts
`120=6 90=14 60=11 30=6 NONE=2 EXPIRED=1`, 8 flagged rows, empty log, zeroed metrics, and 4
residents pointing at the real demo inbox. The other 36 use `@example.com`, which is
IANA-reserved and cannot reach a person.

From here nothing is typed. Approvals are buttons, replies are detected automatically within
a minute, and the metrics table refreshes itself after every state change.

If a button ever stops responding mid-session the tunnel has dropped. Run
`node scripts/v2/demo-start.js --no-reset` to repair it without losing state, then re-trigger
for fresh cards.

## The Demo

### Step 1 — The messy roster

Open Airtable, `Leases` table.

> This is a lease export. Forty residents, and eight of them have problems — a typo'd
> email domain, a duplicate unit number, a date nobody can parse, a missing address.

Point at `needs_attention` and `data_quality`.

> Nothing was thrown away. Every bad row is still here with the reason attached, waiting
> for a person. That matters, because the row you silently drop is the resident who
> doesn't renew.

Then point at `cohort`.

> These groups come from one thing only: the lease end date. Not behaviour, not payment
> history, not anything about the person. That is deliberate — it is what keeps resident
> selection defensible.

### Step 2 — Generate the check-ins

`demo-start.js` has already produced this. Switch to Telegram and read it out:

> **90-day check-ins drafted**
> 14 ready for review
> Turnover exposure in this window: **$54,600**
> Nothing sends until you approve it.

Then a card for **Avery Brooks · Cedar Row 9**.

> Fourteen personalised messages in twenty seconds. Every one names the resident, refers
> to how long they have lived there, and asks one open question. None mention rent,
> renewal terms, deadlines, or anything legal — those are blocked before a draft ever
> reaches me. A draft that fails twice is marked *Needs wording* rather than sent.

Failure signal: no cards. Check the tunnel first, then WF7's latest execution.

### Step 3 — The approval gate

> Fourteen finished messages are sitting in Airtable doing nothing, because no human has
> approved them. That is the product.

Tap **➡️ Next draft** once or twice to show the queue, then return to Avery.

Optional and effective — tap **✏️ Edit wording**, then type something unsafe such as:

```
Your rent goes up to $1,850 in January, sign the renewal by the deadline.
```

Expect a refusal listing the violations.

> I just tried to sabotage my own system and it refused. The checks apply to what *I*
> write, not only what the AI writes.

### Step 4 — Send one

Tap **✅ Approve & Send** on Avery.

Expect "Sent to Avery Brooks at Cedar Row 9", the email in Gmail with `[R-xxxx]` in the
subject, and Avery flipping to `SENT` in Airtable.

Tap **✅ Approve & Send** again.

> Already sent. No second email. A nervous double-tap cannot spam a resident.

### Step 5 — The resident replies

Reply to that email, leaving the subject alone:

> We're happy here but the extractor fan in the bathroom has been broken since summer and
> I've reported it twice.

Then wait. The alert arrives on its own within a minute — nobody triggers it.

Expect `GRIEVANCE / MAINTENANCE / HIGH`, Avery at `AT_RISK`, `$3,900` exposure, and:

> Action: Check the work order history and call the resident today.

> Read that reply again. It opens with "we're happy here". A busy manager skims that and
> moves on. What the system caught was the second half — an unresolved repair, reported
> twice, ignored for months. That is the renewal you lose in ninety days.

Point out the match:

> It knew this was Avery because of the reference code in the subject line. Not the name,
> not the email address, and not AI. If that code had not matched, it would have told me
> it could not identify the sender rather than guessing at a resident.

### Step 6 — Reply assist

Tap **✍️ Draft my reply**.

Expect a drafted response acknowledging the fan and the fact it was reported twice,
committing to a next step but never to a date, a cost, or an outcome.

Tap **✅ Send reply**.

> The system did the work. I still approved every word.

### Step 7 — Close the loop

Tap **✅ Mark resolved**, then **✅ Send confirmation**.

Expect Avery at `RESOLVED`, a resolution time, exposure moved to recovered, and a final
email asking the resident to confirm the fix landed.

> Issue found, answered, fixed, and confirmed with the resident. And the $3,900 of
> turnover risk moved from exposed to recovered.

### Step 8 — The metrics

Open the `Metrics` table.

> Residents in the window, check-ins sent, replies, issues found, issues resolved,
> average resolution time, exposure open, exposure recovered. That is the report a
> regional manager actually wants.

It is already current. The scoreboard refreshes itself after every approval, reply, and
resolution.

### Step 9 — Close

> A production version connects this to your property-management system, your policies,
> and your team's ownership rules. What you have seen is the loop working end to end on
> synthetic data.

Then ask:

- When does your team first contact a resident before renewal?
- Where do unresolved concerns become visible today?
- Who owns follow-up when a reply mixes praise with a complaint?

---

## Branch Testing

Run these during rehearsal, not on a prospect call.

| Branch | How | Expected |
|---|---|---|
| Compliance | Reply "My mother moved in with me and she uses a walker - is it possible to get a grab bar put in the bathroom?" | `ACCOMMODATION_REQUEST`, routed to a human, alert states nothing has been sent and to read it yourself |
| Clean staying | Reply "All good here, we're planning to stay." | `STAYING`, logged, no risk alert |
| Staying with a question | Reply "We'd love to stay another year - what are the terms going to look like?" | Positive intent does **not** bypass the human route |
| Opt-out | Reply "stop emailing me" | `opted_out` set, excluded from later generation |
| Out of office | Reply "I am out of the office until 14 August." | `NO_SIGNAL`, no alert, resident not moved |
| Unmatched | POST a manual payload with an unknown sender and no token | Unmatched alert, **no resident assigned** |
| Stale mail | Leave an old reply in the inbox, then reset | Ignored: nothing older than the demo's first send counts as a reply |
| Duplicate reply | Let the automatic poll run twice over the same reply | No second log row, no second alert |
| Skip after send | Tap Skip on a `SENT` resident | Refused, state untouched |
| Unsafe edit | Edit wording to include rent or a deadline | Refused with the violations listed |
| Sweep | `POST /webhook/v2-sweep` or wait for 08:00 | Cohorts recomputed, metrics refreshed, digest posted, no resident email |
| Error alert | Inspect WF9's error trigger history | Failures report workflow, node, message, time |

---

## Status Guide

| Status | Meaning |
|---|---|
| `PENDING` | Not in current outreach |
| `AWAITING_APPROVAL` | Draft ready, waiting on a manager |
| `REVIEW_FAILED` | Guardrails failed twice; write it yourself |
| `SENT` | Delivered to the resident |
| `AT_RISK` | A reply needs a person |
| `STAYING` | Clean positive reply |
| `RESOLVED` | Issue closed |
| `ESCALATE` | Contacted, no meaningful reply past the threshold |
| `OPTED_OUT` | Excluded from all outreach |
| `SEND_FAILED` | Gmail send failed; inspect before retrying |

## Fast Diagnosis

| Symptom | First check |
|---|---|
| Buttons do nothing | The tunnel. Run `node scripts/v2/demo-start.js --no-reset` |
| Old card behaves oddly | It is a stale card. Re-trigger for fresh buttons |
| No cards after demo-start | WF7 execution, then the OpenAI credential |
| Reply not found | Subject kept `Re:` and the token; message not already logged |
| Email did not arrive | WF3 Gmail node and the Gmail credential |
| Telegram silent but Airtable updated | Telegram credential or chat id in `Config` |

## What Must Never Happen

- A resident email sent without an explicit manager tap
- A generated message containing rent, renewal terms, lease changes, legal notices, or deadlines
- A model deciding which resident owns a reply
- An unmatched reply attached to a guessed resident
- An opted-out resident receiving outreach
- A second tap sending the same message twice
- A workflow failing silently

## After The Demo

```bash
node scripts/v2/seed-airtable-demo.js
```

Confirm 40 residents, all `PENDING`, empty log, zeroed metrics.
