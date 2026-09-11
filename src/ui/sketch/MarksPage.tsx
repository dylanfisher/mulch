/**
 * @role The marks bench at #/marks — the nav and the one list it mounts: the ways the lattice of
 *   marks could still be pushed past where 0346 left it — a landing's push decaying and an
 *   alphabet per part. The read pushed to its ramp's ends has landed (0348), the delay's echoes
 *   and the reverb's bloom in marks with it (0349), the sound's own rows stamped over the picture
 *   with those (0350), the rack's own second lattice (0351) and the scatter of big marks over the
 *   fine ones (0352); their entries have gone with them. Every entry carries
 *   the one sentence it makes, the thing it gives up to make it and where in the real tile it
 *   would land, and every picture is the real marks over the shipped bloom under the shipped film
 *   in one ink, under the one dial that move turns. Its own route beside the structure bench for
 *   the structure bench's reason: every picture here reads a scene a cell at a time and writes a
 *   lattice a pixel at a time, and a page that mounts every other bench to show these is a
 *   page nobody opens (0295, 0347).
 * @instead The picture these argue with → src/ui/moireScreenTile.ts and src/lib/moireGlyph.ts.
 *   The bench beside this one, and the frame and stage this borrows → src/ui/sketch/StructurePage.tsx,
 *   src/ui/sketch/SketchFrame.tsx and src/ui/sketch/SketchDriftStage.tsx.
 */

// The dependency count is the sketch count, for the sketch bench's reason: this file exists to
// mount every picture, and a barrel would trade a visible import list for an invisible one.
// oxlint-disable import/max-dependencies

import type { MouseEvent, ReactNode } from "react";

import { cn } from "@/lib/cn";
import { MOIRE_STRIP } from "@/lib/copy";
import { Wordmark } from "@/ui/Logo";
import { MARKS_ROUTE } from "@/ui/routes";
import { SHELL_BODY, SHELL_HEADER, SHELL_HEADER_ROW } from "@/ui/shell";
import { SketchFrame } from "@/ui/sketch/SketchFrame";
import { SketchMarksPart } from "@/ui/sketch/marks/SketchMarksPart";
import { COLS, ROWS } from "@/ui/sketch/marks/sketchMarks";
import { ThemeToggle } from "@/ui/ThemeToggle";
// oxlint-enable import/max-dependencies

/**
 * One entry: the id is the nav's anchor, the heading's, and the attribute its own picture carries,
 * and the three sentences are the argument — written here so the argument cannot drift away from
 * the drawing that makes it. None of them is wired to anything (0247).
 */
export type MarksEntry = {
  id: string;
  label: string;
  thesis: string;
  trades: string;
  /** Where it would land in the real thing and which side of the bake line it falls on. */
  built: string;
  Content: () => ReactNode;
};

/**
 * The ways left to push the lattice of marks, none exclusive of another: an entry goes as its
 * argument lands in the tile (0348, 0349). The picture today is a
 * still lattice of the screen's own cells, each cell one of ten marks off a wrapped ramp, in one
 * ink, with the sound's cut read a cell at a time (0345, 0346). Each of these is one move, drawn
 * with the real marks over the shipped bloom under the shipped film, under the one dial that move
 * turns.
 */
export const SKETCH_MARKS: readonly MarksEntry[] = [
  {
    id: "part",
    label: "The Part",
    thesis:
      "The alphabet swapped whole with the part: every cell keeps the mark the field chose for it and is written in the alphabet its landing's character names — the shipped marks, rings, or strokes. The song's sections are the one structure a picture could read as a different picture, and an alphabet is the one thing that can change without moving a cell.",
    trades:
      "one alphabet. The marks were drawn against a reference in one alphabet and one ink, and three alphabets is three references; a ring and a slash that carry the same ink read as different weights to an eye, so the ramp that reads density is read three ways.",
    built:
      "in src/lib/moireGlyph.ts as three tables in the marks' own shape, chosen off the player's part in the bake key in build at src/ui/moireScreenTile.ts. Bake-side, and a new tile at every part change; no dearer per tile.",
    Content: SketchMarksPart,
  },
];

/**
 * The nav scrolls rather than linking, for the sketch bench's reason: the route is the whole hash,
 * so a bare `#decay` would leave `#/marks` and unmount the bench.
 */
function scrollToSection(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  const id = event.currentTarget.dataset["section"];
  const section = id === undefined ? null : document.getElementById(id);
  if (section === null) throw new Error(`No sketch is rendered for the nav item "${id}".`);
  section.scrollIntoView({ behavior: "smooth" });
}

/**
 * The bench's own opening, held apart from the page for the length cap's sake and not for reuse:
 * the one paragraph that says what the picture is today and what the entries below it ask.
 */
const INTRO = (
  <p className="max-w-3xl type-body text-muted-foreground">
    One question: where does the lattice of marks go next. Today the {MOIRE_STRIP} is a still
    lattice of the screen&apos;s own cells — {COLS} by {ROWS} of them on this bench — each cell one
    of ten marks off a wrapped ramp, in one ink (0345, 0346). {SKETCH_MARKS.length} moves, none
    exclusive of another, each the real marks over the shipped bloom under the one dial that move
    turns, with the sketch bench&apos;s walk as the clock and the song. Each says what it gives up
    and where in the tile it would land. The pictures are written by a pixel loop here and would not
    be in the painter, where a mark is chosen once per cell in the bake (0129, 0345).
  </p>
);

export function MarksPage() {
  return (
    <div className="min-h-dvh">
      <header className={SHELL_HEADER}>
        <div className={SHELL_HEADER_ROW}>
          <Wordmark route="marks" className="type-title" />
          <span className="type-body text-muted-foreground">{MOIRE_STRIP} marks</span>
          <nav className="ml-auto flex flex-wrap items-center gap-3">
            {SKETCH_MARKS.map((sketch) => (
              <a
                key={sketch.id}
                href={MARKS_ROUTE}
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
        {INTRO}

        <section className="flex flex-col gap-12">
          <h2 className="type-title">{MOIRE_STRIP}: the lattice pushed further</h2>
          <div className="flex flex-col gap-12">
            {SKETCH_MARKS.map(({ id, label, thesis, trades, built, Content }, index) => (
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
