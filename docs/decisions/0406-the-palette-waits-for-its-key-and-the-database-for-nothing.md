# 0406 — The palette waits for its key, and the database waits for nothing

- **Date:** 2026-09-22
- **Status:** accepted

**The command palette is a chunk of its own, fetched by the first ⌘K** (`PaletteOnDemand`,
src/ui/App.tsx). The open flag lives in src/ui/shortcuts.ts, so the press that asks for the chunk
is the one the palette mounts open under. The shell imports `PaletteProps` as a type only; a
value import from src/ui/CommandPalette.tsx anywhere on the startup path puts it back in the
entry chunk, which src/ui/App.test.tsx catches.

**The database opens beside the worklet fetches, not after them** (`openLiveHost`,
src/app/boot.ts). `openIndexedDbRepository` resolves only once the database is open, so a
repository in hand is an open one. Start-up fails on the first of the two to fail; a second
failure after it is logged, never dropped and never unhandled.
