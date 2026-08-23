/** @role What the four transport states look like, and which command each control sends. */
import { isValidElement, type ReactElement } from "react";
import type * as ReactTypes from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The one hook this row calls, made callable outside a renderer so a control's own handler can be
// pressed. It stands in for exactly what a first render does, as src/ui/Deck.test.tsx does.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return { ...react, useCallback: (callback: unknown) => callback };
});

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import type { DeckState } from "@/state/store";
import { DeckTransport } from "@/ui/DeckTransport";

/** A loaded deck in one of its three transport states — the only fields these controls read. */
const deckState = (over: Partial<DeckState>): DeckState => {
  const state = createInstrument(manualClock()).state.getState().decks.a!;
  return { ...state, duration: 2, ...over };
};

const markupOf = (over: Partial<DeckState>): string => {
  const instrument = createInstrument(manualClock());
  return renderToStaticMarkup(
    <DeckTransport instrument={instrument} deck="a" state={deckState(over)} />,
  );
};

/**
 * What a transport control can be, whichever primitive it turned out to be: a Button clicks, a
 * Toggle reports and changes a pressed state, and both carry their word beside an icon.
 */
type Control = {
  children: ReactElement[];
  onClick?: () => void;
  onPressedChange?: (next: boolean) => void;
  pressed?: boolean;
  disabled?: boolean;
};

/** The word a control shows, with its icon child skipped. */
const wordOf = (props: Control): string =>
  props.children.map((child) => (typeof child === "string" ? child : "")).join("");

/**
 * The control inside one `Says`. Every control in the row says what it does after a rest, and a
 * `Says` renders no element of its own: its child is the whole control — primitive, word, icon
 * and handler — handed to the tooltip's trigger rather than wrapped by it (0094).
 */
const triggered = (child: ReactElement): ReactElement<Control> | null => {
  if (!isValidElement<{ children: ReactElement }>(child)) return null;
  const control = child.props.children;
  return isValidElement<Control>(control) ? control : null;
};

/** One control of the row, so its state and its command can both be read from the element. */
const control = (over: Partial<DeckState>, word: string) => {
  const instrument = createInstrument(manualClock());
  const sent = vi.spyOn(instrument, "send");
  const row = DeckTransport({ instrument, deck: "a", state: deckState(over) });
  if (!isValidElement<{ children: ReactElement[] }>(row)) throw new Error("no transport row");
  for (const child of row.props.children) {
    const found = triggered(child);
    if (found !== null && wordOf(found.props).includes(word)) return { props: found.props, sent };
  }
  throw new Error(`no ${word} control`);
};

/**
 * `disabled` and the word, inside one element: the guard against `</button>` is what keeps a
 * lazy match from starting at one disabled control and ending at a later one's label.
 */
const disabledWith = (word: string) => new RegExp(`disabled=""(?:(?!</button>).)*?${word}<`, "su");

/** Press it, whichever primitive it is — a Toggle is told the state it is moving to. */
const pressed = (over: Partial<DeckState>, word: string) => {
  const { props, sent } = control(over, word);
  const { onPressedChange, onClick, pressed: on = false } = props;
  if (onPressedChange === undefined && onClick === undefined) {
    throw new Error(`the ${word} control has nothing to press`);
  }
  // A control carries exactly one of the two, so this presses whichever one it turned out to be.
  onPressedChange?.(!on);
  onClick?.();
  return sent;
};

