# Pre-Renewal Retention Loop - Progress Notes

Last updated: 2026-08-21

## Current Status

Stage 9 is complete at POC depth. The demo now runs entirely on Airtable and Telegram:
WF6 (Telegram router and actions), WF7 (cadence generation and approval cards), WF8 (reply
matching, classification, routing), WF9 (daily sweep, metrics, error alerts), and optional
WF10 (automatic reply polling, shipped inactive).

The v1 board build has been removed from the working tree after v2 passed live testing. It
remains recoverable at tag `poc-v1-board`.

Verified live end to end: clean seed, 14 of 14 drafts passing guardrails, Telegram approval,
single Gmail send, duplicate-send refusal, skip refusal on a sent resident, Gmail reply
matched by reference token, maintenance grievance classified `GRIEVANCE / MAINTENANCE / HIGH`,
accommodation request flagged `ACCOMMODATION_REQUEST`, reply assist drafted and sent on
approval, issue resolved with confirmation sent, unmatched reply alerting with no resident
assigned, sweep recomputing cohorts and refreshing metrics, and turnover exposure moving from
open to recovered.

## Source Context Read

- `04-renewal-retention-loop.md`
- `foundation-4-renewals-retention.md`
- `renewal-retention-demo-build-plan.md`

## Approved Build Direction

Approved for Stage 1 implementation on 2026-08-04.

Current proposed direction:

- Build a demo-depth pre-renewal grievance-detection loop.
- Build and test locally on this machine first.
- Use CSV ingest rather than PMS integration.
- Use n8n Data Tables rather than Google Sheets.
- Use Gmail OAuth2 rather than IMAP/app-password email.
- Use the single available non-professional Gmail account for local testing.
- Use Telegram for manager alerts.
- Use cheap OpenAI models for message drafting and reply classification, after live model verification.
- Use n8n's built-in OpenAI/OpenAI Chat Model nodes with the n8n OpenAI credential and JSON Schema / structured output by default, not HTTP Request.
- Current researched model recommendation: test `gpt-5.6-luna` first for both drafting and classification; fall back to `gpt-5.4-nano` if unavailable, and use `gpt-5.4-mini` for drafting only if cheaper draft quality fails.
- Build a self-contained n8n-served HTML board for the demo.
- Keep all tenant-facing sends behind human approval.
- Never generate legal notices, rent increase notices, renewal offers, or auto-replies.
- Keep VPS, Caddy, public HTTPS domain, and production DNS/email authentication out of the demo build. They are production/prospect-readiness scope only.
- A temporary tunnel is acceptable for local demo testing when useful.

## Known Risks and Open Items

1. Sales-positioning risk: the underlying retention/turnover problem is well evidenced, but the workflow gap is thinly evidenced. This should not be claimed as a proven industry-wide pain point.
2. First-sale risk: the source material recommends selling this as an expansion to existing clients, but the demo plan may be used before there is an existing account.
3. n8n license risk: demo use is acceptable, but paid hosted client operation needs written confirmation from n8n or a client-hosted deployment model.
4. Email setup risk: Gmail OAuth2 requires a Google Cloud project and correct redirect URI setup, but n8n's Google OAuth docs support a localhost callback URL for local development.
5. Deliverability risk: using a personal Gmail From address is acceptable for local testing but weak for a prospect-facing demo.
6. Email compliance boundary: tenant emails should use a real sender identity and footer/physical-address detail for production/prospect use. Local testing may use a demo-safe placeholder.
7. Regulatory boundary: SMS is not part of the demo. Production SMS would require the client's own registered provider account and 10DLC setup.
8. Fair-housing boundary: cohort selection must be deterministic by lease end date only. Compliance-sensitive replies must route to a human with no drafted response.
9. Telegram tunnel note: Telegram send-message alerts do not need a tunnel, but a temporary tunnel is acceptable for local demo convenience, OAuth callback/webhook testing, or opening the board from another device.
10. Production hardening is intentionally deferred.

## Stage Tracker

