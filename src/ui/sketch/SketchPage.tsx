/**
 * @role The sketch bench at #/sketch — the nav, and the two lists it mounts: eight readings of when
 *   the ground shifts under a hand's gesture, and eight of how a song is played. Every entry carries
 *   the one sentence it makes and the thing it gives up to make it.
 * @instead The surface they are all arguing with → src/ui/PlayerCard.tsx. The primitives they are
 *   drawn out of, on their own page → src/ui/dev/DevPage.tsx.
 */

// The dependency count is the sketch count, for the reason the gallery's is: this file exists to
// mount every sketch, and a barrel would trade a visible import list for an invisible one.
// oxlint-disable import/max-dependencies

import type { MouseEvent, ReactNode } from "react";

import { cn } from "@/lib/cn";
import { PLAYER_GROUP_LABELS, PLAYER_LABEL } from "@/lib/copy";
import { PLAYER_PLAYS_LABEL, PLAYER_SONGS_LABEL } from "@/lib/copySongs";
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
import { SKETCH_EVERY_SAID, SKETCH_PER } from "@/ui/sketch/sketchGround";
import { SKETCH_RUN, SKETCH_TURN } from "@/ui/sketch/sketchSong";
import { SketchSongGrid } from "@/ui/sketch/song/SketchSongGrid";
import { SketchSongHand } from "@/ui/sketch/song/SketchSongHand";
import { SketchSongRoute } from "@/ui/sketch/song/SketchSongRoute";
import { SketchSongSpend } from "@/ui/sketch/song/SketchSongSpend";
import { SketchSongSpindle } from "@/ui/sketch/song/SketchSongSpindle";
import { SketchSongStrip } from "@/ui/sketch/song/SketchSongStrip";
import { SketchSongTrack } from "@/ui/sketch/song/SketchSongTrack";
import { SketchSongWheel } from "@/ui/sketch/song/SketchSongWheel";
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
 * Eight readings of the other seam: the tier over a part, and the cursor walking it
 * (src/lib/playerSongs.ts). A song is a run of parts and a count of times round, and the card draws
 * it as a list of rows — the least visual surface on the instrument, and the one thing the
 * instrument is for. Every one of these draws the cursor standing somewhere, because a song is a
 * run *and* a cursor over it, and a picture with only the run in it is the list again.
 */
export const SKETCH_PLAYS: readonly SketchEntry[] = [
  {
    id: "track",
    label: "The Track",
    thesis: `The whole run as one length of track, the songs laid end to end over it and a sleeper per ${SKETCH_TURN}, with the cursor a car standing on one of them. How far in, and how much left, without a number being read.`,
    trades:
      "the arrangement. A track is the run already flattened, so which part belongs to which song — and that one part is in three of them — is a thing this picture cannot say.",
    Content: SketchSongTrack,
  },
  {
    id: "hand",
    label: "The Hand",
    thesis: `The ${PLAYER_GROUP_LABELS.arrange.toLowerCase()} as a hand of cards with one played at a time: every part is a card carrying its own length and character, and the one on the table is lifted out of the hand.`,
    trades:
      "the order. A hand is a set and not a run, so how many times a card comes back — and when — is nowhere on it, and the count is a line of type underneath.",
    Content: SketchSongHand,
  },
  {
    id: "wheel",
    label: "The Wheel",
    thesis: `The song as a wheel and its ${PLAYER_PLAYS_LABEL.toLowerCase()} as the teeth: one tooth per round, the parts inside as what one round is made of, and the wheel handing on to the next song when the last tooth passes.`,
    trades:
      "the rest of the run. One wheel is one song, so the two songs either side of it are a name in the corner and never a shape a hand can point at.",
    Content: SketchSongWheel,
  },
  {
    id: "grid",
    label: "The Grid",
    thesis:
      "A launch grid: a column per song, a row per part, the cell playing lit and the one coming armed. The next thing becomes the thing a hand presses, and the boundary does the rest.",
    trades:
      "how long. A grid says what comes next and never when, so a part of four bars and a part of eight are the same cell — which is the fact the strip beside it is entirely made of.",
    Content: SketchSongGrid,
  },
  {
    id: "route",
    label: "The Route",
    thesis:
      "The parts as places on a map and the song as the road between them, with the cursor a pin on one. A part played twice is a place visited twice, which is the one thing about an arrangement a list of rows cannot draw at all.",
    trades:
      "the count. A map is a shape and not a clock: how many times the road goes round, and how far along this lap is, are both off the picture.",
    Content: SketchSongRoute,
  },
  {
    id: "spend",
    label: "The Spend",
    thesis: `The ${PLAYER_PLAYS_LABEL.toLowerCase()} as the thing being spent: a row per song, a coin per round, the spent ones gone and the one under way lit. The number a hand is actually waiting on, drawn running out.`,
    trades:
      "the parts. A purse counts rounds, so what a round is a run of is not on this picture — which makes it the one reading here that could be wrong about where the cursor is and still look right.",
    Content: SketchSongSpend,
  },
  {
    id: "spindle",
    label: "The Spindle",
    thesis:
      "The song as a spindle of parts: the one playing is pulled off, sounded, and pushed back on, so the gesture has both its ends on the picture and the pile keeps a hole where the part was.",
    trades:
      "the run again. A spindle is one song's round, and the two arrows are a gesture nobody makes — the run pulls the part, not a hand — so this is the one drawing here arguing about a metaphor rather than about a surface.",
    Content: SketchSongSpindle,
  },
  {
    id: "strip",
    label: "The Strip",
    thesis: `The whole run as one strip drawn at its own length, ${SKETCH_RUN.length} ${SKETCH_TURN}s end to end, with the cursor the only thing on it that moves. The structure becomes the background and the place becomes the picture.`,
    trades:
      "arranging. A strip is for watching: nothing on it is a thing to press, and at this length one part is a few pixels wide and carries no name at all.",
    Content: SketchSongStrip,
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
            <SketchLinks entries={SKETCH_PLAYS} />
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <main className={cn(SHELL_BODY, "flex flex-col gap-12")}>
        <p className="max-w-3xl type-body text-muted-foreground">
          One bench, one question: when does the ground move, and where to. {SKETCH_GROUNDS.length}{" "}
          readings of that one seam, each replacing {PLAYER_GROUP_LABELS.ground}&apos;s period and
          nothing else. The card counts that period in jumps, parts or whole rounds of the song, and
          the unit a hand reasons in — every Nth time the walk finishes its {SKETCH_PER} — is in
          none of the three, so every drawing here is arguing for a fourth clock or against one.
          None is wired to anything — no store, no command, no sound — and they are drawn in the
          instrument&apos;s own tokens and type, so what is on the screen is what the real thing
          would look like.
        </p>

        <SketchGroup
          heading={`${PLAYER_GROUP_LABELS.ground}: when it moves`}
          entries={SKETCH_GROUNDS}
        />

        <hr className="border-border" />

        <p className="max-w-3xl type-body text-muted-foreground">
          One bench, one question: how is a song played. {SKETCH_PLAYS.length} readings of the tier
          over a part — a run of parts, a count of times round, and a cursor walking both — which
          the card draws as a list of rows and which is the thing the instrument is for. Every one
          of them draws the cursor standing somewhere, because a song is a run and a cursor over it,
          and a drawing of the run alone is the list again.
        </p>

        <SketchGroup heading={`${PLAYER_SONGS_LABEL}: how one is played`} entries={SKETCH_PLAYS} />
      </main>
    </div>
  );
}

/** One group's links, so a second bench's run of them is one shape said twice rather than two. */
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
