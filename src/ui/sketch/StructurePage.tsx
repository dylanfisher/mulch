/**
 * @role The structure bench at #/structure — the nav and the one list it mounts: six ways the
 *   automator's mark on the picture, the fractal and the mirror, could be made plain — the seventh,
 *   the Shards, won and left for the painter (0296).
 *   Every entry carries the one sentence it makes, the thing it gives up to make it and where in
 *   the real painter it would land, and every picture is the real escape kernel over the drift
 *   bench's stand-in weave, under the one dial that move turns. Its own route beside the sketch
 *   bench because each picture here is a pixel loop over a hundred-odd iterations, and a page that
 *   mounts the sketch bench's twenty pictures to show these six is a page nobody opens (0295).
 * @instead The picture these argue with → src/ui/moireCanvas.ts and src/ui/moireRowsField.ts. The
 *   bench beside this one, and the frame and stage this borrows → src/ui/sketch/SketchPage.tsx,
 *   src/ui/sketch/SketchFrame.tsx and src/ui/sketch/SketchDriftStage.tsx.
 */

// The dependency count is the sketch count, for the sketch bench's reason: this file exists to
// mount every picture, and a barrel would trade a visible import list for an invisible one.
// oxlint-disable import/max-dependencies

import type { MouseEvent, ReactNode } from "react";

import { cn } from "@/lib/cn";
import { MOIRE_STRIP } from "@/lib/copy";
import { Wordmark } from "@/ui/Logo";
import { STRUCTURE_ROUTE } from "@/ui/routes";
import { SHELL_BODY, SHELL_HEADER, SHELL_HEADER_ROW } from "@/ui/shell";
import { SketchFrame } from "@/ui/sketch/SketchFrame";
import { SketchStructureBeat } from "@/ui/sketch/structure/SketchStructureBeat";
import { SketchStructureBite } from "@/ui/sketch/structure/SketchStructureBite";
import { SketchStructureBoxes } from "@/ui/sketch/structure/SketchStructureBoxes";
import { SketchStructureColour } from "@/ui/sketch/structure/SketchStructureColour";
import { SketchStructureContour } from "@/ui/sketch/structure/SketchStructureContour";
import { SketchStructureKaleido } from "@/ui/sketch/structure/SketchStructureKaleido";
import { TODAY_BITE, TODAY_ROWS } from "@/ui/sketch/structure/sketchStructure";
import { ThemeToggle } from "@/ui/ThemeToggle";
// oxlint-enable import/max-dependencies

/**
 * One entry: the id is the nav's anchor, the heading's, and the attribute its own picture carries,
 * and the three sentences are the argument — written here so the argument cannot drift away from
 * the drawing that makes it. None of them is wired to anything (0247).
 */
export type StructureEntry = {
  id: string;
  label: string;
  thesis: string;
  trades: string;
  /** Where it would land in the real thing and which side of the bake line it falls on. */
  built: string;
  Content: () => ReactNode;
};

/** What a fractal row is cut at today, said once for every thesis that measures against it. */
const TODAY = `${Math.round(TODAY_BITE * 100)}%`;

/**
 * Seven ways to make the structure plain, none exclusive of another. The picture today cuts the
 * automator's structure as two rows among about fourteen, at the share the count solves for, on a
 * tile that stands still between bakes (src/ui/moireRowsField.ts, src/ui/moireCanvas.ts) — and
 * what a hand sees of it is the weave gently bent. Each of these is one move, drawn with the real
 * escape kernel over the drift bench's stand-in weave, under the one dial that move turns.
 */
