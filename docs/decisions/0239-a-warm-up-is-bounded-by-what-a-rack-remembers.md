# 0239. A warm-up is bounded by what the rack remembers, and every effect says how long that is

- **Date:** 2026-08-31
- **Status:** accepted

An export renders `warmSecs + secs` and keeps only the take, and `warmSecs` was the whole elapsed
performance — so a session twenty-five minutes in exporting three rendered twenty-eight, and P180
measured every one of those seconds at the same price (§4). The warm-up is now bounded by
`sessionSettleSecs`: the longest `settle` any unbypassed entry in any rack declares.

This is sound because of what the warm-up is actually for. With the default lookback of nought a
take begins at the live playhead and renders _forward_, so no part of it is audio anyone has heard —
the warm-up's only job is to put the instrument into the state it is in, and past the longest memory
in the rack it already is.

`settle` is declared by every registry entry and defaulted by none, for the reason 0148 gives about
`driftUnreached`: an effect that remembers nothing and an effect nobody thought about are identical
from the outside, and the second one is a shortened warm-up that renders the wrong file. The
registry refuses an entry whose `settle` is not a usable number, at load, where nothing can reach
past it.

`Infinity` is a real answer and not a refusal to compute one, and two things say it. A feedback loop
at or above unity never decays — `tape.feedback` reaches 1.4 deliberately — so what it holds is
everything it has been given. And an automator's run decides by tick index, so which instances are
standing is a function of how long it has been going; no window reconstructs that. A lane is the
third, and it is not an effect's to declare: its phase belongs to its pass, so `sessionSettleSecs`
answers `Infinity` for a deck holding one. Each of those keeps the whole warm-up it always had.

The cost is that an export of a session below that bound is no longer the same bytes it was, which
is the trade this record exists to state. What is given up is the tail of material older than the
rack's own memory — inaudible by the definition of the memory — and what is bought is that the
render is proportional to the take rather than to how long the instrument has been switched on.
