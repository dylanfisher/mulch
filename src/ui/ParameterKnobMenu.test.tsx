/**
 * @role The knob's popover menu: a lane drawn from a character at the span the dial holds (0309),
 *   drawn again every so many passes (0311), and the one span command a drag on the preview
 *   decides (0079). Over the same hand-built mount the gesture suite uses.
 */
import { isValidElement } from "react";
import { describe, expect, it, vi } from "vitest";

let held = false;
vi.mock("react", async (importOriginal) =>
  (await import("@/ui/parameterKnobHooks")).mockReact(await importOriginal()),
);
vi.mock("@/ui/shortcuts", () => ({ useAltHeld: () => held }));
/** The frame callback the knob registers while a redraw is counting, or null while none is. */
let frame: (() => void) | null = null;
vi.mock("@/ui/frame", () => ({
  useOnFrame: (callback: () => void, enabled: boolean) => {
    frame = enabled ? callback : null;
  },
}));

import { manualClock } from "@/app/clock";
import { turns } from "@/app/persistenceDouble";
import { createInstrument } from "@/app/facade";
import { laneSpan } from "@/lib/automation";
import { MOTION_SPAN_SECS } from "@/lib/motion";
import { ParameterKnob } from "@/ui/ParameterKnob";
import { menuOf, points, previewOf, renderKnob, type WrapperProps } from "@/ui/parameterKnobDouble";
import { mount } from "@/ui/parameterKnobHooks";

/** The phase the engine double files for the deck's gain lane on every peek, or none at all. */
let phaseFiled: number | null = null;
const filed = () => phaseFiled;

/** One frame of the redraw's counting. */
const tick = (at: number) => {
  if (frame === null) throw new Error("no redraw counting");
  phaseFiled = at;
  frame();
};

// One gesture's two halves stay together: the press that draws, and the span it is drawn at,
// which is whatever the dial's last drag chose (0007, 0309).
// oxlint-disable-next-line max-lines-per-function
describe("ParameterKnob drawn lane", () => {
  it("marks a knob with no lane hollow, and draws one from its value at a dealt span", () => {
    held = true;
    try {
      const { instrument, wrapper } = renderKnob(null);
      const { trigger, menu } = menuOf(wrapper);
      expect(trigger.className).toContain("border-primary");
      // Only a lane's marker is a lane's marker: the smoke counts those (scripts/smoke.d).
      expect(trigger["data-automated"]).toBeUndefined();
      const changed = () => instrument.ring().filter(({ t }) => t === "automation.changed").length;
      const before = changed();

      menu.onDraw("pulse");

      const lane = instrument.probe().decks.a!.automation["deck.gain"]!;
      expect(lane[0]).toEqual({ at: 0, value: 1 });
      expect(lane.at(-1)!.value).toBe(1);
      expect(laneSpan(lane)).toBeGreaterThanOrEqual(MOTION_SPAN_SECS.min);
      expect(laneSpan(lane)).toBeLessThanOrEqual(MOTION_SPAN_SECS.max);
      expect(lane.length).toBeGreaterThan(2);
      // One lane, as one command — the way a recorded one arrives.
      expect(changed() - before).toBe(1);
      expect(menuOf(renderKnob(points).wrapper).trigger.className).toContain("bg-primary");
    } finally {
      held = false;
    }
  });

  it("draws at the span the dial chose, until the lane is cleared and a press deals afresh", () => {
    held = true;
    try {
      const { instrument, wrapper, render } = renderKnob(points);
      instrument.send({ t: "automation.set", deck: "a", param: "deck.gain", points });
      previewOf(wrapper).onSpan(3);
      const lane = () => instrument.probe().decks.a!.automation["deck.gain"]!;
      expect(laneSpan(lane())).toBe(3);

      menuOf(render(lane()).wrapper).menu.onDraw("smooth");
      expect(laneSpan(lane())).toBe(3);
      menuOf(render(lane()).wrapper).menu.onDraw("sporadic");
      expect(laneSpan(lane())).toBe(3);

      // A normal move clears the lane, and the chosen span goes with it: the next press is a
      // first press again.
      instrument.send({ t: "automation.set", deck: "a", param: "deck.gain", points: [] });
      menuOf(render(null).wrapper).menu.onDraw("smooth");
      expect(laneSpan(lane())).not.toBe(3);
      expect(laneSpan(lane())).toBeGreaterThanOrEqual(MOTION_SPAN_SECS.min);
    } finally {
      held = false;
    }
  });
});

