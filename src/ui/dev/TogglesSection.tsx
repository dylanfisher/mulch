/** @role Gallery section: switch, checkbox, toggle and toggle-group. */
import { useState } from "react";
import { RepeatIcon, ShuffleIcon, LightningIcon } from "@phosphor-icons/react";

import { Checkbox } from "@/ui/components/checkbox";
import { Field, FieldLabel } from "@/ui/components/field";
import { Switch } from "@/ui/components/switch";
import { Toggle } from "@/ui/components/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/ui/components/toggle-group";
import { Specimen } from "@/ui/dev/Specimen";

const FX_UNITS = [
  { value: "delay", label: "Delay" },
  { value: "reverb", label: "Reverb" },
  { value: "filter", label: "Filter" },
];

// A section is a flat list of specimens, not branching logic: the line count tracks how many
// primitives are on show. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function TogglesSection() {
  const [loop, setLoop] = useState(true);
  const [pressed, setPressed] = useState(false);
  const [units, setUnits] = useState<string[]>(["delay"]);
  const [quantize, setQuantize] = useState<string[]>(["1/4"]);

  return (
    <>
      <Specimen name="Toggle">
        <Toggle pressed={pressed} onPressedChange={setPressed} aria-label="Shuffle">
          <ShuffleIcon />
        </Toggle>
        <Toggle variant="outline" aria-label="Repeat">
          <RepeatIcon data-icon="inline-start" />
          Repeat
        </Toggle>
        <Toggle variant="outline" disabled aria-label="Boost">
          <LightningIcon />
        </Toggle>
      </Specimen>

      <Specimen name="Toggle group — multiple">
        <ToggleGroup multiple value={units} onValueChange={setUnits} variant="outline" spacing={0}>
          {FX_UNITS.map((unit) => (
            <ToggleGroupItem key={unit.value} value={unit.value}>
              {unit.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Specimen>

      <Specimen name="Toggle group — single">
        <ToggleGroup value={quantize} onValueChange={setQuantize} variant="outline" spacing={0}>
          {["1/1", "1/2", "1/4", "1/8"].map((division) => (
            <ToggleGroupItem key={division} value={division} className="type-readout">
              {division}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Specimen>

      <Specimen name="Switch">
        <Field orientation="horizontal">
          <Switch id="loop" checked={loop} onCheckedChange={setLoop} />
          <FieldLabel htmlFor="loop">Loop</FieldLabel>
        </Field>
        <Field orientation="horizontal">
          <Switch id="monitor" disabled />
          <FieldLabel htmlFor="monitor">Monitor</FieldLabel>
        </Field>
      </Specimen>

      <Specimen name="Checkbox">
        <Field orientation="horizontal">
          <Checkbox id="normalize" defaultChecked />
          <FieldLabel htmlFor="normalize">Normalize on import</FieldLabel>
        </Field>
        <Field orientation="horizontal">
          <Checkbox id="fade" />
          <FieldLabel htmlFor="fade">Fade out tail</FieldLabel>
        </Field>
      </Specimen>
    </>
  );
}
