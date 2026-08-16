/** @role The root screen: applies the stored theme, and picks the instrument, the gallery or the log. */
// The root mounts every top-level section and imports each one, so both counts waived here track
// how many things the instrument has rather than how much this file decides. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { lazy, Suspense, useCallback, useSyncExternalStore } from "react";

import type { Instrument } from "@/app/facade";
import { cn } from "@/lib/cn";
import { YARD, YARD_EMOJI } from "@/lib/copy";
import { DURABLE_TEXT_MAX } from "@/lib/guards";
import { deckIdsOf, type DeckEntry, type DeckId } from "@/state/store";
import { Button } from "@/ui/components/button";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/ui/components/menubar";
import { ClipRack } from "@/ui/ClipRack";
import { DebugConsole } from "@/ui/DebugConsole";
import { Deck } from "@/ui/Deck";
import { HistoryControls } from "@/ui/HistoryControls";
import { ACTION_ICONS } from "@/ui/icons";
import { Wordmark } from "@/ui/Logo";
import { DEV_ROUTE, LOG_ROUTE, LOG_ROUTE_ENABLED, useRoute } from "@/ui/routes";
import { SessionArchiveControls } from "@/ui/SessionArchiveControls";
import { useDebugConsoleOpen, useKeyboardShortcuts } from "@/ui/shortcuts";
import { useTheme } from "@/ui/theme";
import { ThemeToggle } from "@/ui/ThemeToggle";
// oxlint-enable import/max-dependencies

/**
 * How wide the instrument gets before it stops growing. Declared here, on the shell's own
 * container, and nowhere below it: a deck, a rack or a waveform that carried a width of its own
 * would stop tracking this one the day it changes (plan P24).
 */
const SHELL_WIDTH = "max-w-7xl";

// Dynamic, so the gallery — every primitive, every specimen, every icon they pull in —
// is a chunk the instrument only fetches if someone opens #/dev.
const DevPage = lazy(async () => ({ default: (await import("@/ui/dev/DevPage")).DevPage }));
const LogPage = lazy(async () => ({ default: (await import("@/ui/dev/LogPage")).LogPage }));

function useActiveDeck(instrument: Instrument): DeckId | null {
  const read = useCallback(() => instrument.state.getState().activeDeck, [instrument]);
  return useSyncExternalStore(instrument.state.subscribe, read, read);
}

/**
 * The decks the session holds, in its own order — the list is the source of truth, and it starts
 * one deck long (0029). Each entry carries the emoji it was added with (P28). The store replaces
 * the array only when a deck is added or removed, so this re-renders on exactly those two
 * commands.
 */
function useDeckList(instrument: Instrument): DeckEntry[] {
  const read = useCallback(() => instrument.state.getState().deckList, [instrument]);
  return useSyncExternalStore(instrument.state.subscribe, read, read);
}

/** The alphabet a deck is named from, before ids stop being things a person says out loud. */
const DECK_LETTERS = Array.from({ length: 26 }, (_, index) => String.fromCodePoint(0x61 + index));

/**
 * An id for the next deck: the first free letter, or a minted one once they run out. Opaque
 * either way — the session stores whatever string arrives, and nothing derives meaning from it
 * (0029). Minted at the call site the way a clip's id is, never inside the command.
 */
function nextDeckId(held: readonly DeckId[]): DeckId {
  const free = DECK_LETTERS.find((letter) => !held.includes(letter));
  return free ?? crypto.randomUUID().slice(0, DURABLE_TEXT_MAX);
}

/**
 * The affordance that adds the first deck and every one after it — a session may hold none. The
 * emoji is drawn here, beside the id this already mints: the command carries both, so a replayed
 * or restored session gets the yard it had rather than a fresh draw (P28).
 */
function AddDeckButton({ instrument }: { instrument: Instrument }) {
  const add = useCallback(() => {
    const held = deckIdsOf(instrument.state.getState().deckList);
    const emoji = YARD_EMOJI[Math.floor(Math.random() * YARD_EMOJI.length)] ?? YARD_EMOJI[0];
    instrument.send({ t: "deck.add", deck: nextDeckId(held), emoji });
  }, [instrument]);

  return (
    <Button size="sm" variant="outline" onClick={add}>
      <ACTION_ICONS.add data-icon="inline-start" />
      add {YARD}
    </Button>
  );
}

// The route comment below applies to this branch, but lives outside the component so adding one
// header control does not turn documentation into component complexity.
// oxlint-disable-next-line max-lines-per-function
export function App({ instrument }: { instrument: Instrument }) {
  const route = useRoute();
  const activeDeck = useActiveDeck(instrument);
  const deckList = useDeckList(instrument);
  const debugConsole = useDebugConsoleOpen();
  useKeyboardShortcuts(instrument, route === "instrument");

  // At the root, so a stored preference applies to every screen and not just the gallery.
  useTheme();
  if (route === "dev") {
    return (
      <Suspense fallback={null}>
        <DevPage />
      </Suspense>
    );
  }

  if (route === "log") {
    return (
      <Suspense fallback={null}>
        <LogPage instrument={instrument} />
      </Suspense>
    );
  }

  return (
    <main className={cn("mx-auto flex min-h-dvh flex-col gap-6 px-6 py-8", SHELL_WIDTH)}>
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Wordmark route={route} className="type-title" />
        <SessionArchiveControls instrument={instrument} />
        <HistoryControls instrument={instrument} />
        <Menubar className="ml-auto">
          <MenubarMenu>
            <MenubarTrigger>view</MenubarTrigger>
            <MenubarContent>
              <MenubarItem render={<a href={DEV_ROUTE}>primitives</a>} />
              {LOG_ROUTE_ENABLED && <MenubarItem render={<a href={LOG_ROUTE}>event log</a>} />}
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
        <ThemeToggle />
      </header>

      {deckList.map((entry) => (
        <Deck
          key={entry.id}
          instrument={instrument}
          deck={entry.id}
          emoji={entry.emoji}
          active={entry.id === activeDeck}
        />
      ))}

      <div className="flex items-center gap-2">
        <AddDeckButton instrument={instrument} />
      </div>

      <ClipRack instrument={instrument} />

      <DebugConsole instrument={instrument} open={debugConsole} />
    </main>
  );
}
