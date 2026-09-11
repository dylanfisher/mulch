/**
 * @role The worker seam, checked rather than remembered: every host that builds a worker holds the
 *   `new Worker(new URL(…, import.meta.url), …)` expression **inline**, and the helper they share
 *   builds none. A bundler rewrites that expression where it is written and follows nothing handed
 *   in as a variable, so a helper that took the URL emitted no worker chunk and every worker in the
 *   built app failed to start on a green unit gate — which is the whole reason this case exists
 *   (0354).
 * @instead What each port is asked and what comes back → the host's own file and its worker under
 *   src/workers/. The listeners the three share → ./workerPort.ts.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const HERE = import.meta.dirname;

/**
 * Read as text on purpose, the way src/audio/worklet.test.ts reads its own: what the module holds at
 * runtime under Node says nothing about what a build would emit. The claim is about the source.
 */
const sourceOf = (name: string): string => readFileSync(join(HERE, name), "utf8");

/** One file's source with every comment line dropped: what the bundler is actually handed. */
const code = (source: string): string =>
  source
    .split("\n")
    .filter((line) => {
      const said = line.trim();
      return !said.startsWith("*") && !said.startsWith("//") && !said.startsWith("/*");
    })
    .join("\n");

/** Every host that builds a worker, and the entry point each of them must name inline. */
const HOSTS: readonly (readonly [string, string])[] = [
  ["analysis.ts", "../workers/analysis.ts"],
  ["drift.ts", "../workers/drift.ts"],
  ["screen.ts", "../workers/screen.ts"],
];

describe("the worker seam", () => {
  it("builds every worker inline, where a bundler can see it", () => {
    for (const [host, entry] of HOSTS) {
      const source = sourceOf(host);
      expect(source, `${host} names its entry point`).toContain(entry);
      // The whole expression, in one piece: a URL lifted into a variable — or into a helper's
      // parameter — is a worker the build never bundles and the page never starts.
      expect(code(source), `${host} builds its worker inline`).toContain(
        `new Worker(new URL("${entry}", import.meta.url)`,
      );
    }
  });

  it("builds no worker in the helper the hosts share", () => {
    // It takes one already built, for the reason above: a construction here would be the one place
    // the three hosts could quietly collapse back into. Read off the code and not the prose — this
    // file's own reasons name the expression, and so do that one's.
    expect(code(sourceOf("workerPort.ts"))).not.toContain("new Worker(");
  });

  it("says what failed where a worker fires an event with no message on it", () => {
    // A worker that never ran its first line fires a plain `Event`, and `event.message` on it is
    // `undefined` — which is what the failure sentence carried, naming neither worker nor fault.
    const source = code(sourceOf("workerPort.ts"));
    expect(source).toContain("instanceof ErrorEvent");
    expect(source).not.toMatch(/onFailure\(event\.message/u);
  });
});
