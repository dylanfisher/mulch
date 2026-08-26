# 0181 — An audition is a transport cue, not an edit

- **Date:** 2026-08-26
- **Status:** accepted, resting on
  [0041](0041-a-seek-is-transport-not-durable.md) — a cue is a seek said one tier up — and on
  [0096](0096-a-moved-number-re-derives-the-tail.md), whose `rearm` road it takes; it closes
  [0178](0178-a-part-is-a-card-and-it-carries-a-name-it-was-given.md)'s refused fourth action.

**A cue moves the pass and nothing else.** `deck.playerCue` names a deck and a part; the transport
winds a fresh walk to that part's own first jump, drops the steps still ahead of the fade horizon
and lays the pattern down again from there. Nothing durable moves — no session field, no event, no
history entry — which is what makes it a seek's sibling rather than a `set`'s (0041): the seed and
the spec are the ones already held, so pressing it twice hears the same thing twice, and a session
that has been auditioned all afternoon renders the same file it always did (0068). It is
emphatically not "hear this part alone": a run is what a song is, and a cue jumps into it.

**Where it goes is arithmetic, not a replay.** `songOnset(song, id)` is the jumps to a part's first
jump — the lengths of the played parts before it, which is exactly what `createSong` hands out — so
the walk agrees with the cursor rather than restating it (principle 1). A skipped part and one this
song does not hold both answer null rather than zero: the top of the song would audition whatever
stands there instead, which is a wrong answer where there is a loud one (principle 5).

**It is the re-arm road with the count set rather than wound back.** `rearm` drops what is past the
horizon and winds the walk back over exactly those steps; the cue drops them first and then puts
the count at the onset, so `rearm`'s own drop finds nothing left and the wind is to the part. That
is the whole difference between the two, and it is why the landing already sounding keeps the window
and the seams it was built with: cutting it is the click the module is faded to avoid (0096).

**Four refusals, each loud.** Three are facts about the durable spec and are answered where it is
held — a deck carrying no pattern, a pattern drawing its own arrangement, whose run is not a list
anything holds so no press can name a part of it (0158), and a part this song does not stand in. The
fourth is the pass's own and comes back as `false`: a deck with no pass to wind. None throws — a
command nothing can answer is unanswerable rather than malformed, and it says so on the log (0023).
The part id off the wire is the one thing that does throw, through the guard every durable id goes
through. On the row the control is **refused rather than absent** on a skipped part, which is 0121's
rule and the same one the copy wears at its ceiling.

**Two riders, both defects this exposed.** The scope's window is walked once and extended, and its
trim re-anchors where the cache begins without re-anchoring the cursor — safe while the ordinal
advances one landing at a time, which is what it did until a cue could move it by a whole part. A
wind past the end of what is already walked is now a walk to there, or the picture would draw
landings the graph is not playing for the rest of the pass (0159). And the scope's song lane lit its standing segment from
the frame loop only, and a stopped yard registers no frame callback — so a lit segment stayed lit
for as long as the page did. It was invisible until an audition could leave a part standing at the
moment a yard stops: the browser proof's own "a stopped yard was still showing a part playing" is
what caught it. The lane now writes itself on the commit that stops one, which is the put-back the
part list beside it already had (0157, 0040).

**Three families moved out to make the lines.** `src/audio/player.ts`, `src/audio/deck.ts` and
`src/app/execute.ts` were each at the 800-line hard cap, where no waiver reaches (0045). One seam of
one step went to `src/audio/playerSeam.ts`, the shape a deck's callbacks fill to
`src/audio/deckReport.ts` — for the reason `./deckPeek.ts` went — and the jumping module's own three
commands to `src/app/deckPlayer.ts`, taking the two refusals every command that needs sound asks
with them to `src/app/refusals.ts`. Each is a family with one name, not half a file.
