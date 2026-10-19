# Build retrospective: pre-renewal resident check-ins

Revised: 2026-10-20. Status: rendered draft for review; not published or queued.

Review PDF: `carousel-kit/out/technical-retrospective-renewal-retention.pdf`.
Editable HTML: `carousel-kit/technical-retrospective-renewal-retention.html`.
Build: `node carousel-kit/scripts/build-technical-retrospective.cjs`.
Verify: `python carousel-kit/scripts/verify-technical-retrospective.py`.

## Editorial direction

- Problem-first retrospective for property-management decision makers and buyers, with enough concrete decisions and debugging to show hiring readers how I work.
- No prominent stack list, code, schema, node counts or database status labels. Explain decisions through their operational consequences. Keep the two real defects and specific checks; avoid vague AI claims.
- Eleven short slides: problem, workflow, responsibilities, wording, two bugs, exceptions, lesson, verification and next steps. Use varied plain-language diagrams and comparisons.
- Preserve cream ruled paper, Switzer, restrained Zodiak and meaning-led blue/yellow annotations. Either color works for every annotation shape.
- Public wording omits demo/synthetic-data and no-client/no-deployment labels. Internal evidence remains below. No invented business results, classifier benchmarks or completed future safeguards.

## LinkedIn caption

> A resident's lease end date tells you when renewal is approaching. It doesn't tell you what still needs attention.
>
> I built a pre-renewal check-in workflow around that gap: prepare a short message, let a manager review it, and bring resident replies back for the right follow-up.
>
> AI helps draft messages and sort replies. The manager stays responsible for the conversation. Every resident-facing message requires individual approval, and unclear replies, questions or sensitive concerns go to a person.
>
> Two bugs taught me more than the straightforward path did.
>
> A manager could edit a draft after its wording check, leaving the final message unchecked. I added another check immediately before sending.
>
> Skip could reset a resident who had already received a check-in, making them eligible again. I restricted it to messages still awaiting review, so it preserves completed sends.
>
> Those fixes shaped how I think about the build. A useful workflow needs to account for the ordinary things people do: edit wording, click twice, skip an item, or reply with something unexpected.
>
> I checked those behaviors alongside message wording and reply matching. Next, I'd assess a wider range of difficult replies and strengthen recovery when an email sends but its record fails to update.
>
> The goal is to help a manager see what needs attention before renewal, with enough context to decide what to do next.

## Carousel copy

### Slide 1

**Title:** A renewal check-in that starts with listening

**Body:** What I built to surface resident concerns earlier, what broke, and what I'd improve.

**Footer:** Build retrospective · Pre-renewal resident check-ins

### Slide 2

**Title:** What still needs attention?

**Body:** A lease end date tells you when to reach out. It doesn't tell you whether a resident has an unresolved concern.

**Footer:** The problem · Give concerns a place to surface

### Slide 3

**Title:** A check-in, then a next step

**Body:** I built a workflow that prepares check-ins before renewal, brings drafts to a manager, and routes resident replies for follow-up.

**Footer:** The workflow · From lease dates to a reviewed conversation

### Slide 4

**Title:** AI helps. The manager decides.

**Body:** AI drafts messages and helps sort replies. The manager reviews concerns and approves every individual resident-facing message before it leaves.

**Footer:** The boundary · Every resident-facing message needs approval

### Slide 5

**Title:** Keep the first message simple

**Body:** The opening message asks how things are going. Wording checks help keep it brief and focused, without drifting into renewal terms or promises.

**Footer:** The design choice · A conversation before a renewal discussion

### Slide 6

**Title:** An edit could bypass the check

**Body:** A manager could change a draft after its wording check. I added another check immediately before sending, against the message that would actually leave.

**Footer:** Bug 1 · Check the final wording, including edits

### Slide 7

**Title:** Skip could queue someone again

**Body:** Skip could reset someone who had already received a check-in. I restricted it to messages still awaiting review, preserving completed sends.

**Footer:** Bug 2 · A small button could undo completed work

### Slide 8

**Title:** Uncertainty needs a person

**Body:** Unclear replies, questions, grievances and sensitive concerns go to human review. If AI processing fails, the workflow also flags it for attention.

**Footer:** The fallback · An unresolved reply stays visible

### Slide 9

**Title:** Approval is only one part

**Body:** Building this changed what I paid attention to: what happens after an edit, a repeated click, or a reply the workflow cannot confidently handle.

**Footer:** What I learned · Design for the awkward moments

### Slide 10

**Title:** I checked the awkward cases

**Body:** I checked message wording, repeated approvals, Skip after sending and reply matching. These checks helped verify specific behaviors in the workflow.

**Footer:** Verification · Specific checks of workflow behavior

### Slide 11

**Title:** What I'd improve next

**Body:** I'd focus next on difficult replies and interrupted sends, so the workflow can handle more of the situations that make follow-up unreliable.

**Footer:** Next steps · Proposed improvements

## Internal evidence mapping

| Slides | Evidence | Boundary |
|---|---|---|
| 1-3 | Current v2 builders, cadence library and project problem documents | Built to surface concerns; no renewal improvement claimed |
| 4 | WF6 send route, WF7 drafting and WF8 classification | Every resident-facing message individually approved; AI assists rather than resolves concerns |
| 5 | guardDraft, retry/finalization logic and check-in prompts | Brief check-in with wording restrictions; not legal notices or renewal offers |
| 6-7 | WF6 Decide Action / Apply Action; August 21 progress notes | Send-time validation and Skip guards; no concurrency guarantee |
| 8-9 | deterministicClassification and finalizeClassificationFailure | Explicit model errors, low confidence and sensitive/question routes; not complete crash recovery |
| 10 | Preserved October 10 integration checks and current progress notes | Synthetic checks: 14 draft wording passes, repeated approval no second send, sent Skip refused, token matching. No new run or classifier accuracy claim |
| 11 | Current send/write order and production blueprint | Wider reply evaluation, concurrent-send protection and recovery are proposed |

Keep this appendix, evidence provenance and local paths outside the PDF.
