# Repository Guidelines (Claude Code)

This file is the Claude Code counterpart of `AGENTS.md`. Both files carry the same guidance; `AGENTS.md` is the Codex-facing copy. Keep them in sync — any rule added to one must be added to the other.

This repository is the planning and implementation workspace for a local-first n8n pre-renewal retention automation demo. Treat it as an automation project, not a SaaS app or compiled software product. Core behavior will live in n8n workflow exports, n8n Data Tables, synthetic fixtures, a demo board, prompts/schemas, and helper scripts.

## Read Order And Authority

Before making changes, read:

1. `progress-notes.md`: current status, locked decisions, deviations, and open items.
2. `build-plan.md`: staged implementation plan and verification gates.
3. `renewal-retention-demo-build-plan.md`: detailed demo/workflow spec.
4. `04-renewal-retention-loop.md` and `foundation-4-renewals-retention.md`: problem and domain background.

If documents conflict, prefer the newest decision in `progress-notes.md`, then update stale docs rather than guessing.

## Project Structure

Current files are planning docs only. When implementation begins, use:

- `n8n-workflows/`: importable workflow JSON exports. v2 is `wf6-telegram-router.json` (the only Telegram Trigger), `wf7-outreach.json`, `wf8-replies.json`, `wf9-ops.json`, and optional `wf10-auto-check.json`.
- `scripts/v2/`: the v2 build. Libraries are inlined into Code nodes by the `build-wf*.js` scripts; committed workflow JSON keeps placeholder ids only.
- `scripts/stage-3/5/6/7-*-lib.js`: verified v1 logic still reused by v2 for cohorts, guardrails, reply routing, and sweep rules. Do not delete.
- `fixtures/`: demo roster CSVs, reply fixtures, expected outcomes.
- `prompts/`: drafting and classification prompts/schemas if kept outside workflow JSON.
- `scripts/`: setup, import/export, reset, and verification helpers.
- `docs/`: runbooks, demo notes, production caveats.
- `tmp/` and `data/`: generated local artifacts only; keep ignored once created.

Use lowercase hyphenated filenames. Use `snake_case` for Data Table columns and JSON fields unless an external API requires otherwise.

## Local Services And Commands

Expected local service: n8n at `http://localhost:5678`. Use a temporary HTTPS tunnel when useful for callback/webhook testing or viewing the board from another device. Do not use VPS, Caddy, domains, or production DNS/email authentication during the local demo build.

Useful commands:

- `rg --files`: list files quickly.
- `rg "term" .`: search docs and future source.
- `Get-Content -Raw <file>`: read docs without truncation.
- `git status --short`: check changed/untracked files before and after work.
- `git log --oneline -5`: inspect recent commit style once history exists.
- `docker images`: check local images before pulling.
- `docker compose config`: validate Compose configuration.
- `docker compose ps`: inspect services.
- `docker compose logs n8n`: inspect n8n failures.
- `docker compose up -d --force-recreate n8n`: recreate n8n after environment, webhook, or tunnel URL changes.
- `node scripts/v2/seed-airtable-demo.js`: reset Airtable to the clean 40-resident demo state.
- `node scripts/v2/start-tunnel.js`: re-establish the public tunnel, repoint n8n, and recreate the container.
- `node scripts/v2/setup-airtable-schema.js`: create the demo tables and fields in an empty base.
- `node scripts/v2/build-wf<n>-*.js`: regenerate a workflow export after changing a shared library.
- `node scripts/v2/import-v2-workflows.js [name ...]`: substitute local ids and import/activate in n8n.
- `node concept-brief/scripts/render-brief.cjs [--data <prospect.json>]`: render 4-page square solution brief and run automated QA checks.
- `.\scripts\verify-stage-1.ps1`: verify Docker, Compose config, and local n8n reachability.

Do not assume package managers, Docker images, API keys, Gmail OAuth credentials, Telegram bots, OpenAI credentials, tunnels, or n8n credentials already exist.

## Architecture Rules

