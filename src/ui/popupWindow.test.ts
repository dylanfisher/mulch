/**
 * @role The second window the instrument drives (0138): what it is dressed in, that the gesture
 *   which opens it is the one that closes it, that a browser refusing one says so rather than
 *   failing quietly, and that a window a person closes themselves reaches the hook driving it —
 *   with nothing of the session anywhere in it.
 */
import type * as ReactTypes from "react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** One `useState`/`useRef` slot per call site, kept across the renders of one test. */
let slots: unknown[] = [];
let cursor = 0;
/** The effects of the render just made, with the deps they were declared against. */
let pending: { at: number; effect: () => (() => void) | void; deps: unknown[] | undefined }[] = [];
/** What each effect slot last saw, and what it left to be torn down. */
const memo = new Map<number, { deps: unknown[] | undefined; off: (() => void) | undefined }>();
/** Whether a render is owed, the way React owes one after a setState. */
let dirty = false;
/** Read through a call, so the loop below is a question and not a constant. */
const owed = (): boolean => dirty;

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useState: (initial: unknown) => {
      const at = cursor++;
      if (!(at in slots)) slots[at] = initial;
      return [
        slots[at],
        (next: unknown) => {
          slots[at] = next;
          dirty = true;
        },
      ];
    },
    useRef: (initial: unknown) => {
      const at = cursor++;
      slots[at] ??= { current: initial };
      return slots[at];
    },
    useEffect: (effect: () => (() => void) | void, deps?: unknown[]) => {
      pending.push({ at: cursor++, effect, deps });
    },
  };
});

vi.mock("@/ui/theme", () => ({ useTheme: () => "system" }));

/** The one root a window gets, and everything it was told to draw. */
let root: { host: unknown; drawn: unknown[]; live: boolean } | null = null;
/** What was torn down, in the order it happened — the tree and the window it lives in. */
let torn: string[] = [];

vi.mock("react-dom/client", () => ({
  createRoot: (host: unknown) => {
    root = { host, drawn: [], live: true };
    const made = root;
    return {
      render: (node: unknown) => made.drawn.push(node),
      unmount: () => {
        made.live = false;
        torn.push("tree");
      },
    };
  },
}));

import { adoptStyles, useSecondWindow, type SecondWindow } from "@/ui/popupWindow";

/** A stand-in element: what `adoptStyles` reads off one and what a clone of it carries. */
type Tag = { tag: string; cloned?: boolean };

/** A document as this module uses one — a head to fill, a body to draw in, and two dresses. */
function fakeDoc(sheets: Tag[] = []) {
  return {
    title: "",
    head: {
      held: [] as Tag[],
      querySelectorAll: (_selector: string) => sheets,
      append(node: Tag) {
        this.held.push(node);
      },
      replaceChildren() {
        this.held = [];
      },
    },
    body: { className: "", replaceChildren: () => {} },
    documentElement: { className: "" },
  };
}

const sheet = (tag: string): Tag => ({ tag, cloneNode: () => ({ tag, cloned: true }) }) as Tag;

/** A window as this module drives one: its document, its listeners, and whether it is still open. */
type Popup = {
  name: string;
  document: ReturnType<typeof fakeDoc>;
  live: boolean;
  listeners: Record<string, (() => void)[]>;
  close: () => void;
  addEventListener: (type: string, on: () => void) => void;
  removeEventListener: (type: string, on: () => void) => void;
};

/** Every window opened, in order. */
let opened: Popup[] = [];
/** How many more windows the browser will hand back before it starts refusing. */
let allowed = Number.POSITIVE_INFINITY;
/** The listeners on the opener itself — how a page going away reaches an open window. */
let onOpener: Record<string, (() => void)[]> = {};

function fakePopup(name: string): Popup {
  const listeners: Record<string, (() => void)[]> = {};
  const made: Popup = {
    name,
    document: fakeDoc(),
    live: true,
    listeners,
    close: () => {
      made.live = false;
      torn.push("window");
    },
    addEventListener: (type, on) => {
      (listeners[type] ??= []).push(on);
    },
    removeEventListener: (type, on) => {
      listeners[type] = (listeners[type] ?? []).filter((each) => each !== on);
    },
  };
  return made;
}

/** Everything registered on one popup for `type`, which is how a person closing it is heard. */
const heard = (popup: Popup, type: string) => popup.listeners[type] ?? [];

/** The effects of the render just made, run against the deps each was declared with. */
function flush(): void {
  for (const { at, effect, deps } of pending) {
    const before = memo.get(at);
    const same =
      before !== undefined &&
      deps !== undefined &&
      before.deps !== undefined &&
      deps.length === before.deps.length &&
      deps.every((each, index) => Object.is(each, before.deps?.[index]));
    if (same) continue;
    before?.off?.();
    const off = effect();
    memo.set(at, { deps, off: typeof off === "function" ? off : undefined });
  }
}

/** The hook, rendered until nothing more is owed — React's own loop after a setState, by hand. */
function useDriven(draw: (doc: Document, close: () => void) => ReactNode) {
  let held: SecondWindow;
  do {
    dirty = false;
    cursor = 0;
    pending = [];
    // A loop is what re-rendering by hand looks like: this is the harness, not a component, and
    // the slots above keep the order React would. Waived at the site (0007).
    // oxlint-disable-next-line rules-of-hooks
    held = useSecondWindow("picture", "A Picture", draw);
    flush();
  } while (owed());
  return held;
}

