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
| anything at all    | `./scripts/map` — every file in `src/`, one line each                      |
| any named thing    | `rg -i '<name>' --type ts`                                                 |
| a UI primitive     | `ls src/ui/components/`                                                    |
| an app component   | `ls src/ui/`                                                               |
| a helper / util    | `rg 'export (function\|const)' src/lib/`                                   |
| an audio parameter | `rg '<name>' src/audio/params.ts` — **every param is defined there, once** |
| an effect          | `ls src/audio/effects/`                                                    |
| a type / interface | `rg '(type\|interface) <Name>' --type ts`                                  |

If a search turns up something close but not identical, that's the second occurrence. Use it or
duplicate it — do not abstract yet (principle 3).

Every generic control is mounted at once in the gallery — `./scripts/dev`, then `#/dev`, source in
`src/ui/dev/`. Open it before building a control: it is faster than a grep at answering "does this
already exist, and what does it look like?", and a primitive that isn't in it is one nobody can see
drift.

## Roles

Every file under `src/` says what it is, in one line, at the top of itself:

```ts
/**
 * @role A rotary control for one bounded continuous value.
 * @instead Linear travel → src/ui/components/slider.tsx.
 */
```

- **`@role` is required** — one per file, present tense, what the file _is_. `./scripts/map`
  assembles them into the catalogue; that catalogue is the answer to "does this already exist?",
  which is why an unlabelled file fails the gate.
- **`@instead` is optional** and points at the thing someone would otherwise duplicate. Write one
  the day a near-duplicate is proposed, not before — principle 3 applies to prose too. Any
  `src/…` path it names must exist.
- `src/ui/components` is exempt: it is regenerated, so a line written there is lost on the next
  `shadcn add`. Those are indexed by their exports, and the gallery is the version you look at.

The line lives in the file so it cannot silently diverge from it. Listing the same thing here
instead would be a second copy with no error message when it rots — see the note at the top.

## Reuse, variant, or new

Work top to bottom; stop at the first match. This is the judgment `./scripts/map` cannot make
for you.

```
1. A colour, radius, or type stack?     -> src/ui/tokens.css. Never a literal, never an
                                           arbitrary Tailwind value. (AGENTS.md boundary)
1b. Styling a piece of text?            -> one `type-*` utility, and nothing else. A new
                                           variation is a new @utility there, plus a specimen
                                           in src/ui/dev/TypeSection.tsx. See Naming below.
2. A deck or effect parameter?          -> src/audio/params.ts, one line — plus the node it
                                           drives, in src/audio/chain.ts. That binding is total
                                           by `satisfies`, so the compiler names it; nothing
                                           else about a param is written twice (0011).
3. An effect?                           -> a new file in src/audio/effects/. Never hand-wire one
                                           into buildDeckChain or a component.
4. Maths with no state and no context?  -> src/lib. It is the tested layer; keep it reachable.
5. A generic control that exists?       -> src/ui/components/. Open #/dev first — faster than a
                                           grep at "does this exist, and what does it look like?"
6. A new visual variant of one?         -> add it to that primitive's cva map. Not a wrapper,
                                           not a one-off className at the call site.
7. A primitive that does not exist?     -> pnpm dlx shadcn@latest add <name>. Never hand-author
                                           one: the style in components.json decides the library.
8. A primitive needing a project default? -> a thin wrapper in src/ui (precedent:
                                           src/ui/ThemeToggle.tsx wrapping toggle-group).
9. Project knowledge, store reads, or the audio graph? -> src/ui. It may import everything.
```

## Tiers

