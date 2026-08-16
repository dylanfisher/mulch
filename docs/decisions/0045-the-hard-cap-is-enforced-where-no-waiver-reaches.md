# 0045. The soft cap is the linter's; the hard cap is checked where no waiver reaches

- **Date:** 2026-08-15
- **Status:** accepted

`max-lines` at 400 stays `oxlint`'s to report and stays waivable in the file with a reason (0007),
because passing 400 is a judgment call. 800 is not: `scripts/arch` counts every file under `src/`
and fails past it, where a source-level `oxlint-disable` cannot switch it off. The four files that
carry a file-level waiver today — `execute.ts`, `facade.ts`, `deck.ts`, `engine.ts` — were each
reviewed, but a whole-file waiver absorbs unbounded growth afterwards, and they are also the four
highest-churn files in the repo. Both numbers are read from map.md's own sentence, so the doc, the
linter and the gate cannot disagree.
