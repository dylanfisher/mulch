/**
 * @role What the drift's look does when the store under it is not a cooperative one: every yard
 *   draws the one field until a hand picks scenes, junk in the store is not a choice, an access that
 *   throws is a line on the console and the one field drawn, and a choice is held for the session
 *   either way (0400). The shape is src/ui/driftShown.test.ts's, because the preference's is.
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

const KEY = "mulch:drift-look";

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
async function looked(saved: string | null, throws: "read" | "write" | "never" = "never") {
  const local = store(saved, throws);
  vi.resetModules();
  vi.stubGlobal("localStorage", local);
  vi.stubGlobal("window", { addEventListener: () => {}, removeEventListener: () => {} });
  const module = await import("@/ui/driftLook");
  return { ...module, local };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the drift's look", () => {
  it("draws the one field until a hand picks scenes, and stores only that choice", async () => {
    const { useDriftLook, setDriftLook, local } = await looked(null);
    expect(useDriftLook()).toBe("uniform");
    setDriftLook("scenes");
    expect(useDriftLook()).toBe("scenes");
    expect(local.held.value).toBe("scenes");
    setDriftLook("uniform");
    expect(useDriftLook()).toBe("uniform");
    expect(local.held.value).toBeNull();
  });

  it("reads a stored choice back, and is not whatever the store happens to say", async () => {
    expect((await looked("scenes")).useDriftLook()).toBe("scenes");
    expect((await looked("meadow")).useDriftLook()).toBe("uniform");
  });

  it("draws the one field, and says so, when the store cannot be read", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { useDriftLook } = await looked("scenes", "read");
    expect(useDriftLook()).toBe("uniform");
    expect(error).toHaveBeenCalledOnce();
  });

  it("holds a choice it could not store for the rest of the session, and says so", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { useDriftLook, setDriftLook } = await looked(null, "write");
    setDriftLook("scenes");
    expect(useDriftLook()).toBe("scenes");
    expect(error).toHaveBeenCalledOnce();
  });
});
