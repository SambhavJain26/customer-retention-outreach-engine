# Repository Guidelines

This file is the Codex counterpart of `CLAUDE.md`. Both files carry the same guidance; `CLAUDE.md` is the Claude Code-facing copy. Keep them in sync — any rule added to one must be added to the other.

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

- `n8n-workflows/`: importable workflow JSON exports, named `wf1-ingest.json`, `wf2-dashboard.json`, etc.
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
- `.\scripts\reset-demo.ps1`: restore the 40-row synthetic demo fixture through WF5 before or after a rehearsal.
- `.\scripts\verify-stage-1.ps1`: verify Docker, Compose config, n8n container status, local HTTP reachability, and n8n version for Stage 1.
- `Get-Content -Raw .\n8n-workflows\<file>.json | ConvertFrom-Json | Out-Null`: validate workflow JSON.

Do not assume package managers, Docker images, API keys, Gmail OAuth credentials, Telegram bots, OpenAI credentials, tunnels, or n8n credentials already exist.

## Architecture Rules

- n8n orchestrates workflows; n8n Data Tables are demo state.
- Do not use Google Sheets, Airtable, Supabase, external Postgres, PMS APIs, SMS, or community nodes for the demo unless the plan is explicitly revised.
- Use the n8n OpenAI credential and built-in OpenAI/OpenAI Chat Model nodes with JSON Schema / structured output. Do not use HTTP Request for normal OpenAI calls unless a required built-in feature is missing or debugging needs raw errors.
- Test `gpt-5.6-luna` first for drafting and classification; fall back to `gpt-5.4-nano`, then `gpt-5.4-mini` for drafting only if quality requires it.
- Gmail OAuth2 is the email path. One non-professional Gmail account is acceptable for local testing.
- Telegram is for manager alerts. Send-message alerts do not require a tunnel; Telegram Trigger/inbound webhooks do.
- Never generate legal notices, renewal offers, rent-increase notices, or auto-replies to tenants.
- Cohort membership must be deterministic from `lease_end_date` only.
- The model must never emit or decide `tenant_id`; match replies deterministically by `[R-xxxx]` token, then sender email.

## n8n Workflow Rules And Gotchas

Prefer editable workflow JSON exports over undocumented manual UI-only changes. Name every node descriptively; avoid defaults like `Code`, `If`, or `OpenAI`.

Use credentials by name only. Never hardcode OpenAI keys, Gmail tokens, Telegram bot tokens, tunnel URLs, or real emails in workflow JSON.

Known gotchas to account for:

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

Record checks, failures, token/cost notes, and deviations in `progress-notes.md`.

## Security And Configuration

Never commit `.env`, credentials, real tenant/client data, prospect CSVs, tunnel URLs, Telegram tokens, Gmail tokens, OpenAI keys, or n8n credential exports. Use placeholders in examples.

Reset scripts must wipe fixture/demo data only. Never run reset/delete logic against client infrastructure, production workflows, or real tenant data.

## Completion Guidelines

Before finishing implementation work, decide whether the task exposed a durable command, workaround, gotcha, or rule. If yes, update both `AGENTS.md` and `CLAUDE.md` (keeping them identical in substance) and `progress-notes.md`.

After every completed task, commit and push changes to `main` unless the user explicitly says not to. Use short imperative or conventional commit messages, for example `docs: update tunnel guidance` or `feat: add wf1 ingest export`. If push fails because no remote or authentication is configured, report that clearly and include the local commit hash if a commit was created.
