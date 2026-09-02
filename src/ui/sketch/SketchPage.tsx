/**
 * @role The sketch bench at #/sketch — the nav, and the two lists it mounts: eight readings of when
 *   the ground shifts under a hand's gesture, and eight directions the drift picture could be
 *   pushed in. Every entry carries the one sentence it makes and the thing it gives up to make it,
 *   and a drift entry carries where in the real painter it would land. Two benches are spent: the
 *   grid won how a song is played and is the card's own section (0275, src/ui/PlayerGrid.tsx),
 *   and the switchboard won how the ground moves and is the fold's own three rows of words (0277,
 *   src/ui/PlayerBed.tsx).
 * @instead The surface the ground eight argue with → src/ui/PlayerCard.tsx. The picture the drift
 *   eight argue with → src/ui/moireCanvas.ts. The primitives they are drawn out of, on their own
 *   page → src/ui/dev/DevPage.tsx.
 */

// The dependency count is the sketch count, for the reason the gallery's is: this file exists to
// mount every sketch, and a barrel would trade a visible import list for an invisible one.
// oxlint-disable import/max-dependencies

import type { MouseEvent, ReactNode } from "react";

import { cn } from "@/lib/cn";
import { PLAYER_GROUP_LABELS, PLAYER_LABEL } from "@/lib/copy";
import {
  PLAYER_BED_REACH_LABEL,
  PLAYER_BED_WANDERS_LABEL,
  PLAYER_BED_WAY_LABEL,
} from "@/lib/copyGround";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { MOIRE_STRIP } from "@/lib/copy";
import { Wordmark } from "@/ui/Logo";
import { SKETCH_ROUTE } from "@/ui/routes";
import { SHELL_BODY, SHELL_HEADER, SHELL_HEADER_ROW } from "@/ui/shell";
import { SketchDriftBands } from "@/ui/sketch/drift/SketchDriftBands";
import { SketchDriftBlobs } from "@/ui/sketch/drift/SketchDriftBlobs";
import { SketchDriftRamp } from "@/ui/sketch/drift/SketchDriftRamp";
import { SketchDriftTerrace } from "@/ui/sketch/drift/SketchDriftTerrace";
import { SketchDriftTunnel } from "@/ui/sketch/drift/SketchDriftTunnel";
import { SketchFrame } from "@/ui/sketch/SketchFrame";
import { SketchGroundClock } from "@/ui/sketch/ground/SketchGroundClock";
import { SketchGroundCut } from "@/ui/sketch/ground/SketchGroundCut";
import { SketchGroundLadder } from "@/ui/sketch/ground/SketchGroundLadder";
import { SketchGroundLane } from "@/ui/sketch/ground/SketchGroundLane";
import { SketchGroundPips } from "@/ui/sketch/ground/SketchGroundPips";
import { SketchGroundQueue } from "@/ui/sketch/ground/SketchGroundQueue";
import { SketchGroundRing } from "@/ui/sketch/ground/SketchGroundRing";
import { SketchGroundThrow } from "@/ui/sketch/ground/SketchGroundThrow";
import { SKETCH_EVERY_SAID, SKETCH_PER } from "@/ui/sketch/sketchGround";
import { ThemeToggle } from "@/ui/ThemeToggle";
// oxlint-enable import/max-dependencies

/**
 * One entry: the id is the nav's anchor, the heading's, and the attribute its own picture carries,
 * and the two sentences are the argument — written here so the argument cannot drift away from the
 * drawing that makes it. None of them is wired to anything (0247).
 */
type SketchEntry = {
  id: string;
  label: string;
  thesis: string;
  trades: string;
  /** Where it would land in the real thing and what it costs there — the drift bench's third
   *  sentence, because its entries are directions to build and not surfaces to pick between. */
  built?: string;
  Content: () => ReactNode;
};

/**
 * Eight readings of one seam: a hand's gesture, and when the ground shifts and where to. `bedEvery`
 * is a period and `bedPer` counts it in jumps, parts or whole rounds of the song (0192,
 * src/lib/playerBed.ts) — and the unit a hand actually reasons in, every Nth time the walk finishes
 * its sequence, is in none of the three. Every one of these lights the ground the loop is standing
 * on, because a picture of a clock that never says what it moves is a picture of a clock.
 */
