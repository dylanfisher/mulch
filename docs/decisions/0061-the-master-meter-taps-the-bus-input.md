# 0061 — The master meter taps the bus input

`createMasterBus` owns a stereo peak tap on its input node, before the limiter and the soft clip,
and the header's meter is the one reader. Post-clip it would be measuring `SOFT_CLIP_CEILING`:
nothing downstream of the ceiling can read above 0.98, so a clip indicator there could never say
the output was too hot, which is the only thing a clip indicator exists to say.

It is a second meter, not a sum of the per-deck ones. `DeckChain.level()` is one deck's mono
post-fader level; this is what the bus carries, limiter and all the decks included. Adding deck
meters together would be a third derivation of a fact the bus already holds.

The tap is a dead end, like the deck's: the signal a fingerprint measures never passes through
an analyser, so the offline render and the live path stay one chain.
