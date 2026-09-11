/**
 * @role One cap over one insertion-ordered cache: a value in, and the oldest out once the map is
 *   over its cap unless the caller says that key is still in use. The whole of what every picture
 *   cache in the instrument holds itself to — the curved rows' tiles, the painter's straight ones,
 *   the screen's bodies and its fringe cells — because a tile is cheap to rebuild and dear to hold,
 *   and a tile rebuilt every painting is neither (0144).
 * @instead Which caches there are, what they are keyed by and how big each is → the file that
 *   spends it: src/ui/driftTiles.ts for the curved rows, src/lib/moireScreenField.ts for the
 *   screen's body and fringe, src/ui/moireScreenShop.ts for the finished tiles. Deciding when a
 *   bake happens at all → those same files; nothing here builds anything.
 */

/**
 * The oldest goes once the cache is over its cap, unless it is one the caller is still drawing
 * with. `used` answers whether a key is live; a cache without one evicts by age alone. Re-setting a
 * key it already holds leaves its place in the insertion order, so a hit ages exactly as it did.
 */
export function hold<Value>(
  cache: Map<string, Value>,
  key: string,
  value: Value,
  cap: number,
  used?: (key: string) => boolean,
): Value {
  cache.set(key, value);
  for (const oldest of cache.keys()) {
    if (cache.size <= cap) break;
    if (used?.(oldest) === true) continue;
    cache.delete(oldest);
  }
  return value;
}
