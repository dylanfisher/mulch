# 0225 — Off is a bypass, and the graph is the only thing told

- **Date:** 2026-08-30
- **Status:** accepted, amending [0089](0089-a-jump-is-the-transports.md)

**`PlayerSpec` carries `bypassed`, and turning the switch off no longer discards a pattern.** Null on
the deck now means a yard that has never held one; a spec with `bypassed: true` is one the hand is
holding with the module switched off. The switch mints a seed and the factory dials only where
`player === null`, and thereafter it turns one field over — so the seed, the arrangement, the grounds
a hand kept and every dial it turned survive a press, and the only gesture that takes a spec away is
the undo of the press that made it. That is what `effect.bypass` already means everywhere else in
this instrument, and the module was the last surface where off meant discard while holding the most
work.

**`playerSounding` in `src/lib/player.ts` is the one reader of the field.** It sits there rather than
at either caller because a pattern reaches the graph in two places — `setPlayer` in
`src/app/deckPlayer.ts`, and the arming of a restored, undone or imported session in
`src/app/engine.ts` — and a rule spelled at one of them is the one that would go on jumping after the
other. Everything above the graph carries the spec entire: the store, the `deck.player.changed`
event, history and the stored session, because a bypassed pattern is a durable thing a yard is
holding. Nothing downstream of a voice learns a second way to be silent.

**The card draws a bypassed yard exactly as it draws an unswitched one.** `playerSounding` answers
that question for the UI too — the card reads `live` for everything it _draws_ and `player` for
everything it _sends_ — so a bypassed module shows `OFF_SPEC`'s greyed, unturnable dials, no seed
readout and no song section, while the values that come back are the held ones. Two answers about
whether the module is on would be two things to keep in step.

No migration and none needed: a stored spec without the field is not this build's shape and is
discarded ([0026](0026-pre-release-has-no-migrations.md)).
