# 0312. A seed is typed as well as drawn

- **Date:** 2026-09-08
- **Status:** accepted

The seed on the mulcher's heading is a field, not a readout. A hand enters one and the deck
patches `deck.player` with it, on blur or Enter, refusing anything that is not the whole 32 bits
`mulberry32` has state for (`isPlayerSeed`, src/lib/player.ts). The die that draws one stays on
the card's front, beside the redraw it pairs with (0259).

0089 makes a performance reproducible by one number, and P98 put that number where reading it
costs nothing. Reading it was only half of what reproducible means: a seed written down or read
off another machine had no way back into a deck, so the same pattern could be identified and never
recalled. Each deck holds its own seed, so a session is dialled up yard by yard.

Committed on blur or Enter rather than per keystroke: a seed patch restarts the pass (0089,
src/audio/deck.ts), and every prefix of a ten-digit number is a different pattern.
