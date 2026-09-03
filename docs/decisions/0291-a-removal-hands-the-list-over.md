# 0291 — A removal hands the list over, and emptying one asks first

- **Date:** 2026-09-02
- **Status:** accepted, beside [0275](0275-the-run-is-a-launch-grid-and-a-press-arms-the-next-part.md)'s pick and [0089](0089-a-jump-is-the-transports.md)'s one road

**Taking one thing out of a list picks its neighbour.** The survivors are computed once and the
pick lands on whatever slid into the removed index, else the one before it, else nothing — a
remove keeps the hand's aim, which is what the part row under a song already did and what every
list on this instrument does from here. The pick stays the yard's `useState`: no command, nothing
durable (plan §2, 0275).

**And the keyboard goes with it**, through a callback ref on the neighbour's own Remove button
keyed on the thing under the row, gated on a ref that only a removal writes. A list emptied by
keys is emptied by pressing one key; an ordinary pick never takes the caret off what the pointer
is holding. The ref is the imperative focus `KnobReadout` already uses and the only other one in
the app.

**A clear-all ends the gesture on both sides of its edit.** `deck.player` is keyed by its deck
alone (`gestureOf`), so a song renamed inside `GESTURE_IDLE_MS` before the press would swallow it
into that edit's entry, and a song added inside the window after it would join the clear's. One
`gesture.end`, the patch, one `gesture.end`: one press, one entry, one undo. Any future press that
empties a list a hand is editing owes both endings — a leading one alone is half the fence.

**And it is offered only where the list it empties is on screen.** A pattern drawing its own
arrangement holds the written list untouched (0158), so the word is absent then as it is over an
empty list: a press that takes a dozen columns nothing on screen says are there is a press whose
whole effect is an undo nobody can see.

**The word is asked, and it is one word.** The trigger carries no command and the confirmation
says how many are going, which is the rack's own shape (0055) — and `CLEAR_ALL_LABEL` is now said
once in src/lib/copy.ts for both headings, because two lists disagreeing about what emptying is
called is the fault a shared word prevents (principle 1). Nothing to take is nothing to offer: on
an empty list the word is absent, not disabled.
