/**
 * @role That there is one transport over all the yards: a press sends one command per yard, and
 *   the header's three buttons and the Space key send exactly the same ones (P66).
 */
// One import per surface this file compares, and one `it` per claim P66 makes; both counts track
// how many things a global press has to agree with rather than anything this file decides.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies, max-lines-per-function
import { isValidElement, type ReactElement } from "react";
import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

// The one hook this row calls, made callable outside a renderer so a button's own handler can be
// pressed, exactly as src/ui/DeckTransport.test.tsx does.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return { ...react, useCallback: (callback: unknown) => callback };
});

import { manualClock } from "@/app/clock";
import type { Command } from "@/app/commands";
import { silentEngine } from "@/app/engineDouble";
import { createInstrument, type Instrument } from "@/app/facade";
import { TRANSPORT_ALL_LABELS, type TransportAction } from "@/lib/copy";
import { playToggleCommand } from "@/ui/actions";
import { patchDeck, type SessionStore } from "@/state/store";
import { GlobalTransport } from "@/ui/GlobalTransport";
import { keyPress } from "@/ui/keyPress";
import { commandsForShortcut } from "@/ui/shortcuts";

/**
 * An instrument over the silent graph double, and the store that graph writes into — `playing`
 * is the one field only the graph knows (src/app/engine.ts), so a test that needs a yard to be
 * playing writes it the way the graph would.
 */
function silent(): { instrument: Instrument; store: SessionStore } {
  const built: SessionStore[] = [];
  const instrument = createInstrument(manualClock(), (store) => {
    built.push(store);
    return silentEngine();
  });
  const store = built[0];
  if (store === undefined) throw new Error("the instrument built no engine");
  return { instrument, store };
}

/** Three loaded yards, so a global press has more than one thing to reach. */
function threeYards(): { instrument: Instrument; store: SessionStore } {
  const built = silent();
  built.instrument.send({ t: "deck.add", deck: "b", emoji: "🌴", name: "North Willow" });
  built.instrument.send({ t: "deck.add", deck: "c", emoji: "🌵", name: "Wild Bramble" });
  for (const deck of ["a", "b", "c"]) {
    built.instrument.send({ t: "deck.load", deck, source: { gen: "sine" } });
  }
  return built;
}

type Pressable = { "aria-label"?: string; onClick?: () => void };

/** The button inside one `Says`: the trigger renders the control itself and wraps nothing (0094). */
const triggered = (child: ReactElement): ReactElement<Pressable> | null => {
  if (!isValidElement<{ children: ReactElement }>(child)) return null;
  const inner = child.props.children;
  return isValidElement<Pressable>(inner) ? inner : null;
};

/** Press the header's button for one gesture, and collect everything it sent. */
function pressed(instrument: Instrument, action: TransportAction): Command[] {
  const sent: Command[] = [];
  vi.spyOn(instrument, "send").mockImplementation((sendable) => {
    // `send` takes a bare command or an envelope around one; what a press means is the command.
    sent.push("cmd" in sendable ? sendable.cmd : sendable);
  });
  const row = GlobalTransport({ instrument });
  if (!isValidElement<{ children: ReactElement[] }>(row)) throw new Error("no transport row");
  for (const child of row.props.children) {
    // Each child is `TransportButton`, a plain function component: calling it is what a first
    // render does, and its own child is the `Says` holding the button.
    if (!isValidElement<{ action: TransportAction; instrument: Instrument }>(child)) continue;
    if (child.props.action !== action) continue;
    // Every component in this tree is a plain function; nothing here is a class.
    // oxlint-disable-next-line no-unsafe-type-assertion
    const call = child.type as (props: typeof child.props) => ReactElement;
    const button = triggered(call(child.props));
    if (button === null) throw new Error(`${action}: no button under its tooltip`);
    expect(button.props["aria-label"]).toBe(TRANSPORT_ALL_LABELS[action]);
    button.props.onClick?.();
    vi.restoreAllMocks();
    return sent;
  }
  throw new Error(`no ${action} button`);
}

/** What the Space key sends against this session. */
const spacebar = (instrument: Instrument): readonly Command[] =>
  commandsForShortcut(keyPress("Space"), instrument.state.getState());

describe("one transport over all the yards", () => {
  it("sends one per-deck command per yard, and never a command of its own", () => {
    const { instrument } = threeYards();

    expect(pressed(instrument, "play")).toEqual([
      { t: "deck.play", deck: "a" },
      { t: "deck.play", deck: "b" },
      { t: "deck.play", deck: "c" },
    ]);
    expect(pressed(instrument, "pause")).toEqual([
      { t: "deck.pause", deck: "a" },
      { t: "deck.pause", deck: "b" },
      { t: "deck.pause", deck: "c" },
    ]);
    expect(pressed(instrument, "stop")).toEqual([
      { t: "deck.stop", deck: "a" },
      { t: "deck.stop", deck: "b" },
      { t: "deck.stop", deck: "c" },
    ]);
  });

  /**
   * The key is the yard's own play control pressed on every yard, and it stays that whatever the
   * session is doing: whether a yard is sounding is the graph's to answer, and `deck.play.toggle`
   * asks it at the moment it runs. Resolving it here instead would read `playing`, which the
   * graph does not write until the transport's lookahead has elapsed — so a second press inside
   * that window would rewind every yard instead of pausing it.
   */
  it("sends the key the same per-yard toggle a yard's own transport sends", () => {
    const { instrument, store } = threeYards();
    const everyYardInTurn = ["a", "b", "c"].map((deck) => playToggleCommand(deck));

    expect(spacebar(instrument)).toEqual(everyYardInTurn);

    // A yard reporting itself playing does not change what the key sends — the command is the
    // same one either way, and the graph is what turns it into a pause.
    patchDeck(store, "b", { playing: true });
    expect(spacebar(instrument)).toEqual(everyYardInTurn);
  });

  it("is a press that does nothing when the session has no yard to send to", () => {
    const { instrument: empty } = silent();
    empty.send({ t: "deck.remove", deck: "a" });
    expect(empty.state.getState().deckList).toEqual([]);

    expect(pressed(empty, "play")).toEqual([]);
    expect(pressed(empty, "stop")).toEqual([]);
    expect(spacebar(empty)).toEqual([]);

    // A yard with nothing loaded is skipped for the same reason its own row is disabled: there
    // is no playhead to move, and a global press must not spray one error per empty yard.
    const { instrument: unloaded } = silent();
    expect(pressed(unloaded, "play")).toEqual([]);
  });
});
