/**
 * @role The parameter knob mounted outside a renderer on a manual clock, and the walks that read
 *   what it rendered — the wrapper, the dial, the corner marker, the preview and the menu. Shared,
 *   because the knob's gestures and its popover menu are two suites over exactly one element, and
 *   two copies of the walk would be two trees to keep in step (principle 1).
 * @instead What each gesture sends, and what the marker does → src/ui/ParameterKnob.test.tsx.
 *   What the menu draws and redraws, and the span a drag decides →
 *   src/ui/ParameterKnobMenu.test.tsx. The hooks the mount runs on → src/ui/parameterKnobHooks.ts.
 *   Nothing here is production code.
 */
import { isValidElement } from "react";

import { manualClock } from "@/app/clock";
import { silentEngine } from "@/app/engineDouble";
import { createInstrument } from "@/app/facade";
import { paramKey } from "@/audio/params";
import type { AutomationPoint } from "@/lib/automation";
import type { MotionDrawn } from "@/lib/motion";
import { ParameterKnob } from "@/ui/ParameterKnob";
import { mount } from "@/ui/parameterKnobHooks";

export type KnobHandlers = {
  onChange: (value: number) => void;
  format?: (value: number) => string;
  live?: () => number | null;
  animate?: boolean;
};
export type WrapperProps = {
  onPointerDown: () => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onLostPointerCapture: () => void;
  onKeyUp: () => void;
  children: unknown[];
  className: string;
  "data-automation": string;
};

/**
 * One knob on deck a's gain, on a fresh instrument whose engine double files whatever `phase`
 * answers as the gain lane's phase on every peek — nothing, by default, which is what an
 * engine-less instrument holds.
 */
export function renderKnob(
  lane: readonly AutomationPoint[] | null,
  startAt = 4,
  playing = false,
  phase: () => number | null = () => null,
  drawn: MotionDrawn | null = null,
) {
  const clock = manualClock(startAt);
  const instrument = createInstrument(clock, () =>
    silentEngine({
      peek: (_deck, out) => {
        const at = phase();
        if (at !== null) out.automation.set(paramKey(null, "deck.gain"), at);
      },
    }),
  );
  mount.refs = [];
  /** A re-render of the same mount — with the lane the store has since given it, where one is. */
  const render = (holding = lane, said = drawn) => {
    mount.index = 0;
    // The component is memo-wrapped in production and identity-mocked here, so it is callable.
    const rendered = ParameterKnob({
      instrument,
      deck: "a",
      param: "deck.gain",
      value: 1,
      lane: holding,
      drawn: said,
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
export const points = [
  { at: 0, value: 0.25 },
  { at: 2, value: 1.25 },
];

/** The preview inside the open popover, which is where the time axis lives. */
export const previewOf = (wrapper: WrapperProps) => {
  const marker = wrapper.children[1];
  if (!isValidElement<{ children: unknown[] }>(marker)) throw new Error("no lane marker");
  const [, content] = marker.props.children;
  if (!isValidElement<{ children: unknown[] }>(content)) throw new Error("no popover content");
  const [, preview] = content.props.children;
  if (!isValidElement<{ onSpan: (span: number) => void }>(preview)) {
    throw new Error("no automation preview");
  }
  return preview.props;
};

/** The marker's popover and the dot that opens it, which is the control a press latches (0154). */
export const markerOf = (wrapper: WrapperProps) => {
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

/** The corner trigger, and the menu under the preview that draws a lane (0309). */
export const menuOf = (wrapper: WrapperProps) => {
  const marker = wrapper.children[1];
  if (!isValidElement<{ children: unknown[] }>(marker)) throw new Error("no marker");
  const [trigger, content] = marker.props.children;
  if (!isValidElement<{ className: string; "data-automated"?: string }>(trigger)) {
    throw new Error("no marker trigger");
  }
  if (!isValidElement<{ children: unknown[] }>(content)) throw new Error("no popover content");
  const menu = content.props.children.at(-1);
  if (
    !isValidElement<{
      onDraw: (character: string) => void;
      drawn: MotionDrawn | null;
      onEvery: (passes: number) => void;
    }>(menu)
  ) {
    throw new Error("no menu");
  }
  return { trigger: trigger.props, menu: menu.props };
};
