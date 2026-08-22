# 0091 — A loop move keeps the playhead that survives it

`setLoop` on a playing deck used to be a restart, always: the source was torn down and started
again at the new loop's `in`. A handle drag sends one `deck.loop` per pointer move, so dragging OUT
while the deck played threw the playhead back to the top of the loop sixty times a second and the
gesture was unusable.

The playhead decides instead. When it still falls inside the new loop it survives: the live
source's `loopStart` and `loopEnd` move under it and the plan is re-anchored where it had reached,
with `postPlan(true)` — the same manoeuvre a rate change already makes
([0031](0031-rate-is-in-the-plan.md)). When it does not — the OUT handle dragged back past where
the deck is reading, or the loop cleared — it is the restart it always was.

The cycle count stays honest by counting from the position that survived rather than by restarting
for it. `cycleBase` takes the cycles already crossed against the old plan, and the new plan carries
the rest as its `phase`, so no boundary is numbered twice and none is skipped.

Only the ordinary pass moves this way, and `playing` being non-null is the test for one: a jumping
pass ([0089](0089-a-jump-is-the-transports.md)) has already built its steps against the old grid,
and those windows mean nothing against a new one, so it is torn down and drawn again.

What this constrains: a seek is still always a restart, because the whole gesture is to read
somewhere else, and any later transport work — a shared jump clock, a follower — has to decide the
same question for itself rather than inheriting "a loop change is a restart".

**Extended, P87.** Switching the jumps module on or off is that same question answered the same
way. It restarts the deck — only `player.begin` can lay a jumping pass down, and only a restart can
give one back — but a restart is not a seek, so `setPlayer` reads the position first, off the pass
that is still up, and hands it to the replacement source. Bypassing a module used to throw the read
head to `loop.in` mid-performance, which is the defect a bypass shares with the drag above: a
control that says nothing about _where_ had moved where. Switching _on_ still begins at the top of
the pattern, because the walk draws its first step from the seed and nothing durable carries a
cursor; letting it begin at the slot a position lands in is its own decision (docs/plan.md §4).
