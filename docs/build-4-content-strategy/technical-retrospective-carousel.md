# Technical retrospective: an AI check-in workflow

Created: 2026-10-19. Revised after visual review: 2026-10-19.
Status: rendered draft for review. No publication or queue placement.

Review PDF: `carousel-kit/out/technical-retrospective-renewal-retention.pdf`.
Contact sheet: `carousel-kit/out/technical-retrospective-preview.png`.
Editable layout: `carousel-kit/technical-retrospective-renewal-retention.html`.

Rebuild HTML with `node carousel-kit/scripts/build-technical-retrospective.cjs`, then render with `.\carousel-kit\scripts\render-carousel.ps1 -Name technical-retrospective-renewal-retention`.
Check with `python carousel-kit/scripts/verify-technical-retrospective.py` (pypdf and pdfplumber required; bundled Python includes both).

## Editorial direction

- **Audience:** AI engineers and hiring managers assessing applied AI engineering: model responsibility, output contracts, deterministic policy, retries, state, failure handling and evaluation. This demonstrates an LLM application built with n8n, not model training or a deployed production service.
- **Format:** 11-slide technical retrospective and caption. Property management supplies the use case; engineering decisions drive the story.
- **Document title:** `How I built an AI check-in workflow`.
- **Visual reference:** maintenance-triage's `carousel-kit/post-08-the-accuracy-test-i-failed.html` and `post-06-three-rules-that-look-absurd.html`, and their PDFs. Use prominent annotated words, paired marks and double-stroke circles. User direction supersedes old fixed colors and cover-only box restrictions: every annotation shape may use blue or yellow/gold, with contrast checked.
- **Evidence:** committed v2 code and recorded synthetic tests. Future changes are labeled. No new live test, classifier benchmark or client outcome is claimed. This additional carousel has no queue slot yet.

## LinkedIn caption

> I built an AI check-in workflow with n8n, OpenAI, Airtable, Gmail and Telegram. The useful engineering decisions started with deciding what the model was allowed to own.
>
> It drafts messages and classifies replies. Code selects the lease cohort, matches a reply to a resident, applies routing rules and checks wording. A manager authorizes every outbound message.
>
> The build uses structured outputs, a bounded retry for failed drafts, and an explicit failure route when classification is unavailable. Those controls still left room for bugs: editing could bypass an earlier wording check, and Skip could reset a record that had already been sent.
>
> This carousel covers the architecture, output contract, failure paths and fixes. It also separates what I tested from what I would need to test next. Fourteen drafts passing wording checks tells me something about drafting. It gives me no classifier accuracy score.
>
> Before deployment, I'd add a held-out reply evaluation set, concurrent-send protection, and recovery for the gap between a successful email and a failed state write.
>
> This is an applied AI demo with 40 synthetic residents and real service integrations. There is no client deployment or measured renewal improvement. The implementation and its remaining limits are what I'm showing.

## Carousel copy

Title, Body and Footer are public wording. Visual notes guide layout. Diagram labels explain implemented flows or explicitly proposed improvements.

### Slide 1

**Title:** How I built an AI check-in workflow

**Body:** A pre-renewal resident check-in loop using n8n and OpenAI. Model boundaries, structured outputs, failure paths, real bugs, and the evaluation I'd add next.

**Footer:** Applied AI build · Local demo · Synthetic residents

**Visual:** blue selection box on AI; yellow highlight on failure paths; blue underline on evaluation. Three cover marks.

### Slide 2

**Title:** One path can send

**Body:** Five workflows handle outreach, actions, replies, operations and polling. Airtable stores state; Telegram carries manager actions; Gmail carries resident email. Only the action workflow contains a resident send node. Check-ins, replies and confirmations each need an individual approval.

**Footer:** n8n in Docker · One resident send node across 88 nodes

**Visual:** prominent blue circle around One. Yellow highlight on individual approval. Ruled architecture rows show outreach/review/send and reply/match/route.

### Slide 3

**Title:** The model never picks the resident

**Body:** OpenAI drafts wording and classifies replies. Code selects cohorts from lease end dates and matches replies by subject token, then exact normalized email. An unmatched reply alerts the manager without assigning anyone. Resident identity never comes from the model's output.

**Footer:** Subject token → exact email → unmatched alert

**Visual:** gold circle around model in the title and blue highlight on never. Keep matching sequence in a ruled row.

### Slide 4

**Title:** JSON gives me a contract

**Body:** The classifier uses a closed JSON Schema: required fields, fixed enums and no additional properties. It returns intent, urgency, grievance details, flags and confidence. Code determines the human-review route. A valid schema constrains the shape of an answer; it doesn't prove the answer is correct.

**Footer:** Structured output · Shape validation is separate from semantic accuracy

**Visual:** blue circle around JSON and gold underline on contract. A labeled schema excerpt uses actual enum values, not a fabricated model result.

### Slide 5

**Title:** A valid draft can still fail

**Body:** After generation, JavaScript checks the assembled check-in: 35-95 words, one question, the resident's first name, and no prohibited terms. Failed drafts get one retry with their violations. A second failure becomes REVIEW_FAILED and reaches the manager without an approve button.

**Footer:** Generate → validate → retry once → visible review failure

**Visual:** gold circle on fail. Blue highlight on one retry. Use a clearly bounded retry flow.

### Slide 6

**Title:** I checked the draft too early

