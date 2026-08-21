# Recording Checklist

Last updated: 2026-08-21

Run this immediately before you hit record. It takes about five minutes.

## Pre-flight

**1. Start the stack**

```bash
docker compose up -d n8n
```

**2. Re-establish the tunnel — every single time**

```bash
node scripts/v2/start-tunnel.js
node scripts/v2/import-v2-workflows.js wf6-telegram-router
```

This is the single most likely thing to break on camera. cloudflared quick tunnels get a new
hostname on every run, n8n only reads `WEBHOOK_URL` at container start, and the bot's webhook
has to be re-registered afterwards. If a button ever does nothing, this is the cause.

**3. Clear the Telegram chat**

Telegram bakes buttons into a message when it is sent, so an old card keeps old behaviour
forever. Clear the chat or scroll to a clean point — tapping a stale card on camera will
produce something that does not match what you are saying.

**4. Run the one command**

```bash
node scripts/v2/demo-start.js
```

It verifies n8n, the tunnel, and that all five workflows are active; refuses to continue if
anything is wrong; resets the data; and kicks off generation. Within about thirty seconds
Telegram shows:

> **90-day check-ins drafted**
> 14 ready for review
> Turnover exposure in this window: **$54,600**
> Nothing sends until you approve it.

**That is the last command you run.** Everything after it is a Telegram button, and resident
replies are picked up on their own within a minute.

You do not need to clear old demo email. The reply check ignores anything that arrived before
this demo's first send, and the reset clears every send time, so leftover mail from an earlier
rehearsal cannot be mistaken for a new reply.

**5. Windows to have open**

- Airtable `Leases` table
- Telegram, the Harborview Demo Alerts chat
- Gmail
- n8n in a background tab for diagnosis only — never lead from it

## Recording order

Nothing here needs a terminal. Every step is a tap or an email.

1. Airtable — the messy roster, the flagged rows, the cohorts
2. Telegram — the summary card that `demo-start.js` produced
3. Show the queue with **➡️ Next draft**, then optionally try an unsafe **✏️ Edit wording**
4. **✅ Approve & Send** on Avery, then tap it again to show the duplicate refusal
5. Reply from Gmail with the broken-fan message, then **wait** — the alert arrives by itself
   within a minute
6. **✍️ Draft my reply**, then **✅ Send reply**
7. **✅ Mark resolved**, then **✅ Send confirmation**
8. Airtable `Metrics` — exposure recovered, already up to date

The metrics table refreshes itself after every approval, reply, and resolution. There is no
sweep to trigger.

## If something breaks mid-recording

| Symptom | Do this |
|---|---|
| Buttons do nothing | Tunnel died. Stop, re-run step 2, re-trigger for fresh cards |
| No cards after demo-start | Check the tunnel first, then WF7's last execution in n8n |
| Reply not found | Confirm the subject kept `Re:` and the `[R-xxxx]` code |
| A card behaves oddly | It is a stale card from before a change. Re-trigger |
| Email did not arrive | Give it a minute; Gmail is occasionally slow. Then check the Gmail node |

If OpenAI or Gmail fails outright, keep going and narrate it. A visible failure with a clear
alert is a better demo than a perfect run — it proves the system fails loudly rather than
silently.

## Limitations to say out loud

Say these plainly. A prospect trusts a demo more when the boundaries are stated up front.

- It runs on **synthetic residents**, not real tenant data.
- It does **not** predict who will renew, and makes no claim to have improved a renewal rate.
  The loop is proven; the outcome is what a pilot would measure.
- It does **not** handle rent, renewal offers, lease documents, legal notices, or signatures.
- It does **not** connect to a property-management system in this proof of concept. Data
  arrives as a CSV export.
- **Nothing reaches a resident without a person approving that specific message.** OpenAI
  drafts; a human sends.
- Email only. SMS would need the client's own registered provider and 10DLC setup.
- This is **local demo infrastructure**, not production hosting. A production version runs on
  the client's own accounts with their sender identity.
- The **$3,900 turnover figure is an industry-typical placeholder**, configurable per client.
  It shows exposure surfaced and recovered, not money already earned.

## The CSV ask, for the close

> Send me your next-quarter expiring leases as a CSV: resident name, unit, lease end date,
> move-in date, and email. No financials, no screening data, no system access.
