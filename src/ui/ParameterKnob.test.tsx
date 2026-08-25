/** @role The Option-held record gesture and the clear-on-normal-move rule of the knob (0028). */
// One case per gesture the knob answers to, over one hand-built mount the whole file shares —
// the length tracks how many gestures there are, not how much setup each needs (0007).
// oxlint-disable max-lines
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
    // The same one mount's cells, in the same hook order: a setter writes the cell and the next
    // hand-called render reads it, which is the sequence React would flush.
    useState: (initial: unknown) => {
      const cell = (refs[refIndex++] ??= { current: initial });
      const set = (next: unknown) => {
        cell.current = next;
      };
      return [cell.current, set];
    },
    // Called rather than scheduled: these renders are plain function calls, and what the effect
    // does — commit a recording once Option is up — is idempotent, so running it per render is
    // the same sequence React would flush after one.
    useEffect: (effect: () => void) => {
      effect();
    },
  };
});
vi.mock("@/ui/shortcuts", () => ({ useAltHeld: () => held }));

import { manualClock } from "@/app/clock";
import { PARAM_RAMP_SECS } from "@/audio/ramp";
import { automationValueAt, laneSpan, type AutomationPoint } from "@/lib/automation";
import { createInstrument } from "@/app/facade";
import { ParameterKnob } from "@/ui/ParameterKnob";

type KnobHandlers = {
  onChange: (value: number) => void;
  format?: (value: number) => string;
  live?: () => number | null;
  animate?: boolean;
};
type WrapperProps = {
  onPointerDown: () => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onLostPointerCapture: () => void;
  onKeyUp: () => void;
  children: unknown[];
  className: string;
  "data-automation": string;
};

function renderKnob(lane: readonly AutomationPoint[] | null, startAt = 4, playing = false) {
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
      playing,
    });
    if (!isValidElement<WrapperProps>(rendered)) throw new Error("knob rendered no wrapper");
    const [knob] = rendered.props.children;
    if (!isValidElement<KnobHandlers>(knob)) throw new Error("wrapper rendered no knob");
    return { wrapper: rendered.props, knob: knob.props };
  };
  return { clock, instrument, render, ...render() };
}

