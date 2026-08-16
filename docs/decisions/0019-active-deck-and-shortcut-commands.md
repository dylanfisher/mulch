# 0019. Active deck is durable; keyboard gestures are commands

- **Date:** 2026-08-14
- **Status:** accepted

`activeDeck` is durable session state written only by `deck.activate`, and every keyboard shortcut sends exactly one serialisable command rather than mutating the UI directly.
