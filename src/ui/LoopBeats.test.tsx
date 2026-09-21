/**
 * @role What the beat count beside the loop sends: the loop a count of four at a known tempo
 *   asks for, the counts that are refused, and the yards that are offered no field at all (0389).
 * @instead The count-to-loop arithmetic itself → src/lib/analysis.test.ts. The drags that move
 *   the same loop → ./LoopHandles.test.tsx.
 */
import type { FocusEvent, KeyboardEvent } from "react";
import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return { ...react, useCallback: (callback: unknown) => callback };
});

import { manualClock } from "@/app/clock";
import type { Command } from "@/app/commands";
import { createInstrument } from "@/app/facade";
import { LOOP_BEATS_LABEL } from "@/lib/copyLoop";
import type { DeckState } from "@/state/store";
import { LoopBeats } from "@/ui/LoopBeats";

type Props = {
  id: string;
  label: string;
  "aria-label": string;
  min: number;
  step: number;
  defaultValue: string;
  onBlur: (event: FocusEvent<HTMLInputElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
};

/** A 10-second source at 120bpm — one beat is half a second, so four beats are two. */
const DURATION = 10;
const BPM = 120;

/** The one field a render is, or nothing at all, with the send it would reach the yard through. */
const rendered = (loop: DeckState["loop"], bpm: number = BPM) => {
  const instrument = createInstrument(manualClock());
  const sent = vi.fn<(command: Command) => void>();
  const base = instrument.state.getState().decks.a!;
  const state: DeckState = {
    ...base,
    duration: DURATION,
    loop,
    analysis: { bpm, onsets: [], crest: 2 },
  };
  const root = LoopBeats({ instrument: { ...instrument, send: sent }, deck: "a", state });
  // oxlint-disable-next-line no-unsafe-type-assertion -- the field this component is, or nothing
  return { sent, root, field: root?.props as Props | undefined };
};

/**
 * A blur carrying what the hand typed, and the input it left behind: a number field reads NaN for
 * an empty one, and the component writes the loop's own count back into a refused one.
 */
const blur = (field: Props, typed: string): { value: string } => {
  const input = { valueAsNumber: typed === "" ? NaN : Number(typed), value: typed };
  // oxlint-disable-next-line no-unsafe-type-assertion -- the number and the value are all it reads
  field.onBlur({ currentTarget: input } as unknown as FocusEvent<HTMLInputElement>);
  return input;
};

describe("LoopBeats sends", () => {
  it("sends a loop of four beats for a count of four at a known tempo", () => {
    const { sent, field } = rendered(null);
    blur(field!, "4");
    expect(sent).toHaveBeenCalledWith({ t: "deck.loop", deck: "a", in: 0, out: 2 });
  });

  it("keeps the loop's own start and moves only its end", () => {
    const { sent, field } = rendered({ in: 1.5, out: 2 });
    blur(field!, "8");
    expect(sent).toHaveBeenCalledWith({ t: "deck.loop", deck: "a", in: 1.5, out: 5.5 });
  });

  it("sends the count typed over a rounded read, at the loop's own start", () => {
    const { sent, field } = rendered({ in: 0, out: 2.02 });
    blur(field!, "6");
    expect(sent).toHaveBeenCalledWith({ t: "deck.loop", deck: "a", in: 0, out: 3 });
  });

  it("commits on Enter and on no other key", () => {
    const { sent, field } = rendered(null);
    const press = (key: string) => {
      const event = { key, currentTarget: { valueAsNumber: 4, value: "4" } };
      // oxlint-disable-next-line no-unsafe-type-assertion -- the key and the number are all it reads
      field!.onKeyDown(event as unknown as KeyboardEvent<HTMLInputElement>);
    };
    press("a");
    expect(sent).not.toHaveBeenCalled();
    press("Enter");
    expect(sent).toHaveBeenCalledWith({ t: "deck.loop", deck: "a", in: 0, out: 2 });
  });
});

describe("LoopBeats shows", () => {
  it("is labelled for the yard it belongs to and offers whole beats from one", () => {
    const { field } = rendered(null);
    expect(field?.label).toBe(LOOP_BEATS_LABEL);
    expect(field?.["aria-label"]).toBe(`Yard A Loop ${LOOP_BEATS_LABEL}`);
    expect(field?.id).toBe("a-loop-beats");
    expect(field?.min).toBe(1);
    expect(field?.step).toBe(1);
  });
  it("is remounted on the loop and not on the count, so a typed number never outlives its start", () => {
    // Two loops a hand reads as the same four beats: a key of the count would hold the field
    // across the drag between them, and the half-typed number in it would commit at 3s.
    expect(rendered({ in: 0, out: 2 }).root?.key).not.toBe(
      rendered({ in: 3, out: 5.02 }).root?.key,
    );
    expect(rendered({ in: 0, out: 2 }).root?.key).toBe(rendered({ in: 0, out: 2 }).root?.key);
  });

  it("shows no field for a source the analysis found no tempo in", () => {
    expect(rendered(null, 0).root).toBeNull();
  });
  it("reads the loop back as a whole count, and nothing for a yard with no loop", () => {
    expect(rendered({ in: 0, out: 2 }).field?.defaultValue).toBe("4");
    // Rounded: a drag lands where the hand let go, not on a count.
    expect(rendered({ in: 0, out: 2.02 }).field?.defaultValue).toBe("4");
    expect(rendered(null).field?.defaultValue).toBe("");
  });
});

describe("LoopBeats refuses", () => {
  it("a field still reading what it was handed, so a tab through is never an edit", () => {
    const { sent, field } = rendered({ in: 0, out: 2 });
    blur(field!, "4");
    expect(sent).not.toHaveBeenCalled();
    // And for the fractional loop the count is a rounding of, which is most of them: a blur
    // that typed nothing must not square the loop up behind the hand.
    const fractional = rendered({ in: 0, out: 2.02 });
    blur(fractional.field!, "4");
    expect(fractional.sent).not.toHaveBeenCalled();
  });

  it("a count that would run past the end of the source, putting the loop's own back", () => {
    const { sent, field } = rendered({ in: 0, out: 2 });
    expect(blur(field!, "64").value).toBe("4");
    expect(sent).not.toHaveBeenCalled();
  });

  it("a count of no whole beats", () => {
    const { sent, field } = rendered(null);
    expect(blur(field!, "0").value).toBe("");
    expect(blur(field!, "1.5").value).toBe("");
    expect(blur(field!, "").value).toBe("");
    expect(sent).not.toHaveBeenCalled();
  });
});
