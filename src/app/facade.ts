/**
 * @role The facade — the headless instrument. send() is the only mutator, probe() the whole
 *       state as JSON, on() the event stream; UI, CLI and agents all enter here.
 */
import { PARAMS } from "@/audio/params";
import { clamp, snapToStep } from "@/lib/range";
import {
  createSessionStore,
  DECK_IDS,
  type DeckId,
  type SessionState,
  type SessionStore,
} from "@/state/store";
import { EventBus } from "./bus";
import type { Clock } from "./clock";
import type { Command, Envelope } from "./commands";
import type { Event } from "./events";
import { CommandQueue } from "./queue";

export type Probe = { at: number; decks: SessionState["decks"] };

export type Instrument = {
  /** The only way to change anything. A bare command is an envelope meaning now. */
  send(input: Command | Envelope): void;
  /** The full state as JSON — what agents assert on for state, as the log is for behaviour. */
  probe(): Probe;
  /** Lossless event subscription; returns unsubscribe. */
  on(listener: (event: Event) => void): () => void;
  /** The ring's view of recent events — what the #/log panel renders. */
  ring(): Event[];
  /** Deliver scheduled envelopes that have come due. The host decides how often. */
  pump(): void;
};

// Commands arrive as parsed JSON from outside the type system, so the runtime checks here are
// load-bearing, not belt-and-braces. Malformed input throws; well-formed commands whose
// implementation a later milestone owns emit an error event instead (0009).
function assertDeck(deck: DeckId): void {
  if (!DECK_IDS.includes(deck)) throw new TypeError(`unknown deck: ${deck}`);
}

function execute(cmd: Command, store: SessionStore, bus: EventBus): void {
  switch (cmd.t) {
    case "param.set": {
      // hasOwn, not an index-and-check: the types say a ParamId always resolves, but this
      // value arrived as JSON and the runtime check is the load-bearing one.
      if (!Object.hasOwn(PARAMS, cmd.param)) {
        throw new TypeError(`unknown param: ${cmd.param}`);
      }
      assertDeck(cmd.deck);
      const spec = PARAMS[cmd.param];
      // Out-of-range clamps rather than rejects, the way plugin hosts treat a host
      // automation value — and the event carries the value actually applied.
      const value =
        spec.step === undefined
          ? clamp(cmd.value, spec.min, spec.max)
          : snapToStep(cmd.value, spec.min, spec.max, spec.step);
      store.setState((s) => ({
        decks: {
          ...s.decks,
          [cmd.deck]: {
            ...s.decks[cmd.deck],
            params: { ...s.decks[cmd.deck].params, [cmd.param]: value },
          },
        },
      }));
      bus.emit({ t: "param.changed", deck: cmd.deck, param: cmd.param, value });
      return;
    }
    case "deck.load":
    case "deck.play":
    case "deck.stop":
    case "deck.loop":
    case "session.save":
      bus.emit({ t: "error", detail: `unimplemented: ${cmd.t}` });
      return;
    default:
      throw new TypeError(`unknown command: ${String((cmd as { t?: unknown }).t)}`);
  }
}

export function createInstrument(clock: Clock): Instrument {
  const store = createSessionStore();
  const bus = new EventBus(clock);
  const queue = new CommandQueue(clock, (cmd) => {
    execute(cmd, store, bus);
  });

  return {
    send: (input) => {
      queue.enqueue("cmd" in input ? input : { cmd: input });
    },
    probe: () => ({ at: clock.now(), decks: store.getState().decks }),
    on: (listener) => bus.on(listener),
    ring: () => bus.ring(),
    pump: () => {
      queue.pump();
    },
  };
}
