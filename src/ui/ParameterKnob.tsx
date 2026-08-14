/** @role A registry-bound parameter knob that sends the generic param.set command. */
import { memo, useCallback } from "react";

import type { Instrument } from "@/app/facade";
import { PARAMS, type ParamId } from "@/audio/params";
import type { DeckId } from "@/state/store";
import { Knob } from "@/ui/Knob";

export const ParameterKnob = memo(function ParameterKnob({
  instrument,
  deck,
  param,
  value,
}: {
  instrument: Instrument;
  deck: DeckId;
  param: ParamId;
  value: number;
}) {
  const spec = PARAMS[param];
  const onChange = useCallback(
    (next: number) => {
      instrument.send({ t: "param.set", deck, param, value: next });
    },
    [instrument, deck, param],
  );

  return (
    <Knob
      label={spec.label}
      value={value}
      onChange={onChange}
      min={spec.min}
      max={spec.max}
      defaultValue={spec.default}
      curve={spec.curve ?? "linear"}
      size="sm"
      {...(spec.step === undefined ? {} : { step: spec.step })}
    />
  );
});
