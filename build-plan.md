# Pre-Renewal Retention Loop - Staged Development Plan

Last updated: 2026-08-04

## Source Documents Read

- `04-renewal-retention-loop.md`
- `foundation-4-renewals-retention.md`
- `renewal-retention-demo-build-plan.md`

## Planning Position

This build should stay at demo depth until a real client validates the workflow with a CSV export. The validated problem is tenant turnover and unresolved grievances before renewal. The less-validated claim is that renewal outreach is an unsolved industry-wide workflow gap. Because of that, the demo must sell grievance detection, not renewal automation.

The local demo build should use this stack:

- Local self-hosted n8n
- n8n Data Tables
- n8n OpenAI credential
- n8n built-in OpenAI/OpenAI Chat Model nodes
- Gmail with OAuth2
- Telegram
- One self-contained HTML dashboard served by n8n
- CSV ingest only, no PMS API integration
- Email demo only, no SMS
- No VPS, Caddy, public HTTPS domain, or production DNS/email authentication during the local demo build. Those are production/prospect-readiness items only.
- A temporary tunnel is acceptable for local demo testing when a public callback/webhook URL is useful.

## Researched Tool Decisions - 2026-08-04

- n8n Google OAuth can be configured against a localhost callback URL for local development, so Gmail OAuth2 does not require VPS/Caddy during the build.
- Telegram manager alerts use the Telegram node's send-message operation and do not require inbound tunneling, but using a tunnel for local demo convenience is fine.
- Use n8n's built-in OpenAI/OpenAI Chat Model nodes with the n8n OpenAI credential and JSON Schema / structured output for normal workflow AI calls. Do not use HTTP Request for normal OpenAI calls unless the built-in node lacks a required feature or we are debugging a node-specific issue.
- Cheapest current OpenAI default to test first: `gpt-5.6-luna` for both drafting and classification. Official OpenAI docs position it for cost-sensitive, high-volume workloads, with short-context pricing at $0.20 input / $1.20 output per 1M tokens in Standard mode and $0.10 / $0.60 in lower-cost modes where available.
- Fallbacks:
  - `gpt-5.4-nano` if `gpt-5.6-luna` is unavailable on the API key or unsupported by the n8n node.
  - `gpt-5.4-mini` only if draft quality from the cheaper models is visibly too weak.
  - Keep classification on the cheapest schema-valid model that passes the fixture tests.

## Gaps, Conflicts, and Assumptions to Keep Visible

1. The source problem says this is a weak first-sale product and should be sold as an expansion to an existing client. The demo plan assumes it may still be used before having a client. We will handle that by building a low-cost demo and making the closing ask a CSV export, not a paid commitment.
2. The source classification schema included `tenant_id` in model output. The demo plan correctly removes it. Tenant matching must be deterministic using reply token and sender email; the model must never identify the tenant.
3. The source n8n architecture mentioned Google Sheets and IMAP. The demo plan supersedes both: n8n Data Tables replace Sheets, and Gmail OAuth2 replaces IMAP/app-password email.
4. The source says 120 / 90 / 60 / 30 cohorts, but the actual demo sends only the 90-day soft check-in. The 60- and 30-day windows are board/escalation flags only. No formal renewal offer or legal notice is generated.
5. The detailed demo plan describes "four n8n workflows" but later includes WF5 Daily Sweep, making the actual workflow count five. We will build five workflows.
6. The detailed plan includes current pricing, model IDs, regulations, and vendor facts that may change. Stage 1 explicitly re-verifies model IDs/pricing and account/tool availability before implementation depends on them.
7. Production legal/commercial items are not solved by the demo. n8n license confirmation, DPA, insurance, per-client isolation, data retention, SMS registration, VPS/Caddy/domain setup, and fair-housing policy alignment stay out of the local demo build except where they affect demo architecture.
8. Telegram send-message alerts do not require a public tunnel. A tunnel is only needed if we later add inbound triggers or public webhooks that external services must call into local n8n.
9. The normal AI implementation should use n8n's built-in OpenAI/OpenAI Chat Model nodes with the n8n OpenAI credential and JSON Schema / structured output. HTTP Request is reserved for debugging, unsupported node features, or a one-off model-list smoke test.

## Stage 1 - Local Environment, Accounts, and Tooling

### Goal

Create the local working environment and verify every external dependency before building workflows on top of them.

### In Scope

- Install or verify local Docker and Docker Compose.
- Bring up n8n with Data Tables enabled.
- Configure persistent n8n volume and encryption key.
- Set timezone explicitly, preferably `America/New_York` for the demo.
- Create and test credentials:
  - n8n OpenAI credential using your OpenAI API key
  - Gmail OAuth2 through a Google Cloud project using the local n8n OAuth callback URL
  - Telegram bot token and manager chat ID
