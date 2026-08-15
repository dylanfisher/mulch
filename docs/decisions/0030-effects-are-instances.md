# 0030. Parameter identity is (instance, param), and a rack holds instances

- **Date:** 2026-08-15
- **Status:** accepted
- **Supersedes:** the "one ordered unique `EffectId[]`" half of
  [0016](0016-effects-are-ordered-plugins.md), and 0024's retention of a removed effect's lane

## Context

P13 asks for a rack that holds two delays. Every part of the build answered "which delay?" with
the effect id, because until now a deck could hold at most one of each: `deck.effects` was a
unique `EffectId[]`, `bypassed` was a parallel list of effect ids beside it, `params` was one flat
`Record<ParamId, number>` on the deck, automation was one flat map keyed by `ParamId`, and the
rack routed a parameter by asking the registry which effect declared it.

That is not a missing feature; it is a claim about identity. `params["delay.time"]` is a single
number for a deck, so a second delay has nowhere to put its own time. The question is not how to
allow a duplicate but what a value is a value _of_.

Three sub-questions each decide a durable shape that later work cannot cheaply change: what makes
an effect in a rack _the same effect_, where a value lives, and what happens to that value when
the thing holding it leaves.

## Decision

**An effect instance's identity is an opaque, caller-supplied, durable string — the same kind of
identity a deck has ([0029](0029-deck-identity-is-durable-shape.md)) and a clip has
([0027](0027-clips-are-borrowed-deck-presets.md)).** A rack entry is
`{ id, effect, bypassed, params, automation }` in signal order. `effect.add` names the id it is
creating, the way `deck.add` and `clip.capture` do; the UI mints one with `crypto.randomUUID()`,
and a JSONL file adds two delays and then addresses each by the name it wrote itself. Adding an id
the deck already holds is refused; adding a second instance of an effect the rack already holds is
the whole point, and is not. Nothing derives meaning from the string: `src/ui` prints a slot's
_position_ beside its plugin label, and no tier reads inside the id.

**`PARAMS` remains the one declaration lookup; a value lookup becomes (instance, param).** This is
the boundary that moved, and it is the only thing that moved: a parameter is still declared once,
in `src/audio/params.ts` for a deck parameter and in the owning plugin for an effect's, and every
default, range, curve, label and automation opt-in still derives from that one declaration. What
changed is the _value_ side. A deck holds `params: Record<DeckParamId, number>` and its own lanes;
each rack entry holds exactly the parameters its plugin declares and exactly the lanes those
declarations opted into. `paramReachable(rack, instance, param)` is the single statement of the
rule — the deck owns it and no instance was named, or the named instance is held and its plugin
declares it — and an unreachable pair is a refusal that changes nothing, the answer a stale rack
macro already got ([0023](0023-performable-effect-racks.md)).

**Bypass is a flag on the instance.** The parallel `bypassed: EffectId[]` is gone, and with it the
"canonical rack order" rule the validator needed to keep one rack state to one JSON. Order is the
list; bypass is a boolean on the entry; there is exactly one representation of both.

**An instance's values and lanes go with it when it is removed.** 0024 retained a removed effect's
lane so re-adding restored its automation. That rule existed because the lane belonged to the
_deck_, keyed by a parameter no other effect could claim. It cannot survive instance identity:
"the lane of the delay you removed" is not a question with an answer once the rack can hold two
delays and the one that left is gone. Removing an instance removes its values and its lanes, and
a freshly added instance starts at its plugin's declared defaults. `effect.add` therefore takes no
stored values from the deck: there is nothing on the deck for a second delay to inherit from the
first.

**Applying a clip no longer empties the rack.** 0027 cleared every effect before restoring a
preset because `effect.add` refused an effect the rack already held, so a shared effect had to be
removed to be re-added in the preset's order. With instance ids that reason is gone:
`clipRestorationCommands` removes only the instances the preset does not carry, adds only the ones
the deck does not already hold, and places every preset entry by index. An instance the clip names
by the same id keeps its nodes and its bindings and is moved rather than rebuilt. Because it is
kept, it arrives carrying its own bypass, so the restoration order now _states_ that flag for every
entry rather than only for the bypassed ones — a rack that was emptied first never needed to say
"not bypassed", and a rack with survivors does.

## Alternatives considered

- **Key values by `${effect}#${n}`, an occurrence index** — rejected. An index is a fact about the
  rack at the moment it was written, which is exactly what 0023 refused for rack commands: moving
  the first delay would silently rename the second one's values.
- **Keep values on the deck and let two instances share them** — rejected. It is the shape that
  already exists, and "two delays that always sound the same" is not two delays.
- **A content hash of an instance's values as its identity** — rejected for the reason 0027
  rejected it for clips: any knob nudge would change the identity of the thing being edited.
- **Type an instance's values as `Record<EffectParamId, number>`** — rejected because it is a lie:
  a delay instance holds three of the seven effect parameters. `EffectParamValues` is a `Partial`,
  the stored-shape validator proves it is exactly the plugin's declared set, and `paramIn` is the
  one place a missing key becomes a throw — the same trade `deckIn` makes for an opaque deck id
  under 0029, and honest about what the type system can prove.
- **Retain a removed instance's lane somewhere on the deck** — rejected above. It would need a
  second identity space for instances that no longer exist, and nothing has asked to undo a
  removal by any route other than the undo that already exists.
- **Give `param.set` a required `instance: EffectInstanceId | null`** — rejected. A deck parameter
  names no instance, and making every `param.set` in every fixture carry `"instance": null` is
  ceremony for a field that is absent by construction. The wire guard checks the pair.
- **Name knob and rack controls by instance id** — rejected. An opaque id is unreadable, and a
  screen reader would announce a UUID. The slot's position is what a person sees, so `Filter 1`
  and `Filter 2` are what the controls are called; the commands still carry the id.

## Consequences

Adding an effect still costs one plugin file and one registry entry, and adding a parameter still
costs one declaration — a clip's body is still `SessionDeck`, so clips follow for free. The rack's
parameter routing got simpler rather than harder: `setParam` is now an O(1) map read by instance
id and no longer asks the registry which effect owns the parameter.

Every stored session written before this decision holds a deck-level `params` map with effect
parameters in it and a `bypassed` list beside its rack, so it no longer validates and is discarded
— which [0026](0026-pre-release-has-no-migrations.md) already decided.

A lane recorded on an effect and then removed with it is gone for good, where 0024 kept it. That
is a real loss of a small convenience, taken deliberately in exchange for a rule with one answer.
Undo still restores the instance and its lane together, because a removal is an ordinary durable
edit and the checkpoint holds the whole rack.
