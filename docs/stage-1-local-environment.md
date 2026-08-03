# Stage 1 Local Environment Runbook

This stage creates the local n8n runtime only. It does not create workflows, Data Table schemas, fixtures, dashboard pages, or tenant-facing sends.

## Local Runtime

1. Copy `.env.example` to `.env`.
2. Replace `N8N_ENCRYPTION_KEY` with a unique random value:

   ```powershell
   [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
   ```

3. Start n8n:

   ```powershell
   docker compose up -d
   ```

4. Open `http://localhost:5678`.
5. Confirm the Data Tables tab is visible.

The Compose file intentionally uses local HTTP settings:

- `N8N_HOST=localhost`
- `N8N_PROTOCOL=http`
- `WEBHOOK_URL=http://localhost:5678/`
- `N8N_EDITOR_BASE_URL=http://localhost:5678/`
- `N8N_SECURE_COOKIE=false`
- `GENERIC_TIMEZONE=America/New_York`
- `N8N_ENABLED_MODULES=data-table`

Do not switch this stage to VPS, Caddy, public DNS, or production email authentication.

## Verification Helper

Run:

```powershell
.\scripts\verify-stage-1.ps1
```

The script verifies Docker, Docker Compose, Compose syntax, container status, local n8n reachability, and the n8n CLI version. UI-only checks and credential checks must still be completed manually in n8n.

For CLI-executed smoke workflows, stop the running n8n service first and execute through a one-off Compose container. Running `n8n execute` inside the already-running service container can fail because the task broker port is already in use.

## Credentials To Create In n8n

Create credentials by name only. Never export or commit credential JSON.

- OpenAI credential using the OpenAI API key.
- Gmail OAuth2 credential using the demo Gmail account.
- Telegram credential using the BotFather token.

For local Gmail OAuth2, use the callback URL shown by n8n. With the default local setup, expect:

```text
http://localhost:5678/rest/oauth2-credential/callback
```

## Sender Identity

Use the available demo Gmail account for local testing. Set the Gmail display name to:

```text
Harborview Property Management
```

Use a demo-safe footer placeholder in later email templates. Do not present the local Gmail sender as production-ready.

## Telegram Check

1. Create a bot with BotFather.
2. Message the bot from the manager phone/account.
3. Capture the manager chat ID using Telegram `getUpdates` or an n8n Telegram node test.
4. Send one test alert from n8n.

Store the manager chat ID in local `.env` only:

```env
TELEGRAM_MANAGER_CHAT_ID=
```

## OpenAI Model Check

Official OpenAI docs currently list `gpt-5.6-luna` as the GPT-5.6 cost-sensitive model, with short-context Standard pricing of `$0.20` input and `$1.20` output per 1M tokens.

Stage 1 must still verify account-level access through n8n before workflows depend on it:

- Test `gpt-5.6-luna` first for drafting and classification.
- If unavailable, test `gpt-5.4-nano`.
- Use `gpt-5.4-mini` for drafting only if cheaper draft quality fails in Stage 5.

In n8n `2.29.10`, the OpenAI Responses operation successfully calls `gpt-5.6-luna`, but the model rejects `temperature`, and `max_output_tokens` must be at least `16`.

Record the callable model IDs and pricing check date in `progress-notes.md`.

## Gmail Smoke Test

Store the local smoke-test recipient in `.env` only:

```env
STAGE1_TEST_EMAIL=
```

For the local demo, this can be the same Gmail account used as the sender.