beforeEach(() => {
  slots = [];
  memo.clear();
  root = null;
  torn = [];
  opened = [];
  allowed = Number.POSITIVE_INFINITY;
  onOpener = {};
  vi.stubGlobal("document", fakeDoc([sheet("style"), sheet("link")]));
  vi.stubGlobal("window", {
    open: (_url: string, name: string) => {
      if (opened.length >= allowed) return null;
      const made = fakePopup(name);
      opened.push(made);
      return made;
    },
    addEventListener: (type: string, on: () => void) => (onOpener[type] ??= []).push(on),
    removeEventListener: (type: string, on: () => void) => {
      onOpener[type] = (onOpener[type] ?? []).filter((each) => each !== on);
    },
  });
});

afterEach(() => {
  for (const { off } of memo.values()) off?.();
  vi.unstubAllGlobals();
});

// One case per thing a second window can do, and each is a lifecycle rather than a value. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("a picture in a window of its own", () => {
  it("dresses a bare document in the opener's own sheets and its theme", () => {
    document.documentElement.className = "dark";
    document.body.className = "antialiased";
    const into = fakeDoc();
    // oxlint-disable-next-line no-unsafe-type-assertion -- the four members adoptStyles reads
    adoptStyles(document, into as unknown as Document);
    // Clones, not the opener's own tags: moving a `<style>` out of the instrument's head would
    // take the instrument's own colours with it.
    expect(into.head.held).toEqual([
      { tag: "style", cloned: true },
      { tag: "link", cloned: true },
    ]);
    // The theme is one choice, worn by both documents: a second window in the other scheme is a
    // picture in the wrong ink, and every colour in this app is a token under those classes.
    expect(into.documentElement.className).toBe("dark");
    expect(into.body.className).toBe("antialiased");
  });

  it("opens on the gesture, draws one tree into it, and closes when it is closed", async () => {
    const drawn = vi.fn(() => "the picture");
    let held = useDriven(drawn);
    expect(held.covering).toBe(false);
    expect(opened).toHaveLength(0);

    held.open();
    held = useDriven(drawn);
    expect(opened).toHaveLength(1);
    // Named, so asking twice reaches this window rather than stacking a second on it — and asking
    // again while one is open is nothing at all, rather than the close a toggle used to read it as.
    expect(opened[0]?.name).toBe("picture");
    held.open();
    held = useDriven(drawn);
    expect(opened).toHaveLength(1);
    expect(opened[0]?.live).toBe(true);
    expect(opened[0]?.document.title).toBe("A Picture");
    // A window whose opener is gone has nothing driving it, so the opener's own leaving closes it.
    expect(onOpener["pagehide"]).toHaveLength(1);
    // One root, in the second document's own body, holding what the caller drew.
    expect(root?.host).toBe(opened[0]?.document.body);
    expect(root?.drawn).toEqual(["the picture"]);
    // And nothing is over the opener's page: the picture is in a window, not on top of one.
    expect(held.covering).toBe(false);

    held.close();
    useDriven(drawn);
    // The close rides the same microtask the unmount does — see the case below.
    await Promise.resolve();
    expect(opened[0]?.live).toBe(false);
    expect(onOpener["pagehide"]).toEqual([]);
  });

  it("unmounts the tree before closing the window it is in", async () => {
    // The popup's own picture is subscribed to the OPENER's frame loop (src/ui/frame.ts), and the
    // unmount is the only thing that takes it back out — so a close that runs first leaves that
    // teardown running against a document that is already gone.
    const drawn = vi.fn(() => "the picture");
    let held = useDriven(drawn);
    held.open();
    held = useDriven(drawn);
    expect(torn).toEqual([]);

    held.close();
    useDriven(drawn);
    // Deferred out of the effect cleanup, which is why nothing has happened yet.
    expect(torn).toEqual([]);
    await Promise.resolve();
    expect(torn).toEqual(["tree", "window"]);
  });

  it("says it is showing in either place, so a second ask cannot draw it twice", () => {
    // The caller's guard on the gesture that opens it: `covering` is false while the picture is in
    // a window of its own, so it cannot answer "is this already up?" — and a strip clicked again
    // behind its own window would mount a second picture on a second frame loop (0070, 0139).
    const drawn = vi.fn(() => "the picture");
    let held = useDriven(drawn);
    expect(held.showing).toBe(false);

    held.open();
    held = useDriven(drawn);
    expect(held.covering).toBe(false);
    expect(held.showing).toBe(true);

    held.close();
    held = useDriven(drawn);
    expect(held.showing).toBe(false);

    // And over this page, where a browser refused the window, it says the same thing.
    allowed = 0;
    held.open();
    held = useDriven(drawn);
    expect(held.covering).toBe(true);
    expect(held.showing).toBe(true);
    held.close();
  });

  it("covers the opener's own page when the browser refuses a window", () => {
    allowed = 0;
    const drawn = vi.fn(() => "the picture");
    let held = useDriven(drawn);
    held.open();
    held = useDriven(drawn);
    // A refusal is not a picture that failed to open: it is the same picture, over this page.
    expect(held.covering).toBe(true);
    expect(root).toBeNull();

    held.close();
    held = useDriven(drawn);
    expect(held.covering).toBe(false);
  });

  it("hears the window a person closed themselves, rather than holding one that is gone", () => {
    const drawn = vi.fn(() => "the picture");
    let held = useDriven(drawn);
    held.open();
    held = useDriven(drawn);
    expect(root?.live).toBe(true);

    // The window's own close button: nothing in this page pressed anything.
    const popup = opened[0];
    if (popup === undefined) throw new Error("no window was opened");
    for (const on of heard(popup, "pagehide").slice()) on();
    held = useDriven(drawn);
    // Dropped rather than kept: a hook still holding it would draw into a document nobody has,
    // and the next ask would find a window that is gone and open nothing.
    expect(held.covering).toBe(false);
    expect(onOpener["pagehide"]).toEqual([]);

    held.open();
    useDriven(drawn);
    expect(opened).toHaveLength(2);
  });
});
