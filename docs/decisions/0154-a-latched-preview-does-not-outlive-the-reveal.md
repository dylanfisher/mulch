# 0154 — A latched preview does not outlive the reveal

The lane marker is a control: a press latches its preview open, a second press, Escape, a press
outside or focus leaving closes it, and hovering still peeks the way it always did. The latch is a
view preference (plan §2) — no command, nothing durable, no history entry — and it is what
makes the one gesture the preview exists for possible, because the drag that stretches a lane's span
([0079](0079-a-lane-is-stretched-after-it-is-played.md)) begins by taking the pointer off the dot
that opened it.

**The latch does not survive Option coming up.** The marker exists only while Option is held, which
is [0028](0028-automation-is-gesture-relative.md)'s reveal, and this decision does not reopen it: a
latched popup is cleared whenever the marker goes — the reveal ending, or the lane it belongs to
being cleared — so re-arming shows a closed popup rather than one left over from the last time
Option was down. Nothing is lost by that, because 0079 already depends on the unmount: Option coming
up takes the popover away mid-drag and that is what commits the span the drag had reached, exactly
as it ends the recording on the knob below it
([0034](0034-releasing-option-ends-the-recording.md)). A latch that outlived the reveal would leave
a popup on screen with no armed control under it, and the span dial inside it reachable while the
knob it belongs to is an ordinary knob again.

A press moves focus into the popup, where hover never did, and that is wanted: the span dial is the
one thing in there to reach, Escape hands focus back, and a control opened by a press is a control a
keyboard can work. Option coming up while focus is inside leaves it on the body, because the thing
it would return to is the marker the reveal just took away. Only one preview is ever latched — a
press on another marker is an outside press on this one — though a latched preview and a hover peek
elsewhere can be drawn at once, which is the peek behaving as it always did.

The press is read off the trigger's own `onClick` and not off `onOpenChange`. Base UI keeps a
hover-opened popover open through any click landing within 500ms of the hover (`stickIfOpen`), so a
`trigger-press` reason is a report that sometimes does not arrive — and the press that latches is
usually exactly that one. `onOpenChange` is left the two things it decides alone: the hover peek,
and the dismissals. The press drops the peek along with the latch, so the second press closes the
popup instead of handing it back to the pointer still resting on the marker.
