/**
 * @role What a deck plays, as data — the payload of `deck.load` and the same shape the session
 *   records. It lives in lib because both the command (src/app) and the store (src/state) need
 *   it, and neither may import the other.
 */
import type { GenKind } from "./waveform";

/**
 * Real audio already in the blob store — put there by `ingest(file)`, the one sanctioned
 * pre-command step (docs/plan.md §1) — or a synthetic source, which needs no ingest at all
 * and is why an agent's repro stays a self-contained one-liner.
 */
export type SourceRef = { blobId: string } | { gen: GenKind; secs: number; hz?: number };

/** The synthetic half, for the code paths that have already ruled a blob out. */
export type GenSource = Extract<SourceRef, { gen: unknown }>;
