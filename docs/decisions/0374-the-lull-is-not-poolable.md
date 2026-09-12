# 0374 — The lull is not poolable, so the pool is stated once

- **Date:** 2026-09-11
- **Status:** accepted, narrowing [0202](0202-an-effect-declares-how-present-it-is.md), whose
  "every entry that declares a presence may be drawn" it stops reading as the pool.

**An automator may not draw a lull.** A run fades entries in by their presence, and a lull's presence
is a chance of stopping the yard — or every yard, on the rack under all of them — so a drawn one
would pause the performance under a run nobody asked to pause. It declares a presence like every
entry, because the registry demands one and a hand fades it like any other, but it takes no weight
knob and stands outside `growable`.

**So the pool is a list the registry exports, and nothing derives it.** Four surfaces used to read
"every entry with a presence" off `EFFECTS`; each now reads `POOL`, which the automator is built
from. A second reading of what the pool is was exactly what let a new entry join it by existing.
