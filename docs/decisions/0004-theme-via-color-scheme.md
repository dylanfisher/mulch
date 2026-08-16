# 0004. One palette declaration per token, switched by `color-scheme`

- **Date:** 2026-08-12
- **Status:** accepted

Declare each token once as `light-dark(<light>, <dark>)` under `color-scheme: light dark` on `:root`, with theme selection driven purely by `color-scheme` (`.light`/`.dark` classes on `<html>` override it; system default needs no JavaScript) — which forecloses a third theme, since `light-dark()` takes two values.
