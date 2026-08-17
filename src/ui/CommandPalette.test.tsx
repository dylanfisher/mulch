/**
 * @role That the palette is a second way to send and never a second code path: every entry
 *   produces exactly what the surface control offering the same gesture produces (P41).
 */
// One import and one case per surface the palette duplicates, so both counts track how many
// controls the palette stands in for rather than anything about this file. Pairing each entry
// with its control in the same case is the whole point; splitting them apart would hide it (0007).
// oxlint-disable max-lines, import/max-dependencies
import { Children, isValidElement, type ReactNode } from "react";
import type * as ReactTypes from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The hooks these surfaces hold, made callable outside a renderer the way
// src/ui/EffectPicker.test.tsx makes the picker's callable. Nothing here renders to a DOM;
// what is compared is what each control's handler sends.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useEffect: () => {},
    useMemo: (factory: () => unknown) => factory(),
    useRef: (initial: unknown) => ({ current: initial }),
    useState: (initial: unknown) => [initial, () => {}],
    useSyncExternalStore: (_subscribe: unknown, get: () => unknown) => get(),
  };
});

// The theme is a view preference, so the palette's entry cannot be compared by command: what is
// compared is that it reaches the same setter the picker reaches. Everything else in the module
// stays real, including the order `nextTheme` steps through.
vi.mock("@/ui/theme", async (importOriginal) => {
  const theme = await importOriginal<Record<string, unknown>>();
  return { ...theme, setTheme: vi.fn() };
});

// A session archive leaves through an anchor, and there is no document here. Both the menu entry
// and the palette entry are asserted to reach this one function with the same file.
vi.mock("@/ui/download", () => ({ downloadFile: vi.fn() }));

import { manualClock } from "@/app/clock";
import { createInstrument, type Instrument } from "@/app/facade";
import { EFFECTS } from "@/audio/effects/registry";
import { DECK_PARAM_DEFAULTS } from "@/audio/params";
import { yardLabel } from "@/lib/copy";
import type { DeckState } from "@/state/store";
import {
  choosePaletteEntry,
  CommandPalette,
  paletteEntries,
  type PaletteEntry,
} from "@/ui/CommandPalette";
import { Deck } from "@/ui/Deck";
import { DeckTransport } from "@/ui/DeckTransport";
import { downloadFile } from "@/ui/download";
import { EffectPicker } from "@/ui/EffectPicker";
import { FileMenu } from "@/ui/FileMenu";
import { commandForShortcut, setPaletteOpen, toggleDebugConsole } from "@/ui/shortcuts";
import { nextTheme, setTheme } from "@/ui/theme";
import { ThemeToggle } from "@/ui/ThemeToggle";
import { AddDeckButton } from "@/ui/App";

type Props = {
  children?: ReactNode;
  render?: ReactNode;
  "aria-label"?: string;
  onClick?: () => void;
  onPressedChange?: () => void;
  onValueChange?: (value: string[]) => void;
  /** What the list primitive is handed and told about highlighting — read by the P45 tests. */
  autoHighlight?: boolean | "always";
  items?: readonly PaletteEntry[];
};

/** Every element in a tree, our own function components called so their trees are reached too. */
function* walk(node: ReactNode): Generator<Props> {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<Props>(child)) continue;
    yield child.props;
    yield* walk(child.props.children ?? null);
    yield* walk(child.props.render ?? null);
    if (typeof child.type !== "function") continue;
    // Every component in these trees is a plain function; nothing here is a class, so the
    // narrowing `typeof` cannot reach is the one the guard above states.
    // oxlint-disable-next-line no-unsafe-type-assertion
    const call = child.type as (props: Props) => ReactNode;
    let inner: ReactNode = null;
    try {
      inner = call(child.props);
    } catch {
      // A Base UI primitive wants a real renderer — a context, an id, an insertion effect. Its
      // own subtree holds no handler of ours, so a skip here loses nothing this test looks for.
      inner = null;
    }
    yield* walk(inner);
  }
}

/** The words a node shows, its element children skipped. */
const words = (props: Props): string =>
  Children.toArray(props.children)
    .filter((child): child is string => typeof child === "string")
    .join("");

/** The first control in a tree whose visible words or label are exactly this. */
function control(tree: ReactNode, named: string): Props {
  for (const props of walk(tree)) {
    if (words(props) === named || props["aria-label"] === named) return props;
  }
  throw new Error(`no control named ${named}`);
}

/** Press whichever way this control is pressed — a Button's click or a Toggle's change. */
function press(props: Props): void {
  const fire = props.onClick ?? props.onPressedChange;
  if (fire === undefined) throw new Error("that control has nothing to press");
  fire();
}