export const SKETCH_STRUCTURES: readonly StructureEntry[] = [
  {
    id: "bite",
    label: "The Bite",
    thesis: `The structure cut at a depth of its own, the way the lattice already is, rather than at the share ${TODAY_ROWS} rows leave it. Today a fractal row gets ${TODAY} of the ink under a dull sound, and a grating at that depth is the weave gently bent; at its own depth the boundary's filigree is the picture.`,
    trades:
      "the picture's constant weight. Every other row is counted so the field's mean holds at PICTURE_FLOOR.value whatever a yard holds (gratingDepth), and a row cut outside that count darkens the picture by exactly what it cuts — the automator would be the one effect that makes the drift heavier.",
    built:
      "beside cutLattice in src/ui/moireCanvas.ts, which already draws one row at its own depth and never at the count's share: a fractal row takes the same branch, and drawnGratings stops counting it. Bake-side nothing changes — the tile is the tile — and the frame pays one globalAlpha it was already paying.",
    Content: SketchStructureBite,
  },
  {
    id: "beat",
    label: "The Beat",
    thesis:
      "Two copies of the structure held a fixed ratio apart in scale, so box beats against box and spiral against spiral everywhere on the picture. Today the second copy differs from the first only by the phase of its breath, and the breath is stepped onto eighteen rungs — so the two share a rung a fifth of every window, where they are one tile drawn twice, and stand one rung apart the rest.",
    trades:
      "the travelling beat. A held ratio is a beat that stands still, where two periods a tenth apart make one that slowly walks — which was the reason FRACTAL_BEAT is a ratio of periods and not of scales (0246).",
    built:
      "in src/lib/moireFractal.ts: the second row's zoom is fractalZoom of the first times the held ratio, and its period is the first's. The key already carries the zoom, so it is bake-side and costs what it costs today — one picture-sized tile per row per rung — with the two rows never sharing a key again.",
    Content: SketchStructureBeat,
  },
  {
    id: "boxes",
    label: "The Boxes",
    thesis:
      "The folded plane folded about a centre of its own, with each level turned inside the last. Half of all racks draw the nested coordinate, and it borrows the escape field's seahorse centre as its fold offset today — an offset three quarters of a unit wide, which makes the level a function of one axis and the tile a run of vertical stripes.",
    trades:
      "the shared seed. cx and cy are one pair of stops the population folds to, read by both coordinates; a centre band of the fold's own is two more stops on the seed and two more fields on a nested row's key.",
    built:
      "in nestedTurns and fractalSeedInto in src/lib/moireFractal.ts: the fold's offset comes off a small band about nought and not off FRACTAL_REST, and the turn stops stay as they are. Bake-side, and the same number of bakes — a different tile, not a dearer one.",
    Content: SketchStructureBoxes,
  },
  {
    id: "kaleido",
    label: "The Kaleidoscope",
    thesis:
      "The whole finished field folded into mirrored sectors, weave and all, one fold per automator standing. Today the fold is applied to a curved row's coordinate before it is cut, so the mirror is a bend in two faint rows under an unmirrored weave; folding the finished picture puts a seam through every row at once, and a seam is what a mirror looks like.",
    trades:
      "the rows' own motion at the seam. A straight row slides continuously and its mirror image slides the other way, so along every seam the picture is two rows meeting head-on — which is the moiré this instrument is made of, and also a line the eye cannot stop reading.",
    built:
      "beside the lens's slices in src/ui/moireCanvasField.ts, where the finished field is already drawn back out through drawImage: one clipped drawImage per sector, each a mirror transform of the same surface, on the whole folds src/lib/moireFold.ts already takes. Frame-side — no bake, no key — and two to sixteen draws a frame at the cap.",
    Content: SketchStructureKaleido,
  },
  {
    id: "colour",
    label: "The Colour",
    thesis:
      "The structure read through the ramp of five inks while every straight row stays in the one ink, so the fractal is the only coloured thing on the page. The eye finds colour before it finds a fringe; a structure that is the page's one hue is apparent at whatever depth it is cut.",
    trades:
      "the one-hue instrument, the same trade the drift bench's ramp names — and less of it, since the ramp is spent on one row and not on the picture. Five stops out of existing tokens spend no new colour; a sixth is a colour-boundary crossing with its own record (0236).",
    built:
      "in build at src/ui/moireScreenTile.ts, where every pixel is multiplied by one row ink today: the fractal tile's own value is read through the ramp the drift bench's ramp sketch names, and every other row through the ink as now. Bake-side — the ramp is baked into the screen tile — and the frame still costs one fillStyle.",
    Content: SketchStructureColour,
  },
  {
    id: "contour",
    label: "The Contour",
    thesis:
      "The escape count cut into flat contours with every riser lit, so the structure is a map's height lines and not fringes the weave has to beat against. An escape count is banded by nature; a band drawn as an edge reads at a glance where a band drawn as a cosine reads as texture.",
    trades:
      "the beat on those two rows. A staircase has no second spacing to beat against, so the fractal rows stop fringing with the lattice and read as contours over it; and a riser is a hard edge the thirty-two-pixel strip aliases unless the profile softens it by a pixel.",
    built:
      "a wave in src/lib/moireProfiles.ts beside stair, which already quantises a cosine onto steps for the crusher: a staircase with a lit riser, cut to by the two fractal rows and no other. Bake-side, in the tile those rows already bake, and no dearer.",
    Content: SketchStructureContour,
  },
];

/**
 * The nav scrolls rather than linking, for the sketch bench's reason: the route is the whole hash,
 * so a bare `#bite` would leave `#/structure` and unmount the bench.
 */
function scrollToSection(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  const id = event.currentTarget.dataset["section"];
  const section = id === undefined ? null : document.getElementById(id);
  if (section === null) throw new Error(`No sketch is rendered for the nav item "${id}".`);
  section.scrollIntoView({ behavior: "smooth" });
}

export function StructurePage() {
  return (
    <div className="min-h-dvh">
      <header className={SHELL_HEADER}>
        <div className={SHELL_HEADER_ROW}>
          <Wordmark route="structure" className="type-title" />
          <span className="type-body text-muted-foreground">{MOIRE_STRIP} structure</span>
          <nav className="ml-auto flex flex-wrap items-center gap-3">
            {SKETCH_STRUCTURES.map((sketch) => (
              <a
                key={sketch.id}
                href={STRUCTURE_ROUTE}
                data-section={sketch.id}
                onClick={scrollToSection}
                className="type-body text-muted-foreground transition-colors hover:text-foreground"
              >
                {sketch.label}
              </a>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <main className={cn(SHELL_BODY, "flex flex-col gap-12")}>
        <p className="max-w-3xl type-body text-muted-foreground">
          One question: how does the automator&apos;s mark on the {MOIRE_STRIP} become plain. Today
          its structure is two rows among about {TODAY_ROWS}, cut at the {TODAY} of the ink the
          count leaves them, on a tile that stands still between bakes — and what a hand sees is the
          weave gently bent. {SKETCH_STRUCTURES.length} moves, none exclusive of another, each drawn
          with the real escape kernel at the real rest over the drift bench&apos;s stand-in weave,
          under the one dial that move turns. Each says what it gives up and where in the painter it
          would land, and which side of the bake line it falls on. The pictures are painted by a
          pixel loop on this bench and would not be in the painter, where anything per frame is a
          transform or a slice and everything else is a stepped key (0129, 0144).
        </p>

        <section className="flex flex-col gap-12">
          <h2 className="type-title">{MOIRE_STRIP}: the structure made plain</h2>
          <div className="flex flex-col gap-12">
            {SKETCH_STRUCTURES.map(({ id, label, thesis, trades, built, Content }, index) => (
              <SketchFrame
                key={id}
                id={id}
                index={index + 1}
                title={label}
                thesis={thesis}
                trades={trades}
                built={built}
              >
                <Content />
              </SketchFrame>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
