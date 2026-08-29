# 0187 — The walk is a sheet, and it turns over

- **Date:** 2026-08-28
- **Status:** accepted, amending [0180](0180-the-walk-is-drawn-forward-only.md), which made the
  scope a window beginning at the landing the clock is inside.

**The picture is a sheet of `PLAYER_SCOPE_LANDINGS` landings, cut at fixed ordinals, and the clock
is a position on it.** `scopeSheet(at)` says which sheet a landing is on; the geometry lays that
whole sheet out from its own first landing and carries `at`, the index of the block the clock is
inside. The playhead runs left to right across the sheet and the sheet turns over whole at the end.
Its ink follows: the standing block at full strength and every other landing on the sheet at one
flat fade, because a ramp measured from the clock would be the one thing on a still sheet that
moved.

**Because a window that follows the playhead never holds still.** The window shifted by a whole
landing at every landing boundary — a few times a second on a default pattern — so the picture was
in permanent motion and the playhead never left the left-hand edge. Nothing could be read off it:
there was no answer to where in the phrase the pattern was. A sheet is legible for the same reason
a bar of music is, and it is what makes the playhead's travel mean something.

**0180's claim survives, and it is the caller that keeps it.** A re-walk of the landings that
already sounded would draw them under a spec that has since moved, which is a picture disagreeing
with the sound. So `useScopeWindow` keeps the steps of the sheet the clock is already past when the
spec changes identity and lays down only the tail from the standing landing — the same shape
`rearm` has in the transport. What a sheet the cache has never seen draws before the clock is the
walk under the spec that is playing, which is the only spec those landings could have sounded
under.

The sheet also bounds the cache, so `SCOPE_CACHE_SLACK` goes: one sheet is never more than
`PLAYER_SCOPE_LANDINGS` steps, a sheet turn is a trim of what is already walked, and a walk is
still built once per spec.
