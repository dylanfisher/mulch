/**
 * @role What a rebuilt row set carries over from the one it replaces: the ground the picture's rows
 *   had travelled to, the plane its structure had travelled across, the ink it had travelled
 *   toward, how the rack had shaped it, and how much of the picture each of its rows had become —
 *   with, behind that last one,
 *   every row the new set no longer holds, kept until it has finished leaving. A set is rebuilt on anything durable moving and on a run turning over, neither of which
 *   is a jump — every row in a fresh one stands at its own rest — so a travel that did not survive
 *   the rebuild would restart from the middle of the picture on every knob touch (0235, 0248).
 * @instead The set these are carried between, and every row in it that belongs to no lane →
 *   src/ui/moireRowsField.ts. Building a set, and the per-frame read that travels all three →
 *   src/ui/moireRows.ts, which reads this and which this never reads. Where each travel is actually
 *   stepped → `easedCentre` and `easedToward` in src/lib/moire.ts, `fractalTravelInto` in
 *   src/lib/moireFractal.ts and `inkTravelInto` in src/ui/moireScreen.ts. How much of a row is in
 *   the picture at all, and how long one takes to join it or leave it → src/lib/moireArrival.ts.
 */
import { arrived } from "@/lib/moireArrival";
import type { MoireLook } from "@/ui/moireLooks";
import type { MoireRowSet, RowRead } from "@/ui/moireRowsField";

/**
 * Whether one row rests on the ground the yard is reading: the reference row, the wash over it, the
 * module's own tiers and the picture's own structure, and nothing else. Named once because two
 * things ask — the read that travels them, and the carry that keeps that travel across a rebuilt
 * set (principle 1).
 *
 * **The structure stands on the ground like the rest of the field** (0251). Built through
 * `plainRow` it rested at `DRIFT_REST.centre` and stayed there while every other row the field is
 * beaten against travelled with the ground, which is a large part of why a structure that is a
 * grating still read as a layer over one (0235, 0246). Where it stands on its own *plane* is the
 * population's and travels on its own clock (`fractalTravelInto`, 0248); where it is anchored in
 * the *picture* is the yard's ground, and the two are different journeys.
 */
export const onGround = (read: RowRead): boolean =>
  read.heard !== null || read.ground !== null || read.tier !== null || read.fractal || read.lattice;

/**
 * Where a picture's ground rows had got to, carried onto the set that replaces them. **A row set is
 * rebuilt on things that are not jumps** — anything durable moving, and a run turning over — and
 * every row in a fresh one is built at `DRIFT_REST.centre`, so without this a knob touch would
 * sweep the whole field back from the middle of the picture and a yard holding a wander would never
 * leave it (0235, `MoireStrip`). The travel is one of the three accumulated numbers in the picture —
 * this, the plane below it and the ink below that: every other field a read writes is written
 * outright, which is why only these three have to survive.
 *
 * The first ground row's centre and not each row's own, because one ground is one field: the read
 * writes them all from one number and they can only differ by having been built apart.
 */
export function carryGround(from: MoireRowSet, to: MoireRowSet): void {
  for (const [index, read] of from.reads.entries()) {
    if (!onGround(read)) continue;
    const centre = from.rows[index]?.centre;
    if (centre === undefined) return;
    for (const [at, into] of to.reads.entries()) {
      if (!onGround(into)) continue;
      const row = to.rows[at];
      if (row !== undefined) row.centre = centre;
    }
    return;
  }
}

/**
 * And where the picture's own structure had got to, carried onto the set that replaces them. The
 * same argument `carryGround` makes and for the same rebuilds: neither of these is a jump, and a
 * fresh set stands the structure at its own rest — so without this every population turnover would
 * sweep the picture back to the middle of the plane and travel out again from there, which is the
 * swap this replaced (0235, 0248). Where it is going is the new set's own and is not carried: that
 * is what the population standing now says.
 */
export function carryFractal(from: MoireRowSet, to: MoireRowSet): void {
  Object.assign(to.seed, from.seed);
}

/**
 * And where the picture's ink had got to. The same argument again, and the rebuild it matters most
 * for is the one the other two never see: a hand dragging the knob that claims a colour rebuilds the
 * set on every pointer move, so a set that started at rest would drop the picture back to its
 * resting ink and set off again from there on each of them — a drag that never left the middle of
 * the ladder instead of one the picture walks up behind. Where it is going is the new set's rows and
 * is not carried, which is what keeps the knob itself immediate.
 */
export function carryInk(from: MoireRowSet, to: MoireRowSet): void {
  Object.assign(to.ink, from.ink);
}

/**
 * And the band washed over the picture, for the ink's reason: a rebuild that dropped it back to
 * nothing would blink the colour out on every knob touch and swell it back in over the ink's
 * seconds (`tintTravelInto`, src/ui/moireTint.ts, 0302).
 */
export function carryTint(from: MoireRowSet, to: MoireRowSet): void {
  Object.assign(to.tint, from.tint);
}

/**
 * And how far the wind had blown the picture, and which way it was blowing when it did. The same
 * argument a third time, and the one it matters most for is the rebuild that changes the wind
 * itself: adding an effect is a new population and a new direction, and a set that started still
 * would drop the field back to where it had never been blown and set off again — which is a wind
 * that restarts rather than one that turns, and turning is the whole of what this reading buys
 * (0267). Where it is *going* is the new set's own population and is never carried, which is what
 * makes the added effect turn it at all.
 */
