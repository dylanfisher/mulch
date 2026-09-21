/**
 * @role Whether the drift is drawn, as the control that says so: what the switch reports and what
 *   a press on it leaves behind (0397). The control inverts — pressed is the picture *gone*, the
 *   way the yard's mute is — and an inversion nothing reads back is one that can be dropped
 *   without the gate noticing.
 * @instead What the preference does when the store under it will not cooperate →
 *   ./driftShown.test.ts. That the picture is then not mounted → ./MoireStrip.test.tsx.
 */
import type { ReactNode } from "react";
import type * as ReactTypes from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useSyncExternalStore: (subscribe: (on: () => void) => () => void, snapshot: () => unknown) => {
      subscribe(() => {});
      return snapshot();
    },
  };
});

import { findLabelled } from "@/ui/effectRackDouble";

const KEY = "mulch:drift";

/** The store the preference is read from and written to, as the one box a case looks in. */
function store(saved: string | null) {
  const held = { value: saved };
  return {
    held,
    getItem: (key: string) => (key === KEY ? held.value : null),
    setItem: (key: string, value: string) => {
      if (key === KEY) held.value = value;
    },
    removeItem: (key: string) => {
      if (key === KEY) held.value = null;
    },
  };
}

/** The switch as a hand meets it, over a store that says this — the real preference, never a
 *  stand-in for it, because the wiring between the two is the whole of what this file reads. */
async function rendered(saved: string | null) {
  const local = store(saved);
  vi.resetModules();
  vi.stubGlobal("localStorage", local);
  vi.stubGlobal("window", { addEventListener: () => {}, removeEventListener: () => {} });
  const { MOIRE_SWITCH_LABEL } = await import("@/lib/copyDrift");
  const { DriftToggle } = await import("@/ui/DriftToggle");
  const root: ReactNode = DriftToggle({});
  const toggle = findLabelled(root, MOIRE_SWITCH_LABEL);
  if (toggle === null) throw new Error("no drift switch");
  return { local, toggle };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DriftToggle", () => {
  it("is pressed when the picture is gone, and not when it is drawn", async () => {
    expect((await rendered(null)).toggle.pressed).toBe(false);
    expect((await rendered("off")).toggle.pressed).toBe(true);
  });

  it("takes the picture away when it is pressed, and gives it back when it is not", async () => {
    const drawn = await rendered(null);
    drawn.toggle.onPressedChange?.(true);
    expect(drawn.local.held.value).toBe("off");

    const gone = await rendered("off");
    gone.toggle.onPressedChange?.(false);
    expect(gone.local.held.value).toBeNull();
  });
});
