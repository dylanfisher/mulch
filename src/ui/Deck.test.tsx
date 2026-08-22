// One case per thing a yard draws or answers to, over the one hand-built mount below; the length
// tracks the deck's surface rather than any setup a split would remove (0007).
// oxlint-disable max-lines
// One import over the cap, and it is the component one case below is about: the rack's fold is
// asserted by finding that element in the yard's own tree (0007, P64).
// oxlint-disable import/max-dependencies
import { Children, isValidElement, type ReactNode } from "react";
import type * as ReactTypes from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The four hooks the deck itself calls, made callable outside a renderer so the gesture tests
// below can hold the element tree and press it. Each stands in for exactly what a first render
// does, so the server renders in this file see the same markup they always did.
/**
 * The seed the mocked `useState` hands the collapse flag, so a server render can draw the folded
 * half of a yard (P32). Hoisted because a `vi.mock` factory runs before the file's own bindings.
 */
const view = vi.hoisted(() => ({ collapsed: false, seeded: false }));

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useMemo: (factory: () => unknown) => factory(),
    // The yard's own fold is the first `false` a render of it reaches — the import error above it
    // is seeded `null` — and it is the only one a test sets, so the seed is spent on it and every
    // `useState(false)` after it keeps its own. That matters now a folded yard draws its drift in
    // its header (P76): the strip's `open` is a `false` that renders while the yard is shut, and a
    // seed handed to it too would open the overlay every time a test folded a yard.
    useState: (initial: unknown) => {
      if (initial !== false || view.seeded) return [initial, () => {}];
      view.seeded = true;
      return [view.collapsed, () => {}];
    },
    // These are server renders, so a store with a server snapshot is read the way React would
    // read it there — the theme's client snapshot reaches for a `localStorage` node has not got.
    useSyncExternalStore: (_subscribe: unknown, read: () => unknown, readServer?: () => unknown) =>
      (readServer ?? read)(),
  };
});

import { manualClock } from "@/app/clock";
import { silentEngine } from "@/app/engineDouble";
import { createInstrument } from "@/app/facade";
import { AUDIO_FILE_ACCEPT } from "@/lib/audioFile";
import { GEN_KINDS, type GenKind } from "@/lib/waveform";
import type { SessionRepository } from "@/state/repository";
import { Deck, importDeckFile } from "@/ui/Deck";
import { EffectRack } from "@/ui/EffectRack";
import { Waveform } from "@/ui/Waveform";
// oxlint-enable import/max-dependencies

/**
 * The smallest engine a `deck.load` needs: it reports the duration the generator asked for, so
 * the session records the load and the deck renders what it is holding. Nothing else is reached
 * from a server render — peek and the canvas are effects, which never run here.
 */
const stubEngine = () => silentEngine();

const render = (source?: { gen: GenKind; secs: number; hz?: number }) => {
  const instrument = createInstrument(manualClock(), stubEngine);
  if (source !== undefined) instrument.send({ t: "deck.load", deck: "a", source });
  return renderToStaticMarkup(
    <Deck instrument={instrument} deck="a" emoji="🌴" name="North Willow" active />,
  );
};

const renderEffects = (setup?: (instrument: ReturnType<typeof createInstrument>) => void) => {
  const instrument = createInstrument(manualClock(), stubEngine);
  setup?.(instrument);
  return renderToStaticMarkup(
    <Deck instrument={instrument} deck="a" emoji="🌴" name="North Willow" active />,
  );
};

/**
 * The load arguments the UI has to be able to reach: a deck that can only make 4-second sources
 * at the default frequency is a deck an agent can drive further than a person can (plan §4).
 */
