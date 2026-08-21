# 0095 — A global transport press is the per-deck commands

Space and the header's three buttons move every yard at once. There was a command for that —
`decks.play.toggle`, which asked the graph to start every loaded deck at one sampled clock time —
and it is gone. A global press is now expanded, in
[`src/ui/actions.ts`](../../src/ui/actions.ts), into the ordinary `deck.play`, `deck.pause` or
`deck.stop` a person pressing every yard in turn would have sent, one per yard, in the session's
own order.

The reason is that a global press is a gesture, not a kind of state. Expanded, the event log, a
replayed command file and `./scripts/drive` see the same three commands whether the press was one
button or three yards' buttons, and nothing has to learn a second transport vocabulary. The
alignment the old command bought is not lost: `currentTime` does not advance inside a synchronous
task, and the queue drains one press in one task, so every `engine.play` in that press samples the
same clock. `scripts/smoke.d/keyboard.js` is what proves it, by comparing the two decks' reported
starts. What is no longer structural is that a press spread across tasks — a replayed envelope file
carrying its own `at`s, or a driver sending one command per round trip — would start the yards at
different clock times where one all-decks command could not. That is the price of the expansion,
and it is a property of how the commands are delivered rather than of what they say.

Three rules fall out.

**A yard with nothing loaded is skipped rather than refused.** A global press must not spray one
error per empty yard, and that yard's own transport row is disabled for the same reason, so a
session with no yards — or none loaded — is a press that sends nothing.

**Space sends the yard's own play toggle, one per yard, and decides nothing itself.** Whether a
yard is sounding is the graph's to answer: the session's `playing` is written only when the voice
reports its first sample, a `LOOKAHEAD_SECS` after the press, so a surface that resolved play
against pause by reading it would send `deck.play` again inside that window and rewind every yard
instead of pausing it. `deck.play.toggle` asks `engine.planned` at the moment it runs, which is
what one yard's control has always done ([0038](0038-pause-holds-the-playhead-stop-rewinds-it.md)).
The cost is that yards in different states flip independently rather than landing on one of them —
which is exactly what pressing every yard in turn does, and the yards that were together stay
together either way.

**The header's Play starts every yard, including one already playing.** `deck.play` resumes a held
playhead and rewinds one that is not, so pressing it under three running yards lines all three up
at the top of their loops. That is the gesture, not a defect, and `TRANSPORT_ALL_TOOLTIPS.play`
says so; pausing is the Pause button beside it, and the toggle is Space.

What this constrains: the next fact that belongs to more than one yard — a shared jump clock, a
follower — cannot be smuggled in as an all-decks command. It is either a session field or a
per-deck reference, and the gesture that moves it still expands into per-deck commands.
