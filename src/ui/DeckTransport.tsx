/**
 * @role One deck's transport: play/pause, stop and loop, each sending the one ordinary command
 *   its gesture means. The two halves of stopping are the whole point — pause holds the playhead
 *   where it is, stop sends it back to the top of the loop (0038).
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
    </div>
  );
}
