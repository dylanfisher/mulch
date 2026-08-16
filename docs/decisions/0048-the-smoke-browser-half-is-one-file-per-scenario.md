# 0048. The smoke's browser half is one file per scenario

- **Date:** 2026-08-15
- **Status:** accepted

`scripts/smoke` was 2,582 lines, and 1,500 of them were one Playwright function: every gesture in
one body, its results in one returned object, and its assertions 400 lines further down. A
behaviour landed in four places spread across the file, which is three more than grep can find
together.

The browser half now lives in `scripts/smoke.d/`, one file per scenario, each holding its own
gestures, its own thresholds, its own assertions and the `report()` line they earn.
`scripts/smoke.d/browser.js` owns the page and lists the scenarios in the order it drives them;
`scripts/smoke` keeps the fixture half — the `./scripts/drive` subprocess runs and what they
printed. Adding a behaviour is one new file and one line in that list.

Two things the split has to preserve. Scenarios share one page and one sequence, because what one
leaves behind is what the next reads, so anything crossing between them goes through `state` rather
than being re-established. And a failed assertion there throws rather than exits: the six drive
runs beside it have already finished, and taking the process down would lose their assertions too.
`scripts/smoke` reads the sentinel after those six, exactly where the old assertions were.

These files are the first JavaScript under `scripts/` the toolchain sees, so they lint for the
first time. `.oxlintrc.json` waives the type-aware rules there for the reason it already waives
them for worklets — everything `page.evaluate` returns is `any` — and nothing else.
