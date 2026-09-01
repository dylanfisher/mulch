/**
 * @role The sketch bench at #/sketch — the nav, and the eight arguments about the mulcher's surface
 *   that it mounts, each with the one sentence it makes and the thing it gives up to make it.
 * @instead The surface they are all arguing with → src/ui/PlayerCard.tsx. The primitives they are
 *   drawn out of, on their own page → src/ui/dev/DevPage.tsx.
 */

// The dependency count is the sketch count, for the reason the gallery's is: this file exists to
// mount every sketch, and a barrel would trade a visible import list for an invisible one.
// oxlint-disable import/max-dependencies

import type { MouseEvent } from "react";

import { cn } from "@/lib/cn";
import { PLAYER_LABEL } from "@/lib/copy";
import { Wordmark } from "@/ui/Logo";
import { SKETCH_ROUTE } from "@/ui/routes";
import { SHELL_BODY, SHELL_HEADER, SHELL_HEADER_ROW } from "@/ui/shell";
import { SketchCast } from "@/ui/sketch/SketchCast";
import { SketchChipper } from "@/ui/sketch/SketchChipper";
import { SketchChips } from "@/ui/sketch/SketchChips";
import { SketchFrame } from "@/ui/sketch/SketchFrame";
import { SketchRolls } from "@/ui/sketch/SketchRolls";
import { SketchScore } from "@/ui/sketch/SketchScore";
import { SketchSentence } from "@/ui/sketch/SketchSentence";
import { SketchStack } from "@/ui/sketch/SketchStack";
import { SketchTerrain } from "@/ui/sketch/SketchTerrain";
import { ThemeToggle } from "@/ui/ThemeToggle";
// oxlint-enable import/max-dependencies

/**
 * Eight answers to one question — what the mulcher would be if it were not a wall of dials. A
 * sketch's identity is written here and nowhere else: the id is the nav's anchor and the
 * heading's, and the two sentences are the argument, so the argument cannot drift away from the
 * drawing that makes it. None of them is wired to anything (0247).
 */
const SKETCHES = [
  {
    id: "cast",
    label: "Blend The Cast",
    thesis:
      "The cast is a place and every number is derived from it. Four ways of weighing that place, side by side, so what is being compared is the weighting and not the wallpaper.",
    trades:
      "no way to reach a single number without opening the drawer. What each of the four gives up beyond that is written under its own picture, because it differs.",
    Content: SketchCast,
  },
  {
    id: "score",
    label: "The Walk Is The Score",
    thesis:
      "Every landing is a block on the loop a hand drags, stretches and stacks. The numbers are a readout of the block you are holding.",
    trades:
      "odds and chance — a drawn score says what happens, not what tends to happen, which is most of what the module is for.",
    Content: SketchScore,
  },
  {
    id: "sentence",
    label: "The Patch Is A Sentence",
    thesis:
      "The module states itself in plain words and every underlined word is a control. No dials at all.",
    trades:
      "fineness. A word is a handful of choices, so the space between two of them is unreachable.",
    Content: SketchSentence,
  },
  {
    id: "stack",
    label: "Stack The Moves",
    thesis:
      "Behaviour is composed from small cards, each one verb and at most two numbers. An empty stack is a simple mulcher.",
    trades: "the seed. A stack is written rather than drawn, so nothing surprises you.",
    Content: SketchStack,
  },
  {
    id: "terrain",
    label: "Somewhere To Walk About",
    thesis:
      "One field of planted spots. Moving the cursor interpolates the whole patch between whichever are near; Wander drifts it on its own.",
    trades: "repeatability — you can get back to a spot you planted and nowhere else.",
    Content: SketchTerrain,
  },
  {
    id: "rolls",
    label: "Roll And Lock",
    thesis:
      "One roll draws six whole candidates as pictures. Pick one, lock the registers that worked, roll again.",
    trades:
      "intent. You can only ask for more of what you already got, never for a thing you have not been shown.",
    Content: SketchRolls,
  },
  {
    id: "chipper",
    label: "Feed The Hopper",
    thesis:
      "The card is the machine it is named for. Source in at the top, a drum of six blades whose size is their weight in the middle, and the walk thrown out of the side as mulch.",
    trades:
      "the way back. The metaphor runs one direction, so anything that feeds back — a part that changes the ground it was drawn from — has nowhere to be drawn.",
    Content: SketchChipper,
  },
  {
    id: "chips",
    label: "Read The Pile",
    thesis:
      "The same machine from the output end only. Every landing is a chip on a heap — size is how long it holds, fill is which character cut it — and the controls are sorts: coarser, finer, more of one wood, less of another.",
    trades:
      "everything a pile cannot hold. Order, repeats and rests are invisible in a heap, so the whole of How It Is Timed has no surface here.",
    Content: SketchChips,
  },
];

/**
 * The nav scrolls rather than linking, for the gallery's reason: the route is the whole hash, so a
 * bare `#cast` would leave `#/sketch` and unmount the bench.
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
            {SKETCHES.map((sketch) => (
              <a
                key={sketch.id}
                href={SKETCH_ROUTE}
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
          Eight ways the {PLAYER_LABEL} could work instead. None is wired to anything — no store, no
          command, no sound — and they are drawn in the instrument&apos;s own tokens and type so
          what is on the screen is what the real thing would look like. Pick one and the rest of
          this directory is deleted.
        </p>
        {SKETCHES.map(({ id, label, thesis, trades, Content }, index) => (
          <SketchFrame
            key={id}
            id={id}
            index={index + 1}
            title={label}
            thesis={thesis}
            trades={trades}
          >
            <Content />
          </SketchFrame>
        ))}
      </main>
    </div>
  );
}
