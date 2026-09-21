# 0392 — A fold is remembered, and the master's starts open when it is full

- **Date:** 2026-09-21
- **Status:** accepted

**A rack's fold outlives a reload** (src/ui/rackFold.ts): `useRackFold(rack, whenUnset)` reads what
a hand last left this rack as, and falls back to the caller's own default only where no hand has
said. "master effects should not collapse by default if any effects are present (or better yet,
remember collapse state of each deck/module in local browser session)." Both racks read it — the
master's (src/ui/MasterRack.tsx) and every yard's (src/ui/Deck.tsx) — keyed by the same
`DeckId | null` every control on a rack is addressed by, the master being the address that names no
yard (0320).

**A fold is still a view preference, and nothing else.** No command, no history entry, nothing in
the session (plan §2): it is `localStorage` written straight from the setter, the one module beside
src/ui/theme.ts — a cache so a render is not a store read, junk in the store is not a choice, and
an access that throws is a line on the console rather than a blank instrument. A fold does not ride
a snapshot, an undo or an export, so the session's shape has not moved (0026). It is the third
preference of that shape, so the guard itself is now one module the three of them share
(src/ui/preference.ts): each keeps only its key, its parse and its default.

**The default is read on every render, not frozen at mount.** The master's is "shut when the rack
holds nothing", and the rack is filled by a session restore that can land after the first render —
a default captured once would have the master mounting shut over the effects it is hiding, which is
the entry's whole complaint. A hand's own choice outranks the default from the moment it is made,
so a rack a hand folded stays folded as effects are added to it.

**Which means the master's fold moves both ways while no hand has touched it.** A rack that stood
open on the default alone closes when its last card goes — `Clear All`, or a removal — and opens
again on the undo that brings the card back. That is the rule the entry asks for read in both
directions: "should not collapse by default if any effects are present" says nothing about a rack
with none, and a rack with none is what every other card fold on the screen is shut over (0217).
One press of the caret settles it either way, for good.

**A yard's fold is keyed by its id, and a later session's yard can wear the same letter.** Inside one
session it cannot: `nextDeckId` asks what the session has spent, so add, remove, add lands on C (P55,
src/ui/actions.ts). A session started fresh begins at A again, and that yard reads whatever the last
A was left as. The card's own fold is held in the panel rather than keyed, for exactly that reason
(src/ui/Deck.tsx); this one is keyed because remembering is what the entry asked for, and the cost is
one caret in the wrong position on a yard that inherited a letter. Nothing durable follows it, and
one press corrects it.

**Not cross-tab.** The theme syncs on a `storage` event because two tabs showing different colours
is one instrument contradicting itself; two tabs with different sections folded is two views, which
is what a fold is.
