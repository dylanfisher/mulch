/**
 * @role The word a hand writes on a yard, as the field that holds it: what a commit sends, what
 *   an unchanged field does not, and the bound a word is refused past (0386).
 * @instead What the tag then does to the session → src/app/deckHeader.test.ts. Where the word is
 *   read back beside a yard's name → ./EffectMove.test.tsx.
 */
import type { FocusEvent, KeyboardEvent } from "react";
import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return { ...react, useCallback: (callback: unknown) => callback };
});

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { TAG_HINT, TAG_LABEL } from "@/lib/copyTag";
import { DURABLE_TEXT_MAX } from "@/lib/guards";
import { DeckTag } from "@/ui/DeckTag";

type Props = {
  id: string;
  label: string;
  hint: string;
  "aria-label": string;
  maxLength: number;
  defaultValue: string;
  onBlur: (event: FocusEvent<HTMLInputElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
};

const rendered = (tag: string) => {
  const instrument = createInstrument(manualClock());
  const sent = vi.spyOn(instrument, "send");
  const root = DeckTag({ instrument, deck: "a", tag });
  // oxlint-disable-next-line no-unsafe-type-assertion -- the field this component is
  return { instrument, sent, field: root.props as Props };
};

/** A blur carrying what the hand typed, which is the one thing the field reads off the input. */
const blur = (field: Props, value: string): void => {
  // oxlint-disable-next-line no-unsafe-type-assertion -- only `currentTarget.value` is read
  field.onBlur({ currentTarget: { value } } as FocusEvent<HTMLInputElement>);
};

const press = (field: Props, key: string, value: string): void => {
  // oxlint-disable-next-line no-unsafe-type-assertion -- only the key and the value are read
  field.onKeyDown({ key, currentTarget: { value } } as KeyboardEvent<HTMLInputElement>);
};

describe("DeckTag", () => {
  it("is labelled, bounded at the stored shape's own bound, and reads back what the yard holds", () => {
    const { field } = rendered("low end");
    expect(field.label).toBe(TAG_LABEL);
    // A one-word label explains itself by a hover, since it offers nothing else to.
    expect(field.hint).toBe(TAG_HINT);
    expect(field["aria-label"]).toBe(`${TAG_LABEL} Yard A`);
    expect(field.id).toBe("a-tag");
    // Refused before it is typed rather than after, at the bound the validator uses.
    expect(field.maxLength).toBe(DURABLE_TEXT_MAX);
    expect(field.defaultValue).toBe("low end");
  });

  it("commits on blur and on Enter, and sends nothing for any other key", () => {
    const { instrument, sent, field } = rendered("");
    blur(field, "low end");
    expect(sent).toHaveBeenCalledWith({ t: "deck.tag", deck: "a", tag: "low end" });
    expect(instrument.probe().decks.a?.tag).toBe("low end");

    const second = rendered("");
    press(second.field, "Enter", "tops");
    expect(second.instrument.probe().decks.a?.tag).toBe("tops");

    const third = rendered("");
    press(third.field, "a", "half-typed");
    expect(third.sent).not.toHaveBeenCalled();
  });

  it("sends nothing for a word that is already the yard's, so a tab through is not an edit", () => {
    const { sent, field } = rendered("low end");
    blur(field, "low end");
    expect(sent).not.toHaveBeenCalled();
    // And the empty word is an edit like any other: clearing a tag is a thing a hand does.
    blur(field, "");
    expect(sent).toHaveBeenCalledWith({ t: "deck.tag", deck: "a", tag: "" });
  });
});
