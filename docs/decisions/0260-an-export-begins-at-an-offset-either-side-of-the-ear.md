# 0260 — An export begins at an offset either side of the ear

- **Date:** 2026-09-01
- **Status:** accepted, extending [0239](0239-a-warm-up-is-bounded-by-what-a-rack-remembers.md)

`ExportSpec.backSecs` was a lookback: nought or behind, refused below nought. It is an **offset**
now, and a negative one begins the take that far past the ear — the only way to ask for a stretch
of the performance nobody has played yet, which for a pattern that draws its own future is a
reasonable thing to ask for. The cap bounds it either way, because a render allocates its whole
output up front whichever direction the offset points.

0239 bounds the warm-up by `sessionSettleSecs` "for a lookback of nought and no other", and the
argument it gives is that a take at the ear renders _forward_, so no part of the warm-up is audio
anyone has heard. That argument holds unchanged for a take begun past the ear — the window it names
has not been played either, so there is nothing there to reproduce. The bound therefore follows the
sign rather than the single value: it applies at nought **and below**, and to no offset behind the
ear, where a window of the performance is named and only a replay reaches it.

What is unchanged is which of the two numbers is said out loud: `beginsSecs` is the take's subject
and `warmSecs` is what is rendered ahead of it, and they part exactly where the settle shortens a
take the offset did not put behind the ear.
