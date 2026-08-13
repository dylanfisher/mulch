import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { realTimeClock } from "@/app/clock";
import { createInstrument, type Instrument } from "@/app/facade";
import { App } from "@/ui/App";

import "./index.css";

declare global {
  interface Window {
    /** Set by ./scripts/drive via addInitScript, before any module here runs. */
    __MULCH_DRIVE__?: boolean;
    mulch?: Instrument;
  }
}

const instrument = createInstrument(realTimeClock());

// Scheduled envelopes come due against the clock, not against React: one interval pumps
// the queue. 10ms is far below any `at` resolution that matters before audio exists;
// M2's schedule-ahead transport is what makes fine timing, not this loop.
setInterval(() => {
  instrument.pump();
}, 10);

// Runtime-gated, not compile-time (plan §3): drive loads the preview build, where DEV-only
// code is stripped, so the hook must be inert in production rather than absent from it.
// Nothing in production sets the flag; scripts/smoke asserts a flag-less page has no mulch.
if (import.meta.env.DEV || window.__MULCH_DRIVE__ === true) window.mulch = instrument;

const root = document.getElementById("root");
if (!root) throw new Error("#root is missing from index.html");

createRoot(root).render(
  <StrictMode>
    <App instrument={instrument} />
  </StrictMode>,
);
