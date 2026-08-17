# 0075. Every kind of thing draws from its own pool

- **Date:** 2026-08-16
- **Status:** accepted

A yard draws its name from the adjective and plant pools (0057); an effect instance draws its from
`EFFECT_NAMES[effect]`, one pool per registry id, and no two pools share an entry — so a name read
on its own says which kind of thing it names. The pools and both draws live in `src/lib/copy.ts`,
because that is where the words are. `EffectId` lives in `src/audio` and lib may not import it, so
the pools are keyed by plain string and `src/audio/effects/registry.test.ts` — the one place that
can see an effect id and a pool at once — is what holds the two in step. `mintEffectName` throws
for an effect it has no pool for: a registry entry this file was never told about is a missing
pool, not a nameless effect. Which card wears a drawn name, and whether that name survives a
reload, is P48's; this decision is the pools and the draw.

A fresh boot's one yard draws its name like any other yard, and keeps 🏡 — the name is a draw, the
house is not, which reverses half of 0057's "booting twice boots the same session". The draw is
taken once as `copy.ts` loads, so every store one boot creates agrees on it and only a new page
load redraws. Nothing derives from a name and no restored session takes it: restoration replays the
stored `deck.add`, so replay, export and the fingerprint stay deterministic (0057).

The Export Audio dialog's filename defaults to the active yard's name and the blob id it is
playing, derived from the session as the dialog opens and stored nowhere — a filename is not
session state (P40). A yard playing a generator or nothing is offered its name alone, and
`exportFileName` still supplies `mulch-export.wav` when the field is emptied.
