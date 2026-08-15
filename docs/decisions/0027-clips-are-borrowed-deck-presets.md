# 0027. Clips are named deck presets that borrow their blobs

- **Date:** 2026-08-14
- **Status:** accepted

## Context

P8 asks for a reusable clip rack: capture a deck that is working, recall it later on either deck.
The obvious way to build that is the wrong one. A clip that owns a buffer, a transport and a
schedule is a second playback engine, and this project already has exactly one — `buildDeckChain`
through `src/audio/deck.ts`, restored in one order by `src/app/restore.ts`. A second one would
have to be kept sounding identical to the first forever, which is the thing
[0011](0011-sound.md) and [0018](0018-offline-export-parity.md) exist to prevent.

Three questions had to be answered before any of it could be written, because each one decides a
data shape that later work cannot cheaply change: what makes a clip _the same clip_, who owns the
audio bytes a clip and a deck both point at, and what a clip that cannot be applied is allowed to
do to the deck it was aimed at.

## Decision

**A clip is data: a name, an id, and one durable deck preset — the same `SessionDeck` the session
already stores.** It carries a source reference, a loop, every parameter, the effect order and its
bypass list, and the automation lanes, including the lanes [0024](0024-automation-workspace.md)
retains for an effect that has left the rack. It carries no buffer, no schedule, no nodes and no
clock. `session.clips` is an ordered list on the one durable `Session`.

**Identity is a caller-supplied opaque id, and a name is only a label.** `clip.capture` names the
id it is creating, the way `session.import` names the archive handle it is committing; the UI
mints one with `crypto.randomUUID()`. Capturing over an id the session already holds is refused
and changes nothing. Two clips may share a name — renaming is a durable edit that touches the
label and nothing else — so nothing downstream can start treating a display string as a key, and
a JSONL file can capture a clip and then apply it by the id it wrote itself.

**No one owns a blob; reachability keeps it.** A clip stores the same `BlobId` a deck stores, and
applying a clip makes the deck reference that same id — bytes are never copied, compared or
re-ingested. `sessionBlobIds(session)` now walks decks _and_ clips, so the one projection that
persistence GC, portable archives and `SessionHistory.blobIds()` all already share picks clips up
everywhere at once. A blob survives while any deck, any clip, or any live undo/redo checkpoint
names it, and is collected on the first save after the last of those lets go. That is the existing
rule, not a new one; the change is only which objects the walk visits.

**Applying a clip is one grouped durable edit, and it fails before it touches anything.** The
executor expands `clip.apply` into ordinary commands and hands them to `history.group`: first the
clear — every effect currently on the deck removed, every automation lane the clip does not carry
cleared — then the existing restoration order, `deck.load` → `param.set` → `effect.add` →
`effect.bypass` → `automation.set` → `deck.loop`, for that one deck. One history entry, one undo.

Before any of that runs, the whole target session is proved restorable: its blobs are read out of
the repository and `engine.prepareRestore` builds and immediately discards a complete replacement
graph. A missing blob fails in the read, a corrupt one fails in `decodeAudioData`, and a loop that
does not fit its decoded source fails in the prepare — all of it before the first command is
executed, so the deck, the graph, the log and the history ledger are untouched. Grouped rollback
still stands behind it; the pre-flight exists so that the ordinary failure is a refusal rather
than a recovery.

**A deck with nothing loaded cannot be captured.** `clip.capture` refuses it with an error event.
That keeps `source: null` out of the clip shape entirely, which in turn means apply always has a
`deck.load` to lead with and never needs an "unload the deck" command that nothing else wants.

## Alternatives considered

- **A clip owns decoded audio, or its own voice** — rejected. It is the second playback engine the
  roadmap forbids, and every fingerprint taken through it would measure a different instrument.
- **Clip identity is its name** — rejected. Renaming would then be a delete plus a capture, undo
  would restore a different clip than the one edited, and two clips called "intro" would be one.
- **Clip identity is a content hash of the preset** — rejected. Capturing the same deck twice
  would silently be one clip, and any parameter nudge would change the clip's identity, so nothing
  could hold a stable reference to "the clip I am editing".
- **A clip owns a private copy of its blob** — rejected. It doubles storage for the common case of
  capturing the deck that is already playing, and it makes an archive of five clips of one sample
  five times the size for no gain.
- **Reference-count blobs** — rejected. A count is a second source of truth for a fact the
  reachability walk already computes exactly, and it is the kind of state that goes wrong silently.
- **Apply through `prepareRestore` + `commit`, like import and undo do** — rejected. It is atomic
  for free, but it bypasses the command log entirely: nothing would be replayable from JSONL and
  the "apply" a person performed would leave no trace of what it actually did to the deck.
- **Skip the pre-flight and rely on the group's rollback** — rejected. Observably it is almost the
  same, because grouped events are buffered and a failed group emits none of them. But "almost"
  is doing real work in that sentence: the graph really is rebuilt and torn back down, and a
  rollback that itself fails leaves the instrument somewhere neither the clip nor the deck asked
  for. The cost of proving it first is one extra decode on a deliberate, occasional gesture.
- **Clip-only capture of "just the effects", or "just the parameters"** — rejected for now. A
  partial preset multiplies the apply matrix by the number of subsets, and nothing has asked for
  it. A clip is a whole deck or it is not a clip.

## Consequences

Adding a parameter or an effect still costs one declaration, and clips follow, because a clip's
body _is_ `SessionDeck`. Stored clips are discarded with everything else when the durable shape
changes, which [0026](0026-pre-release-has-no-migrations.md) already decided.

Applying a clip decodes the clip's own source twice — once in the pre-flight, once in the
`deck.load` — and the group's rollback preparation decodes the whole session as it was on top of
that, so the untouched deck's source is decoded twice as well and the target deck's prior source
once. (Three decodes of the clip's source only when the target deck already had that same blob
loaded.) The rollback cost is not new: every grouped edit has always rebuilt the whole graph. All
of it is real work on a large sample, and it is spent on a deliberate one-shot gesture rather than
anything in the audio path or the frame loop. If a clip rack ever becomes something a performer
fires per bar, that is the number to attack, and the fix is a decode cache keyed by blob id — not
a second engine.

The clip fixtures in `session.test.ts` are hand-written literals, including every parameter, and
are deliberately _not_ produced by `sessionSnapshot`. They will fail the day the registry changes.
That is the point: 0026 exists because fixtures projected from the code under test proved only
that the registry agreed with itself, and a durable shape with no independent witness is a shape
nothing is checking.