- Confirm current callable OpenAI model IDs and record chosen draft/classifier models.
- Start model testing with `gpt-5.6-luna`; fall back to `gpt-5.4-nano`, then `gpt-5.4-mini` for drafting only if needed.
- Confirm the one available non-professional Gmail account works for local send/receive testing.
- Confirm sender/footer details for test emails: sender name, company/persona name, and a clearly demo-safe address placeholder if needed.
- Configure a temporary local tunnel if useful for OAuth callback/webhook testing or for opening the board from another device. Do not use VPS/Caddy for this demo stage.

### Out of Scope

- Building n8n workflows.
- Creating the dashboard.
- Creating real tenant data.
- Any PMS integration.
- SMS or A2P 10DLC setup.
- VPS, Caddy, public domain, SPF/DKIM/DMARC, or production hosting setup.
- Production legal paperwork.

### Verification

- n8n opens at a local URL such as `http://localhost:5678`.
- If a tunnel is used, the tunnel URL reaches the same local n8n instance.
- n8n Data Tables tab is visible.
- n8n OpenAI credential passes a one-token test call through the built-in OpenAI/OpenAI Chat Model node.
- Gmail credential can send a test email to your own inbox from the one available Gmail account.
- Telegram bot can send a test alert to your phone.
- Current draft and classifier model IDs are documented in progress notes.

### Stage Complete When

The local n8n instance is reachable, the required credentials are green, and no downstream stage depends on an unverified account or model.

## Stage 2 - Data Model and Demo Fixtures

### Goal

Create the persistent tables and test data that every workflow will use.

### In Scope

- Create n8n Data Tables:
  - `leases`
  - `outreach_log`
  - `config`
- Define roster-owned fields separately from workflow-owned state fields.
- Populate `config` with manager/company identity, timezone, total demo units, send delay, Telegram chat ID, and selected model IDs.
- Create `roster_demo.csv` with 40 leases representing expirations in the next four months from a 168-unit portfolio.
- Include realistic clean rows across 120 / 90 / 60 / 30-day cohorts, including 14 in the 90-day cohort.
- Include messy rows for ambiguous dates, invalid email domains, missing email, duplicate unit, expired lease, blank lease end date, short tenure, BOM, blank rows, whitespace, and quoted commas.
- Create reply fixture text with the required clear, grievance, leaving, wavering, neighbour, habitability, accommodation, auto-reply, opt-out, unclear, and "staying but asks a question" cases.

### Out of Scope

- CSV upload workflow.
- AI prompt integration.
- Sending email.
- Dashboard UI.

### Verification

- Tables exist with the intended columns and manual read/write works.
- Fixture data has stable expectations:
  - 40 visible lease rows after ingest in the next stage.
  - 14 valid 90-day rows intended for generation.
  - Flagged rows are known in advance.
- Reply fixtures have expected classification outcomes documented.

### Stage Complete When

The data tables and fixture files are ready, and the expected row counts, cohorts, and flagged conditions are written down before ingestion logic is built.

## Stage 3 - WF1 Roster Ingestion

### Goal

Build the CSV upload path and prove it can normalize messy lease data without silently guessing or losing rows.

### In Scope

- n8n Form Trigger for CSV upload.
- Extract From File node for CSV parsing.
- Normalization and validation logic:
  - Clean names and derive `tenant_first_name`.
  - Parse supported date formats.
  - Flag ambiguous dates rather than guessing.
  - Validate email and known typo domains.
  - Compute `days_to_expiry`, `tenure_months`, and cohort.
  - Assign cohort using `lease_end_date` only.
  - Flag but do not drop problematic rows.
  - Generate deterministic `lease_id`.
- Upsert into `leases`.
- Preserve workflow-owned state fields on re-upload:
  - `status`
  - `draft_subject`
  - `draft_body`
  - `ref_token`
  - `sent_at`
  - `opted_out`
- Return upload result with loaded/flagged counts and board link placeholder.

### Out of Scope

- Dashboard rendering beyond a placeholder link.
- Draft generation.
- Email send.
- Reply classification.

### Verification

- Uploading the fixture creates exactly 40 lease rows, not fewer.
- Uploading the same fixture twice still leaves exactly 40 lease rows.
- Known messy rows carry the right `ingest_notes`.
- Invalid or missing emails are visible but excluded from future send eligibility.
- Ambiguous dates land in `cohort=NONE`.
- Duplicate units are kept as separate deterministic lease IDs.
- Manually changing a row to `opted_out=true` and re-uploading does not reset it.
- Manually setting a row to `SENT` and re-uploading does not reset it to `PENDING`.

### Stage Complete When

The ingest workflow is idempotent, preserves state fields, and surfaces every known bad row instead of dropping or guessing.

## Stage 4 - WF2 Dashboard

### Goal

