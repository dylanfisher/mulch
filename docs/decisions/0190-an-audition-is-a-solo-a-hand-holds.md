# 0190 — An audition is a solo a hand holds

- **Date:** 2026-08-28
- **Status:** accepted, replacing [0181](0181-an-audition-is-a-transport-cue-not-an-edit.md)'s
  `deck.playerCue` — whose transport-not-an-edit terms and whose `songOnset` arithmetic are both
  kept — and resting on [0041](0041-a-seek-is-transport-not-durable.md).

**The audition is a toggle, and what it holds is one part playing alone.** `deck.playerSolo` names
a deck and a part, or a deck and null. While it is held the pass builds its walk from
`soloSong(spec, part)` — the song that one part _is_ — and a song of one part comes round, so the
part repeats for as long as the toggle is pressed. That is the gesture a hand shaping one part
actually wants: 0181's cue jumped into the run and was gone again eight jumps later, so every dial
turned had to be judged against a part that had stopped playing.

**Nothing about "transport, not an edit" changes.** No session field carries the solo, no history
entry is made, no event is emitted, and the seed and the spec are the ones already held — so a
session that has been auditioned all afternoon renders the same file it always did (0068). The song
that comes back is the song that was there all along. `deck.playerCue` is **gone** rather than kept
beside it: a cue is this command's press with the hold left out, and two commands for one gesture is
two things to keep in step (principle 1, principle 6).

**Pressed, the part is heard from its own top; released, the song carries on from it.** The release
winds the whole song to `songOnset(song, part)` — the very arithmetic the cue was made of — so
letting go continues the run from the part that was being heard rather than restarting the song.
Both roads take the re-arm's three moves in 0181's order: drop what is past the horizon, put the
count where the pattern now being played begins, lay it down again.

**`soloSong` is the one author of what a solo does.** The transport walks it and so does the
picture: `PlayerScope` memoises the same derived spec, so the sheet, the song lane and the sound
cannot disagree about what is playing (principle 1). It is total — the identity for no solo, a
drawn arrangement, a part the song does not hold and one it passes over — because a picture needs a
spec to draw; each of those four is refused loudly at the command, where the durable spec is held
(principle 5).

**A solo outlives a stop.** It is the voice's, dropped when the voice is, and a yard played again
opens on the part its toggle still says it is soloing. The alternative — clearing it when the pass
ends — needs a surface effect that syncs React state to a transport fact, which the project's own
lint refuses (`react(set-state-in-effect)`) and which would leave the toggle and the transport free
to disagree for a render. One writer, one truth: the press.

**The grid moved out to make the lines.** `src/audio/player.ts` was at the 800-line hard cap, where
no waiver reaches (0045), so the family that is not about a clock — `Grid`, `gridOf`, `playerJumps`,
`slotStart` and `bedStart`, the whole of what a loop divides into and where one slot of it begins —
is `src/audio/playerGrid.ts`. A family with one name, not half a transport.
