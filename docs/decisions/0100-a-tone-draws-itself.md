# 0100 — A tone draws itself, and its pitch is a fraction

**A source that is an instrument draws its own picture.** An imported file is reduced to peaks
because the samples are already recorded and there is nothing else to know about them. A tone is a
closed form, so drawing its peaks throws away the only thing worth looking at: `ToneScope`
evaluates `toneSample` — the very function `renderGen` fills the buffer with — across the canvas
at the phase `peek()` says the deck has reached, on the one frame loop and through refs (0070).
One function, so a picture cannot show a wave the render does not make. A yard that is not playing
runs no frames, so what keeps its picture in step is the commit: halted, the picture is drawn from
`restingAt` — the position the yard is holding, and the top of the loop once it is stopped — which
is a discrete store fact and therefore a dependency the commit repaints on. A seek on a held yard
moves where the deck reads from without a frame ever running, and a window of three cycles is a
wholly different picture a millisecond later. The playhead beside it has carried
the same guard since 0038. The peaks path is
untouched by this and stays untouched: `usePeakCanvas` is handed nothing to draw for a tone rather
than being taught what a generator is, and the box, its gestures, its playhead and its meter are
the waveform's either way. A source draws itself differently; it does not become a second
waveform.

**A pitch is a fraction of a hertz.** `isGenHz` always accepted one and is now the whole of the
rule — what a load may carry, said once, imported by the command boundary and by the field that
offers it. What stepped over every beat between two yards was the spinner: both load fields shared
`step="any"`, whose spinner moves by one. `GEN_HZ_STEP` is a hundredth of a hertz and the fields
now each declare their own step, so 440.25 is dialled rather than typed, and the fraction survives
the wire, the reducer, the restore and both renders of one spec.

**The tone is not a second sine.** The sine is the fixture every gain-staging assertion is written
against; changing what it sounds like would move measurements that have nothing to do with this.
The tone is a sine of a phase bent by its own second harmonic (`TONE_INDEX`), which puts a strong
fundamental and the odd harmonics above it and nothing at DC — and, because the whole shape is
still one sine, it peaks at exactly `AMPLITUDE` like every other generator, so swapping one for
another is not a gain change.

**A list of alternatives is a menu.** Five generators were five buttons across the yard's row and
a sixth would have been a sixth. `SourcePicker` is one control that names what is loaded, whatever
`GEN_KINDS` grows to. It opens instantly, like every popup whose entries are pressed rather than
read (0056).

**The canvas lifecycle is now shared.** Three surfaces keep a canvas sized to its element, to the
display's density and to the colour scheme; the drift's was already a general hook wearing a
specific name. It is `useCanvasSurface` in `src/ui/canvasSurface.ts` — the third occurrence
principle 3 fires on — and the drift and the tone both call it. Peaks keep their own painter: a
peak canvas repaints when its columns change and never on a frame, so it has no use for the loop
this holds.
