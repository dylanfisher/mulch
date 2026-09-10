/** @role Tests that the tuning panel lists every tunable under the copy's groups, with words on each, and offers the copy only to the author. */
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { MOIRE_TUNE, MOIRE_TUNE_COPY, MOIRE_TUNE_RESET, tuningPrompt } from "@/lib/copyDrift";
import { MOIRE_TUNE_GROUPS } from "@/lib/copyDriftGroups";
import { SCENE_NAMES } from "@/lib/moireScene";
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

/** One tuning handle by its id, live: the object the panel moves, not a reading of it. */
const tuning = (id: string) => tunings().find((handle) => handle.id === id);

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

  it("holds one group per scene, and every number a scene declares under it", () => {
    // A scene's numbers are argued on the bench and moved on the panel (0247, 0329), so each of the
    // four has a group of its own — the group heading is the part of a tunable id before the dot,
    // so the scene's name is the group by construction and cannot drift from it.
    const groups = grouped(tunings());
    for (const name of SCENE_NAMES) {
      const title = name[0]?.toUpperCase() + name.slice(1);
      const own = groups.find((group) => group.group.title === title);
      expect(own, `no group for ${name}`).toBeDefined();
      expect(own?.rows.length ?? 0, name).toBeGreaterThan(0);
      for (const { handle } of own?.rows ?? []) expect(handle.id.split(".")[0], name).toBe(name);
    }
  });

  it("holds the poppy field's own numbers under the Bloom group", () => {
    // The bloom is a poppy field since 0332, and what a hand argues on it is how far apart the
    // heads stand at the top of a tile and at its foot, how wide a head is, and how far apart the
    // stems run — the four the ground actually reads (src/ui/scene/bloom.ts).
    const bloom = grouped(tunings()).find(({ group }) => group.title === "Bloom");
    expect(bloom?.rows.map((row) => row.handle.id)).toEqual([
      "bloom.far",
      "bloom.near",
      "bloom.head",
      "bloom.stroke",
    ]);
    // And no scene declares a depth any more: how much of the tile's ink a ground takes is not a
    // thing a ground says, the alpha being the film's alone.
    expect(tunings().filter((handle) => handle.id.endsWith(".depth"))).toEqual([]);
  });

  it("holds the seed heads' and the leaf wall's own numbers under their two groups", () => {
    // The meadow is seed heads and the canopy is the light through a wall of leaf since 0334, both
    // drawn from noise rather than gratings — so neither field has a spacing left to turn. What a
    // hand argues on the meadow is how wide a fibre is across the stroke and how long along it, how
    // wide a stalk is, and where on its ramp the mass rests; on the canopy, the two scales of leaf,
    // how far up its ramp the closed mass reaches, how thin the leaf has to be to let sky through,
    // and how rare an open speck is. The five the gratings needed are gone with them.
    const groups = grouped(tunings());
    expect(
      groups.find(({ group }) => group.title === "Meadow")?.rows.map((row) => row.handle.id),
    ).toEqual(["meadow.fibre", "meadow.awn", "meadow.stalk", "meadow.mass"]);
    expect(
      groups.find(({ group }) => group.title === "Canopy")?.rows.map((row) => row.handle.id),
    ).toEqual(["canopy.crown", "canopy.leaf", "canopy.mass", "canopy.thin", "canopy.rare"]);
    // And a spacing nobody reads is a slider that lies (0333): none of the five a grating meadow
    // and a lattice canopy were turned by survives its ground.
    for (const gone of [
      "meadow.stroke",
      "meadow.tuft",
      "meadow.slant",
      "canopy.gap",
      "canopy.through",
    ]) {
      expect(
        tunings().map((handle) => handle.id),
        gone,
      ).not.toContain(gone);
    }
  });

  it("holds the glint's own numbers under the Water group", () => {
    // The water is the glint since 0333, and what a hand argues on it is the two pitches the glints
    // are the beat of, how long one is, how wide the swell is and how black the water under it is —
    // the five the ground actually reads (src/ui/scene/water.ts). The blades are written by hand
    // and are no longer a spacing anyone can turn.
    const water = grouped(tunings()).find(({ group }) => group.title === "Water");
    expect(water?.rows.map((row) => row.handle.id)).toEqual([
      "water.ripple",
      "water.beat",
      "water.dash",
      "water.swell",
      "water.deep",
    ]);
  });

  it("pushes the water's ripple and leaves the pitch it beats against where it stands", () => {
    // A beat is two pitches a fraction apart, so a push that drove both toward one wild end would
    // drive them onto each other and leave the water one grating with no beat in it — the one
    // setting that ground has nothing to say at (0333). The second pitch names no wild end, which
    // is what a row a push leaves alone is for (src/lib/copyDriftGroups.ts).
    const ripple = tuning("water.ripple");
    const beat = tuning("water.beat");
    pushGroup("Water", 1);
    expect(ripple?.value, "the ripple is not pushed").toBe(ripple?.min);
    expect(beat?.value, "the beat is pushed onto the ripple").toBe(beat?.rest);
    expect(ripple?.value).not.toBe(beat?.value);
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
