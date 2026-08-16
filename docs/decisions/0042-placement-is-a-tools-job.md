# 0042. Where a thing sits in a file is a tool's job, never a rule we write down

- **Date:** 2026-08-15
- **Status:** accepted

Eighteen of the static review sweep's findings across waves 1 and 3 were one class — like things
placed unlike between sibling files: import and member order, `@role` above or below a file's
waivers, a private helper above the exports or between two of them — so a placement convention is
enforced by `oxfmt`, `oxlint` or `scripts/map` or it is not written down at all, and principle 2
(match the surrounding code) covers everything no tool can check.
