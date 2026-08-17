# 0070 — A per-frame read refills, and never clears

`peek()` allocated 27.9 bytes on every call — the preview build in headless Chromium,
`HeapProfiler.collectGarbage` then `Runtime.getHeapUsage` over CDP around 200 000 calls, three
rounds interleaved with a `() => 1` control that reads 0.1, ±0.1 B. All of it was one statement:
`out.automation.clear()`. V8's `Map.prototype.clear` throws the backing table away and allocates
a fresh one, so clearing an already-empty map costs exactly as much as clearing a full one — the
same class of hidden allocation P35 found behind `performance.memory`, and it sat directly under
a comment claiming nothing was allocated.

So a per-frame read refills its scratch and never resets it. `peek()` writes every live lane's
phase over whatever key is already there — an overwrite allocates nothing — and prunes departed
keys only on the frame where `out.automation.size` and `lanes.size` disagree, which is the frame
a lane actually went away on. The knob builds its `paramKey` at render rather than inside its
frame callback for the same reason — the pair does not change, and the key is a `JSON.stringify`.
This binds every scratch a frame reads through: `clear()`, `splice(0)`, `length = 0` and `new`
are all writes a sixty-times-a-second read may not make.

The floor is not zero and is not ours: `stats()` still costs ~2 B/call, which is Blink boxing the
doubles it hands back — `performance.now()` alone measures 0.6 B/call. Do not chase it.

The same rule for a paint: a write to `textContent` replaces the node's children whether or not
the string matches, so the debug console compares before it writes, as the knob's readout already
did (P36). With the console open and nothing happening, that is 11 text mutations a frame,
measured, before and 1 after. Its eleven counters are still _formatted_ every frame and ten of
those strings thrown away — deliberately, because a counter cannot be known unchanged without
being read, and the alternative is eleven second copies of what each one reads from. The cheap
half is the string; the expensive half is the node, and the node is the half that stopped.

The dot on an automation preview keeps the same rule against the position it last painted: a
lane halts holding its phase (0040), which is exactly the state an Option-hover sits in, and
three position strings a frame for a dot that has not moved is the same waste as the counters.
