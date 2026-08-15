/** @role Gallery section: text inputs, selects, sliders and the numeric readout treatment. */
import { useCallback, useState } from "react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";

import { Field, FieldDescription, FieldLabel } from "@/ui/components/field";
import { Input } from "@/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/components/select";
import { Slider } from "@/ui/components/slider";
import { Specimen } from "@/ui/dev/Specimen";

const OUTPUTS = [
  { value: "default", label: "System default" },
  { value: "interface", label: "Audio interface 1–2" },
  { value: "virtual", label: "Virtual bus" },
];

// A section is a flat list of specimens, not branching logic: the line count tracks how many
// primitives are on show. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function InputsSection() {
  const [gain, setGain] = useState(70);
  const [range, setRange] = useState([25, 75]);

  /** Base UI hands back `number | number[]` for every slider; each caller picks its shape. */
  const handleGainChange = useCallback((next: number | readonly number[]) => {
    setGain(typeof next === "number" ? next : (next[0] ?? 0));
  }, []);
  const handleRangeChange = useCallback((next: number | readonly number[]) => {
    setRange(typeof next === "number" ? [next] : [...next]);
  }, []);

  return (
    <>
      <Specimen name="Input">
        <Field>
          <FieldLabel htmlFor="session-name">Session name</FieldLabel>
          <Input id="session-name" placeholder="untitled" />
        </Field>
      </Specimen>

      <Specimen name="Numeric">
        <Field>
          <FieldLabel htmlFor="minutes">Export length</FieldLabel>
          <Input
            id="minutes"
            type="number"
            min={1}
            max={60}
            defaultValue={8}
            className="type-readout"
          />
          <FieldDescription>Minutes of mixdown to render.</FieldDescription>
        </Field>
      </Specimen>

      <Specimen name="With icon">
        <Field>
          <FieldLabel htmlFor="search">Search clips</FieldLabel>
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input id="search" className="pl-7" placeholder="kick, vinyl, tape…" />
          </div>
        </Field>
      </Specimen>

      <Specimen name="Disabled / invalid">
        <Field>
          <FieldLabel htmlFor="locked">Locked</FieldLabel>
          <Input id="locked" defaultValue="read only" disabled />
        </Field>
        <Field data-invalid="true">
          <FieldLabel htmlFor="bpm">BPM</FieldLabel>
          <Input id="bpm" aria-invalid defaultValue="0" className="type-readout" />
        </Field>
      </Specimen>

      <Specimen name="Select">
        <Field>
          <FieldLabel>Output device</FieldLabel>
          <Select defaultValue="default" items={OUTPUTS}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OUTPUTS.map((output) => (
                <SelectItem key={output.value} value={output.value}>
                  {output.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </Specimen>

      <Specimen name="Slider" wide>
        <Field>
          {/* A slider is a group of thumbs, not a labelable element, so `htmlFor` would
              point at nothing: Base UI passes `aria-labelledby` down to the thumb itself. */}
          <FieldLabel id="gain-label">
            Master gain
            <span className="ml-auto type-readout">{gain}%</span>
          </FieldLabel>
          <Slider aria-labelledby="gain-label" value={gain} onValueChange={handleGainChange} />
        </Field>
        <Field>
          <FieldLabel>
            Loop region
            <span className="ml-auto type-readout">
              {range[0]}–{range[1]}%
            </span>
          </FieldLabel>
          <Slider value={range} onValueChange={handleRangeChange} />
        </Field>
      </Specimen>
    </>
  );
}