- n8n orchestrates workflows; **Airtable** holds demo state and is the manager's visible surface.
- Airtable replaced n8n Data Tables in Stage 9 by explicit plan revision. Do not use Google Sheets, Supabase, external Postgres, PMS APIs, SMS, or community nodes unless the plan is revised again.
- There is no HTML board. Telegram is the action surface: every approval, edit, reply, and resolution happens through inline buttons or a slash command.
- Airtable access uses HTTP Request nodes with the predefined `airtableTokenApi` credential so writes batch ten records per request. OpenAI still uses the built-in node.
- Use the n8n OpenAI credential and built-in OpenAI/OpenAI Chat Model nodes with JSON Schema / structured output. Do not use HTTP Request for normal OpenAI calls unless a required built-in feature is missing or debugging needs raw errors.
- Test `gpt-5.6-luna` first for drafting and classification; fall back to `gpt-5.4-nano`, then `gpt-5.4-mini` for drafting only if quality requires it.
- Gmail OAuth2 is the email path. One non-professional Gmail account is acceptable for local testing.
- Telegram is for manager alerts. Send-message alerts do not require a tunnel; Telegram Trigger/inbound webhooks do.
- Never generate legal notices, renewal offers, or rent-increase notices.
- **No resident-facing message is ever sent automatically.** OpenAI may draft a check-in, a reply, or a fix-confirmation for any category, but a manager must approve each individual message before it leaves. The guarantee is "never without a human", not "never replies".
- Guardrails run again at send time against whatever Airtable currently holds, because a manager may have edited the wording after it was drafted.
- Cohort membership must be deterministic from `lease_end_date` only.
- The model must never emit or decide `tenant_id`; match replies deterministically by `[R-xxxx]` token, then sender email.

## n8n Workflow Rules And Gotchas

Prefer editable workflow JSON exports over undocumented manual UI-only changes. Name every node descriptively; avoid defaults like `Code`, `If`, or `OpenAI`.

Use credentials by name only. Never hardcode OpenAI keys, Gmail tokens, Telegram bot tokens, tunnel URLs, or real emails in workflow JSON.

Known gotchas to account for:

- The n8n Telegram node takes `replyMarkup` as a top-level enum and reads buttons from a fixed collection. It ignores a JSON string in `additionalFields.reply_markup`, so a card built that way posts with no buttons. Keep one Telegram node per card layout and drive `callback_data` with an expression.
- Telegram allows one webhook per bot, so only one Telegram Trigger may be active. Every button and command enters through WF6.
- `callback_data` is capped at 64 bytes. Short action prefixes plus an Airtable record id stay around 22 bytes.
- Telegram bakes the keyboard into a message at send time. Redeploying never updates an old card; re-trigger to get fresh buttons.
- `n8n publish:workflow` re-activates a workflow, undoing `update:workflow --active=false`. Skip publish for anything meant to stay inactive.
- CLI activation changes need an n8n restart to take effect.
- The Airtable Meta API cannot create formula, rollup, lookup, or count fields. Derived values are plain fields written by n8n.
- Airtable allows 5 requests/second per base and 10 records per write; batch accordingly.
- This demo sends and receives on one Gmail mailbox, so Gmail marks the outbound check-in read immediately. Never detect replies by unread state; match on a `Re:` subject carrying the `[R-xxxx]` token and skip message ids already logged.
- cloudflared quick tunnels get a new hostname every run and n8n only reads `WEBHOOK_URL` at container start. Run `node scripts/v2/start-tunnel.js` after any tunnel or Docker restart, then re-import WF6.
- When generating n8n Code nodes from a builder script, avoid backticks and `
` escapes inside template literals; they are consumed before reaching the node. Validate every generated Code node by parsing it before importing.

