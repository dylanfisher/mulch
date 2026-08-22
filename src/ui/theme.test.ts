/**
 * @role What the theme does when the store under it is not a cooperative one: junk in it is not a
 *   choice, an access that throws is a line on the console and the OS rather than a blank
 *   instrument, and a choice another tab made is a choice this one re-reads.
 */
import type * as ReactTypes from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** The one thing the subscription reads off a storage event: which key the other tab wrote. */
type Notify = (event: Pick<StorageEvent, "key">) => void;

/** Every listener the subscription registered, so a test can be the other tab. */
const listeners: Record<string, Notify[]> = {};
/** What each render's subscription handed back — React calls these when the screen goes. */
let releases: (() => void)[] = [];

// The preference is read during render, through the store React holds it in; the class it puts on
// `<html>` is the DOM's business and not this file's, so the effect is dropped the way
// src/ui/listDrag.test.ts drops its own.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useEffect: () => {},
    useSyncExternalStore: (subscribe: (on: () => void) => () => void, snapshot: () => unknown) => {
      releases.push(subscribe(() => {}));
      return snapshot();
    },
  };
});

const KEY = "mulch:theme";

/** A store that answers, or one that refuses to: blocked cookies and a third-party frame both
 *  make every access throw rather than return null. */
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
async function theme(saved: string | null, throws: "read" | "write" | "never" = "never") {
  const local = store(saved, throws);
  vi.resetModules();
  vi.stubGlobal("localStorage", local);
  const module = await import("@/ui/theme");
  return { local, ...module };
}

beforeEach(() => {
  for (const name of Object.keys(listeners)) delete listeners[name];
  releases = [];
  vi.stubGlobal("window", {
    addEventListener: (name: string, on: Notify) => {
      (listeners[name] ??= []).push(on);
    },
    removeEventListener: (name: string, on: Notify) => {
      listeners[name] = (listeners[name] ?? []).filter((each) => each !== on);
    },
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// One case per thing the store under the preference can do to it; the length tracks how many of
// those there are. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the theme preference", () => {
  it("steps through the three in the order the picker lays them out, and wraps", async () => {
    const { nextTheme, THEMES } = await theme(null);
    expect(THEMES.map((each) => nextTheme(each))).toEqual(["system", "dark", "light"]);
  });

  it("is not whatever the stored value happens to say", async () => {
    // `localStorage` is the user's to edit, and a value that is not one of the three is the
    // absence of a choice rather than a theme called "midnight".
    const { useTheme } = await theme("midnight");
    expect(useTheme()).toBe("system");
  });

  it("follows the system, and says so, when the store cannot be read", async () => {
    const { useTheme } = await theme("dark", "read");
    // This read happens during render: an error escaping it is a blank instrument over a colour
    // preference.
    expect(useTheme()).toBe("system");
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it("holds a choice it could not store for the rest of the session, and says so", async () => {
    const { setTheme, useTheme } = await theme(null, "write");
    setTheme("dark");
    expect(useTheme()).toBe("dark");
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it("clears the key for system rather than storing a choice nobody made", async () => {
    const { local, setTheme } = await theme("dark");
    setTheme("system");
    expect(local.removeItem).toHaveBeenCalledWith(KEY);
    expect(local.setItem).not.toHaveBeenCalled();
  });

  it("re-reads the preference when another tab writes one, and only then", async () => {
    const { local, useTheme } = await theme("light");
    expect(useTheme()).toBe("light");
    local.held.value = "dark";

    const storage = listeners.storage ?? [];
    expect(storage).toHaveLength(1);
    // Somebody else's key: this one has not moved, and re-reading it would cost a render for
    // nothing.
    for (const on of storage) on({ key: "someone-else" });
    expect(useTheme()).toBe("light");

    for (const on of storage) on({ key: KEY });
    expect(useTheme()).toBe("dark");

    // A tab that called `localStorage.clear()` names no key at all, and the choice it dropped was
    // this one: read as somebody else's write, this tab holds the cleared theme until a reload.
    local.held.value = null;
    for (const on of storage) on({ key: null });
    expect(useTheme()).toBe("system");
  });

  it("watches the other tab while something is reading, and stops when nothing is", async () => {
    const { useTheme } = await theme("light");
    useTheme();
    useTheme();
    // One window listener for any number of readers, or a screen of subscribers is a screen of
    // listeners, each re-reading the same key on every write.
    expect(listeners.storage).toHaveLength(1);

    releases[0]?.();
    expect(listeners.storage).toHaveLength(1);
    for (const release of releases) release();
    expect(listeners.storage).toEqual([]);
  });
});
