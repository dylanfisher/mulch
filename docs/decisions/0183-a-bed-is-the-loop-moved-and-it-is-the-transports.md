# 0183 — A bed is the loop moved, and it is the transport's

- **Date:** 2026-08-27
- **Status:** accepted, resting on
  [0089](0089-a-jump-is-the-transports.md) — a jump moves where a deck reads from, and this is that
  one grid up — and on [0162](0162-a-lean-is-an-amount-and-replaces-the-walk.md), whose lean it
  spends a second time rather than naming two walks again; it extends
  [0176](0176-a-part-is-the-dials-it-was-captured-from.md) without touching it.

**A bed is one loop-length of the source, and the loop is bed zero.** `PlayerSpec` grows five
fields in `src/lib/playerBed.ts` — which bed a part opens on, how many jumps pass before the loop
moves to another, and the distance, lean and home of that move. The grid inside a bed is
completely untouched: sixteen slots, the same draws, the same distances. What moves is the
_window_ those sixteen slots are cut out of.

**The durable loop never moves, because the alternative restarts the pattern.** `deck.loop` is a
hand's command, it is undoable, and `moveInPlace` in `src/audio/deck.ts` refuses outright while a
player is held — so a loop move fired by a clock would restart the whole pass, several times a
second, and write a history entry for each. Instead the walk carries a bed index on every step and
the transport resolves it when it arms the landing, which is exactly what 0089 already decided
about a jump: where a deck reads from is the transport's, and the session holds the pattern rather
than the positions. Undo, persistence, archives, the audition (0181) and export parity all keep
working because none of them sees a new kind of edit.

**The walk carries an unbounded index and the transport folds it.** How many beds a file holds is a
fact about the file, and a spec is checked identically whatever deck it lands on — so `bed` is a
number in ±64 naming no buffer, and `bedWrap` folds it onto the beds that exist at the one place
knowing both, `gridOf`. One author of where a pattern is, one resolver of where that lands
(principle 1). It **wraps rather than clamping**, because a clamp pins a leaning pattern against
the end of the file for the rest of the performance — the answer the slot walk already gives at
`PLAYER_SLOTS`. A loop with no room either side answers one bed, which is this module before the
ground could move.

**Every read comes through one function.** `slotStart(grid, slot, bed)` in `src/audio/player.ts` is
the source that reads a slot and the two cursors that report one, so the graph, the playhead and
the picture cannot disagree about which ground the yard is on. The burst clamp moved with it: a
burst stops at the end of _its own bed_ rather than the loop's, or a landing on the last slot of a
moved loop would read on into whatever the file holds next — audio the pattern never chose.

**A part carries its bed, and that is the whole feature.** The five fields go into
`PLAYER_PART_KNOBS` and not beside the four the song is drawn by, so `PartVoice` picks them up and
a part captures its ground at the gesture that adds it, exactly as it captures its burst (0176).
The walk resets the bed cursor at every part boundary — the one reset in that block that is the
_point_ rather than a consequence, since "the melody always opens on the same ground" says nothing
at all if the walk arrives carrying wherever the part before it wandered to. A home comes back to
the **part's** bed and never to the loop's, for the same reason.

**The lean is spent again rather than named again.** `travelFrom`'s middle is now `leanStep`, which
both grids draw one move from: the home roll, the stride's, the distance, the side, in that order
and no other. Extracted verbatim, so every stored pattern lays down precisely the stream it laid
before — and a caller with no stride dial passes zero, the value that already rolls nothing. A bed
that never moves rolls nothing at all, which is
[0134](0134-a-pattern-plays-the-repeats-it-was-set.md)'s rule said for the ground and is what makes
this a field every existing performance is deaf to.

**No character names any of the five**, which is the written answer 0152 asks for rather than an
omission. A character says what a pattern is _like_; which bed it reads is a _where_, and one name
pressed on two yards over two samples would point them at two unrelated places. A period is not a
texture either, which is the argument the ratchet and the climb are left out on. What a bed is for
is an arrangement, and an arrangement is what a hand writes rather than what a die draws (0158).

**The peaks say where the loop is standing.** A second, dimmer rectangle in the loop's own ink,
written per frame off `PlayerPeek`'s own step (0180) and hidden on bed zero, where a rectangle drawn
over the loop would claim a move that never happened. `applyOverlay` keeps its single writership of
the loop's overlay ([0103](0103-the-loop-overlay-has-one-writer.md) untouched): that is a fact about
the loop, and this is a fact about the pattern.

Two families moved out of `src/lib/player.ts` to make the lines, which was at 799 of the 800 hard
cap ([0045](0045-the-hard-cap-is-enforced-where-no-waiver-reaches.md)): the count's four to
`src/lib/playerRepeats.ts`, and the character amount to `src/lib/playerCharacter.ts`, where that
file's own `@role` has said it lives since 0152 and where it belongs because it is not one of the
spec's numbers at all. A session holding the old shape is discarded rather than migrated
([0026](0026-pre-release-has-no-migrations.md)).
