/**
 * @role What a parameter that names its steps is drawn as, what it says, and what picking one
 *   sends — the picker's half of the rack's knob row (0325).
 * @instead What a dial sends, and the lane a hand rides onto one → src/ui/ParameterKnob.test.tsx.
 *   Which control the rack chooses between, per card → src/ui/EffectRack.test.tsx.
 */
// One import per thing this control is checked against — the instrument it sends through, the
// registry it is drawn from and the shapes it names — so the count tracks the control's surface.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { Children, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { manualClock } from "@/app/clock";
import type { Command, Envelope } from "@/app/commands";
import type { Instrument } from "@/app/facade";
import { createInstrument } from "@/app/facade";
import { effectById } from "@/audio/effects/registry";
import { PARAMS } from "@/audio/params";
import { EQ_SHAPE_NAMES, EQ_SHAPES } from "@/lib/biquad";
import { dialsOf, markupOf } from "@/ui/effectRackDouble";
import { ParameterChoice } from "@/ui/ParameterChoice";

/** One rack on yard a holding one EQ/Filter — the entry that declares the only choice there is. */
const withEq = (): ReturnType<typeof createInstrument> => {
  const instrument = createInstrument(manualClock());
  instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "eq" });
  return instrument;
};

/**
 * The one thing in a held tree that answers with a value of its own — the picker's root, which is
 * where a chosen name arrives and where the command goes out. Found by the handler rather than by
 * a name, because the name is on the trigger the root renders.
 */
function within(node: ReactNode): ((value: number) => void) | null {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<{ onValueChange?: (value: number) => void; children?: ReactNode }>(child)) {
      continue;
    }
    if (child.props.onValueChange !== undefined) return child.props.onValueChange;
    const deeper = within(child.props.children ?? null);
    if (deeper !== null) return deeper;
  }
  return null;
}

/** The same walk, answering loudly where a tree holds no picker at all. */
function findValueChange(node: ReactNode): (value: number) => void {
  const found = within(node);
  if (found === null) throw new Error("no picker in this tree");
  return found;
}

describe("a parameter drawn as a choice", () => {
  /**
   * The picker stands where the dial stood: the same column in the same row, named by the same
   * label, marked the way every dial in a rack is marked so ./scripts/smoke counts the row the
   * way it counts a row of knobs. Every other parameter of that entry is still a dial.
   */
  it("is drawn in the knob's place, with the knob's label and marks", () => {
    const markup = markupOf(withEq());

    // The row is unchanged in length and order: one marked, named control per declaration.
    expect(dialsOf(markup)).toEqual(effectById("eq").params.map((param) => PARAMS[param.id].label));
    // The shape is the one that is not a dial, and it reads out the name it stands at. And an
    // amount still is: a frequency stays a dial. A picker is never armed — a value written onto a
    // node's own type has no lane (0322).
    expect(markup).toMatch(/data-slot="select-trigger"[^>]*aria-label="Shape"/u);
    expect(markup).toContain(EQ_SHAPE_NAMES[PARAMS["eq.shape"].default]!);
    expect(markup).not.toMatch(/role="slider"[^>]*aria-label="Shape"/u);
    expect(markup).toMatch(/role="slider"[^>]*aria-label="Freq"/u);
    expect(markup).not.toContain('data-automation="armed"');
  });
});

describe("what picking a choice sends", () => {
  /** The ordinary `param.set` (0089), so a choice undoes, persists, archives and drives
   *  exactly as a turn of a knob does. */
  it("sends the chosen index through the command a turn sends", () => {
    const instrument = withEq();
    const sent: (Command | Envelope)[] = [];
    const watched: Instrument = {
      ...instrument,
      send: (command) => {
        sent.push(command);
        instrument.send(command);
      },
    };
    let held: ReactNode = null;
    function Probe(): null {
      held = ParameterChoice({
        instrument: watched,
        deck: "a",
        instance: "one",
        param: "eq.shape",
        value: PARAMS["eq.shape"].default,
      });
      return null;
    }
    renderToStaticMarkup(<Probe />);

    findValueChange(held)(EQ_SHAPES.indexOf("bandpass"));
    expect(instrument.state.getState().decks.a!.effects[0]!.params["eq.shape"]).toBe(
      EQ_SHAPES.indexOf("bandpass"),
    );
    // The ordinary command, on the instance holding the value (0030) — and the gesture ended where
    // the press landed, so the pick after it is its own entry to undo (0067).
    expect(sent).toEqual([
      {
        t: "param.set",
        deck: "a",
        instance: "one",
        param: "eq.shape",
        value: EQ_SHAPES.indexOf("bandpass"),
      },
      { t: "gesture.end" },
    ]);
  });
});
