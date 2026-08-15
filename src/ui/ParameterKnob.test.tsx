/** @role The Option-held record gesture and the clear-on-normal-move rule of the knob (0024). */
import { isValidElement } from "react";
import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

let held = false;
/** One mount's refs, in hook order, so a re-render sees the same ref a real mount would. */
let refs: { current: unknown }[] = [];
let refIndex = 0;

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    memo: (component: unknown) => component,
    useCallback: (callback: unknown) => callback,
    useRef: (initial: unknown) => (refs[refIndex++] ??= { current: initial }),
  };
});
vi.mock("@/ui/shortcuts", () => ({ useAltHeld: () => held }));

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { LANE_SEAM_SECS } from "@/lib/automation";
import { ParameterKnob } from "@/ui/ParameterKnob";

type KnobHandlers = { onChange: (value: number) => void };
type WrapperProps = {
  onPointerDown: () => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onLostPointerCapture: () => void;
  children: unknown;
  "data-automation": string;
};

function renderKnob(automated: boolean, repeatWindow: number) {
  const clock = manualClock(4);
  const instrument = createInstrument(clock);
  refs = [];
  const render = () => {
    refIndex = 0;
    // The component is memo-wrapped in production and identity-mocked here, so it is callable.
    const rendered = ParameterKnob({
      instrument,
      deck: "a",
      param: "deck.gain",
      value: 1,
      automated,
      repeatWindow,
    });
    if (!isValidElement<WrapperProps>(rendered)) throw new Error("knob rendered no wrapper");
    const knob = rendered.props.children;
    if (!isValidElement<KnobHandlers>(knob)) throw new Error("wrapper rendered no knob");
    return { wrapper: rendered.props, knob: knob.props };
  };
  return { clock, instrument, render, ...render() };
}

// One control's two automation gestures stay visible together: recording and clearing are the
// same knob, and separating them hides the exclusivity. See 0007.
// oxlint-disable-next-line max-lines-per-function
describe("ParameterKnob automation gestures", () => {
  it("records one whole lane while Option is held, repeated across the window", () => {
    held = true;
    try {
      const { clock, instrument, wrapper, knob } = renderKnob(false, 4);
      expect(wrapper["data-automation"]).toBe("armed");

      knob.onChange(0.25);
      clock.set(5);
      knob.onChange(1.25);
      // Nothing durable about the lane exists until the gesture ends.
      expect(instrument.probe().decks.a.automation).toEqual({});
      wrapper.onPointerUp();

      const lane = instrument.probe().decks.a.automation["deck.gain"] ?? [];
      expect(lane.map((point) => point.value)).toEqual([0.25, 1.25, 0.25, 1.25, 0.25, 1.25]);
      expect(lane[2]?.at).toBeCloseTo(5 + LANE_SEAM_SECS, 6);
      expect(instrument.ring().filter(({ t }) => t === "automation.changed")).toHaveLength(1);
    } finally {
      held = false;
    }
  });

  it("clears the lane and applies the new value as one transaction on a normal move", async () => {
    const { instrument, knob } = renderKnob(true, 4);
    instrument.send({
      t: "automation.set",
      deck: "a",
      param: "deck.gain",
      points: [{ at: 4, value: 0.5 }],
    });

    knob.onChange(0.75);
    for (let remaining = 8; remaining > 0; remaining--) {
      // The facade serializes checkpoint preparation through a finite promise chain.
      // oxlint-disable-next-line no-await-in-loop
      await Promise.resolve();
    }

    expect(instrument.probe().decks.a.automation).toEqual({});
    expect(instrument.probe().decks.a.params["deck.gain"]).toBe(0.75);
  });

  it("starts each gesture from nothing, so an interrupted one cannot join the next", () => {
    held = true;
    try {
      const { clock, instrument, wrapper, knob } = renderKnob(false, 4);
      // A gesture the knob captured and never finished: capture vanished, so no pointerup and
      // no pointercancel ever reached the wrapper.
      wrapper.onPointerDown();
      knob.onChange(0.1);
      clock.set(5);
      knob.onChange(0.2);

      // The next gesture records only itself.
      wrapper.onPointerDown();
      clock.set(6);
      knob.onChange(0.9);
      wrapper.onPointerUp();

      const lane = instrument.probe().decks.a.automation["deck.gain"] ?? [];
      expect(lane.map((point) => point.value)).toEqual([0.9]);
    } finally {
      held = false;
    }
  });

  it("abandons the recording when Option comes up before the pointer does", () => {
    held = true;
    try {
      const { clock, instrument, render, wrapper, knob } = renderKnob(false, 4);
      wrapper.onPointerDown();
      knob.onChange(0.25);
      clock.set(5);

      // The performer lets Option go mid-drag: the highlight is the recording boundary, so
      // releasing the pointer afterwards commits nothing.
      held = false;
      const unarmed = render();
      expect(unarmed.wrapper["data-automation"]).toBe("off");
      unarmed.wrapper.onPointerUp();
      expect(instrument.probe().decks.a.automation).toEqual({});

      // The rest of such a drag is an ordinary move, and pressing Option again cannot resurrect
      // the fragment recorded before the key came up.
      held = true;
      const rearmed = render();
      rearmed.wrapper.onPointerDown();
      rearmed.knob.onChange(0.5);
      held = false;
      render().knob.onChange(1.25);
      held = true;
      render().wrapper.onPointerUp();

      expect(instrument.probe().decks.a.automation).toEqual({});
      expect(instrument.probe().decks.a.params["deck.gain"]).toBe(1.25);
    } finally {
      held = false;
    }
  });

  it("abandons the recording on a cancelled gesture and on a lost capture", () => {
    held = true;
    try {
      const { instrument, wrapper, knob } = renderKnob(false, 4);
      wrapper.onPointerDown();
      knob.onChange(0.25);
      // The browser takes the gesture away: neither ending is a deliberate release, and the
      // pointerup that may still follow has nothing left to commit.
      wrapper.onPointerCancel();
      wrapper.onPointerUp();
      expect(instrument.probe().decks.a.automation).toEqual({});

      wrapper.onPointerDown();
      knob.onChange(0.4);
      wrapper.onLostPointerCapture();
      wrapper.onPointerUp();
      expect(instrument.probe().decks.a.automation).toEqual({});
    } finally {
      held = false;
    }
  });

  it("leaves a parameter its registry entry never opted in unarmed", () => {
    held = true;
    try {
      const clock = manualClock(4);
      const instrument = createInstrument(clock);
      const rendered = ParameterKnob({
        instrument,
        deck: "a",
        param: "deck.pan",
        value: 0,
        automated: false,
        repeatWindow: 4,
      });
      if (!isValidElement<WrapperProps>(rendered)) throw new Error("knob rendered no wrapper");
      expect(rendered.props["data-automation"]).toBe("off");
    } finally {
      held = false;
    }
  });
});
