/** @role Tests that the tuning panel lists every tunable under the copy's groups, with words on each, and offers the copy only to the author. */
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { MOIRE_TUNE, MOIRE_TUNE_COPY, MOIRE_TUNE_RESET, tuningPrompt } from "@/lib/copyDrift";
import { MOIRE_TUNE_GROUPS } from "@/lib/copyDriftGroups";
import { SHARD_DOWN, SHARD_REACH, SHARD_STEP } from "@/lib/moireShards";
import { snapToStep } from "@/lib/range";
import { resetTuning, setTuning, tunings } from "@/lib/moireTuning";
import {
  DriftTuning,
  grouped,
  groupPush,
  isLocalHost,
  pushGroup,
  TuningFields,
} from "@/ui/MoireTuning";
// The strip is what wears the panel, and loading it declares every tunable the panel lists.
import "@/ui/MoireStrip";

describe("DriftTuning", () => {
  afterEach(resetTuning);

  it("is the one button that opens it", () => {
    expect(renderToStaticMarkup(<DriftTuning />)).toContain(`>${MOIRE_TUNE}</button>`);
  });

  it("renders one slider per tunable, under its group, and reads the value back", () => {
    const markup = renderToStaticMarkup(<TuningFields debug={false} />);
    for (const handle of tunings()) {
      expect(markup).toContain(`aria-label="${handle.id}"`);
    }
    expect(markup).toContain(">Shards</h3>");
    expect(markup).toContain(">Throw</span>");
    expect(markup).toContain(`>${SHARD_REACH.value.toFixed(3)}</span>`);
  });

  it("lists every tunable once, under the copy's groups and in the copy's order", () => {
    const groups = grouped(tunings());
    expect(groups.map(({ group }) => group.title)).toEqual(MOIRE_TUNE_GROUPS.map((g) => g.title));
    const ids = groups.flatMap(({ rows }) => rows.map((row) => row.handle.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(tunings().length);
    for (const { rows } of groups) {
      for (const { entry, handle } of rows) {
        expect(entry.id).toBe(handle.id);
        expect(entry.label).not.toBe("");
        expect(entry.hint).not.toBe("");
      }
    }
    for (const { group } of groups) expect(group.hint).not.toBe("");
  });

  it("refuses a tunable with no words and words with no tunable", () => {
    const wordless = { id: "nobody.saysThis", rest: 0, min: 0, max: 1, step: 0.1, value: 0 };
    expect(() => grouped([...tunings(), wordless])).toThrow(
      /"nobody.saysThis" has a slider and no words/u,
    );
    expect(() => grouped(tunings().filter((handle) => handle.id !== "pace.slowHz"))).toThrow(
      /"pace.slowHz" has words and no slider/u,
    );
  });

  it("offers the copy to the author only, and only once something has moved", () => {
    const rest = renderToStaticMarkup(<TuningFields debug={true} />);
    expect(rest).toContain(MOIRE_TUNE_COPY);
    expect(rest).toMatch(new RegExp(`disabled=""[^>]*>${MOIRE_TUNE_RESET}`, "u"));
    expect(rest).toMatch(new RegExp(`disabled=""[^>]*>${MOIRE_TUNE_COPY}`, "u"));
    expect(renderToStaticMarkup(<TuningFields debug={false} />)).not.toContain(MOIRE_TUNE_COPY);
    setTuning("shards.reach", 0.3);
    const moved = renderToStaticMarkup(<TuningFields debug={true} />);
    expect(moved).not.toMatch(new RegExp(`disabled=""[^>]*>${MOIRE_TUNE_COPY}`, "u"));
    expect(moved).toContain(">0.300</span>");
  });

  it("pushes a group toward its wild ends together, snapped, and reads the push back off the dials", () => {
    const shards = grouped(tunings()).find(({ group }) => group.title === "Shards");
    if (shards === undefined) throw new Error("no Shards group");
    expect(groupPush(shards.rows)).toBe(0);
    pushGroup("Shards", 1);
    expect(SHARD_REACH.value).toBe(SHARD_REACH.max);
    expect(SHARD_STEP.value).toBe(SHARD_STEP.min);
    expect(SHARD_DOWN.value).toBe(SHARD_DOWN.rest);
    expect(groupPush(shards.rows)).toBe(1);
    pushGroup("Shards", 0.5);
    expect(SHARD_REACH.value).toBeCloseTo((SHARD_REACH.rest + SHARD_REACH.max) / 2, 3);
    expect(SHARD_STEP.value).toBe(snapToStep(1.5, SHARD_STEP.min, SHARD_STEP.max, SHARD_STEP.step));
    expect(groupPush(shards.rows)).toBeGreaterThan(0.4);
    expect(groupPush(shards.rows)).toBeLessThan(0.6);
    setTuning("shards.reach", SHARD_REACH.rest);
    expect(groupPush(shards.rows)).toBeLessThan(0.5);
    resetTuning();
    expect(groupPush(shards.rows)).toBe(0);
    expect(() => {
      pushGroup("Nobody", 1);
    }).toThrow(/No drift tuning group "Nobody"/u);
    const markup = renderToStaticMarkup(<TuningFields debug={false} />);
    expect(markup).toContain('aria-label="Push Shards"');
  });

  it("knows the author's own hostnames and no others", () => {
    expect(isLocalHost("localhost")).toBe(true);
    expect(isLocalHost("127.0.0.1")).toBe(true);
    expect(isLocalHost("mulch.example")).toBe(false);
    expect(isLocalHost("localhost.example")).toBe(false);
  });

  it("copies the changed values after a sentence that names the declaration", () => {
    const text = tuningPrompt({ "shards.reach": 0.3 });
    expect(text).toContain('tunable("<id>"');
    expect(text.split("\n").at(-1)).toBe('{"shards.reach":0.3}');
  });
});