/** A lane with somewhere to go: enough to draw a marker over, and enough to stretch. */
const points = [
  { at: 0, value: 0.25 },
  { at: 2, value: 1.25 },
];

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
      expect(instrument.probe().decks.a!.automation).toEqual({});
      wrapper.onPointerUp();

      const lane = instrument.probe().decks.a!.automation["deck.gain"] ?? [];
      // The second of these moves is a whole second after the first, which is a hand that stopped
      // (0065): the lane holds 0.25 across it and ramps at the end, rather than sliding over it.
      expect(lane).toEqual([
        { at: 0, value: 0.25 },
        { at: 1 - PARAM_RAMP_SECS, value: 0.25 },
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
        return instrument.probe().decks.a!.automation["deck.gain"];
      };

      // The recorder knows the playhead and throws it away: a gesture 1.25s into a pass and the
      // same gesture 37.5s in are one lane, so a recording is repeatable (0028).
      expect(ride(1.25)).toEqual([
        { at: 0, value: 0.25 },
        { at: 0.5 - PARAM_RAMP_SECS, value: 0.25 },
        { at: 0.5, value: 0.9 },
        { at: 1.5 - PARAM_RAMP_SECS, value: 0.9 },
        { at: 1.5, value: 1.25 },
      ]);
      expect(ride(37.5)).toEqual(ride(1.25));
    } finally {
      held = false;
    }
  });

  it("records the whole press, flat across the stretches the hand held still", () => {
    held = true;
    try {
      const { clock, instrument, wrapper, knob } = renderKnob(null, 4);
      // Four seconds of nothing, a quick move, then four seconds of nothing again: eight seconds
      // of gesture, of which the pointer reported a thirty-second (P88).
      wrapper.onPointerDown();
      clock.set(8);
      knob.onChange(0.25);
      clock.set(8.03125);
      knob.onChange(0.5);
      clock.set(12);
      wrapper.onPointerUp();

      const lane = instrument.probe().decks.a!.automation["deck.gain"] ?? [];
      // One lane, spanning press to release rather than the moving part of it.
      expect(laneSpan(lane)).toBe(8);
      expect(instrument.ring().filter(({ t }) => t === "automation.changed")).toHaveLength(1);
      // Flat across each still stretch: the value the press was made at, then the value it was
      // left at, and neither drifting across the seconds the hand did nothing in. Read against a
      // base the lane never took, because a lane holds its base until its own first point — the
      // press's own point is what has to be there, and reading at the pressed value would pass
      // through the base whether the lane started at the press or four seconds after it.
      for (const at of [0, 1, 2, 3.5]) expect(automationValueAt(lane, at, 0)).toBe(1);
      for (const at of [4.5, 6, 8]) expect(automationValueAt(lane, at, 0)).toBe(0.5);
      // Bounded: a stillness costs the one point that ends it, never one per frame it lasted.
      expect(lane.length).toBeLessThanOrEqual(6);
    } finally {
      held = false;
    }
  });

  it("gives a move with no press behind it no length but its own", () => {
    held = true;
    try {
      // An arrow key nudged with Option down, and the modifier let go ten seconds later. Only a
      // press has a release to run to: a lane as long as a modifier was held is not a gesture.
      const { clock, instrument, render, knob } = renderKnob(null);
      knob.onChange(0.9);
      clock.set(14);
      held = false;
      render();

      expect(instrument.probe().decks.a!.automation["deck.gain"]).toEqual([{ at: 0, value: 0.9 }]);
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

  it("hands the dial a live read for a lane of its own, animated only while it plays", () => {
    // Nothing to follow: no live read, so the knob registers no frame callback at all and a page
    // with nothing automated runs no frames (0035).
    expect(renderKnob(null, 4, true).knob.live).toBeUndefined();

    // A halted deck holds its gesture where it left it, so the dial is given the same read and
    // holds with it — holding one value is not animation, which is all `animate` says (0040).
    const halted = renderKnob(points, 4, false);
    expect(halted.knob.live).toBeTypeOf("function");
    expect(halted.knob.animate).toBe(false);

    const playing = renderKnob(points, 4, true);
    expect(playing.knob.animate).toBe(true);
    // An engine-less instrument peeks zeros and holds no phase, which reads as "not automated
    // this frame" — the dial paints the value it was given.
    expect(playing.knob.live?.()).toBeNull();
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

    expect(instrument.probe().decks.a!.automation).toEqual({});
    expect(instrument.probe().decks.a!.params["deck.gain"]).toBe(0.75);
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

      const lane = instrument.probe().decks.a!.automation["deck.gain"] ?? [];
      // The press this drag began at, held across the second it did not move, and its one move —
      // and nothing at all of the gesture before it.
      expect(lane.map((point) => point.value)).toEqual([1, 1, 0.9]);
    } finally {
      held = false;
    }
  });

  it("commits the recording when Option comes up before the pointer does", () => {
    held = true;
    try {
      const { clock, instrument, render, wrapper, knob } = renderKnob(null);
      wrapper.onPointerDown();
      knob.onChange(0.25);
      clock.set(5);
      knob.onChange(0.75);

      // Letting Option go is how a performer stops recording: the lane lands there, with the
      // pointer still down, so the transport can start replaying it immediately (0034).
      held = false;
      const unarmed = render();
      expect(unarmed.wrapper["data-automation"]).toBe("off");
      expect(instrument.probe().decks.a!.automation["deck.gain"]).toEqual([
        { at: 0, value: 0.25 },
        { at: 1 - PARAM_RAMP_SECS, value: 0.25 },
        { at: 1, value: 0.75 },
      ]);

      // The rest of that drag is inert: an ordinary move clears a lane, and clearing the one the
      // same drag just recorded would undo the release the performer just made.
      unarmed.knob.onChange(1.25);
      unarmed.wrapper.onPointerUp();
      expect(instrument.probe().decks.a!.automation["deck.gain"]).toHaveLength(3);
      expect(instrument.probe().decks.a!.params["deck.gain"]).toBe(1.25);
      expect(instrument.ring().filter(({ t }) => t === "automation.changed")).toHaveLength(1);
    } finally {
      held = false;
    }
  });

  it("ends a keyboard gesture on the key coming up, and never one inside a drag", () => {
    const { instrument, wrapper } = renderKnob(null);
    const sent: string[] = [];
    const send = instrument.send.bind(instrument);
    instrument.send = (envelope) => {
      sent.push("cmd" in envelope ? envelope.cmd.t : envelope.t);
      send(envelope);
    };

    // A nudge from the keyboard is a move like any other and ends where the key comes up, so a
    // parameter whose plugin held a rebuild for it is paid for there too (0090).
    wrapper.onKeyUp();
    expect(sent).toEqual(["gesture.end"]);

    // The slider keeps focus for a whole pointer drag, so Option coming up mid-recording is a
    // keyup at this wrapper. It is not the end of anything: the pointer's own endings are (0034).
    wrapper.onPointerDown();
    wrapper.onKeyUp();
    expect(sent).toEqual(["gesture.end"]);
    wrapper.onPointerUp();
    expect(sent).toEqual(["gesture.end", "gesture.end"]);
  });

  it("abandons the recording on a cancelled gesture", () => {
    held = true;
    try {
      const { instrument, wrapper, knob } = renderKnob(null);
      wrapper.onPointerDown();
      knob.onChange(0.25);
      // The browser takes the gesture away: a cancel is not a deliberate release, and the
      // pointerup that may still follow has nothing left to commit.
      wrapper.onPointerCancel();
      wrapper.onPointerUp();
      expect(instrument.probe().decks.a!.automation).toEqual({});
    } finally {
      held = false;
    }
  });

  it("commits the lane when the lost capture beats the pointerup to the wrapper", () => {
    held = true;
    try {
      const { clock, instrument, wrapper, knob } = renderKnob(null);
      wrapper.onPointerDown();
      knob.onChange(0.25);
      clock.set(5);
      knob.onChange(0.75);

      // Releasing the pointer also takes the capture back, and nothing promises which of the two
      // reaches this wrapper first. In the losing order the lane used to be dropped on the floor:
      // the performer rode the knob and no lane was written (0072).
      wrapper.onLostPointerCapture();
      wrapper.onPointerUp();

      expect(instrument.probe().decks.a!.automation["deck.gain"]).toEqual([
        { at: 0, value: 0.25 },
        { at: 1 - PARAM_RAMP_SECS, value: 0.25 },
        { at: 1, value: 0.75 },
      ]);
      // One ending, one lane: the second report of that release commits nothing of its own.
      expect(instrument.ring().filter(({ t }) => t === "automation.changed")).toHaveLength(1);
    } finally {
      held = false;
    }
  });

  it("draws the lane marker square, at the radius the armed ring is drawn at", () => {
    held = true;
    try {
      const { wrapper } = renderKnob([{ at: 0, value: 0.25 }]);
      const marker = wrapper.children[1];
      if (!isValidElement<{ children: unknown[] }>(marker)) throw new Error("no lane marker");
      const [trigger] = marker.props.children;
      if (!isValidElement<{ className: string }>(trigger)) throw new Error("no marker trigger");
      // The marker and the ring around the armed control are the same corner: a circle inside a
      // rounded square reads as two shapes rather than one control that is armed.
      expect(wrapper.className).toContain("rounded-md");
      expect(trigger.props.className).toContain("rounded-md");
      expect(trigger.props.className).not.toContain("rounded-full");
    } finally {
      held = false;
    }
  });

  it("reads at the precision its registry entry declares, not at the float's", () => {
    const instrument = createInstrument(manualClock(4));
    const rendered = ParameterKnob({
      instrument,
      deck: "a",
      instance: "one",
      param: "filter.cutoff",
      value: 1_234.567_890_123,
      lane: null,
      playing: false,
    });
    if (!isValidElement<WrapperProps>(rendered)) throw new Error("knob rendered no wrapper");
    const [knob] = rendered.props.children;
    if (!isValidElement<KnobHandlers>(knob)) throw new Error("wrapper rendered no knob");
    // A cutoff reads whole Hz. Without a declared precision the readout is the float itself, and
    // a drag repaints all seventeen digits of it sixty times a second.
    expect(knob.props.format?.(1_234.567_890_123)).toBe("1235");
    expect(knob.props.format?.(20_000)).toBe("20000");
  });

  it("reads a value that rounds to nothing as nothing, without a minus sign", () => {
    const instrument = createInstrument(manualClock(4));
    const rendered = ParameterKnob({
      instrument,
      deck: "a",
      param: "deck.pan",
      value: 0,
      lane: null,
      playing: false,
    });
    if (!isValidElement<WrapperProps>(rendered)) throw new Error("knob rendered no wrapper");
    const [knob] = rendered.props.children;
    if (!isValidElement<KnobHandlers>(knob)) throw new Error("wrapper rendered no knob");
    // A pan just left of centre rounds to zero at two places; `toFixed` would sign it "-0.00".
    expect(knob.props.format?.(-0.004)).toBe("0.00");
    expect(knob.props.format?.(-1.776_356_839_400_25e-15)).toBe("0.00");
    expect(knob.props.format?.(-0.25)).toBe("-0.25");
  });

  it("leaves a parameter its registry entry never opted in unarmed", () => {
    held = true;
    try {
      const clock = manualClock(4);
      const instrument = createInstrument(clock);
      const rendered = ParameterKnob({
        instrument,
        deck: "a",
        param: "deck.speed",
        value: 1,
        lane: null,
        playing: false,
      });
      if (!isValidElement<WrapperProps>(rendered)) throw new Error("knob rendered no wrapper");
      expect(rendered.props["data-automation"]).toBe("off");
    } finally {
      held = false;
    }
  });
});

