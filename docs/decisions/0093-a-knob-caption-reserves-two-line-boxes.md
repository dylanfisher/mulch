# 0093 — A knob caption reserves two line boxes

A knob is `w-16` and its caption is centred under the dial, so a two-word parameter label — "EQ
Gain", "Pre-delay", "Tape Tone" — wraps onto a second line and a one-word label does not. A rack
card is as tall as its knobs, so one wrapped caption made the reverb card taller than the cards
beside it and the row stopped reading as a row.

The caption is `h-[2lh]` in [`src/ui/Knob.tsx`](../../src/ui/Knob.tsx): two line boxes, spent
whether or not this label wraps into them. The height is a fact about the control rather than
about any label, which is why it is not conditional on the text, and why nothing in the parameter
registries has to keep labels short to keep a row level.

What this constrains: a parameter label of three lines would overflow rather than grow the box, so
the registries stay inside two — and any later caption drawn under a dial reserves the same box
rather than sizing itself. The class is asserted in `src/ui/Knob.test.tsx`, which lays nothing out;
the height itself is measured in the browser by `scripts/smoke.d/rackRow.js`.
