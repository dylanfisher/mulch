# 0127 — An export is a folder, and the folder is one archive

- **Date:** 2026-08-22
- **Status:** accepted

An export leaves as a directory holding the audio and the session that made it, both named after
what they came from. Nothing about a render spec moves
([0068](0068-an-export-is-a-render-spec.md)): `exportAudio` still hands the one harness the
session's own restoration commands, and what changed is what the door writes and what it calls it.

**The folder is a stored zip, because the browser's download door does not take a path.** Chromium
turns every separator in an `<a download>` into an underscore — measured, `"Take One/audio.wav"`
arrives as `Take One_audio.wav` — which is the rule that keeps a page from writing outside the
downloads directory, and Firefox does the same. The two ways to hand someone a real directory are
the File System Access API and an archive. The picker was not taken: it needs transient activation,
and an export is a render the person waits seconds through, so the folder would have to be chosen
before the audio existed; it is Chromium-only, and no scenario in the gate can drive it. So
`src/lib/zip.ts` writes the one container every desktop already expands into the directory it was
named after — stored, never deflated, because a wav and a session archive of imported bytes
compress to nothing and the browser has no synchronous deflate to spend a pass with.

**One naming function, and one name with three endings.** `exportNames` in `src/app/exportAudio.ts`
turns the typed name into the folder and both filenames, so the audio, the archive and the
directory can never disagree. A name a filesystem will not take is cleaned rather than refused —
what is typed into a field is a description, not a path — and what cleans away to nothing falls
back to the default rather than saving a folder called `.wav`. The words are in `src/lib/copy.ts`
with the rest of what the interface says.

**An imported file's name rides on the blob id.** An export is named after what it came from, and
the only thing a person recognises a yard's audio by is the file they dropped on it — but nothing
durable carried that name. It goes on the id the bytes are already stored under
(`importedBlobId` / `importedFileName`, `src/lib/source.ts`), minted at the one ingest that takes a
`File`, because a blob id is opaque durable text that already travels with the bytes through the
session, the archive and a clip. The alternative was a field on `SourceRef`, which every one of
those shapes and their validator would have grown for a string only a filename reads.
[0026](0026-pre-release-has-no-migrations.md) makes the shape free to change; it does not make a
new durable field free to carry. Ids from before this — and the ones a crop or a flatten mints,
which are named by the command that minted them ([0047](0047-a-crop-mints-audio-the-user-did-not-import.md)) —
say nothing about a file, and an export named from one is the yard's name alone.

**The checkbox clears to a bare .wav.** A folder of one file is an archive between a person and
their audio, so clearing the box downloads the wav the way it always did. Checked is the default,
because a take nobody can reopen the performance of has left the instrument for good.
