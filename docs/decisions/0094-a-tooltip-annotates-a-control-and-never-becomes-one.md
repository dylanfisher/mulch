# 0094 — A tooltip annotates a control and never becomes one

Every parameter's caption and every icon button says what it does through one
[`Says`](../../src/ui/Says.tsx), which hands the control itself to the tooltip's trigger rather
than wrapping it. Three consequences, each of which the instrument already had an opinion about.

**It is not the control.** `TooltipTrigger` declares no `data-slot` of its own: `data-slot` is how
this codebase says which primitive an element is, and a slot declared on the trigger takes the
place of the Button's or the Switch's. Base UI's own `data-base-ui-tooltip-trigger` is what says a
tooltip is attached.

**It is not in the way.** The whole popup is inert, and it is the _positioner_ that has to carry
`pointer-events-none`: Base UI leaves the positioner clickable while the tooltip is open, so a
popup standing over a knob or a rack handle would swallow the press meant for the control under it
— and a popup the driver has to wait an animation out of costs a scenario ~450ms after the reload
([0056](0056-an-effect-carries-its-own-icon.md), [plan §3](../plan.md)).

**It waits.** `TOOLTIP_DELAY_MS` is 250, declared in [`src/ui/App.tsx`](../../src/ui/App.tsx)
beside the toast's own timeout, because that is where the one provider is mounted and
`src/ui/components` is regenerated ([0003](0003-lint-generated-components.md)). A hand crossing a
rack passes over a dozen controls on its way to the one it wants, and at no delay each of them
flashes a popup in turn: `scripts/smoke.d/tooltip.js` crosses the rack and presses a handle from
where the pointer already rests, and at zero delay it counts twelve popups where there must be
none. A quarter of a second is not free of that — it is bought down, not bought off — and the
declaration's own paragraph in `src/ui/App.tsx` says what buys it. What that spends here is the
smoke's own headroom: each of that scenario's three
zero-popup assertions is made with the pointer resting on a trigger across one round trip, and the
stall that would open a popup under it is now 250ms rather than 900. A move there costs ~8ms, so
the margin holds — but it is 50ms clear of the 200ms long task `scripts/smoke.d/longTasks.js`
tolerates where it used to be 700ms clear. If that scenario ever counts a popup it did not cross,
that is the mechanism, and the fix is a pointer parked off the rack before the crossing, not a
longer delay.

The words live in [`src/lib/copy.ts`](../../src/lib/copy.ts), keyed by the lists the controls
already come from — the parameter registry, the icon vocabulary, the player's characters — so a
control with nothing written for it is a hole one test finds, and no surface writes a second
explanation of an action its icon already names
([0055](0055-a-state-is-a-toggle-and-an-action-has-one-icon.md)). A trigger is focusable: the
sentence a resting pointer reaches is one a keyboard reaches too, which is why a knob's caption
and the drift's estimate are buttons rather than a div and a span.
