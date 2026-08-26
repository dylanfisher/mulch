/**
 * @role Tests the fan the Where It Lands box draws: that a walk with no lean is drawn without one,
 *   that a stride's own distance is what the fan leads with, and that a part's fold names its fan
 *   after the part the way every dial in that fold is named.
 * @instead The odds themselves → `travelReach` in src/lib/playerTravel.ts, checked against the walk
 *   they are the shape of in src/lib/playerWalk.test.ts.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PLAYER_REACH_LABEL } from "@/lib/copy";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import type { PlayerSpec } from "@/lib/player";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import { PLAYER_STRIDE_MAX } from "@/lib/playerTravel";
import { PlayerReach } from "@/ui/PlayerReach";

const spec = (fields: Partial<PlayerSpec> = {}): PlayerSpec => ({
  seed: 5,
  ...PLAYER_DEFAULTS,
  ...fields,
});

const render = (fields: Partial<PlayerSpec> = {}, named = "") =>
  renderToStaticMarkup(<PlayerReach named={named} player={spec(fields)} />);

describe("the reach fan", () => {
  /**
   * At a lean of nothing the two ways of going three slots weigh exactly the same, so a cut that
   * took one of them would draw a forward lean the pattern does not have. The fan is cut by
   * distance and never by leg.
   */
  it("draws a walk with no lean without one", () => {
    const drawn = render();
    for (const offset of ["+1", "+2"]) {
      expect(drawn).toContain(`${offset} `);
      expect(drawn).toContain(`-${offset.slice(1)} `);
    }
    // Both signs of every distance it drew, and no odd one out.
    const legs = [...drawn.matchAll(/([+-]\d+) \d+%/gu)].map(([, leg]) => leg ?? "");
    for (const leg of legs) {
      expect(legs).toContain(leg.startsWith("+") ? `-${leg.slice(1)}` : `+${leg.slice(1)}`);
    }
  });

  /** A stride takes the whole distance every time, so that distance is what the fan leads with —
   *  and a home is a leg of its own, ranked among them rather than ahead of them. */
  it("leads with the distance a stride takes, and gives a home its own leg", () => {
    expect(render({ distance: 5, stride: PLAYER_STRIDE_MAX })).toContain("+5 ");
    expect(render({ home: 0.5 })).toContain(PLAYER_KNOB_LABELS.home);
    expect(render()).not.toContain(PLAYER_KNOB_LABELS.home);
  });

  /** A part's fold draws the very box the card draws, so with one open there are two fans in one
   *  yard and the accessible name is the only thing between them (0055, 0176). */
  it("names a part's own fan after the part", () => {
    expect(render({}, "")).toContain(`aria-label="${PLAYER_REACH_LABEL}"`);
    expect(render({}, "Yard A Riff")).toContain(`aria-label="Yard A Riff ${PLAYER_REACH_LABEL}"`);
  });
});
