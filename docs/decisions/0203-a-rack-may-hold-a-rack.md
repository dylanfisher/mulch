# 0203 — A rack may hold a rack, and the ones inside it are drawn rather than stored

- **Date:** 2026-08-29
- **Status:** accepted, extending [0030](0030-effects-are-instances.md)

The automator is an ordinary registry entry whose `build` owns a `createEffectRack` of its own, so
the effects it grows are ordinary plugin instances in a real chain — nothing about a delay changes
because an automator is holding it. Bypass, duplicate, remove and reorder come free, it sits where
a hand put it in the signal order, and a yard may hold two of them.

**`scripts/arch` names one more caller of `createEffectRack`.** That rule exists to stop a _second_
chain growing beside the live one — an export-only graph that would fingerprint differently. A
nested rack is not that: it is the same chain one level in, built on the same `ctx`, wired between
one instance's `input` and `output`, and disposed by the instance holding it. The waiver is one
named file rather than a relaxation of the rule.

**What it grows is never stored.** Only the automator's own declared parameters are durable; its
population is re-derived from its seed, exactly the trade `deck.player` makes ([0089](0089-a-jump-is-the-transports.md)). That is what keeps automatic
evolution out of undo history — a rack turning over once a bar would otherwise write a durable
edit every time — and what lets an offline render of the same session produce the same rack. An
instance id is folded from the automator's own id, the place and the tick rather than minted, so a
reload rebuilds the same run under the same names ([0076](0076-a-card-reads-itself-out-of-its-own-id.md)).

**Two imports had to be demoted to pay for it, and both were the same bug.** `src/audio/params.ts`
reads the registry at module scope, so anything the registry reaches that reads `params.ts` — or
the registry itself — closes a loop that resolves in the temporal dead zone and throws at import,
app-wide. So `effects/rack.ts` now takes the `Effect` it is adding rather than the id it would have
had to look up, and holds each instance's `rebuild` parameters off the plugin rather than out of
the composed lookup. Both are things the caller already had. The automator is built by a factory
the registry calls with its own pool for the same reason: it must never import the list it is a
member of. `automator.test.ts` imports the plugin first, which is the regression test.
