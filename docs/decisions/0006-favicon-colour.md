# 0006. The favicon carries the only colour literals outside `src/ui/tokens.css`

- **Date:** 2026-08-12
- **Status:** accepted

`public/favicon.svg` may hold colour literals, and it is the only file that may — it carries both the light and dark branches of `--primary` (dark under `@media (prefers-color-scheme: dark)`) so the mark tracks the same token the app does, with `src/ui/tokens.css` remaining the source of truth it is copied from.
