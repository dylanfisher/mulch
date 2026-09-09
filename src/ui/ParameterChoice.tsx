/**
 * @role A registry-bound parameter drawn as a picker rather than as a dial — the control a
 *   parameter that named its steps gets, in the knob's own place, sending the same `param.set` a
 *   turn sends (0325).
 * @instead The dial every other parameter gets, and the lane a hand rides onto one →
 *   src/ui/ParameterKnob.tsx. The picker primitive itself → src/ui/components/select.tsx.
 */
import { useCallback, useMemo } from "react";

import type { Instrument } from "@/app/facade";
import type { EffectInstanceId } from "@/audio/effects/contract";
import { instanceHalf, PARAMS, type ParamId } from "@/audio/params";
import { PARAM_TOOLTIPS } from "@/lib/copyParams";
import type { RackId } from "@/state/store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/components/select";
import { CAPTION } from "@/ui/Knob";
import { Says } from "@/ui/Says";

/**
 * A parameter whose value is a choice between named things: the names are the items, the number is
 * the value, and picking one sends the index through the same command a turn of a knob sends — so
 * it undoes, persists, archives and drives exactly as a turn does (0089).
 *
 * It wears the dial's own words and marks: the label as its caption and its accessible name, the
 * parameter's sentence on the caption's rest, and the `data-automation` flag every dial in a rack
 * carries, so ./scripts/smoke counts the row the way it counts a row of knobs. The flag is `off`
 * and stays `off` — a value written to a node's `type` has no lane to arm (0322).
 */
// One control: the items it is built from, the command a pick sends, and the caption a dial's own
// caption box holds — most of what is here is the paragraph beside each. Splitting it means a
// component per line of JSX. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function ParameterChoice({
  instrument,
  deck,
  instance,
  param,
  value,
}: {
  instrument: Instrument;
  deck: RackId;
  /** Which rack instance owns this value, or absent for one the deck owns itself (0030). */
  instance?: EffectInstanceId;
  param: ParamId;
  value: number;
}) {
  const spec = PARAMS[param];
  /**
   * The items, as the number each name stands for. Built from `min` and `step` rather than from
   * the index alone, because what a choice is worth is a value of that parameter and not a
   * position in a list — the contract holds the two in step (`defineEffect`), which is also what
   * makes a parameter with names and no step unreachable rather than merely unhandled.
   */
  const items = useMemo(() => {
    if (spec.choices === undefined || spec.step === undefined) {
      throw new Error(`a parameter drawn as a choice must name its steps: ${param}`);
    }
    const step = spec.step;
    return spec.choices.map((label, index) => ({ value: spec.min + index * step, label }));
  }, [spec, param]);

  const onValueChange = useCallback(
    (next: number | null) => {
      // The picker holds no empty item, so a cleared value is a shape nobody can have picked
      // (principle 5).
      if (next === null) throw new Error(`a choice was cleared: ${param}`);
      const owner = instanceHalf(instance);
      instrument.send({ t: "param.set", deck, ...owner, param, value: next });
      // A pick is a gesture that is over where it lands, exactly as a press on the motion menu is:
      // without this the pick after it would join the same history entry and one undo would take
      // back both (0067).
      instrument.send({ t: "gesture.end" });
    },
    [instrument, deck, instance, param],
  );

  const says = PARAM_TOOLTIPS[param];
  return (
    // The knob's own column, at the knob's own gap, topped rather than bottomed: the row is laid
    // `items-end`, and a picker's column is shorter than a dial's — it has no readout under it,
    // being its own — so `self-start` is what puts the picker where the dial was and its caption
    // within a line of the captions beside it. The column is wider than a dial's because a name is
    // wider than three digits.
    <div className="flex w-24 flex-col items-center gap-1 self-start" data-automation="off">
      <Select value={value} onValueChange={onValueChange} items={items}>
        <SelectTrigger aria-label={spec.label} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.label} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* The caption a dial draws, in the box a dial draws it in, and explained the same way it is
          explained there — beside the control's accessible name rather than instead of it (P65). */}
      {says === undefined ? (
        <div className={CAPTION}>{spec.label}</div>
      ) : (
        <Says what={says}>
          <button type="button" className={CAPTION}>
            {spec.label}
          </button>
        </Says>
      )}
    </div>
  );
}