const DECK_STATE: DeckState = {
  params: { ...DECK_PARAM_DEFAULTS },
  automation: {},
  effects: [],
  source: null,
  duration: 1,
  analysis: null,
  playing: false,
  paused: 0,
  loop: null,
};

/** Yard A's own panel, whose top-right group is where capture is offered (0078). */
const yard = (instrument: Instrument): ReactNode => (
  <Deck instrument={instrument} deck="a" emoji="🏡" name="Quiet Fern" active />
);

const noop = () => {};

/** Let every already-resolved promise in the export chain run out. */
const settle = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

/** The second yard the going-to-a-yard comparison addresses, added the same way on both sides. */
const addSecondYard = (instrument: Instrument) => {
  instrument.send({ t: "deck.add", deck: "b", emoji: "🌴", name: "North Willow" });
};

/** One palette, built over the session as it stands, with its two non-command handlers spied. */
function palette(instrument: Instrument) {
  // Typed as the props they stand in for: an untyped `vi.fn()` returns a value, and a handler
  // the surface declares as void-returning must not.
  const onExportAudio = vi.fn<() => void>();
  const onError = vi.fn<(message: string | null) => void>();
  const entries = paletteEntries(instrument.state.getState(), {
    instrument,
    onError,
    onExportAudio,
    theme: "light",
  });
  const entry = (label: string): PaletteEntry => {
    const found = entries.find((candidate) => candidate.label === label);
    if (found === undefined) throw new Error(`no palette entry ${label} in ${entries.length}`);
    return found;
  };
  return { entries, entry, onError, onExportAudio };
}

/**
 * What one gesture sent, whichever surface made it — against a real instrument, so the command
 * is executed rather than only inspected. The two ids a session mints and the two pools a yard is
 * named from are pinned in `beforeEach`, so two surfaces that build the same command build the
 * identical object and `toEqual` is the whole comparison rather than a fuzzy one.
 */
function sentBy(
  run: (instrument: Instrument) => void,
  setUp: (instrument: Instrument) => void = noop,
): unknown {
  const instrument = createInstrument(manualClock());
  setUp(instrument);
  const sent = vi.spyOn(instrument, "send");
  run(instrument);
  expect(sent).toHaveBeenCalledTimes(1);
  return sent.mock.calls[0]?.[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  // oxlint-disable-next-line no-unsafe-type-assertion
  vi.spyOn(crypto, "randomUUID").mockReturnValue("11111111-2222-4333-8444-555555555555" as const);
  vi.spyOn(Math, "random").mockReturnValue(0.42);
});

