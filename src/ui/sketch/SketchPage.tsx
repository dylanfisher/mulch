/**
 * @role The sketch bench at #/sketch — the nav, and the two lists it mounts: six readings of how
 *   the ground moves under the loop and what the loop's own boundary does, and eight of when it
 *   shifts under a hand's gesture. Every entry carries the one sentence it makes and the thing it
 *   gives up to make it. The bench of how a song is played is spent: the grid won and is the
 *   card's own section now (0275, src/ui/PlayerGrid.tsx).
 * @instead The surface they are all arguing with → src/ui/PlayerCard.tsx. The primitives they are
 *   drawn out of, on their own page → src/ui/dev/DevPage.tsx.
 */

// The dependency count is the sketch count, for the reason the gallery's is: this file exists to
// mount every sketch, and a barrel would trade a visible import list for an invisible one.
// oxlint-disable import/max-dependencies

import type { MouseEvent, ReactNode } from "react";

import { cn } from "@/lib/cn";
import { PLAYER_GROUP_LABELS, PLAYER_LABEL } from "@/lib/copy";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { Wordmark } from "@/ui/Logo";
import { SKETCH_ROUTE } from "@/ui/routes";
import { SHELL_BODY, SHELL_HEADER, SHELL_HEADER_ROW } from "@/ui/shell";
import { SketchFrame } from "@/ui/sketch/SketchFrame";
import { SketchGroundClock } from "@/ui/sketch/ground/SketchGroundClock";
import { SketchGroundCut } from "@/ui/sketch/ground/SketchGroundCut";
import { SketchGroundLadder } from "@/ui/sketch/ground/SketchGroundLadder";
import { SketchGroundLane } from "@/ui/sketch/ground/SketchGroundLane";
import { SketchGroundPips } from "@/ui/sketch/ground/SketchGroundPips";
import { SketchGroundQueue } from "@/ui/sketch/ground/SketchGroundQueue";
import { SketchGroundRing } from "@/ui/sketch/ground/SketchGroundRing";
import { SketchGroundThrow } from "@/ui/sketch/ground/SketchGroundThrow";
import { SketchMoveFence } from "@/ui/sketch/move/SketchMoveFence";
import { SketchMoveLeash } from "@/ui/sketch/move/SketchMoveLeash";
import { SketchMovePad } from "@/ui/sketch/move/SketchMovePad";
import { SketchMoveSentence } from "@/ui/sketch/move/SketchMoveSentence";
import { SketchMoveSwitchboard } from "@/ui/sketch/move/SketchMoveSwitchboard";
import { SketchMoveTide } from "@/ui/sketch/move/SketchMoveTide";
import { SKETCH_EVERY_SAID, SKETCH_PER } from "@/ui/sketch/sketchGround";
import { SKETCH_BREATHS, SKETCH_REACHES, SKETCH_WAYS } from "@/ui/sketch/sketchMove";
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
  Content: () => ReactNode;
};

/**
 * Six readings of the other seam: what the ground does once it moves. The fold says it in a
 * Distance in sixteenths, a Lean and a Home — three dials and a fold to find them in — and says
 * nothing at all about the one thing beside them a hand asks for, whether the loop itself grows or
 * shrinks as it goes. Every drawing here says the same four facts in the words `sketchMove.ts`
 * gives them — a nudge, a bed, anywhere; back, either way, on; shrinks, holds, grows — and never
 * a number, and every one draws the next three windows on the file so the setting is seen as what
 * it does. What they disagree about is what the control is: a gesture on the picture, or the
 * words themselves.
 */
