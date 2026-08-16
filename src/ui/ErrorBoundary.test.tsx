import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ErrorBoundary } from "@/ui/ErrorBoundary";

/**
 * React does not run error boundaries during server rendering, and the suite has no DOM — so the
 * two halves are exercised where they actually live: the static that decides what was caught, and
 * the render branch that decides what a person then sees. Driving the class directly is the point
 * rather than a shortcut; a boundary that renders its children is not the case worth asserting.
 */
describe("ErrorBoundary", () => {
  it("passes its children through while nothing has thrown", () => {
    const markup = renderToStaticMarkup(
      <ErrorBoundary>
        <p>the instrument</p>
      </ErrorBoundary>,
    );
    expect(markup).toBe("<p>the instrument</p>");
  });

  it("keeps the message off an Error, and stringifies anything else thrown", () => {
    expect(ErrorBoundary.getDerivedStateFromError(new Error("peaks went missing"))).toEqual({
      message: "peaks went missing",
    });
    // A throw is not required to be an Error, and a boundary that renders `undefined` at the
    // reader is no better than the blank page it replaced.
    expect(ErrorBoundary.getDerivedStateFromError("a bare string")).toEqual({
      message: "a bare string",
    });
  });

  it("says what it caught instead of rendering nothing", () => {
    const boundary = new ErrorBoundary({ children: <p>the instrument</p> });
    boundary.state = ErrorBoundary.getDerivedStateFromError(new Error("peaks went missing"));

    const markup = renderToStaticMarkup(boundary.render());

    expect(markup).toContain("mulch stopped");
    expect(markup).toContain("peaks went missing");
    expect(markup).toContain("Reload to start again.");
    // The tree that threw must not still be on screen beside the message.
    expect(markup).not.toContain("the instrument");
  });
});
