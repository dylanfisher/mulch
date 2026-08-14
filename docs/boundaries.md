# Boundaries

The project-specific invariants. Unlike [principles.md](principles.md), which would hold in any
codebase, each of these is a claim about _this_ one that some part of the repo would quietly
stop being true without.

Summarised in one line each in [AGENTS.md](../AGENTS.md); this is the full text. Read the
relevant one before touching the area it names.

- **One place per parameter.** Every deck/effect parameter is defined only in
  `src/audio/params.ts` — defaults, UI, automation and serialization all derive from it — plus
  the node it drives in `src/audio/chain.ts`, a binding the compiler demands rather than a rule
  to remember ([0011](decisions/0011-sound.md)). Anything else about a parameter written twice
  is the abstraction to fix, not the caller.
- **One signal chain.** `buildDeckChain(ctx: BaseAudioContext)` serves both the live
  `AudioContext` and offline export. Never write a second implementation of the chain for
  rendering — a fingerprint taken through a different graph measures a different instrument.
- **Effects are registry entries** in `src/audio/effects/` — one file each. Never hand-wire an
  effect into a component or the chain.
- **Session format is versioned.** Changing its shape requires a new version plus a migration.
  Never edit a shipped migration; add the next one.
- **Nothing per-frame goes through React state.** Playhead, meters and cursors live in refs read
  by one RAF loop.
- **No colour literal outside `src/ui/tokens.css`** — not in CSS, not in a Tailwind arbitrary
  value. Two reviewed exceptions, and only these: the favicon
  ([0006](decisions/0006-favicon-colour.md)) and the offline render's diagnostic PNG
  ([0015](decisions/0015-render-png-colours.md)). A third needs its own decision record.
- **Type is one `type-*` utility, never loose classes.** A call site names a variation and adds
  no `text-*`, `font-*`, `leading-*` or `tracking-*` of its own — see [map.md](map.md#naming).
- **Never write, print, or `op read` a plaintext secret** — `.env.example` holds `op://`
  references, resolved by `op run` at runtime.
- **Never kill a server you did not start.** See AGENTS.md; it sits up there rather than here
  because it applies before you have read anything else.