// One `it` per gesture the palette offers a second way into; the count tracks how many entries
// there are. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("a palette entry and the control offering the same gesture", () => {
  it("send the same deck.activate for going to a yard", () => {
    const withTwo = createInstrument(manualClock());
    addSecondYard(withTwo);
    // The keyboard is the other surface that goes to a yard by position, and it reaches the same
    // construction the yard's own press reaches (src/ui/Deck.tsx).
    const fromKeyboard = commandForShortcut(
      {
        code: "Digit2",
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        repeat: false,
        defaultPrevented: false,
      },
      withTwo.state.getState(),
    );

    const fromPalette = sentBy((instrument) => {
      palette(instrument)
        .entry(`Go To 🌴 ${yardLabel("b")} — North Willow`)
        .run();
    }, addSecondYard);

    expect(fromPalette).toEqual(fromKeyboard);
    expect(fromPalette).toEqual({ t: "deck.activate", deck: "b" });
  });

  it("send the same deck.play.toggle for playing the active yard", () => {
    const fromTransport = sentBy((instrument) => {
      press(control(DeckTransport({ instrument, deck: "a", state: DECK_STATE }), "Play"));
    });

    const fromPalette = sentBy((instrument) => {
      palette(instrument)
        .entry(`Play / Pause ${yardLabel("a")}`)
        .run();
    });

    expect(fromPalette).toEqual(fromTransport);
    // Pinned, because both sides call one builder: swapping two builders' bodies would leave a
    // surface-versus-palette comparison green while every gesture meant the other thing.
    expect(fromPalette).toEqual({ t: "deck.play.toggle", deck: "a" });
  });

  it("send the same deck.stop for stopping the active yard", () => {
    const fromTransport = sentBy((instrument) => {
      press(control(DeckTransport({ instrument, deck: "a", state: DECK_STATE }), "Stop"));
    });

    const fromPalette = sentBy((instrument) => {
      palette(instrument)
        .entry(`Stop ${yardLabel("a")}`)
        .run();
    });

    expect(fromPalette).toEqual(fromTransport);
    expect(fromPalette).toEqual({ t: "deck.stop", deck: "a" });
  });

  it("send the same clip.capture, minted id and generated name alike", () => {
    const fromRack = sentBy((instrument) => {
      press(control(yard(instrument), `Capture ${yardLabel("a")}`));
    });

    const fromPalette = sentBy((instrument) => {
      palette(instrument)
        .entry(`Capture ${yardLabel("a")}`)
        .run();
    });

    expect(fromPalette).toEqual(fromRack);
    expect(fromPalette).toMatchObject({ t: "clip.capture", deck: "a", name: "clip 1" });
  });

  it("send the same deck.duplicate, drawn emoji and name alike", () => {
    const fromYard = sentBy((instrument) => {
      press(control(yard(instrument), `Duplicate ${yardLabel("a")}`));
    });

    const fromPalette = sentBy((instrument) => {
      palette(instrument)
        .entry(`Duplicate ${yardLabel("a")}`)
        .run();
    });

    expect(fromPalette).toEqual(fromYard);
    expect(fromPalette).toMatchObject({ t: "deck.duplicate", deck: "a", to: "b" });
  });

  // Registry-driven on both sides, so a new plugin gets a palette entry and a picker item that
  // agree by existing rather than by two lists being kept in step (0016).
  it("send the same effect.add for every plugin the registry holds", () => {
    for (const effect of EFFECTS) {
      const label = `Add ${effect.label} to ${yardLabel("a")}`;
      const fromPicker = sentBy((instrument) => {
        press(control(EffectPicker({ instrument, deck: "a" }), label));
      });

      const fromPalette = sentBy((instrument) => {
        palette(instrument).entry(label).run();
      });

      // Both reach `addEffectCommand`, which mints a fresh opaque id every press (0030) and sorts
      // it after the ids already in the rack (0076) — so the two agree on everything but the one
      // field they can never share.
      const shape = { t: "effect.add", deck: "a", effect: effect.id };
      expect(fromPalette).toMatchObject(shape);
      expect(fromPicker).toMatchObject(shape);
      expect(Object.keys(fromPalette ?? {})).toEqual(Object.keys(fromPicker ?? {}));
    }
    expect(EFFECTS.length).toBeGreaterThan(1);
  });

  it("send the same deck.add, drawn emoji and drawn name alike", () => {
    const fromButton = sentBy((instrument) => {
      press(control(AddDeckButton({ instrument }), "Add Yard"));
    });

    const fromPalette = sentBy((instrument) => {
      palette(instrument).entry("Add Yard").run();
    });

    expect(fromPalette).toEqual(fromButton);
    expect(fromPalette).toMatchObject({ t: "deck.add", deck: "b" });
  });
});

// One `it` per non-command entry, each pairing it with the surface control it must agree with.
// See 0007.
// oxlint-disable-next-line max-lines-per-function
describe("a palette entry for something that is not a command", () => {
  it("opens the shell's one Export Audio dialog, the handler the File menu is given", () => {
    const instrument = createInstrument(manualClock());
    const { entry, onExportAudio } = palette(instrument);
    const menu = FileMenu({ instrument, onError: noop, onExportAudio });

    press(control(menu, "Export Audio…"));
    entry("Export Audio…").run();

    expect(onExportAudio).toHaveBeenCalledTimes(2);
  });

  it("writes the same session archive the File menu's entry writes", async () => {
    const instrument = createInstrument(manualClock());
    const archive = new File(["archive"], "session.mulch");
    vi.spyOn(instrument, "exportSession").mockResolvedValue(archive);
    const { entry } = palette(instrument);

    press(control(FileMenu({ instrument, onError: noop, onExportAudio: noop }), "Export Session"));
    await settle();
    entry("Export Session").run();
    await settle();

    expect(downloadFile).toHaveBeenCalledTimes(2);
    expect(downloadFile).toHaveBeenNthCalledWith(1, archive);
    expect(downloadFile).toHaveBeenNthCalledWith(2, archive);
  });

  /**
   * The menu disables its entry while an archive is being written; the palette closes the moment
   * an entry is chosen and cannot hold that guard, so the gesture holds it instead.
   */
  it("writes one archive when the palette is asked twice before the first resolves", async () => {
    const instrument = createInstrument(manualClock());
    const exported = vi
      .spyOn(instrument, "exportSession")
      .mockResolvedValue(new File(["a"], "session.mulch"));
    const { entry } = palette(instrument);

    entry("Export Session").run();
    entry("Export Session").run();
    await settle();

    expect(exported).toHaveBeenCalledTimes(1);
    expect(downloadFile).toHaveBeenCalledTimes(1);
  });

  // A view preference is not a command (§2), so what is proved is that both surfaces reach the
  // one setter rather than that they send the same thing.
  it("steps the theme through the setter the picker uses", () => {
    const { entry } = palette(createInstrument(manualClock()));

    control(ThemeToggle({}), "Theme").onValueChange?.(["dark"]);
    entry("Toggle Theme").run();

    expect(setTheme).toHaveBeenNthCalledWith(1, "dark");
    expect(setTheme).toHaveBeenNthCalledWith(2, nextTheme("light"));
  });

  // The console's key and the palette's entry are the same flip, by identity: a second toggle
  // would be a second flag, and the two would disagree the first time either was used.
  it("flips the debug console with the same function its key flips", () => {
    const { entry } = palette(createInstrument(manualClock()));

    expect(entry("Toggle Debug Console").run).toBe(toggleDebugConsole);
  });
});

