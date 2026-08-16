# 0002. oxlint + oxfmt and the native TypeScript compiler, instead of ESLint and Prettier

- **Date:** 2026-08-12
- **Status:** accepted

Drop ESLint, typescript-eslint and Prettier — which do not support TypeScript 7 — in favor of oxlint (with `oxlint-tsgolint` for type-aware rules) and oxfmt, running TypeScript 7 as the only compiler.
