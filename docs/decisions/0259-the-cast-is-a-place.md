# 0259 — The cast is a place

- **Date:** 2026-09-01
- **Status:** accepted, extending [0152](0152-a-character-is-a-region-of-the-spec.md); the argument is
  `BlendHexagon` on the bench ([0252](0252-the-blend-is-four-arguments-and-every-corner-is-named.md))

The card's front carries one road into the cast: a hexagon whose six corners are the six characters,
where a corner's **name pressed** draws that character whole and the **puck dragged** weighs the
pattern out of all six at once (src/ui/PlayerBlend.tsx). Every gesture on it writes one
`deck.player` carrying the whole spec and leaves `PLAYER_SONG_KNOBS` exactly where the hand put them
— one `shapedSpec`, in src/lib/playerCharacter.ts (principle 1).

**One control, not two beside each other.** The pad has to name its corners to be usable at all —
a hand cannot find a character it cannot read (0252) — and a name a hand can read is a name a hand
will press. Six buttons under the pad were the same six words twice on one front, and the second
copy is what a hand had to learn was redundant. The pressed name's own dials and the Amount slider
live on where a spec is edited one part at a time (src/ui/PlayerCharacter.tsx, a song row's menu).

**A name is the whole corner, not the corner's coordinates.** `weighBlend` is softened so the
middle of the pad is an even six rather than a spike at whichever corner is a hair nearer — which
leaves a puck sitting exactly on a corner carrying about a fifth of everything else. So a press
writes `blendCorner`: one at that corner, nought at the rest, which `blendCast` returns untouched.
The pad shows what it wrote — the shares beside the names read 100 and 0 — until a drag moves it.
That third digit is why the box spills 60 units past the square rather than the bench's 52: a name
that runs off the edge of its own picture reads as a smaller number, not as a truncation (0252).

**Six draws, weighed — never six draws a frame.** The pad draws one voice per character on the
gesture that first needs one and then blends _those six_ as the puck moves, exactly as the Amount
slider moves along one drawn character rather than drawing again (0152). A pad that redrew on every
pointer move would be a die with a thousand faces and not a control. A second set of six is a press
of its own, which is `PLAYER_AGAIN_LABEL`'s argument said for the whole cast.

**`blendCast` is `at` generalised, not a second arithmetic.** It reads the curve off
`PLAYER_KNOB_DIALS` and the count off `isWholeKnob`, so a knob's blend and a knob's dial cannot
disagree: geometric along a log curve, arithmetic along a linear one, rounded where the knob counts.
A weight of one on one corner is that corner's draw exactly, because `at` promises its two ends by
name and six is the same promise. `plain` needs no case — its region names no knob, so its draw is
`PLAYER_DEFAULTS` and the identity falls out of the weighing.

**The pad is beside the walk and not under it.** The walk is what the cast came out as, so a hand
dragging the puck watches the score redraw under the very same glance (0258). It keeps its own
width, because the box and the drawing share one ratio and any other letterboxes the drawing while
the pointer maths stretch-fits (0252).