/** The preview inside the open popover, which is where the time axis lives. */
const previewOf = (wrapper: WrapperProps) => {
  const marker = wrapper.children[1];
  if (!isValidElement<{ children: unknown[] }>(marker)) throw new Error("no lane marker");
  const [, content] = marker.props.children;
  if (!isValidElement<{ children: unknown[] }>(content)) throw new Error("no popover content");
  const preview = content.props.children.at(-1);
  if (!isValidElement<{ onSpan: (span: number) => void }>(preview)) {
    throw new Error("no automation preview");
  }
  return preview.props;
};

/** The marker's popover and the dot that opens it, which is the control a press latches (0154). */
const markerOf = (wrapper: WrapperProps) => {
  const marker = wrapper.children[1];
  if (
    !isValidElement<{
      open: boolean;
      onOpenChange: (open: boolean, details: { reason: string }) => void;
      children: unknown[];
    }>(marker)
  ) {
    throw new Error("no lane marker");
  }
  const [trigger] = marker.props.children;
  if (!isValidElement<{ onClick: () => void }>(trigger)) throw new Error("no marker trigger");
  return { popover: marker.props, trigger: trigger.props };
};

// One control's open state, which is a latch over a peek: the four ways it opens and closes stay
// in one case each, because each is a different report arriving at the same pair of flags (0154).
// oxlint-disable-next-line max-lines-per-function
describe("ParameterKnob lane marker", () => {
  it("keeps the preview open after a press, once the pointer has left the marker", () => {
    held = true;
    try {
      const { render, wrapper } = renderKnob(points);
      // Hover alone is the peek it always was: resting on the dot opens it, leaving takes it away.
      markerOf(wrapper).popover.onOpenChange(true, { reason: "trigger-hover" });
      expect(markerOf(render().wrapper).popover.open).toBe(true);
      markerOf(render().wrapper).popover.onOpenChange(false, { reason: "trigger-hover" });
      expect(markerOf(render().wrapper).popover.open).toBe(false);

      // A press latches it, and the pointer leaving no longer decides anything — which is the
      // only way the span drag on the preview's own dial can be reached (0079).
      markerOf(render().wrapper).trigger.onClick();
      markerOf(render().wrapper).popover.onOpenChange(false, { reason: "trigger-hover" });
      expect(markerOf(render().wrapper).popover.open).toBe(true);
    } finally {
      held = false;
    }
  });

  it("closes on a second press, with the pointer still resting on the marker", () => {
    held = true;
    try {
      const { render, wrapper } = renderKnob(points);
      markerOf(wrapper).trigger.onClick();
      // The pointer came back to the dot before pressing again: that hover must not survive the
      // press and hand the popup straight back open.
      markerOf(render().wrapper).popover.onOpenChange(true, { reason: "trigger-hover" });
      markerOf(render().wrapper).trigger.onClick();
      expect(markerOf(render().wrapper).popover.open).toBe(false);
    } finally {
      held = false;
    }
  });

  it("closes a latched preview on Escape and on a press outside", () => {
    for (const reason of ["escape-key", "outside-press"]) {
      held = true;
      try {
        const { render, wrapper } = renderKnob(points);
        markerOf(wrapper).trigger.onClick();
        expect(markerOf(render().wrapper).popover.open).toBe(true);
        markerOf(render().wrapper).popover.onOpenChange(false, { reason });
        expect(markerOf(render().wrapper).popover.open).toBe(false);
      } finally {
        held = false;
      }
    }
  });

  it("does not carry a latched preview across Option coming up", () => {
    held = true;
    try {
      const { render, wrapper } = renderKnob(points);
      markerOf(wrapper).trigger.onClick();
      expect(markerOf(render().wrapper).popover.open).toBe(true);
      // The marker exists only while Option is held, and the latch is the reveal's, not the
      // session's: arming again starts closed rather than where the last reveal was left (0154).
      held = false;
      expect(render().wrapper.children[1]).toBeNull();
      held = true;
      expect(markerOf(render().wrapper).popover.open).toBe(false);
    } finally {
      held = false;
    }
  });
});

