/**
 * @role One dial of the jumps card and the amounts that shape what it bounds, standing beside it:
 *   the run they are drawn as, and the name those amounts wear so no two dials on the card share a
 *   word (0195). Eight dials carry one — the ground's period, the distance, the phrase, the
 *   repeats, the burst's vary, the rest, the hold and the arrangement — so the frame they share is
 *   declared here once and the amounts stay each dial's own (principle 3, P87, 0135).
 * @instead Which amounts each dial holds → src/ui/PlayerBed.tsx, src/ui/PlayerDistance.tsx,
 *   src/ui/PlayerPhrase.tsx, src/ui/PlayerRepeats.tsx, src/ui/PlayerVary.tsx,
 *   src/ui/PlayerRest.tsx, src/ui/PlayerRate.tsx, src/ui/PlayerArrange.tsx. The one `deck.player`
 *   they all patch → src/ui/PlayerCard.tsx. The box a run lands in → src/ui/PlayerGroup.tsx.
 */
import type { ReactNode } from "react";

import type { PlayerDefaults, PlayerSpec } from "@/lib/player";
import type { DeckId } from "@/state/store";
import type { PlayerVoiceReader } from "@/ui/PlayerDial";

/**
 * What every one of those eight takes. Each is the same run with a different list of amounts
 * inside it, and each spelled this list out for itself — eight copies of five paragraphs, which is
 * seven more than a fact gets (principle 1). Declared here, beside the frame they all share, so a
 * prop added to a run is added once.
 */
export type PlayerRunProps = {
  deck: DeckId;
  /**
   * What names the controls in this run, where the card's own words would not tell them from
   * another set on screen. The empty string is the card's own, which is named by its captions and
   * its yard alone; a part's fold draws the very boxes the card draws, so with a part open there
   * are two Gate dials and two Hold runs in one yard, and `aria-label` is the only thing between
   * them (0055, 0176, src/ui/PlayerDial.tsx, src/ui/PlayerPart.tsx).
   */
  named: string;
  /** The spec every dial in the run reads and patches, which is the card's own (0089). */
  player: PlayerSpec;
  /** What each dial snaps back to on a double-click: the switch's own values (0118). */
  defaults: PlayerDefaults;
  /** The card's own patch: one `deck.player` per gesture, carrying the whole spec (0089). */
  patch: (fields: Partial<PlayerSpec>) => void;
  /** What the song is standing at, handed down from the card: every amount in the run reads the
   *  pattern's own numbers while one plays, exactly as the dial it belongs to does (0157). */
  voice?: PlayerVoiceReader;
  /** Whether the card's dials are pointed at a part of its song, so every dial in the run reads
   *  and writes that part and wears the mark saying so (0176, src/ui/PlayerDial.tsx). */
  selected?: boolean;
  /** Whether every control in the run is refused rather than absent: the card draws its whole body
   *  whether or not its switch is on, so the dials are greyed and unturnable until the module holds
   *  a spec (0121, 0173). */
  disabled?: boolean;
};

/**
 * What the amounts of one run are named by: the dial they belong to, under whatever already names
 * the set they are in. A caption is a dial's whole accessible name (src/ui/Knob.tsx), and with
 * every amount on the card at once a chance called Chance is one of six sliders nothing could tell
 * apart — so an amount is named for the dial it shapes and the words on screen stay the one word
 * each (0195, src/lib/copyKnobs.ts). Handed to a dial as its `named` prefix, so a part's fold puts
 * the part in front of both.
 */
export const runName = (named: string, title: string): string =>
  named === "" ? title : `${named} ${title}`;

/**
 * The bracket a run wears: one outline holding the dial and every amount that shapes it, on one
 * node rather than on each of the run's elements. 0195 put the ownership on screen as a tint and
 * then drew it faintly, once per sibling, with the box's own `gap-2` cutting a hole through it
 * between every pair — so what a hand saw was forty tiles at one distance from each other rather
 * than eight brackets, which is the flatness 0197 is about. One node closes those holes: the
 * bracket runs unbroken from the dial to its last amount, and the gap either side of it is the gap
 * between runs.
 *
 * **An outline and not a fill**, which is what 0198 reverses out of 0197. The fill was the muted
 * token at full strength and a knob's unturned track is `stroke-muted` (src/ui/Knob.tsx) — the
 * same token, so every dial inside a bracket lost the arc that says how far round it is, and the
 * run that was drawn to make the dials legible was the one thing hiding them. The outline says the
 * same thing against the card's own ground and takes no colour off the controls.
 *
 * Stronger than `PlayerGroup`'s outline rather than fainter, and the reason is that the box has an
 * eyebrow and this has nothing: a box is named by the question it asks, so its own frame carries
 * none of the grouping, while a run is told from the run beside it by this line alone. It is still
 * an outline and not a second card, which is what 0173 refuses (P135).
 *
 * It wraps inside itself rather than letting the box wrap it mid-run: a bracket broken across two
 * lines is not a bracket, and a run of five dials does not fit 360px in one line
 * (`scripts/smoke.d/narrow.js`).
 */
const RUN =
  "flex flex-wrap items-end gap-2 self-stretch rounded-sm px-1.5 py-1 ring-1 ring-foreground/20";

/**
 * A dial and its amounts inside one bracket: the dial first, at a size up from the amounts
 * that shape it, then the amounts beside it. Nothing is behind anything — every number the module
 * declares is on the card, and what says which dial an amount belongs to is the bracket it stands
 * in and the name it wears (0195, 0197).
 */
export function PlayerRun({
  title,
  dial,
  children,
}: {
  /** What the run is called: the name of the dial its amounts shape, which is what they are named
   *  after (`runName`) and what a test and the harness find the run by. */
  title: string;
  /** The dial the amounts belong to, drawn by whoever declares its range. */
  dial: ReactNode;
  /** The amounts themselves, laid out the way a card's row of dials is. */
  children: ReactNode;
}) {
  return (
    <div data-run={title} className={RUN}>
      {dial}
      {children}
    </div>
  );
}
