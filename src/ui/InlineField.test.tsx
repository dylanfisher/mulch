/** @role What an inline field is: a label beside its input, at the height of an sm button. */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { InlineField } from "@/ui/InlineField";

describe("InlineField", () => {
  const markup = renderToStaticMarkup(<InlineField id="hz" label="Freq" type="number" />);

  it("lays the label beside the input, not over it", () => {
    expect(markup).toContain('data-orientation="horizontal"');
    expect(markup).toMatch(/<label[^>]*for="hz"[^>]*>Freq<\/label><input/u);
  });

  it("stands as tall as an sm button, at the top of its row", () => {
    expect(markup).toMatch(/<input[^>]*class="[^"]*\bh-7\b/u);
    expect(markup).toMatch(/data-slot="field"[^>]*class="[^"]*\bself-start\b/u);
  });

  it("wears its hint as a title on the whole field, so the label and the input both say it", () => {
    const hinted = renderToStaticMarkup(
      <InlineField id="hz" label="Freq" hint="Cycles a second" type="number" />,
    );
    expect(hinted).toMatch(/data-slot="field"[^>]*title="Cycles a second"/u);
    // And nothing at all where there is no hint: an empty title is a blank popup.
    expect(markup).not.toContain("title=");
  });
});
