/**
 * @role What a dial's number does when it is pressed rather than turned: the field it becomes, the
 *   reading it commits, and the two ways out of it (0201).
 */
import { Children, isValidElement, type ReactNode } from "react";
import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

/** The states this render holds, in the order the component asks for them. */
let states: unknown[] = [];
let asked = 0;

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    // A render outside a renderer: state is this file's, so a handler can be pressed and what it
    // set can be read back — the same stand-in shape src/ui/Knob.test.tsx uses for refs.
    useState: (initial: unknown) => {
      const at = asked++;
      if (!(at in states)) states[at] = initial;
      return [states[at], (next: unknown) => (states[at] = next)];
    },
  };
});

import { KnobReadout, readNumber, withoutUnit } from "@/ui/KnobReadout";

type Field = {
  value?: string;
  onKeyDown?: (event: {
    key: string;
    currentTarget: { value: string };
    preventDefault: () => void;
    stopPropagation: () => void;
  }) => void;
  onBlur?: (event: { currentTarget: { value: string } }) => void;
  onClick?: () => void;
  className?: string;
};

/** The one element the readout draws — a button while it is being read, a field while it is being
 *  typed into — with whatever this render's state left in it. */
function draw(extra: Partial<Parameters<typeof KnobReadout>[0]> = {}) {
  asked = 0;
  const root = KnobReadout({
    readout: { current: null },
    value: 0.5,
    min: 0,
    max: 1,
    step: 0.01,
    format: String,
    parse: readNumber,
    onChange: () => {},
    disabled: false,
    ...extra,
  });
  if (!isValidElement<{ children: ReactNode }>(root)) throw new Error("Readout drew no box.");
  const [box] = Children.toArray(root.props.children);
  if (!isValidElement<Field>(box)) throw new Error("Readout drew nothing in its box.");
  return box.props;
}

/** One reading, opened: the field a hand is now typing into, and what the dial is told. */
function opened(extra: Partial<Parameters<typeof KnobReadout>[0]> = {}) {
  const onChange = vi.fn<(value: number) => void>();
  states = [];
  draw({ ...extra, onChange }).onClick?.();
  const field = draw({ ...extra, onChange });
  return { onChange, field, holding: field.value };
}

const press = (field: Field, key: string, text: string) => {
  field.onKeyDown?.({
    key,
    currentTarget: { value: text },
    preventDefault: () => {},
    stopPropagation: () => {},
  });
};

/** The border words a box carries, which is the whole of what it reserves in space. */
const line = (className: string | undefined) =>
  (className ?? "").split(" ").filter((word) => word.startsWith("border-"));

describe("Knob readout field", () => {
  /**
   * A dial can be turned to about the right number and no closer; a hand that knows it wants 0.42
   * says so. The field opens holding exactly what was on screen, so what is edited is what was
   * read (0201).
   */
  it("opens on the reading it was drawing and commits what is typed into it", () => {
    const { onChange, field, holding } = opened();
    expect(holding).toBe("0.5");

    press(field, "Enter", "0.42");

    expect(onChange).toHaveBeenCalledWith(0.42);
  });

  /** On the dial's own step and inside its own bounds: a typed number is a value like any other,
   *  and nothing may enter by the keyboard that a turn could not reach. */
  it("snaps and clamps a typed reading to the dial's range", () => {
    const { onChange, field } = opened({ value: 0, min: 0, max: 1, step: 0.25 });
    press(field, "Enter", "0.6");
    expect(onChange).toHaveBeenCalledWith(0.5);

    const beyond = opened({ value: 0, min: 0, max: 1, step: 0.25 });
    press(beyond.field, "Enter", "9");
    expect(beyond.onChange).toHaveBeenCalledWith(1);
  });

  /** Clicking away is the same as pressing Enter: a number typed and then left was still typed. */
  it("commits a reading the pointer left rather than dropping it", () => {
    const { onChange, field } = opened();
    field.onBlur?.({ currentTarget: { value: "0.8" } });
    expect(onChange).toHaveBeenCalledWith(0.8);
  });

  /** And Escape is the way out that changes nothing. */
  it("puts the reading back on Escape", () => {
    const { onChange, field } = opened();
    press(field, "Escape", "0.8");
    expect(onChange).not.toHaveBeenCalled();
    expect(states[0]).toBeNull();
  });

  /**
   * A box with nothing readable in it leaves the dial where it stands. An empty field, a stray
   * letter and a half-typed minus sign are all a hand that has not finished, and a zero is not
   * what any of them asked for (P5).
   */
  it.each(["", "  ", "-", "nope"])("refuses %o rather than reading it as a value", (typed) => {
    const { onChange, field } = opened();
    press(field, "Enter", typed);
    expect(onChange).not.toHaveBeenCalled();
  });

  /**
   * The reading and the field are one box. The field underlines itself, so the reading reserves
   * that same line in nothing — otherwise pressing a number nudges it, and everything beside it,
   * a pixel down at the moment the hand arrives to type.
   */
  it("holds the field's box while it is only being read", () => {
    states = [];
    const reading = draw();
    const field = opened().field;
    expect(line(reading.className)).toContain("border-b");
    expect(line(field.className)).toContain("border-b");
  });

  /** A refused dial is refused here too: a number that cannot be turned cannot be typed. */
  it("does not open on a disabled dial", () => {
    states = [];
    draw({ disabled: true }).onClick?.();
    expect(states[0] ?? null).toBeNull();
  });
});

describe("Knob readings", () => {
  it("reads a plain number and nothing else", () => {
    expect(readNumber("1.25", 0, 2)).toBe(1.25);
    expect(readNumber(" 3 ", 0, 4)).toBe(3);
    expect(readNumber("1.2.3", 0, 2)).toBeUndefined();
  });

  /** The unit a readout spells after its number is not part of the number: a hand editing `1.25s`
   *  leaves the `s` where it is far more often than it deletes it. */
  it("drops the unit a reading was spelled with", () => {
    expect(withoutUnit("1.25s", "s")).toBe("1.25");
    expect(withoutUnit("1.25", "s")).toBe("1.25");
    expect(withoutUnit("100%", "%")).toBe("100");
  });
});
