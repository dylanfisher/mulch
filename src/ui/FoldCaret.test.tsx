/** @role That the one caret three foldable headings share turns with the state, and never twice. */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FoldCaret } from "./FoldCaret";

describe("the fold caret", () => {
  // 0055: a state is a toggle, so the caret is one picture turned by the Toggle's own
  // `aria-pressed` rather than a second icon swapped in when the section shuts. Three headings
  // drew this themselves; the assertion lives with the one that draws it now.
  it("turns with the pressed state rather than being a second icon", () => {
    const markup = renderToStaticMarkup(<FoldCaret />);

    expect(markup).toContain("group-aria-pressed/toggle:rotate-180");
    expect(markup).toContain("transition-transform");
    expect(markup).toContain('data-icon="inline-end"');
  });
});
