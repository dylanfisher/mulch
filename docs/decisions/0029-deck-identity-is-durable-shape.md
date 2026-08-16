# 0029. Deck identity is durable shape, and the session's list is the only registry

- **Date:** 2026-08-15
- **Status:** accepted
- **Supersedes:** the cardinality half of [0019](0019-active-deck-and-shortcut-commands.md)

A `DeckId` is an opaque, caller-supplied, durable string, the session's own deck list (not a compile-time tuple) is the single source of truth for deck membership and order, and a session may hold zero decks with `activeDeck` then null.
