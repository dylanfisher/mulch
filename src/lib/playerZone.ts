/**
 * @role The zone a hand marked on a yard's ground: the stretch of the source the loop may stand in,
 *   as one span in that loop's own sixteenths, how far either edge of it may reach, and the check
 *   one off the wire goes through (0318). Pure maths — no clock, no buffer and no canvas.
 * @instead What a ground *is*, and the one place a zone narrows — `bedBounds`, which every reader
 *   of a ground already comes through → src/lib/playerBed.ts. The reading a pointer on the strip
 *   names an edge with → `zoneAt`, src/lib/playerGround.ts. The picture a hand marks it on →
 *   src/ui/PlayerGround.tsx and src/ui/PlayerGroundZone.tsx.
 */
import { exactKeys, objectAt, whole } from "./guards.ts";
import { PLAYER_BED_DISTANCE_MAX } from "./playerBed.ts";

/**
 * The furthest either edge of a zone may be marked, in the loop's own sixteenths: the reach a move
 * already has in this unit, said for the other edge as well. That reach is declared once, beside
 * the dial it is the reach of (`PLAYER_BED_DISTANCE_MAX`, src/lib/playerBed.ts) — a zone marks the
 * ground a crawl may reach, so it cannot have a reach of its own (principle 1).
 */
export const PLAYER_ZONE_MIN = -PLAYER_BED_DISTANCE_MAX;
export const PLAYER_ZONE_MAX = PLAYER_BED_DISTANCE_MAX;

/**
 * The stretch of the source a hand said the ground may stand in: one span in the loop's own
 * sixteenths, `from` no higher than `to`, both whole (0318).
 *
 * One span and not a list, because the list of places a ground returns to is already the planted
 * beds: a zone is the bound and the beds are the itinerary, and a second arrangement beside them
 * would be two answers to where the loop goes. The yard's own and not the session's, for the
 * reason the unit gives — a sixteenth is a sixteenth *of this yard's loop*, so one shared zone
 * would mean a different region of every file.
 */
export type BedZone = { from: number; to: number };

/**
 * The zone off the wire or out of storage, checked — the shape `bedsOf` above has, said for the
 * one field beside it that is not a list. **Null is no zone**, which is the whole of "unbounded"
 * and is this module exactly as it stood before a hand could mark one (principle 1, the shape
 * `bedEvery: 0` already has).
 *
 * `from` above `to` is loud rather than swapped: a span whose ends arrived the wrong way round is
 * a spec from something that was not counting them, and quietly turning it over would hide that
 * (principle 5).
 */
export function zoneOf(value: unknown, at: string): BedZone | null {
  if (value === null) return null;
  const marked = objectAt(value, at);
  exactKeys(marked, ZONE_FIELDS, at);
  const from = whole(marked["from"], PLAYER_ZONE_MIN, PLAYER_ZONE_MAX, `${at} from`);
  const to = whole(marked["to"], PLAYER_ZONE_MIN, PLAYER_ZONE_MAX, `${at} to`);
  if (from > to) throw new RangeError(`${at} runs from ${from} down to ${to}`);
  // The same care `bedAt` takes with its own edge: `-0` and `0` are `Object.is`-distinct, and this
  // pair is held durably, compared against the one in the store and read back out of a log.
  return { from: from === 0 ? 0 : from, to: to === 0 ? 0 : to };
}

/** The fields one zone is keyed against, read exactly as `BED_FIELDS` above is. */
const ZONE_FIELDS = ["from", "to"] as const;