| Stage | Name | Status | Notes |
|---|---|---|---|
| 1 | Local Environment, Accounts, and Tooling | Complete | Repo-owned Compose runtime verified at `http://localhost:5678`; Data Tables visible; OpenAI, Gmail OAuth2, and Telegram smoke tests passed. |
| 2 | Data Model and Demo Fixtures | Complete | Created/reused `leases`, `outreach_log`, and `config`; generated roster and reply fixtures; verification passed. |
| 3 | WF1 Roster Ingestion | Complete | `WF1 Roster Ingestion` active with form/API upload paths; fixture upload, idempotency, messy-row flags, and state preservation verified. |
| 4 | WF2 Dashboard | Complete | `WF2 Dashboard` active at `http://localhost:5678/webhook/board`; renders cohorts, flagged rows, approval queue placeholder, and at-risk feed placeholder. |
| 5 | WF3 Draft, Approval, and Send | Complete | POC-complete: generated 13 usable 90-day drafts plus 1 visible needs-wording row, approval gate works, priority Gmail send works, duplicate send prevented. |
| 6 | WF4 Reply Matching, Classification, and Routing | Complete | POC-complete: manual reply webhook, optional Gmail unread read path, deterministic matching, classifier fallback, Telegram routing, duplicate protection, and board feed verified. |
| 7 | WF5 Daily Sweep, Error Alerts, and Reset | Complete | POC-complete: fixture reset, deterministic cohort recompute, non-response `ESCALATE`, Telegram digest/error alerts, and hidden reset endpoint verified. |
| 9 | Airtable + Telegram Demo Rebuild (v2) | Complete | WF6-WF10 built, imported, and verified live. v1 removed from the tree, recoverable at tag `poc-v1-board`. |
| 8 | End-to-End Rehearsal and Demo Package | Complete | POC-complete: docs-only fallback, demo runbook, operator guide, prospect-facing explainer, package helper, and three cold-start rehearsals passed. |

## Deviations From Original Plan

2026-08-21: Adopted a single drafting policy after live testing. OpenAI drafts a suggested
reply and a fix-confirmation for every grievance category, including compliance-flagged ones.
An earlier build withheld drafting for accommodation, habitability, legal-threat, and
discrimination replies; the user chose the simpler, uniform rule so the demo reads the same
for any property. The human approval gate remains the only thing that lets a message reach a
resident.

2026-08-21: Guardrails now run again at send time against whatever Airtable holds, because a
manager can edit `draft_body` or `assist_draft` in the table or from Telegram after the draft
was produced. Edited wording is checked exactly like generated wording.

2026-08-21: Added Telegram-side editing. Tapping Edit wording stores a pending edit in the
Config table; the manager's next plain message replaces that draft and is re-posted with its
buttons.

2026-08-21: Added approval-queue navigation. Only the first draft card was reachable from
Telegram, so the remaining thirteen could only be actioned in Airtable.

2026-08-21: Bugs found and fixed during live testing: Telegram cards posted with no buttons
because `reply_markup` was passed as a JSON string instead of the node's `replyMarkup` enum;
Skip had no status guard and would rewind a `SENT` resident to `PENDING`, making them eligible
for a second check-in; `publish:workflow` re-activated workflows imported as inactive; the
reopen clock measured from a previously closed issue.

2026-08-21: Seed now points four residents at the live demo inbox (the demo-priority row plus
three more in the 90-day cohort) so approving a second and third draft on camera actually
delivers. Every other resident keeps an `@example.com` address, which cannot reach a person.

2026-08-21: Removed the v1 build from the working tree: WF1-WF5 exports, the dashboard
library, the board, and the Stage 2-8 import/verify/package scripts. The Stage 3, 5, 6, and 7
libraries are retained because v2 inlines their verified logic for cohort banding, draft
guardrails, reply routing, and sweep rules.

2026-08-20: Stage 9 approved as an explicit plan revision. Two committed rules changed by user
decision. First, Airtable is now permitted and replaces n8n Data Tables as demo state; the HTML
board is removed and Airtable becomes the manager's visible surface. Second, the invariant "no
workflow drafts or sends a response to a resident reply" becomes "no resident-facing message is
ever sent automatically; a manager approves every individual outbound message." This is required
by the new reply-assist and fix-confirmation features and keeps the human-approval guarantee
while dropping the never-replies guarantee.

2026-08-20: Tagged the verified v1 board build as `poc-v1-board` before starting v2. v1 files stay
in place and runnable until v2 passes rehearsal; the cleanup commit is deferred.

2026-08-20: Airtable Meta API cannot create formula, rollup, lookup, or count fields. Derived
values (`days_to_expiry`, `cohort`, `tenure_months`, `data_quality`, `turnover_exposure`,
`days_to_resolve`) are therefore plain fields written by n8n, exactly as v1 wrote them into Data
Tables. `cohort` as a coloured single-select also reads better on camera than a formula would.

2026-08-20: Stage 9 setup and seed scripts are Node, not PowerShell. The documented PowerShell
BOM and `ConvertTo-Json` wrapping gotchas make PowerShell a poor fit for Airtable REST work, and
Node 24 is already present with global `fetch`.

2026-08-20: The seed re-anchors `fixtures/roster-demo.csv` from its 2026-08-04 fixture anchor to
the seed run date, shifting only ISO dates and leaving the deliberately messy cells untouched.
This fixes a latent v1 issue where fixture cohorts drifted from the sweep's live recomputation as
real time passed. Cohort distribution is preserved exactly.