describe("Deck load fields", () => {
  it("names the deck it is holding without a select button to press", () => {
    const markup = render({ gen: "click-train", secs: 2, hz: 8 });
    // Touching the panel is the selection gesture, so there is no control for it (P16). The
    // readout truncates on one line, carries its full text as the title, and leads with the
    // yard's name — what P32 emptied the blob id to make room for (0057).
    expect(markup).not.toContain("Select deck a");
    expect(markup).toMatch(/title="North Willow · click-train · 2.00s"[^>]*>North Willow/u);
    expect(markup).toContain("truncate");
  });

  it("says nothing about the id an imported source is addressed by (P32)", async () => {
    // A real import, so the deck holds a blob source: a `deck.load` naming a blob with no
    // repository behind it is refused and leaves the deck empty (src/app/execute.ts).
    const instrument = createInstrument(manualClock(), stubEngine, ingestingRepository([]));
    await instrument.ready;
    await importDeckFile(instrument, "a", new File([new Uint8Array([1])], "sample.wav"));
    expect(instrument.probe().decks.a?.source).toEqual({ blobId: "stored-id" });
    const markup = renderToStaticMarkup(
      <Deck instrument={instrument} deck="a" emoji="🌴" name="North Willow" active />,
    );
    expect(markup).not.toContain("stored-id");
    // What it says instead is the yard's name — a name, not an address — and no stray separator.
    expect(markup).toMatch(/title="North Willow/u);
    expect(markup).not.toMatch(/title="[^"]*(^|")\s*·/u);
  });

  it("offers the length of a load, disabled until something is loaded", () => {
    const markup = render();
    expect(markup).toMatch(/id="a-secs" disabled=""/u);
    // The bound comes from the generators themselves, so the field offers what a load accepts.
    expect(markup).toMatch(/id="a-secs"[^>]*min="0.000125"/u);
    expect(markup).toMatch(/id="a-secs"[^>]*max="60"/u);
    expect(markup).not.toContain('id="a-hz"');
  });

  it("reads back the length and frequency the load actually carried", () => {
    const markup = render({ gen: "click-train", secs: 2, hz: 8 });
    expect(markup).toMatch(/id="a-secs" type="number"[^>]*value="2"/u);
    expect(markup).toMatch(/id="a-hz"[^>]*value="8"/u);
  });

  it("offers no frequency for a generator that has none", () => {
    expect(render({ gen: "noise", secs: 2 })).not.toContain('id="a-hz"');
  });

  it("shows the effective default rather than a zero frequency sentinel", () => {
    expect(render({ gen: "click-train", secs: 2, hz: 0 })).toMatch(/id="a-hz"[^>]*value="4"/u);
  });
});

/**
 * P70: which generator a yard plays is a list of alternatives with one of them chosen, which is a
 * menu — and the pitch that load carries is dialled finely enough to beat two yards together.
 */
describe("the source menu", () => {
  // P70: five generators were five buttons across the row, and a sixth would have been a sixth
  // button. A list of alternatives with one of them chosen is a menu, and a menu is one control
  // however long the list gets. Every kind is checked, so a generator the picker cannot name is a
  // hole this finds — the items themselves live in a portal a server render never reaches.
  it.each(GEN_KINDS)("names %s on its one trigger, and gives no other kind a control", (kind) => {
    const markup = render({ gen: kind, secs: 2 });
    expect(markup).toMatch(new RegExp(`aria-label="Yard A Source"[^>]*>${kind}<`, "u"));
    for (const other of GEN_KINDS) {
      if (other !== kind) expect(markup).not.toContain(`>${other}<`);
    }
  });

  it("says Source while the yard is holding nothing", () => {
    expect(render()).toMatch(/aria-label="Yard A Source"[^>]*>Source</u);
  });

  /**
   * P70: a pitch dialled in whole hertz steps over every beat between two yards. The rule for
   * what a load accepts is `isGenHz` and it always took a fraction; what the spinner moves by is
   * this, and it is the field's own declaration rather than the one "any" both fields shared.
   */
  it("dials a frequency in fractions of a hertz and a length in anything", () => {
    const markup = render({ gen: "tone", secs: 2, hz: 440.25 });
    expect(markup).toMatch(/id="a-hz"[^>]*step="0.01"/u);
    expect(markup).toMatch(/id="a-hz"[^>]*value="440.25"/u);
    expect(markup).toMatch(/id="a-secs"[^>]*step="any"/u);
  });
});

describe("Deck effect rack", () => {
  it("offers the picker and shows no controls for an empty rack", () => {
    const markup = renderEffects();
    expect(markup).toContain('aria-label="Add an Effect to Yard A"');
    expect(markup).not.toContain('aria-label="Cutoff"');
    expect(markup).not.toContain('aria-label="Time"');
    expect(markup).not.toContain('aria-label="Feedback"');
    expect(markup).not.toContain('aria-label="Mix"');
  });

  it("renders active controls in rack order from registry labels and ranges", () => {
    const markup = renderEffects((instrument) => {
      instrument.send({ t: "effect.add", deck: "a", id: "flt", effect: "filter" });
      instrument.send({ t: "effect.add", deck: "a", id: "dly", effect: "delay" });
      instrument.send({
        t: "param.set",
        deck: "a",
        instance: "dly",
        param: "delay.mix",
        value: 0.7,
      });
    });

    // A card is numbered among its own effect's instances, so one filter and one delay are both
    // the first of their kind; the rack's order is the order they are rendered in (0076).
    expect(markup.indexOf('aria-label="Filter 1"')).toBeLessThan(
      markup.indexOf('aria-label="Delay 1"'),
    );
    // The picker never runs out: a rack holds any number of instances of one entry (0030).
    expect(markup).toContain('aria-label="Add an Effect to Yard A"');
    expect(markup).toMatch(
      /aria-label="Cutoff"[^>]*aria-valuemin="20"[^>]*aria-valuemax="20000"[^>]*aria-valuenow="1000"/u,
    );
    expect(markup).toMatch(/aria-label="Mix"[^>]*aria-valuenow="0.7"/u);
  });
});

describe("Deck automation", () => {
  it("puts automation on the knob itself, with no lane editor or picker beside it (0028)", () => {
    const markup = render();
    expect(markup).toContain('aria-label="Gain"');
    // The lane preview, its picker and its point gestures are gone: a knob is the whole
    // affordance, and what it is holding is drawn on the knob (0028).
    expect(markup).not.toContain("Draw Yard A Gain Automation");
    expect(markup).not.toContain('aria-label="Yard A Automation Target"');
    expect(markup).not.toContain("Automate Gain");
  });
});

/** A repository that records what it was handed, so a refused import is a visibly empty list. */
const ingestingRepository = (ingested: Blob[]): SessionRepository => ({
  load: () => Promise.resolve(),
  save: () => Promise.resolve(),
  ingest: (received) => {
    ingested.push(received);
    return Promise.resolve("stored-id");
  },
  blob: () => Promise.resolve(new Blob()),
  blobs: () => Promise.resolve(new Map()),
  replace: () => Promise.resolve(),
});

const importing = async (name: string) => {
  const ingested: Blob[] = [];
  const instrument = createInstrument(manualClock(), stubEngine, ingestingRepository(ingested));
  await instrument.ready;
  const file = new File([new Uint8Array([1, 2, 3])], name, { type: "" });
  const failure = await importDeckFile(instrument, "a", file).then(() => null, String);
  await Promise.resolve();
  return { file, ingested, failure, source: instrument.probe().decks.a!.source };
};

describe("Deck file import", () => {
  it("ingests once and loads only the returned blob id", async () => {
    const { file, ingested, failure, source } = await importing("sample.wav");

    expect(failure).toBeNull();
    expect(ingested).toEqual([file]);
    expect(source).toEqual({ blobId: "stored-id" });
  });

  // P18: every format is the same import, and the file itself is what reaches the store — the
  // identity is the assertion, because a converting path would hand over something else (0043).
  it("hands every accepted format to one ingest, exactly as it arrived", async () => {
    const imports = await Promise.all(
      ["track.m4a", "track.flac", "track.ogg", "track.mp3", "track.aiff"].map((name) =>
        importing(name),
      ),
    );

    for (const { file, ingested, source } of imports) {
      expect(ingested).toEqual([file]);
      expect(source).toEqual({ blobId: "stored-id" });
    }
  });

  // Loudly, and before the blob store has been touched: a file nothing can decode is not
  // something to keep bytes of.
  it("refuses an unaccepted file without storing it or touching the deck", async () => {
    const { ingested, failure, source } = await importing("notes.txt");

    expect(failure).toContain("notes.txt");
    expect(ingested).toEqual([]);
    expect(source).toBeNull();
  });

  it("offers the picker exactly the formats it accepts", () => {
    expect(render()).toContain(`accept="${AUDIO_FILE_ACCEPT}"`);
  });
});

/** The first element of `type` in this tree — how a child's handler is reached and pressed. */
const find = (node: unknown, type: unknown): ReactTypes.ReactElement | null => {
  if (!isValidElement<{ children?: unknown }>(node)) return null;
  if (node.type === type) return node;
  const kids = node.props.children;
  for (const child of Array.isArray(kids) ? kids : [kids]) {
    const hit = find(child, type);
    if (hit !== null) return hit;
  }
  return null;
};

/**
 * P19: a file dropped on the waveform is the picker's import, reached the other way — one
 * `deck.load` carrying the same serialisable handle, and nothing new in the command union.
 */
describe("Deck file drop", () => {
  const dropping = async (name: string, active: boolean) => {
    const ingested: Blob[] = [];
    const instrument = createInstrument(manualClock(), stubEngine, ingestingRepository(ingested));
    await instrument.ready;
    const sent = vi.spyOn(instrument, "send");
    const waveform = find(
      Deck({ instrument, deck: "a", emoji: "🌴", name: "North Willow", active }),
      Waveform,
    );
    if (!isValidElement<{ onFile: (file: File) => void }>(waveform)) {
      throw new Error("the deck drew no waveform");
    }
    const file = new File([new Uint8Array([1, 2, 3])], name, { type: "" });

    waveform.props.onFile(file);
    await Promise.resolve();
    await Promise.resolve();

    return { file, ingested, sent, probe: instrument.probe() };
  };

  it("loads the dropped file through the one ingest the picker uses", async () => {
    const { file, ingested, sent } = await dropping("dropped.wav", true);

    expect(ingested).toEqual([file]);
    expect(sent).toHaveBeenCalledWith({
      t: "deck.load",
      deck: "a",
      source: { blobId: "stored-id" },
    });
  });

  it("activates the deck it landed on, which no pointer press announced (P16)", async () => {
    const { sent } = await dropping("dropped.wav", false);

    expect(sent).toHaveBeenCalledWith({ t: "deck.activate", deck: "a" });
  });

  it("refuses a file the shared declaration does not accept, without storing it", async () => {
    const { ingested, sent } = await dropping("notes.txt", true);

    expect(ingested).toEqual([]);
    expect(sent).not.toHaveBeenCalledWith(expect.objectContaining({ t: "deck.load", deck: "a" }));
  });
});

type Props = { onPointerDownCapture?: () => void };

type Labelled = { "aria-label"?: string; children?: ReactNode; onClick?: () => void };

function findLabelled(node: ReactNode, label: string): Labelled | null {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<Labelled>(child)) continue;
    if (child.props["aria-label"] === label) return child.props;
    const found = findLabelled(child.props.children ?? null, label);
    if (found !== null) return found;
  }
  return null;
}