export const SKETCH_GROUNDS: readonly SketchEntry[] = [
  {
    id: "clock",
    label: "The Lap",
    thesis:
      "The walk's own sequence is the clock face: sixteen landings round a dial, the hand where the walk is standing, and the shift falling on every Nth time round. The period is laps, and the dial's number is how many.",
    trades:
      "the file. A clock says when the ground moves and nothing at all about where it goes, so the sample it is moving over is not on this picture.",
    Content: SketchGroundClock,
  },
  {
    id: "queue",
    label: "The Queue",
    thesis:
      "The source itself, with the next grounds queued ahead of the playhead and each carrying how many laps until it arrives. What comes next and when, which is the only form the period is ever felt in.",
    trades:
      "the odds. A queue is a list somebody wrote, so nothing that wanders — the Lean, the Home, a move that surprises you — has anywhere to be drawn.",
    Content: SketchGroundQueue,
  },
  {
    id: "ring",
    label: "The Ratchet",
    thesis:
      "The beds of the file as a ring the walk advances one notch on when the count is up. One number survives: how long a notch takes.",
    trades: `three rows of words. A notch is a whole ${PLAYER_KNOB_LABELS.bed}, so ${PLAYER_BED_REACH_LABEL}, ${PLAYER_BED_WAY_LABEL} and ${PLAYER_BED_WANDERS_LABEL} are all gone — and with them the crawl that lands part-way into a bed, which is the thing the fold exists for.`,
    Content: SketchGroundRing,
  },
  {
    id: "ladder",
    label: "The Ladder",
    thesis:
      "A rung per lap, newest at the foot, with the ground stepping across every Nth. Two whole periods on one picture, so the period reads as a rhythm rather than as a number.",
    trades:
      "the future. A ladder is a record of what has happened, and a hand asking when the next move lands has to count rungs to find out.",
    Content: SketchGroundLadder,
  },
  {
    id: "cut",
    label: "The Cut",
    thesis:
      "The beds as a deck and the period as the cut: a hand already knows what cutting a deck every so often means, and the count runs along under it.",
    trades:
      "the walk. A deck says nothing about what is playing over it, so the one thing being counted — a lap of the walk — is a number on this picture and never a shape.",
    Content: SketchGroundCut,
  },
  {
    id: "lane",
    label: "The Lane",
    thesis:
      "A lane of laps drawn over the walk's own strip, where a mark is a move and a stretch is a ground held. The two clocks on one picture, which is the only place the question is ever really asked.",
    trades:
      "the file again. A lane names the ground it holds but draws no sample under it, so which ground was worth holding is unanswerable here.",
    Content: SketchGroundLane,
  },
  {
    id: "throw",
    label: "The Throw",
    thesis: `The ground as a place a hand throws the loop to, with the throw landing at the next lap boundary rather than under the hand. The period stops being a number and becomes the lag between asking and arriving. The one gesture on this bench: ${SKETCH_EVERY_SAID.toLowerCase()}, so the wait is felt.`,
    trades:
      "the crawl. A throw lands on a whole bed, and part-way into one is precisely what the fold's own unit was chosen to reach.",
    Content: SketchGroundThrow,
  },
  {
    id: "pips",
    label: "The Count",
    thesis:
      "The count as the whole drawing: N pips filling one per lap, the one under way filling as the walk goes round it, and the ground named underneath. The setting is how many pips there are.",
    trades:
      "everything else. This is the period and nothing but the period — no file, no beds, no walk — which is either the argument or the reason to reject it.",
    Content: SketchGroundPips,
  },
];

/**
 * Eight directions the drift picture could be pushed in, none of them exclusive of another. The
 * picture today is a product of gratings cut out of one ink and filmed through three channels
 * (src/ui/moireCanvas.ts, src/ui/moireScreen.ts), and its structure is two fractal rows whose
 * levels were meant to read as a lattice of cells (0268) and still read as a weave. Each of these
 * is one move a shader would make — a fold, a ramp, a warp, a mirror, a feedback, a terrace, a
 * union, a per-cell read — drawn on a stand-in weave in the instrument's own inks, under the one
 * dial that direction turns. Every one carries where it would land and what side of the bake line
 * it falls on (docs/plan.md, "a tile is a bake and a frame is a `fillStyle`").
 */
