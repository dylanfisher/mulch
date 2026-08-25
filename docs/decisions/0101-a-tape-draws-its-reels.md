# 0101 — A tape draws its reels, out of what it already holds

- **Status:** the drawing is gone — [0171](0171-a-drawing-that-says-only-that-goes.md) removed the
  reels, P89's box with them, and the `width: "full"` the box needed. What stands is the rule the
  first paragraph is: a picture draws only what the interface is already holding, and an effect's
  picture belongs to the rack card whose id names it, on the day one wants a picture again.

**A picture draws only what the interface is already holding.** The reels turn at the rate the
deck reads at — `playbackRate(deck.speed, deck.pitch)`, the one statement of what those two knobs
mean (0031); neither of those two is automatable, so that rate is the value and nothing bends it —
and they are wound by `tape.time`, read against the range that parameter declares, live where a
lane is bending it: `peek()` already files that lane's phase under this instance's key, and
`automationValueAt` is the same `src/lib` reading the knob beside it paints its dial from (0035).
A picture that sat at the base value while the knob an inch away swept would be the step's own
claim read backwards. What is _not_ drawn is what the graph does not report: the player's drift
multiplies the source's rate by a ratio nothing publishes, so the drawing goes without it. No
parameter was added, no durable field, and nothing new is reported across the worklet seam — a
reporter added for a picture is a per-frame cost paid by every session that holds none.

**The angle is carried, not derived from a clock.** A reel's turn is accumulated per frame from
the elapsed since the last one, capped at `MAX_STEP_SECS`, so a halted deck freezes where it is
and a backgrounded tab comes back to where the tape is rather than to where the wall clock got to.
One linear tape speed drives both reels and the radius is area-proportional to what each holds
above a floor, which is why the fuller one turns slower — the whole of what makes a longer repeat
read as something other than a resize.

**A reel is a reel at every value (P89).** Both ends of the repeat empty one of the two, and an
emptied reel whose radius mapped onto its hub drew a bare flange: no ring of tape, spokes of no
length, half the picture gone at the two values a knob is most often left on. The radius maps onto
`REEL_FLOOR` instead, which costs the sentence above a third of its contrast — the empty reel turns
2.2× the full one's rate rather than 3.3× — and that is the trade: the fuller reel still visibly
turns slower, and the emptied one is still a reel. It is why the ring is now always drawn and the
guard against a zero line width is gone: the floor sits above the hub by construction. The box
grew with it — 160×80 rather than 112×48, the drawing's own aspect and no wider, so the reels fill
it rather than reserving room they cannot grow into — which the Cost below predates and no
profiled scenario mounts.

**An effect's picture belongs to the rack card.** A plugin carries its own icon (0056), but an
icon is a third-party component and this one is not: it paints through `src/ui/canvasSurface.ts`,
and `src/audio` may import only `src/lib` (docs/map.md), so the plugin cannot name it. What could
be declared is an id-keyed lookup on the `src/ui` side; `EffectCard` names the one effect that
draws itself instead. That is the first occurrence and not a table: the day a second plugin wants
a picture it is a second `if`, and the third is the one that earns a declaration (principle 3).
This is not the hand-wiring boundaries.md forbids — no effect is built, ordered or routed here;
the rack still renders every card, every knob and every instance from the registry, and what the
card names is which of them has a picture.

**Cost.** Interleaved base/head over twelve three-second windows each, a rack holding one tape
playing: 0.065 against 0.069 ms of main-thread script per frame — about four microseconds, which
is 0.02% of a frame at 60Hz and below what the profiler's own p95 can see.