/** The props of the one element of this type in a held tree — for a child whose props say it. */
function findOfType(node: ReactNode, type: unknown): Record<string, unknown> | null {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<{ children?: ReactNode }>(child)) continue;
    if (child.type === type) return child.props;
    const found = findOfType(child.props.children ?? null, type);
    if (found !== null) return found;
  }
  return null;
}

/** The one control in a held tree carrying this label, so its own handler can be pressed. */
function labelled(node: ReactNode, label: string): Labelled {
  const found = findLabelled(node, label);
  if (found === null) throw new Error(`no control labelled ${label}`);
  return found;
}

/** One deck's element tree, held rather than serialised, so its own handler can be pressed. */
const panel = (active: boolean) => {
  const instrument = createInstrument(manualClock(), stubEngine);
  const sent = vi.spyOn(instrument, "send");
  const root = Deck({ instrument, deck: "a", emoji: "🌴", name: "North Willow", active });
  if (!isValidElement<Props>(root)) throw new Error("deck rendered no panel");
  return { instrument, sent, props: root.props };
};

/**
 * P32: the fold is a view preference. The header row survives it and nothing under it does, and
 * the control reports which way it is folded rather than swapping its picture (0055).
 */
/**
 * P73: the heading is the control. The yard's name sits inside the toggle rather than three
 * elements away from it, so the press target is the whole heading and the control's accessible
 * name is what the heading says — the emoji staying hidden from it, as it always was.
 */
