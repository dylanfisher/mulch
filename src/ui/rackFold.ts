/**
 * @role Whether a rack is folded shut, remembered per rack across reloads — the one place a
 *   fold is read from and written to the browser's own store.
 * @instead The guarded read and write themselves → src/ui/preference.ts. The other preferences
 *   that outlive a reload → src/ui/theme.ts and src/ui/sequencerMode.ts. A fold is no part of the session: no command, nothing durable (plan §2).
 */
import { useCallback, useMemo, useState } from "react";

import type { DeckId } from "@/state/store";
import { readStored, writeStored } from "@/ui/preference";

/**
 * A rack is a yard's or it is the master's, which is the one address that names no yard (0320) —
 * the same `DeckId | null` every control on a rack is keyed by, so the fold is keyed by it too.
 * Yard ids are namespaced under a word of their own so that a yard called `master` is still a
 * yard.
 */
export const foldKey = (rack: DeckId | null): string =>
  `mulch:fold:${rack === null ? "master" : `yard:${rack}`}`;

/** The two things a hand can have said. Anything else in the store is not a choice. */
const SHUT = "shut";
const OPEN = "open";

/** What the console calls this preference when the store under it refuses. */
const SAID = "fold";

/**
 * Read once per rack, then held here: this runs during render, and a fold is read on every one.
 * `null` is a rack nobody has folded or opened, which is not the same as one folded open.
 */
const chosen = new Map<string, boolean | null>();

/** Which way this key says, or `null` for anything else — junk and no store at all alike
 *  (src/ui/preference.ts). */
function stored(key: string): boolean | null {
  const saved = readStored(key, SAID);
  return saved === SHUT ? true : saved === OPEN ? false : null;
}

/** What this rack was last left as, or `null` for a rack no hand has folded. */
export function storedFold(rack: DeckId | null): boolean | null {
  const key = foldKey(rack);
  let held = chosen.get(key);
  if (held === undefined) {
    held = stored(key);
    chosen.set(key, held);
  }
  return held;
}

/** Leave this rack folded or open, for this session and for the next one. */
export function rememberFold(rack: DeckId | null, folded: boolean) {
  const key = foldKey(rack);
  chosen.set(key, folded);
  writeStored(key, folded ? SHUT : OPEN, SAID);
}

/**
 * A rack's fold, as the pair the rack itself is handed: remembered first, and `whenUnset` only
 * where no hand has said. The pair's identity moves only when the fold does, because the rack
 * under it is memoised (src/ui/Deck.tsx).
 *
 * `whenUnset` is read on every render rather than at mount, so a default that is a fact about the
 * rack — the master's, which is open once it holds anything — is right even where the rack fills
 * after the first render. A hand's own choice outranks it from the moment it is made.
 *
 * The rack is fixed for the life of the component that asks: a yard's panel is keyed by its id
 * (src/ui/App.tsx) and the master's rack is the one that names no yard.
 */
export function useRackFold(
  rack: DeckId | null,
  whenUnset: boolean,
): [folded: boolean, setFolded: (folded: boolean) => void] {
  const [choice, setChoice] = useState<boolean | null>(storedFold(rack));
  const setFolded = useCallback(
    (folded: boolean) => {
      setChoice(folded);
      rememberFold(rack, folded);
    },
    [rack],
  );
  const folded = choice ?? whenUnset;
  return useMemo(() => [folded, setFolded], [folded, setFolded]);
}
