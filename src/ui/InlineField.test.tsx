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
});
