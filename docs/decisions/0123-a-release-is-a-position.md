# 0123 — A release is a position, not only an ending

- **Date:** 2026-08-22
- **Status:** accepted

A `pointerup` carries a `clientX`, and it is the gesture's last word on where the hand went. A
surface built on `usePointerGesture` that commits a position reads its pointer through `track`
(`src/ui/gesture.ts`) — on the moves and on the release alike — and takes both the position and
"this travelled far enough to be a drag" from that one reading. The two loop surfaces,
`src/ui/LoopHandles.tsx` and `src/ui/Waveform.tsx`, do; `src/ui/Knob.tsx` and `src/ui/listDrag.ts`
are the same shape and do not yet, which plan.md §4 holds.

**Why.** Chromium reports the moves of a frame at most once. The last pixels of a drag reach the
page in the `pointerup` and nowhere else, and a flick inside one frame arrives as a press and a
release with no move between them at all. Read from the moves alone, the loop strip committed its
edge short of the hand, and a flick committed nothing — the boundary snapped back to where the drag
began, which is what a person sees as a handle that would not move.

This is the other half of [0114](0114-a-capture-lost-is-a-gesture-over.md): a release nobody saw
commits nothing, and a release the page did see says where it landed. So `track` runs on the
`pointerup` path and never on the `pointercancel` one — an abandoned gesture has no position to
read, only positions to put back.
