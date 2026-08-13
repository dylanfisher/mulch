/**
 * @role The one place a worklet module is loaded — `?url` plus `addModule`, settled here before
 *   there are two of them so the resolution question is answered once.
 * @instead A processor's own code → src/audio/worklets/. This file only gets them onto a context.
 */
import loopReporterUrl from "./worklets/loop-reporter.js?url";

/**
 * The registered name, exported so the caller of `new AudioWorkletNode(ctx, …)` and the
 * `registerProcessor(…)` call cannot drift apart — the string is written once on each side and
 * a mismatch is a runtime error with no compile-time warning.
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
