/**
 * @role Gallery section: every type variation, at the size and weight it really renders.
 * @instead Never set `text-*`, `leading-*` or `tracking-*` at a call site — add a variation
 *   to src/ui/tokens.css and show it here.
 */
import { YARD } from "@/lib/copy";
import { Specimen } from "@/ui/dev/Specimen";

/**
 * The whole scale, in the order it steps down. `sample` is deliberately the same
 * sentence everywhere: two variations that differ only in weight are hard to catch
 * side by side unless the words are identical.
 */
const VARIATIONS = [
  { name: "type-display", note: "The landing wordmark, and nothing else." },
  { name: "type-title", note: "Section headings, and the wordmark in a bar." },
  { name: "type-body", note: "Prose, summaries, nav and links." },
  { name: "type-eyebrow", note: "Uppercase micro-labels." },
  { name: "type-readout", note: "Digits that change in place." },
];

const SAMPLE = `${YARD} a · vinyl loop 03`;

export function TypeSection() {
  return (
    <>
      {VARIATIONS.map((variation) => (
        <Specimen key={variation.name} name={variation.name}>
          <div className="flex w-full flex-col gap-1">
            <span className={variation.name}>{SAMPLE}</span>
            <span className="type-body text-muted-foreground">{variation.note}</span>
          </div>
        </Specimen>
      ))}

      <Specimen name="Readout in a column" wide>
        {/* The point of tabular figures: these two lines must stay in column as the
            digits change, which is the whole reason mono and tabular travel together. */}
        <dl className="grid w-full grid-cols-[auto_1fr] gap-x-4 type-readout">
          <dt>128.00</dt>
          <dd className="text-muted-foreground">BPM</dd>
          <dt>-11.14</dt>
          <dd className="text-muted-foreground">dB</dd>
        </dl>
      </Specimen>
    </>
  );
}
