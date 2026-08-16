# 0044. The map holds the tier table; scripts/arch reads it rather than repeating it

- **Date:** 2026-08-15
- **Status:** accepted

`scripts/arch` parses the Tiers table out of [docs/map.md](../map.md) at run time, so the rows a
person reads are the rule that runs. It previously held its own copy under a comment asking the
next person to change both in the same commit — principle 1 broken by the one script whose job is
enforcing it, and a divergence with no error message. Every parse fails loudly: a table that has
been reworded rather than edited stops the gate instead of quietly checking nothing.
