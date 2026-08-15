/** @role The root screen: applies the stored theme, and picks the instrument, the gallery or the log. */
// The root mounts every top-level section and imports each one, so both counts waived here track
// how many things the instrument has rather than how much this file decides. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { lazy, Suspense, useCallback, useSyncExternalStore } from "react";

import type { Instrument } from "@/app/facade";
import { DECK_IDS, type DeckId } from "@/state/store";
import { ClipRack } from "@/ui/ClipRack";
import { Deck } from "@/ui/Deck";
import { HistoryControls } from "@/ui/HistoryControls";
import { Logo } from "@/ui/Logo";
import { SessionArchiveControls } from "@/ui/SessionArchiveControls";
import { useKeyboardShortcuts } from "@/ui/shortcuts";
import { useTheme } from "@/ui/theme";
import { ThemeToggle } from "@/ui/ThemeToggle";

/**
 * The gallery hangs off a hash rather than a router: mulch is a single screen, and a
 * router would be a dependency bought for one link. Swap this for real routing the
 * day there is a second real screen — not before.
 */
export const DEV_ROUTE = "#/dev";
/** The event log beside the gallery — dev only; drive tails the same stream headlessly. */
export const LOG_ROUTE = "#/log";

// Dynamic, so the gallery — every primitive, every specimen, every icon they pull in —
// is a chunk the instrument only fetches if someone opens #/dev.
const DevPage = lazy(async () => ({ default: (await import("@/ui/dev/DevPage")).DevPage }));
const LogPage = lazy(async () => ({ default: (await import("@/ui/dev/LogPage")).LogPage }));

const subscribeToHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
  };
};

const getHash = () => window.location.hash;

/** No `location` on the server, and no hash in a fetched URL either: the instrument. */
const getServerHash = () => "";

function useActiveDeck(instrument: Instrument): DeckId {
  const read = useCallback(() => instrument.state.getState().activeDeck, [instrument]);
  return useSyncExternalStore(instrument.state.subscribe, read, read);
}

// The route comment below applies to this branch, but lives outside the component so adding one
// header control does not turn documentation into component complexity.
// oxlint-disable-next-line max-lines-per-function
export function App({ instrument }: { instrument: Instrument }) {
  const route = useSyncExternalStore(subscribeToHash, getHash, getServerHash);
  const activeDeck = useActiveDeck(instrument);
  const logRoute = route === LOG_ROUTE && import.meta.env.DEV;
  useKeyboardShortcuts(instrument, route !== DEV_ROUTE && !logRoute);

  // At the root, so a stored preference applies to every screen and not just the gallery.
  useTheme();
  if (route === DEV_ROUTE) {
    return (
      <Suspense fallback={null}>
        <DevPage />
      </Suspense>
    );
  }

  if (logRoute) {
    return (
      <Suspense fallback={null}>
        <LogPage instrument={instrument} />
      </Suspense>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-6 py-8">
      <header className="flex items-center gap-4">
        <Logo className="type-title" />
        <SessionArchiveControls instrument={instrument} />
        <HistoryControls instrument={instrument} />
        <a
          href={DEV_ROUTE}
          className="ml-auto type-body text-muted-foreground hover:text-foreground"
        >
          primitives →
        </a>
        {import.meta.env.DEV && (
          <a href={LOG_ROUTE} className="type-body text-muted-foreground hover:text-foreground">
            log →
          </a>
        )}
        <ThemeToggle />
      </header>

      {DECK_IDS.map((deck) => (
        <Deck key={deck} instrument={instrument} deck={deck} active={deck === activeDeck} />
      ))}

      <ClipRack instrument={instrument} />
    </main>
  );
}
