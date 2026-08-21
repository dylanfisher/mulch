# 0087. A reverb's impulse is generated, and rebuilt only when its parameters change

- **Date:** 2026-08-20
- **Status:** accepted

The convolution reverb ships no asset: its impulse response is `impulseResponse` in
`src/lib/impulse.ts`, a pure function of decay, tone and sample rate, drawn from a seeded xorshift
so the same parameters give the same samples on every context, live, offline and in Node with no
context at all. Nothing about a room is fetched, and nothing about it is random at the call site —
a `Math.random()` there would make every rebuild a different instrument and no render assertable.

Because a response is a whole buffer built over its own length, the two parameters it is a
function of are not automatable and a move that lands on the value already built rebuilds nothing.
Decay and tone are knobs whose gesture is a rebuild; pre-delay and wet are AudioParams and take
lanes like any other. A convolver whose buffer is regenerated per parameter event — or per frame —
is the defect this split exists to prevent, and `rack.test.ts` counts the buffers to prove it.
