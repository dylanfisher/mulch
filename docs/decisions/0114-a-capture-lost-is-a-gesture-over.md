# 0114. A capture lost is a gesture over

- **Date:** 2026-08-21
- **Status:** accepted

`usePointerGesture` (`src/ui/gesture.ts`) ends the drag it is holding on the endings nobody sends a
`pointerup` or a `pointercancel` for: the capture coming off the element `begin` took it on, which
it listens for itself; its own pointer arriving on a move or a press with `buttons === 0`, which is
a button let go somewhere this page never heard about; and the surface unmounting under a held
gesture. Both pointer endings end it the way `pointercancel` does — nothing committed, and the
surface's `abandon` putting the store's own positions back — because a release nobody saw is not a
release that said where it meant to land.

The skeleton owns it, not the surfaces. Four of them wired `onLostPointerCapture` for themselves
and two never did, which is one rule stated four times and missing twice: a drag whose release the
page could not see left the record set, the overlay wherever the gesture stopped, and every later
press refused until a whole click had come and gone. Every surface built on the skeleton after this
gets the ending without asking for it, which is the point. `abandon` is therefore a parameter of
the hook, not an option: a surface that paints ahead of the store — the loop overlay, a sweep's
draft, a rack's transforms — has to be told, and one that paints nothing says so in an empty body
rather than by omission.

Three lines follow from what the endings are, and each of them is a defect the reading of an
ending gets wrong:

- **`ended` never reads `buttons`, and a lost capture carrying none is not a loss.** A `pointerup`
  reports 0 for the button it is releasing, and a proper release takes its capture off too —
  [0072](0072-a-drag-ends-once-and-a-decode-of-nothing-is-refused.md) records that nothing promises
  which of those two reports arrives first. So the lost-capture ending abandons only while a button
  is still down; with none down it is the ordinary release, and the `pointerup` is what says where
  the gesture landed.
- **The ending belongs to the gesture's own pointer.** A mouse hovering across a surface a finger
  is dragging on reports `buttons === 0` for the whole of that drag, and would otherwise end it.
- **The capture is given back with the record.** The browser is still holding it on an ending
  nobody reported, so every later press would be retargeted at the element this gesture captured
  on. Released after the listener comes off, so the gesture is not ended twice by its own
  `lostpointercapture` — which still reaches anything above, which is how a wrapper hears about it.

The unmount is the ending no pointer reaches: the listener comes off with the component, because
the browser fires the lost capture at a detached element and the surface's cancel path would run
against a deck the session no longer has. That teardown releases and never abandons, for the same
reason.

A wrapper observing a child's gesture is not a surface holding one: `ParameterKnob` and
`AutomationPreview` keep their own `onLostPointerCapture`, because for them a lost capture commits
the lane it was recording (0072) — the opposite of abandoning, and about a different thing than the
dial's own drag.
