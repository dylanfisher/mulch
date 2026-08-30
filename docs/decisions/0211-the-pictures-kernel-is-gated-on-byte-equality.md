# 0211 — The picture's kernel is gated on the byte it has not rounded yet

- **Date:** 2026-08-29
- **Status:** accepted, applying [0116](0116-a-per-sample-kernel-is-priced.md) to the picture

`curvedField` is the largest loop in the instrument and now carries a `./scripts/bench` row, at the
three sizes a picture is asked for and at the dearest of the ten profiles. A picture-sized tile at
3024×1890 costs 273ms fan, 284ms radial and 314ms spiral against 2.1ms to write the same alpha bytes
and nothing else, so the kernel is well over a hundred times its own memory floor: instruction
throughput, not traffic, which is what [0058](0058-nothing-qualified-for-wasm.md)'s rule needed a
number for.

**An optimisation of this kernel ships only if the picture does not move.** A bake is spent through
`Math.round(255 * profileBlock(...))` and everything a frame does to a tile is a transform of what
that laid down, so a pixel that moves is a picture that changed, and no timing buys that. Two
rewrites clear the bar and shipped: `Math.log(Math.max(Math.hypot(u, v), MIN_RADIUS))` became
`0.5 * Math.max(Math.log(u * u + v * v), 2 log MIN_RADIUS)`, since V8's `Math.hypot` pays for
overflow-safe scaling this kernel's operands cannot need, and `place.cover / ref` is hoisted out of
both loops. Interleaved against the arithmetic they replace: spiral 417ms → 304ms, radial 351ms →
278ms, fan 275ms → 270ms.

**The bar is stated before the round, not after it, and that is the whole of why it has teeth.**
Neither rewrite is bit-exact — the log identity parts by up to 8.9e-16 and reassociating a multiply
and a divide parts by about as much — so both are licensed by measurement rather than by algebra. A
bar written on the alpha byte alone would licence far more than that: a byte can only move where a
value sits within the disagreement of a rounding boundary, so a byte-equality assertion passes
_anything_ whose error is too small to cross one, which is exactly the class of rewrite this
decision exists to refuse. Measured: a relative error of 1e-12 in the turns moves two thousand bytes
of a 192×120 tile and a byte-only assertion reports none of them.

So `src/lib/moireGeometry.test.ts` holds a transcription of the arithmetic the kernel was written
from and runs the shipped kernel against it over every geometry × every profile × three places,
asserting that the two part by **less than 1e-9 of an alpha step out of 255** before the round. The
shipped rewrites part by 3.5e-10; a relative error of 1e-13 in the turns — a tenth of what a
polynomial `log` or a fine radius table costs — parts by 1.3e-7, a hundred times the bar. The
transcription is not maintained alongside the kernel; it is what the kernel has to keep agreeing
with. What that rejects is therefore decided before anyone argues for it: mirroring a radial field
into its quadrants (`centreAcross` returns a float, so the anchor is not on a pixel), accumulating
`u` by a step instead of multiplying, a lookup table on the radius, a bake below device resolution,
and the WASM SIMD port — vectorised `log` and `atan2` are polynomials, not `Math.log`. None of them
ships.

**Byte-equality itself is asserted with one exemption, and the exemption is proven live.** Where the
reference's own pre-rounding value sits within that same 1e-9 of a half, `Math.round` splits the
pixel on the last bit of a double rather than on the picture, and the harness admits a difference of
exactly one step there. It also asserts that at least one such pixel exists, so the branch cannot rot
into decoration. Two of the harness's three anchors are deliberately off a whole pixel, which is the
case a mirrored quadrant would get wrong.

**What that costs, stated plainly:** the shipped kernel is _not_ byte-identical at every size. Over
a full 3024×1890 tile at all ten profiles, 86 alpha bytes of 5,715,360 differ by one step — 40
radial, 32 spiral, 14 fan, every one of them `swarm`, whose block passes exactly `0.5` (127.5 of 255) where it crosses its own mean, and none of them further than 1.6e-11 from that boundary. A row
drawn at that size differs from what it drew before in eighty-six pixels on one contour. That is the
known cost of the 23%, and it is recorded rather than hidden behind a tile size chosen to miss it.

`./scripts/bench` still asserts nothing ([0050](0050-the-gate-counts-things-and-the-profiler-measures-them.md));
the harness in the test file is what the gate runs.
