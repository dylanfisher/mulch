# 0212 — The picture draws the run a read is holding

- **Date:** 2026-08-30
- **Status:** accepted, extending [0145](0145-a-picture-may-rest-on-analysis.md) and
  [0159](0159-a-song-is-the-pictures-one-stepped-row.md)

A yard's drift no longer has one row per _stored_ thing. Every effect an automator has grown carries
a row of its own — cut to that plugin's wave and coordinate, its identity folded off the id the run
minted for it, reaching through that plugin's own `driftFrom` off what the run drew its knobs at. A
run is drawn from a seed and never stored
([0204](0204-a-run-is-laid-on-the-automation-horizon.md)), so the only place it exists is
`DeckPeek.grown`, which is where the picture reads it. 0145 already permits this: a picture may rest
on what is not stored precisely because nothing about a picture is stored.

**A run moving rebuilds the row set on the frame that notices, in a ref.** Which rows a picture has,
and what each is cut to, is a function of a population no session holds and nothing re-renders when
it changes, so the frame path compares what it last built from against the read's own
(`grownStanding`, allocation-free) and rebuilds when they differ. The ids, not the count — a place
going as another arrives is a different picture of the same length — and the draws beside them,
because a wander rewrites a standing place's knobs in place and a rack instance's row is rebuilt the
moment one of the values it reaches through moves. That is a tick of the run at most, a second at
its fastest. React state was tried first and is wrong twice over: it reads a ref during render, and
the boundary keeps per-frame work out of state precisely so a run moving is a transform rather than
a render — already how the automator's own card draws the same run.

So there are two sets: the session's own, built with no run at all, where the estimate beside the
picture is read; and the one a frame paints, which is that set with the run's rows grown onto it.
They cannot disagree about the estimate — a yard holding an automator never comes round whatever it
has grown ([0080](0080-the-recurrence-is-an-estimate-on-a-relative-grid.md),
[0208](0208-a-run-is-bounded-off-the-pool-it-draws-from.md)) — and both come out of one call, so
what a set is built from is named once.

**The part standing moves what its row _is_, not only what it looks like.** A song is the picture's
one stepped row (0159), and identity, spacing and tint recoloured one row out of a dozen — a song
coming round was a picture that barely moved. The wave the row is cut to and the coordinate it is
cut along are the standing part's too, so a boundary is a comb becoming a ring: the row leaves one
family of fringes for another ([0142](0142-a-row-is-cut-on-a-coordinate-of-its-own.md)) rather than
the same field in another colour. All five step at the boundary and rest between two, which keeps
them off the pixel loop ([0141](0141-colour-is-something-an-effect-turns.md)).

**The module's row wears only the profiles no effect may claim** — `RESERVED_PROFILES`, the pair a
registry entry is refused at load ([0137](0137-an-effect-declares-the-wave-it-draws-with.md)). The
module is one of the instrument's own rows, and a song wearing a plugin's wave would make the
picture say a plugin is doing what the arrangement is doing, which is that rule read from the other
side. Geometry is claimed by nobody, so it takes its pick of all four. Both are read off bits of the
part's badge the tint does not spend, or they would be a second name for its colour.

**A grown row votes in the screen like any other** (`boldest`, src/ui/moireScreen.ts), so a run is
the first thing on a yard that moves the picture's own tint with no hand on it — and that screen's
tile cache evicts oldest first where the drift's refuses a key wanted lately. Left as it stands:
what is grown is drawn, colour included, and the profiler finds frame p95 at its median with no long
task. If it ever thrashes the answer is a recency guard on that cache, not a row kept out.

Nothing durable moved, and no `DRIFT_*_REACH` moved: a reach is one number every row already spends.
