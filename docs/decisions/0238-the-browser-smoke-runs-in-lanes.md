# 0238. The browser smoke runs in lanes, and a lane says what its page must hold

- **Date:** 2026-08-31
- **Status:** accepted

The browser half of `./scripts/smoke` runs as three lanes on three pages at once, declared in `scripts/smoke.d/browser.js`. As one serial page it was 16.8s of ~2500 round trips and the entire critical path of `./scripts/check` — every other step of the gate finished underneath it. None of it was CPU-bound, so the split is three Chromiums for a 19.0s gate that reads 7.6s.

Order stays load-bearing _inside_ a lane: what one scenario leaves on the page is what the next reads, and `state` carries what crosses between them. What a lane may not do is inherit page state from a scenario in another lane. A lane declares what its page must already hold in its own `prelude`, through `window.mulch` and the visible affordances. A new scenario picks a lane and, if the page does not already hold what it reads, adds it there — never by relying on a neighbour's leftovers, which is the coupling the split had to unpick and which nothing but prose recorded.

`report()` writes into the running lane's own claim list (`AsyncLocalStorage` in `scripts/smoke.d/harness.js`), replayed in lane order: three pages pushing into one array would order the summary by whichever finished first rather than by the order the assertions read in.
