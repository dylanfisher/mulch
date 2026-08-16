/**
 * @role The entry point: the one place the instrument, its host and its React tree are
 *   constructed and joined, and the only file that belongs to no tier.
 */
// The composition root: every dependency here is one piece of the instrument being wired
// together once. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { createAnalyzer, workerAnalysisPort } from "@/app/analysis";
import { contextClock } from "@/app/clock";
import { createAudioEngine } from "@/app/engine";
import { createInstrument } from "@/app/facade";
import { type Driven, renderOffline } from "@/app/render";
import { createLiveContext } from "@/audio/context";
import { loadWorklets } from "@/audio/worklet";
import { createIndexedDbRepository } from "@/state/repository";
import { App } from "@/ui/App";

import "./index.css";
// oxlint-enable import/max-dependencies

declare global {
  interface Window {
    /** Set by ./scripts/drive via addInitScript, before any module here runs. */
    __MULCH_DRIVE__?: boolean;
    mulch?: Driven;
  }
}

function requireRoot(): HTMLElement {
  const found = document.getElementById("root");
  if (!found) throw new Error("#root is missing from index.html");
  return found;
}

const root = requireRoot();

/**
 * Worklet modules are fetched before the instrument exists, so nothing can construct a node for
 * a processor that is not registered yet. It costs one request before first paint and removes a
 * whole class of race: by the time `window.mulch` is attached, the transport is fully wired, so
 * ./scripts/drive waiting for that attach is also waiting for the audio thread to be ready.
 */
async function boot(): Promise<void> {
  const ctx = createLiveContext();
  await loadWorklets(ctx);

  const instrument = createInstrument(
    contextClock(ctx),
    (store, emit) =>
      // The live host's clock starts on a gesture, and deck.play is that gesture (0011).
      createAudioEngine(
        ctx,
        store,
        emit,
        () => ctx.resume(),
        // The live host is the only one with a worker: an offline render measures nothing.
        createAnalyzer(workerAnalysisPort(), store, emit),
      ),
    createIndexedDbRepository(),
  );
  // Restoration uses the same graph behavior as commands. Nothing renders or becomes drivable
  // until every stored source has decoded and the durable state has been replayed in order.
  await instrument.ready;

  // Scheduled envelopes come due against the audio clock, not against React: one interval pumps
  // the queue. 10ms is well inside the transport's own lookahead, which is what makes fine
  // timing — this loop only decides when a command is handed over, never when a sound starts.
  setInterval(() => {
    instrument.pump();
  }, 10);

  createRoot(root).render(
    <StrictMode>
      <App instrument={instrument} />
    </StrictMode>,
  );

  // Runtime-gated, not compile-time (plan §3): drive loads the preview build, where DEV-only
  // code is stripped, so the hook must be inert in production rather than absent from it.
  // Nothing in production sets the flag; scripts/smoke asserts a flag-less page has no mulch.
  // `render` rides along rather than living on the facade: an offline render is a second
  // session on its own context, so it takes no instrument and belongs to none (src/app/render.ts).
  if (import.meta.env.DEV || window.__MULCH_DRIVE__ === true) {
    window.mulch = { ...instrument, render: renderOffline };
  }
}

// Loud rather than blank: a worklet that fails to load leaves the page with no instrument, and
// the console is the only place left to say so. A promise chain rather than a top-level await
// precisely because of this handler — a rejected TLA is an unhandled rejection and a white page.
// oxlint-disable-next-line unicorn/prefer-top-level-await
boot().catch((error: unknown) => {
  root.textContent = `mulch failed to start: ${String(error)}`;
  throw error;
});
