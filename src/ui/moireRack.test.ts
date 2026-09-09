/**
 * @role What the rack that is no yard's puts in a yard's picture: a row of the field, in every
 *   picture there is, keyed apart from the yard's own rack rows (0320, 0321).
 * @instead What a yard's own rack instance draws → src/ui/moireRows.test.ts. The rows no instance
 *   owns at all — the loop's, the wash, the session's → src/ui/moireRowsField.test.ts.
 */
import { describe, expect, it } from "vitest";

import { effectById, type EffectId } from "@/audio/effects/registry";
import { fold } from "@/lib/copy";
import { PLAIN_CUT } from "@/lib/moireSound";
import type { SessionEffect } from "@/state/session";
import { NO_GROWN } from "@/ui/moireGrown";
import { moireRows } from "@/ui/moireRows";
import { ROW_KEYS } from "@/ui/moireRowsField";

const instance = (id: string, over: Partial<SessionEffect> = {}): SessionEffect => {
  const effect: EffectId = over.effect ?? "delay";
  return {
    id,
    effect,
    bypassed: over.bypassed ?? false,
    params: Object.fromEntries(effectById(effect).params.map((param) => [param.id, param.default])),
    automation: {},
    drawn: {},
    bounds: {},
  };
};

const rowsOf = (effects: SessionEffect[], master: readonly SessionEffect[], loopPeriod = 4) =>
  moireRows([], effects, loopPeriod, PLAIN_CUT, null, NO_GROWN, null, master);

describe("the rack that is no yard's, in a yard's picture", () => {
  it("gives a master instance a row of the field, keyed apart from the yard's own rack", () => {
    const { reads } = rowsOf([instance("fx1")], [instance("mst", { effect: "eq" })]);
    const keys = reads.map((read) => read.key);
    // The yard's own instance is filed under the rack prefix and the master's under its own: two
    // pictures of one session would otherwise hand a rebuilt set the wrong row's share.
    expect(keys).toContain(`${ROW_KEYS.rack}fx1`);
    expect(keys).toContain(`${ROW_KEYS.master}mst`);
    expect(keys).not.toContain(`${ROW_KEYS.rack}mst`);
  });

  it("draws it the way a rack instance is drawn, off its own id and its own plugin", () => {
    const { rows, reads } = rowsOf([], [instance("mst", { effect: "eq" })]);
    const at = reads.findIndex((read) => read.key === `${ROW_KEYS.master}mst`);
    expect(at).toBeGreaterThanOrEqual(0);
    expect(reads[at]?.instance).toBe("mst");
    // Its angle and where in its cycle it starts are folded out of its own id, and how it is cut
    // is its own registry entry's — the same two facts a yard's instance row carries (0076, 0139).
    expect(rows[at]?.shape).toBe(fold("mst"));
    expect(rows[at]?.profile).toBe(effectById("eq").drift);
  });

  it("leaves a bypassed master instance out, the way a bypassed yard instance is left out", () => {
    const { reads } = rowsOf([instance("fx1")], [instance("mst", { bypassed: true })]);
    expect(reads.map((read) => read.key)).not.toContain(`${ROW_KEYS.master}mst`);
  });

  it("adds nothing to a picture that holds nothing of its own", () => {
    // A yard with no lane, no instance, no module and nothing loaded draws no drift at all, and
    // one row of somebody else's rack is not that yard's picture arriving.
    const { rows, reads } = rowsOf([], [instance("mst")], 0);
    expect(rows).toHaveLength(0);
    expect(reads).toHaveLength(0);
  });

  it("stands the lattice over a yard whose own rack is empty but the master's is not", () => {
    // The lattice is a picture of a rack standing at all, and a master instance is standing over
    // every yard — so the yard is latticed by it exactly as it would be by one of its own (0278).
    const bare = rowsOf([instance("fx1", { bypassed: true })], []);
    const under = rowsOf([instance("fx1", { bypassed: true })], [instance("mst")]);
    expect(bare.reads.map((read) => read.key)).not.toContain(ROW_KEYS.lattice);
    expect(under.reads.map((read) => read.key)).toContain(ROW_KEYS.lattice);
  });
});