| Tier              | Path                | What belongs here                                                                                                                                                                         | May import from                       |
| ----------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **lib**           | `src/lib`           | Pure helpers — DSP maths, WAV encoding, zip, time↔sample conversion. No state, no DOM, no `AudioContext`. This is the well-tested layer.                                                  | nothing in this table                 |
| **audio**         | `src/audio`         | The Web Audio graph: the parameter registry, effect plugins, worklets, `buildDeckChain`, offline render. Written against `BaseAudioContext` so live and offline share one implementation. | lib                                   |
| **workers**       | `src/workers`       | Worker entrypoints — WAV encode, BPM/onset analysis. Message-passing only.                                                                                                                | lib                                   |
| **state**         | `src/state`         | The session store, selectors, IndexedDB persistence, versioning and migrations.                                                                                                           | lib, audio                            |
| **app**           | `src/app`           | The headless instrument: commands in, events out. The command union and envelope, the event bus, `probe()`, the facade. The **only writer** of `state`.                                   | lib, audio, workers, state            |
| **ui/components** | `src/ui/components` | Generic UI primitives — shadcn / Base UI output. No project knowledge, no store reads.                                                                                                    | lib                                   |
| **ui**            | `src/ui`            | The instrument's own components: Deck, Waveform, Knob, FxRack, Header. Subscribe to store slices; never own session state.                                                                | lib, audio, state, app, ui/components |

**Dependency direction is one-way: ui → app → state → audio → lib.** Never upward, never
sideways. `src/ui` also imports `src/state` directly — **reads only**, so per-frame subscriptions
skip a hop; every write goes through `app`'s `send()`. `scripts/arch` can check the edge but not
the direction of the write, so the write rule is a review rule (docs/plan.md §5).
`src/main.tsx` is the entry point and belongs to no tier.

`src/ui/components` is generated: `pnpm dlx shadcn@latest add <name>`, then `pnpm format:write`
(shadcn's output is not oxfmt-formatted, so the `format` step fails until you do). The style —
which decides both the look and the underlying library — is `components.json`, not a flag.

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
- **Type is a `type-*` utility, never loose classes.** A call site picks one variation and stops:

  ```html
  <div class="type-eyebrow text-muted-foreground">Cutoff</div>
  <!-- yes -->
  <div class="text-2xs font-medium tracking-widest uppercase"><!-- no  --></div>
  ```

  The five are `type-display`, `type-title`, `type-body`, `type-eyebrow` and `type-readout`,
  defined once in `src/ui/tokens.css` and mounted at `#/dev` under Type. Each carries **size,
  weight, line height, letter spacing and case together**, because those are the properties that
  have to move as one to stay a system — a lone `tracking-tight` or `leading-none` at a call site
  is how two headings end up almost the same. That is the whole rule: no `text-*`, `font-*`,
  `leading-*` or `tracking-*` in a `.tsx`.

  Three things that are _not_ exceptions to it:
  - **Colour is not type.** The same variation is foreground in one place and muted in the next,
    so pair it with `text-muted-foreground` — there is no `type-body-muted`.
  - **Layout is not type.** `ml-auto`, `text-center`, `w-full` sit alongside a variation fine.
  - **`src/ui/components/` is exempt** — it is regenerated, so an edit there is lost on the next
    `shadcn add` (0003). Its `text-xs`/`text-sm` are the same two sizes `type-body`/`type-title`
    use, which is what keeps the two sets on one scale.

  Need something the five do not cover? Add a sixth `@utility` to `tokens.css` **and** a specimen
  to `src/ui/dev/TypeSection.tsx` — a variation nobody can see beside its neighbours is one nobody
  can see drift. Adding one is cheap and expected; a one-off at a call site is not
  (docs/decisions/0008-type-variations-are-utilities.md).

## Promotion

Things move up a tier deliberately, never by accident:

- **Third occurrence** → extract to the lowest tier that all three callers can reach (principle 3).
- **A `src/ui` component loses its project knowledge** → it belongs in `src/ui/components`.
- **A `src/ui/components` primitive grows a store read or a domain type** → it was never a
  primitive; move it up to `src/ui`.
- **A helper in `src/audio` stops touching the graph** → it belongs in `src/lib`, where it can be
  tested without a context.

A promotion is its own commit, separate from whatever work revealed it (principle 4).

<!-- paths: src/lib src/audio src/workers src/state src/app src/ui/components src/ui -->
<!-- ↑ scripts/check verifies every path above exists. Keep it in sync with the Tiers table;
     a rename that misses this line fails the gate, which is the point. -->
