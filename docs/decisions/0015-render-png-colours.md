# 0015. The offline render's PNG carries the colour boundary's second reviewed exception

- **Date:** 2026-08-14
- **Status:** accepted

`src/app/render.ts` may hold the PNG's two grey literals (`PNG_BACKGROUND`, `PNG_TRACE`), fixed and deliberately untied to the theme tokens so the diagnostic image stays byte-comparable across renders and machines; it is the boundary's second reviewed exception after `public/favicon.svg` (0006), and both are named in `boundaries.md`.
