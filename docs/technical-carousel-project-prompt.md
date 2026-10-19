# Reusable project prompt

Paste the text below into the chat for the project repository.

```text
Create one technical retrospective LinkedIn carousel and its LinkedIn caption for the automation built in this repository.

The audience is people hiring for AI engineer and applied AI engineering roles. Show how I build, choose tradeoffs, debug failures and verify behavior. Keep the story understandable outside property management.

First read the repository instructions, current progress notes, implementation plans, technical documentation, workflow exports, shared libraries and recorded verification. Resolve older plans against the current implementation before writing.

Use the finished renewal-retention carousel as the visual and structural reference:
D:\codex_projects\automation_projects\renewal-retention\carousel-kit\technical-retrospective-renewal-retention.html
D:\codex_projects\automation_projects\renewal-retention\carousel-kit\out\technical-retrospective-renewal-retention.pdf
D:\codex_projects\automation_projects\renewal-retention\docs\build-4-content-strategy\technical-retrospective-carousel.md

Also inspect the annotation treatments in:
D:\codex_projects\automation_projects\maintenance-triage\carousel-kit

Read the reference sources and visually inspect their rendered PDFs. Work only in the current repository.

CONTENT

Tell a connected story about:
- What I built and the specific job it performs.
- The architecture and the reasons behind important decisions.
- What the model handles versus deterministic code and human actions.
- Relevant mechanisms: structured outputs, validation, identity matching, retries, state, failure routing and reproducible exports.
- Two or three real defects or constraints: symptom, root cause, fix and how it was checked.
- The checks I performed and what each verified.
- What I would change next, clearly phrased as future work.

Choose the strongest material from this build. Do not copy another project's architecture, failures, numbers or conclusions. Show engineering decisions and mechanisms instead of merely listing tools.

PUBLIC WORDING

Focus on what I built. Do not mention that it is a demo, proof of concept or uses synthetic, fictional or test data. Do not add disclaimers about having no clients, no live deployment or no measured business improvement. Keep evidence provenance in internal working notes, outside the public slides and caption.

Keep every claim grounded in the implementation and recorded evidence. Do not invent deployments, customer results, accuracy scores, production safeguards or AI features. Keep proposed improvements separate from implemented behavior. Describe verification as specific checks performed, without turning it into a broader benchmark claim.

Use first person, plain US English, no hype, no em dashes and no exclamation points. Follow the repository's terminology. Do not add a sales pitch or a hiring plea.

STRUCTURE AND DESIGN

Produce roughly 9-11 slides, choosing the count based on useful content. Keep supporting prose short, usually 15-30 words per slide; diagram labels and table entries should carry detail. Avoid repeating the same explanation in the paragraph, diagram and footer.

Use a specific cover hook, introduce the use case briefly, then progress through architecture, implementation, failures, verification and next changes.

Preserve the reference's cream ruled paper, subtle grain, Switzer typography, restrained Zodiak emphasis, and blue/yellow annotations. Every annotation shape can use either color: marker highlights, selection boxes with handles, double-stroke circles, underlines and strikethroughs. Interior selection boxes are allowed. This direction overrides older fixed-color and cover-only restrictions. Check contrast on light and dark pages.

Mark consequential details: an approval gate, missing validation, retained state, bounded retry or checked result. Do not circle a word in every headline or add marks to meet a quota.

Choose varied layouts that suit the content: connected architecture lanes, model/code comparisons, schema excerpts, source/build/import steps, pass/fail branches, before/after flows, state transitions, error routes, verification tables and prioritized next changes. Make the diagrams large enough to read on a phone. Align shared baselines and node boundaries. Avoid repeating headline + paragraph + tiny flow on every page.

Keep configuration excerpts and explanatory diagrams distinguishable from actual outputs. Do not fabricate screenshots or execution evidence.

CAPTION

Write a complete caption introducing the build, engineering decisions, failures, fixes and next improvements. Do not aggressively shorten it. Check wording, flow and factual precision. Approval claims should specify the messages or actions that actually require approval. Apply the same public-wording direction as the slides.

DELIVERY

Create the actual carousel PDF, not just a copy draft. Save the slide copy, caption, editable source, PDF and contact-sheet preview in appropriate locations in this repository. Prefer existing carousel tooling and extend shared layouts where useful.

Check factual claims against implementation and recorded verification. Render and visually inspect every final PDF page at readable resolution, plus the contact sheet. Verify page count, text preservation, fonts, clipping, overlaps, diagram correctness and privacy. Keep credentials, real contact details, local paths and internal notes out of public content.

Open the finished PDF and share its preview for my review. Do not publish or add it to a posting queue. Follow the repository's documentation, commit and push requirements. Complete a rendered first version without stopping for outline or copy approval; I will request changes after seeing it.
```
