/**
 * @role What the switch at the end of the jumps card's heading does: it mints a pattern on the
 *   yard that has never held one, and thereafter turns one field of the one it is holding over —
 *   so off keeps the seed, the song, the grounds a hand kept and every dial it turned, and the card
 *   over a bypassed spec draws what a card over no spec draws (P164, 0225).
 * @instead Which command every other gesture on the card sends → src/ui/PlayerCard.test.tsx. Which
 *   fold puts what away → src/ui/PlayerCardFolds.test.tsx. The props and the walks both suites
 *   share → src/ui/playerCardDouble.ts. Split off that first file at the 800-line hard cap, where
 *   no waiver reaches (0045).
 */
// Over the dependency cap, and for the reason src/ui/PlayerCard.test.tsx's own waiver says: this
// suite renders the real card and asserts against every list the module declares — the knobs, the
// ground's clocks, the switch's own defaults and the words for all three. Read and judged — see
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { renderToStaticMarkup } from "react-dom/server";
import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

// The one hook this strip calls, made callable outside a renderer so a control's own handler can
// be pressed — the same stand-in src/ui/PlayerCard.test.tsx uses, and for the same reason.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useMemo: (factory: () => unknown) => factory(),
    useRef: (initial: unknown) => ({ current: initial }),
  };
});

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { PLAYER_LABEL, RESEED_LABEL, SEED_LABEL } from "@/lib/copy";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { partVoice, PLAYER_KNOBS, PLAYER_SEED_MAX } from "@/lib/player";
import { oneSong } from "@/lib/playerSongs";
import { PLAYER_BED_PERS } from "@/lib/playerBed";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import { PLAYER_PART_DEFAULTS } from "@/lib/playerSong";
import type { DeckState } from "@/state/store";
import { handlers, keyOf, PLAYER, playerCard, SWITCH } from "@/ui/playerCardDouble";
import { PlayerFront } from "@/ui/PlayerFront";

/**
 * The card as this suite reads it: every fold open, because what a claim about the switch reads is
 * the whole body it greys out (src/ui/playerCardDouble.ts).
 */
const strip = (over: Partial<DeckState>, folds = false) => {
  const instrument = createInstrument(manualClock());
  const sent = vi.spyOn(instrument, "send").mockImplementation(() => {});
  const element = playerCard(instrument, over, {
    fine: folds,
    ground: folds,
    arrange: folds,
  });
  return { element, sent };
};

