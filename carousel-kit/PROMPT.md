# Prompt for a new session

The `linkedin-carousel` skill in `.claude/skills/` should trigger on its own and
carries these instructions already. This prompt is the belt-and-braces version:
paste it if the skill does not fire, or if you are somewhere skills do not load
at all. Replace the bracketed part with your own copy or a pointer to it.

---

```
I want a LinkedIn document carousel built from finished copy, using the fixed
template in carousel-kit/.

Before writing anything, read these in order:

1. carousel-kit/design-system.md — the full design system. Palette and the rule
   governing where colour may appear, the two typefaces, every layout, the
   annotation vocabulary, the 24px baseline grid, and a list of failure modes
   with their real causes. Read it completely; almost every rule in it exists
   because something looked broken first.
2. carousel-kit/examples/ — four finished decks. Find the one closest in shape
   to what I'm asking for and clone its structure: the <head>, the slide
   shells, the footer, and the baseline-snap script at the foot of the file.
   That script is not optional — without it the centred content lands off the
   ruled grid.
3. carousel-kit/carousel-template.css — the stylesheet. The only place sizes,
   colours and spacing are allowed to live.

Then build the deck as a single HTML file in the carousel-kit root, named
post-NN-short-slug.html, linking the stylesheet as "carousel-template.css".

Four rules that matter more than they look:

- THE COPY IS FINAL. You may line-break a sentence, split a run of items into
  list elements, and choose which phrase carries a mark. You may not change a
  word, reorder, add a connective, or trim to fit. If copy genuinely will not
  fit a slide, drop a type size step or tell me it's overset — don't edit it.
- NO INLINE STYLES. No style attribute, no <style> block, no class the
  stylesheet doesn't already define. Content and layout classes only.
- IF NO LAYOUT FITS, ADD ONE to carousel-template.css and document it in
  design-system.md, so the next deck inherits it. Don't solve it inline; that
  forks the design without anyone noticing. When you add a layout, add its
  .slide--invert colours in the same pass — a layout isn't finished until it
  works on the dark slide too.
- THE MARKS ARE THE ARGUMENT. Marker = the load-bearing phrase the slide turns
  on. Circle = one word held up for scrutiny, never a phrase. Underline =
  affirmation. Strike = negation. Selection box = once per deck, on the cover.
  Every slide carries at least one mark; two is the ceiling, three on the
  cover. A reader skimming only the marked words should get the post.

Then preview it and actually look at the render before telling me it's done:

  .\carousel-kit\scripts\preview-carousel.ps1
  .\carousel-kit\scripts\preview-carousel.ps1 -Slide 5

Look at both the contact sheet and any slide you changed at full size. Each
view hides what the other shows — composition problems only show in the sheet,
and clipping, low contrast and misplaced marks only show at full size. Check
for: punctuation sitting apart from the word before it, a mark on the wrong
word or floating off its line, type running off an edge or clipped by its own
circle, a slide much fuller or emptier than its neighbours, text drifting off
the ruled lines, and anything crossing the footer band.

Fix and re-render until it holds. Then:

  .\carousel-kit\scripts\render-carousel.ps1

Show me the contact sheet and tell me what you changed and anything you're
unsure about. If you added a layout, say so explicitly and show me that slide
at full size.

Here is the copy:

[PASTE THE POST COPY HERE, or: it's in <file path>, post N]
```

---

## Notes on using this

**Say what shape the post is** if you know. "This one's a numbered list of
twelve things", "this one turns on a single figure", "this is a matched pair of
statements" — that routes to the right layout faster than making Claude infer
it from the copy.

**The short version works too**, once the kit is in place and Claude has read
the design system in that session:

```
Build a carousel from post 4. Show me the contact sheet before rendering.
```

**If you're not on Windows or can't run the scripts**, drop the two preview and
render commands from the prompt and add this instead:

```
I'll render it myself, so hand me the finished HTML and tell me what to check.
```

Then open the HTML in Chrome and print with margins **None** and background
graphics **ON**.

**If the session invents its own colours or typefaces**, it didn't read
`design-system.md`. Stop it and point at the file directly rather than letting
it continue — a deck built off the wrong palette is easier to rebuild than to
correct.
