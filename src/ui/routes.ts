/**
 * @role The screens the hash selects between, and the one reading of `location.hash` that
 *   names which is current — so the root, the gallery, the sketches and the wordmark all agree.
 * @instead The screens themselves → src/ui/App.tsx, src/ui/dev/DevPage.tsx,
 *   src/ui/sketch/SketchPage.tsx.
 */
import { useCallback, useSyncExternalStore } from "react";

/**
 * The instrument is the fallback route, not a hash of its own: anything unrecognised lands on it.
 * This is the hash a link back to it carries, so an `href` exists to point at.
 */
export const INSTRUMENT_ROUTE = "#/";
/**
 * The gallery hangs off a hash rather than a router: mulch is one screen and two workbenches
 * beside it, and a router would be a dependency bought for two links. The switch below now
 * selects three, which is still an `if` and still not the day to buy one — what would buy it is
 * a route that carries a *parameter*, because that is the first thing a hash comparison cannot
 * do. Until then a screen costs one const, one member and one line.
 */
export const DEV_ROUTE = "#/dev";
/**
 * The sketch bench, where an argument about a surface is drawn before it is built. Deleted with
 * `src/ui/sketch/` the day one of its arguments wins (0247).
 */
export const SKETCH_ROUTE = "#/sketch";

/** Which screen a hash selects. Everything unrecognised is the instrument. */
export type Route = "instrument" | "dev" | "sketch";

/** The hash, resolved to a screen. */
export function routeOf(hash: string): Route {
  if (hash === DEV_ROUTE) return "dev";
  if (hash === SKETCH_ROUTE) return "sketch";
  return "instrument";
}

const subscribeToHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
  };
};

const getHash = () => window.location.hash;

/** No `location` on the server, and no hash in a fetched URL either: the instrument. */
const getServerHash = () => "";

/** The current screen, re-read whenever the hash changes. */
export function useRoute(): Route {
  const read = useCallback(() => routeOf(getHash()), []);
  const readServer = useCallback(() => routeOf(getServerHash()), []);
  return useSyncExternalStore(subscribeToHash, read, readServer);
}