// One case per thing the switch does. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the jumps card's switch", () => {
  it("offers nothing on a deck with no loop to jump around", () => {
    expect(strip({ loop: null, player: null }).element).toBeNull();
  });

  // A cleared loop leaves the pattern durably in place, so the one control that can switch it off
  // has to stay reachable — otherwise it is saved, captured into clips, and starts jumping again
  // the moment a loop comes back, with nothing on screen that says so (0089).
  it("keeps offering the switch for a pattern a cleared loop left behind", () => {
    const { element, sent } = strip({ loop: null, player: PLAYER });
    expect(element).not.toBeNull();
    expect(renderToStaticMarkup(element)).toContain(PLAYER_LABEL);
    handlers(element)[SWITCH]?.(false);
    expect(sent).toHaveBeenCalledWith({
      t: "deck.player",
      deck: "a",
      player: { ...PLAYER, bypassed: true },
    });
  });

  /**
   * P130: a card with no spec draws its whole body anyway — every dial, every amount and both
   * corner actions — greyed and unturnable, painting `PLAYER_DEFAULTS`. A refused control is what 0121
   * asks for everywhere else on this card, and a body that is not there cannot say what the module
   * offers or at what settings it would start (0173).
   */
  it("draws its dials refused rather than absent while the switch is off", () => {
    const off = renderToStaticMarkup(strip({ player: null }).element);
    expect(off).toContain(PLAYER_LABEL);
    expect(off).toContain(PLAYER_KNOB_LABELS.distance);
    expect(off).toContain(RESEED_LABEL);
    // Every dial the module declares is refused — all of them, because none of them is behind
    // anything any more (0195) — and each is painted from the switch's own values rather than from
    // a spec the card invented: the gate a press of that switch would send is 0. The presses
    // beyond them are the clock the ground's period is counted on, one per word (0192, P158).
    const refused = PLAYER_KNOBS.length + PLAYER_BED_PERS.length;
    expect(off.match(/aria-disabled="true"/gu)?.length).toBe(refused);
    expect(off).toContain(`aria-label="${PLAYER_KNOB_LABELS.gate}" aria-valuemin="0"`);
    expect(off).toContain(`aria-valuenow="${PLAYER_DEFAULTS.gate}"`);
    const on = renderToStaticMarkup(strip({ player: PLAYER }).element);
    expect(on).not.toContain('aria-disabled="true"');
    expect(on).toContain(`aria-valuenow="${PLAYER.gate}"`);
  });

  // The seed is drawn here, at the gesture, and travels in the command — which is the whole of
  // why a replay of the log is the same performance (0089).
  it("draws a seed at the gesture and carries it in the command", () => {
    const { element, sent } = strip({ player: null });
    const random = vi.spyOn(Math, "random").mockReturnValue(0.5);
    handlers(element)[SWITCH]?.(true);
    random.mockRestore();
    const command = sent.mock.calls[0]?.[0];
    expect(command).toMatchObject({ t: "deck.player", deck: "a" });
    // Pinned, so this reads the draw rather than accepting any number: half of the seed range.
    expect(command).toHaveProperty("player.seed", (PLAYER_SEED_MAX + 1) / 2);
    expect(command).toHaveProperty("player.gate", 0);
  });

  /**
   * Off is a bypass and not a discard: the press turns one field over and leaves every other one —
   * the seed, the song, the grounds a hand kept and every dial it turned — exactly where it stood.
   * The only gesture that takes a spec away is the undo of the press that minted it (P164).
   */
  it("switches off by turning one field over rather than sending null", () => {
    const { element, sent } = strip({ player: PLAYER });
    handlers(element)[SWITCH]?.(false);
    expect(sent).toHaveBeenCalledWith({
      t: "deck.player",
      deck: "a",
      player: { ...PLAYER, bypassed: true },
    });
  });

  // And back on the same way: a yard already holding a spec mints nothing, so the pattern that
  // comes back is the pattern that went away rather than a fresh seed and factory dials (P164).
  it("switches back on without minting over the pattern it kept", () => {
    const { element, sent } = strip({ player: { ...PLAYER, bypassed: true } });
    const random = vi.spyOn(Math, "random").mockReturnValue(0.5);
    handlers(element)[SWITCH]?.(true);
    random.mockRestore();
    expect(sent).toHaveBeenCalledWith({
      t: "deck.player",
      deck: "a",
      player: { ...PLAYER, bypassed: false },
    });
  });

  // What a bypassed card draws is what an unswitched one draws — the greyed, unturnable dials of
  // `PLAYER_DEFAULTS` — because the switch says off and the card says what the switch says. The
  // values under them are the held ones, which is what the press above sends back (P164, 0173).
  it("draws a bypassed pattern exactly as it draws no pattern at all", () => {
    const bypassed = renderToStaticMarkup(strip({ player: { ...PLAYER, bypassed: true } }).element);
    const refused = PLAYER_KNOBS.length + PLAYER_BED_PERS.length;
    expect(bypassed.match(/aria-disabled="true"/gu)?.length).toBe(refused);
    expect(bypassed).toContain(`aria-valuenow="${PLAYER_DEFAULTS.gate}"`);
    // And the pattern's own one-line facts go with it: a seed nothing is unfolding is a readout of
    // a performance that is not happening.
    expect(bypassed).not.toContain(`${SEED_LABEL} ${PLAYER.seed}`);
  });

  /**
   * Said whole rather than surface by surface: a card over a bypassed spec draws *character for
   * character* what a card over no spec draws. Three painters read the held spec straight and none
   * of them was covered by counting refused dials — the ground strip's kept and opening marks, the
   * walk's picture with its lanes, and the seed line — so the claim is the whole
   * markup and not a list of slots that will be out of date the next time one is added (P164).
   */
  it("draws a bypassed card character for character as a card with no pattern", () => {
    const part = { ...PLAYER_PART_DEFAULTS, id: "part-one", name: "ONE", voice: partVoice(PLAYER) };
    // Every surface that reads a held spec, turned on at once: a written song, a ground the walk
    // moves, and a bed a hand kept.
    const rich = {
      ...PLAYER,
      songs: oneSong([part]),
      bedEvery: 4,
      beds: [{ bed: 5, every: 2 }],
    };
    const nothing = renderToStaticMarkup(strip({ player: null }, true).element);
    const bypassed = renderToStaticMarkup(
      strip({ player: { ...rich, bypassed: true } }, true).element,
    );
    expect(bypassed).toBe(nothing);
    // And the same card with the switch on is not that markup, so the comparison above is a claim
    // about the switch rather than about a card that draws nothing either way.
    const on = renderToStaticMarkup(strip({ player: rich }, true).element);
    expect(on).not.toBe(nothing);
  });

  /**
   * And the front's state comes back with it. The menu inside it holds which name was last pressed
   * and how far in the draw went, and the card throws that away by keying the front — which has to
   * be on whether a yard holds a spec at all, not on whether the switch is on. Since P164 a press
   * keeps the pattern, so it has to keep what the menu remembers about it too (0152).
   */
  it("keeps the front's own memory across a bypass, and resets it only with the spec", () => {
    const on = keyOf(strip({ player: PLAYER }).element, PlayerFront);
    expect(keyOf(strip({ player: { ...PLAYER, bypassed: true } }).element, PlayerFront)).toBe(on);
    expect(keyOf(strip({ player: null }).element, PlayerFront)).not.toBe(on);
  });

  // A yard holding nothing has nothing to bypass, so an off press on one is a gesture with nothing
  // to do — never a mint. The switch is controlled and cannot send it, and the callback is total
  // in its argument anyway (P164).
  it("mints nothing when the switch is pressed off on a yard holding no pattern", () => {
    const { element, sent } = strip({ player: null });
    handlers(element)[SWITCH]?.(false);
    expect(sent).not.toHaveBeenCalled();
  });
});
