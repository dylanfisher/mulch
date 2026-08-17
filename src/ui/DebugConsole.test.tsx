/** @role Tests that the debug console is a fixed window when open and nothing at all when closed. */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { manualClock } from "@/app/clock";
import { createInstrument, type Stats } from "@/app/facade";
import { COUNTERS, DebugConsole, FEED_ROWS, write } from "@/ui/DebugConsole";

const render = (open: boolean) =>
  renderToStaticMarkup(<DebugConsole instrument={createInstrument(manualClock())} open={open} />);

// One flat list of the console's cases (0007).
// oxlint-disable-next-line max-lines-per-function
describe("DebugConsole", () => {
  it("renders nothing while it is closed", () => {
    expect(render(false)).toBe("");
  });

  it("renders exactly its fixed window of rows, whatever the ring holds", () => {
    const markup = render(true);
    expect(markup.match(/<li/gu)).toHaveLength(FEED_ROWS);
  });

  it("names every counter it is going to fill", () => {
    const markup = render(true);
    for (const name of [
      "frame",
      "events",
      "dropped",
      "queued",
      "decoding",
      "analyzing",
      "context",
      "clock",
      "audio",
      "heap",
      "buffers",
    ]) {
      expect(markup).toContain(`>${name}</dt>`);
    }
  });

  it("reads a counter the browser cannot answer as a dash, never as a measured zero", () => {
    const unknown: Stats = {
      at: 0,
      events: 0,
      dropped: 0,
      queued: 0,
      decoding: 0,
      analyzing: 0,
      context: "none",
      audioLoad: null,
      heapMb: null,
      bufferMb: 0,
    };
    const read = (name: string) => {
      const counter = COUNTERS.find(([label]) => label === name);
      if (counter === undefined) throw new Error(`no counter named ${name}`);
      return counter[1](unknown);
    };

    expect(read("audio")).toBe("—");
    expect(read("heap")).toBe("—");
    // Not every counter is unanswerable: the engine always knows what its cache holds.
    expect(read("buffers")).toBe("0.0MB");
  });

  it("leaves a cell alone when its reading has not moved", () => {
    let text = "";
    let writes = 0;
    const cell = {
      get textContent() {
        return text;
      },
      set textContent(next: string) {
        writes += 1;
        text = next;
      },
    };
    // oxlint-disable-next-line no-unsafe-type-assertion -- write() reaches for item() alone
    const cells = { item: () => cell } as unknown as HTMLCollection;

    write(cells, 1, "0.42ms");
    write(cells, 1, "0.42ms");
    write(cells, 1, "0.43ms");

    expect(text).toBe("0.43ms");
    // Two writes for three paints. Assigning `textContent` replaces the text node whether or
    // not the string matches, and eleven counters standing still is eleven of those a frame.
    expect(writes).toBe(2);
  });
});
