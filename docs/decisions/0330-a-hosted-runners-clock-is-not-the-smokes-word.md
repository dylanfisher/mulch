# 0330 — A hosted runner's clock is not the smoke's word

**2026-09-09.** A Playwright wait that expires in the browser half is red on a developer's machine
and reported-but-survived on a hosted runner. `isHostedTimeout` (`scripts/smoke.d/harness.js`) is
the whole of it: `process.env.CI` and an error whose `name` is `TimeoutError`.

**Because `WAIT_MS` is a number picked against one machine.** Every wait in the browser half is
sub-second in a passing run, so 15s is enormous — locally. A GitHub runner is two shared cores under
three Chromiums at once (0238) plus a Vite preview each, and what runs out there is the runner's
load. A lane that times out there has told us nothing about the instrument, and a gate that goes red
for it teaches the reader to ignore red.

**Only `TimeoutError`.** A `SmokeFailure` is an assertion that read the page and disagreed with what
it found; no amount of load produces one. Those stay red on every machine, and so does anything else
a lane throws.

**The lane stops where it stopped, and says so.** `runLane` returns `cutShort` instead of `error`,
counting the scenarios that did run. The page and ring print exactly as a failure's do (0036), and
the summary of the green run carries a `⚠` line naming the lane and how many of its scenarios went
unasserted. A green CI that is missing coverage must read as one — the alternative is a lane that
quietly stops asserting and nobody notices for a month.

**The cost, stated plainly:** a real hang — a scenario that would never complete again — is green on
CI, and only `./scripts/check` locally catches it. That is the trade. The `⚠` line is what makes it
survivable; a lane that prints it on every run is a lane to fix, not to keep excusing.

**Not chosen:** raising `WAIT_MS` under CI. It would buy a slower runner more rope without changing
what happens when the rope runs out, and it makes the local and hosted gates disagree about how long
"too long" is — one number, one meaning (principle 1).
