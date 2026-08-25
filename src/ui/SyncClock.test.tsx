/**
 * @role That the header's clock is a second way to send one session command: the switch holds a
 *   clock, the dial moves it, and neither holds an opinion the session does not (0097).
 */
import { isValidElement, type ReactElement } from "react";
import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

// The two hooks this control calls, made callable outside a renderer — the same shape
// src/ui/GlobalTransport.test.tsx and src/ui/ClipRack.test.tsx use.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useSyncExternalStore: (_subscribe: unknown, read: () => unknown) => read(),
  };
});

import { manualClock } from "@/app/clock";
import type { Command } from "@/app/commands";
import { silentEngine } from "@/app/engineDouble";
import { createInstrument, type Instrument } from "@/app/facade";
import { SYNC_MAX_SECS, SYNC_MIN_SECS } from "@/lib/playerClock";
import { SyncClock, SYNC_DEFAULT_SECS } from "@/ui/SyncClock";

/** The switch's own surface, and the dial's — exactly what a press and a drag reach for. */
type Switch = { pressed?: boolean; onPressedChange?: (pressed: boolean) => void };
type Dial = { value?: number; min?: number; max?: number; onChange?: (value: number) => void };

const silent = (): Instrument => createInstrument(manualClock(), () => silentEngine());

/** The row this control renders: the switch's tooltip, and the dial when a clock is held. */
function row(instrument: Instrument): ReactElement[] {
  const rendered = SyncClock({ instrument });
  if (!isValidElement<{ children: unknown }>(rendered)) throw new Error("no clock row");
  const held: unknown = rendered.props.children;
  const children: unknown[] = Array.isArray(held) ? held : [held];
  return children.filter((child): child is ReactElement => isValidElement(child));
}

/** The control inside one `Says`: the trigger renders the control itself and wraps nothing (0094). */
function pressable(child: ReactElement | undefined): Switch {
  if (!isValidElement<{ children: ReactElement }>(child)) throw new Error("no tooltip");
  const inner = child.props.children;
  if (!isValidElement<Switch>(inner)) throw new Error("no switch under it");
  return inner.props;
}

/** The dial, which carries its own sentence and so is not wrapped (src/ui/Knob.tsx). */
function dial(child: ReactElement | undefined): Dial {
  if (!isValidElement<Dial>(child)) throw new Error("no dial under a held clock");
  return child.props;
}

/** Everything one gesture on this control sent, as the commands it sent. */
function sent(instrument: Instrument, gesture: () => void): Command[] {
  const commands: Command[] = [];
  vi.spyOn(instrument, "send").mockImplementation((sendable) => {
    commands.push("cmd" in sendable ? sendable.cmd : sendable);
  });
  gesture();
  vi.restoreAllMocks();
  return commands;
}

describe("the header's shared jump clock", () => {
  it("holds a clock on the first press and drops it on the next", () => {
    const instrument = silent();
    const press = (pressed: boolean) => () => {
      pressable(row(instrument)[0]).onPressedChange?.(pressed);
    };
    expect(sent(instrument, press(true))).toEqual([{ t: "session.sync", sync: SYNC_DEFAULT_SECS }]);

    instrument.send({ t: "session.sync", sync: SYNC_DEFAULT_SECS });
    expect(pressable(row(instrument)[0]).pressed).toBe(true);
    expect(sent(instrument, press(false))).toEqual([{ t: "session.sync", sync: null }]);
  });

  it("offers no dial until there is a clock, and sends the whole clock when one moves", () => {
    const instrument = silent();
    // Off, the switch is the only thing on the bar: there is no period to dial (0097).
    expect(row(instrument)).toHaveLength(1);

    instrument.send({ t: "session.sync", sync: SYNC_DEFAULT_SECS });
    expect(dial(row(instrument)[1])).toMatchObject({
      value: SYNC_DEFAULT_SECS,
      min: SYNC_MIN_SECS,
      max: SYNC_MAX_SECS,
    });
    const moved = sent(instrument, () => {
      dial(row(instrument)[1]).onChange?.(2);
    });
    expect(moved).toEqual([{ t: "session.sync", sync: 2 }]);
  });
});
