# 0057. A deck is called a yard

- **Date:** 2026-08-16
- **Status:** accepted

What the user reads is a "yard"; what the code is called stays "deck". `DeckId`, `deck.add`, `buildDeckChain`, `session.decks` and every other internal name are unchanged — this is copy plus one stored field, not a rename. The noun is declared once, as `YARD` in `src/lib/copy.ts`, and imported by every label, heading and specimen; a surface that types the word itself is the bug this prevents. `src/lib` is where it lives because the state tier needs the pool too, and lib is the only tier everything may import.

Each yard carries an emoji drawn when it is added, from the fixed `YARD_EMOJI` pool beside the noun. The draw happens at the call site that mints the id (`src/ui/App.tsx`) and travels in `deck.add`, because a reducer that drew its own would make replay, restore and the fingerprint non-deterministic. The pool is small and repeats are fine: the emoji names a yard, the id identifies it (0029). A fresh session's one deck takes the pool's first rather than a draw, so booting twice boots the same session.

A yard also carries a generated name — Quiet Fern, North Thicket — drawn the same way, from the adjective and plant pools beside the emoji. `mintYardEmoji()` and `mintYardName()` are the two draws, sharing one `pick` over a pool and one join, so a call site chooses when to draw and never how. It fills the yard's small monospace readout, which says the source and never the blob id addressing it. A name is not an address: the id stays opaque and stays how a command reaches a yard (0029), two yards may draw the same name, and nothing derives from one. A fresh session's one deck takes each pool's first for the same reason its emoji does.

The session's deck list is therefore one record per deck — `deckList: { id, emoji, name }[]` — and not a list of ids: the list keeps order and membership as before (0029), while the emoji and the name ride beside the id rather than inside `SessionDeck`, which a clip copies and would otherwise carry decorations it can never apply. Both are validated as durable text, not as pool membership: which emoji and names exist is the interface's business, and the stored shape refuses only what no yard could have been given. Sessions written before this shape do not validate and are discarded (0026).
