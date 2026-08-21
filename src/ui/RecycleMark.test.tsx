/** @role That the playing yard's mark is a decoration: drawn only while playing, and hook-free. */
import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RecycleMark } from "@/ui/RecycleMark";

describe("the playing yard's recycle mark", () => {
  it("draws nothing at all for a yard that is not playing", () => {
    expect(renderToStaticMarkup(<RecycleMark playing={false} />)).toBe("");
  });

  // P64: it says the yard is playing and stands still while it says it. The class names are
  // asserted gone rather than merely unused, because a token left in tokens.css and a class left
  // on the element are how motion comes back without anyone deciding to bring it back.
  it("draws a still mark, out of the accessibility tree", () => {
    const markup = renderToStaticMarkup(<RecycleMark playing />);

    expect(markup).not.toContain("animate-recycle-mark");
    expect(markup).not.toContain("animate-");
    expect(markup).toContain('aria-hidden="true"');
  });

  /**
   * The proof that it is off the frame loop, and not a claim about it: a component holding any
   * hook — `useOnFrame`, a store subscription, a ref — throws when it is called outside a
   * renderer, because React has no dispatcher to hand it. This one is called exactly that way
   * (0078, plan §2).
   */
  it("holds no hook, so there is nowhere for a frame subscription to be", () => {
    expect(isValidElement(RecycleMark({ playing: true }))).toBe(true);
  });
});
