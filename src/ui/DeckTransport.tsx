/**
 * @role One deck's transport: play/pause, stop, loop, and cropping the source down to that loop,
 *   each sending the one ordinary command its gesture means. The two halves of stopping are the
 *   whole point — pause holds the playhead where it is, stop sends it back to the top of the
 *   loop (0038). Crop is the only one of them that writes audio, and only a looped deck offers it.
 * @instead What each of those commands does to the transport → src/audio/deck.ts, which owns the
 *   held position; the buttons here only read it back off the deck's state.
 */

import { useCallback } from "react";

import type { Instrument } from "@/app/facade";
import type { DeckId, DeckState } from "@/state/store";
import { Button } from "@/ui/components/button";

/**
 * The play button is one control sending one command — the same toggle Space sends, so the
 * pointer and the key can never disagree about what a press does. Stop is enabled by there being
 * a playhead to send home, which a held deck has as much as a playing one; stopping a stopped
 * deck is a no-op the control should not offer.
 */
// One callback and one button per transport gesture: the length tracks how many gestures a deck
// has, not how much this component decides. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function DeckTransport({
  instrument,
  deck,
  state,
}: {
  instrument: Instrument;
  deck: DeckId;
  state: DeckState;
}) {
  const onPlayToggle = useCallback(() => {
    instrument.send({ t: "deck.play.toggle", deck });
  }, [instrument, deck]);
  const onStop = useCallback(() => {
    instrument.send({ t: "deck.stop", deck });
  }, [instrument, deck]);
  const onLoop = useCallback(() => {
    instrument.send({ t: "deck.loop.toggle", deck });
  }, [instrument, deck]);
  // The id the new bytes will live under is minted here, at the gesture, for the reason every
  // other durable id is: the command carries it, so what the log recorded is what a replay makes.
  const onCrop = useCallback(() => {
    instrument.send({ t: "deck.crop", deck, id: crypto.randomUUID() });
  }, [instrument, deck]);
  const looping = state.loop !== null;

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        onClick={onPlayToggle}
        disabled={state.duration === 0}
        aria-pressed={state.playing}
      >
        {state.playing ? "pause" : "play"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={onStop}
        disabled={!state.playing && state.paused === null}
      >
        stop
      </Button>
      <Button
        size="sm"
        variant={looping ? "default" : "outline"}
        onClick={onLoop}
        disabled={state.duration === 0}
        aria-pressed={looping}
      >
        loop
      </Button>
      <Button size="sm" variant="outline" onClick={onCrop} disabled={!looping}>
        crop
      </Button>
    </div>
  );
}
