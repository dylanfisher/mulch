# 0004. One palette declaration per token, switched by `color-scheme`

- **Date:** 2026-08-12
- **Status:** accepted

## Context

`src/ui/tokens.css` held a single, dark palette. Adding light meant a second set of values, and
the usual shadcn arrangement — light on `:root`, dark repeated inside `.dark` — writes every token
name twice and every colour once per theme. It also makes "follow the system" a JavaScript
concern: something has to read `prefers-color-scheme`, decide, and put a class on `<html>` before
the first paint, or the page flashes the wrong theme.

## Decision

Each token is declared once, as `light-dark(<light>, <dark>)`, under `color-scheme: light dark` on
`:root`. The theme in force is then `color-scheme` and nothing else:

- **system** — no class. The browser's own default; no JavaScript involved and nothing to flash.
- **light / dark** — `.light` or `.dark` on `<html>`, which only overrides `color-scheme`. The
  class is applied on mount, so an explicit choice that disagrees with the OS does flash the
  OS theme for a frame on load — the cost of not shipping the pre-paint script below.

`src/ui/theme.ts` owns the preference (`localStorage`, key `mulch:theme`), and `ThemeToggle`
is the control. Tailwind's `dark:` variant is redefined to match both branches — an explicit
`.dark`, and system dark when `.light` has not overridden it — so the generated primitives in
`src/ui/components`, which lean on `dark:` heavily, stay in step with the tokens.

## Alternatives considered

- **Duplicate the palette under `.dark`** — rejected. Two declarations per colour is exactly the
  re-derived fact principle 1 exists to prevent, and the pair drifts silently: nothing fails when
  only one side is updated.
- **Class decided by JavaScript, including for system** — rejected. It buys a `prefers-color-scheme`
  listener, a pre-paint inline script in `index.html`, and a second copy of the storage key inside
  it, to reproduce what the browser already does.

## Consequences

`light-dark()` is required, which rules out browsers older than ~2024 — acceptable for an app built
on Web Audio worklets. It composes with Tailwind's opacity modifiers (`bg-input/30` becomes a
`color-mix()` over the token) — verified in Chrome before landing, and worth re-checking if a token
ever stops resolving.

Adding a colour still means editing one line in one file; a theme-only tweak never touches a
component. A third theme, if it ever exists, does not fit this shape — `light-dark()` takes two
values — and would mean going back to per-theme blocks.
