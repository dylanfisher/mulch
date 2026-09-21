/**
 * @role What a remembered fold does over the store under it: a fold left on one mount is read on
 *   the next, one rack's is not another's, junk is not a choice, and an access that throws is a
 *   line on the console rather than a blank instrument (0392).
 */
import type * as ReactTypes from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The hook is called outside a renderer, the way src/ui/theme.test.ts calls its own: what each
// case is about is the store under it, and `useState` seeded once is the whole of the mount.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useMemo: (factory: () => unknown) => factory(),
    useState: (initial: unknown) => [initial, () => {}],
  };
});

/** A store that answers, or one that refuses to — blocked cookies make every access throw. */
function store(saved: Record<string, string> = {}, throws: "read" | "write" | "never" = "never") {
  const held: Record<string, string> = { ...saved };
  return {
    held,
    getItem: vi.fn((key: string) => {
      if (throws === "read") throw new Error("access denied");
      return held[key] ?? null;
    }),
    setItem: vi.fn((key: string, value: string) => {
      if (throws === "write") throw new Error("access denied");
      held[key] = value;
    }),
  };
}

/** The module, fresh — its cache of what each rack was left as is what a second mount reads. */
function folds(local?: ReturnType<typeof store>) {
  vi.resetModules();
  if (local !== undefined) vi.stubGlobal("localStorage", local);
  return import("@/ui/rackFold");
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// One case per thing the store under a fold can do to it, and one per rack the fold is keyed by;
// the length tracks how many of those there are. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("a remembered fold", () => {
  it("keys the master apart from a yard, and a yard apart from a yard", async () => {
    const { foldKey } = await folds();
    expect(new Set([foldKey(null), foldKey("a"), foldKey("master")]).size).toBe(3);
  });

  it("is the caller's own default until a hand has said", async () => {
    const { useRackFold } = await folds(store());
    expect(useRackFold(null, true)[0]).toBe(true);
    expect(useRackFold("a", false)[0]).toBe(false);
  });

  it("is read on the next mount from the fold the last one set", async () => {
    const local = store();
    const first = await folds(local);
    first.useRackFold(null, false)[1](true);
    const next = await folds(local);
    expect(next.useRackFold(null, false)[0]).toBe(true);
  });

  it("outranks the default on either side, on the mount that set it", async () => {
    const { useRackFold } = await folds(store());
    useRackFold("a", false)[1](true);
    expect(useRackFold("a", false)[0]).toBe(true);
    useRackFold("a", true)[1](false);
    expect(useRackFold("a", true)[0]).toBe(false);
  });

  it("is one rack's alone: a yard folded leaves the master where it was", async () => {
    const local = store();
    const first = await folds(local);
    first.useRackFold("a", false)[1](true);
    const next = await folds(local);
    expect(next.useRackFold(null, false)[0]).toBe(false);
  });

  it("is not a choice when the store holds something nobody wrote", async () => {
    const { foldKey } = await folds();
    const { useRackFold } = await folds(store({ [foldKey("a")]: "sideways" }));
    expect(useRackFold("a", true)[0]).toBe(true);
  });

  it("falls back to the default and says so when the store will not be read", async () => {
    const { useRackFold } = await folds(store({}, "read"));
    expect(useRackFold(null, true)[0]).toBe(true);
    expect(console.error).toHaveBeenCalled();
  });

  it("still applies for this session when the store will not be written", async () => {
    const { useRackFold } = await folds(store({}, "write"));
    useRackFold(null, true)[1](false);
    expect(useRackFold(null, true)[0]).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });

  it("is the default where there is no store at all, and says nothing about it", async () => {
    // Nothing stubbed: a test run is the no-DOM case, which is not a store that refused.
    const { useRackFold } = await folds();
    expect(useRackFold(null, true)[0]).toBe(true);
    expect(console.error).not.toHaveBeenCalled();
  });
});
