/** @role The root screen: applies the stored theme, and picks the instrument or the gallery. */
import { lazy, Suspense, useSyncExternalStore } from "react";

import { Logo } from "@/ui/Logo";
import { useTheme } from "@/ui/theme";

/**
 * The gallery hangs off a hash rather than a router: mulch is a single screen, and a
 * router would be a dependency bought for one link. Swap this for real routing the
 * day there is a second real screen — not before.
 */
export const DEV_ROUTE = "#/dev";

// Dynamic, so the gallery — every primitive, every specimen, every icon they pull in —
// is a chunk the instrument only fetches if someone opens #/dev.
const DevPage = lazy(async () => ({ default: (await import("@/ui/dev/DevPage")).DevPage }));

const subscribeToHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
  };
};

const getHash = () => window.location.hash;

/** No `location` on the server, and no hash in a fetched URL either: the instrument. */
const getServerHash = () => "";

export function App() {
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

  return (
    <main className="grid min-h-dvh place-items-center gap-3">
      <Logo className="type-display" />
      <a href={DEV_ROUTE} className="type-body text-muted-foreground hover:text-foreground">
        primitives →
      </a>
    </main>
  );
}
