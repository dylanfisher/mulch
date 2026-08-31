/**
 * @role What a clip card reads as (P52): its name is text in the card's header and no field sits
 *   on the card, and the rename the pencil opens still sends one `clip.rename`.
 */
import { Children, isValidElement, type ReactNode } from "react";
import type * as ReactTypes from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { CLIPS_LABEL } from "@/lib/copy";

// The same two hooks a control is called through outside a renderer (DeckRemove.test), plus the
// open flag the rename popover holds: a mocked `useState` hands back the state it was declared
// with, which is the closed popover this test presses Enter inside.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useState: (initial: unknown) => [initial, () => {}],
    useSyncExternalStore: (_subscribe: unknown, read: () => unknown) => read(),
  };
});

import { manualClock } from "@/app/clock";
import { silentEngine } from "@/app/engineDouble";
import { createInstrument, type Instrument } from "@/app/facade";
import { ClipRack } from "@/ui/ClipRack";

type Props = {
  children?: ReactNode;
  render?: ReactNode;
  "aria-label"?: string;
  onBlur?: (event: { currentTarget: { value: string } }) => void;
  onKeyDown?: (event: { key: string; currentTarget: { value: string } }) => void;
};

/** A component this walk can call itself: everything in this rack's own tree is one. */
const isCallable = (type: unknown): type is (props: Props) => ReactNode =>
  typeof type === "function";

/**
 * What one component renders, called with no renderer around it. A primitive that needs a real
 * renderer reaches for a hook and throws, leaving itself the leaf it is. That hook is inside
 * node_modules, holding the real React no mock here reaches, so the throw arrives behind React's
 * own warning about a call this file makes on purpose: it is dropped, and every other message
 * still goes out.
 */
function outsideRenderer(call: (props: Props) => ReactNode, props: Props): ReactNode {
  const said = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].startsWith("Invalid hook call")) return;
    said(...args);
  };
  try {
    return call(props);
  } catch {
    return null;
  } finally {
    console.error = said;
  }
}

/**
 * Every control in a tree, whether it is written into it or returned by a component inside it: a
 * function element is called for what it renders. A card's own controls are what this reaches.
 */
function find(node: ReactNode, label: string, depth = 40): Props | null {
  if (depth === 0) return null;
  for (const child of Children.toArray(node)) {
    if (!isValidElement<Props>(child)) continue;
    if (child.props["aria-label"] === label) return child.props;
    const rendered = isCallable(child.type) ? outsideRenderer(child.type, child.props) : null;
    const hit =
      find(rendered, label, depth - 1) ??
      find(child.props.children ?? null, label, depth - 1) ??
      find(child.props.render ?? null, label, depth - 1);
    if (hit !== null) return hit;
  }
  return null;
}

/** One captured clip, named as the smoke names its first one. */
const captured = (): Instrument => {
  const instrument = createInstrument(manualClock(), () => silentEngine());
  instrument.send({ t: "deck.load", deck: "a", source: { gen: "sine", hz: 440 } });
  instrument.send({ t: "clip.capture", id: "clip-1", name: "clip 1", deck: "a" });
  if (instrument.probe().clips.length !== 1) throw new Error("nothing was captured");
  return instrument;
};

describe("the clip rack", () => {
  /**
   * P98: an empty rack was a heading over a frame with nothing in it — a box that says nothing —
   * and the first capture is what brings it onto the screen. Nothing is lost with it: the gesture
   * that makes a clip is the yard's own (0078).
   */
  it("draws nothing at all in a session that has captured no clips", () => {
    const instrument = createInstrument(manualClock(), () => silentEngine());
    expect(instrument.probe().clips).toEqual([]);

    expect(ClipRack({ instrument })).toBeNull();
    expect(renderToStaticMarkup(<ClipRack instrument={instrument} />)).toBe("");
  });

  it("calls itself one word, on the section and on the heading over it", () => {
    const markup = renderToStaticMarkup(<ClipRack instrument={captured()} />);

    // Both from the holder: the accessible name and the word a reader sees. A surface that goes
    // back to typing one of them keeps its old spelling when the other moves.
    expect(markup).toContain(`aria-label="${CLIPS_LABEL}"`);
    expect(markup).toMatch(
      new RegExp(`<div class="[^"]*type-eyebrow[^"]*">${CLIPS_LABEL}</div>`, "u"),
    );
  });
});

describe("a clip card", () => {
  // P52: the header says what the clip is called, in text. The field that was standing in for
  // that label is behind the pencil, so the rack itself renders no input at all.
  it("wears its name as text, with no field on the card", () => {
    const markup = renderToStaticMarkup(<ClipRack instrument={captured()} />);

    // The name itself, as the text of an element and not as some control's label: the labels
    // below all carry it too, so only the element with the name as its whole content is proof.
    expect(markup).toMatch(/<div class="[^"]*type-readout[^"]*">clip 1<\/div>/u);
    expect(markup).not.toContain("<input");
    // And the pencil beside it says it opens something, which is where the field went.
    expect(markup).toMatch(/aria-label="Rename clip 1"[^>]*aria-haspopup="dialog"/u);
    expect(markup).toContain('aria-label="Delete clip 1"');
  });

  // The other half: renaming is still reachable and still one command per deliberate gesture.
  it("still sends one clip.rename from the field the pencil opens", () => {
    const instrument = captured();
    const sent = vi.spyOn(instrument, "send");

    const field = find(ClipRack({ instrument }), "New name for clip 1");
    if (field?.onKeyDown === undefined) throw new Error("no rename field");
    field.onKeyDown({ key: "a", currentTarget: { value: "intr" } });
    field.onKeyDown({ key: "Enter", currentTarget: { value: "intro" } });

    expect(sent.mock.calls).toEqual([[{ t: "clip.rename", id: "clip-1", name: "intro" }]]);
    expect(instrument.probe().clips[0]?.name).toBe("intro");
    // Enter is the whole commit: a field that can be dismissed writes nothing on the way out, or
    // Escape out of a typed edit renames the clip to the thing that was being abandoned.
    expect(field.onBlur).toBeUndefined();
  });
});