export const SKETCH_DRIFTS: readonly SketchEntry[] = [
  {
    id: "ramp",
    label: "The Ramp",
    thesis:
      "The same picture read through a ramp of five inks rather than laid down in one. The reference's black to blue to cyan to green to yellow to red is one scalar through a palette, and this instrument's field is already one scalar. Hue and disperse become where on the ramp the rest sits and how much of it the picture reaches.",
    trades:
      "the one-hue instrument. The picture becomes the most coloured thing on the page by a distance, in tokens the page already has but never in this order, and every other surface reads as its grey frame. Five stops out of existing tokens spend no new colour; a ramp that wants a sixth is a colour-boundary crossing with its own record (0236).",
    built:
      "in build at src/ui/moireScreen.ts, where every pixel is multiplied by one row ink today: read the tile's own value through a ramp of the ground, --drift-cool, --screen-green, the primary and --drift-hot, each resolved through inkOf as the channel tokens already are. hue slides the rest along the ramp and disperse widens the reach, both already stepped onto DRIFT_STEPS, so it is bake-side: the ramp is baked into the screen tile and the frame still costs one fillStyle.",
    Content: SketchDriftRamp,
  },
  {
    id: "tunnel",
    label: "The Tunnel",
    thesis:
      "The picture fed back into itself through a zoom: what the ghost the painter already lays back would settle to if every frame were laid a little larger about the middle. The one term that is free per frame is a transform, and this is nothing but one.",
    trades:
      "the fine weave's legibility. A tunnel carries everything toward the middle and smears the fringes into rays on its way, so at any zoom worth seeing the picture is the tunnel and the rows are what it is made of; and it is only ever as sharp as the ghost it sums, which is half the ink (DRIFT_FEEDBACK_CEILING).",
    built:
      "aimFeedback in src/ui/moireCanvas.ts already scales the ghost by FEEDBACK_ZOOM at three percent and turns it a fraction; the zoom goes to the dial's band and the centre moves with the wind's veer. Frame-side entirely — one drawImage transform, no bake, no key — and feedbackAlpha's ceiling is what keeps the sum from blowing out, which the closed form in sketchField.ts states as the geometric series it is.",
    Content: SketchDriftTunnel,
  },
  {
    id: "terrace",
    label: "The Terrace",
    thesis:
      "The smooth field cut into terraces with every riser lit, so the picture is contour lines rather than fringes. An escape count is banded by nature and the rest of the field is not; the banding is the thing about the reference's cells that reads as depth.",
    trades:
      "smoothness on the strip. A riser is a hard edge and thirty-two pixels alias it, so the profile has to soften every riser by a pixel or the strip shimmers; and a terraced row cannot beat, because a staircase has no second spacing to beat against — it reads as contours and never as a moiré.",
    built:
      "a wave in src/lib/moireProfiles.ts beside stair, which already quantises a cosine onto three steps for the crusher: a staircase with a lit riser, its step count a stepped key. Any row can be cut to it, so it is bake-side for a curved row and a pattern tile for a straight one; the fractal rows would take it first, since their level count is already the terrace.",
    Content: SketchDriftTerrace,
  },
  {
    id: "blobs",
    label: "The Blobs",
    thesis:
      "Rows as distances merged with a smooth minimum, and one grating cut along the merged distance so the fringes wrap the union. The product of gratings is one way to combine rows; the union of shapes is another, and the second reads as one thing instead of as a stack.",
    trades:
      "the rows' independence. Once distances are merged a single effect's row cannot be picked out of the shape — the picture is one thing and its parts have no edges — which is the opposite of what the product buys, where every row is still a row; and a straight row has no distance to merge.",
    built:
      "a sibling of the product in src/lib/moireGrating.ts: where through multiplies each row's grating, a union takes each curved geometry's coordinate as a distance, merges them with smin over a k stepped off the wash, and cuts one grating along the result inside one tile. Bake-side, and one tile for the whole union rather than one per row, which is fewer bakes and one bigger one — the shatter's slices and the feedback stay as they are over it.",
    Content: SketchDriftBlobs,
  },
  {
    id: "bands",
    label: "The Cells Hear",
    thesis:
      "The lattice with every cell lit by its own band of the spectrum the picture already reads for the spiral (0240): a cell's interior slides by its band's level and brightens with it, and the gutter stands still. Twelve cells each hearing a band is the picture hearing the sound rather than reading a number off it.",
    trades:
      "the field's unity. Cells moving on their own read as a meter, and a meter dressed as a lattice is still a meter; the slide has to be held under a cell's own pitch or the picture is twelve VU bars. And it needs the lattice first — this is the lattice with a per-frame read, not a direction of its own without it.",
    built:
      "beside the shatter's slices in src/ui/moireCanvasField.ts: the finished field is already taken back out through LENS_SLICES bands, and a cell is a rectangular slice drawn with its own drawImage offset per frame, its offset the band's level off the analyser the wash already reads. Frame-side — no bake, no key — and bounded like the shatter at a ceiling under one cell; the lattice underneath is the first entry's bake.",
    Content: SketchDriftBands,
  },
];

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
      is a bake and a frame is a fill — so the eight are a plan&apos;s worth of parts and not eight
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
