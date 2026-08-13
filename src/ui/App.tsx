/** @role The root screen: applies the stored theme, and picks the instrument, the gallery or the log. */
import { lazy, Suspense, useSyncExternalStore } from "react";

import type { Instrument } from "@/app/facade";
import { Logo } from "@/ui/Logo";
import { useTheme } from "@/ui/theme";

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

export function App({ instrument }: { instrument: Instrument }) {
  const route = useSyncExternalStore(subscribeToHash, getHash, getServerHash);

  // At the root, so a stored preference applies to every screen and not just the gallery.
  useTheme();

  if (route === DEV_ROUTE) {
    return (
      <Suspense fallback={null}>
        <DevPage />
      </Suspense>
    );
  }

  // DEV-gated, unlike the window.mulch attach (plan §3): the panel is a human debugging
  // surface, and drive reads the same stream over its binding, not through this page.
  if (route === LOG_ROUTE && import.meta.env.DEV) {
    return (
      <Suspense fallback={null}>
        <LogPage instrument={instrument} />
      </Suspense>
    );
  }

  return (
    <main className="grid min-h-dvh place-items-center gap-3">
      <Logo className="type-display" />
      <div className="flex gap-4">
        <a href={DEV_ROUTE} className="type-body text-muted-foreground hover:text-foreground">
          primitives →
        </a>
        {import.meta.env.DEV && (
          <a href={LOG_ROUTE} className="type-body text-muted-foreground hover:text-foreground">
            log →
          </a>
        )}
      </div>
    </main>
  );
}
