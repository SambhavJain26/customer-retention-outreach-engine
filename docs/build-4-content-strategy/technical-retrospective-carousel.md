# Technical retrospective: pre-renewal check-in loop

Created: 2026-10-19
Status: copy draft for review. No carousel artwork, PDF, publication or queue placement yet.

## Editorial direction

- **Audience:** builders and people hiring for automation, n8n, integration and applied AI roles. Property management supplies the use case; the engineering decisions carry the post.
- **Format:** one LinkedIn document carousel, 11 slides, plus the caption below.
- **Document title:** `How I built a pre-renewal check-in loop` (39 characters).
- **Framework:** adapted technical walkthrough, moving from scope and architecture to controls, defects, evidence and next changes. This is a retrospective, not a step-by-step setup tutorial or a customer case study.
- **Scope:** the committed v2 build and recorded synthetic tests. Proposed changes on slide 11 are explicitly future work.
- **Relationship to existing posts:** the validation and Skip defects also have individual posts. Here they explain the surrounding architecture; their full incident narratives are not repeated. This is an additional post, not a replacement or a numbered addition to the existing queue.

## LinkedIn caption

> I built a pre-renewal check-in loop in n8n. Two of the bugs I found involved an editable field and a Skip button.
>
> The editable field let a manager change a message after the wording checks had passed. Skip could reset someone who had already been emailed, making them eligible for another check-in later.
>
> Both sat around the AI calls, in the ordinary workflow logic that decided what could happen next.
>
> This carousel walks through the whole build: n8n for orchestration, Airtable for state, Telegram for manager actions, Gmail for resident communication, and OpenAI for drafting and classification. It covers where I used fixed rules, why every outbound message needs individual approval, and how those failures changed the implementation.
>
> It also covers what I'd change before a real deployment. Refusing a second approval after a successful send is useful evidence. It doesn't establish that two concurrent executions, or a crash between sending and recording the result, are safe.
>
> This is a local demo tested with 40 synthetic residents and real service integrations. There is no client deployment or measured improvement in renewals. The evidence is about the mechanism, and the remaining gaps are part of the story.

## Carousel copy

Only the Title, Body and Footer fields below are public slide copy. Visual directions are production notes, not additional text to squeeze onto the page.

### Slide 1

**Title:** How I built a pre-renewal check-in loop

**Body:** Five n8n workflows for drafting check-ins, reviewing messages and routing replies. The architecture, the bugs I found, and what I'd change before deployment.

**Footer:** Technical retrospective · Local demo · Synthetic residents

**Visual:** restrained cover. Give the title the most space; do not lead with an unreadable workflow screenshot.

### Slide 2

**Title:** Start with a small, testable job

**Body:** Draft a check-in around 90 days before a lease ends. Let a manager review it. Match the reply, surface unresolved issues, and track closure. Cohorts come from lease end dates alone. The build doesn't generate renewal offers, price rent or predict who will stay.

**Footer:** Scope · Every resident-facing message needs approval

**Visual:** four labeled steps: select → draft and review → match reply → track issue. Keep the approval step visible.

### Slide 3

**Title:** Give each workflow a clear job

**Body:** I used self-hosted n8n in Docker. Airtable holds state and visible records; Telegram handles manager actions; Gmail carries resident email. The five workflows own actions, outreach, replies, daily operations and polling. I replaced an earlier custom HTML interface with Airtable and Telegram.

**Footer:** Implemented architecture · Five workflows

**Visual:** use the following diagram labels. Airtable connects to the workflows as shared state, not as an extra stage after sending. Show OpenAI beside drafting and classification only.

```text
Outreach → draft → Telegram review → action router → Gmail
Gmail reply → matching and classification → Airtable + manager alert
Daily operations + polling → refresh state and check for replies
```

### Slide 4

**Title:** Keep identity outside the model

**Body:** OpenAI drafts wording and returns structured reply classifications. Fixed rules select cohorts, flag sensitive replies and determine routing. Reply matching uses the [R-xxxx] subject token, then an exact normalized email match. If neither matches, the workflow alerts the manager without assigning a resident.

**Footer:** AI drafts and classifies · Code matches identity

**Visual:** two columns, “Model” and “Fixed logic.” Put the reference token under fixed logic. No invented confidence or accuracy score.

### Slide 5

**Title:** Make approval part of the send path

**Body:** Across 88 nodes, one Gmail node sends resident messages. It sits in the Telegram action workflow. Outreach generates drafts; reply handling reads and classifies. Check-ins, suggested replies and fix-confirmations each require a manager action before reaching that send node.

**Footer:** Measured from the committed workflow exports

**Visual:** highlight the single send node within a simplified action branch. An actual canvas crop can support it later; the export audit is the source of the count.

### Slide 6

**Title:** The wording check happened too early

**Body:** I checked the generated draft, then left it editable. A manager could change the wording before approval, so the original check no longer described the message being sent. I added the same guardrails to the approval path, checking the stored wording used for that send.

**Footer:** Defect → fix · Validate after edits, before the action

**Visual:** show the original gap: draft → check → edit → send. Below it, show the added check after editing. Label these as simplified flow diagrams.

### Slide 7

**Title:** Skip could undo a completed send

**Body:** Skip had no status guard. Used on an already-sent record, it reset the status and cleared the draft, making that resident eligible for a later check-in. I restricted Skip to pending review states. The sent record now stays intact and the action returns a refusal.

**Footer:** Defect → fix · Check every state-changing control

