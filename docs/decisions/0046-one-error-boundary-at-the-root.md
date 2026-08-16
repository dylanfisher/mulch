# 0046. One error boundary, at the root, with no retry

- **Date:** 2026-08-15
- **Status:** accepted

`src/ui/ErrorBoundary.tsx` wraps `App` in `src/main.tsx` and is the only one; a section does not
get its own. A render throw is not a recoverable local condition in an instrument whose state is
one session — half a screen still mounted over a store nobody can trust is worse than a page that
says what happened. It offers no "try again" for the same reason: the re-render throws again, and
a reload is the honest recovery. This is principle 5 reaching the screen, which the boot handler
in `main.tsx` already did for a failure that happens before React exists.
