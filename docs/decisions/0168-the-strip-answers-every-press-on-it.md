# 0168 — The strip answers every press on it

- **Date:** 2026-08-25
- **Status:** accepted; amends [0053](0053-a-loop-is-dragged-by-its-handles.md), whose three grips
  become four and whose "a loop is created by the loop button" no longer holds, and extends
  [0147](0147-the-loop-lands-where-the-hand-let-go.md) and
  [0123](0123-a-release-is-a-position.md), both of which stand unchanged and were both measured
  and refuted as the reported cause.

A press on the loop's handle strip that hits neither handle nor the region sweeps a loop from
where it landed to where it is let go — the same gesture the peaks a row below already are, on
the same axis, decided on the release. The strip's background is a fourth grip under the other
three, so a press that hits one of them is still that grip's.

**What was measured first.** The report was that a boundary drag, a grip drag and a sweep all
have to be repeated before one takes. Neither mechanism that was written down is it. Driven on
both the dev server and the preview build, the OUT handle, the region and the peaks each
committed within one pixel of where the pointer was released: as a press and a release with no
move at all (10 of 10 each); as a press, 200 moves and a release dispatched into one frame so
Chromium coalesced them (8 of 8); under 20× CPU throttling (10 of 10 each); and on drags leaving
the surface vertically by up to 400px. So it is not the coalescing — 0123 already reaches all
three — and it is not the capture: no gesture was ever ended by a `lostpointercapture`, which
arrived after every `pointerup` carrying no button.

What is reproducibly dead is the fourth press. The handles bracket their edges and are 32px
wide, so the three grips cover `in - 32px` to `out + 32px` and nothing else; on a short loop that
is a small band of a wide strip, and every press outside it began no gesture at all — the strip
root wired the moves, the release and the cancel but never the press. A drag there is answered
with silence, which is the one thing 0147 took away from the peaks and left standing here.

**A sweep needs no loop, and the other three do.** A source loads with none (`src/app/execute.ts`)
and the strip is on screen for the whole of that state, so the grip that draws a loop out of
nothing is the one grip that may begin without one — and it commits whatever the store holds when
the hand lets go, because it is authoring a loop rather than moving one and has nothing to
resurrect. The handles and the region still refuse both, for the reason
[0114](0114-a-capture-lost-is-a-gesture-over.md) gave them: a hidden handle moves no loop.

The 4px deadzone 0147 kept is kept for the same reason it was kept: a sweep too short to be a
drag, or one that ran out and back to where it started, commits nothing and the overlay does not
move either, so the refusal is visible rather than silent. `setLoop` reads a span of nothing as a
clear and no sweep ever means one.

**Shift-click does not come back.** The second half of the report asks for the modifier P109
removed. There is no modifier on either surface and there is not going to be one: a gesture is
what the release says it is, which is the whole of 0147.
