/**
 * The move bench's own half of the naming rule (0252, 0254): six readings of one seam, each
 * naming the four facts inside its own close, each lighting the same standing window off the one
 * fixture, and each drawing the same three windows ahead of it. Out of `SketchPage.test.tsx` in
 * the shape `SketchGrounds.test.tsx` took — that file mounts the bench and checks the list is the
 * bench, this one checks what the list draws. Plural in the name for the reason that one is.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MOVE_AHEAD } from "@/ui/sketch/move/SketchMoveFile";
import { SKETCH_MOVES, SketchPage } from "@/ui/sketch/SketchPage";
import {
  moveSaid,
  SKETCH_BREATHS,
  SKETCH_FENCE_AT,
  SKETCH_LOOP,
  SKETCH_MOVE,
  SKETCH_MOVE_HELD,
  SKETCH_MOVE_SAID,
  SKETCH_REACHES,
  SKETCH_WANDERS_SAID,
  SKETCH_WAYS,
} from "@/ui/sketch/sketchMove";

/** The whole bench, rendered once: every case here reads one picture out of the one markup. */
const markup = renderToStaticMarkup(<SketchPage />);

/**
 * One picture of the bench, bounded by its own close so a neighbour cannot answer for it — the
 * ground bench's own slice, on this bench's attribute.
 */
function pictureOf(reading: string): string {
  const attribute = `data-move="${reading}"`;
  const opens = markup.indexOf(attribute);
  expect(opens, `${attribute} is not mounted`).not.toBe(-1);
  const closes = markup.indexOf("</svg>", opens);
  expect(closes, `${attribute} draws no picture`).toBeGreaterThan(opens);
  return markup.slice(opens, closes);
}

/** The whole entry, picture and control alike, up to the next entry's stage. */
function entryOf(reading: string): string {
  const opens = markup.indexOf(`data-move="${reading}"`);
  expect(opens, `${reading} is not mounted`).not.toBe(-1);
  const next = markup.indexOf("data-move=", opens + 1);
  return markup.slice(opens, next === -1 ? undefined : next);
}

/** What a picture with no say over the breath opens saying, and what one with a say does. */
const OPENS_HELD = moveSaid(SKETCH_MOVE_HELD);

describe("SketchPage draws how the ground moves, six ways", () => {
  /**
   * The naming rule reaching the move bench, over every entry the list holds rather than a list
   * of readings written out here: an entry added without a picture, or a picture that stopped
   * saying its four facts, has to fail rather than pass because a table in a test was not updated.
   */
  it("says the four facts and lights the standing window inside every one of the six", () => {
    expect(SKETCH_MOVES).toHaveLength(6);
    for (const entry of SKETCH_MOVES) {
      const picture = pictureOf(entry.id);
      expect(picture, `${entry.id} lights no window`).toContain(`data-standing="${entry.id}"`);
      // Every picture opens on the fixture's reach and way; the three that cannot breathe open
      // holding, and say so, rather than drawing a growth they have no control for.
      expect(picture, `${entry.id} does not say what the loop does`).toMatch(
        new RegExp(`<text[^>]*>[^<]*(?:${SKETCH_MOVE_SAID}|${OPENS_HELD})`, "u"),
      );
      // And the same three windows ahead, numbered inside themselves, so the future is one future.
      for (let nth = 1; nth <= MOVE_AHEAD; nth += 1) {
        expect(picture, `${entry.id} draws no window +${nth}`).toContain(`>+${nth}<`);
      }
    }
  });

  it("opens the three gestures holding the loop's size, and the three with words on the fixture", () => {
    for (const reading of ["leash", "pad", "fence"]) {
      expect(pictureOf(reading)).toContain(OPENS_HELD);
    }
    for (const reading of ["sentence", "switchboard", "tide"]) {
      expect(pictureOf(reading)).toContain(SKETCH_MOVE_SAID);
    }
    // Part-way up the file, so the windows ahead have somewhere to go on either side.
    expect(SKETCH_LOOP.at).toBeGreaterThan(0);
  });
});

describe("each of the six names its own bins", () => {
  it("names every reach both ways along the leash, and both ways", () => {
    const leash = pictureOf("leash");
    for (const reach of SKETCH_REACHES) expect(leash).toContain(`>${reach}<`);
    expect(leash).toContain(">stays<");
    expect(leash).toContain(">back<");
    expect(leash).toContain(">on<");
  });

  it("names every reach up the pad and every way across it, with the foot staying put", () => {
    const pad = pictureOf("pad");
    for (const reach of SKETCH_REACHES) expect(pad).toContain(`>${reach}<`);
    for (const way of SKETCH_WAYS) expect(pad).toContain(`>${way}<`);
    expect(pad).toContain(`>${SKETCH_WANDERS_SAID.stays}<`);
  });

  it("names the room on either side of the fence in sixteenths", () => {
    const fence = pictureOf("fence");
    expect(fence).toContain(`>${SKETCH_LOOP.at - SKETCH_FENCE_AT.left} back<`);
    expect(fence).toContain(`>${SKETCH_FENCE_AT.right - SKETCH_LOOP.at - SKETCH_LOOP.span} on<`);
  });

  it("names the three breaths along the tide's slider", () => {
    const tide = pictureOf("tide");
    for (const breath of SKETCH_BREATHS) expect(tide).toContain(`>${breath}<`);
  });
});

describe("the words are controls", () => {
  it("presses every word of the sentence, and drops the two about going when the loop stays", () => {
    const sentence = entryOf("sentence");
    expect(sentence).toContain(`>${SKETCH_WANDERS_SAID.wanders}</button>`);
    expect(sentence).toContain(`>${SKETCH_MOVE.reach}</button>`);
    expect(sentence).toContain(`>${SKETCH_MOVE.way}</button>`);
    expect(sentence).toContain(`>${SKETCH_MOVE.breath}</button>`);
    // The two that go away are a fact about the sentence, checked by their names: a static render
    // cannot press, so the render is the wandering case and the case is that both are pressable.
    expect(sentence).toContain('aria-label="How far the loop wanders"');
    expect(sentence).toContain('aria-label="Which way the loop wanders"');
  });

  it("lays every word of every row on the switchboard, with one lit per row", () => {
    const board = entryOf("switchboard");
    const rows = board.match(/data-slot="toggle-group"/gu) ?? [];
    expect(rows).toHaveLength(4);
    for (const word of [...SKETCH_REACHES, ...SKETCH_WAYS, ...SKETCH_BREATHS]) {
      expect(board, `${word} is not on the board`).toContain(`>${word}</button>`);
    }
    // One word lit per row, and it is the fixture's.
    const lit = board.match(/aria-pressed="true"/gu) ?? [];
    expect(lit).toHaveLength(4);
  });

  it("works the tide from the instrument's own slider", () => {
    expect(entryOf("tide")).toContain('data-slot="slider"');
  });
});
