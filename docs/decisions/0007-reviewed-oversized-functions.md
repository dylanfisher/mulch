# 0007. Oversized functions are waived one at a time, in the file, with a reason

- **Date:** 2026-08-12
- **Status:** accepted

`max-lines-per-function` and `import/max-dependencies` stay on everywhere at their current caps; a function that has been read and judged acceptable is waived at its site with an `oxlint-disable-next-line` preceded by a comment explaining why, never by a directory-wide override or a raised cap.