const FOLD_HEADING =
  /data-slot="toggle"[^>]*><span class="type-title"><span aria-hidden="true">🌴<\/span> Yard A<\/span>/u;

describe("Deck collapse", () => {
  const foldedTo = (collapsed: boolean) => {
    view.collapsed = collapsed;
    view.seeded = false;
    try {
      return render({ gen: "click-train", secs: 2, hz: 8 });
    } finally {
      view.collapsed = false;
    }
  };

  it("draws the header and no waveform once it is folded shut", () => {
    const markup = foldedTo(true);

    expect(markup).toContain("Yard A");
    expect(markup).toMatch(FOLD_HEADING);
    expect(markup).toContain('aria-pressed="true"');
    // The words moved inside the control, so nothing is left labelling it from outside.
    expect(markup).not.toContain("Collapse Yard A");
    // Everything below the header, gone: the peaks, the source picker and the transport.
    expect(markup).not.toContain("Yard A Waveform");
    expect(markup).not.toContain('aria-label="Yard A Source"');
    expect(markup).not.toContain('aria-label="Play Yard A"');
  });

  it("draws all of it when it is open, with the fold reporting open", () => {
    const markup = foldedTo(false);

    expect(markup).toContain("Yard A Waveform");
    expect(markup).toContain('aria-label="Yard A Source"');
    expect(markup).toMatch(FOLD_HEADING);
    // The caret still turns with the state rather than being a second icon (0055).
    expect(markup).toContain("group-aria-pressed/toggle:rotate-180");
  });
});

