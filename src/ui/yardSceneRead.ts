/**
 * @role The one memoized reading of a yard's name: a name never changes, so a surface reads it
 *   once a yard rather than once a render. Its own module because
 *   three surfaces read it — the picture, the yard's header and the drift's tuning panel — and the
 *   panel is worn by the strip, so a hook kept in src/ui/MoireStrip.tsx could not be imported back
 *   into it (principle 1, and the cycle that would be).
 * @instead The reading itself → src/lib/yardScene.ts, and the words it is said in →
 *   src/lib/copyScene.ts. What the picture does with a reading → src/ui/moireScreenTile.ts.
 */
import { useMemo } from "react";

import { type YardScene, yardScene } from "@/lib/yardScene";

/**
 * The field this yard's picture is of, read off its own name: the scene its plant stands in, the
 * light its air puts that scene under, the wind its adjective sets, and how close its place word
 * stands to the one thing its place noun names (`yardScene`, 0329, 0335).
 */
export function useYardScene(name: string): YardScene {
  return useMemo(() => yardScene(name), [name]);
}
