# Boundaries

The project-specific invariants. Unlike [principles.md](principles.md), which would hold in any
codebase, each of these is a claim about _this_ one that some part of the repo would quietly
stop being true without.

Summarised in one line each in [AGENTS.md](../AGENTS.md); this is the full text. Read the
relevant one before touching the area it names.

- **One declaration per parameter; one value per (instance, parameter).** Every parameter is
  declared once and reached through `src/audio/params.ts`, the sole lookup from which defaults,
  UI, automation and serialization derive. Deck parameters are declared there and bound in
  `src/audio/chain.ts`; effect parameters are declared and bound by their owning plugin
  ([0011](decisions/0011-sound.md), [0016](decisions/0016-effects-are-ordered-plugins.md)). A
  _value_ belongs to the pair, not to the parameter alone: a deck holds its own, and each rack
  instance holds exactly the parameters and lanes its plugin declares, because a rack may hold two
  delays ([0030](decisions/0030-effects-are-instances.md)). Anything else about a parameter written
  twice is the abstraction to fix, not the caller.
- **One signal chain.** `buildDeckChain(ctx: BaseAudioContext)` serves both the live
  `AudioContext` and offline export. Never write a second implementation of the chain for
  rendering — a fingerprint taken through a different graph measures a different instrument.
- **Effects are registry entries** in `src/audio/effects/` — one file each. Never hand-wire an
  effect into a component or the chain. A rack holds _instances_ of those entries: an instance id
  is opaque, caller-supplied and durable, like a deck id, and any number of instances of one entry
  may sit in one rack ([0030](decisions/0030-effects-are-instances.md)).
- **The stored session is this build's shape, or it is discarded.** One `Session` type, one
  `validateSession`, no version field and no migrations while the app is pre-release. Change the
  shape freely; stored data that no longer validates is dropped with a `session.discarded` event
  and the instrument boots fresh ([0026](decisions/0026-pre-release-has-no-migrations.md)).
- **A deck id is opaque and durable, and the session's own list is the registry.** `DeckId` is a
  caller-supplied string, `session.deckList` is the single source of truth for which decks exist
  and in what order — one record per deck, carrying the emoji and the name it was added with
  ([0057](decisions/0057-a-deck-is-called-a-yard.md)) — and `decks` is validated against it as one
  shape. Never reintroduce a
  compile-time list of decks: a session may hold any number, including none, and a command naming
  a deck it does not hold throws the way one naming an unregistered effect does
  ([0029](decisions/0029-deck-identity-is-durable-shape.md)).
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
