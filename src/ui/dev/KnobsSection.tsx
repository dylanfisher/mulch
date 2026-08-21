/** @role Gallery section: knob sizes, units and disabled state. */
import { useState } from "react";

import { Specimen } from "@/ui/dev/Specimen";
import { Knob } from "@/ui/Knob";

/** A disabled knob never fires, but the prop is required — it is the value, not the handler,
    that is optional in a specimen. */
const ignore = () => {};

const percent = (value: number) => `${Math.round(value * 100)}%`;
const decibels = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(1)} dB`;
const hertz = (value: number) =>
  value >= 1000 ? `${(value / 1000).toFixed(1)} kHz` : `${Math.round(value)} Hz`;

// A section is a flat list of specimens, not branching logic: the line count tracks how many
// primitives are on show. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function KnobsSection() {
  const [mix, setMix] = useState(0.35);
  const [trim, setTrim] = useState(0);
  const [cutoff, setCutoff] = useState(2000);
  const [tiny, setTiny] = useState(0.1);
  const [small, setSmall] = useState(0.2);
  const [medium, setMedium] = useState(0.5);
  const [large, setLarge] = useState(0.8);

  /** `useState` setters are stable, so the size row can be mapped without new closures. */
  const sizes = [
    { size: "xs", value: tiny, onChange: setTiny },
    { size: "sm", value: small, onChange: setSmall },
    { size: "default", value: medium, onChange: setMedium },
    { size: "lg", value: large, onChange: setLarge },
  ] as const;

  return (
    <>
      <Specimen name="Continuous">
        <Knob
          label="Mix"
          value={mix}
          onChange={setMix}
          min={0}
          max={1}
          defaultValue={0.35}
          format={percent}
        />
        <Knob
          label="Trim"
          value={trim}
          onChange={setTrim}
          min={-24}
          max={24}
          step={0.1}
          defaultValue={0}
          format={decibels}
        />
        <Knob
          label="Cutoff"
          value={cutoff}
          onChange={setCutoff}
          min={20}
          max={20_000}
          step={10}
          defaultValue={2000}
          format={hertz}
        />
      </Specimen>

      <Specimen name="Sizes">
        {sizes.map((knob) => (
          <Knob
            key={knob.size}
            size={knob.size}
            label={knob.size}
            value={knob.value}
            onChange={knob.onChange}
            min={0}
            max={1}
            defaultValue={0.5}
            format={percent}
          />
        ))}
      </Specimen>

      <Specimen name="Disabled">
        <Knob
          label="Send"
          value={0.6}
          onChange={ignore}
          min={0}
          max={1}
          defaultValue={0}
          format={percent}
          disabled
        />
      </Specimen>
    </>
  );
}
