/**
 * @role The one place a worklet module is loaded — `?url` plus `addModule`, settled here before
 *   there are two of them so the resolution question is answered once.
 * @instead A processor's own code → src/audio/worklets/. This file only gets them onto a context.
 */
import loopReporterUrl from "./worklets/loop-reporter.js?url";

/**
 * The registered name, as the main thread spells it. It is genuinely written twice — a worklet
 * runs in its own global scope and can import nothing, so `registerProcessor` in
 * ./worklets/loop-reporter.js carries the other copy, and a mismatch is a runtime error at node
 * construction with no compile-time warning. What this export buys is that the main thread's
 * copy is written once and the pair is greppable: each side names the other in a comment.
 */
export const LOOP_REPORTER = "loop-reporter";

/**
 * Every worklet this app has. `?url` resolves to the dev server's path in dev and to the emitted
 * asset's hashed path in a build, which is exactly the difference ./scripts/drive exists to
 * check: it loads the preview build by default and `--dev` the other one, and the same command
 * file has to produce the same events under both.
 */
const MODULES = [loopReporterUrl];

/** Resolves when every processor is registered. Nothing may construct a node before it does. */
export async function loadWorklets(ctx: BaseAudioContext): Promise<void> {
  await Promise.all(MODULES.map((url) => ctx.audioWorklet.addModule(url)));
}