**Body:** A manager could edit a draft after its wording check. The text being approved was no longer the text I had validated. I added the same guardrails to the approval path, checking the stored wording used for that send. Human review also needs validation.

**Footer:** Recorded defect and fix · Check after edits, before sending

**Visual:** blue circle around early. Strike the old unchecked Edit in gold in the Before flow, underline the added Check in blue in After. Diagrams are simplified flows, not screenshots.

### Slide 7

**Title:** Skip could rewind state

**Body:** Skip reset an already-sent record to PENDING and cleared its draft. A later run could select that resident again. I added a status guard: Skip only accepts pending review states. The fix protects workflow state outside the model call, where another prompt would have changed nothing.

**Footer:** SENT → Skip → refused · Sent records stay intact

**Visual:** gold circle around Skip. Strike PENDING in the labeled old transition and blue-highlight Refused in the fixed transition. No claimed real duplicate email.

### Slide 8

**Title:** A failed model call stays visible

**Body:** When OpenAI returns an error, fixed code emits CLASSIFY_FAILED and routes the reply for human review. Low confidence, grievances, sensitive flags and questions also require a person. Suggested replies remain available, but no resident-facing message leaves without approval. Failure cannot silently become a clean STAYING result.

**Footer:** Error route implemented · Full crash recovery remains future work

**Visual:** dark page. Gold-highlight visible as one unbroken word; blue-highlight human review; gold strike on clean STAYING in the denied final sentence. Check contrast on both fills.

### Slide 9

**Title:** 14/14 isn't classifier accuracy

**Body:** Fourteen check-in drafts passed wording checks in a recorded run. A repeated approval sent nothing; Skip on a sent record was refused; a reply matched by token. The fixture checks verify those behaviors. They do not measure grievance recall or generalization to unseen replies. That's integration evidence.

**Footer:** Recorded synthetic checks · No held-out classifier score claimed

**Visual:** blue circle on 14/14; gold strike on accuracy, which the headline explicitly denies. End on evidence. in Zodiak with a blue underline.

### Slide 10

**Title:** Keep the build reproducible

**Body:** JavaScript builders inline shared libraries into importable n8n workflow JSON. Committed exports contain placeholders; the import helper resolves local identifiers and credentials. Cohort, guardrail and routing logic stay in shared source. Changes can be reviewed in Git instead of surviving only as editor clicks.

**Footer:** Shared source → generated exports → local import

**Visual:** gold selection box on build; blue underline on shared source. This intentional second box uses the user's expanded annotation direction.

### Slide 11

**Title:** What I'd change next

**Body:** I'd build a held-out reply set with labeled grievances, questions and sensitive cases, then measure errors across repeated runs. I'd also add atomic send claims, uncertain-send recovery, paginated reads and backlog processing. Sequential second-tap refusal doesn't prove concurrent approvals or a crash after sending are safe.

**Footer:** Proposed work · Evaluation, send integrity and recovery

**Visual:** blue-highlight change next; gold underline on held-out reply set. Three ruled labels: evaluation, send integrity, recovery. Proposed controls stay explicitly future work.

## Internal evidence mapping

| Slides | Sources checked | Evidence boundary |
|---|---|---|
| 1-3 | v2 exports/builders, `docs/build-technical-notes.md`, `scripts/stage-6-reply-lib.js`, `scripts/v2/cadence-lib.js` | Five workflows, 88 nodes and one Gmail send node measured from committed exports; identity matching deterministic |
| 4 | `CLASSIFY_SCHEMA` in `scripts/v2/build-wf8-replies.js`; `deterministicClassification` in reply library | Closed schema and enum examples real; schema validity is not accuracy; confidence is not a calibrated probability |
| 5 | `guardDraft`, `buildRetryPrompt`, `finalizeDraftsFromBatch` in `scripts/stage-5-outbound-lib.js`; WF7 assessment/retry/finalization | 35-95 word range and one-question rule; bounded retry and REVIEW_FAILED implemented |
| 6-7 | WF6 Decide Action / Apply Action; progress notes 2026-08-21 | Checks loaded record, not transactional locking against concurrent edits; later duplicate was an identified risk, not a real resident outcome |
| 8 | `finalizeClassificationFailure`, `deterministicClassification`, `finalizeRoute` in reply library; WF8 final route | Explicit OpenAI errors emit CLASSIFY_FAILED and require human review; no claim of complete provider-timeout/crash recovery; suggested replies still need approval |
| 9 | Current-status verification and preserved 2026-10-10 evidence in `progress-notes.md` | 14 drafting successes are not classifier accuracy; recorded synthetic checks, no new live run |
| 10 | `scripts/v2/build-wf*.js`, `workflow-common.js`, `import-v2-workflows.js` | Placeholder import and shared libraries; no actual identifiers exposed |
| 11 | WF6 sends before final state write; read factory uses one page; WF8 chooses one reply per run; production blueprint | Held-out evaluation, atomic claims, reconciliation and backlog handling proposed, not implemented |

## Production boundaries

Both colors are available for every annotation shape. Blue marker uses a lighter
blue with dark text; gold boxes use dark text; gold pen on paper uses a darker
gold for contrast. Dark-page variants are explicit. Circles have a second sweep
and fit short words or isolated figures. Marks belong in headlines and diagrams
as well as prose, with the density judged visually against the reference decks.

The carousel demonstrates an applied AI workflow. It makes no claim of model
training, RAG, fine-tuning, production throughput, classifier benchmark scores,
customer results or deployment. Keep internal notes and paths out of the PDF.