**Visual:** a small state transition: SENT → Skip → refused. Keep the original failure separate and label it “Before the fix.”

### Slide 8

**Title:** A posted approval card had no buttons

**Body:** The Telegram message arrived, but its controls were missing. I had passed reply_markup as a JSON string in additionalFields. The n8n node expected a top-level replyMarkup setting and structured buttons. I changed each card layout to use that node structure with expression-driven callback data.

**Footer:** Integration defect · Inspect the delivered result

**Visual:** a compact before/fix comparison using the exact field names. Do not expose chat identifiers, callback values or credentials.

### Slide 9

**Title:** Keep the workflows reproducible

**Body:** Builder scripts generate the workflow JSON and inline shared JavaScript libraries. Committed exports contain placeholders; the import helper resolves local IDs and credentials. That lets me reuse cohort, guardrail and routing logic while keeping an editable, reviewable export of each workflow in Git.

**Footer:** Libraries → builders → workflow JSON → local import

**Visual:** a four-step build pipeline. Show placeholder examples only, never an environment file or credential export.

### Slide 10

**Title:** Test the paths that should do nothing

**Body:** Recorded tests used 40 synthetic residents and real Gmail, Telegram, OpenAI and Airtable. Fourteen drafts passed wording checks. A repeated check-in approval sent nothing; Skip on a sent record was refused; a reply matched by token; an unmatched reply alerted without assigning anyone. These are mechanism checks, not renewal results.

**Footer:** Recorded synthetic tests · No client deployment

**Visual:** a compact check/result record. If screenshots are added, reuse the reviewed public work-sample assets and preserve synthetic-test labels. No fresh-run claim.

### Slide 11

**Title:** What I'd change before deployment

**Body:** I'd add an atomic send claim and recovery for cases where email succeeds but the state write fails. I'd paginate Airtable reads, process reply backlogs, and test concurrent approvals and provider timeouts. The demo checks one reply per run and reads one page per table. Those limits need explicit work.

**Footer:** Proposed work · Review the send-and-record gap in your own workflow

**Visual:** three groups: send integrity, backlog handling and failure testing. Distinguish planned controls from implemented behavior. Do not depict a production deployment as complete.

## Evidence and copy checks

This appendix is internal. It must not appear in the published PDF.

| Claim | Source checked | Boundary |
|---|---|---|
| Five workflows, 88 nodes, one resident send node | Parsed `n8n-workflows/wf6-telegram-router.json` through `wf10-auto-check.json`: 25 + 21 + 21 + 18 + 3; Gmail operations are one `send` in WF6 and one `getAll` in WF8 | Export inspection, not a claim about every possible runtime configuration |
| Architecture and removal of custom HTML interface | `progress-notes.md`, Stage 9 revisions; `docs/build-technical-notes.md`; v2 builders | Airtable is this demo's state store. Do not import Build 5's Postgres/mirror architecture |
| Deterministic selection, matching and routing | `scripts/v2/cadence-lib.js`, `scripts/stage-6-reply-lib.js`, `scripts/v2/build-wf8-replies.js` | Model output does not select resident identity; schema validation does not prove semantic accuracy |
| Guardrails on the send path | `scripts/v2/build-wf6-router.js`, `Apply Action`, and shared guard functions | Validates the record loaded for the action; do not imply transactional locking against concurrent edits |
| Skip refusal | `scripts/v2/build-wf6-router.js`, `Decide Action`: only `AWAITING_APPROVAL` / `REVIEW_FAILED` allowed | Earlier versions allowed the destructive transition; a delayed duplicate was a consequence identified, not a claimed real resident incident |
| Telegram card defect | `progress-notes.md` 2026-08-21; `scripts/v2/workflow-common.js`; `docs/build-technical-notes.md` | Historical local integration defect, not an assertion about every Telegram API client |
| Generated exports and placeholders | `scripts/v2/build-wf*.js`, `scripts/v2/workflow-common.js`, `scripts/v2/import-v2-workflows.js` | No actual local identifier, token or address in public copy |
| Recorded synthetic verification | `progress-notes.md`, current status and 2026-10-10 preserved execution evidence; `docs/build-technical-notes.md` | No services reset, no new send or fresh end-to-end run for this writing task; 14/14 wording checks are not classifier accuracy |
| Single-page workflow reads and one reply per run | `scripts/v2/workflow-common.js`, `airtableListNode`; `scripts/v2/build-wf8-replies.js`, candidate selection | The separate setup/helper Airtable client does paginate; the limit described is the workflow read path |
| Atomic claim and uncertain-send recovery are future work | WF6 reads status, sends through Gmail, then writes state/log; `docs/production-blueprint.md` proposed send controls | A sequential second-tap refusal does not prove concurrency or crash safety. No exactly-once delivery claim |

Editorial review: first person, US spelling, no em dashes or exclamation points in public copy; all metrics labeled as synthetic mechanism evidence; no legal claims, savings claims, client outcomes or invented new tests. Suggested drafting remains available for sensitive categories, with manager approval required. No new durable repository command or workaround was introduced.

## Production handoff after copy review

- Keep the architecture and state transitions readable on mobile. Use diagrams and short records rather than shrinking full n8n canvases.
- Retain the existing carousel visual language when artwork is commissioned. Avoid introducing a new style for this technical post by default.
- Keep disclosure footers visible. Reviewer notes, local paths, source names and this appendix are not public slide copy.
- Decide queue placement separately after the copy is reviewed. Do not silently change the existing posting order.
