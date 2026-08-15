/**
 * @role What a clip holds, at a glance: its source drawn as a small waveform with the clip's
 *   stored loop marked on it. Read-only — it sends nothing and owns nothing durable, and the
 *   source it draws is decoded once per blob id by the instrument's own cache (0032).
 * @instead The deck's full-size, draggable surface → src/ui/Waveform.tsx. The painting both of
 *   them do → src/ui/peakCanvas.ts; a thumbnail is never a second painter.
 */
import { useEffect, useMemo, useState } from "react";

import type { Instrument } from "@/app/facade";
import type { Peaks } from "@/lib/peaks";
import type { SourceRef } from "@/lib/source";
import type { Clip } from "@/state/session";
import { pct, usePeakCanvas } from "@/ui/peakCanvas";

/**
 * A source's identity, for the decode this row is waiting on: a stored source is its blob id —
 * the very key the decode cache uses — and a generated one is its own small description, since it
 * has no bytes and no id.
 */
const identityOf = (source: SourceRef): string =>
  "blobId" in source ? source.blobId : `${source.gen}:${source.secs}:${String(source.hz)}`;

/**
 * The drawn columns and the identity they belong to, held together: decoding is async and a rack
 * can be long, so a decode that lands after this row is drawing something else is discarded
 * rather than painted onto the wrong clip (docs/plan.md §2).
 */
type Drawn = { identity: string; peaks: Peaks; duration: number };

/** The clip's stored loop over its drawn source: the region, and an edge at each end. */
function LoopMarks({ loop, duration }: { loop: { in: number; out: number }; duration: number }) {
  const style = useMemo(
    () => ({
      region: { left: pct(loop.in, duration), width: pct(loop.out - loop.in, duration) },
      markIn: { left: pct(loop.in, duration) },
      markOut: { left: pct(loop.out, duration) },
    }),
    [loop.in, loop.out, duration],
  );
  return (
    <>
      <div className="absolute inset-y-0 bg-primary/15" style={style.region} />
      <div className="absolute inset-y-0 w-px bg-primary" style={style.markIn} />
      <div className="absolute inset-y-0 w-px bg-primary" style={style.markOut} />
    </>
  );
}

export function ClipThumbnail({ instrument, clip }: { instrument: Instrument; clip: Clip }) {
  const source = clip.deck.source;
  const identity = source === null ? null : identityOf(source);
  const [drawn, setDrawn] = useState<Drawn | null>(null);

  useEffect(() => {
    let live = true;
    const decode = async (ref: SourceRef, key: string): Promise<void> => {
      const shape = await instrument.sourcePeaks(ref);
      // A source that could not be read has already said so on the log; this row stays blank.
      if (!live || shape === null) return;
      setDrawn({ identity: key, peaks: shape.peaks, duration: shape.duration });
    };
    // Already holding this source's columns — a rename or a reorder is not a reason to decode.
    if (source !== null && identity !== null && drawn?.identity !== identity) {
      void decode(source, identity);
    }
    return () => {
      live = false;
    };
  }, [instrument, source, identity, drawn]);

  // Identity is checked at the paint too, not only at the decode: what this row draws is its own
  // clip's source or it is nothing at all.
  const shown = drawn !== null && drawn.identity === identity ? drawn : null;
  const { rootRef, canvasRef } = usePeakCanvas(shown === null ? null : shown.peaks);
  const loop = clip.deck.loop;

  return (
    <div ref={rootRef} className="relative h-8 w-24 shrink-0 border border-border">
      <canvas
        ref={canvasRef}
        className="size-full text-muted-foreground"
        aria-label={`${clip.name} waveform`}
      />
      {shown !== null && loop !== null && <LoopMarks loop={loop} duration={shown.duration} />}
    </div>
  );
}
