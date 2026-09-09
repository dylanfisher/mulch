/**
 * @role What the tap and the hold a tapped parameter wears beside its dial draw and send — the
 *   rack's own controls for a parameter that declared `beat` (0326).
 */
import { Children, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { manualClock } from "@/app/clock";
import type { EffectParamId } from "@/audio/params";
import { createInstrument } from "@/app/facade";
import { paramKey } from "@/audio/params";
import { rackLabel } from "@/lib/copy";
import type { RackId } from "@/state/store";
import { SlotControls } from "@/ui/EffectRack";
import { findLabelled, labels, markupOf, rackBeat } from "@/ui/effectRackDouble";
import { heldValue, ParameterBeat, type RackBeat } from "@/ui/ParameterBeat";
import type { ParameterKnobProps } from "@/ui/ParameterKnob";

/**
 * The two gestures one tapped parameter wears, and the dial they stand beside — the control called
 * as the plain function it is, inside a render of its own, so the press and the rounding it hands
 * the dial are both reachable. The dial itself is the element the control builds: what a turn of
 * it does with that rounding is the knob's own suite (src/ui/ParameterKnob.test.tsx).
 */
const beatControls = (
  instrument: ReturnType<typeof createInstrument>,
  beat: RackBeat,
  deck: RackId = "a",
) => {
  const built: { node: ReactNode } = { node: null };
  function Probe(): null {
    built.node = ParameterBeat({
      instrument,
      deck,
      instance: "one",
      name: "Delay 1",
      param: "delay.time",
      // The delay's own declared default, which is what a fresh card is standing at
      // (src/audio/effects/delay.ts).
      value: 0.25,
      lane: null,
      drawn: null,
      playing: false,
      beat,
    });
    return null;
  }
  renderToStaticMarkup(<Probe />);
  const node = built.node;
  const [dial] = Children.toArray(
    isValidElement<{ children: ReactNode }>(node) ? node.props.children : null,
  );
  if (!isValidElement<Required<Pick<ParameterKnobProps, "round">>>(dial)) {
    throw new Error("the tapped parameter drew no dial");
  }
  const tap = findLabelled(node, `${rackLabel(deck)} Delay 1 Time Tap`);
  const hold = findLabelled(node, `${rackLabel(deck)} Delay 1 Time Beat`);
  if (tap === null || hold === null) throw new Error("the tapped parameter drew no tap or hold");
  return { dial: dial.props, controls: { tap, hold } };
};

// One case per thing the two gestures answer for — what they draw, what a press writes, what the
// rounding they hand the dial says, and what a rack with no grid refuses. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("a tapped parameter's own two gestures", () => {
  /**
   * The tap and the hold a parameter that declared `beat` wears, drawn off the declaration and
   * never off the effect's id: the delay's Time has them and its Feedback and Mix, which are
   * amounts rather than lengths, have neither (0326).
   */
  it("draws a tap and a hold beside a tapped parameter's dial and beside no other", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "delay" });
    const drawn = labels(markupOf(instrument, undefined, rackBeat(120)));

    expect(drawn).toContain("Yard A Delay 1 Time Tap");
    expect(drawn).toContain("Yard A Delay 1 Time Beat");
    expect(drawn).not.toContain("Yard A Delay 1 Feedback Tap");
    expect(drawn).not.toContain("Yard A Delay 1 Mix Beat");
    // And nowhere near a card whose entry declares no such parameter at all.
    const other = createInstrument(manualClock());
    other.send({ t: "effect.add", deck: "a", id: "one", effect: "eq" });
    expect(labels(markupOf(other, undefined, rackBeat(120))).join(" ")).not.toContain("Tap");
  });

  /**
   * Four presses on the tap are three intervals, and what is written is their mean — through the
   * same command a turn of the dial sends, so it undoes, persists and drives like any other value
   * (0089). A press with nothing before it writes nothing at all: an interval needs two.
   */
  it("writes the interval a hand taps out, and writes nothing on the first press", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "delay" });
    const { controls } = beatControls(instrument, rackBeat(0));
    const sent = vi.spyOn(instrument, "send");
    const at = vi.spyOn(performance, "now");

    at.mockReturnValue(1000);
    controls.tap.onClick!();
    expect(sent).not.toHaveBeenCalled();

    for (const when of [1400, 1800, 2200]) {
      at.mockReturnValue(when);
      controls.tap.onClick!();
    }
    at.mockRestore();
    const wrote = sent.mock.calls.map(([command]) => command);
    // Three presses after the first, each writing once: 400ms between them, snapped onto the
    // burst's own step, is what every one of them wrote.
    expect(wrote.filter((command) => "t" in command && command.t === "param.set")).toEqual([
      { t: "param.set", deck: "a", instance: "one", param: "delay.time", value: 0.4 },
      { t: "param.set", deck: "a", instance: "one", param: "delay.time", value: 0.4 },
      { t: "param.set", deck: "a", instance: "one", param: "delay.time", value: 0.4 },
    ]);
    // And nothing else: a run of taps carries one key converging on one value, so it is one
    // gesture and history closes it when the presses stop — the burst row's own shape. A
    // `gesture.end` per press would leave an undo entry holding each intermediate mean (0067).
    expect(wrote).toHaveLength(3);
  });

  /**
   * With the hold on, everything written to the dial is rounded onto a whole division of the
   * sounding beat first — the one rounding in front of the command, which the dial is handed and
   * the tap calls itself (principle 1). At 120bpm the beat is half a second, so 0.3s is nearer a
   * quarter of it than an eighth.
   */
  it("hands the dial a rounding onto the beat exactly while the hold is on", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "delay" });
    const key = paramKey("one", "delay.time");
    const loose = beatControls(instrument, rackBeat(120));
    // Nothing is rounded until the hold is pressed: the dial writes what it was turned to.
    expect(loose.dial.round(0.3)).toBe(0.3);

    const held = beatControls(instrument, { ...rackBeat(120), holds: new Set([key]) });
    expect(held.dial.round(0.3)).toBeCloseTo(0.25, 10);
    expect(held.dial.round(0.1)).toBeCloseTo(0.125, 10);
    // At a sounding beat fast enough that a thirty-second of it falls under the delay's own 10ms
    // floor, the answer is the fastest division the *parameter* can hold — 240bpm is a quarter of
    // a second, whose sixteenth is 0.015625 — and never one the reducer would clamp onto no
    // division at all.
    const quick = beatControls(instrument, { ...rackBeat(240), holds: new Set([key]) });
    expect(quick.dial.round(0.01)).toBeCloseTo(0.015625, 10);
    // And a yard with no grid rounds nothing, whatever the toggle says: there is no beat to round
    // onto (0121, 0173).
    const gridless = beatControls(instrument, { ...rackBeat(0), holds: new Set([key]) });
    expect(gridless.dial.round(0.3)).toBe(0.3);
  });

  /**
   * The rack that is no yard's hears no one deck, so it has no beat to hold to — and the control
   * is refused rather than absent, the way every control under a grid-less deck is (0121, 0173,
   * 0320). The tap is offered there all the same: an interval a hand plays needs no analysis.
   */
  it("refuses the hold and offers the tap on the rack that is no yard's", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: null, id: "one", effect: "delay" });
    const { controls } = beatControls(instrument, rackBeat(0), null);

    expect(controls.hold.disabled).toBe(true);
    expect(controls.tap.disabled ?? false).toBe(false);
    expect(controls.hold["aria-label"]).toBe("Master Delay 1 Time Beat");
  });

  /**
   * And the card's die writes through the same rounding: a throw of the whole card with the hold
   * pressed leaves the time on a division of the beat, because "rounds whatever is written" is one
   * rule and the die is one of the card's writers (0326).
   */
  it("throws the die through the hold, and leaves every other value where it fell", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "delay" });
    const beat: RackBeat = {
      bpm: 120,
      holds: new Set([paramKey("one", "delay.time")]),
      setHold: () => {},
    };
    const round = (param: EffectParamId, value: number) => heldValue(beat, "one", param, value);
    const sent = vi.spyOn(instrument, "send");
    let head: ReactNode = null;
    function Probe(): null {
      head = SlotControls({
        instrument,
        deck: "a",
        instance: "one",
        effect: "delay",
        label: "Delay 1",
        bypassed: false,
        round,
      });
      return null;
    }
    renderToStaticMarkup(<Probe />);
    findLabelled(head, "Randomize Delay 1 on Yard A")!.onClick!();

    const group = sent.mock.calls.map(([command]) => command)[0]!;
    if (!("t" in group) || group.t !== "history.group") throw new Error("the die sent no group");
    const values = new Map(
      group.commands.map((command) => {
        if (command.t !== "param.set") throw new Error(`not a value: ${command.t}`);
        return [command.param, command.value] as const;
      }),
    );
    // The draw itself is `Math.random()`, so what is asserted is the shape the value came out in
    // rather than any one number: every whole division of a 120bpm beat the delay's range holds.
    expect([0.5, 0.25, 0.125, 0.0625, 0.03125, 0.015625]).toContainEqual(values.get("delay.time"));
    // And a value whose parameter declared nothing came through untouched, which is what makes the
    // rounding a rule about the declaration rather than about the card.
    const feedback = values.get("delay.feedback")!;
    expect(round("delay.feedback", feedback)).toBe(feedback);
  });

  /**
   * The hold rounds what is standing the moment it goes on: a toggle that said nothing until the
   * next turn of the dial would be a control a hand cannot tell it pressed (src/ui/playerBurstControls.ts).
   */
  it("rounds the value standing the moment the hold goes on, and lets go again", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "delay" });
    const holds: string[] = [];
    const beat: RackBeat = {
      bpm: 120,
      holds: new Set<string>(),
      setHold: (key, on) => {
        holds.push(`${key} ${String(on)}`);
      },
    };
    const { controls } = beatControls(instrument, beat);
    const sent = vi.spyOn(instrument, "send");

    controls.hold.onPressedChange!(true);
    expect(holds).toEqual([`${paramKey("one", "delay.time")} true`]);
    // The delay ships at a quarter of a second, which at 120bpm is a whole division already — so
    // what proves the write happened is the command, not a change in the number.
    expect(sent.mock.calls.map(([command]) => command)).toEqual([
      { t: "param.set", deck: "a", instance: "one", param: "delay.time", value: 0.25 },
    ]);
  });
});
