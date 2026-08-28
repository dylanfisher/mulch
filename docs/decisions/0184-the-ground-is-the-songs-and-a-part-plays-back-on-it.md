# 0184 — The ground is the song's, and a part plays back on it

- **Date:** 2026-08-27
- **Status:** accepted, amending [0183](0183-a-bed-is-the-loop-moved-and-it-is-the-transports.md),
  which put the five bed fields on the spec and let a part capture them, and narrowing
  [0176](0176-a-part-is-the-dials-it-was-captured-from.md) by one family.

**The five bed fields are the song's and no part carries one.** `bed`, `bedEvery`, `bedDistance`,
`bedBias` and `bedHome` leave `PLAYER_PART_KNOBS` and join `PLAYER_SONG_KNOBS`, beside the four the
arrangement is drawn by. The walk opens on `spec.bed`, schedules and shapes every move off the
spec, and — the change a listener hears — **never starts the ground again at a part boundary**. A
part arrives on whatever bed the loop has walked to, exactly as it arrives on whatever slot the
pattern was reading.

**Because there is one loop, and a bed is where that loop is.** 0183 made a bed a place a part
opens on, which read well one part at a time and said nothing across a run of them: nine parts each
carrying a `bed` are nine answers to a question with one answer, and the ground spent every move it
made walking back to whichever part came next. The arrangement moves through the source now, the
way it already moves through the loop's sixteen slots — the one cursor the walk was already
carrying across a boundary rather than resetting.

**Nothing else about a part changes.** Every other captured number still opens the part it was
captured on, `partVoice` is still the list, and `PLAYER_SONG_KNOBS` still throws at load if the two
lists stop partitioning `PLAYER_KNOBS`. Being a song knob also buys the ground the two rules the
arrangement already has: no character region may name one, and a character press leaves it where
the hand put it rather than moving the loop under a name nobody pressed for a place.

On the card the Ground box moves out of `playerDials` and stands beside the arrangement, under the
three boxes a part carries — so a part's own fold no longer draws it, and no selection reaches it.
