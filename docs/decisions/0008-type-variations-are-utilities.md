# 0008. A type variation is one utility, not a handful of classes at the call site

- **Date:** 2026-08-12
- **Status:** accepted

Type is expressed as one `@utility type-*` per variation in `src/ui/tokens.css` — carrying size, weight, line height, letter spacing, and case together — and a `.tsx` names exactly one of them, never a bare `text-*`/`font-*`/`leading-*`/`tracking-*` combination at the call site; colour stays a separate class since it is not part of a variation.
