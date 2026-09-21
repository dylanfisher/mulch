/**
 * @role That the header's readout says what the session is putting the sound through, and that it
 *   follows an add and a remove on both counts it is named for.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { manualClock } from "@/app/clock";
import { createInstrument, type Instrument } from "@/app/facade";
import { silentEngine } from "@/app/engineDouble";
import { MULCH_GRADES, MULCH_TALLY_LABELS } from "@/lib/copyMulch";
import { MulchTally } from "@/ui/MulchTally";

const silent = (): Instrument => createInstrument(manualClock(), () => silentEngine());

/** The numbers the readout drew, by the name each is marked with. */
function countsOf(instrument: Instrument): Record<string, number> {
  const markup = renderToStaticMarkup(<MulchTally instrument={instrument} />);
  const drawn: Record<string, number> = {};
  for (const [, name, count] of markup.matchAll(
    /data-count="(\w+)"[\s\S]*?type-readout">(\d+)</gu,
  )) {
    drawn[name!] = Number(count);
  }
  return drawn;
}

/** The word grading the depth, which the readout draws after the numbers. */
function gradeOf(instrument: Instrument): string {
  const markup = renderToStaticMarkup(<MulchTally instrument={instrument} />);
  return /data-slot="mulch-grade"[^>]*>([^<]*)</u.exec(markup)?.[1] ?? "";
}

// One `it` per count the readout follows, and the count tracks how many it draws. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the header's mulch tally", () => {
  it("captions every count it draws, so each number is named in the markup", () => {
    const markup = renderToStaticMarkup(<MulchTally instrument={silent()} />);
    for (const label of Object.values(MULCH_TALLY_LABELS)) expect(markup).toContain(`>${label}<`);
    // The captions are the names: nothing here carries an `aria-label`, which on an element with
    // no role would name nothing anyway.
    expect(markup).not.toContain("aria-label");
  });

  it("counts the yards, and follows one added and one removed", () => {
    const instrument = silent();
    expect(countsOf(instrument).yards).toBe(1);

    instrument.send({ t: "deck.add", deck: "b", emoji: "🌴", name: "North Willow" });
    expect(countsOf(instrument).yards).toBe(2);

    instrument.send({ t: "deck.remove", deck: "b" });
    expect(countsOf(instrument).yards).toBe(1);
  });

  it("counts every rack's effects, the master's with the yards', and follows an add and a remove", () => {
    const instrument = silent();
    expect(countsOf(instrument)).toMatchObject({ effects: 0, deepest: 0 });

    instrument.send({ t: "effect.add", deck: "a", id: "dly", effect: "delay" });
    instrument.send({ t: "effect.add", deck: null, id: "bus", effect: "reverb" });
    expect(countsOf(instrument)).toMatchObject({ effects: 2, deepest: 2 });

    instrument.send({ t: "effect.remove", deck: "a", instance: "dly" });
    expect(countsOf(instrument)).toMatchObject({ effects: 1, deepest: 1 });
  });

  it("counts a parameter that is moving on its own", () => {
    const instrument = silent();
    expect(countsOf(instrument).moving).toBe(0);

    instrument.send({
      t: "automation.set",
      deck: "a",
      param: "deck.gain",
      points: [
        { at: 0, value: 0.2 },
        { at: 1, value: 0.8 },
      ],
    });
    expect(countsOf(instrument).moving).toBe(1);
  });

  it("grades the depth in a word, and deepens as the chain does", () => {
    const instrument = silent();
    expect(gradeOf(instrument)).toBe(MULCH_GRADES[0]);

    instrument.send({ t: "effect.add", deck: "a", id: "dly", effect: "delay" });
    expect(gradeOf(instrument)).toBe(MULCH_GRADES[1]);

    instrument.send({ t: "effect.add", deck: "a", id: "vrb", effect: "reverb" });
    expect(gradeOf(instrument)).toBe(MULCH_GRADES[2]);
  });
});
