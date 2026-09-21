/**
 * @role The browser's own store, reached safely: the one guarded read and the one guarded write
 *   every view preference that outlives a reload goes through — the theme, the sequencer view and
 *   a rack's fold (principle 3).
 * @instead What a preference means — its key, its wording and its default → the module that owns
 *   it: src/ui/theme.ts, src/ui/sequencerMode.ts, src/ui/rackFold.ts. Nothing about the session
 *   belongs here; a preference sends no command and leaves no history entry (plan §2).
 */

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
