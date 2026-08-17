# 0072. A drag ends once, and a decode of nothing is refused

- **Date:** 2026-08-16
- **Status:** accepted; refines [0034](0034-releasing-option-ends-the-recording.md) and [0067](0067-a-gesture-is-one-history-entry.md)

Releasing a captured pointer produces two reports — `pointerup` and the `lostpointercapture` the
release takes with it — and nothing promises which reaches the wrapper first. The knob treated the
second of those as a browser taking the gesture away and dropped the recording, so in the losing
order a performer rode the knob under Option and no lane was written at all. Only `pointercancel`
means the gesture never happened; a lost capture means the drag ended, and what was ridden is
committed. Whichever report arrives second finds the ref already cleared, so one ride is still one
lane and one history entry.

A decode of zero frames is refused where a decoded source is made — `reduce`, the one function
that pairs a buffer with its peaks — rather than at the deck's door, so the restore's prepared
graph and a clip's thumbnail are covered by the same declaration as a load. Nothing is written
before the refusal: the deck keeps the buffer, the peaks and the duration it had, the decode cache
holds no failure, and the failure travels as the `error` event every rejected command emits. A
deck half-loaded with silence and no error anywhere is the silence this repo does not keep
(principle 5).
