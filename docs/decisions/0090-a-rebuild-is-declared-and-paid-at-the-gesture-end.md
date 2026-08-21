# 0090 — A rebuild is declared beside the parameter and paid for once, at the end of the gesture

A parameter whose plugin has to build something for it — a buffer, a curve, anything that is not a
number written onto an `AudioParam` — declares `rebuild: true` in its own `ParamSpec`
([`src/audio/effects/contract.ts`](../../src/audio/effects/contract.ts)). The plugin's `setParam`
records the value and builds nothing; the build happens in the instance's `endGesture()`, once,
whichever of its `rebuild` parameters moved.

**The rack decides what a run is, and a run is the only thing that is held.** A move on the same
(instance, parameter) as the one before it continues a drag: it is recorded and not built, and
`gesture.end` pays for the last of them. Any other move is built where it arrives. That second
half is the important one: the graph is reached by `param.set` from four places that have no hand
behind them and never send a `gesture.end` — the boot restore's command replay, the offline
render's copy of it, a clip applied onto a yard that kept its rack, and a JSONL command file. Held
unconditionally, every one of those left the reverb convolving with the plugin default while the
session, the knob and the probe all read the value the performer had chosen — and the render is
the same session's file, so live and offline would have disagreed
([boundaries.md](../boundaries.md), one signal chain).

So a drag costs two builds, not one: its first move and its release. The defect was sixty a
second.

The effect declares it, never the knob. A knob sends one `param.set` per pointer event and cannot
know what any of them costs; whether a rebuild is expensive is a fact about the effect. The reverb
is what proved it: dragging Decay swapped the convolver's buffer on every event, and a convolver
that is handed a buffer drops the tail it was carrying, so the drag was silent for its own length.

Two consequences that constrain what comes next.

**`gesture.end` is now a graph command as well as a history one.** It was the boundary that made a
drag one undo entry ([0067](0067-a-gesture-is-one-history-entry.md)); it is now also the moment the
graph's held work is paid for. It carries no argument and never will: it means "the hand let go",
not "flush this parameter". The knob sends it on a keyup as well as a pointer ending, so a nudge
from the keyboard lands where the key comes up — but never during a pointer drag, because the
slider keeps focus for the whole of one and Option coming up mid-recording is a keyup at that
element too.

**A `rebuild` parameter cannot take an automation lane.** A lane asks for a value per point, which
is the rate this exists to refuse, and there is no gesture end between two points. The two the
reverb declares were already outside `automation` for the same reason
([0087](0087-an-impulse-is-generated-and-rebuilt-on-change.md)); a plugin declaring both fields on
one parameter is declaring a contradiction.

The step grid each such parameter also carries stays: it is what keeps the one build at the end
from happening at all when the drag came back to where it started.
