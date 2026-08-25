# 0166 — A spark rides the landing's entry, and the queue stays a queue of landings

A landing may throw a **spark**: a second, quieter read of another slot, sounding for exactly as
long as the landing that threw it. `spark` is the odds it throws one and `sparkLevel` is how loud
that one is against it — two ordinary fields of `PlayerSpec`, rolled per landing the way the drop
and the reverse are, so a pattern that sparks nothing rolls nothing and lays the stream it laid
before the field existed ([0160](0160-a-hole-is-a-landing-that-never-opens.md), P121).

**The queue is a queue of landings, and a companion is held on the landing's own entry.**
`position()` scans the transport's queue for the latest entry the clock is at or past and answers
the deck's read head off that one (`src/audio/player.ts`). A companion pushed onto that list as an
entry of its own would win that scan half the time, and the playhead, the picture and the peek
would follow the spark instead of the landing — the instrument showing one region of the loop while
the pattern is at another. So `Scheduled` grows a `spark` field holding the second source and its
level gain, and nothing else about the queue changes: one entry per landing, one scan, one answer.

**A spark is a slot and a level and nothing else.** Everything else it has it takes from the
landing that threw it, because it hangs under that landing's own fader: the same start, the same
count, the same stop, the same seams, the same direction, and silence where the landing is a hole.
What it does not take is the landing's loop period: a read is clamped so it never runs past the end
of the loop's grid, and that clamp is its own slot's — a burst wider than a slot wraps sooner near
the end of the loop, for a spark exactly as for a landing ([0089](0089-a-jump-is-the-transports.md)). That is what makes it a companion rather than a step — a step of its own would need a rest, a
rate and a place in the grid, and there is nowhere for those to come from that is not a second
walk.

**Where it lands is drawn from the one stream the pattern is a function of.** The spark's slot is
`travelFrom` — the same jump the walk makes between two landings, obeying the distance, the lean,
the home and the mask — taken off the walk's own generator and never a second one, so a moved knob
can still re-derive the tail ([0096](0096-a-moved-number-re-derives-the-tail.md), 0089).

**Across yards is not this.** Two yards sparking at each other would be a follower, which
[0097](0097-yards-jump-on-one-session-clock.md) considered and refused: the shared clock is the
sanctioned road between yards, and reopening it is a decision before it is work.