// oxlint-disable-next-line max-lines-per-function
describe("ParameterKnob redraw", () => {
  it("draws a drawn lane again at its own length once the count of passes is played", () => {
    held = true;
    try {
      const { instrument, wrapper, render } = renderKnob(null, 4, true, filed);
      const lane = () => instrument.probe().decks.a!.automation["deck.gain"]!;
      const said = () => instrument.probe().decks.a!.drawn["deck.gain"] ?? null;
      menuOf(wrapper).menu.onDraw("pulse");
      const first = lane();
      // The character is the session's now, and the menu is pressed on what it holds (0314).
      expect(said()).toEqual({ character: "pulse", redraw: 0 });
      // Off counts nothing: no frame callback at all, the way an unautomated knob runs none.
      expect(menuOf(render(first, said()).wrapper).menu.drawn?.redraw).toBe(0);
      expect(frame).toBeNull();

      menuOf(render(first, said()).wrapper).menu.onEvery(2);
      expect(said()).toEqual({ character: "pulse", redraw: 2 });
      expect(menuOf(render(first, said()).wrapper).menu.drawn?.redraw).toBe(2);
      const changed = () => instrument.ring().filter(({ t }) => t === "automation.changed").length;
      const before = changed();
      // One wrap is one pass, and the count is two: the lane stands through the first.
      tick(1);
      tick(0.2);
      expect(changed()).toBe(before);
      tick(2);
      tick(0.1);
      expect(changed()).toBe(before + 1);
      const second = lane();
      expect(second).not.toEqual(first);
      expect(laneSpan(second)).toBe(laneSpan(first));
      expect(second[0]).toEqual(first[0]);
      // The redraw carries the whole fact: the character and the count both stand (0314).
      expect(said()).toEqual({ character: "pulse", redraw: 2 });
      // The count starts over with the lane it drew: the next wrap is the first pass again.
      expect(menuOf(render(second, said()).wrapper).menu.drawn?.redraw).toBe(2);
      tick(1);
      tick(0.1);
      expect(changed()).toBe(before + 1);
    } finally {
      held = false;
      frame = null;
      phaseFiled = null;
    }
  });

  it("counts only while the deck plays, and never redraws a lane a hand recorded", () => {
    held = true;
    try {
      const halted = renderKnob(null, 4, false);
      const heldSaid = () => halted.instrument.probe().decks.a!.drawn["deck.gain"] ?? null;
      menuOf(halted.wrapper).menu.onDraw("smooth");
      const standing = halted.instrument.probe().decks.a!.automation["deck.gain"]!;
      menuOf(halted.render(standing, heldSaid()).wrapper).menu.onEvery(1);
      halted.render(standing, heldSaid());
      expect(frame).toBeNull();

      const { clock, instrument, wrapper, render } = renderKnob(null, 4, true, filed);
      const lane = () => instrument.probe().decks.a!.automation["deck.gain"]!;
      const said = () => instrument.probe().decks.a!.drawn["deck.gain"] ?? null;
      menuOf(wrapper).menu.onDraw("smooth");
      menuOf(render(lane(), said()).wrapper).menu.onEvery(1);
      render(lane(), said());
      expect(frame).not.toBeNull();

      // A recording committing over a drawn lane lets the character go, so what a hand rode is
      // never drawn again — the rule 0311 kept in a ref, now where the fact lives (0314).
      const riding = render(lane(), said());
      riding.knob.onChange(0.25);
      clock.set(5);
      riding.knob.onChange(1.25);
      riding.wrapper.onPointerUp();
      const ridden = lane();
      expect(said()).toBeNull();
      render(ridden, said());
      expect(frame).toBeNull();
      expect(instrument.probe().decks.a!.automation["deck.gain"]).toEqual(ridden);
    } finally {
      held = false;
      frame = null;
      phaseFiled = null;
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
      mount.refs = [];
      mount.index = 0;
      const rendered = ParameterKnob({
        instrument,
        deck: "a",
        instance: "one",
        param: "delay.mix",
        value: 0.5,
        lane: points,
        drawn: null,
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

// A motion carried off another knob, put on this one: the menu rescales it and the knob sends it,
// lane and sibling together, as the one entry a hand undoes in a press (0067, 0319). The two
// cases are one fact read twice — what the paste writes, and that nothing after it joins the
// entry — so they stay in one block, waived at the site as 0007 requires.
// oxlint-disable-next-line max-lines-per-function
describe("ParameterKnob paste", () => {
  it("sends the lane and what drew it as one history entry", async () => {
    held = true;
    try {
      const { instrument, wrapper } = renderKnob(null);
      const lane = () => instrument.probe().decks.a!.automation["deck.gain"] ?? null;
      const said = () => instrument.probe().decks.a!.drawn["deck.gain"] ?? null;
      const changed = () => instrument.ring().filter(({ t }) => t === "automation.changed").length;
      const before = changed();

      menuOf(wrapper).menu.onPaste(points, { character: "pulse", redraw: 2 });
      await turns();

      expect(lane()).toEqual(points);
      expect(said()).toEqual({ character: "pulse", redraw: 2 });
      // One lane, as one command — the way a drawn one and a recorded one both arrive.
      expect(changed() - before).toBe(1);

      // One entry: the undo takes the lane and its sibling back together, never half the paste.
      instrument.send({ t: "history.undo" });
      await turns();
      expect(lane()).toBeNull();
      expect(said()).toBeNull();
    } finally {
      held = false;
    }
  });

  it("ends the gesture it opened, so the next press is an entry of its own", async () => {
    held = true;
    try {
      const { instrument, wrapper, render } = renderKnob(null);
      const lane = () => instrument.probe().decks.a!.automation["deck.gain"] ?? null;
      const said = () => instrument.probe().decks.a!.drawn["deck.gain"] ?? null;
      const drawn = { character: "pulse", redraw: 2 } as const;

      menuOf(wrapper).menu.onPaste(points, drawn);
      await turns();
      // A press on the count a moment later, which is the same (instance, param) and so would
      // join a gesture the paste had left standing (0067).
      menuOf(render(points, drawn).wrapper).menu.onEvery(4);
      await turns();
      expect(said()).toEqual({ character: "pulse", redraw: 4 });

      // Two entries, not one: the count comes back off, and the paste is still standing under it.
      instrument.send({ t: "history.undo" });
      await turns();
      expect(said()).toEqual(drawn);
      expect(lane()).toEqual(points);
    } finally {
      held = false;
    }
  });
});
