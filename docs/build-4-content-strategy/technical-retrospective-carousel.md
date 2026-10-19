# Technical retrospective: an AI workflow with human approval

Created: 2026-10-19. Revised after public-copy review: 2026-10-20.
Status: rendered draft for review. Not published or added to the posting queue.

Review PDF: `carousel-kit/out/technical-retrospective-renewal-retention.pdf`.
Contact sheet: `carousel-kit/out/technical-retrospective-preview.png`.
Editable HTML: `carousel-kit/technical-retrospective-renewal-retention.html`.

Build HTML: `node carousel-kit/scripts/build-technical-retrospective.cjs`.
Render PDF: `.\carousel-kit\scripts\render-carousel.ps1 -Name technical-retrospective-renewal-retention`.
Verify: `python carousel-kit/scripts/verify-technical-retrospective.py` (pypdf and pdfplumber required; bundled Python includes both).

## Editorial direction

- Audience: AI engineers and hiring managers assessing model boundaries, structured outputs, deterministic policy, bounded retries, state, failure routing and evaluation.
- Eleven slides. Short supporting copy; the architecture, comparison, schema, pipeline, branch, state transition and verification table carry the detail. Reproducibility moves before runtime validation; recorded tests sit immediately before proposed improvements.
- Document title: `An AI workflow that waits for approval`.
- Palette and annotations: preserve paper, Switzer, blue and yellow. Any annotation shape can use either color. Follow the maintenance-triage references, but mark consequential decisions instead of circling a keyword in every headline. Zodiak is used once for the cover's landing word, approval.
- Evidence: committed v2 logic and recorded synthetic checks. No new service run, classifier score, client result or deployment is claimed. Future work stays labeled.
- Public-copy direction, 2026-10-20: discuss the implemented build without demo, synthetic-data, no-client or no-deployment labels/disclaimers. Keep evidence provenance internal. Omission must not turn tests into customer outcomes or proposed controls into completed work.

## LinkedIn caption

> I built a pre-renewal check-in workflow that uses AI to draft messages and classify resident replies. Every resident-facing message requires a manager's individual approval.
>
> The engineering work extends beyond the model calls: JSON Schema for structured outputs, reference-token and email matching in code, one retry for drafts that fail wording checks, and state checks around edits and repeated actions.
>
> Two defects changed the design. A manager could edit a draft after its wording check, leaving the final message unchecked. Skip could reset an already-sent record and make it eligible for another check-in. I added wording validation on the send path and restricted Skip to pending review states.
>
> This carousel walks through the architecture, output contract, failure handling and fixes. It also separates what the recorded integration checks established from what still needs evaluation. A held-out reply set, protection against concurrent sends, and recovery when email succeeds but the state write fails are next steps.
>
> Built with n8n, OpenAI, Airtable, Gmail and Telegram.

## Carousel copy

Title, Body and Footer are public wording. Visual notes describe diagrams and their exact supporting labels. They are not extra prose paragraphs to place on the page.

### Slide 1

**Title:** How I built an AI workflow that waits for approval

**Body:** A pre-renewal resident check-in loop. The architecture, two bugs, and what I'd change before deployment.

**Footer:** Applied AI · Pre-renewal retention · Human approval

**Visual:** lead with the headline, landing on approval in Zodiak with a gold underline. Blue selection box on AI. Compact stack line: n8n / OpenAI / Airtable / Gmail / Telegram. Keep the subtitle short.

### Slide 2

**Title:** One route to the resident's inbox

**Body:** Five n8n workflows share Airtable state. Outreach generates drafts; the action workflow owns the only resident send node. Every outbound message needs individual approval.

**Footer:** Implemented architecture · 88 nodes · One resident send node

**Visual:** connected two-lane diagram. Outbound: Outreach → OpenAI draft → Telegram approval → Action router → Gmail. Inbound: Gmail reply → Match + classify → Manager alert. Airtable is a shared-state rail connected to both lanes. Bottom label: Daily operations + reply polling. Highlight the approval gate in yellow and underline One in the headline in blue.

### Slide 3

**Title:** Give the model a narrow job

**Body:** The model drafts and classifies. Fixed code owns identity and routing. If a reply cannot be matched, it reaches a person without being assigned to a resident.

**Footer:** Model output never selects resident identity

**Visual:** two equal ruled columns. Model: Draft wording / Classify intent / Suggest next action. Code: Select cohorts / Match identity / Apply routing rules. Bottom matching ladder: Subject token → Exact email → Unmatched alert. Blue highlight on identity in the code column; yellow highlight on narrow job in the title.

### Slide 4

**Title:** Define the output contract

**Body:** A closed JSON Schema requires the configured fields and rejects extra properties. Enums constrain intent, urgency and confidence. Workflow code decides the human-review route; schema validity alone doesn't establish correctness.

**Footer:** Configuration excerpt · Structure and meaning are separate checks

**Visual:** large ruled schema excerpt: intent: enum / urgency: HIGH | MEDIUM | LOW / confidence: HIGH | MEDIUM | LOW / additionalProperties: false. One gold underline on false and one blue highlight on output contract. Label this as configuration, not a model response.

### Slide 5

**Title:** Make the build reproducible

**Body:** Shared JavaScript libraries feed builder scripts that generate importable workflow JSON. Exports keep placeholders; local import resolves identifiers and credentials. Git holds the reviewable source and exports.

**Footer:** Generated workflows · No credentials in committed exports

