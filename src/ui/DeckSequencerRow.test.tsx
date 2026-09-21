/**
 * @role What the sequence row draws and sends: one picker, one dial and one remove per step, the
 *   add on the end, the empty run said in words, and every edit as one whole-run `deck.sequence`
 *   closed by a gesture end (0379).
 */
import { Children, isValidElement, type ReactNode } from "react";
import type * as ReactTypes from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The hooks the row calls, made callable outside a renderer so the gesture cases below can hold
// the element tree and press it — the shape src/ui/Deck.test.tsx takes. The cursor's ref and the
// frame it paints on are effects, which never run in a server render.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useMemo: (factory: () => unknown) => factory(),
    useRef: (initial: unknown) => ({ current: initial }),
    useEffect: () => {},
    useLayoutEffect: () => {},
  };
});

import { manualClock } from "@/app/clock";
import { silentEngine } from "@/app/engineDouble";
import { createInstrument } from "@/app/facade";
import {
  readSequenceSecs,
  SEQUENCE_ADD_LABEL,
  SEQUENCE_EMPTY,
  sequenceSecsLabel,
} from "@/lib/copySequence";
import type { DeckSequence } from "@/lib/deckSequence";
import { DeckSequencerRow, SequencePlayToggle } from "@/ui/DeckSequencerRow";

const BREATH: DeckSequence = [
  { kind: "in", secs: 120 },
  { kind: "play", secs: 300 },
  { kind: "out", secs: 60 },
];

type Labelled = { "aria-label"?: string; children?: ReactNode; onClick?: () => void };

/** The props of the first element in this tree wearing `label`. */
function findLabelled(node: ReactNode, label: string): Labelled | null {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<Labelled>(child)) continue;
    if (child.props["aria-label"] === label) return child.props;
    const found = findLabelled(child.props.children ?? null, label);
    if (found !== null) return found;
  }
  return null;
}

type Pressable = { pressed?: boolean; onPressedChange?: () => void; children?: ReactNode };

/** The props of the first element in this tree that reports a pressed state: the play toggle. */
function findPressable(node: ReactNode): Pressable | null {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<Pressable>(child)) continue;
    if (child.props.pressed !== undefined) return child.props;
    const found = findPressable(child.props.children ?? null);
    if (found !== null) return found;
  }
  return null;
}

type StepProps = {
  index: number;
  children?: ReactNode;
  onKind: (index: number, kind: string) => void;
  onSecs: (index: number, secs: number) => void;
  onRemove: (index: number) => void;
};

/** The props of the step row at `index` — a component element, whose handlers are its props. */
function findStep(node: ReactNode, index: number): StepProps | null {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<Partial<StepProps>>(child)) continue;
    const { props } = child;
    if (
      props.index === index &&
      props.onKind !== undefined &&
      props.onSecs !== undefined &&
      props.onRemove !== undefined
    ) {
      return { index, onKind: props.onKind, onSecs: props.onSecs, onRemove: props.onRemove };
    }
    const found = findStep(props.children ?? null, index);
    if (found !== null) return found;
  }
  return null;
}

const row = (steps: DeckSequence) => {
  const instrument = createInstrument(manualClock(), () => silentEngine());
  const sent = vi.spyOn(instrument, "send");
  const element = DeckSequencerRow({ instrument, deck: "a", steps, playing: false });
  return { element, sent, markup: renderToStaticMarkup(element) };
};

// One case per gesture the row offers — the toggle, the empty add, a pick, a remove, a typed length
// — and every one asserts the whole run the row sends, so the cases share one fixture and one
// reading of the command. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the sequence row", () => {
  it("plays and pauses the yard through the one toggle the transport sends", () => {
    const instrument = createInstrument(manualClock(), () => silentEngine());
    const sent = vi.spyOn(instrument, "send");
    const element = SequencePlayToggle({ instrument, deck: "a", playing: false, loaded: true });
    expect(renderToStaticMarkup(element)).toContain(">Play<");
    findPressable(element)?.onPressedChange?.();
    expect(sent).toHaveBeenLastCalledWith({ t: "deck.play.toggle", deck: "a" });
    const paused = SequencePlayToggle({ instrument, deck: "a", playing: true, loaded: true });
    expect(renderToStaticMarkup(paused)).toContain(">Pause<");
  });

  it("says the run is empty, and offers the add", () => {
    const { markup } = row([]);
    expect(markup).toContain(SEQUENCE_EMPTY);
    expect(markup).toContain(`aria-label="${SEQUENCE_ADD_LABEL}"`);
    expect(markup).not.toContain("Sequence 1");
  });

  it("draws a picker, a length in minutes and a remove per step, and the picture", () => {
    const { markup } = row(BREATH);
    for (const ordinal of [1, 2, 3]) {
      expect(markup).toContain(`aria-label="Sequence ${ordinal} Kind"`);
      expect(markup).toContain(`aria-label="Remove Sequence ${ordinal}"`);
    }
    // The length reads as minutes and seconds, which is how a hand thinks of a run.
    expect(markup).toContain(sequenceSecsLabel(120));
    expect(sequenceSecsLabel(120)).toBe("2:00");
    expect(sequenceSecsLabel(5)).toBe("0:05");
    // The picture is a band per step, as wide as the step is long, under one path with a point
    // per edge; the empty run draws neither.
    expect(markup).toContain('style="width:25%"');
    expect(markup).toMatch(/<path d="M0 16 L[^"]+"/u);
    expect(row([]).markup).not.toContain('data-slot="sequence-playhead"');
  });

  it("sends the whole run for a pick, an add and a remove, each a gesture of its own", () => {
    const { element, sent } = row(BREATH);
    findStep(element, 1)?.onKind(1, "rest");
    expect(sent.mock.calls.slice(-2)).toEqual([
      [
        {
          t: "deck.sequence",
          deck: "a",
          steps: [BREATH[0], { kind: "rest", secs: 300 }, BREATH[2]],
        },
      ],
      [{ t: "gesture.end" }],
    ]);
    findLabelled(element, SEQUENCE_ADD_LABEL)?.onClick?.();
    expect(sent).toHaveBeenLastCalledWith({ t: "gesture.end" });
    expect(sent.mock.calls.at(-2)).toEqual([
      { t: "deck.sequence", deck: "a", steps: [...BREATH, { kind: "play", secs: 60 }] },
    ]);
    findStep(element, 0)?.onRemove(0);
    expect(sent.mock.calls.at(-2)).toEqual([
      { t: "deck.sequence", deck: "a", steps: BREATH.slice(1) },
    ]);
  });

  it("sends the run once for a typed length, whole seconds, as a gesture of its own", () => {
    const { element, sent } = row(BREATH);
    findStep(element, 2)?.onSecs(2, 90.4);
    expect(sent.mock.calls).toEqual([
      [{ t: "deck.sequence", deck: "a", steps: [BREATH[0], BREATH[1], { kind: "out", secs: 90 }] }],
      [{ t: "gesture.end" }],
    ]);
  });

  it("reads a typed length as minutes and seconds, as seconds, or as minutes alone", () => {
    expect(readSequenceSecs("2:30")).toBe(150);
    expect(readSequenceSecs(" 0:05 ")).toBe(5);
    expect(readSequenceSecs("150")).toBe(150);
    expect(readSequenceSecs("2m")).toBe(120);
    expect(readSequenceSecs("1.5m")).toBe(90);
    // A hand that has not finished is refused, not read as nought (P5).
    expect(readSequenceSecs("")).toBeUndefined();
    expect(readSequenceSecs("2:")).toBeUndefined();
    expect(readSequenceSecs("soon")).toBeUndefined();
  });
});