Build the demo board as the main visual surface for the sales call.

### In Scope

- Webhook `GET /board`.
- Read `leases`, `outreach_log`, and `config`.
- Render one self-contained HTML page with inline CSS and JS.
- Pipeline view with 120 / 90 / 60 / 30-day columns.
- Header strip showing:
  - Leases expiring in next four months.
  - 40 of 168 units.
  - Count needing attention.
  - Count in the 90-day window.
- Flagged-row panel for ingest issues.
- Status colors:
  - pending
  - draft ready
  - at risk
  - staying
  - compliance flag
- Approval queue screen structure, even if generation buttons are not wired until Stage 5.
- At-risk feed structure, even if reply handling is not wired until Stage 6.

### Out of Scope

- Actual draft generation.
- Approval state transitions.
- Sending.
- Reply classification.
- Production auth on the board.

### Verification

- Board loads in under one second on the local n8n instance.
- Board renders correctly at desktop screen-share width, especially around 1440px.
- Board is usable on a phone hotspot.
- All 40 leases appear in the expected cohorts/status groups.
- Flagged rows are visible and understandable.
- No external CDN or framework dependency is required.

### Stage Complete When

The board makes the portfolio and messy-data handling legible before any AI or email behavior exists.

## Stage 5 - WF3 Draft, Approval, and Send

### Goal

Build the outbound 90-day check-in workflow with hard human approval and send idempotency.

### In Scope

- Webhook `POST /generate` for the 90-day cohort.
- Read eligible rows:
  - `cohort=90`
  - `status=PENDING`
  - `email_valid=true`
  - `opted_out=false`
- Draft generation using the selected cheap OpenAI model.
- Use n8n's built-in OpenAI/OpenAI Chat Model node with the n8n OpenAI credential and JSON Schema / structured output for `{subject, body}` rather than relying on free-form text and manual JSON parsing.
- Prompt rules:
  - Soft relationship check-in only.
  - No rent, prices, renewal terms, deadlines, notices, lease terms, or legal language.
  - Never address as "Resident."
  - Include first name, tenure reference, one question, manager signoff.
- Deterministic guardrail after model output.
- One retry on guardrail failure, then `REVIEW_FAILED`.
- Store draft subject/body and `ref_token`; set `status=DRAFT`.
- Webhook `POST /approve` for approve, skip, and edit actions.
- Webhook `POST /send`.
- Send only rows currently `APPROVED`.
- Preserve idempotency so double-clicking send does not send duplicates.
- Priority branch for demo recipient row.
- Configurable send delay.
- Gmail send with `[R-xxxx]` token in subject.
- Tenant email body includes the configured sender identity/footer and never looks like a legal notice. For local testing this may be a demo-safe placeholder, not a production-ready company address.
- Dashboard wiring for generate, edit, approve, skip, approve all, and send approved.

### Out of Scope

- Reply reading or classification.
- Daily sweep.
- SMS.
- Production deliverability monitoring.

### Verification

- 14 drafts generate for the 90-day cohort.
- Drafts complete in under 30 seconds for the demo fixture.
- Any two drafts show meaningfully different phrasing, not just swapped names.
- Guardrail blocks banned wording and flags failures.
- Inline edit persists.
- Approve all updates the count correctly.
- Send delivers a real email from the configured test Gmail account with the token intact.
- Demo-priority recipient receives within five seconds.
- Pressing send twice sends exactly one email per approved tenant.

### Stage Complete When

The demo can show the board, generate check-ins, require human approval, and send real tokenized emails without duplicates.

## Stage 6 - WF4 Reply Matching, Classification, and Routing

### Goal

Build the inbound reply loop that turns tenant responses into manager-visible risk alerts without ever auto-answering tenants.

### In Scope

- Two entry points into the same handling path:
  - Gmail Trigger for production-like polling.
  - Webhook `POST /check-replies` for live demo control.
- Shared Gmail search behavior:
  - unread
  - not from self
  - not already processed
- Apply processed label and mark handled messages read.
- Demo operating rule: Gmail Trigger must be deactivated before a live demo, so the manual button does not find an already-consumed reply.
- Match replies by `[R-xxxx]` subject token first, sender email second.
- Unmatched replies route to Telegram and never attach to a tenant automatically.
- Strip quoted threads, signatures, and auto-reply noise.
- Detect auto-replies and log `NO_SIGNAL` without token spend where possible.
- Classify replies using selected cheap OpenAI model and strict schema.
- Use n8n's built-in OpenAI/OpenAI Chat Model node with the n8n OpenAI credential and JSON Schema / structured output for the classifier response.
- Compute `requires_human` in workflow logic, not in the model.
- Route:
  - `OPT_OUT`: set `opted_out=true`, alert, stop.
  - clean high-confidence `STAYING` with no question/grievance/compliance: log and set green status.
  - everything else: Telegram alert and board at-risk status.
