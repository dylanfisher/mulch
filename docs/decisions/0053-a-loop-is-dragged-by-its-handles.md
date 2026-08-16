# 0053. A loop is dragged by its handles, and the peaks are only seeked in

- **Date:** 2026-08-16
- **Status:** accepted

The loop is shaped from its own strip above the waveform — the IN handle, the OUT handle and the region between them are elements a pointer either hit or did not, so no pixel tolerance discriminates a gesture and there is no shift-to-sweep; the handles bracket the loop rather than straddling it and an edge follows the travel since the press rather than the pointer, so all three grips stay hittable and jump-free at any loop length; a loop is created by the loop button (`deck.loop.toggle`) and shaped from there, a press anywhere on the peaks is a `deck.seek` and never a `deck.loop`, and everything under the gesture layer — snapping, `MIN_DRAG_PX`, overlay-then-sync, one `deck.loop` per gesture on release — is unchanged (0025, 0041).
