# 0030. Parameter identity is (instance, param), and a rack holds instances

- **Date:** 2026-08-15
- **Status:** accepted
- **Supersedes:** the "one ordered unique `EffectId[]`" half of [0016](0016-effects-are-ordered-plugins.md), and 0024's retention of a removed effect's lane

An effect in a rack is identified by an opaque, caller-supplied instance id (not its effect type), each rack entry owns its own `{ id, effect, bypassed, params, automation }`, and a value is looked up by (instance, param) so a deck can hold two instances of the same effect with independent values that are removed with the instance.