**Visual:** three large numbered steps: Shared libraries / Workflow builders + JSON / Local import. Small notes: Cohorts, guardrails, routing / Placeholders in Git / Resolve local credentials. Gold selection box on build. Blue underline on Shared libraries. No extra paragraph describing the same pipeline.

### Slide 6

**Title:** Validate, then retry once

**Body:** JavaScript checks the draft after generation. Failures return their violations for one retry. A second failure becomes REVIEW_FAILED, visible to the manager without an approve button.

**Footer:** Check-in rules · 35-95 words · One question · First name · Wording checks

**Visual:** large branch diagram: Generate → Check draft; pass → Await approval; fail → Retry once → Check again; pass → Await approval; fail → REVIEW_FAILED. Blue circle around once in the retry step, gold highlight on the final failure state. Branch lines must show revalidation after retry; don't imply every retry fails.

### Slide 7

**Title:** The facts changed after validation

**Body:** A manager edited an already-checked draft. The fix: validate the current wording again immediately before sending. Keep draft-time checks as well.

**Footer:** Recorded bug and fix · Editing remains allowed

**Visual:** two large aligned rows. Before: Check → Edit → Send. After: Check → Edit → Recheck → Send. Gold callout reading Unchecked gap beneath Before; blue selection box on Recheck. Short lower label: Validate what will actually send. Do not strike Edit, since editing remains a supported action.

### Slide 8

**Title:** Skip was a state-changing action

**Body:** Skip could reset an already-sent record and make it eligible again. I restricted it to pending review states. A sent record now refuses Skip and keeps its history.

**Footer:** State protection · Skip respects completed sends

**Visual:** stacked state transitions, with states much larger than labels. Before: SENT → Skip → PENDING. After: SENT → Skip → SENT. Show Refused below the second Skip. Gold strike on the old PENDING state; blue highlight on the retained SENT state. Small consequence below Before: Eligible again. No repeated prose version of the transitions.

### Slide 9

**Title:** Model failure becomes visible work

**Body:** An OpenAI error produces CLASSIFY_FAILED and human review. Low confidence, grievances, sensitive flags and questions also require a person. Suggested messages still need approval; an error cannot become a clean STAYING result.

**Footer:** Implemented error route · Complete crash recovery is future work

**Visual:** dark page with a large vertical route: OpenAI error → CLASSIFY_FAILED → Manager review. Gold highlight on CLASSIFY_FAILED; blue underline on Manager review. Put the shorter supporting copy below the route, with space between them. No duplicated giant payoff word.

### Slide 10

**Title:** What the recorded checks established

**Body:** I checked draft wording, repeated approvals, Skip after sending and reply matching. Each check targets a specific workflow behavior. A held-out reply evaluation is a separate next step.

**Footer:** Verification · Wording, state transitions and reply matching

**Visual:** large two-column table. Check / Recorded result. Draft wording / 14 passed. Repeated approval / No second send. Skip after sending / Refused. Reply matching / Matched by token. Blue underline on No second send; yellow highlight on Matched by token. Keep 14 a normal table value, not a benchmark headline.

### Slide 11

**Title:** Three things I'd change next

**Body:** Next I'd prioritize evaluation, send integrity and recovery: measure classifier errors, protect concurrent approvals, and recover when email succeeds but the state write fails.

**Footer:** Proposed work · Not implemented production controls

**Visual:** three numbered ruled sections. Evaluation: Held-out labeled replies; measure misses across repeated runs. Send integrity: Atomic claim before sending. Recovery: Reconcile uncertain sends; paginate reads and drain reply backlogs. Blue circle around Three and gold highlight on Atomic claim. Preserve proposed status for every section.

## Internal evidence mapping

| Slides | Sources | Boundary |
|---|---|---|
| 1-3 | v2 exports/builders; cadence library; stage-6 reply library; technical notes | Five workflows / 88 nodes / one resident Gmail send node; deterministic cohorting and identity matching |
| 4 | CLASSIFY_SCHEMA in build-wf8-replies.js; deterministicClassification in stage-6-reply-lib.js | Actual required fields, enums, additionalProperties:false; confidence is not calibrated probability |
| 5 | build-wf*.js, workflow-common.js, import-v2-workflows.js | Real generated JSON, shared libraries and placeholder import |
| 6 | guardDraft, buildRetryPrompt, finalizeDraftsFromBatch; WF7 assessment/retry/finalize | One retry with violations; revalidation; REVIEW_FAILED without approve button |
| 7-8 | WF6 Decide Action / Apply Action; 2026-08-21 progress notes | Final wording check against loaded state; Skip status guards; no transactional/concurrency guarantee |
| 9 | finalizeClassificationFailure and deterministicClassification; WF8 final routing | Explicit OpenAI errors become human-review work; not complete crash/timeout recovery |
| 10 | Current status and preserved 2026-10-10 execution evidence | Recorded synthetic checks, no new run or held-out classifier score; no customer result |
| 11 | WF6 sends before final state write; one-page workflow reads; WF8 one-reply selection; production blueprint | Evaluation, atomic claims, reconciliation and backlog improvements proposed |

## Production boundaries

Use blue and yellow independently of annotation shape, with contrast checked.
The same typography, paper and grid connect the different layouts. Annotations
point to the gate, missing check, retained state or unproved claim. Circles are
not a default headline decoration. Do not fabricate screenshots or model results.
The deck demonstrates an applied AI workflow, not model training, RAG, fine-tuning
or a live client deployment. Keep this appendix and local paths out of the PDF.
