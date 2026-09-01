/**
 * @role Sketch 03 — the patch as a sentence: the mulcher stated in plain words, every underlined
 *   word a control, and not one dial on the surface.
 * @instead The prose voice this borrows, which is the instrument's own → src/lib/copy.ts.
 */
// One surface, one argument — the length is the surface's (0247, 0007).
// oxlint-disable max-lines-per-function
import { useState } from "react";

import { cn } from "@/lib/cn";
import { SketchLabel } from "@/ui/sketch/SketchFrame";
import { SKETCH_CAST } from "@/ui/sketch/sketchWalk";
import { Button } from "@/ui/components/button";

/**
 * A word a hand may change, and what it may become. Cycled on click here — the real thing would
 * open the picker or scrub, but what a sketch has to show is that the sentence stays a sentence
 * whatever is chosen, which is the whole claim.
 */
const CHOICES: Record<string, readonly string[]> = {
  often: ["every bar", "every 2 bars", "every 4 beats", "now and then", "constantly"],
  far: ["barely", "nearby", "a fair way", "right across the loop"],
  land: ["wherever it likes", "on the beat", "on a bar line", "where it left off"],
  // The cast said as verbs. Written out rather than derived, because "plain" is not a verb and
  // "plains" is not a word — the count is asserted below so the two lists cannot drift apart.
  does: ["stays plain", "stutters", "riffs", "scatters", "breathes", "slides"],
  times: ["once", "twice", "three times", "a handful of times"],
  after: ["carries straight on", "leaves a gap", "rests a bar", "doubles back"],
};

/** The verbs above are the cast, one for one — so a name added to the cast fails loudly here. */
if (CHOICES["does"]?.length !== SKETCH_CAST.length) {
  throw new Error(
    `The sentence has ${CHOICES["does"]?.length} verbs for ${SKETCH_CAST.length} characters.`,
  );
}

function Word({
  slot,
  index,
  onCycle,
}: {
  slot: keyof typeof CHOICES;
  index: number;
  onCycle: () => void;
}) {
  const options = CHOICES[slot] ?? [];
  // No type utility of its own: a word a hand may change has to be the size of the words around
  // it, or the sentence reads as prose with controls dropped into it. It inherits the paragraph's.
  return (
    <button
      type="button"
      onClick={onCycle}
      className={cn(
        "rounded px-1 underline decoration-primary decoration-2 underline-offset-4",
        "text-foreground hover:bg-primary/15",
      )}
    >
      {options[index % options.length]}
    </button>
  );
}

export function SketchSentence() {
  const [at, setAt] = useState<Record<string, number>>({
    often: 1,
    far: 1,
    land: 1,
    does: 1,
    times: 2,
    after: 1,
  });
  const cycle = (slot: string) => () => {
    setAt((was) => ({ ...was, [slot]: (was[slot] ?? 0) + 1 }));
  };
  const word = (slot: keyof typeof CHOICES) => (
    <Word slot={slot} index={at[slot] ?? 0} onCycle={cycle(slot)} />
  );

  return (
    <div className="flex flex-col gap-5">
      <SketchLabel>Mulcher</SketchLabel>

      {/* type-title and not type-body, because the sentence *is* the interface rather than a
          caption on one — and one utility on the paragraph, so every word in it is one size. */}
      <p className="max-w-3xl type-title">
        {word("often")} it jumps {word("far")} and lands {word("land")}, {word("does")} the landing{" "}
        {word("times")}, then {word("after")}.
      </p>

      <p className="max-w-2xl type-body text-muted-foreground">
        Every underlined word is a control. There is no Fine Tune, because there is nothing to fine
        tune until a sentence is not saying what you meant — and then you change the word that is
        wrong. The forty-five numbers still exist; none of them has to be met to make a sound.
      </p>

      {/* A second sentence, so the arrangement is the same grammar rather than a different one. */}
      <div className="rounded border border-border p-4">
        <SketchLabel>And Over The Whole Take</SketchLabel>
        <p className="mt-2 max-w-3xl type-title">
          It opens plain for 4 bars, chews for 8, breathes wide, then chews again — and every time
          round it drifts a little further from where it started.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline">
          Say it differently
        </Button>
        <Button size="sm" variant="ghost">
          Show me the numbers ▸
        </Button>
      </div>
    </div>
  );
}
