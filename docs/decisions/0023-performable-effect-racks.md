# 0023. Bypass is durable rack state, and the rack is rewired before it is recorded

- **Date:** 2026-08-14
- **Status:** accepted

Bypass is a second ordered, unique `EffectId[]` (`bypassed`) on the deck, filtered from `effects` and never a rack index, whose entries keep their nodes and lose only their edges, and every rack mutation (bypass, remove, reorder) rewires the graph before the durable state and event are written.
