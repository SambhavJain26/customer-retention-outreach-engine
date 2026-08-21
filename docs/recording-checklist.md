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

**3. Archive old demo email**

In Gmail, archive or delete every previous check-in and reply. The reply check treats any
message from the demo address as a candidate, so a leftover reply from an earlier rehearsal
will be picked up and processed as if it were new.

**4. Reset the data**

```bash
node scripts/v2/seed-airtable-demo.js
```

Expect 40 residents, all `PENDING`, 14 in the 90-day window, 8 flagged, empty log, zeroed
metrics, and 4 residents pointing at your real inbox.

**5. Clear the Telegram chat**

Telegram bakes buttons into a message when it is sent, so an old card keeps old behaviour
forever. Clear the chat or scroll to a clean point — tapping a stale card on camera will
produce something that does not match what you are saying.

**6. Decide on automatic polling**

WF10 off means you type `/check` and control the timing. WF10 on means the reply lands by
itself within a minute, which is the better story but gives you less control. Set it before
you start, not during.

**7. Windows to have open**

- Airtable `Leases` table
- Telegram, the Harborview Demo Alerts chat
- Gmail
- n8n in a background tab for diagnosis only — never lead from it

## Recording order

1. Airtable — the messy roster, the flagged rows, the cohorts
2. `/generate` in Telegram — summary card and Avery's approval card
3. Show the queue with **Next draft**, then optionally try an unsafe **Edit wording**
4. **Approve & Send** on Avery, then tap it again to show the duplicate refusal
5. Reply from Gmail with the broken-fan message
6. `/check` (or wait, if WF10 is on) — the at-risk alert
7. **Draft my reply**, then **Send reply**
8. **Mark resolved**, then **Send confirmation**
9. Airtable `Metrics` — exposure recovered
10. `/sweep` to refresh live

## If something breaks mid-recording

| Symptom | Do this |
|---|---|
| Buttons do nothing | Tunnel died. Stop, re-run step 2, re-trigger for fresh cards |
| No cards after `/generate` | Check the tunnel first, then WF7's last execution in n8n |
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