export function carryWind(from: MoireRowSet, to: MoireRowSet): void {
  Object.assign(to.wind, from.wind);
}

/**
 * And how the rack had shaped the picture so far: how tight the lattice had got, and where the
 * warp's wander stood. The wind's argument exactly, and the rebuild it matters most for is the one
 * that changes the shaping itself — adding an effect is a tighter lattice asked for, and a set that
 * started at its loosest would drop the picture open and close it back up from nothing, which is the
 * snap the travel exists to remove. Where it is *going* is the new set's own reading and is never
 * carried (`rackShape`, src/ui/moireShape.ts). How far each of its *looks* had come is the carry
 * below, per instance and not as one number (0279).
 */
export function carryShape(from: MoireRowSet, to: MoireRowSet): void {
  Object.assign(to.shape, from.shape);
}

/**
 * And how much of each of its looks the picture had taken, carried onto the set that replaces them —
 * with, behind them, every look the new set no longer holds, kept at a presence of nothing until it
 * has finished leaving. The shape's argument and `carryArrivals`' shape, for the reason a rebuild is
 * what an effect added or bypassed already is: a set that started at nothing would drain every pass
 * out of the picture and bloom it back in on each knob touch (0279).
 *
 * **Matched by the instance's own id and never by its index**, which is the whole of why the reading
 * carries a key: removing one instance shifts every look after it, so an index would hand a reverb's
 * travel to the crush that took its place — and two of one kind are two looks that must not swap.
 *
 * A look the picture has never held is not in the map and stands at nought here, which is what makes
 * an arrival an arrival: the first set a picture ever holds still travels in from nothing, because
 * nothing carried onto it. Where each look is *going* is the new set's own reading and is never
 * carried — that is what the standing rack says now.
 */
export function carryLooks(from: MoireRowSet, to: MoireRowSet): void {
  const held = new Map<string, MoireLook>();
  for (const look of from.looks) held.set(look.key, look);
  for (const look of to.looks) {
    look.at = held.get(look.key)?.at ?? 0;
    held.delete(look.key);
  }
  for (const look of held.values()) {
    if (look.at <= 0) continue;
    look.presence = 0;
    to.looks.push(look);
  }
}

/**
 * And how much of the picture each of its rows had become, carried onto the set that replaces
 * them — with, behind it, every row the new set no longer holds, kept in the picture until it has
 * finished leaving.
 *
 * **This is the fourth carry and the one that is not a travel.** The other three keep a number the
 * field had reached; this keeps a *row's* place in the picture, and it exists because the picture's
 * weight is shared out over how many rows there are (`gratingDepth`, src/lib/moireGrating.ts): an
 * effect added or retired moved every other row's depth between two frames, so the whole field
 * flashed on a population change rather than answering it (0270). A row fades in over the same
 * length the wind takes to turn, and a row the session has dropped fades out over it — so the count
 * the weight is solved for is continuous and there is nothing left to flash.
 *
 * Matched by the row's own name and never by its index: removing one rack instance shifts every row
 * after it, and a row would inherit a stranger's share (`RowRead.key`, src/ui/moireRowsField.ts).
 * A row the picture has never held is not in the map and is stood at nought here, which is the
 * whole of what makes an arrival an arrival — a row is *built* in the picture, so the first set a
 * picture ever holds is drawn outright and only a rebuild can admit anything slowly.
 *
 * A row that has *wholly* left is dropped rather than carried: it weighs nothing, cuts nothing and
 * votes for nothing (`arrived`, src/lib/moireArrival.ts), so keeping it would be a row in the
 * picture for as long as the yard stood unrebuilt.
 */
export function carryArrivals(from: MoireRowSet, to: MoireRowSet): void {
  const held = new Map<string, number>();
  for (const [index, read] of from.reads.entries()) {
    const row = from.rows[index];
    if (row !== undefined) held.set(read.key, row.arrival);
  }
  for (const [index, read] of to.reads.entries()) {
    const row = to.rows[index];
    if (row !== undefined) row.arrival = held.get(read.key) ?? 0;
    held.delete(read.key);
  }
  for (const [index, read] of from.reads.entries()) {
    const row = from.rows[index];
    if (row === undefined || !held.has(read.key) || !arrived(row.arrival)) continue;
    to.rows.push(row);
    to.reads.push({ ...read, leaving: true });
  }
}

/**
 * And how hard the field was jolting, with what it was last jolted by, and which landings were
 * still pushing the marks. The same argument the wind's
 * own carry makes and for the same rebuild: an effect added or retired is a fresh set, and a jolt
 * that started again from still would swallow the hit it was in the middle of answering. What it is
 * *going* to be is the next frame's strike and is never carried, which is what keeps the next hit a
 * hit (0271).
 */
export function carryJolt(from: MoireRowSet, to: MoireRowSet): void {
  // The landings still pushing the marks written into the slots the fresh set already holds, and
  // never handed its array: every carry beside this one keeps the destination's own object, and a
  // jolt that took the old set's ring would leave two sets stepping one list (0070).
  const { pushes, ...struck } = from.jolt;
  Object.assign(to.jolt, struck);
  to.jolt.pushes.forEach((push, at) => {
    const was = pushes[at];
    if (was !== undefined) Object.assign(push, was);
  });
}
