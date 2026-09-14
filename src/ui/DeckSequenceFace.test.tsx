/**
 * @role What a yard draws under the sequencer view: its sequence face — folded, with the run of
 *   steps where its source, readout and reading were, no fold to press and no clip to capture —
 *   keeping the grip, the copy and the remove, because a run is still arranged (0379).
 * @instead Everything else the yard draws or answers to → ./Deck.test.tsx, which is at the hard
 *   cap docs/map.md sets and scripts/arch enforces where no waiver reaches (0045).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { manualClock } from "@/app/clock";
import { silentEngine } from "@/app/engineDouble";
import { createInstrument } from "@/app/facade";
import { SOURCE_LABEL } from "@/lib/copy";
import { SEQUENCE_ADD_LABEL } from "@/lib/copySequence";
import { Deck } from "@/ui/Deck";

/** The view, on — a module store read through `useSyncExternalStore`, which a server render
 *  would otherwise answer with its server snapshot: off. */
const view = vi.hoisted(() => ({ sequencer: true }));
vi.mock("@/ui/sequencerMode", () => ({ useSequencerMode: () => view.sequencer }));

/** An inert grip: the yard's own list owns the gesture, and no case here is about it (0111). */
const HANDLE = { onPointerDown: () => {}, onKeyDown: () => {} };

const yard = () => {
  const instrument = createInstrument(manualClock(), () => silentEngine());
  instrument.send({ t: "deck.load", deck: "a", source: { gen: "click-train", hz: 8 } });
  instrument.send({ t: "deck.sequence", deck: "a", steps: [{ kind: "in", secs: 120 }] });
  return renderToStaticMarkup(
    <Deck instrument={instrument} deck="a" emoji="🌴" name="North Willow" active handle={HANDLE} />,
  );
};

describe("a yard under the sequencer", () => {
  it("draws the run in the header and nothing of the yard's own body", () => {
    const markup = yard();
    expect(markup).toContain("Yard A");
    expect(markup).toContain('aria-label="Sequence 1 Kind"');
    expect(markup).toContain(`aria-label="${SEQUENCE_ADD_LABEL}"`);
    // The source, its pitch, the capture and the fold are all gone.
    expect(markup).not.toContain(`aria-label="Yard A ${SOURCE_LABEL}"`);
    expect(markup).not.toContain('id="a-hz"');
    expect(markup).not.toContain("Capture Yard A");
    expect(markup).not.toContain("aria-pressed");
    // And the body with them: the peaks and the transport.
    expect(markup).not.toContain("Yard A Waveform");
    expect(markup).not.toContain(">Play<");
  });

  it("keeps the grip, the copy and the remove", () => {
    const markup = yard();
    expect(markup).toContain('aria-label="Reorder Yard A"');
    expect(markup).toContain('aria-label="Duplicate Yard A"');
    expect(markup).toContain('aria-label="Remove Yard A"');
  });

  it("draws the yard its own way again once the view is off", () => {
    view.sequencer = false;
    try {
      const markup = yard();
      expect(markup).not.toContain(`aria-label="${SEQUENCE_ADD_LABEL}"`);
      expect(markup).toContain("Capture Yard A");
      expect(markup).toContain("Yard A Waveform");
    } finally {
      view.sequencer = true;
    }
  });
});
