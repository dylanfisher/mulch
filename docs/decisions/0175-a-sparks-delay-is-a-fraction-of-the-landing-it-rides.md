# 0175 — A spark's delay is a fraction of the landing it rides, and its cursor is a second answer

A spark may begin after the landing that threw it. `sparkDelay` is how far in, and it is **a
fraction of the landing's own window** — never a duration.

**The fraction is the bound.** A spark rides the landing's queue entry and is stopped by the
landing's own stop ([0166](0166-a-spark-rides-the-landings-entry.md)), so a delay said in seconds
would be a spark starting after its own stop on every landing shorter than the dial — a spark that
outlives, or never reaches, the entry it rides. Said as a fraction, no reading of the knob can put
the companion outside its landing at any burst, count or rate, and nothing downstream has to check
that one did: the clamp is the unit rather than a guard somewhere later. The window it is a
fraction of is `PLAYER_FADE_SECS` shorter than the landing, so the top of the dial is a flick at
the very end of the landing rather than a spark that begins at the instant it stops — and where a
gate has already cut that last repeat there is nothing left for the flick to sound through, which
is the fader it hangs under doing exactly what a gate does.

**Everything else about a delayed spark is still the landing's.** The same stop, every seam but
the one it opens on,
the same fader, the same direction, the same ladder — a companion is stepped at the landing's own
repeat boundaries, so the two read at one rate at every instant and differ only by where each
entered its slot ([0167](0167-a-landing-climbs-a-ladder-its-source-is-stepped-along.md)). The one
instant a spark now owns is when it starts — and that instant is the one seam it does have to
write for itself: a companion that begins with its landing opens under a fader still at zero,
while a delayed one starts with that fader wide open and would step the sum by a whole second read
in one sample ([0104](0104-a-join-is-the-gap-however-short.md)). So a held-back spark ramps its own
level gain open over one seam, straight rather than equal-power, because it is opening over its own
silence rather than crossing with a signal the sum has to stay flat across; a spark at none writes
no automation at all and lays down the graph it laid before the dial existed.

**Its read position is a second answer off the one entry, and never a second queue.** `position()`
scans for the latest entry the clock is at or past and answers the deck's read head off the
landing, which is exactly why a spark is held on that landing's entry rather than pushed on beside
it. So where the companion is reading is asked for separately — `sparkPosition`, one more field on `PlayerPeek`
(`src/audio/deckPeek.ts`), written by the player's own `peek` off that same entry. It is the jumps
module's read rather than the deck's, beside the part and the voice, because a deck that is not
jumping has no such read to report. `src/ui/Waveform.tsx` paints it as a second cursor on the peaks
in `muted-foreground`: the quieter read in the quieter
ink, so which of the two the pattern is standing on is legible at a glance. It is null wherever
there is none — no pass, a landing that threw none, and a delayed one before its own start, because
a cursor drawn before then is a spark the instrument is claiming to play.

**No character's region names it**, on the level's own argument
([0152](0152-a-character-is-a-region-of-the-spec.md)): whether a second region of the loop is
better heard under its landing or a beat behind it is a fact about the material rather than about
the walk, so a name pressed at half an amount would promise something about a sample it cannot
know. It stands where the switch left it, at none.
