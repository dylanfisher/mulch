/**
 * @role The mark a playing yard wears beside its transport: two arrows saying this yard is
 *   running. A decoration and nothing else, so it is one element, no animation and no
 *   subscription of any kind (0078). It turned and stuttered until P64 took the motion away: a
 *   mark that moves beside a waveform, a playhead and a moiré strip is one more moving thing on
 *   a screen where the moving things are the ones saying where a deck is reading.
 * @instead Anything that has to say *where* a deck is reading — a playhead, a meter, a cursor —
 *   belongs on the one frame loop in src/ui/frame.ts. This says only that the deck is playing,
 *   which the session already told the render, so a RAF callback would be a second loop for a
 *   fact nobody is measuring (plan §2).
 */

/**
 * Both arcs start at their arrowhead, so head and tail are one path each. The drawing is 2-fold
 * symmetric, which is what makes it read as a cycle from either end.
 */
const ARCS = [
  { arc: "M 4.48 14.74 A 8 8 0 0 0 19.52 14.74", head: "3.45 11.92 6.36 14.06 2.60 15.42" },
  { arc: "M 19.52 9.26 A 8 8 0 0 0 4.48 9.26", head: "20.55 12.08 17.64 9.94 21.40 8.58" },
] as const;

/**
 * `playing` is the whole of what it knows, and a yard that is not draws nothing at all — no
 * element, no animation, no cost. The flag is a prop rather than a store read for the same reason
 * this file holds no hook: with neither, calling this function *is* rendering it, and there is
 * nowhere for a subscription to hide.
 */
export function RecycleMark({ playing }: { playing: boolean }) {
  if (!playing) return null;
  return (
    <svg
      className="size-4 text-muted-foreground"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {ARCS.map(({ arc, head }) => (
        <g key={head}>
          <path d={arc} stroke="currentColor" strokeWidth="2.5" strokeLinecap="butt" />
          <polygon points={head} fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}
