# 0022. Automation is a registry-gated, absolute-seconds lane

- **Date:** 2026-08-14
- **Status:** accepted

## Context

The first automation lane has to persist, migrate, restore, undo, render and edit without adding a
second parameter registry or a UI/audio timing loop. The lane also needs one meaning in the live
and offline hosts even though their sample rates may differ.

## Decision

An automation point is `{ at, value }`, where `at` is a finite, non-negative number of seconds on
the same context timeline used by `Envelope.at`. Seconds remain the durable representation; the
owning Web Audio implementation resolves them onto its context's sample frames. Normalization
sorts points by time, lets the last input at an identical time win, and clamps or quantizes values
with the target's registry spec. Linear interpolation is the initial registry-owned mode. Before
the first point the deck's durable parameter value applies; after the last point its value holds.

`automation.set` replaces one whole lane and targets a generic `ParamId`. An empty point list
clears it. The registry's `automation` field is the only allow-list; `deck.gain` is the one initial
entry. SessionV3 adds a partial parameter-to-lane map to each deck, and the append-only v2 → v3
migration supplies an empty map. History remains in-memory and automatically checkpoints the new
durable projection.

The command executor owns validation and the durable store write. A draw gesture keeps its draft
in refs and sends one replacement command on pointer release, so it creates one history entry and
one trailing autosave rather than one of each per sampled point. Cancellation sends nothing.

The graph binding owns sample-critical scheduling. It cancels the prior schedule at the current
audio time, sets the interpolated value at that instant, then installs future linear ramps directly
on the bound `AudioParam`. The same binding is reached by live, headless, offline and WAV export.
Restoration builds sources, base parameters and effects before scheduling lanes. RAF remains a
drawing/read mechanism and never applies automation.

## Alternatives considered

- **Normalized 0–1 point positions** — rejected because they create a second time domain and make
  an envelope and an automation point with the same `at` mean different things.
- **Per-point commands** — rejected because one pointer gesture would become many history entries
  and autosaves, while partial failure could expose half a lane.
- **Applying values from RAF** — rejected because display cadence and main-thread stalls are not
  audio timing.
- **A `deck.gain` command or binding branch** — rejected because the next automated parameter
  would require another union member and another dispatch path.

## Consequences

Automation authored for elapsed times is immediately normalized to its held/interpolated value;
future points continue sample-accurately. Reloading establishes a fresh context timeline and
replays the persisted lane from its beginning. Adding another lane is a registry declaration plus
its already-required graph binding, not a command, session or UI schema change.
