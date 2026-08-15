/** @role Tests that the debug console is a fixed window when open and nothing at all when closed. */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { DebugConsole, FEED_ROWS } from "@/ui/DebugConsole";

const render = (open: boolean) =>
  renderToStaticMarkup(<DebugConsole instrument={createInstrument(manualClock())} open={open} />);

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
    ]) {
      expect(markup).toContain(`>${name}</dt>`);
    }
  });
});
