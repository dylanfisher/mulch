# 0019. Active deck is durable; keyboard gestures are commands

- **Date:** 2026-08-14
- **Status:** accepted

## Context

M8 makes the existing deck collection behave as N peers rather than two unrelated panels. A
keyboard gesture needs one unambiguous target, and the shortcut list already shown in the control
gallery must describe behavior the instrument actually has. Selection and shortcuts cannot become
UI-only mutations without breaking the commands-in/events-out seam.

## Decision

`DECK_IDS` remains the runtime cardinality registry. Default state, the current durable projection,
UI rendering, and every N-deck command derive from it; the initial active deck is its first member.
Each shipped session version freezes its own deck IDs. Changing runtime cardinality therefore also
requires the next session version and migration rather than retroactively changing an old schema.

`activeDeck` is durable SessionV2 state. `deck.activate` is its only write and `deck.activated` is
its event; selecting the already-active deck is a no-op. The append-only v2 migration keeps the
shipped v1 validator unchanged and gives v1 sessions the registry's initial deck.

One shortcut registry supplies both matching and the gallery's displayed keys. Outside editable
controls and the dev/log routes, a non-repeating keydown sends exactly one serialisable command:
Space sends `deck.play.toggle` to the active deck, Shift+Space sends `decks.play.toggle`, L sends
`deck.loop.toggle` to the active deck, and Cmd/Ctrl+S sends `session.save`. The deck's loop button
uses the same toggle command, while `deck.loop` remains the exact-range command for waveform drags
and scripts.

Global play starts every loaded deck. If any deck is graph-planned, global stop clears every deck's
graph plan, including one scheduled but not yet reported as started. Unloaded decks
are skipped on global play; trying it with none loaded emits one error.

## Consequences

Within the runtime, adding a deck remains one registry edit rather than coordinated render branches,
shortcut branches, and transport lists. Persistence deliberately adds the explicit cost of a new
version and migration. Active selection restores with the session and is visible to `probe()` and
the event stream. Toggle commands express keyboard intent without making the UI inspect graph
behavior or fan one gesture into N commands; actual start/stop facts still come only from the
graph's existing reports.