2026-08-20: The demo now uses a single Gmail mailbox (`Gmail account` credential) as both sender
and recipient. Because Gmail marks self-sent mail as read, v1's unread-based reply detection is
unreliable in this setup. WF8 must find replies by `[R-xxxx]` token and `Re:` subject rather than
by unread state.

2026-08-19: Reworked `docs/operating-guide.md` into the literal prospect-demo sequence, with preparation, talk track, exact board/Gmail/Telegram actions, expected results, failure signals, full branch testing, and cleanup. Added `scripts/reset-demo.ps1` as the guide's only helper command.

2026-08-19: Reworked `docs/how-the-system-works.md` around the problem, evidence, solution, actual WF1-WF5 flow, service ownership, safety limits, POC proof, and pilot measures. Web research from NAA, Zego, AppFolio, and Buildium validates turnover cost, resident/manager perception gaps, reactive workload, and demand for human-supervised communication automation. The document explicitly avoids claiming that the POC has already improved renewal rates.

2026-08-03: Tightened the plan after a second pass through `renewal-retention-demo-build-plan.md` to explicitly include schema-constrained AI output via n8n Information Extractor / structured output and sender/footer identity for outbound emails.

2026-08-04: Revised plan to be local-first. VPS, Caddy, public domain, and production DNS/email authentication are deferred to production/prospect-readiness only. Also corrected AI implementation guidance: use n8n built-in OpenAI/OpenAI Chat Model nodes with JSON Schema / structured output by default; reserve HTTP Request for debugging or unsupported features.

2026-08-04: Made the n8n OpenAI credential explicit and confirmed the build should use n8n's built-in OpenAI/OpenAI Chat Model nodes for AI calls. Also marked a temporary local tunnel as acceptable for demo/testing convenience.

2026-08-04: Rewrote `AGENTS.md` using the pasted guide from a similar automation project, adapted to this repo's decisions: local-first n8n, Data Tables, Gmail OAuth2, Telegram manager alerts, built-in OpenAI nodes, deterministic tenant matching, and no legal notices or auto-replies.

2026-08-04: Added Git workflow guidance to `AGENTS.md`: check status/log commands, commit and push to `main` after every completed task unless explicitly told not to, and report push failures clearly.

2026-08-04: Implemented Stage 1 local-first runtime scaffolding using repo-owned Docker Compose instead of VPS/Caddy/domain setup. Added `.env.example`, ignored local `.env`, `docker-compose.yml`, `scripts/verify-stage-1.ps1`, and `docs/stage-1-local-environment.md`.

2026-08-04: Verified Docker `29.1.3`, Docker Compose `v2.40.3-desktop.1`, `docker compose config`, local n8n HTTP reachability at `http://localhost:5678`, `/healthz` status `200`, `N8N_ENABLED_MODULES=data-table`, `GENERIC_TIMEZONE=America/New_York`, and n8n CLI version `2.29.10`.

2026-08-04: Current local n8n image is `n8nio/n8n:latest`, digest `sha256:9cb60554716a0ab11a966e79ed65171e1bbf00b6d262ba12aa119bba22eb6000`, created `2026-07-10T07:29:13.441938867Z`.

2026-08-04: Official OpenAI docs checked. `gpt-5.6-luna` is listed as the cost-sensitive GPT-5.6 model, with short-context Standard pricing of `$0.20` input / `$1.20` output per 1M tokens and lower-cost listed pricing of `$0.10` input / `$0.60` output per 1M tokens where applicable. Account-level model access was not verified because no `OPENAI_API_KEY` is present in the shell environment and n8n credentials have not yet been created.

2026-08-04: n8n logs currently show a Python task runner warning because Python 3 is not present in the image. This is not blocking for the demo as planned because workflows will use JavaScript Code nodes, not Python nodes.

2026-08-04: User confirmed n8n Data Tables are visible and created credentials named `OpenAI account`, `Gmail account`, and `Telegram account`.

2026-08-04: OpenAI smoke test passed through n8n's built-in OpenAI node using `gpt-5.6-luna`; response returned `OK` with token usage `11` input / `5` output. The model rejected `temperature`, so later workflows must omit that parameter for `gpt-5.6-luna`. The Responses operation also rejected `max_output_tokens=5`; use at least `16`.

2026-08-04: Telegram smoke test passed through n8n using the `Telegram account` credential. The manager chat ID was discovered from the bot's `getUpdates` response and stored in local `.env` only.

2026-08-04: Gmail OAuth2 smoke test passed through n8n using the `Gmail account` credential. The local demo sender/recipient email was stored in local `.env` only and not committed. Gmail returned a message/thread ID successfully.

