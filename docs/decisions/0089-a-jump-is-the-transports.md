# 0089 — A jump is the transport's, so the player is the deck's own module

The player — the thing that jumps the read position around the loop and stutters the gate between
jumps — is a per-deck module beside the loop, not a rack plugin and not a pattern of automation
lanes. Its durable shape is one nullable record on `SessionDeck` (`player`), moved by one command
(`deck.player`), scheduled by `src/audio/deck.ts`, and nothing about it is declared in
`src/audio/params.ts`.

Three shapes were open and the boundary decided between them.

**A rack plugin allowed to reach the transport is ruled out.** An effect is a registry entry a rack
holds instances of, and what an instance does is process the audio that reaches it
([0016](0016-effects-are-ordered-plugins.md), [0030](0030-effects-are-instances.md),
[docs/boundaries.md](../boundaries.md)). A jump moves _where the deck is reading from_ — the same
numbers the loop handles and the crop move — so a plugin that could do this would need a handle on
the voice, and the moment one plugin has that, "an effect processes what reaches it" is no longer
true of any of them. The rack's own invariants depend on that sentence: an instance can be
bypassed, reordered, removed and duplicated precisely because it holds nothing but its own nodes.

**A pattern of automation lanes is ruled out.** A lane is a gesture over one declared parameter,
scheduled onto the AudioParam that parameter is bound to
([0049](0049-one-parameter-is-one-audioparam.md)); there is no read-position AudioParam and there
cannot be one, because a position is not a value a graph ramps — it is which source is playing and
from which offset. A lane also repeats on its own span from its own anchor and never restarts a
source, which is the whole of what a jump is.

**So the player is the deck's, beside the loop.** It follows `loop` exactly: a nullable record on
`SessionDeck` with its own command, its own event, its own restore stage and its own validator
clause. It is deliberately _not_ in `PARAMS`: that registry is total against a binding in
`src/audio/chain.ts` and everything in it owes an AudioParam, which none of the player's four
fields has. The variation is a declared enum (`PLAYER_VARIATIONS`) rather than a free number, so
the set of shapes is closed at the type and at the validator.

**The seed is the field that makes a performance reproducible.** The pattern is drawn from
`spec.seed` through `mulberry32` and never from `Math.random()` at play time, and the walk is
re-created from the seed on every `start()` — so a play, a re-play after a pause, a reload and an
offline render all lay down the same sequence, and the same session fingerprints identically twice
([0068](0068-an-export-is-a-render-spec.md)). A seed is drawn once, at the gesture that turns the
player on, and is durable from then on.

**A step is scheduled ahead, and the deck keeps posting one plan.** Nothing on the main thread runs
during an offline render, so every jump is built and started before it sounds — several at once,
across the same horizon the lanes are armed over ([0071](0071-the-offline-pump-arms-the-lanes.md)),
which is why `armAutomation` now arms both. Several sources are therefore in flight at once, and
one plan is posted for the whole pass: the loop's own grid, so `deck.looped` keeps counting the
length that would have brought the deck round and does not become a boundary every sixteenth. That
plan is a metronome and never a position — `peek()`, and the resume a cleared loop takes, both read
the step schedule instead — and `deck.started` still fires exactly once.

**A cursor that falls behind the clock skips to it.** The arming is the one scheduler here with a
cursor that only moves forward, so a tick that arrives late — a stalled main thread, a background
tab throttled to one interval a minute — would otherwise lay every remaining step down in the past
and leave a deck that reads as playing silent for good. It arms from the clock instead. Offline the
branch is never taken, because the pump's stops are exact, so a render and a live pass still lay
down the same pattern.

**Every jump is a fade at the seam.** Each player source carries a gain of its own — created only
when the player is on, so a deck without one connects exactly as it always did and no golden
fingerprint moves — and that gain is opened and closed along the equal-power law in
[`src/lib/crossfade.ts`](../../src/lib/crossfade.ts), sampled as `fadeCurve`. An ungated step
overlaps the next by `PLAYER_FADE_SECS` and the pair is a true crossfade, the squares summing to
one; a gated step has already closed along the same curve before the seam arrives. There is no
path on which a source starts or stops without a curve on its gain.

Two curves on one gain that overlap by a float's last bit are a `NotSupportedError`, not a rounding
nuisance, so the gate cuts a repeat only where the drawn fraction leaves a whole fade of daylight
on both sides of the closing curve. A fraction tighter than that is played whole rather than pinned
to a margin of exactly zero — which is what a slot short enough to need pinning would have been, an
arithmetic accident away from throwing mid-pattern and killing the arming tick with it.

**A step is a window measured in the seconds the rate makes of a slot**, so a speed change lays the
steps still ahead of the clock down again at the new one rather than playing old windows at a new
rate. The one sounding keeps the window it was given, and the seam between it and its replacement
is faded like any other.

What this rules out, beyond the two shapes above: the player cannot be automated, because it
declares no parameter; it cannot be reordered or bypassed, because it is not in a rack; and it
cannot run without a loop, because a jump is a move inside the loop's own grid and there is no
grid without one. The narrowings that follow from this shape — what a speed change mid-pattern
does, and the shortest slot that can carry a fade — are recorded in `docs/plan.md` §4.
