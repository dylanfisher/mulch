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
 * selects five, which is still an `if` and still not the day to buy one — what would buy it is
 * a route that carries a *parameter*, because that is the first thing a hash comparison cannot
 * do. Until then a screen costs one const, one member and one line.
 */
export const DEV_ROUTE = "#/dev";
/**
 * The sketch bench, where an argument about a surface is drawn before it is built. Deleted with
 * `src/ui/sketch/` the day one of its arguments wins (0247).
 */
export const SKETCH_ROUTE = "#/sketch";
/**
 * The structure bench, where the automator's mark on the picture — the fractal, the mirror — is
 * drawn plainly enough to argue about, six ways; the seventh, the shards, won and is the painter's
 * (0296). A bench of its own rather than a third list on `#/sketch`, because every picture on it
 * bakes the real escape kernel a pixel at a time and a page that mounts twenty pictures to show
 * six is a page nobody opens (0295). Deleted
 * with `src/ui/sketch/structure/` the day one of its arguments wins (0247).
 */
export const STRUCTURE_ROUTE = "#/structure";
/**
 * The marks bench, where the lattice of marks the screen writes (0345, 0346) is pushed every way
 * to see which way it goes next. A bench of its own for the structure bench's reason: every
 * picture reads a scene a cell at a time and writes a lattice a pixel at a time (0347). Deleted
 * with `src/ui/sketch/marks/` the day one of its arguments wins (0247).
 */
export const MARKS_ROUTE = "#/marks";

/** Which screen a hash selects. Everything unrecognised is the instrument. */
export type Route = "instrument" | "dev" | "sketch" | "structure" | "marks";

/** The hash, resolved to a screen. */
export function routeOf(hash: string): Route {
  if (hash === DEV_ROUTE) return "dev";
  if (hash === SKETCH_ROUTE) return "sketch";
  if (hash === STRUCTURE_ROUTE) return "structure";
  if (hash === MARKS_ROUTE) return "marks";
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
