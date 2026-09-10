/**
 * @role The sketch bench at #/sketch — the nav, the two introductions, and the frame it draws each
 *   of the two lists into. Two benches are spent: the grid won how a song is played and is the
 *   card's own section (0275, src/ui/PlayerGrid.tsx), and the switchboard won how the ground moves
 *   and is the fold's own three rows of words (0277, src/ui/PlayerBed.tsx).
 * @instead The two lists themselves, and the shape of one entry → src/ui/sketch/sketchEntries.ts.
 *   The surface the ground eight argue with → src/ui/PlayerCard.tsx. The picture the drift nine
 *   argue with → src/ui/moireCanvas.ts. The primitives they are drawn out of, on their own page →
 *   src/ui/dev/DevPage.tsx.
 */
import type { MouseEvent } from "react";

import { cn } from "@/lib/cn";
import { MOIRE_STRIP, PLAYER_GROUP_LABELS, PLAYER_LABEL } from "@/lib/copy";
import { Wordmark } from "@/ui/Logo";
import { SKETCH_ROUTE } from "@/ui/routes";
import { SHELL_BODY, SHELL_HEADER, SHELL_HEADER_ROW } from "@/ui/shell";
import { SketchFrame } from "@/ui/sketch/SketchFrame";
import { SKETCH_PER } from "@/ui/sketch/sketchGround";
import { type SketchEntry, SKETCH_DRIFTS, SKETCH_GROUNDS } from "@/ui/sketch/sketchEntries";
import { ThemeToggle } from "@/ui/ThemeToggle";

/**
 * The nav scrolls rather than linking, for the gallery's reason: the route is the whole hash, so a
 * bare `#clock` would leave `#/sketch` and unmount the bench.
 */
function scrollToSection(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  const id = event.currentTarget.dataset["section"];
  const section = id === undefined ? null : document.getElementById(id);
  if (section === null) throw new Error(`No sketch is rendered for the nav item "${id}".`);
  section.scrollIntoView({ behavior: "smooth" });
}

export function SketchPage() {
  return (
    <div className="min-h-dvh">
      <header className={SHELL_HEADER}>
        <div className={SHELL_HEADER_ROW}>
          <Wordmark route="sketch" className="type-title" />
          <span className="type-body text-muted-foreground">{PLAYER_LABEL} sketches</span>
          <nav className="ml-auto flex flex-wrap items-center gap-3">
            <SketchLinks entries={SKETCH_GROUNDS} />
            <span className="type-readout text-muted-foreground" aria-hidden="true">
              |
            </span>
            <SketchLinks entries={SKETCH_DRIFTS} />
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <main className={cn(SHELL_BODY, "flex flex-col gap-12")}>
        <p className="max-w-3xl type-body text-muted-foreground">
          Two benches, two questions: when does the ground move, and where does the picture go.
        </p>
        <p className="max-w-3xl type-body text-muted-foreground">
          The first: when does the ground move, and where to. {SKETCH_GROUNDS.length} readings of
          that one seam, each replacing {PLAYER_GROUP_LABELS.ground}&apos;s period and nothing else.
          The card counts that period in jumps, parts or whole rounds of the song, and the unit a
          hand reasons in — every Nth time the walk finishes its {SKETCH_PER} — is in none of the
          three, so every drawing here is arguing for a fourth clock or against one. None is wired
          to anything — no store, no command, no sound — and they are drawn in the instrument&apos;s
          own tokens and type, so what is on the screen is what the real thing would look like.
        </p>

        <SketchGroup
          heading={`${PLAYER_GROUP_LABELS.ground}: when it moves`}
          entries={SKETCH_GROUNDS}
        />

        <hr className="border-border" />

        <DriftIntro />

        <SketchGroup heading={`${MOIRE_STRIP}: where it goes`} entries={SKETCH_DRIFTS} />
      </main>
    </div>
  );
}

/** What the second bench is for, said once above it. Its own function so the page stays the list. */
function DriftIntro() {
  return (
    <p className="max-w-3xl type-body text-muted-foreground">
      The second: where the picture goes. {SKETCH_DRIFTS.length} directions the {MOIRE_STRIP} could
      be pushed in, none exclusive of another, each one move a shader would make, drawn on a
      stand-in weave in the instrument&apos;s own inks and under the one dial that move turns. Each
      says where in the painter it would land and which side of the bake line it falls on — a tile
      is a bake and a frame is a fill — so the nine are a plan&apos;s worth of parts and not nine
      wishes. The stand-in is two gratings a pixel apart in pitch, which is what the real picture is
      under everything else; what is judged is the move, not the weave. The pictures are painted by
      a pixel loop on this bench and would not be in the painter, where anything per frame is a
      transform or a slice and everything else is a stepped key (0129, 0144).
    </p>
  );
}

/** One group's links, in the order the bench mounts them. */
function SketchLinks({ entries }: { entries: readonly SketchEntry[] }) {
  return entries.map((sketch) => (
    <a
      key={sketch.id}
      href={SKETCH_ROUTE}
      data-section={sketch.id}
      onClick={scrollToSection}
      className="type-body text-muted-foreground transition-colors hover:text-foreground"
    >
      {sketch.label}
    </a>
  ));
}

/** One bench: its heading and its entries, each numbered inside its own list. */
function SketchGroup({ heading, entries }: { heading: string; entries: readonly SketchEntry[] }) {
  return (
    <section className="flex flex-col gap-12">
      <h2 className="type-title">{heading}</h2>
      <div className="flex flex-col gap-12">
        {entries.map(({ id, label, thesis, trades, built, Content }, index) => (
          <SketchFrame
            key={id}
            id={id}
            index={index + 1}
            title={label}
            thesis={thesis}
            trades={trades}
            {...(built === undefined ? {} : { built })}
          >
            <Content />
          </SketchFrame>
        ))}
      </div>
    </section>
  );
}
