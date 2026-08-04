# Pre-Renewal Retention Loop - Progress Notes

Last updated: 2026-08-04

## Current Status

Stage 3 is complete. WF1 Roster Ingestion is imported in local n8n, accepts the demo CSV through the form/API upload paths, writes exactly 40 lease rows, preserves workflow-owned fields on re-upload, and passes Stage 3 verification.

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
| 4 | WF2 Dashboard | Not started | n8n-served HTML board with cohorts, flags, approval/feed screens. |
| 5 | WF3 Draft, Approval, and Send | Not started | Generate 90-day drafts, guardrails, approval gate, Gmail send, idempotency. |
| 6 | WF4 Reply Matching, Classification, and Routing | Not started | Gmail/manual reply handling, classifier, Telegram alerts, no auto-replies. |
| 7 | WF5 Daily Sweep, Error Alerts, and Reset | Not started | Cohort recompute, escalation flags, error alerts, reset workflow. |
| 8 | End-to-End Rehearsal and Demo Package | Not started | Pre-flight, three rehearsals, fallback recording, workflow exports. |

## Deviations From Original Plan

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

## Next Step

Start Stage 4: build WF2 dashboard with cohort board, flagged-row panel, and placeholder approval/at-risk surfaces.
