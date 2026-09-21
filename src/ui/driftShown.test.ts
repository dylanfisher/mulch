/**
 * @role What the drift switch does when the store under it is not a cooperative one: junk in it
 *   is not a choice, an access that throws is a line on the console and the picture drawn rather
 *   than a blank instrument, and a choice is held for the session either way (0397). The shape is
 *   src/ui/sequencerMode.test.ts's, because the preference's shape is that one's.
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

const KEY = "mulch:drift";

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
async function switched(saved: string | null, throws: "read" | "write" | "never" = "never") {
  const local = store(saved, throws);
  vi.resetModules();
  vi.stubGlobal("localStorage", local);
  vi.stubGlobal("window", { addEventListener: () => {}, removeEventListener: () => {} });
  const module = await import("@/ui/driftShown");
  return { ...module, local };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the drift switch", () => {
  it("draws the picture until a hand switches it off, and stores only that choice", async () => {
    const { useDriftShown, setDriftShown, local } = await switched(null);
    expect(useDriftShown()).toBe(true);
    setDriftShown(false);
    expect(useDriftShown()).toBe(false);
    expect(local.held.value).toBe("off");
    setDriftShown(true);
    expect(useDriftShown()).toBe(true);
    expect(local.held.value).toBeNull();
  });

  it("reads a stored choice back, and is not whatever the store happens to say", async () => {
    expect((await switched("off")).useDriftShown()).toBe(false);
    expect((await switched("no")).useDriftShown()).toBe(true);
  });

  it("draws the picture, and says so, when the store cannot be read", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { useDriftShown } = await switched("off", "read");
    expect(useDriftShown()).toBe(true);
    expect(error).toHaveBeenCalledOnce();
  });

  it("holds a choice it could not store for the rest of the session, and says so", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { useDriftShown, setDriftShown } = await switched(null, "write");
    setDriftShown(false);
    expect(useDriftShown()).toBe(false);
    expect(error).toHaveBeenCalledOnce();
  });
});
