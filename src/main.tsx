import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { contextClock } from "@/app/clock";
import { createAudioEngine } from "@/app/engine";
import { createInstrument, type Instrument } from "@/app/facade";
import { createLiveContext } from "@/audio/context";
import { loadWorklets } from "@/audio/worklet";
import { App } from "@/ui/App";

import "./index.css";

declare global {
  interface Window {
    /** Set by ./scripts/drive via addInitScript, before any module here runs. */
    __MULCH_DRIVE__?: boolean;
    mulch?: Instrument;
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

  const instrument = createInstrument(contextClock(ctx), (store, emit) =>
    createAudioEngine(ctx, store, emit),
  );

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
  if (import.meta.env.DEV || window.__MULCH_DRIVE__ === true) window.mulch = instrument;
}

// Loud rather than blank: a worklet that fails to load leaves the page with no instrument, and
// the console is the only place left to say so. A promise chain rather than a top-level await
// precisely because of this handler — a rejected TLA is an unhandled rejection and a white page.
// oxlint-disable-next-line unicorn/prefer-top-level-await
boot().catch((error: unknown) => {
  root.textContent = `mulch failed to start: ${String(error)}`;
  throw error;
});