2026-08-04: n8n CLI workflow execution cannot be run inside the already-running service container because the task broker port is in use. Smoke tests were executed by stopping n8n, running a one-off `docker compose run --rm --no-deps n8n execute --id=<workflow-id> --rawOutput`, then restarting n8n.

2026-08-04: Implemented Stage 2 fixture tooling and Data Table setup. `fixtures/roster-demo.csv` generates with 40 visible rows, two intentionally blank rows, BOM, trailing whitespace, a quoted comma in one unit, and 10 messy behavior rows. Expected cohort counts are `120=6`, `90=14`, `60=11`, `30=6`, `NONE=2`, and `EXPIRED=1`; the expected flagged-row count is `8`.

2026-08-04: Stage 2 reply fixtures include 11 primary fixtures because the detailed table includes fixture 11 (`staying-with-question`) and six private adversarial fixtures: prompt injection, long rant, Spanish reply, image-only reply, unmatched sender, and duplicate rapid replies.

2026-08-04: Created/reused n8n Data Tables `leases`, `outreach_log`, and `config` with the Stage 2 schema. Seeded non-secret defaults in `config`: `manager_name=Maya Chen`, `company_name=Harborview Property Management`, `timezone=America/New_York`, `total_units=168`, `send_delay_seconds=2`, `model_draft=gpt-5.6-luna`, and `model_classify=gpt-5.6-luna`. Local-only `manager_email`, `demo_recipient_email`, and `telegram_chat_id` were seeded from ignored `.env` only and were not committed.

2026-08-04: Stage 2 Data Table IDs in local n8n are `leases=YNgP827yOAeU86Kc`, `outreach_log=gQ9UwQWvv1hOiOv5`, and `config=toE1K0zGE5DGWKIf`. These IDs are local runtime details and are written only to ignored `tmp/stage2-data-table-ids.json`.

2026-08-04: Stage 2 Data Table operations were verified through active temporary webhook workflows. Direct CLI `n8n execute` was not used for Data Table operations because this local n8n reports the Data Table module as disabled in one-off CLI execution even though the running service has Data Tables enabled.

2026-08-04: Stage 2 verification passed: CSV fixture parsing/regeneration, expected row and cohort counts, Data Table existence, config read, and insert/read/delete smoke checks for `leases` and `outreach_log`.

2026-08-04: Implemented Stage 3 WF1 ingest. Added a placeholder-safe workflow template at `n8n-workflows/wf1-ingest.json`, shared normalization helper `scripts/stage-3-ingest-lib.js`, import helper `scripts/import-wf1-ingest.ps1`, and verifier `scripts/verify-stage-3.ps1`.

2026-08-04: WF1 upload endpoints are active locally: form `http://localhost:5678/form/roster-upload` and API `http://localhost:5678/webhook/roster-upload-api`. Both use multipart file field `lease_roster`; the API path is the stable verification path.

2026-08-04: Stage 3 regenerated the relative-date roster fixture with `base_date=2026-08-04`. Counts remain unchanged: 40 visible rows, 2 blank rows, cohorts `120=6`, `90=14`, `60=11`, `30=6`, `NONE=2`, `EXPIRED=1`, and 8 flagged rows.

2026-08-04: WF1 normalizes names, trims whitespace, strips BOM, skips blank CSV records, flags ambiguous slash dates without guessing, validates missing/typo-domain emails, computes cohorts from `lease_end_date` only in `America/New_York`, and writes semicolon-delimited `ingest_notes`.

2026-08-04: WF1 reads `config.demo_recipient_email` at ingest time and substitutes it only for CSV rows marked `is_demo_priority=true`. The real demo email remains local-only in n8n/Data Tables and ignored `.env`; it is not committed.

2026-08-04: Stage 3 verification passed against local n8n. Checks covered form URL registration, API fixture upload, exact 40-row table count, cohort counts, known messy-row notes, invalid/missing email visibility, ambiguous date routing to `NONE`, duplicate unit preservation with distinct `lease_id`s, idempotent second upload, and preservation of `status`, `draft_subject`, `draft_body`, `ref_token`, `sent_at`, and `opted_out` after re-upload.

2026-08-04: Durable PowerShell gotcha: Data Table webhook responses that are JSON arrays can be wrapped as a nested `Object[]` when returned through helper functions. Stage 3 verifier now flattens those responses before row-count assertions.

2026-08-04: Implemented Stage 4 WF2 dashboard. Added `n8n-workflows/wf2-dashboard.json`, dashboard HTML builder `scripts/stage-4-dashboard-lib.js`, import helper `scripts/import-wf2-dashboard.ps1`, and verifier `scripts/verify-stage-4.ps1`.