// The stretch's other half: the preview decides one length per drag, and this is what the knob
// does with it — one command, on the pair the knob rides (0065, 0079).
// oxlint-disable-next-line max-lines-per-function
describe("ParameterKnob span gesture", () => {
  it("sends one span command for the length one drag decided", () => {
    held = true;
    try {
      const { instrument, wrapper } = renderKnob(points);
      instrument.send({ t: "automation.set", deck: "a", param: "deck.gain", points });
      const sent: unknown[] = [];
      instrument.on((event) => {
        if (event.t === "automation.changed") sent.push(event.points);
      });

      previewOf(wrapper).onSpan(0.5);

      // One command, and the gesture it recorded now repeats four times as fast.
      expect(sent).toEqual([
        [
          { at: 0, value: 0.25 },
          { at: 0.5, value: 1.25 },
        ],
      ]);
      expect(instrument.probe().decks.a!.automation["deck.gain"]!.at(-1)!.at).toBe(0.5);
    } finally {
      held = false;
    }
  });

  it("stretches the lane on the instance the knob rides, never the deck's own", () => {
    held = true;
    try {
      const instrument = createInstrument(manualClock(4));
      instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "delay" });
      instrument.send({
        t: "automation.set",
        deck: "a",
        instance: "one",
        param: "delay.mix",
        points,
      });
      refs = [];
      refIndex = 0;
      const rendered = ParameterKnob({
        instrument,
        deck: "a",
        instance: "one",
        param: "delay.mix",
        value: 0.5,
        lane: points,
        playing: false,
      });
      if (!isValidElement<WrapperProps>(rendered)) throw new Error("knob rendered no wrapper");

      previewOf(rendered.props).onSpan(4);

      const entry = instrument.probe().decks.a!.effects[0]!;
      expect(entry.automation["delay.mix"]!.at(-1)!.at).toBe(4);
      expect(instrument.probe().decks.a!.automation).toEqual({});
    } finally {
      held = false;
    }
  });
});
