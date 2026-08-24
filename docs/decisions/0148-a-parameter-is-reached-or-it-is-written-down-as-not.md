# 0148 — A parameter is reached, or it is written down as not

- **Date:** 2026-08-24
- **Status:** accepted, extending
  [0139](0139-a-row-is-what-an-effect-is-set-to.md) and
  [0122](0122-a-registry-answers-for-itself-at-load.md)

0139 gave each registry entry a way to say how its own values reach the drift, and there were four
dimensions to say it in. Two entries have more than four parameters, so those entries **could not**
declare a mapping for all of them: the compressor said nothing with four of its six and the tape
with three of its seven. Nothing anywhere said so. An entry that had run out of dimensions and an
entry that had decided a value says nothing about a row read identically from outside — which is
the same silence 0139 was written to end, one level up.

**Every parameter is in exactly one of two lists, and the registry throws at load for one that is
in neither.** `driftUnreached` joins `driftFrom` on `Effect`: the parameter, and the reason there is
no honest dimension for it, in prose. `validateEffects` refuses a parameter in both lists, one
declared unreached that the entry does not own, one whose reason is blank, and — the rule this
decision is for — one the entry never mentions. So the only way a value stays out of the picture is
by someone writing down why, and the next parameter added to a plugin fails the load rather than
disappearing.

**A value's meaning chooses the dimension, not the free slot.** P102, P103 and P104 took the count
from four to twelve, which is enough room that a mapping can be picked badly. The eight that were
silent are now: the delay's mix and the tape's amount into `depth`, because how much of an effect is
heard is how much of its own depth its row cuts, which is the reading the reverb's wet already had;
the tape's tone into `hue`, the reading the reverb's tone already had; the tape's hiss into `pitch`,
a noisier medium resolving less of what is on it and so standing its fringes further apart; the
compressor's threshold into `centre`, being the level everything else in that effect is measured
from; its attack into `bend`, a gain lagging what it follows being a row that surges and stalls
rather than travelling evenly; and its knee into `chirp`, being the range the ratio comes in over
rather than the corner it turns at — the same argument the filter's cutoff already made for that
dimension.

**Two of those say something the rule cannot check, and both are somebody else's rule.** A colour
dimension is read per picture off the boldest claim rather than per row
([0141](0141-colour-is-something-an-effect-turns.md)), so a tape's tone colours the picture when it
is bolder than the reverb's and not otherwise — reached, and heard when it has the loudest thing to
say, which is what 0141 decided rather than a silence this rule missed. And `comp.attack` is
declared linear over 0.001..1s, so every attack a person actually sets sits in the bottom of its own
travel and bends its row faintly; that is the parameter's own declared range and a curve on it is a
change to what the knob does, which is not what a sweep of the picture may decide.

**And one is written down as unreached.** `comp.output` is a makeup gain: a level put back after the
threshold took it off. The one dimension in the picture that means level is `depth`, and the ratio
holds it because how hard the compressor squeezes is what the effect is. Everything left says where
a row is, how fine it is drawn, or what colour it is in, and a gain is none of those. Declaring it
unreached is the outcome this decision exists to make sayable — a value with no honest place is not
a gap, and taking a free dimension for it would have been the slot choosing rather than the meaning.

Durable shape: none. Nothing about a picture is stored
([0131](0131-a-row-is-a-grating-and-the-picture-is-their-product.md)).