2026-08-04: Stage 4 dashboard is intentionally read-only until WF3/WF4 exist. Generate, approval, send, and check-replies controls render as realistic stubbed UI and show Stage 5/6 messaging instead of calling missing endpoints.

2026-08-04: Stage 4 verification passed against local n8n. The board returned HTTP 200 with `text/html; charset=utf-8`, rendered the `40 of 168` header, `8 need attention`, `14 in the 90-day window`, 120/90/60/30 cohort counts, known flagged rows, and no external URL dependencies. Raw board fetch completed in `554ms`; browser timing at 1440px reached response end in `386ms` and DOMContentLoaded in `490ms`.

2026-08-04: Stage 4 browser smoke test used local Chrome because Playwright's bundled Chromium executable was not installed. Screenshots at 1440px desktop and 390px mobile showed no horizontal overflow and the expected board content.

2026-08-04: Implemented Stage 5 WF3 Draft, Approval, and Send. Added `n8n-workflows/wf3-draft-approve-send.json`, shared outbound/guardrail helper `scripts/stage-5-outbound-lib.js`, import helper `scripts/import-wf3-draft-approve-send.ps1`, and verifier `scripts/verify-stage-5.ps1`.

2026-08-04: Stage 5 dashboard wiring replaced Stage 5 stubs with real POST calls to `http://localhost:5678/webhook/generate`, `http://localhost:5678/webhook/approve`, and `http://localhost:5678/webhook/send`. The Stage 6 check-replies control remains a stub until WF4.

2026-08-04: Stage 5 generation uses n8n's built-in OpenAI Responses node with JSON Schema structured output and `model_draft` from config. In POC verification, the batch generated 13 usable 90-day drafts and 1 visible `REVIEW_FAILED` / needs-wording row. This is accepted for the proof of concept because the board now allows manager editing/approval of needs-wording rows and no row can send without approval.

2026-08-04: Stage 5 approval/send smoke passed at POC scope. `POST /approve` with `approve_all` approved 13 current draft rows. `POST /send` for the demo-priority lease `cedar-row-9-2026-10-23` sent exactly one Gmail message with tokenized subject `[R-CE9B]`; a second identical `/send` call returned `sent_count=0`, confirming idempotency for the live demo path.

2026-08-04: Stage 5 implementation notes: Data Table residue from interrupted verifier runs can produce duplicate rows in local n8n. WF3 defensively dedupes eligible generation rows by `lease_id`; the verifier reset helper now loops until demo tables are empty. Guardrails were adjusted to avoid false positives on the word `may` and to compare first names accent-insensitively.

2026-08-04: Implemented Stage 6 WF4 Reply Matching, Classification, and Routing. Added `n8n-workflows/wf4-reply-classify-route.json`, shared reply helper `scripts/stage-6-reply-lib.js`, import helper `scripts/import-wf4-reply-classify-route.ps1`, and verifier `scripts/verify-stage-6.ps1`.

2026-08-04: Stage 6 dashboard wiring replaced the check-replies stub with a real POST to `http://localhost:5678/webhook/check-replies`. The at-risk feed now renders reply log entries and keeps compliance copy visible: `Routed to you. No response was drafted.`

2026-08-04: Stage 6 POC accepts manual payloads for deterministic demo/rehearsal checks and supports Gmail unread polling from the button for live inbox checks. The production-like Gmail Trigger remains deferred so it cannot consume the live reply before the demo button is clicked.

2026-08-04: Stage 6 uses deterministic fast routing for clear demo/compliance/opt-out/no-signal patterns and keeps the built-in OpenAI Responses classifier as the fallback for non-obvious matched replies. This deviation keeps the live demo responsive while preserving visible fail-human behavior for ambiguous replies.

2026-08-04: Stage 6 import creates or reuses a Gmail label named `processed`; the runtime label ID is written only to ignored `tmp/stage6-gmail-processed-label.json`. WF4 marks Gmail-mode messages read and applies the processed label when a Gmail message ID is present.

2026-08-04: Stage 6 verification passed at POC scope. All 11 public reply fixtures routed correctly through `/check-replies`; fixture 2 became `GRIEVANCE / MAINTENANCE / HIGH`; fixture 7 flagged `ACCOMMODATION_REQUEST`; fixture 8 logged `NO_SIGNAL` without alert; fixture 9 persisted `opted_out=true`; fixture 11 routed human despite positive intent because it contains a question; duplicate message IDs skipped; unmatched sender was logged as alertable without lease assignment; WF4 contains no Gmail send/reply node; and the board has no Stage 6 stub messaging.

