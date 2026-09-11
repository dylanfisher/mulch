/**
 * @role Which passes over the cell grid a standing rack runs, and the key the tile they bake is
 *   held under: one entry per standing look whose declaration carries a `cells` pass, at where the
 *   picture has travelled to and with that look's own terms — **every one of them stepped**, the
 *   way the ink's four terms already step onto their own ladders (`stepped`,
 *   src/ui/moireScreenInk.ts), so a knob turned is a rebake and a knob held is not (0349).
 * @instead What a pass is and what runs them over a grid → src/lib/moireCells.ts. The passes
 *   themselves → src/lib/moireCellEchoes.ts and src/lib/moireCellBloom.ts. Which looks a rack
 *   stands at all, their travel and the reductions the painting spends → `rackLooks`,
 *   src/ui/moireLooks.ts, which this reads and never repeats. Where the grid is baked and these are
 *   run → `cellGrid`, src/ui/moireScreenCells.ts.
 */
import { CELL_TERMS, type MoireCells } from "@/lib/moireCells";
import { LOOKS, type LookTerm } from "@/lib/moireLook";
import { clamp } from "@/lib/range";
import type { MoireLook } from "@/ui/moireLooks";
import { stepped } from "@/ui/moireScreenInk";

/**
 * How far a cell pass's presence and terms are stepped: the whole of a turn, onto `DRIFT_STEPS`
 * stops, which is the ladder every other bake-side reading of a knob walks (`stepped`). Every term
 * a cell pass may read is a `turn` and so stands on nought to one, which is what makes one reach
 * answer for all of them.
 */
const CELL_REACH = 1;

/**
 * The standing passes, one slot apiece and refilled in place: this is read once a painting on the
 * frame path, and a set rebuilt per frame would allocate a record and a terms object per standing
 * effect (0070). A caller that keeps the answer copies it.
 */
const standing: {
  look: MoireCells["look"];
  at: number;
  terms: Partial<Record<LookTerm, number>>;
  pass: MoireCells["pass"];
}[] = [];

/**
 * Every pass over the cells the standing rack declares, in the rack's own order — read off the
 * looks the set already holds, so a bypassed entry is in none of it for the reason it is in no look
 * (`rackLooks`). A look whose declaration carries no `cells` is skipped, which is every look but
 * two, and one the picture has not travelled to at all is skipped as well: a pass at nought does
 * nothing, and leaving it in the set would put a term nobody can see into the tile's key.
 */
export function rackCells(looks: readonly MoireLook[]): readonly MoireCells[] {
  let kept = 0;
  for (const look of looks) {
    const pass = LOOKS[look.look].cells;
    if (pass === undefined) continue;
    const at = stepped(clamp(look.at, 0, 1), CELL_REACH);
    if (at <= 0) continue;
    const slot = standing[kept] ?? { look: look.look, at, terms: {}, pass };
    slot.look = look.look;
    slot.at = at;
    slot.pass = pass;
    for (const term of CELL_TERMS) slot.terms[term] = stepped(look.terms[term] ?? 0, CELL_REACH);
    standing[kept] = slot;
    kept += 1;
  }
  standing.length = kept;
  return standing;
}

/**
 * What these passes make a tile *of*, for the key it is held under: the look, where it has got to
 * and its terms, all of them already stepped. A rack that declares no pass writes nothing at all,
 * so the key of a picture with an empty rack is the key 0346 shipped and the tile is the held one.
 */
export function cellsKey(cells: readonly MoireCells[]): string {
  let key = "";
  for (const cell of cells) {
    key += `|${cell.look}@${cell.at}`;
    for (const term of CELL_TERMS) key += `:${cell.terms[term] ?? 0}`;
  }
  return key;
}
