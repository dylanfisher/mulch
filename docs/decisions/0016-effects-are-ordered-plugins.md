# 0016. Effects are ordered plugins

- **Date:** 2026-08-14
- **Status:** accepted

An effect is one registry plugin owning its identity, label, parameter declarations, graph construction, parameter bindings, and disposal; each deck holds an ordered, unique `EffectId[]` and values for every registered parameter — `src/audio/params.ts` composes those declarations and stays the sole lookup surface, so adding an effect is one plugin file plus one registry entry and reopens no shared code.