2026-08-04: Stage 6 timing note: after repeated verifier runs accumulated many reply logs, the full verifier measured fixture 2 at `10852ms`; a warm manual smoke on the same accumulated data set measured `8310ms`. This is acceptable for the POC but the strict under-eight-second demo goal should be rechecked after Stage 7 reset clears demo tables before rehearsal.

2026-08-04: Implemented Stage 7 WF5 Daily Sweep, Error Alerts, and Reset. Added `n8n-workflows/wf5-daily-sweep-reset.json`, shared ops helper `scripts/stage-7-ops-lib.js`, import helper `scripts/import-wf5-daily-sweep-reset.ps1`, and verifier `scripts/verify-stage-7.ps1`.

2026-08-04: Stage 7 exposes local webhook endpoints `POST /daily-sweep`, `POST /reset-demo`, and verifier-only `POST /stage7-test-error`. Reset remains hidden from the board; the dashboard still only exposes prospect-facing demo controls.

2026-08-04: Stage 7 reset rebuilds the 40-row demo lease table from committed `fixtures/roster-demo.csv` using the Stage 3 normalizer, anchors fixture math to `2026-08-04`, substitutes `config.demo_recipient_email` for the demo-priority row, clears `outreach_log`, and resets workflow-owned fields to clean `PENDING` state.

2026-08-04: Stage 7 sweep recomputes `days_to_expiry` and `cohort` from `lease_end_date` only, preserves existing workflow-owned state, and sets `ESCALATE` only for old `SENT` rows whose `sent_at` is more than 15 days old and no meaningful tenant reply log exists. `NO_SIGNAL` logs do not block non-response escalation.

2026-08-04: Stage 7 verification passed. Checks covered JSON/JavaScript/PowerShell syntax, WF5 import/activation, reset to exactly 40 lease rows and empty `outreach_log`, fixture cohort counts, demo-priority email substitution, board load with no reset endpoint visible, seeded sweep preservation/escalation cases, Telegram sweep digest, no Gmail send/reply nodes, verifier-only error alert path, and final clean reset.

2026-08-04: Stage 7 POC deviation: `/reset-demo` accepts `clear_gmail_processed=true` metadata, but WF5 does not currently mutate Gmail labels. The default demo reset intentionally avoids broad mailbox mutations; opt-in Gmail processed-label cleanup remains production/prospect-hardening scope unless specifically needed for rehearsal.

2026-08-04: Implemented Stage 8 demo readiness. Added `docs/stage-8-demo-runbook.md`, `scripts/package-stage-8-demo.ps1`, and `scripts/verify-stage-8.ps1`.

2026-08-04: Stage 8 fallback is docs-only by explicit choice. No video file is generated because `ffmpeg` is not installed on PATH and the POC scope uses a written runbook plus reproducible verifier evidence as the fallback artifact.

2026-08-04: Stage 8 verification passed with three consecutive cold-start rehearsals. Each run restarted n8n, reset the demo, loaded the board, generated 14 draft-ready 90-day check-ins, approved drafts, sent exactly one priority Gmail message, confirmed duplicate-send idempotency, routed fixture 2 as `GRIEVANCE / MAINTENANCE / HIGH`, routed fixture 7 as `ACCOMMODATION_REQUEST`, exercised Telegram alerts, generated the local demo package, and performed a final clean reset.

2026-08-04: Stage 8 rehearsal timings: run 1 total `89032ms`, generation `15056ms`, fixture 2 `4201ms`, fixture 7 `2636ms`; run 2 total `75837ms`, generation `28182ms`, fixture 2 `3850ms`, fixture 7 `3584ms`; run 3 total `68422ms`, generation `13504ms`, fixture 2 `8945ms`, fixture 7 `5395ms`. Each run sent `1` priority email and the duplicate-send check returned `0`.

2026-08-04: Stage 8 local package helper writes the handoff bundle to ignored `tmp/stage-8-demo-package/` with workflow JSON, fixtures, runbook/docs, and helper scripts. No credentials, `.env`, real tenant data, or n8n credential exports are included.

2026-08-13: Added `docs/operating-guide.md` for no-script manual operation/testing through the board, n8n UI, and WF5 reset path, plus `docs/how-the-system-works.md` as a non-technical client/prospect explainer. Both docs reflect the completed WF1-WF5 build, local n8n/Data Tables stack, OpenAI drafting/classification, Gmail sending/reply reading, Telegram alerts, hidden reset, idempotent send behavior, and no-auto-reply/legal-notice boundaries.

## Stage 1 Verification Status

Completed:

