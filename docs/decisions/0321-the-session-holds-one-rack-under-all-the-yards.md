# 0321 — The session holds one rack under all the yards

- **Date:** 2026-09-08
- **Status:** accepted, beside
  [0320](0320-an-effects-address-is-a-rack-not-a-yard.md), which is how it is addressed, and
  resting on [0313](0313-the-session-holds-one-ground-yards-may-stand-on.md) — the third durable
  fact belonging to more than one deck, and the session's for the reason the ground is.

**`Session.master` is exactly `{ effects: SessionEffect[] }`, and nothing else.** An instance
already carries its own values, lanes, drawn state, bounds and bypass (0030), so there is no
parameter here that is not an instance's — and therefore no `params`, no `automation` and no
`drawn` map beside the rack. Every other field a `SessionDeck` holds is a yard's: a source, a loop,
a pattern and the deck parameters. A yard with no source was refused as the shape for this: it would
make the master a deck everywhere and pay for it with a guard at every place a deck is assumed to
hold a buffer, a loop and a pattern, and it would put the master in `deckList`, which is the list of
yards a hand made (0029).

**It is built where the master bus is.** `createEffectRack` is called once inside `createMasterBus`,
between the sum of the decks and the limiter, so nothing downstream of a deck is written against an
unbounded output and nothing in `src/audio/context.ts` learns what a deck is. That is the one call
both hosts make, through `createAudioEngine`, so **the offline render gets the master rack for
free** — a take that skipped it would be the second signal path the chain boundary forbids.

**The meter moved to the far side of it.** The tap used to sit on the node every deck lands in; it
now sits on the sum the rack hands back, still before the limiter and the soft clip. A master effect
can make the output too hot, and saying so is the one thing that meter exists for.

**Its lanes ride audio time.** A yard's lanes are armed against its transport and held across every
gap that transport is silent for (0040), because a lane on a deck describes something being played.
Nothing plays the master — whatever the yards sum to arrives here whenever any of them sounds — so
`createMasterEffects` holds its lanes against `ctx.currentTime`, with no hold, no release and no
phase to carry over a stop. The cycle arithmetic is the same walk `src/audio/deck.ts` makes and is
written twice rather than lifted: it is the second occurrence, and the deck's is entangled with a
plan, a lane clock and a player that this rack has none of (principle 3).

**A rollback rebuilds it in place, and only where it differs.** There is one master bus and
therefore one master rack, so it cannot be prepared beside the live one the way a voice is.
`prepareRestore`'s commit empties it and rebuilds it from the restored session in the order
restoration already uses — instances, their windows, their bypass, then their lanes. It compares
first, through the one durable projection: a checkpoint is the whole session, so an undo of a knob
on one yard reaches this too, and a rebuild that ran anyway would cut a master reverb's tail on an
edit that was nothing to do with it. The comparison is what stands in for the crossfade a voice
gets.

**Its tick stops itself on a context that has closed.** A deck's arming interval is cleared when
its transport stops sounding; a rack with no transport under it has no such moment, and nothing
disposes a master bus — an offline context is discarded whole and never closed by hand. So the tick
checks `ctx.state` and clears itself, which is the only thing that can. It also reticks on a
bypass, for the same absence: the switch is the one thing that can put a growing master instance
back in the signal path, and there is no play or stop to notice it at.

**A flatten never bakes it in.** `flattenSession` empties the master rack the way it empties the
clip list. A flatten keeps a yard's sound in its samples and takes off everything that made it —
the deck's own parameters go back to their defaults for exactly that reason — and this one cannot
be taken off afterwards, because the other yards are still going through it.

**What the picture does not yet read from it.** A master instance's grown run and its meter are not
carried into a yard's picture: that per-frame read is a `DeckPeek` of one yard, and a master
automator's population would have to travel into every open picture. The master's own card reads
both, through `peek(null)`.