- Compliance flags:
  - accommodation request
  - habitability
  - legal threat
  - discrimination concern
  - opt-out
- Telegram alert contains tenant, unit, lease end, days out, verbatim reply, classification badges, suggested human action, and confidence.
- Dashboard at-risk feed updates from `outreach_log`.

### Out of Scope

- Drafting or sending replies to tenants.
- Fuzzy matching beyond token/email fallback.
- Production dead-letter queue.
- SMS.

### Verification

- All reply fixtures route correctly.
- Fixture 2 becomes `GRIEVANCE / MAINTENANCE / HIGH` and turns the board row amber.
- Fixture 7 becomes accommodation/compliance and displays "no response was drafted."
- Fixture 8 is logged as no signal without alert noise.
- Fixture 9 permanently opts out the contact.
- Fixture 11 routes to a human despite positive intent because it contains a question.
- Unmatched reply alerts without assigning to the wrong tenant.
- End-to-end time from "Check replies now" to Telegram alert is under eight seconds.

### Stage Complete When

The live reply moment works reliably, compliance-sensitive replies are escalated, and there is no workflow path that sends an unapproved tenant response.

## Stage 7 - WF5 Daily Sweep, Error Alerts, and Reset

### Goal

Add the operational pieces that make the demo feel alive and recoverable.

### In Scope

- Schedule Trigger at 08:00 in configured timezone.
- Recompute `days_to_expiry` and cohort movement.
- Flag non-responders:
  - `status=SENT`
  - sent more than 15 days ago
  - no reply logged
  - set `ESCALATE`
- Send a one-line Telegram morning digest.
- Error Trigger workflow that alerts you on workflow failures.
- One-click reset-demo workflow:
  - Clear demo Data Tables.
  - Re-import fixture CSV.
  - Clear or reset Gmail processed label state as needed.
- Keep reset workflow demo-only and clearly marked.

### Out of Scope

- Any formal 60-day renewal offer.
- Legal notices.
- Production monitoring heartbeat.
- Postgres migration.
- Real client data retention automation.

### Verification

- Manual daily sweep moves rows between cohorts correctly based on current date.
- Backdated sent rows become `ESCALATE`.
- Sweep sends no tenant emails.
- Error Trigger sends a test Telegram failure alert.
- Reset workflow returns the system to a known demo-ready state.

### Stage Complete When

The demo can be reset quickly, failures alert visibly, and non-response escalation exists as a board flag only.

## Stage 8 - End-to-End Rehearsal and Demo Package

### Goal

Prove the whole demo can run from cold start without improvisation.

### In Scope

- Pre-flight checklist:
  - Deactivate Gmail Trigger before live demo.
  - Set `send_delay_seconds=2`.
  - Confirm prospect/demo-priority row is present.
  - Run reset-demo.
  - Confirm board loads locally.
  - Confirm test email sends and can be found in the test Gmail account.
  - Confirm Telegram bot reachable.
  - Have reply fixtures ready.
  - Have recorded fallback ready.
- Rehearse the full script three times from a cold n8n restart.
- Record a 90-second fallback video of the happy path.
- Export all n8n workflows to JSON.
- Save demo script, fixtures, and workflow exports in the project.
- Update progress notes with exact demo URL, account assumptions, selected models, and known remaining risks.

### Out of Scope

- Production hardening.
- Real client onboarding.
- Real tenant messaging.
- Any paid deployment or external hosting.

### Verification

- Three clean rehearsals in a row.
- Full demo completes in roughly five minutes.
- Priority email arrives within the expected window.
- Reply classification and Telegram alert work every time.
- Recorded fallback is playable.
- Workflow exports can be imported into a fresh local n8n instance.

### Stage Complete When

The demo is ready to run locally with a recorded fallback and documented limits. External prospect-readiness remains a separate production/pre-sales hardening step.

## Deferred Production Scope

Do not build these during the demo stages unless the plan is explicitly revised:

- PMS API integrations.
- SMS delivery.
- Client-owned 10DLC registration.
- VPS, Caddy, public HTTPS domain, and production DNS/email authentication.
- Maintenance-history correlation.
- Reply-loop closure tracking.
- Owner-facing quarterly reporting.
- Per-client isolation.
- Postgres-backed audit/event storage.
- Dashboard authentication.
- Production retention/deletion automation.
- DPA, insurance, and formal commercial/legal package.
- n8n license confirmation for hosted paid client operations.

## Session Operating Rule

At the start of each future build session:

1. Read `progress-notes.md`.
2. Confirm the requested stage.
3. Read the relevant section of this plan.
4. Build only that stage unless the user explicitly expands scope.
5. Verify the stage.
6. Update `progress-notes.md` with completion status, deviations, and remaining issues.
