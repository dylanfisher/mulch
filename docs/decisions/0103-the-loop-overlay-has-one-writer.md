# 0103 — The loop overlay has one writer

The loop strip's five elements — region, both handles, both boundary lines — are positioned by
`applyOverlay` and by nothing else. React renders them with one constant `display: none` style,
handed to all five, so after the first paint it never writes to them again; a layout effect with
no dependency list paints the store's loop after every render the gesture does not own.

P72 named three suspects for a handle that comes apart and measured all three in Chromium before
changing any of them. Two are refuted. Pointer capture on the grip is sound: the move retargets to
the grip and bubbles to the strip, so `event.currentTarget` is the strip for every move and for
the release however far outside the box the pointer goes. The unclamped `axis` is sound and is
[0053](0053-a-loop-is-dragged-by-its-handles.md) working: 300px past either edge, the overlay drew and the
release committed the same clamped loop.

The third reproduces. Rendered from a memo _and_ written to imperatively, the elements had two
writers, and the second one wins whenever the memo recomputes: a `deck.loop` arriving under a live
drag — an undo, the loop button, a JSONL line, a clip applied — re-stated the store's loop over
the positions the gesture was drawing. Measured: mid-drag the strip drew 12.5%/75%, the arriving
render wiped it to 12.5%/62.5%, and the next pointer move drew a third thing.

The constraint this leaves: nothing in that strip may take a position from React. A style prop
that varies is a second writer, and a second writer is this defect again.
