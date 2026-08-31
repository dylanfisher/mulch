# 0241 — The picture may ask for one spectrum a frame, and the fold is what it buys

- **Date:** 2026-08-31
- **Status:** accepted, overturning the refusal recorded in
  [0145](0145-a-picture-may-rest-on-analysis.md)'s own tier and extending
  [0240](0240-the-picture-folds-into-itself.md)

`spectralTilt` was written **in the time domain and never a spectrum**, and its comment says why: an
FFT a channel a frame to move one grating is a large bill for a scalar. That judgement was right
about a grating and it is wrong about a fold. A wash and a resonance are the same level and nearly
the same tilt, and they are not the same picture — the whole of the difference is how the energy is
distributed, which is the one thing a time-domain window will not say.

**The bill is paid once a frame and never per channel.** The two peak reads on the master bus
already decide which channel is louder, so `createMasterBus` fetches the spectrum on that one and on
no other, into a scratch of that analyser's own `frequencyBinCount` minted with the tap. That is
the same contract every other read on the frame path holds to: allocation-free after construction
(0070). **And unsmoothed**, which is not the default: an analyser blends each frequency read into
the last one it took _on that analyser_, so a pan that moved which channel is louder would answer
most of a spectrum the other channel last saw. Nought is the only value that reads the same window
`level` and `tilt` come off. Measured against the profiler's own history: frame p95 10.3ms and 10.4ms over two runs
against a band of 9.3–10.4, heap delta in band, green both times.

**What it buys is the fold's entire character and not one row's spacing.** Two measures, both pure
functions of a dB bin array that know nothing about a picture (`spectralFlatness`, `spectralEdge`,
src/lib/peaks.ts): a flatness, which tells a broad wash from a narrow resonance, and an edge, which
is where the energy sits. They are spent on the fold and nowhere else — **resonance tightens it**
(`heardTight`, the ratio each run's spiral is drawn at) and **sharpness hardens it** (`heardHard`,
the fold's own alpha in place of `FOLD_KEEP`). So the fold has three separable inputs saying three
different things: the population says how deep, the resonance says how tight, the sharpness says how
hard. The crest already broadens the picture through `washAmount` (0213) and is not restated.

**Silence is not a resonance.** Digital silence differences to `-Infinity` and arrives as a whole
array of it, so both measures need a floor to stand on. Both answer 0 for a window with nothing over
`SPECTRUM_FLOOR_DB` in it, the sentinel `crestFactor` and `spectralTilt` already use, and both
spends read that 0 as "measured nothing" and draw the fold that was drawn before there was a reading
(0145). A flatness of 0 spent as a perfect resonance would have a silent yard drawing the tightest
fold in the instrument.

**A bin is not a level, and a reading is not a fraction of 0..1.** Broadband energy divides across
`frequencyBinCount` bins, so a bin sits roughly `10·log10(bins)` — about 27dB at the meter's window
— under the level the same signal reads at: a floor at the -60 a level readout rounds away would
call an audible hiss silence and snap the fold loose mid-fade, which is why `SPECTRUM_FLOOR_DB` is
-120. For the same reason neither spend reads its measure against 0..1. A mix's centroid sits a
couple of kilohertz up against a Nyquist of twenty-four, and nothing an instrument makes is flat
across every bin, so read straight every sound there is would be a resonance and the fold's alpha
would move a fiftieth of its travel. Both are read across the band the reading actually occupies
(`FOLD_FLATNESS_BAND`, `FOLD_EDGE_BAND`) and **logarithmically**, because an octave is an octave
wherever it sits and a flatness spans decades.

**One spectrum a frame is the ceiling this permits, not a precedent for one per row.** The next
reading that wants frequency data spends the one already fetched or argues its own cost the way this
one did; a second FFT is the bill 0145's tier refused and nothing here reopens it.

Durable shape: none. Both measures are readings of a window the meter already fetches, `MasterPeek`
is refilled in place, and nothing about a picture is stored (0131, 0145).