- Docker and Docker Compose are installed.
- n8n starts via repo-owned Docker Compose.
- n8n is reachable at `http://localhost:5678`.
- n8n health endpoint returns `200`.
- Persistent Docker volume `renewal-retention_n8n_data` exists.
- Data Tables module is enabled through `N8N_ENABLED_MODULES=data-table`.
- Runtime timezone is set to `America/New_York`.
- Local `.env` exists and remains ignored by git.
- Data Tables tab is visible in the n8n UI.
- n8n OpenAI credential passes a smoke test.
- `gpt-5.6-luna` is callable from the user's OpenAI account through n8n.
- Gmail OAuth2 credential sends a real test email.
- Telegram credential sends a real manager alert.

## Stage 2 Verification Status

Completed:

- Generated and validated `fixtures/roster-demo.csv`.
- Generated and validated `fixtures/roster-demo-expected.json`.
- Generated `fixtures/reply-fixtures.md` and `fixtures/reply-fixtures-expected.json`.
- Generated private adversarial reply fixtures in `fixtures/adversarial-reply-fixtures.json`.
- Created/reused n8n Data Tables `leases`, `outreach_log`, and `config`.
- Seeded required config rows from defaults plus ignored local `.env` values.
- Verified Data Table insert/read/delete for `leases`.
- Verified Data Table insert/read/delete for `outreach_log`.
- Verified seeded `config.manager_name` reads back as `Maya Chen`.

## Stage 3 Verification Status

Completed:

- Imported and activated `WF1 Roster Ingestion`.
- Verified form upload page registration at `http://localhost:5678/form/roster-upload`.
- Uploaded `fixtures/roster-demo.csv` through `http://localhost:5678/webhook/roster-upload-api`.
- Verified upload response reports 40 loaded rows and 8 flagged rows.
- Verified `leases` contains exactly 40 rows after upload and after re-upload.
- Verified cohort counts match fixture expectations.
- Verified known messy rows carry expected `ingest_notes`.
- Verified invalid/missing emails remain visible with `email_valid=false`.
- Verified ambiguous dates land in `cohort=NONE`.
- Verified duplicate units remain separate rows with distinct deterministic `lease_id`s.
- Verified re-upload preserves workflow-owned state fields.

## Stage 4 Verification Status

Completed:

- Imported and activated `WF2 Dashboard`.
- Verified board URL `http://localhost:5678/webhook/board`.
- Verified board returns HTTP `200` and `text/html; charset=utf-8`.
- Verified response time under one second by raw HTTP fetch.
- Verified header counts: `40 of 168` units, `8 need attention`, and `14 in the 90-day window`.
- Verified all four cohort headings and expected 120/90/60/30 counts.
- Verified known flagged rows are visible, including `Spruce 10`, `Meadow 6`, `Hillcrest 2`, `Sunset 7`, `Orchard 21`, and `Vista 16`.
- Verified no external URL dependencies in the generated HTML.
- Verified desktop and mobile smoke screenshots with no horizontal overflow.

## Stage 5 Verification Status

Completed:

- Imported and activated `WF3 Draft, Approval, and Send`.
- Re-imported `WF2 Dashboard` with real Stage 5 controls.
- Verified the board contains real `data-action` controls for generate, approve-all, and send, with no Stage 5 stub messaging.
- Verified OpenAI generation handled the 90-day cohort at POC depth: 13 draft-ready rows and 1 visible needs-wording row.
- Verified the needs-wording row appears on the board as an editable approval-queue item.
- Verified unsafe edited text is blocked by deterministic guardrails in helper tests.
- Verified approve-all updates current draft rows to `APPROVED`.
- Verified priority-row Gmail send for `cedar-row-9-2026-10-23`.
- Verified a second send request for the same priority row sends `0` messages.

## Stage 6 Verification Status

Completed:

- Imported and activated `WF4 Reply Matching, Classification, and Routing`.
- Re-imported `WF2 Dashboard` with the real Stage 6 check-replies control.
- Verified workflow JSON, JavaScript syntax, and helper unit cases.
- Verified WF4 contains no Gmail send or reply node.
- Verified all 11 public reply fixtures through `POST /check-replies`.
- Verified fixture 2 routes as `GRIEVANCE / MAINTENANCE / HIGH`.
- Verified fixture 7 flags `ACCOMMODATION_REQUEST` and the board displays `Routed to you. No response was drafted.`
- Verified fixture 8 logs `NO_SIGNAL` without alert.
- Verified fixture 9 persists `opted_out=true`.
- Verified fixture 11 requires a human despite `STAYING` because it contains a question.
- Verified duplicate message IDs do not create a second processed reply.
- Verified unmatched replies do not assign a lease.
- Verified the board calls `/webhook/check-replies` and no longer contains Stage 6 stub messaging.

## Stage 7 Verification Status

Completed:

