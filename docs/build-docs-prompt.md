# Prompt: generate the two build documents

Paste the fenced block below into a session opened at the root of any of the other
automation builds (vendor insurance paperwork, maintenance triage, make-ready sequencing, or
a later one). It produces the same pair of documents this project has:

- `docs/how-the-system-works.md`, for a property manager or owner. Explains the problem and
  what the build does about it. Assumes no technical knowledge at all.
- `docs/build-technical-notes.md`, for a builder or a technically minded operator. The
  stack, the constraints, and the defects that shipped.

**Why two files and not one.** The audience split is the entire point. The moment the
operator document names a stack it stops being readable by the person it is for, and the
moment the technical document explains the market problem it stops being scannable by the
person who wants to know how the classifier works. Mixing them produces one file that serves
neither.

---

```
Produce two documents for this build. Both go in docs/. If a version of either already
exists, read it first and treat it as suspect rather than as a starting point: the most
likely defect is not that it is out of date but that it now states the opposite of current
behaviour on some point, which is worse than saying nothing.

READ THESE FIRST, IN THIS ORDER

1. AGENTS.md, the architecture rules and the gotchas list. Most of what belongs in the
   technical document is already here, phrased as instructions rather than explanations.
2. progress-notes.md, the deviations and verification records. This is where the real
   decisions and the real bugs are, buried in a chronological log.
3. docs/, whatever operating guide, runbook or setup doc exists. These carry the endpoints,
   the statuses and the branch behaviour.
4. docs/*content-strategy/customer-language.md if it exists, the vocabulary, the sourced
   numbers, the competitive facts, and the list of things that must never be claimed.
5. The workflow exports and the build scripts. Read them, do not skim them.

THE RULE THAT MATTERS MOST: MEASURE, DO NOT REMEMBER

Every number in either document has to come from the code or from a recorded run. Count the
nodes. Read the actual limits out of the client library. Check the byte sizes. Open the
workflow JSON and count how many nodes can actually perform the irreversible action, whatever
that is in this build (send an email, message a vendor, write to a system of record).

That last audit is worth doing deliberately, because it usually produces the strongest
sentence in the technical document. In the renewal build it turned out that exactly one node
out of eighty-eight could email a resident, which upgrades "nothing goes out without a
person" from a policy claim to a structural fact somebody can verify by opening the file.

HONESTY RULES, BOTH DOCUMENTS

- If there is no client, say so plainly and more than once. Fixture verification is testing
  and must never be phrased as an outcome.
- Distinguish what the research proves from what the build proves. Industry surveys validate
  the problem; they do not validate this solution.
- Any derived figure is arithmetic offered for the reader to redo, never a benchmark and
  never a result.
- Do not claim as novel anything the category already does. Check customer-language.md for
  the list, and if there is not one, be conservative.
- Match the project's voice rules. Read them out of AGENTS.md or the content-strategy files
  rather than inventing them. In this family that usually means zero em dashes, US spelling,
  first person, no hype vocabulary, and the correct industry noun (resident, not tenant;
  doors, not units, for company size).

DOCUMENT 1: docs/how-the-system-works.md

Audience: a property manager or owner. State in the opening that nothing in it requires
knowing what the orchestration tool is, and then honour that. No stack, no node names, no
API details.

Sections:

- The problem, stated as a problem statement plus a few paragraphs of what actually goes
  wrong operationally.
- Is this a real industry problem, with named surveys and live links. If the build already
  has sourced research, reuse it verbatim rather than re-researching.
- What the research does and does not prove.
- The solution, in one statement and a short explanation.
- Any staged or cadenced structure the build has, as its own section with a table. If the
  build deliberately does nothing at some stage, that silence is worth its own paragraph,
  because restraint is usually the least obvious and most persuasive design decision.
- The complete flow, numbered, in the order it happens. Aim for ten to fifteen steps. Each
  step says what happens and why, in plain language. Name the real behaviour, including the
  refusals.
- What each tool does, as a table, one line each, with no configuration detail.
- The human boundaries, as a list, with the note that they are enforced in code rather than
  by prompting.
- What the system will not do. A plain list of refusals, framed as design rather than gaps.
- What the proof of concept proves today, as a list of verified behaviours, ending with an
  explicit statement that this is testing and not a customer result.
- What a client pilot must measure, including the one variable the pilot actually turns on.
- What production would add.

DOCUMENT 2: docs/build-technical-notes.md

Audience: a builder, or an operator who codes. Open by saying it is the companion to the
other file and that everything in it is measured from the committed build.

Sections:

- The stack, as a table: layer, choice, and **why not the obvious alternative**. That third
  column is what makes it worth reading. "Self-hosted so the client owns it" is an argument;
  "we use n8n" is not.
- The workflows, as a table with real node counts and what each owns. Include the reason the
  architecture is shaped the way it is, especially where a platform constraint forced it.
- The single path to the irreversible action, from the audit above.
- How the guardrails or validation actually work. Name the functions, say whether they are
  rules or prompting, and say when they run. If they run more than once, say why the second
  run is the one that matters.
- How any classification or extraction works. Say what is decided by fixed rules before a
  model is consulted and what is left to the model, and name the schema if the output is
  structured.
- Constraints that shaped the build. Only the ones that changed a design decision, not
  trivia. Byte caps, rate limits, API limitations, platform behaviours that cannot be worked
  around.
- **The defects that shipped.** This is the most valuable section in the document, so mine
  progress-notes.md properly for it. For each one give the symptom, the cause, the fix, and
  the generalisation a reader can apply to their own system. Include the ones that are
  embarrassing. A defect whose symptom was "none, for three weeks" teaches more than a crash.
- Reproducibility: how the workflows are generated, how credentials and identifiers are kept
  out of the committed files, and what logic is reused from earlier verified code rather than
  reimplemented.
- What was verified, and what that means, with the same testing-not-a-result statement.
- Known limits of the current build, stated so nobody has to find them.

WHAT TO WATCH FOR

- An existing document that is confidently wrong. Check every behavioural claim against the
  code, especially anything describing what the system refuses to do, since those are the
  claims most likely to have been reversed by a later decision.
- Rewriting rather than patching. If more than a few claims are stale, a patch leaves a
  document that reads as current and is not.
- Regex escaping when you verify with grep. `\|` inside `grep -E` silently matches nothing
  and produces a clean bill of health for a file full of problems.

HAND BACK

Tell me which claims in any existing document turned out to be wrong rather than merely old,
what the irreversible-action audit found, and anything you could not verify from the code and
had to leave out.
```

---

## Notes on using it

**Run it once per build, in that build's own session.** The prompt reads that repository. It
will not work from here.

**Expect the two documents to come out different lengths.** The operator file is roughly
proportional to how much the build does; the technical file is roughly proportional to how
much went wrong while building it. A build with three good bugs produces a better technical
document than one with none.

**If the build has no sourced research**, the "is this a real industry problem" section will
be thin, and it is better thin than padded with unattributed statistics. Say so and move on.

**The defects section is the one to check by hand.** A session that has not read
`progress-notes.md` carefully will produce a generic list of best practices instead of real
incidents, and the difference is obvious to any technical reader.
