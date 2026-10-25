# Carousel handoff prompt — build 4

Paste the block below into the generator opened at the repository root.

It is the build-specific version of `carousel-kit/PROMPT.md`. That file is the generic
prompt; this one carries the decisions already made for these four decks, so the new
session does not have to rediscover them or guess at them.

**Two things about this repo that the generic prompt assumes and this one corrects:**

- `PROMPT.md` sits at `carousel-kit/PROMPT.md`, not at the repository root.
- the generator reads `AGENTS.md`, which says nothing about carousels, and it does not load
  `skills/`. The skill will **not** fire on its own. The prompt below points at
  the skill file directly for that reason.

---

```
Build four LinkedIn document carousels from finished copy, using the fixed template in
carousel-kit/. The copy is written, checked and signed off. Your job is layout,
annotation, and getting it to render cleanly.

READ THESE FIRST, IN THIS ORDER. Do not skip the first two.

1. skills/linkedin-carousel/SKILL.md
   The build method. You will not have loaded this automatically, so read it as a file.

2. carousel-kit/design-system.md
   The full design system, 629 lines. Palette and the rule governing where colour may
   appear, the two typefaces, all nine layouts, the annotation vocabulary, the 24px
   baseline grid, and a list of failure modes with their real causes. Read it
   completely. Almost every rule in it exists because something looked broken first.

3. carousel-kit/examples/
   Four finished decks. post-01-what-ai-should-touch.html is the closest in shape to
   what you are building and is the reference for a payoff word sitting on the
   inverted slide. Clone its structure: the <head>, the slide shells, the footer, and
   the baseline-snap script at the foot of the file. That script is not optional.
   Without it the centred content lands off the ruled grid.

4. carousel-kit/carousel-template.css
   The stylesheet. The only place sizes, colours and spacing are allowed to live.

THE COPY

All four decks are in docs/build-4-content-strategy/linkedin-post-scripts.md, in the
section headed "Batch 1: The four carousels". Each post there gives you:

  - the slide-by-slide copy under "### Slides"
  - a "### Discipline check" listing what the deck must not do
  - a "### Design notes" paragraph, which is a production note somebody already
    decided about the argument. Honour it. Where it says a slide should be the
    visually quietest in the deck, or that a cover should carry no decoration, that
    is a decision about the argument and not a suggestion.

Ignore "The post copy that sits above the document" in each post. That is the LinkedIn
caption, not slide content, and none of it is set in the deck.

The subject is pre-renewal resident retention for US property management companies.
Say resident, never tenant, if you ever need to write anything at all.

FOUR RULES THAT MATTER MORE THAN THEY LOOK

- THE COPY IS FINAL. You may line-break a sentence, split a run of items into list
  elements, and choose which phrase carries a mark. You may not change a word,
  reorder, add a connective, or trim to fit. This copy has already passed a banned-word
  list, an em-dash budget and a character count at the fold. Editing to make a layout
  easier silently breaks checks you cannot see. If copy genuinely will not fit, drop a
  type size step or say the slide is overset and let me decide.

- NO INLINE STYLES. No style attribute, no <style> block, no class the stylesheet does
  not already define. Content and layout classes only.

- IF NO LAYOUT FITS, ADD ONE to carousel-template.css and document it in
  design-system.md so the next deck inherits it. Do not solve it inline. When you add a
  layout, add its .slide--invert colours in the same pass. A layout is not finished
  until it works on the dark slide.

- THE MARKS ARE THE ARGUMENT. Decide every mark from the sentence it sits on, not from
  the previous slide and not from the previous deck. Marker = the load-bearing phrase
  the slide turns on. Circle = one word held up for scrutiny, never a phrase.
  Underline = affirmation or a verdict. Strike = negation. Selection box = once per
  deck, on the cover. Every slide carries at least one mark, two is the ceiling, three
  on the cover. A reader skimming only the marked words should come away with the post.

THE PAYOFF WORDS ARE ALREADY MEASURED. DO NOT RE-DERIVE THEM.

Every deck gets one word set in Zodiak at 192px. It has to be one word, end its
sentence, and fit the 888px column. Character count does not decide this, width does.
These were measured with carousel-kit/scripts/check-payoff-width.py:

  rate.        441px   447px spare
  good.        521px   367px spare
  leaving.     748px   140px spare
  defense.     755px   133px spare
  disability.  944px   56px OVER   <- rejected
  maintenance. 1281px  393px OVER  <- rejected

PER-DECK PLAN

Post 1 — "Your renewal rate is a number nobody in your office can explain", 9 slides
  File:     carousel-kit/post-01-renewal-rate-nobody-explains.html
  Doc title (LinkedIn upload): Why residents leave, and why you disagree
  Payoff:   rate.  on slide 9
  Shape:    the third payoff shape, .lead-in .pay .divider .turn, documented in
            design-system.md. The landing word ends the FIRST sentence of slide 9 and a
            second sentence follows it, and the copy cannot be reordered, so the word
            opens the slide and the remaining sentence sits behind a divider. Slide 9 is
            the close, so it also carries the .byline outside .body, as in the examples.
  Invert:   slide 6
  Why not slide 3, 4 or 5: those three are strictly parallel copy, and parallel copy
            takes parallel marks. Making one of them a payoff or inverting one breaks
            the set. Slide 6 belongs to nothing else and is where the argument turns.

Post 3 — "We're happy here, but…", 8 slides
  File:     carousel-kit/post-03-happy-here-but.html
  Doc title: The complaint that opens with a compliment
  Payoff:   leaving.  on slide 5
  Invert:   slide 5, so the payoff and the inverted slide share one frame
  Note:     slide 1's cover is the quoted resident sentence. The design note says do
            NOT highlight or colour the second half of it on the cover. The reader has
            to do that reading themselves for the deck to work. Marking may begin on
            slide 3.

Post 6 — "The safest-looking version of this had a legal problem", 10 slides
  File:     carousel-kit/post-06-cautious-design-legal-problem.html
  Doc title: The cautious design was the risky one
  Payoff:   defense.  on slide 6, which closes "Not knowing is not a defense."
  Invert:   slide 6, shared frame
  Note:     the cover is two lines and the design note says it carries no decoration at
            all. It is the strongest cover in the set and should stay bare apart from
            its one mark. Slide 6 should look like a citation, plain and unstyled,
            because its credibility comes from being a quote rather than a design
            element.

Post 13 — "The category is building something that talks to your residents", 9 slides
  File:     carousel-kit/post-13-category-talks-to-residents.html
  Doc title: Which renewal tool is actually for you
  Payoff:   good.  on slide 6, which closes "Then buy the renewal assistant. They are good."
  Invert:   slide 6, shared frame
  Note:     the loudest frame in a competitive deck is the one telling the reader to buy
            a competitor. That is deliberate. Slide 5 is the thesis slide and the design
            note says it should be the visually quietest in the deck. No competitor
            logos anywhere; using them implies a relationship that does not exist.

ONE THING TO WATCH ON THE MARKS

Three of the four payoff words read as verdicts being asserted, which points at the
underline for all three. Check that before you commit to it. The design system is
explicit that two decks landing on the same device is fine when the copy earns it, and
a problem when the second was built from the first rather than from its own script.
Count the devices when each deck is done. The marker should lead. A deck where a second
device never appears has stopped reading the copy.

Also: on an inverted slide the pen goes gold, and a highlight there needs checking
because the swipe is sized to overhang a word rather than enclose it. On the dark ground
uncovered ascenders and the tittle of an i become dark ink on dark navy and vanish. The
stylesheet corrects for this. Confirm it actually worked on the rendered slide.

MECHANICS

New decks go in the carousel-kit root, next to carousel-template.css, linking the
stylesheet as href="carousel-template.css". The examples sit one level down and link
"../carousel-template.css", so do not copy that path.

Eyebrow text on every slide: Resident retention &middot; property management
Footer deck title: the short form of the post title, same on every slide of a deck.

Before building any slide, run:

  python carousel-kit/scripts/check-fit.py <deck-name-without-extension>

after each type or layout change. It reports per-slide clearance to the eyebrow above
and the footer below. Under about 24px the last line crowds the footer rule. It finds
oversets a contact sheet hides.

VERIFY, AND ACTUALLY LOOK

  .\carousel-kit\scripts\preview-carousel.ps1
  .\carousel-kit\scripts\preview-carousel.ps1 -Slide 6

Read the PNG both ways. The contact sheet shows composition and rhythm but hides
clipping, low contrast and misplaced marks. A full-size slide shows the marks but says
nothing about how the set reads. Check for punctuation sitting apart from the word
before it, a mark on the wrong word or floating off its line, type running off an edge
or clipped by its own circle, a slide much fuller or emptier than its neighbours, text
drifting off the ruled lines, and anything crossing the footer band.

Fix and re-render until it holds. Then:

  .\carousel-kit\scripts\render-carousel.ps1

Exactly one image object in the PDF is correct: that is the grain tile. More than one
means the grain has regressed to an feTurbulence filter, which takes the file from
about 130 KB to 24 MB for identical output. Fewer than two font subsets means the
webfonts did not load and everything has fallen back to a system serif.

Both scripts need Chrome or Edge and network access. The two typefaces load from
api.fontshare.com at render time and a failed fetch falls back silently rather than
erroring.

HAND BACK

Build post 6 first. It is the strongest post in the set and the one where a botched
mark costs the most, so whatever you learn on it carries into the other three.

For each deck, show me the contact sheet, say what you changed and anything you are
unsure about, and give me the document title to type on upload. If you added a layout,
say so explicitly and show me that slide at full size. If a deck genuinely cannot take
its payoff word, say so rather than forcing one in.
```

---

## Before you paste it

`carousel-kit/` is **tracked in git**. Ensure any decks built from it are
committed, so a stray clean or a fresh clone loses the kit, the skill and any deck
built from them. Worth committing before handing the work to another session.

## If the generator alters colours or typefaces

It did not read `design-system.md`. Stop it and point at the file rather than letting
it continue. A deck built off the wrong palette is easier to rebuild than to correct.
