# 0299 — The picture is tuned live, and the agent keeps the number

- **Date:** 2026-09-03
- **Status:** accepted

**Every cheap number in the drift is a `tunable`, declared where it was argued.** A constant a
painting reads — a reach, a ceiling, a rate, a pitch — is `tunable(id, rest, range)`
(src/lib/moireTuning.ts) in the file whose prose explains it, and is read as `.value` on the paint
path: a property read, no allocation (0070), and a slider moved shows on the next painting. A
number a tile is baked under, a reach a row set is built from, or a kernel the worker runs stays a
const, because a live value there would be stale where it is not read.

**A tuning is never stored.** The panel (src/ui/MoireTuning.tsx) moves the registry and nothing
else: reload and the picture rests where the code says (0145). On localhost it copies what has
moved as a sentence and a JSON line, and that text pasted to an agent is how a tuning becomes a
default — the agent greps the id and rewrites the rest value in its declaration. One loop, no
second place a default lives.

**The panel groups by what a number does, and says so.** The id's first word is the agent's
namespace and not the panel's heading: the groups, the labels and the one line said of each on
hover live in one table in src/lib/copyDriftGroups.ts, and the panel refuses a tunable with no row there
or a row with no tunable, so a number declared is a number explained. Each row also names which
end of its range is the wilder picture, and a push at the head of every group drives its rows there
together — read back off the dials, never held.