- Active webhooks may use the active workflow snapshot, not the editor draft.
- Imported Webhook/Form Trigger nodes may register under generated paths; verify actual URLs after import.
- Form Trigger submissions can produce generic keys like `field-0`; normalize before Data Table or AI steps.
- Direct scripted Form submissions must use `multipart/form-data`.
- Respond to Webhook status-code expressions can be unreliable; use separate literal-status Respond nodes when status matters.
- Strict IF nodes require booleans; normalize truthy strings in Code nodes before routing.
- Code nodes may not have reliable `$env`/`process.env`; prefer config table values or import-time substitution.
- AI structured output may be wrapped; downstream Code should handle wrapped and direct JSON shapes.
- Docker Compose `restart` may not apply changed environment variables; recreate the n8n container when changing webhook/tunnel settings.
- After n8n restart, active webhook registration can lag; verify with a real HTTP probe or execution record.
- In PowerShell, piping JSON into native commands can introduce a UTF-8 BOM. If workflow import fails at the first character, check encoding or import through a BOM-safe path.
- In PowerShell, piping a raw string into `ConvertTo-Json` can wrap it as `{ "value": "..." }`. When embedding fixture text into workflow Code nodes, read the file text explicitly and call `ConvertTo-Json -InputObject $text`.
- In PowerShell helper functions, `ConvertFrom-Json` array results can cross function boundaries as one nested `Object[]`. Flatten webhook/Data Table responses explicitly before counting rows.
- The current local `n8nio/n8n:latest` image may log a Python task runner warning because Python 3 is not present. This is acceptable for the demo as long as workflows use JavaScript Code nodes and n8n remains healthy.
- Running `n8n execute` inside the already-running n8n container can fail because the task broker port is already in use. For CLI smoke tests, stop the service container, run `docker compose run --rm --no-deps n8n execute --id=<workflow-id> --rawOutput`, then start n8n again.
- In this local n8n `2.29.10` setup, Data Table nodes may report the module as disabled under one-off CLI `n8n execute` even when `N8N_ENABLED_MODULES=data-table` is set. Use active temporary webhook workflows against the running n8n service for Data Table setup/verification.
- In n8n `2.29.10`, `gpt-5.6-luna` works through the built-in OpenAI Responses operation, but it rejects `temperature`; omit that option. The Responses API also rejects `max_output_tokens` below `16`.
- The bundled Playwright package may not have its managed Chromium executable installed. For local dashboard/browser smoke tests, use the system Chrome executable at `C:\Program Files\Google\Chrome\Application\chrome.exe` when present.
- An Airtable `401 UNAUTHORIZED` during `demo-start.js` means the configured PAT needs renewal. The reset stops before clearing rows when its first Airtable read fails; do not describe an older populated base as a fresh run.
- n8n's editor may show an autosave error after Tidy Up. Verify the live layout visually before capture, and keep workflow exports as the source of truth until a layout save is confirmed.
- Before capturing an n8n canvas for a public PDF, dismiss any feedback or modal overlay and inspect the screenshot itself. An overlay can dim every node while leaving the workflow visible; recapture after the editor returns to normal brightness. Keep the chosen dark theme.
- Carousel Fontshare requests can return Switzer while omitting Zodiak when both families share one CSS URL. Use separate family stylesheet links and verify the actual embedded fonts; a successful render can silently use a fallback serif. The technical retrospective uses the shared `.technical` layout and preserves Markdown slide fields through `node carousel-kit/scripts/build-technical-retrospective.cjs`.
- For the technical retrospective carousel, use the maintenance-triage `carousel-kit` references for prominent, meaning-led paired annotations. The user's October 19 direction allows every annotation shape in blue or yellow/gold, including interior selection boxes; older fixed-color and cover-only rules do not override it. Aim the copy at AI-engineer hiring with actual schema, validation, failure-routing and evaluation details, and distinguish synthetic integration checks from classifier accuracy or production readiness.
- For work-sample capture, inspect the saved raster: a browser screenshot clip may return the wrong origin. Capture the full viewport and crop the actual pixels when needed. Use native-zoom branch captures rather than enlarging small overview images. Rebuild the public PDF with `python scripts/render-work-sample.py` and verify its flattened assets, text and metadata with `python scripts/verify-work-sample.py`; visually inspect every page as well.
- Stage 6 reply timing slows as local `outreach_log` fixture residue grows because the POC duplicate check reads log rows from Data Tables. Run the Stage 7 reset path, or clear demo log rows with verifier-owned temporary workflows, before rehearsing strict timing.

## Testing And Verification

Each stage in `build-plan.md` has required verification checks. Do not mark a stage complete in `progress-notes.md` until those pass.

Core invariants:

- Re-uploading a roster must not reset workflow-owned fields such as `status`, `sent_at`, `ref_token`, or `opted_out`.
- Messy rows are flagged, never silently dropped.
- Double-clicking send must not duplicate emails.
- Clean `STAYING` replies can log green only when high-confidence, no grievance, no compliance flag, and no question.
- Accommodation, habitability, legal, discrimination, opt-out, unclear, and low-confidence replies route to a human.
- OpenAI failure must fail visible, not quiet.
- A second tap on an approve/send button must never produce a second email.
- Skip must refuse on a resident who has already been sent to.
- Edited wording must pass the same guardrails as generated wording.

Record checks, failures, token/cost notes, and deviations in `progress-notes.md`.

## Security And Configuration

Never commit `.env`, credentials, real tenant/client data, prospect CSVs, tunnel URLs, Telegram tokens, Gmail tokens, OpenAI keys, or n8n credential exports. Use placeholders in examples.

Reset scripts must wipe fixture/demo data only. Never run reset/delete logic against client infrastructure, production workflows, or real tenant data.

## Completion Guidelines

Before finishing implementation work, decide whether the task exposed a durable command, workaround, gotcha, or rule. If yes, update both `CLAUDE.md` and `AGENTS.md` (keeping them identical in substance) and `progress-notes.md`.

After every completed task, commit and push changes to `main` unless the user explicitly says not to. Use short imperative or conventional commit messages, for example `docs: update tunnel guidance` or `feat: add wf1 ingest export`. If push fails because no remote or authentication is configured, report that clearly and include the local commit hash if a commit was created.
