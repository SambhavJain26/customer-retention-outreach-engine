# v2 Airtable Setup

Last updated: 2026-08-20

This is the one-time setup for the Airtable surface used by the v2 demo. Budget about
15 minutes. Everything here is local demo scaffolding — no client or resident data.

## 1. Create the base and token

1. Create an empty Airtable base. Any workspace and the free plan are fine; the demo uses
   about 60 records total, far under the 1,000-record free limit.
2. Copy the base ID from the base URL. It starts with `app`:
   `https://airtable.com/appXXXXXXXXXXXXXX/...`
3. Create a personal access token at <https://airtable.com/create/tokens> with these scopes:
   - `schema.bases:write`
   - `data.records:read`
   - `data.records:write`

   Grant it access to that one base only.

## 2. Put the values in `.env`

`.env` is gitignored. Never commit it and never paste the token into a workflow, a doc, or
a chat message.

```
AIRTABLE_PAT=patXXXXXXXXXXXXXX...
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
DEMO_RECIPIENT_EMAIL=your-demo-inbox@example.com
```

## 3. Create the tables

From the repository root:

```bash
node scripts/v2/setup-airtable-schema.js
```

This creates four tables — `Leases`, `Outreach Log`, `Config`, `Metrics` — with every field
and coloured select option. It is safe to re-run: existing tables are reused and only missing
fields are added.

Afterwards, delete Airtable's default `Table 1` by hand. The script never deletes anything.

### Why some fields are not formulas

The Airtable Meta API cannot create formula, rollup, lookup, or count fields. So
`days_to_expiry`, `cohort`, `tenure_months`, `data_quality`, `turnover_exposure`, and
`days_to_resolve` are plain fields that n8n computes and writes — exactly as the v1 Data Table
build did. The seed and the WF9 sweep keep them current.

This is not a downgrade for the demo: `cohort` as a coloured single-select reads better on
camera than a formula would, and cohort assignment still derives from `lease_end_date` alone.

## 4. Seed the demo data

```bash
node scripts/v2/seed-airtable-demo.js
```

Expected output:

- 40 residents
- 14 in the 90-day window
- 8 needing attention
- cohorts `120=6 90=14 60=11 30=6 NONE=2 EXPIRED=1`
- demo priority: Avery Brooks, Cedar Row 9, using your `DEMO_RECIPIENT_EMAIL`

Lease dates are re-anchored to the day you run the seed, so the counts stay correct no matter
when you record. Re-run this any time to reset the demo.

## 5. Add the views by hand

The API can create tables and fields but not view filters, so these are manual. In the
`Leases` table, create these grid views:

| View | Filter | Group / sort |
|---|---|---|
| `90-Day Window` | `cohort` is `90` | Sort `days_to_expiry` ascending |
| `Awaiting Approval` | `status` is `AWAITING_APPROVAL` | Sort `is_demo_priority` descending |
| `At Risk` | `status` is `AT_RISK` | Group by `urgency` |
| `Needs Attention` | `needs_attention` is checked | Sort `unit` |
| `Issues Resolved` | `issue_status` is `RESOLVED` | Sort `days_to_resolve` ascending |
| `All Residents` | none | Group by `cohort` |

For the recording, hide the noisier columns in each view — `lease_id`, `ref_token`,
`assist_draft`, and `data_quality` are useful for diagnosis but clutter the frame.

## 6. Add the Airtable credential in n8n

In n8n, create a credential named **`Airtable account`** using the same personal access token.
The v2 workflows reference it by that exact name.

## Safety notes

- The token grants write access to the base. Treat it like a password.
- Reset and seed scripts only ever touch the four demo tables in the base you configured.
- No real resident data goes into this base at any point.
