/**
 * @role The worklet seam, checked rather than remembered: every processor in ./worklets/ names
 *   itself the way the main thread spells it, and joins the one MODULES list both contexts load.
 * @instead A processor's own arithmetic → its file's test beside it, on stubbed globals.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import * as worklet from "./worklet";

const HERE = import.meta.dirname;
const WORKLETS = join(HERE, "worklets");

/** Read as text on purpose: `?url` is a bundler specifier that resolves to nothing under Node,
 * so what MODULES holds at runtime here says nothing about what a build would load. The claim
 * is about this file's source — that the processor is named in it — and source is what is read. */
const source = readFileSync(join(HERE, "worklet.ts"), "utf8");

/** Every processor file: plain JavaScript, since a worklet is loaded by url and never bundled. */
const processors = readdirSync(WORKLETS)
  .filter((name) => name.endsWith(".js"))
  .map((name) => ({
    name,
    registers: [
      ...readFileSync(join(WORKLETS, name), "utf8").matchAll(/registerProcessor\(\s*"([^"]+)"/gu),
    ].map(([, registered]) => registered),
  }));

describe("the worklet seam", () => {
  it("has processors to check at all", () => {
    expect(processors.length).toBeGreaterThan(0);
  });

  it.each(processors)("registers $name into MODULES", ({ name }) => {
    // A worklet that exists and is never registered is the shape that makes an export silently
    // lose an effect — every context loads MODULES and nothing else (0088).
    expect(source).toContain(`./worklets/${name}?url`);
    const listed = /const MODULES = \[([^\]]*)\]/u.exec(source);
    expect(listed, "worklet.ts has no MODULES list").not.toBeNull();
    const imported = new RegExp(
      `^import (\\w+) from "\\./worklets/${name.replaceAll(".", "\\.")}\\?url";$`,
      "mu",
    ).exec(source);
    expect(imported, `${name} is not imported ?url`).not.toBeNull();
    expect(listed?.[1]).toContain(imported?.[1]);
  });

  it.each(processors)("spells $name's registered name once on each side", ({ registers }) => {
    // A worklet can import nothing, so the string is written twice by necessity. What may not
    // happen is the two copies drifting: `new AudioWorkletNode` would throw at construction with
    // no compile-time warning, so the pair is asserted here instead.
    const exported = Object.values(worklet).filter((value) => typeof value === "string");
    expect(registers.length).toBeGreaterThan(0);
    for (const registered of registers) expect(exported).toContain(registered);
  });
});
