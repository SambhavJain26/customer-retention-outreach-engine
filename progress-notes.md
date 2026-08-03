# Pre-Renewal Retention Loop - Progress Notes

Last updated: 2026-08-04

## Current Status

Planning phase complete. No implementation code, workflows, services, or demo fixtures have been built yet.

## Source Context Read

- `04-renewal-retention-loop.md`
- `foundation-4-renewals-retention.md`
- `renewal-retention-demo-build-plan.md`

## Approved Build Direction

Pending user approval.

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
| 1 | Local Environment, Accounts, and Tooling | Not started | Verify local n8n, optional tunnel, Data Tables, n8n OpenAI credential, Gmail OAuth2, Telegram. VPS/Caddy/domain deferred. |
| 2 | Data Model and Demo Fixtures | Not started | Create Data Tables, config, roster fixture, reply fixtures. |
| 3 | WF1 Roster Ingestion | Not started | CSV upload, normalization, validation, idempotent upsert. |
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

## Next Step

Wait for user approval or edits to `build-plan.md`. After approval, start Stage 1 only.
