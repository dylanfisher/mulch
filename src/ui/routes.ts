/**
 * @role The three screens the hash selects between, and the one reading of `location.hash` that
 *   names which is current — so the root, the gallery, the log and the wordmark all agree.
 * @instead The screens themselves → src/ui/App.tsx, src/ui/dev/DevPage.tsx, src/ui/dev/LogPage.tsx.
 */
import { useCallback, useSyncExternalStore } from "react";

/**
 * The instrument is the fallback route, not a hash of its own: anything unrecognised lands on it.
 * This is the hash a link back to it carries, so an `href` exists to point at.
 */
export const INSTRUMENT_ROUTE = "#/";
/**
 * The gallery hangs off a hash rather than a router: mulch is a single screen, and a
 * router would be a dependency bought for one link. Swap this for real routing the
 * day there is a second real screen — not before.
 */
export const DEV_ROUTE = "#/dev";
/** The event log beside the gallery — dev only; drive tails the same stream headlessly. */
export const LOG_ROUTE = "#/log";
/**
 * Whether `LOG_ROUTE` exists at all in this build. Read both by the resolver below and by the
 * header that offers the link, so a production build cannot end up advertising a route that
 * resolves to the instrument.
 */
export const LOG_ROUTE_ENABLED = import.meta.env.DEV;

/** Which screen a hash selects. Everything unrecognised is the instrument. */
export type Route = "instrument" | "dev" | "log";

/**
 * The hash, resolved to a screen. The log is dev-only, so in a production build `#/log` is
 * simply another unrecognised hash and the instrument answers for it — decided by the one
 * `LOG_ROUTE_ENABLED` above, which is also what the header reads before offering the link.
 */
export function routeOf(hash: string): Route {
  if (hash === DEV_ROUTE) return "dev";
  if (hash === LOG_ROUTE && LOG_ROUTE_ENABLED) return "log";
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