export const SKETCH_MOVES: readonly SketchEntry[] = [
  {
    id: "leash",
    label: "The Leash",
    thesis:
      "The loop on a leash a hand pulls out along the file: how far is its length, which way is its side, and a leash left lying on the loop is the loop staying put. Three facts, one pull.",
    trades: `two words. A leash has a side, so ${SKETCH_WAYS[1]} is not on it — and it says nothing about how big the loop is, so the breath is somewhere else.`,
    Content: SketchMoveLeash,
  },
  {
    id: "pad",
    label: "The Pad",
    thesis:
      "A puck on a pad: across is which way, up is how far, and the foot of the pad is staying put. Further and more-that-way are directions a hand feels, not numbers it reads.",
    trades: `the breath. A pad is two axes and the loop has three things to say, so whether it ${SKETCH_BREATHS[2]} or ${SKETCH_BREATHS[0]} has no corner here.`,
    Content: SketchMovePad,
  },
  {
    id: "fence",
    label: "The Fence",
    thesis:
      "Two posts on the file with the loop between them: the reach is the room inside the fence, the way is which side has the room, and a fence pulled tight is the loop staying put. A hand sets where the loop may not go, which is the thing it actually knows.",
    trades:
      "the size again, and the odds. Room is not a size, and a fence says nothing about how often the loop comes home — it only says how far away it may be when it does not.",
    Content: SketchMoveFence,
  },
  {
    id: "sentence",
    label: "The Sentence",
    thesis:
      "The four facts as the sentence a hand would say them in, every word a press that turns it to the next word. A loop that stays put loses the two words that were about going.",
    trades: `the numbers. ${SKETCH_REACHES[0]} is whatever a nudge is, and the odds of coming home have no word in the sentence at all.`,
    Content: SketchMoveSentence,
  },
  {
    id: "switchboard",
    label: "The Switchboard",
    thesis:
      "Four rows of presses under the file, one word lit on each. Every word the fold could say is on the board at once, which no dial, no leash and no sentence can claim.",
    trades:
      "the gesture. It is the fold's own dials said as words, and nothing on it is felt — the honest floor the five above it are measured against.",
    Content: SketchMoveSwitchboard,
  },
  {
    id: "tide",
    label: "The Tide",
    thesis:
      "The loop's own boundary as a tide: the next windows stacked under the file like tide lines, each wider or narrower than the last, and one slider for whether it comes in, holds or goes out. The one fact the fold has no word for, given a picture before it is given a dial.",
    trades:
      "the walk. A tide swells where it lies: which way it sets and how far are drawn here off the fixture and never chosen, so this is half a control beside the other five.",
    Content: SketchMoveTide,
  },
];

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
    trades: `three dials. A notch is a whole ${PLAYER_KNOB_LABELS.bed}, so the ${PLAYER_KNOB_LABELS.bedDistance}, the ${PLAYER_KNOB_LABELS.bedBias} and the ${PLAYER_KNOB_LABELS.bedHome} are all gone — and with them the crawl that lands part-way into a bed, which is the thing the fold exists for.`,
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
            <SketchLinks entries={SKETCH_MOVES} />
            <span aria-hidden className="text-border">
              |
            </span>
            <SketchLinks entries={SKETCH_GROUNDS} />
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <main className={cn(SHELL_BODY, "flex flex-col gap-12")}>
        <p className="max-w-3xl type-body text-muted-foreground">
          One fold, two questions. First, how the ground moves: {SKETCH_MOVES.length} readings that
          replace {PLAYER_GROUP_LABELS.ground}&apos;s Distance, Lean and Home dials with four facts
          said in words — whether the loop moves on its own, how far, which way, and whether its own
          boundary grows or shrinks, which the fold cannot say at all today. Then, when it moves:{" "}
          {SKETCH_GROUNDS.length} readings of that one seam, each replacing the fold&apos;s period
          and nothing else. The card counts that period in jumps, parts or whole rounds of the song,
          and the unit a hand reasons in — every Nth time the walk finishes its {SKETCH_PER} — is in
          none of the three, so every drawing there is arguing for a fourth clock or against one.
          None is wired to anything — no store, no command, no sound — and they are drawn in the
          instrument&apos;s own tokens and type, so what is on the screen is what the real thing
          would look like.
        </p>

        <SketchGroup
          heading={`${PLAYER_GROUP_LABELS.ground}: how it moves`}
          entries={SKETCH_MOVES}
        />

        <SketchGroup
          heading={`${PLAYER_GROUP_LABELS.ground}: when it moves`}
          entries={SKETCH_GROUNDS}
        />
      </main>
    </div>
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
        {entries.map(({ id, label, thesis, trades, Content }, index) => (
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
      </div>
    </section>
  );
}
