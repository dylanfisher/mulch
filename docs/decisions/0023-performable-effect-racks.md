# 0023. Bypass is durable rack state, and the rack is rewired before it is recorded

- **Date:** 2026-08-14
- **Status:** accepted

## Context

[0016](0016-effects-are-ordered-plugins.md) left the rack add-only on purpose: each deck owns an
ordered, unique `EffectId[]`, and the rack closure already exposed reconnection and disposal for
the removal and reorder commands that did not exist yet. P4 is those commands, plus bypass, and a
performer expects all three to be safe mid-performance — no lost knob positions, no half-rewired
graph, no operation that undo cannot take back in one press.

Three questions had to be answered before any code: what bypass _is_ in the durable session, what
happens to a bypassed effect's nodes, and in what order the graph and the session change. The
third is the one that has bitten this repo before — `effect.add` already constructs and reconnects
before it commits state, precisely so a graph refusal leaves no session or event trace behind
(0016, and the failure atomicity rule in [0009](0009-the-app-tier.md)).

Bypass is also the first rack fact that is _not_ signal order, so it could plausibly have been
modelled as an absence: a bypassed effect is simply not in `effects`. That would have made bypass
free and wrong, which is why it is written down here.

## Decision

**Bypass is a second ordered, unique `EffectId[]` on the deck — `bypassed` — whose entries must
all appear in `effects`, in `effects` order.** `effects` remains the complete rack in signal
order, so an effect's place in the rack is independent of whether it is currently in the signal
path. Parameter values are already registry-keyed on the deck rather than on the instance (0016),
so a bypassed effect keeps its knob values for free, and `param.set` keeps reaching it. The
projection derives `bypassed` by filtering `effects`, which makes the JSON canonical: two decks
with the same rack in the same state stringify identically, which is what
[0021](0021-bounded-snapshot-history.md)'s checkpoint comparison depends on.

This is a session shape change, so `SessionV4` adds `bypassed` to each deck and the append-only
v3 → v4 migration supplies an empty list. The v4 validator rejects an unknown id, a repeat, an id
that is not in `effects`, and a list that is not in rack order.

**A bypassed effect keeps its nodes and loses its edges.** The rack holds a bypass set beside its
order and instance map; `reconnect()` walks `order` and skips any id in that set, so a bypassed
effect's instance is still constructed, still receives `setParam`, and is simply not a link in the
chain. Unbypassing is a reconnect, not an allocation, so it is safe to do repeatedly while a deck
plays, and the effect comes back already holding the values the performer set while it was out.
Removal is the opposite: the instance leaves the order, the map and the bypass set, the rack
reconnects, and only then is the instance disposed.

**The graph is prepared before the durable state changes, for all three operations.** Each
executor computes the resulting rack, hands it to the graph, and writes the store and the event
only after the graph accepted it. Every rack mutation in `src/audio/effects/rack.ts` is
transactional in the same shape `add` already used: mutate the order, `reconnect()`, and on a
throw put the previous order back, reconnect again, and rethrow. Without an audio host the state
still moves, exactly as `param.set` and `effect.add` already do, so a command file can arrange a
rack under Node before any context exists.

`effect.bypass`, `effect.remove` and `effect.reorder` are ordinary serialisable durable edits.
They carry an `EffectId` rather than a rack index, because an index is a fact about the rack at
the moment the command was written and an id is not; `effect.reorder` carries the destination
`index`, clamped into the rack the way `param.set` clamps into a range. Each is one durable
transaction, so each is one history entry, one autosave, and one line on the log; each participates
in `history.group` like every other grouped edit. An operation naming an effect that is not in the
rack is unanswerable rather than malformed — an error event, changing nothing — while an unknown
effect id or a non-integer index is wire input that throws.

Restoration gains one stage: sources, parameters, ordered effects, **bypass**, automation, then
loops. Bypass has to follow addition because it names an effect the rack must already hold, and
precede automation and loops for the same reason those already run last.

Effect removal leaves the deck's parameter values and any automation lanes alone. P5 owns the
lane-retention rule and states it explicitly; until an effect parameter is automatable there is
nothing for this decision to decide, and inventing the rule here would mean writing it twice.

## Alternatives considered

- **Bypass as absence from `effects`** — rejected because the rack's order _is_ the durable fact
  bypass must not disturb. Unbypassing would have to guess a position, and a performer who
  bypasses the middle of a three-effect rack would get their effect back somewhere else.
- **`effects: { id, bypassed }[]`** — rejected because every existing reader of `effects`
  (projection, validator, restore, engine preparation, the rack, the UI) would change shape to
  learn one boolean, and the ordered-unique-id list is the thing 0016 chose deliberately.
- **A separate transient bypass map outside the session** — rejected because a bypass would not
  survive a reload, an archive, or an undo, and the performer would call that a bug.
- **Disposing and rebuilding an effect on bypass** — rejected because a bypass would then cost an
  allocation and lose any node-internal state (a delay line's contents), and unbypass could fail
  mid-performance in a way a reconnect cannot.
- **Muting a bypassed effect with a gain node** — rejected because a muted effect still processes,
  still contributes latency and tail, and would need a second wet/dry topology per plugin — a
  branch in every effect file for one rack-level fact.
- **`effect.reorder` carrying the whole new order** — rejected because the wire could then assert
  a rack the deck does not have, and the executor would have to diff two lists to name what moved.
- **A rack index in `effect.remove` / `effect.bypass`** — rejected because a JSONL macro or a
  MIDI binding written against index 1 silently retargets when an earlier effect is removed.

## Consequences

Adding a rack operation is now a command, an executor branch, a rack method and a UI control —
no session, history, persistence, archive or restore change, because `bypassed` rides the existing
durable projection. Reorder and removal pay the same deliberate O(rack length) reconnect that
addition already paid, and may happen during playback; bypass pays it too, which is why it is a
reconnect rather than a rebuild.

A bypassed effect still holds its nodes, so a large rack left fully bypassed costs the memory of a
rack that is doing nothing. That is the price of instant, infallible unbypass, and the rack is
bounded by the registry.

The durable format is now v4; v3 sessions and archives migrate forward with an empty bypass list,
and every shipped migration stays untouched. Duplicate instances of one effect remain out of
scope, as they were at 0016: the ordered unique id list is still the model.
