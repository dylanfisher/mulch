# 0016. Effects are ordered plugins

- **Date:** 2026-08-14
- **Status:** accepted

## Context

M5 adds per-deck effects without giving each effect a new command shape, component branch, state
field, or hand-wired graph path. The seam has to prove itself twice: adding delay after filter may
touch the delay file and the registry, but should not reopen the deck chain, store, command, or UI.
Inactive effect values also have to survive in the session so a command file can configure a rack
before a browser creates any nodes.

## Decision

**An effect is one registry plugin that owns its identity, label, parameter declarations, graph
construction, parameter bindings, and disposal.** `src/audio/params.ts` composes the registry's
declarations with deck parameters and remains the sole lookup surface. `ParamId`, defaults,
deck-only ids, effect-only ids, and ownership maps derive from those declarations; startup
validation rejects duplicate effect or parameter ids.

Each deck owns an ordered, unique `EffectId[]` and values for every registered parameter. Its audio
voice owns a rack with a stable input, an ordered instance list, and an O(1) instance map. Dry racks
allocate no effect graph. `effect.add` constructs the plugin from stored values and reconnects the
rack before committing state; without an audio host it still appends state and emits
`effect.added`, like `param.set`. Re-adding an active effect emits an error and changes nothing.

The rack already exposes reconnection and disposal even though removal and reorder commands do not
exist yet. Its signal path is `source → rack → deck gain → pan → meter/master`, shared by live and
offline contexts. Effect controls render from the same registry, through the parameter knob deck
controls use.

## Alternatives considered

- **Declare every effect parameter literally in `params.ts`** — rejected because a plugin would
  require coordinated edits in two declaration files. Composition keeps `PARAMS` authoritative
  while declarations stay beside the bindings that give them meaning.
- **Prebuild every registered effect for every deck** — rejected because a dry deck would allocate
  delay lines, feedback graphs, and nodes it never uses. Addition is the only allocation and
  rewiring path.
- **Store an unordered enabled-effect set** — rejected because signal order changes sound and has
  to survive probes and future sessions. An ordered unique list supports later removal/reorder
  without replacing the model.
- **Put filter and delay branches in `chain.ts` or `EffectRack.tsx`** — rejected because the third
  effect would reopen shared code and duplicate plugin facts across audio and UI.

## Consequences

Adding an effect is one plugin file plus one registry entry. `param.set` can configure an inactive
effect under Node; activation later initializes the graph from that value. Parameter changes route
in O(1), while addition pays the deliberate O(rack length) reconnect cost and may happen during
playback. Removal, bypass, reorder, and duplicate instances remain out of scope, but the state and
audio abstractions no longer need replacement when those commands arrive.

The M5 golden deliberately changes: the first render portion now measures low-pass ringing and the
second isolates feedback repeats after its source's `deck.stopped` event. Exact event and tail
assertions explain that fingerprint rather than asking the golden alone to prove the effects work.