/**
 * P76: everything below the header is behind the fold, and the drift was under the peaks — so the
 * picture moves up into the slack the header already had, and a yard folded shut still says what
 * it is doing.
 */
describe("a folded yard's drift", () => {
  it("draws it in the header, and draws it once", () => {
    view.collapsed = true;
    view.seeded = false;
    try {
      // A rack instance is a row of the picture whether or not a lane bends it (0098), so one
      // effect is all it takes for this yard to have a drift to draw.
      const markup = renderEffects((instrument) => {
        instrument.send({ t: "effect.add", deck: "a", id: "dly", effect: "delay" });
      });

      // In the header instead of under the peaks, never in both places.
      expect(markup.match(/aria-label="Yard A Drift"/gu)).toHaveLength(1);
      expect(markup).not.toContain("Yard A Waveform");
    } finally {
      view.collapsed = false;
      view.seeded = false;
    }
  });
});

/**
 * The gestures that are about the whole yard sit in the yard's own group, where the thing they
 * are about is — and the fold takes none of them away, because a folded yard is still a yard you
 * can copy, capture or remove (0078). The fold itself is not one of them: it is the heading at
 * the other end of the same header (P73).
 */
describe("the yard's own button group", () => {
  it.each([true, false])(
    "offers capture, duplicate, remove and the fold, folded=%s",
    (collapsed) => {
      view.collapsed = collapsed;
      view.seeded = false;
      try {
        const markup = render({ gen: "click-train", secs: 2, hz: 8 });

        expect(markup).toContain('aria-label="Capture Yard A"');
        expect(markup).toContain('aria-label="Duplicate Yard A"');
        expect(markup).toContain('aria-label="Remove Yard A"');
        expect(markup).toMatch(FOLD_HEADING);
      } finally {
        view.collapsed = false;
      }
    },
  );

  it.each([
    { label: "Capture Yard A", command: { t: "clip.capture", deck: "a", name: "clip 1" } },
    { label: "Duplicate Yard A", command: { t: "deck.duplicate", deck: "a", to: "b" } },
  ])("sends $command.t from the yard it sits on", ({ label, command }) => {
    const instrument = createInstrument(manualClock(), stubEngine);
    const sent = vi.spyOn(instrument, "send");
    const root = Deck({ instrument, deck: "a", emoji: "🌴", name: "North Willow", active: true });

    labelled(root, label).onClick?.();

    expect(sent).toHaveBeenCalledWith(expect.objectContaining(command));
  });
});

/**
 * P64: the rack folds too, and the yard is where that flag lives — the rack is rendered under the
 * yard's own fold, so a flag held inside it would be thrown away every time the yard was folded
 * and opened again. A view preference either way (plan §2).
 */
describe("the rack's fold", () => {
  it("is held by the yard rather than by the rack it folds", () => {
    const instrument = createInstrument(manualClock(), stubEngine);
    const root = Deck({ instrument, deck: "a", emoji: "🌴", name: "North Willow", active: true });
    const rack = findOfType(root, EffectRack);

    expect(rack).not.toBeNull();
    // The pair the yard's own `useState` handed it: the flag it draws, and the call that sets it.
    const fold: unknown = rack?.["fold"];
    if (!Array.isArray(fold)) throw new Error("the yard handed its rack no fold");
    expect(fold[0]).toBe(false);
    expect(typeof fold[1]).toBe("function");
  });
});

/** Selection is what a pointer lands on, not a button beside it (0019, P16). */
describe("Deck activation", () => {
  it("sends deck.activate when a press lands inside an inactive deck", () => {
    const { instrument, sent, props } = panel(false);
    sent.mockClear();

    props.onPointerDownCapture?.();

    expect(sent).toHaveBeenCalledWith({ t: "deck.activate", deck: "a" });
    expect(instrument.probe().activeDeck).toBe("a");
  });

  it("sends nothing when the press lands inside the deck already active", () => {
    const { sent, props } = panel(true);
    sent.mockClear();

    props.onPointerDownCapture?.();

    expect(sent).not.toHaveBeenCalled();
  });
});
