# 0189 — A part is given a character where it stands, and a die rolls one

- **Date:** 2026-08-28
- **Status:** accepted, extending
  [0152](0152-a-character-is-a-region-of-the-spec.md) — whose regions, amount and
  "no name is stored" all stand — and
  [0176](0176-a-part-is-the-dials-it-was-captured-from.md), whose part is a spec a hand fills.

**The character menu is mounted on every row of the song, not only in the card's corner.** It is
the same component with the same six names, the same Amount and the same dials under a pressed
name; what changes is the patch it is handed, which is the row's own — the one `deck.player` a part
edit already travels in (0089, 0176). Filling a part used to mean selecting its row, reaching back
up to the corner, pressing a name and reaching back down, which is four gestures for one thing a
hand wants. Nothing about a character changed to allow it: a part was already a spec.

**A menu drawn eight times needs a name eight times.** `PlayerCharacter` takes the `named` prefix
its dials already take, so a trigger, a slider and a hoisted dial say which part they belong to —
the same rule a part's own fold follows, and the reason it exists (0055, src/ui/PlayerDial.tsx).
Absent, the prefix is the yard's own and the card's corner is spelled exactly as it was.

**The die is the menu with the name left out.** One press draws a character at full strength into
the part and sends it as an ordinary part edit — undoable, logged, replayable, and the seed
untouched, so what moves is what the part is _like_ rather than which performance it is (0089,
0152). It is a third picture beside the wand and the shuffle because it is a third gesture: the
wand is a name a hand picked, the shuffle keeps the settings and draws another performance of them,
and the die picks the name too.

**`plain` is not a face of it.** Drawing plain puts every dial back where the switch leaves it,
which is a die that comes up "nothing happened" one press in six; the way to plain is the name
itself, one control along. `drawAnyCharacter` spends the caller's stream twice — which name, then
what it is — and reads the faces off `PLAYER_CHARACTERS`, so a character added to the cast is one
the die rolls with no change to it (principle 1).

**The die takes no amount.** The Amount slider lives inside the popover beside it and is that
menu's own view state; a die that read it would be a second control over one number, and one that
carried its own would be a third. A press that lands too far is a press again, or a name and a
slider one control along — which is what the menu is for.
