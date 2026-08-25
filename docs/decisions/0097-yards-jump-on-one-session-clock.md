# 0097 — Yards jump together on one session clock, counted from zero

Two shapes were open for making two yards jump together, and this picks the **shared grid**: the
session holds one jump clock (`Session.sync`, seconds or null) and every deck's player begins its
next step on that clock's ticks. Everything else stays per-deck — seed, distance, the lean, repeats,
gate, burst, vary, rest and drift — so two yards land on the same instants and sound
nothing alike. The **follower** — one deck's jump triggering another's on a first pass through a
section — is not built.

**Why the grid and not the follower.** A follower is a per-deck reference to another deck, which
makes one deck's transport a function of another's identity: it has to answer what a removed
target does, what a cycle of two followers does, and what "a first pass" means for a deck with no
loop. The grid is one number belonging to nobody. It also keeps the two constraints trivially
rather than carefully — a deck under the grid still draws every step from its own seed, and the
grid is a function of the session alone.

**A tick is counted from the context's own zero.** `syncedFrom(at, sync)` is
`ceil(at / sync) * sync` and reads no state: not the first deck to start, not the transport, not a
wall clock. That is the whole of the reproducibility constraint — an anchor taken from whichever
deck happened to be pressed first would make the rendered file a function of the order the decks
were played, and an export is a spec replayed into a fresh host (0068). Two decks pressed seconds
apart land on the same ticks, and a render of the session lands on the same ones again.

**The clock moves when a step may begin, and nothing else.** A step's window is still its own —
`burst`, `vary`, `repeats` and the rate its drift is holding — and the pattern is still
`playerWalk` from the deck's seed. What the clock moves is `Scheduled.next`: the pass waits for
the first tick at or after the window it just laid down. A burst longer than the period skips to a
later tick rather than being cut, because cutting a burst to fit would make the clock a fourth
thing that decides how long a step is.

**It is a session field, so it joins everything a session field joins.** One command
(`session.sync`), one event, one validator (`assertSync`, shared by the wire and the stored
shape), a place in `sessionSnapshot`, in history — as its own entry, since it names no deck to
group with — in the archive, in `restorationCommands` after the players and before the activate,
and in `prepareRestore`, which states it either way so an undone session cannot leave a host
jumping on the clock it just replaced. Stored players from an older build are still discarded
rather than migrated (0026).

**A moved clock is heard where it is turned**, by the road a moved number already takes: `setSync`
re-arms every step past the lookahead and lays the tail down again on the clock now held (0096).
Switching it on or off is not a transport change and restarts nothing — a clock is not the
player's on switch.

**What this does not do.** It does not make the decks agree about anything but the instant: no
shared seed, no shared phase inside a loop, and no yard waiting for another to be ready. A yard
whose loop is too short to jump plays straight under the clock exactly as it did without one
(0089), and a yard with no player is untouched. The costs 0096 recorded are unchanged: the clock
adds no source, no re-arm the player did not already have, and nothing per frame.
