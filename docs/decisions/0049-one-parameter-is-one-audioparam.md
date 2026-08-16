# 0049. One parameter is one AudioParam

- **Date:** 2026-08-15
- **Status:** accepted

`automationTarget(param): AudioParam` keeps its single shape: a plugin whose parameter drives more
than one node derives those nodes from one AudioParam inside its own graph rather than growing the
contract for every plugin. The delay's mix is the first — a `ConstantSourceNode` shaped by two
`WaveShaperNode` curves sampled from `mixGains`, so the crossfade law is still stated once and both
gains are modulation of one param a lane can be scheduled onto. The golden render fingerprint is
unchanged across that rewrite, which is the evidence the derivation sounds like the two gains it
replaced. With it, every registry parameter is automatable except the two that are the buffer
source's read rate, which stay out for 0031's reason and rejoin when key lock does.
