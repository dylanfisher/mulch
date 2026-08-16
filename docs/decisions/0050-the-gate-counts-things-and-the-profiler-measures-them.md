# 0050. The gate counts things, the profiler measures them

- **Date:** 2026-08-16
- **Status:** accepted

A leak assertion in `./scripts/check` may only compare discrete counts: live objects of a
prototype, DOM nodes, listeners, documents. Anything continuous — heap bytes, CPU milliseconds,
frame times, load ratios — is printed by `./scripts/profile` and asserted on nowhere. A count of
listeners that were added and never removed grows for exactly one reason; a heap-size threshold
moves with the collector's mood, the machine and whatever else was running, so it eventually fails
for no reason, and a step that fails for no reason gets blessed or deleted — taking the honest
coverage next to it with it ([0012](0012-no-one-feature-jumps-the-gate.md)).

Two consequences worth stating, because both have already been paid for once. A count of live
audio nodes must be polled rather than read once: Blink releases a node's wrapper a render quantum
or two after the JS side drops it, so a churn that ends and collects immediately shows every node
it ever made. And a diagnostic that reuses `dist/` must check the build is not stale before it
believes a number, the way `./scripts/drive` already does — a leaky build left in `dist/` reported
a healthy rack as leaking one node per cycle, three times, convincingly.
