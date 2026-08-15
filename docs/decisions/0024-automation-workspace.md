# 0024. Automation targets follow the rack, and every edit is one whole lane

- **Date:** 2026-08-14
- **Status:** accepted

## Context

[0022](0022-parameter-automation.md) shipped one lane for one parameter: `deck.gain`, drawn as a
freehand stroke, replaced whole on pointer release. It deliberately left three questions open. The
first is what a _target_ is once more than one parameter can be automated — a list somebody
maintains, or something derived. The second is what happens when the parameter belongs to an effect
that can leave the rack, which [0023](0023-performable-effect-racks.md) explicitly handed to this
step. The third is how a performer creates a lane at all: a freehand stroke is a demonstration, not
an editor, and a lane nobody can nudge a point of is a lane nobody edits twice.

There is also a performance gesture to place: hold Option, move a knob, and the movement becomes
automation that plays back immediately. That gesture has to land on the same one-command-per-gesture
model as the lane editor, or the instrument grows a second way to write a lane.

## Decision

**A target is derived, never listed.** `automationTargets(effects)` in `src/audio/params.ts` walks
`AUTOMATION_PARAM_IDS` — itself the registry filtered by the `automation` field — and keeps a
parameter when it is a deck parameter or when the effect that declares it is in that deck's rack
right now. `filter.cutoff` becomes automatable by adding `automation: "linear"` to its declaration
in `src/audio/effects/filter.ts` and binding the `AudioParam` behind it; nothing in the command
union, the session, the executor or the editor names either parameter. The picker, the lane editor,
the Option highlight and the restore stage all read that one derived list, so opting the next
parameter in stays a one-line registry change.

**A parameter's automation binding is the plugin's, like its value binding.** `EffectInstance`
gains an optional `automationTarget(param): AudioParam`, which a plugin implements exactly for the
parameters it declares automatable; the rack resolves the owner through `effectForParam` and throws
when a declared-automatable parameter has no bound target. `buildDeckChain` routes `setAutomation`
the way it already routes `setParam` — deck parameters to their own `AudioParam`, everything else
to the rack — so one `scheduleAutomation` call serves live, headless, offline and exported audio.

**Effect removal retains the effect's lanes.** 0023 already keeps a removed effect's parameter
_values_ on the deck, because they are registry-keyed on the deck rather than on the instance; a
lane is the same fact over time, and splitting the two would mean a performer who removed a filter
to hear the dry signal lost the cutoff sweep but kept the cutoff. A retained lane is durable, is
simply not scheduled while its effect is absent, and is scheduled again by `effect.add` — so
removing and re-adding an effect restores its automation exactly, and undo of a removal needs no
special case. Schedulability is decided from the rack, not from the graph, and it is one exported
predicate: `paramReachable(effects, param)` in `src/audio/params.ts`. `automationTargets` filters
with it, the executor asks it before scheduling, and `prepareRestore` asks it before scheduling a
restored lane — so what the picker offers and what the graph schedules cannot drift. A lane whose
owning effect is not in `effects` never reaches the engine, live or during restore, so nothing has
to silently swallow it downstream.

**Automating a bypassed effect's parameter is intended.** A bypassed effect keeps its nodes and
loses only its edges (0023), so its lane keeps running against a live `AudioParam` and is simply
inaudible until the effect is unbypassed — at which point it returns already where the lane says it
should be, exactly as it returns at the knob value a performer set while it was out. Bypass is a
signal-path fact, not a scheduling one, and no executor branches on it.

**Every edit is one whole-lane `automation.set`.** Creating a point, moving one, deleting one, and
clearing the lane are the same command with different points; there is no per-point command and no
component state holding lane data. A pointer gesture drafts in refs and commits once on release, so
each is one history entry, one event, one autosave, and one undo press. A delete is a `contextmenu`
on the point's handle, which never opens a drag and therefore never commits twice. A cancelled
gesture sends nothing.

**Option-hold recording commits that same one command.** While Option is held, every automatable
knob is highlighted; moving one records `{ at: probe().at, value }` into a ref for each value the
knob commits, and releasing the pointer sends one `automation.set`. Because the gesture should keep
playing rather than happen once, the repeat is **materialised into the lane**: the recorded points
are tiled forward by their own span to fill the deck's loop window, or its duration when it is not
looping, by `repeatedLane` in `src/lib/automation.ts`. The lane a performer then sees, edits, saves,
exports and undoes is exactly the lane the graph schedules — which is the only version of "plays
back on a loop" that renders identically through live, offline and exported audio. Moving that same
knob without Option clears its lane: one `history.group` of the clearing `automation.set` and the
ordinary `param.set`, so the clear and the value that replaced it undo together.

**The durable format does not change.** `automation` is already a partial map from `ParamId` to a
normalized lane, and 0022 stated that another lane is a registry declaration rather than a session
change. Nothing gains, loses or reshapes a field, so there is no v5 and no migration; every shipped
stage stays untouched, and a stored session containing a `filter.cutoff` lane validates through the
same registry-driven check that already validated `deck.gain`.

## Alternatives considered

- **A curated list of automatable targets** — rejected because it is the second registry 0022 was
  written to avoid, and it would drift the moment a plugin declared a parameter and forgot the list.
- **Per-point commands** — rejected for the reason 0022 rejected them: one gesture would become
  many history entries and autosaves, and a partial failure would expose half a lane.
- **Removing an effect's lanes with the effect** — rejected because 0023 keeps its parameter values,
  and a rule that keeps the value but discards its automation is two rules where one will do. It
  would also make removal a lossy edit that only a full-session undo could reverse.
- **Rejecting `automation.set` for an inactive effect's parameter** — rejected because restore,
  archive import and undo all replay lanes against a rack that is rebuilt in stages, and a command
  that is legal only in the middle of a sequence is a trap for a JSONL macro.
- **A transport-relative, repeating lane** — rejected because looping automation against a beat is
  P7's model change, and a repeat the graph performs rather than the lane holds would have to be
  reimplemented in the offline host to make an export sound like the performance.
- **Option as a latched mode** — rejected because a mode can be left on: the highlight has to end
  when the key is released, and a held modifier cannot be forgotten.
- **A per-frame cursor drawn on the lane** — deferred, not implemented: a lane's x-axis is absolute
  context seconds while `peek()` reports a deck's buffer position, and bridging them would mean a
  fourth read channel beside the three [0014](0014-the-read-channel.md) fixed. Gesture drafts stay
  in refs regardless, which is the part that keeps React out of the gesture.
- **Freehand stroke drawing, kept alongside point editing** — rejected because both gestures want
  the same pointer on the same surface, and a stroke that lands fifty points is a lane nobody can
  then move one point of.

## Consequences

Opting the next parameter into automation is one registry field plus the plugin's
`automationTarget`; no command, event, session, restore or UI change follows. `delay.time`,
`delay.feedback`, `delay.mix` and `deck.pan` are deliberately left out until each has been performed
through the generic path, as the roadmap asks.

A retained lane for an absent effect is durable state with no visible surface until that effect
returns, which is the price of a lossless removal. It cannot desynchronise the graph: schedulability
is decided from `effects`, in one place, on every path that schedules.

A recorded gesture's repeat is fixed at record time, so changing the loop afterwards does not
re-tile it — the lane is data, and re-recording or editing its points is how it changes. Long
gestures on long sources produce proportionally more points; the tiling is bounded by
`MAX_LANE_REPEATS`, and the lane remains a normalized, byte-deterministic projection either way.
