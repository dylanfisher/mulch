/** @role The root screen: applies the stored theme, picks the instrument or the gallery, and holds the one toast provider anything below it says a finished thing through. */
// The root mounts every top-level section and imports each one, so both counts waived here track
// how many things the instrument has rather than how much this file decides. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { lazy, Suspense, useCallback, useState, useSyncExternalStore } from "react";

import type { Instrument } from "@/app/facade";
import { cn } from "@/lib/cn";
import { ACTION_TOOLTIPS, YARD } from "@/lib/copy";
import { deckIdsOf, type DeckEntry, type DeckId } from "@/state/store";
import { addYardCommand } from "@/ui/actions";
import { useListDrag } from "@/ui/listDrag";
import { Button } from "@/ui/components/button";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/ui/components/menubar";
import { Toaster } from "@/ui/components/toast";
import { TooltipProvider } from "@/ui/components/tooltip";
import { ClipRack } from "@/ui/ClipRack";
import { CommandPalette } from "@/ui/CommandPalette";
import { DebugConsole } from "@/ui/DebugConsole";
import { Deck } from "@/ui/Deck";
import { ExportAudioDialog } from "@/ui/ExportAudioDialog";
import { FileMenu } from "@/ui/FileMenu";
import { GlobalTransport } from "@/ui/GlobalTransport";
import { HistoryControls } from "@/ui/HistoryControls";
import { ACTION_ICONS } from "@/ui/icons";
import { Says } from "@/ui/Says";
import { Wordmark } from "@/ui/Logo";
import { MasterMeter } from "@/ui/MasterMeter";
import { DEV_ROUTE, useRoute } from "@/ui/routes";
import { INSTANT_POPUP, SHELL_BODY, SHELL_HEADER, SHELL_HEADER_ROW } from "@/ui/shell";
import { useDebugConsoleOpen, useKeyboardShortcuts } from "@/ui/shortcuts";
import { SyncClock } from "@/ui/SyncClock";
import { useTheme } from "@/ui/theme";
import { ThemeToggle } from "@/ui/ThemeToggle";
// oxlint-enable import/max-dependencies

// Dynamic, so the gallery — every primitive, every specimen, every icon they pull in —
// is a chunk the instrument only fetches if someone opens #/dev.
const DevPage = lazy(async () => ({ default: (await import("@/ui/dev/DevPage")).DevPage }));

function useActiveDeck(instrument: Instrument): DeckId | null {
  const read = useCallback(() => instrument.state.getState().activeDeck, [instrument]);
  return useSyncExternalStore(instrument.state.subscribe, read, read);
}

/**
 * The decks the session holds, in its own order — the list is the source of truth, and it starts
 * one deck long (0029). Each entry carries the emoji and name it was added with (0057). The store replaces
 * the array only when a deck is added or removed, so this re-renders on exactly those two
 * commands.
 */
function useDeckList(instrument: Instrument): DeckEntry[] {
  const read = useCallback(() => instrument.state.getState().deckList, [instrument]);
  return useSyncExternalStore(instrument.state.subscribe, read, read);
}

/**
 * The affordance that adds the first deck and every one after it — a session may hold none. The
 * command comes from `src/ui/actions.ts`, which is also where the palette's Add Yard entry gets
 * it, so the two surfaces cannot drift into sending different things (P41). Exported for the
 * test that presses this button and the palette's entry and compares what each one sent.
 */
export function AddDeckButton({ instrument }: { instrument: Instrument }) {
  const add = useCallback(() => {
    instrument.send(addYardCommand(instrument.state.getState().spentDeckIds));
  }, [instrument]);

  return (
    <Says what={ACTION_TOOLTIPS.add}>
      <Button size="sm" variant="outline" onClick={add}>
        <ACTION_ICONS.add data-icon="inline-start" />
        Add {YARD}
      </Button>
    </Says>
  );
}

/**
 * The yards, in the session's order, and the gesture that changes it: the same drag of a handle
 * the rack's cards wear, one list up (0111). The list is its own element rather than the main
 * column, because the gesture reads its geometry from the children it wraps and the clip rack,
 * the add button and the console are not yards. It keeps the column's own gap, so nothing moves —
 * and it draws nothing at all when the session holds no yards, or the column would pay that gap
 * twice for an element with nothing in it.
 */
function YardList({
  instrument,
  deckList,
  activeDeck,
}: {
  instrument: Instrument;
  deckList: DeckEntry[];
  activeDeck: DeckId | null;
}) {
  // `order` is read at the release: an undo may have edited the list under a live drag.
  const order = useCallback(() => deckIdsOf(instrument.state.getState().deckList), [instrument]);
  const reorder = useCallback(
    // Built here, not in actions.ts: one surface sends it, as with the rack's own reorder.
    (deck: DeckId, index: number) => {
      instrument.send({ t: "deck.reorder", deck, index });
    },
    [instrument],
  );
  const { listRef, slotRef, listProps, dragHandle } = useListDrag<DeckId>({ order, reorder });

  // Nothing at all for a session holding no yards (0029) — see the note above the gap.
  if (deckList.length === 0) return null;

  return (
    <div ref={listRef} className="relative flex flex-col gap-6" {...listProps}>
      {deckList.map((entry, index) => (
        <Deck
          key={entry.id}
          instrument={instrument}
          deck={entry.id}
          emoji={entry.emoji}
          name={entry.name}
          active={entry.id === activeDeck}
          handle={dragHandle(index, entry.id, deckList.length - 1)}
        />
      ))}
      {/* The slot a live drag would land in, sized from what it measured — the rack's, one up. */}
      <div
        ref={slotRef}
        hidden
        aria-hidden="true"
        data-slot="yard-landing"
        className="pointer-events-none absolute bg-accent"
      />
    </div>
  );
}

