/** @role The Option-held record gesture and the clear-on-normal-move rule of the knob (0028). */
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
import type { AutomationPoint } from "@/lib/automation";
import { createInstrument } from "@/app/facade";
import { ParameterKnob } from "@/ui/ParameterKnob";

type KnobHandlers = { onChange: (value: number) => void };
type WrapperProps = {
  onPointerDown: () => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onLostPointerCapture: () => void;
  children: unknown[];
  "data-automation": string;
};

function renderKnob(lane: readonly AutomationPoint[] | null, startAt = 4) {
  const clock = manualClock(startAt);
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
      lane,
    });
    if (!isValidElement<WrapperProps>(rendered)) throw new Error("knob rendered no wrapper");
    const [knob] = rendered.props.children;
    if (!isValidElement<KnobHandlers>(knob)) throw new Error("wrapper rendered no knob");
    return { wrapper: rendered.props, knob: knob.props };
  };
  return { clock, instrument, render, ...render() };
}

// One control's two automation gestures stay visible together: recording and clearing are the
// same knob, and separating them hides the exclusivity. See 0007.
// oxlint-disable-next-line max-lines-per-function
describe("ParameterKnob automation gestures", () => {
  it("records one whole lane while Option is held, timed from its own start", () => {
    held = true;
    try {
      const { clock, instrument, wrapper, knob } = renderKnob(null);
      expect(wrapper["data-automation"]).toBe("armed");

      knob.onChange(0.25);
      clock.set(5);
      knob.onChange(1.25);
      // Nothing durable about the lane exists until the gesture ends.
      expect(instrument.probe().decks.a.automation).toEqual({});
      wrapper.onPointerUp();

      const lane = instrument.probe().decks.a.automation["deck.gain"] ?? [];
      expect(lane).toEqual([
        { at: 0, value: 0.25 },
        { at: 1, value: 1.25 },
      ]);
      expect(instrument.ring().filter(({ t }) => t === "automation.changed")).toHaveLength(1);
    } finally {
      held = false;
    }
  });

  it("records the same lane wherever on the clock the gesture happened", () => {
    held = true;
    try {
      const ride = (startAt: number) => {
        const { clock, instrument, wrapper, knob } = renderKnob(null, startAt);
        wrapper.onPointerDown();
        knob.onChange(0.25);
        clock.set(startAt + 0.5);
        knob.onChange(0.9);
        clock.set(startAt + 1.5);
        knob.onChange(1.25);
        wrapper.onPointerUp();
        return instrument.probe().decks.a.automation["deck.gain"];
      };

      // The recorder knows the playhead and throws it away: a gesture 1.25s into a pass and the
      // same gesture 37.5s in are one lane, so a recording is repeatable (0028).
      expect(ride(1.25)).toEqual([
        { at: 0, value: 0.25 },
        { at: 0.5, value: 0.9 },
        { at: 1.5, value: 1.25 },
      ]);
      expect(ride(37.5)).toEqual(ride(1.25));
    } finally {
      held = false;
    }
  });

  it("marks the knob holding a lane only while Option is held, and only that knob", () => {
    const marker = (lane: readonly AutomationPoint[] | null) =>
      renderKnob(lane).wrapper.children[1];

    held = true;
    try {
      const shown = marker([
        { at: 0, value: 0.25 },
        { at: 2, value: 1.25 },
      ]);
      if (!isValidElement<{ children: unknown }>(shown)) throw new Error("no lane marker");
      // A knob with no lane has nothing to mark, and the mark is a reveal: Option is what asks.
      expect(marker(null)).toBeNull();
      held = false;
      expect(marker([{ at: 0, value: 0.25 }])).toBeNull();
    } finally {
      held = false;
    }
  });

  it("clears the lane and applies the new value as one transaction on a normal move", async () => {
    const { instrument, knob } = renderKnob([{ at: 0, value: 0.5 }]);
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
      const { clock, instrument, wrapper, knob } = renderKnob(null);
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
      const { clock, instrument, render, wrapper, knob } = renderKnob(null);
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
      const { instrument, wrapper, knob } = renderKnob(null);
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
        lane: null,
      });
      if (!isValidElement<WrapperProps>(rendered)) throw new Error("knob rendered no wrapper");
      expect(rendered.props["data-automation"]).toBe("off");
    } finally {
      held = false;
    }
  });
});