// P25: a control holding a state is a Toggle, and it is the toggle — not a swapped variant —
// that reports that state. A gesture that happens once per press stays a Button, so nothing
// tells a reader that a stopped deck is an "unpressed" one.
describe("the deck transport's primitives", () => {
  it("reports play and loop as pressed states through the toggle primitive", () => {
    for (const word of ["Play", "Loop"]) {
      const { props } = control({}, word);
      expect(typeof props.onPressedChange).toBe("function");
      expect(props.onClick).toBeUndefined();
    }
    expect(control({ playing: true }, "Pause").props.pressed).toBe(true);
    expect(control({}, "Play").props.pressed).toBe(false);
    expect(control({ loop: { in: 0, out: 1 } }, "Loop").props.pressed).toBe(true);
    expect(control({}, "Loop").props.pressed).toBe(false);
  });

  it("leaves the once-per-press gestures as buttons", () => {
    for (const word of ["Stop", "Crop", "Flatten"]) {
      const { props } = control({ loop: { in: 0, out: 1 }, paused: 1 }, word);
      expect(typeof props.onClick).toBe("function");
      expect(props.pressed).toBeUndefined();
    }
    // Exactly two of the row's five controls hold a state, so exactly two report one.
    expect(markupOf({ paused: 1 }).match(/aria-pressed=/gu)).toHaveLength(2);
  });

  /**
   * P98: the transport shares a row with the knobs, which stand two caption line boxes taller
   * than it (0093), and the row lays its items on the baseline — so the buttons at the top of the
   * yard's column drifted to the middle of it. They align to the top of that row themselves,
   * rather than the row changing what it does to the knobs beside them.
   */
  it("stands at the top of the row it shares rather than on the knobs' baseline", () => {
    expect(markupOf({})).toMatch(/<div class="[^"]*self-start[^"]*">/u);
  });

  it("draws an icon on every control, from the one vocabulary", () => {
    expect(markupOf({ loop: { in: 0, out: 1 } }).match(/<svg/gu)).toHaveLength(5);
  });
});

describe("the deck transport", () => {
  it("reads play when stopped and pause when playing — one control, one toggle", () => {
    expect(markupOf({})).toMatch(/aria-pressed="false"[^>]*>.*?Play</su);
    expect(markupOf({ playing: true })).toMatch(/aria-pressed="true"[^>]*>.*?Pause</su);
  });

  it("offers stop to a deck with a playhead to send home, playing or merely held (0038)", () => {
    // A stopped deck has nothing to rewind, so the control does not offer it. A held one does:
    // pause is the only state in which stop is the *other* half of what a press could mean.
    expect(control({}, "Stop").props.disabled).toBe(true);
    expect(control({ paused: 1.25 }, "Stop").props.disabled).toBe(false);
    expect(control({ playing: true }, "Stop").props.disabled).toBe(false);
    // And the primitive puts it on the element: a control that took the prop and dropped it
    // would read as pressable to the driver, which is the only thing the smoke can see.
    expect(markupOf({})).toMatch(disabledWith("Stop"));
    expect(markupOf({ paused: 1.25 })).not.toMatch(disabledWith("Stop"));
  });

  it("offers crop only to a deck that has a loop to crop to", () => {
    // Nothing to cut down to is the whole reason: the command refuses a deck with no loop, and
    // the control says so before the press rather than after it.
    expect(control({}, "Crop").props.disabled).toBe(true);
    expect(control({ loop: { in: 0, out: 1 } }, "Crop").props.disabled).toBe(false);
    expect(markupOf({})).toMatch(disabledWith("Crop"));
    expect(markupOf({ loop: { in: 0, out: 1 } })).not.toMatch(disabledWith("Crop"));
  });

  it("sends the ordinary command each gesture means", () => {
    expect(pressed({ playing: true }, "Pause")).toHaveBeenCalledWith({
      t: "deck.play.toggle",
      deck: "a",
    });
    expect(pressed({ paused: 1.25 }, "Stop")).toHaveBeenCalledWith({ t: "deck.stop", deck: "a" });
    expect(pressed({}, "Loop")).toHaveBeenCalledWith({ t: "deck.loop.toggle", deck: "a" });
    // The blob id is minted at the gesture, so only its shape can be asserted from here.
    const cropped = pressed({ loop: { in: 0, out: 1 } }, "Crop").mock.calls[0]?.[0];
    if (cropped === undefined || "cmd" in cropped || cropped.t !== "deck.crop") {
      throw new Error(`the crop button sent ${JSON.stringify(cropped)}`);
    }
    expect(cropped.deck).toBe("a");
    expect(cropped.id.length).toBeGreaterThan(0);
  });
});

/** The one source that is always looped, and the control that would claim otherwise (0110). */
describe("the deck transport holding a tone", () => {
  it("offers no loop toggle, because there is no loop state to move", () => {
    // A tone is always looped and the reducer refuses every clear, so a toggle here would be a
    // control reporting a state nothing can change — withdrawn, the way its handles are.
    expect(markupOf({ loop: { in: 0, out: 1 } })).toContain(">Loop<");
    expect(markupOf({ loop: { in: 0, out: 1 }, source: { gen: "tone", secs: 1 } })).not.toContain(
      ">Loop<",
    );
  });
});