// The route comment below applies to this branch, but lives outside the component so adding one
// header control does not turn documentation into component complexity.
// oxlint-disable-next-line max-lines-per-function
function Screen({ instrument }: { instrument: Instrument }) {
  const route = useRoute();
  const activeDeck = useActiveDeck(instrument);
  const deckList = useDeckList(instrument);
  const debugConsole = useDebugConsoleOpen();
  // Where the File menu says a failed export or import out loud: in the header row, not inside
  // the menubar's own 32px box, and not swallowed with the menu that caused it (principle 5).
  const [fileError, setFileError] = useState<string | null>(null);
  // The shell owns the Export Audio dialog because two surfaces open it — the File menu and the
  // palette — and two of them would be two dialogs stacked in the same corner (P41).
  const [exportingAudio, setExportingAudio] = useState(false);
  const onExportAudio = useCallback(() => {
    setFileError(null);
    setExportingAudio(true);
  }, []);
  useKeyboardShortcuts(instrument, route === "instrument");

  if (route === "dev") {
    return (
      <Suspense fallback={null}>
        <DevPage />
      </Suspense>
    );
  }

  return (
    <div className="min-h-dvh">
      {/* Fixed and blurred, the treatment the gallery already wore: the menus, the meter and the
          history controls stay reachable however far down the yards a person has scrolled (P46). */}
      <header className={SHELL_HEADER}>
        <div className={SHELL_HEADER_ROW}>
          <Wordmark route={route} className="type-title" />
          <Menubar>
            <FileMenu
              instrument={instrument}
              onError={setFileError}
              onExportAudio={onExportAudio}
            />
            <MenubarMenu>
              <MenubarTrigger>View</MenubarTrigger>
              <MenubarContent className={INSTANT_POPUP}>
                <MenubarItem render={<a href={DEV_ROUTE}>Primitives</a>} />
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
          {/* One transport over all the yards, beside the menus rather than on any one of them:
              Space sends what these three send, and a yard's own row still moves that yard
              alone (P66). */}
          <GlobalTransport instrument={instrument} />
          {/* Beside it, and for the same reason: a clock every yard's player reads is one fact
              over the whole session, so it lives on the bar rather than on any one yard (0097). */}
          <SyncClock instrument={instrument} />
          {fileError !== null && (
            <span className="type-body text-destructive" role="alert">
              {fileError}
            </span>
          )}
          <div className="ml-auto flex items-center gap-3">
            <MasterMeter instrument={instrument} />
            <HistoryControls instrument={instrument} />
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className={cn(SHELL_BODY, "flex flex-col gap-6")}>
        {/* Above the yards, because the yards are what a person scrolls through and a rack that
          sat under all of them was reached last (P32). */}
        <ClipRack instrument={instrument} />

        <YardList instrument={instrument} deckList={deckList} activeDeck={activeDeck} />

        <div className="flex items-center gap-2">
          <AddDeckButton instrument={instrument} />
        </div>

        <DebugConsole instrument={instrument} open={debugConsole} />

        {/* Both overlays sit outside the header for the reason the archive picker does: a menu's
          content is portalled away the moment it closes, and these open as that happens. */}
        <ExportAudioDialog
          instrument={instrument}
          open={exportingAudio}
          onOpenChange={setExportingAudio}
          onError={setFileError}
        />
        <CommandPalette
          instrument={instrument}
          onError={setFileError}
          onExportAudio={onExportAudio}
        />
      </main>
    </div>
  );
}

/**
 * How long a pointer rests on a control before its tooltip appears. A quarter of a second, which
 * is a trade and not a free win: a hand crossing a rack of a dozen knobs passes over every one of
 * them, and the reason this number is not zero is that at zero each would flash in turn. That
 * cost does not vanish at 250 — it is paid down, not paid off. What buys it is the other side:
 * the instrument is a dense surface of unlabelled dials whose sentences are the only thing saying
 * what they do, and a sentence a quarter of a second away is one a hand reads while it works,
 * where a sentence a second away is one it has to stop and wait for. Declared here, beside the
 * toast's own timeout and for the same reason: the provider below is the one place tooltips are
 * configured, and every control in the instrument reads its delay from that one mount. Not in the
 * primitive, which `pnpm shadcn add` regenerates (0003).
 */
export const TOOLTIP_DELAY_MS = 250;

/**
 * How long a toast stands before it takes itself away. Declared here because the provider below is
 * the one place toasts are configured, and every surface that says a finished thing goes through
 * it — long enough to read a filename off, and the close button is still there for sooner (P56).
 */
export const TOAST_TIMEOUT_MS = 6000;

/**
 * The shell: the stored theme, applied once so it reaches every screen, and the one toast
 * provider — above the route branch, so a thing that finishes says so from wherever it ran, and
 * so there is never a second viewport stacking its own toasts in the same corner. A toast is not
 * session state and survives nothing: it is the interface saying a thing finished, autohiding,
 * with a control to dismiss it sooner.
 */
export function App({ instrument }: { instrument: Instrument }) {
  useTheme();
  return (
    <Toaster timeout={TOAST_TIMEOUT_MS}>
      <TooltipProvider delay={TOOLTIP_DELAY_MS}>
        <Screen instrument={instrument} />
      </TooltipProvider>
    </Toaster>
  );
}
