/**
 * @role One pass of the ordinary transport: a source over the whole loop from wherever a pause
 *   left the playhead, started at an instant, and the plan both readers count against — cycle
 *   counts on the audio thread (worklets/loop-reporter.js) and the remainder as the playhead
 *   (src/lib/timeline.ts). Built here for a play and for a rest's release alike (0038, 0372).
 * @instead The transport that starts, halts and rests these passes → src/audio/deck.ts. A
 *   pattern's own passes, one source per step → src/audio/player.ts.
 */
import { insideLoop, type Loop, type PlayPlan } from "@/lib/timeline";
import type { DeckChain } from "./chain";

/** The source a pass plays, and whether its end was asked for — `onended` fires either way. */
export type Laid = { source: AudioBufferSourceNode; cancelled: boolean };

export type Pass = { plan: PlayPlan; current: Laid };

/**
 * Where a start begins in the buffer, and how far into the current cycle that is. A resume
 * inside the loop begins where it was held and wraps at the same edge; a fresh play, or a held
 * position the loop has since moved away from, begins at the top of the cycle (0038).
 */
export function startOffset(
  loop: Loop | null,
  resumeAt: number | undefined,
): { offset: number; phase: number } {
  if (loop === null) return { offset: resumeAt ?? 0, phase: 0 };
  const offset = resumeAt !== undefined && insideLoop(resumeAt, loop) ? resumeAt : loop.in;
  return { offset, phase: offset - loop.in };
}

/**
 * The pass, built and started: `onEnded` hears the source end on its own — never a stop the
 * transport asked for, which flags the pass cancelled first.
 */
export function ordinaryPass(
  ctx: BaseAudioContext,
  chain: DeckChain,
  loop: Loop | null,
  held: AudioBuffer,
  resumeAt: number | undefined,
  at: number,
  onEnded: () => void,
): Pass {
  const source = ctx.createBufferSource();
  source.buffer = held;
  source.connect(chain.input);
  // Speed and pitch bind to AudioParams on this node, so the chain writes them onto it (0031).
  chain.bindSource(source);

  const { offset, phase } = startOffset(loop, resumeAt);
  if (loop !== null) {
    source.loop = true;
    source.loopStart = loop.in;
    source.loopEnd = loop.out;
  }

  const current: Laid = { source, cancelled: false };
  source.addEventListener(
    "ended",
    () => {
      if (!current.cancelled) onEnded();
    },
    { once: true },
  );

  source.start(at, offset);
  // One plan, two readers, both from src/lib/timeline.ts: cycle counts on the audio thread
  // (loop-reporter.js) and the remainder as peek()'s position. A play anchors it with nothing
  // behind it — a rate rebase (0031) and a resume mid-loop (0038) give `phase` a value.
  const plan: PlayPlan = {
    startTime: at,
    offset: loop === null ? offset : loop.in,
    period: loop === null ? 0 : loop.out - loop.in,
    rate: chain.rate(),
    phase,
  };
  return { plan, current };
}
