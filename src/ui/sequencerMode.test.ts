/**
 * @role What the sequencer view does when the store under it is not a cooperative one: junk in
 *   it is not a choice, an access that throws is a line on the console and the yards drawn whole
 *   rather than a blank instrument, and a choice is held for the session either way (0379).
 */
import type * as ReactTypes from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useSyncExternalStore: (subscribe: (on: () => void) => () => void, snapshot: () => unknown) => {
      subscribe(() => {});
      return snapshot();
    },
  };
});

const KEY = "mulch:sequencer";

function store(saved: string | null, throws: "read" | "write" | "never" = "never") {
  const held = { value: saved };
  return {
    held,
    getItem: vi.fn((key: string) => {
      if (throws === "read") throw new Error("access denied");
      return key === KEY ? held.value : null;
    }),
    setItem: vi.fn((key: string, value: string) => {
      if (throws === "write") throw new Error("access denied");
      if (key === KEY) held.value = value;
    }),
    removeItem: vi.fn((key: string) => {
      if (throws === "write") throw new Error("access denied");
      if (key === KEY) held.value = null;
    }),
  };
}

/** The module, fresh — its one cached read is the thing each case below is about. */
async function mode(saved: string | null, throws: "read" | "write" | "never" = "never") {
  const local = store(saved, throws);
  vi.resetModules();
  vi.stubGlobal("localStorage", local);
  vi.stubGlobal("window", { addEventListener: () => {}, removeEventListener: () => {} });
  const module = await import("@/ui/sequencerMode");
  return { ...module, local };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the sequencer view", () => {
  it("is off until a hand turns it on, and stores the choice under its own key", async () => {
    const { useSequencerMode, setSequencerMode, local } = await mode(null);
    expect(useSequencerMode()).toBe(false);
    setSequencerMode(true);
    expect(useSequencerMode()).toBe(true);
    expect(local.held.value).toBe("on");
    setSequencerMode(false);
    expect(useSequencerMode()).toBe(false);
    expect(local.held.value).toBeNull();
  });

  it("reads a stored choice back, and is not whatever the store happens to say", async () => {
    expect((await mode("on")).useSequencerMode()).toBe(true);
    expect((await mode("yes")).useSequencerMode()).toBe(false);
  });

  it("draws the yards whole, and says so, when the store cannot be read", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { useSequencerMode } = await mode("on", "read");
    expect(useSequencerMode()).toBe(false);
    expect(error).toHaveBeenCalledOnce();
  });

  it("holds a choice it could not store for the rest of the session, and says so", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { useSequencerMode, setSequencerMode } = await mode(null, "write");
    setSequencerMode(true);
    expect(useSequencerMode()).toBe(true);
    expect(error).toHaveBeenCalledOnce();
  });
});
