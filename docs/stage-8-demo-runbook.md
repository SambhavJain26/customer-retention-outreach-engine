# Stage 8 Demo Runbook

Last updated: 2026-08-04

This is the local proof-of-concept runbook for the renewal-retention demo. It assumes n8n is running at `http://localhost:5678`, Data Tables are enabled, and local credentials named `OpenAI account`, `Gmail account`, and `Telegram account` already exist.

## Pre-Flight Checklist

Run this before every live rehearsal or prospect call:

1. Confirm Docker Desktop is running.
2. Run `docker compose ps` and confirm the `n8n` service is healthy enough to answer `http://localhost:5678/healthz`.
3. Import/activate the demo workflows if this is a fresh local instance:
   - `.\scripts\setup-stage-2-data-tables.ps1`
   - `.\scripts\import-wf1-ingest.ps1`
   - `.\scripts\import-wf3-draft-approve-send.ps1`
   - `.\scripts\import-wf4-reply-classify-route.ps1`
   - `.\scripts\import-wf5-daily-sweep-reset.ps1`
   - `.\scripts\import-wf2-dashboard.ps1`
4. Confirm no active Gmail Trigger is present. WF4 uses manual `/check-replies` for the demo and optional Gmail unread search, not a polling trigger.
5. Run `POST http://localhost:5678/webhook/reset-demo`.
6. Open `http://localhost:5678/webhook/board` and confirm the board loads with 40 lease rows.
7. Confirm the demo-priority row is Avery Brooks and uses the local `config.demo_recipient_email`.
8. Keep Telegram visible, but keep phone audio silent.
9. Open `fixtures/reply-fixtures.md` and keep fixture 2 and fixture 7 ready.
10. Keep this runbook open as the fallback artifact.

## Five-Minute Script

1. Open the board.
   - Say: "This is an export of leases coming up in the next four months, not the whole portfolio."
   - Show the 120/90/60/30 windows and the flagged-row panel.

2. Click `Generate check-ins for the 90-day window`.
   - Say: "This is not a renewal offer. It is a soft check-in before the renewal conversation."
   - Switch to the approval queue.

3. Review one or two drafts.
   - Say: "Nothing sends until a manager approves it."
   - Use `Approve all` for the demo.

4. Click `Send approved`.
   - The demo-priority email should arrive first.
   - Say: "The prospect row is prioritized so the live inbox moment is fast."

5. Run the reply moment.
   - Preferred live path: ask the prospect to reply from their inbox.
   - Deterministic fallback path: call `/check-replies` with fixture 2.
   - Show the Telegram alert and the board row moving to at risk.

6. Run the compliance moment.
   - Use fixture 7.
   - Show: "Routed to you. No response was drafted."
   - Say: "The system finds issues. It does not answer tenants."

7. Close with the CSV ask.
   - Say: "Send me your next-quarter expiring leases as a CSV: name, unit, lease end, move-in date, and email. No financials, no screening data, no system access."

## Failure Recovery

- If OpenAI generation fails, switch to any already-generated draft rows and explain that the approval gate is the product boundary.
- If Gmail send fails, show the send state and continue with the manual reply fixture path; classification is the stronger demo moment.
- If Telegram fails, show the board state changing to at risk and explain that Telegram is a notification channel, not the source of truth.
- If the live reply does not match, show the unmatched alert and explain that the workflow refuses to attach replies to the wrong tenant.
- If the board does not load, use `http://localhost:5678/webhook/board` locally and this runbook as the fallback walkthrough.

## Docs-Only Fallback

No video artifact is produced for Stage 8 because no recorder is installed on PATH and the chosen POC scope is docs-only. The fallback is:

1. This runbook.
2. The committed workflow exports in `n8n-workflows/`.
3. The committed fixtures in `fixtures/`.
4. The reproducible verifier `.\scripts\verify-stage-8.ps1`.
5. The generated local package in `tmp/stage-8-demo-package/` after running `.\scripts\package-stage-8-demo.ps1`.

## Limits To Say Out Loud

- It does not predict renewals.
- It does not handle rent, legal notices, renewal offers, or signatures.
- It does not auto-reply to tenants.
- It does not integrate with a PMS in this POC.
- It uses synthetic fixture data until a client sends a CSV export.
- It is local-first demo infrastructure, not production hosting.
