# 0078. A yard is duplicated by one command, and its own gestures sit on it

- **Date:** 2026-08-16
- **Status:** accepted

`deck.duplicate` names the yard being copied and carries the new one's id, emoji and name — drawn
at the gesture beside each other exactly as `deck.add`'s are, because a reducer that drew its own
would make replay, restore and the fingerprint non-deterministic (0057). One id per command is the
whole of what a caller states: everything the copy carries — source, parameters, rack instances,
their values, bypass, lanes, loop — is expanded by the reducer through `src/app/restore.ts`'s one
stage list, as `deck.add` plus that list in one grouped, undoable durable edit (0027). A UI that
listed those commands itself would be a second way to build a deck. The copy inherits no transport
for the same reason: no stage plays anything, so a copy of a playing yard arrives stopped.

The copied rack instances get ids of their own, and they are derived rather than drawn: an
instance's position in the rack in fixed digits, then the yard it landed in. Derived keeps replay
deterministic; derived _from the position_ rather than from the id being copied is what bounds the
length — an id built by appending to the one before it runs past `DURABLE_TEXT_MAX` after enough
duplications of duplications — and what makes the copies rank in rack order whatever shape the
originals' ids had, which is what a card's ordinal reads (0076). It is cut to `DURABLE_TEXT_MAX`
for the other end of the same argument: a deck id may itself be the whole of that budget, and the
cut takes the tail so the position stays in front. A fresh id means a fresh drawn name, so no card
in the copy wears a name it shares with the yard it came from.

Like `clip.apply`, it is durable but not groupable: it finishes through `historyGroup`, so a group
holding one would be a group inside a group. It refuses a target the session already holds before
anything runs, rather than leaving the `deck.add` inside the group to report the clash while the
stages behind it rewrote a yard nobody named.

Capture-as-a-clip moved out of the clip rack onto each yard's own top-right group, beside duplicate,
remove and the fold: a gesture about one yard belongs where that yard is, and the rack is left as
the list of what was captured. Both are palette entries too, reaching the same constructions in
`src/ui/actions.ts` that the buttons reach — which is where a command more than one surface sends
is built, and the reason `deck.duplicate`'s builder lives there rather than at the button (P41,
0069).

A playing yard wears the recycle mark beside its transport: two arrows that lengthen and inch round
in a stutter — ease, stop, the tail catches up, ease again. It is a decoration, so it is one element
and two CSS keyframes declared in `src/ui/tokens.css`, and it holds no hook at all. Nothing that
only says _whether_ a deck is playing needs the frame loop; that loop is for what says _where_ it is
reading (plan §2). A stopped yard renders nothing.