- Imported and activated `WF5 Daily Sweep, Error Alerts, and Reset`.
- Re-imported `WF2 Dashboard` and verified reset is not visible on the board.
- Verified workflow JSON, JavaScript syntax, PowerShell parser syntax, and helper unit cases.
- Verified WF5 contains no Gmail send or reply node.
- Verified `POST /reset-demo` leaves `leases` with exactly 40 rows and `outreach_log` empty.
- Verified reset cohort counts match fixture expectations and the demo-priority row uses `config.demo_recipient_email`.
- Verified reset clears drafts, tokens, sent timestamps, and opted-out state to clean demo state.
- Verified board loads after reset.
- Verified `POST /daily-sweep` recomputes stale days/cohorts.
- Verified old `SENT` rows without meaningful replies become `ESCALATE`.
- Verified old `SENT` rows with meaningful reply logs do not escalate.
- Verified `NO_SIGNAL` logs do not block non-response escalation.
- Verified `AT_RISK`, `STAYING`, `DRAFT`, `APPROVED`, recent `SENT`, and `opted_out=true` states are preserved.
- Verified Telegram sweep digest path and verifier-only error alert path.
- Verified final reset leaves the demo rehearsal-ready.

## Stage 8 Verification Status

Completed:

- Added the Stage 8 demo runbook with pre-flight checklist, five-minute script, failure recovery, docs-only fallback, and limitations to say out loud.
- Added `docs/operating-guide.md` for manual no-script operation/testing, with only the WF5 demo reset path as the allowed reset helper.
- Added `docs/how-the-system-works.md` for non-technical client/prospect explanation of the five workflows and service responsibilities.
- Added the Stage 8 package helper and verified it creates `tmp/stage-8-demo-package/`.
- Added and ran the Stage 8 verifier.
- Verified all WF1-WF5 workflow JSON exports parse.
- Verified Stage 3-7 JavaScript helpers pass syntax checks.
- Verified Stage 8 PowerShell scripts parse.
- Verified no committed workflow contains a Gmail Trigger that could compete with manual `/check-replies`.
- Re-imported/activated WF1-WF5 and WF2 dashboard.
- Completed three consecutive cold-start rehearsals.
- Verified reset, board load, draft generation, approve-all, priority Gmail send, duplicate-send idempotency, fixture 2 routing, fixture 7 compliance routing, Telegram alerts, and final clean reset.
- Verified the final demo state is clean: 40 lease rows and empty `outreach_log`.

## Stage 9 Verification Status

Airtable data layer:

- Four tables created via the Meta API with typed, colour-coded fields. No field-type rejections.
- Seed verified by reading back from the live base: 40 residents, cohorts
  `120=6 90=14 60=11 30=6 NONE=2 EXPIRED=1`, 8 flagged rows with the expected reasons.
- Lease dates re-anchor to the seed run date, so counts hold whenever the demo is recorded.

Workflows, verified live against real Gmail, Telegram, OpenAI, and Airtable:

- Generation produced 14 of 14 usable drafts with zero guardrail failures, in 22-33 seconds.
- Telegram approval sent exactly one Gmail message; a second tap returned "already sent" and
  sent nothing.
- Skip on a sent resident is refused and leaves state untouched.
- A real Gmail reply was matched by `[R-xxxx]` token on the first attempt and classified
  `GRIEVANCE / MAINTENANCE / HIGH` with a specific human action.
- An accommodation request was flagged `ACCOMMODATION_REQUEST` and routed to a human.
- Reply assist drafted a compliant response; sending required a separate tap.
- Mark resolved sent nothing on its own; the confirmation required its own approval.
- An unmatched reply alerted with full sender, subject, and quote, and was attached to no
  resident. Airtable showed zero residents with a reply after that test.
- Audit of the Outreach Log confirmed every outbound email corresponded to an explicit tap.
- Sweep recomputed cohorts, refreshed the Metrics scoreboard, and posted a digest with
  exposure open and exposure recovered. WF9 contains no Gmail node.

Known limits accepted at POC depth:

- One reply is processed per check run; the response reports how many remain.
- Airtable reads take a single 100-record page, which is ample for the 40-row demo.
- Telegram bakes buttons into a message at send time, so old cards keep old behaviour.
- cloudflared quick tunnels change hostname on every run, making the tunnel the most likely
  live failure. `scripts/v2/start-tunnel.js` automates recovery.

## Next Step

Record the demo. The build and its documentation are complete; remaining work is rehearsal and
recording. Before each session run `node scripts/v2/start-tunnel.js`, re-import WF6, reset with
`node scripts/v2/seed-airtable-demo.js`, and clear the Telegram chat so no stale card can be
tapped on camera.
