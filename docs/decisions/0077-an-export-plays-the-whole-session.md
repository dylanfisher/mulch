# 0077. An export plays the whole session, for its whole length

- **Date:** 2026-08-16
- **Status:** accepted; rests on [0068](0068-an-export-is-a-render-spec.md) and [0071](0071-the-offline-pump-arms-the-lanes.md); its one-step-of-the-grid half is superseded by [0099](0099-two-renders-of-one-spec-part-by-a-level.md)

`exportEnvelopes` used to read the live store for which yards were sounding and append a
`deck.play` for exactly those. That made the file a reading of the transport at the instant the
dialog was confirmed: a performer who stopped everything to reach the File menu got sixty seconds
of digital silence, with no error and a toast saying it worked. An export is a spec for the one
render harness, and the spec's intent is the session — so it starts every yard that has a source
and reads nothing off the transport. A yard with nothing loaded is still left out, because
`deck.play` on one is refused and the export reads its own render's log back (0068).

Starting a third yard cost the smoke its byte-identity claim, and finding out why is worth keeping:
two `window.mulch.render` calls on one spec, back to back on one page, differ on a couple of samples
in fifty thousand by one step of the 16-bit grid. That is float summing order inside the browser,
not a second renderer — the claim was true by luck while fewer yards summed. So the export is
compared with the harness's own render of the same spec at one step of the grid the file is written
on, which is the precision an int16 file has, and a difference a different graph could make is
orders of magnitude larger.

The twenty-second flattening that this step began from was 0071's own defect and nothing further:
`tmp/mulch-export-2.wav` reproduces exactly at `ab76975~1` and does not reproduce at all on the
code that replaced it. What was missing was a test — nothing called `armAutomation` outside the
browser — so the seam is now asserted where it is cheap: one lane longer than the horizon, armed
for a minute by the live wall-clock tick and by the offline pump, and the two schedules compared
call for call. A render long enough to hear that in the gate is not affordable; a lane longer
than the window one arming covers is the shape that makes it visible in milliseconds.
