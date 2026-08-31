/** @role What one row of an automator's run is made of: its columns, the control it carries, and
 *   the picture it wears (P24, P172, P173). The rack around it is src/ui/EffectRack.test.tsx; both
 *   suites mount the same element through src/ui/effectRackDouble.tsx. */
import { describe, expect, it } from "vitest";

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { silentEngine } from "@/app/engineDouble";
import type { Command, Envelope } from "@/app/commands";
import { dismissLabel } from "@/lib/copyAuto";
import { GROWTH_COUNT_MAX } from "@/lib/effectGrowth";
import {
  drawingOf,
  findLabelled,
  grownPlace,
  grownTree,
  markupOf,
  POOL,
} from "@/ui/effectRackDouble";
import { ROW_LEFT } from "@/ui/PlayerPart";

// One case per thing a row is made of, which is what the suite is: a `describe` is not a function
// to split, and splitting it by size rather than by subject would name groups nothing means. Read
// and judged — see docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("one row of the run", () => {
  /**
   * A row is a picture, a name, the dials, the ×, the bar and the clock on one line. Every column
   * but the name is fixed or floored, so a narrow card takes its width out of the name by
   * truncating it — which is what the row already says the name is for (P24).
   */
  it("gives a narrow row's slack to the name and to nothing else", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "automator" });
    const markup = markupOf(instrument);
    const row = markup.split('data-slot="grown-row"')[1] ?? "";

    // The dials sit beside the name and ahead of the ×: a control between a name and its dials is
    // a column the two of them have to share.
    const name = row.indexOf('data-slot="grown-name"');
    const dials = row.indexOf('data-slot="grown-values"');
    const go = row.indexOf('data-slot="grown-go"');
    expect(name).toBeGreaterThan(-1);
    expect(dials).toBeGreaterThan(name);
    expect(go).toBeGreaterThan(dials);
    // The name is the one column that may shrink to nothing, and it truncates when it does.
    expect(row).toContain('data-slot="grown-name" class="min-w-0 basis-2/5 truncate"');
    // The bar absorbs what slack there is, down to a floor it cannot shrink past — at two pixels
    // it was a bar nobody could read, with the dials hard against the clock beside it.
    expect(row).toContain('class="h-1 min-w-8 shrink grow bg-foreground/10"');
  });

  /**
   * The other half of the same rule: a column that gives the name nothing had better be spending
   * the width on something it draws. The clock's was 80px for a word that is 52px at its longest,
   * and once the bar was floored at 32px the row's fixed columns wanted 244px of the 238px a
   * 360px phone gives it — so every row ran 6px past its own right edge with the name already
   * truncated to nothing, which is what `scripts/smoke.d/narrow.js` reads (P173).
   */
  it("reserves the countdown no more width than the longest clock it draws", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "automator" });
    const row = markupOf(instrument).split('data-slot="grown-row"')[1] ?? "";

    // 56px, against the 52px "59m 59s" measures at — fixed, so a row counting down never moves
    // the bar beside it, and no wider, so the name keeps the rest.
    expect(row).toContain(
      'data-slot="grown-left" class="w-14 shrink-0 text-right text-muted-foreground tabular-nums"',
    );
    // The arrangement rows reserve the same column for the same words, so the two widths are one
    // width: a claim two files make and only one of them keeps is a claim nobody keeps.
    expect(ROW_LEFT.startsWith("w-14 ")).toBe(true);
  });

  // A run grows and lets go on its own clock; nothing under it should move when it does.
  it("keeps the run's box one size however many places are filled", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "automator" });
    const markup = markupOf(instrument);

    // No row is dropped out of the layout: an empty one is invisible, and still a line high.
    expect(markup).not.toContain('hidden data-slot="grown-row"');
    expect(markup.split("invisible").length - 1).toBe(GROWTH_COUNT_MAX);
    expect(markup.split("h-[1lh]").length - 1).toBe(GROWTH_COUNT_MAX);
    // And the word for an empty run is laid over those rows rather than taking a height of its own.
    expect(markup).toContain('data-slot="grown-empty" class="absolute');
  });

  /**
   * The one control a run's own rows carry. It is mounted with the row rather than added to it —
   * every row is already mounted once whether or not it is holding anything, and nothing per-frame
   * may go through state (docs/boundaries.md, 0070).
   */
  it("draws a × per row of the run, reachable by a keyboard as well as a pointer", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "automator" });
    const markup = markupOf(instrument);

    expect(markup.split('data-slot="grown-go"').length - 1).toBe(GROWTH_COUNT_MAX);
    expect(markup.split(`aria-label="${dismissLabel(null)}"`).length - 1).toBe(GROWTH_COUNT_MAX);
    // A real button rather than a pressable span, and one that shows itself to a focus as well as
    // to a hovering pointer: a control only a pointer can reach is one no keyboard and no
    // ./scripts/drive can press (docs/plan.md §4).
    expect(markup.split('<button type="button" tabindex="0" data-slot="grown-go"').length - 1).toBe(
      GROWTH_COUNT_MAX,
    );
    expect(markup).toContain("focus-visible:opacity-100");
  });

  /**
   * Which place a press names is read off `peek()` at the press and never off a prop: a row
   * addressed by its slot alone would let go of whatever had rolled into that slot while the
   * pointer travelled (0204).
   */
  it("names the place the peek is holding, and says nothing on a row holding none", () => {
    for (const holding of [true, false]) {
      const instrument = createInstrument(manualClock(), () =>
        silentEngine({
          peek: (_deck, out) => {
            out.grown.set("one", holding ? [grownPlace("auto:0:0:0:filter")] : []);
          },
        }),
      );
      instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "automator" });
      const sent: (Command | Envelope)[] = [];
      const rows = grownTree(
        {
          ...instrument,
          send: (input) => {
            sent.push(input);
          },
        },
        instrument,
      );

      findLabelled(rows, dismissLabel(null))?.onClick?.();
      expect(sent).toEqual(
        holding
          ? [{ t: "effect.dismiss", deck: "a", instance: "one", place: "auto:0:0:0:filter" }]
          : [],
      );
    }
  });

  it("mounts a picture per pool entry in every row of the run, hidden until one is held", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "automator" });
    const markup = markupOf(instrument);

    // One per entry per row, mounted with the row: which one is showing is a per-frame flag, so a
    // population turning over costs no render (0070, docs/boundaries.md).
    expect(markup.split('data-slot="grown-icon"').length - 1).toBe(POOL.length * GROWTH_COUNT_MAX);
    // In the pool's own order *within one row*, because the painter picks which one shows by
    // indexing that row's own spans against `POOL`: a mis-ordered mount would wear another
    // entry's picture. Read off the first row alone, since the grid above draws the same eight.
    const rows = markup.split('data-slot="grown-row"');
    const row = rows[1]!;
    const drawn = POOL.map((plugin) => row.indexOf(drawingOf(plugin)));
    expect(drawn).not.toContain(-1);
    // Strictly in order: any picture standing before the one the pool declares ahead of it is a
    // row whose spans no longer line up with `POOL`, which is what the painter indexes them by.
    expect(drawn.filter((where, which) => which > 0 && where < drawn[which - 1]!)).toEqual([]);
    // And every one of them starts hidden: a row holding nothing wears no picture.
    expect(markup.split('data-slot="grown-icon" aria-hidden="true" hidden').length - 1).toBe(
      POOL.length * GROWTH_COUNT_MAX,
    );
  });
});
