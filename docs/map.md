# Code map

Where things live, and how to find one before you build a second. Read this before creating any
new file.

This file describes **shape, not contents** — conventions and search commands, never an inventory.
An inventory would be a second copy of facts the code already holds, it would rot within a week,
and it would have no error message when it diverged. If you catch yourself listing what exists
here, stop: the grep is the list.

## Find before you create

The single rule that matters. AGENTS.md principles 1–3 (single source of truth, match the
surrounding code, DRY on the third occurrence) all depend on it — none of them can be followed
against a codebase you haven't searched.

| Before adding…     | Run                                                                        |
| ------------------ | -------------------------------------------------------------------------- |
| any named thing    | `rg -i '<name>' --type ts`                                                 |
| a UI primitive     | `ls src/ui/components/`                                                    |
| an app component   | `ls src/ui/`                                                               |
| a helper / util    | `rg 'export (function\|const)' src/lib/`                                   |
| an audio parameter | `rg '<name>' src/audio/params.ts` — **every param is defined there, once** |
| an effect          | `ls src/audio/effects/`                                                    |
| a type / interface | `rg '(type\|interface) <Name>' --type ts`                                  |

If a search turns up something close but not identical, that's the second occurrence. Use it or
duplicate it — do not abstract yet (principle 3).

## Tiers

| Tier              | Path                | What belongs here                                                                                                                                                                         | May import from                  |
| ----------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **lib**           | `src/lib`           | Pure helpers — DSP maths, WAV encoding, zip, time↔sample conversion. No state, no DOM, no `AudioContext`. This is the well-tested layer.                                                  | nothing in this table            |
| **audio**         | `src/audio`         | The Web Audio graph: the parameter registry, effect plugins, worklets, `buildDeckChain`, offline render. Written against `BaseAudioContext` so live and offline share one implementation. | lib                              |
| **workers**       | `src/workers`       | Worker entrypoints — WAV encode, BPM/onset analysis. Message-passing only.                                                                                                                | lib                              |
| **state**         | `src/state`         | The session store, selectors, undo/redo, IndexedDB persistence, versioning and migrations.                                                                                                | lib, audio                       |
| **ui/components** | `src/ui/components` | Generic UI primitives — shadcn / Base UI output. No project knowledge, no store reads.                                                                                                    | lib                              |
| **ui**            | `src/ui`            | The instrument's own components: Deck, Waveform, Knob, FxRack, Header. Subscribe to store slices; never own session state.                                                                | lib, audio, state, ui/components |

**Dependency direction is one-way: ui → state → audio → lib.** Never upward, never sideways.
`src/main.tsx` is the entry point and belongs to no tier.

Enforced by [`scripts/arch`](../scripts/arch), which holds the same table as a map of tier → tiers
it may import from, walks every `.ts`/`.tsx` file, and fails on any forbidden edge. It runs as the
`arch` step of `./scripts/check`. Change the table here and change it there in the same commit.

## Naming

- One thing per file; the filename is the thing's name.
- Directory names plural, file names singular: `src/ui/components/button.tsx`, not `.../buttons`.
- Tests sit beside what they test: `cn.ts` → `cn.test.ts`. Never a mirrored `__tests__` tree.
- Components are `PascalCase.tsx` and export a named function; everything else is `camelCase.ts`.
- **Soft cap 400 lines per file, hard cap 800.** Past 400 the fix is almost always a missing
  abstraction, not a smaller file. `App.tsx` stays under ~150 lines.
- Imports of our own code use the `@/` alias, not `../../`. Relative only within the same directory.

## Promotion

Things move up a tier deliberately, never by accident:

- **Third occurrence** → extract to the lowest tier that all three callers can reach (principle 3).
- **A `src/ui` component loses its project knowledge** → it belongs in `src/ui/components`.
- **A `src/ui/components` primitive grows a store read or a domain type** → it was never a
  primitive; move it up to `src/ui`.
- **A helper in `src/audio` stops touching the graph** → it belongs in `src/lib`, where it can be
  tested without a context.

A promotion is its own commit, separate from whatever work revealed it (principle 4).

<!-- paths: src/lib src/audio src/workers src/state src/ui/components src/ui -->
<!-- ↑ scripts/check verifies every path above exists. Keep it in sync with the Tiers table;
     a rename that misses this line fails the gate, which is the point. -->
