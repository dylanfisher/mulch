/**
 * @role The browser's own store, reached safely, and one preference held on top of it: the guarded
 *   read and write a rack's fold goes through, and `storedChoice`, which is the whole of a
 *   preference every render reads — the theme, the sequencer view and the drift's switch
 *   (principle 3).
 * @instead What a preference means — its key, its wording, how it is read and what it defaults to
 *   → the module that owns it: src/ui/theme.ts, src/ui/sequencerMode.ts, src/ui/driftShown.ts,
 *   src/ui/rackFold.ts. Nothing about the session belongs here; a preference sends no command and
 *   leaves no history entry (plan §2).
 */
import { useSyncExternalStore } from "react";

/**
 * `localStorage` is not always there to be read: blocking all cookies, or embedding the app in a
 * third-party frame, makes access throw rather than return null. Every caller reads inside a
 * render, so an escaping error takes the whole tree down — a blank instrument over a preference.
 * Loud but proportionate: say so, then let the caller's own default stand.
 *
 * `said` is the preference, in the words its own module would use, because the line on the console
 * is the only place a person meets this failure.
 */
export function readStored(key: string, said: string): string | null {
  // No `localStorage` at all is not that: it is the no-DOM case each caller's server snapshot
  // states, and saying it out loud there buries the access that really did fail.
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`mulch: cannot read the stored ${said}, using the default instead`, error);
    return null;
  }
}

/**
 * Leave a preference for the next session, or — with `null` — leave none at all, which is how a
 * choice that is the absence of a choice is stored.
 *
 * Where reading throws, writing throws too. The choice still applies for this session; it just
 * will not outlive the tab, which is worth a line on the console and nothing more.
 */
export function writeStored(key: string, value: string | null, said: string) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch (error) {
    console.error(`mulch: cannot store the ${said}, it will not survive a reload`, error);
  }
}

/**
 * One preference that outlives a reload, whole: the cached read, the one `storage` listener that
 * keeps two tabs from diverging, the write, and the hook a render asks through. The theme, the
 * sequencer view and the drift's switch were the same thirty lines three times over — the third
 * is where sharing stops being premature (principle 3) — so what is left in each of their modules
 * is what that preference actually *is*: its key, its wording, how a stored string is read as a
 * choice and how a choice is written back.
 *
 * `reading` is handed whatever the store said, or `null` for junk, a throw and no store alike, and
 * answers this preference's own default for anything it does not recognise. `writing` answers the
 * string to leave, or `null` where the choice is the absence of a choice. `onServer` is what
 * everybody starts on where there is no DOM at all.
 *
 * One listener per preference, however many readers it has: a screen of subscribers on one key
 * would be a screen of re-reads on every write.
 */
export function storedChoice<T>(
  key: string,
  said: string,
  reading: (saved: string | null) => T,
  writing: (choice: T) => string | null,
  onServer: T,
): { use: () => T; set: (choice: T) => void } {
  const listeners = new Set<() => void>();
  /** Read once, then held here: `getSnapshot` runs on every render and must be cheap. */
  let current: T | undefined;
  const stored = () => reading(readStored(key, said));
  const notifyAll = () => {
    for (const notify of listeners) notify();
  };
  const onStorage = (event: StorageEvent) => {
    // `localStorage` is shared between tabs, so a choice made in one is a choice made in all: the
    // cache has to be dropped when another tab writes, or the two diverge until reload. A tab that
    // called `clear()` names no key at all, which is everybody's.
    if (event.key !== null && event.key !== key) return;
    current = stored();
    notifyAll();
  };
  const subscribe = (onChange: () => void) => {
    if (listeners.size === 0) window.addEventListener("storage", onStorage);
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
      if (listeners.size === 0) window.removeEventListener("storage", onStorage);
    };
  };
  return {
    use: () =>
      useSyncExternalStore(
        subscribe,
        () => (current ??= stored()),
        () => onServer,
      ),
    set: (choice: T) => {
      current = choice;
      writeStored(key, writing(choice), said);
      notifyAll();
    },
  };
}
