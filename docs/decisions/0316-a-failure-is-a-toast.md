# 0316 — A failure is a toast

- **Date:** 2026-09-08
- **Status:** accepted, replacing the header's error span
  ([0054](0054-the-shell-owns-the-width.md)'s row kept it) and resting on P56 — the toast is the one
  module-level thing the interface holds, and every surface that says a thing finished goes
  through it.

**Every failure the header used to say is a toast at the failure's own type.** A failed session
export, a failed session import and a failed render all said the same kind of thing two ways: a
toast when they succeeded and a span in the header row when they did not. Two surfaces for one kind
of thing is the drift the copy modules exist to prevent, and the span had the worse half of it — it
never went away, so a failure at minute one was a header that was wrong for the rest of the session.

**A yard's own import refusal stays on that yard's card.** It is not the same kind of thing: it
names the codec of the file that card is holding and it sits beside the control the file went into,
which is where a hand is looking (P98). What made the header's span wrong was the distance between
the failure and the gesture, and this one has none. It is still a span that only a load dismisses,
and that is the known cost of keeping it there.

**`ReportError` and the prop chain it travelled go.** One value threaded through `FileMenu`,
`CommandPalette` and `ExportAudioDialog` existed only to reach a span in a component none of them
could see. `reportFailure(what, reason)` is written once beside the archive gestures that raise
most of them, and says the one sentence `failedMessage` already spells.