describe("the palette's list", () => {
  it("offers every gesture P41 names", () => {
    const labels = palette(createInstrument(manualClock())).entries.map((entry) => entry.label);

    expect(labels).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`Go To`),
        `Play / Pause ${yardLabel("a")}`,
        `Stop ${yardLabel("a")}`,
        `Capture ${yardLabel("a")}`,
        ...EFFECTS.map((effect) => `Add ${effect.label} to ${yardLabel("a")}`),
        "Add Yard",
        "Export Audio…",
        "Export Session",
        "Toggle Theme",
        "Toggle Debug Console",
      ]),
    );
  });

  // A session may hold no yards (0029), and the entries that name the active one have nothing to
  // name then — the same answer the keyboard registry gives, rather than a row that throws.
  it("drops the active yard's entries when the session holds none", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "deck.remove", deck: "a" });

    const labels = palette(instrument).entries.map((entry) => entry.label);

    expect(labels.some((label) => label.startsWith("Play / Pause"))).toBe(false);
    expect(labels.some((label) => label.startsWith("Go To"))).toBe(false);
    expect(labels).toContain("Add Yard");
  });
});

// P45. The memory is a view preference — no command, nothing durable, no history entry — and it
// is spelled as order: the first row is the active one, so the entry the last invocation ran
// being first is the entry the last invocation ran being active.
// oxlint-disable-next-line max-lines-per-function
describe("the palette's memory of what it last ran", () => {
  /**
   * The list with nothing hoisted, whatever ran before this test. Choosing the row the list
   * already puts first moves nothing, so it is the untouched order every case here starts from —
   * the memory is a module binding no `beforeEach` can reach, and a test that assumed it was
   * empty would only hold while it happened to run first.
   */
  const untouched = (instrument: Instrument): string[] => {
    // The yard rows lead the list, so going to the first yard is the invocation that hoists
    // nothing — whatever the memory held before.
    const head = palette(instrument).entries.find((one) => one.id.startsWith("go-to-"));
    if (head === undefined) throw new Error("a palette with no yard to go to");
    choosePaletteEntry(head);
    return palette(instrument).entries.map((one) => one.label);
  };

  it("offers the entry the last invocation ran first, so the second open has it active", () => {
    const instrument = createInstrument(manualClock());
    const label = `Capture ${yardLabel("a")}`;
    const before = untouched(instrument);
    expect(before[0]).not.toBe(label);

    choosePaletteEntry(palette(instrument).entry(label));

    const after = palette(instrument).entries.map((one) => one.label);
    expect(after[0]).toBe(label);
    expect(after.slice(1)).toEqual(before.filter((one) => one !== label));
  });

  // One memory, not a history: the palette remembers what you last ran, so the row before it goes
  // back to where the list put it.
  it("remembers the last invocation only", () => {
    const instrument = createInstrument(manualClock());
    const before = untouched(instrument);
    const label = `Stop ${yardLabel("a")}`;
    choosePaletteEntry(palette(instrument).entry(`Capture ${yardLabel("a")}`));

    choosePaletteEntry(palette(instrument).entry(label));

    const after = palette(instrument).entries.map((one) => one.label);
    expect(after[0]).toBe(label);
    expect(after.slice(1)).toEqual(before.filter((one) => one !== label));
  });

  // The highlight is the primitive's: `always` makes the first row of whatever list it is handed
  // the active one, which is the whole of "the second open has it active" — and it is the list,
  // not a pinned row, so a typed query filters it and the first match takes the highlight.
  it("hands the primitive the remembered list and its own always-highlight", () => {
    const instrument = createInstrument(manualClock());
    const label = `Export Audio…`;
    choosePaletteEntry(palette(instrument).entry(label));
    setPaletteOpen(true);

    const list = [...walk(CommandPalette({ instrument, onError: noop, onExportAudio: noop }))].find(
      (props) => props.autoHighlight !== undefined,
    );
    setPaletteOpen(false);

    expect(list?.autoHighlight).toBe("always");
    expect(list?.items?.[0]?.label).toBe(label);
  });
});
