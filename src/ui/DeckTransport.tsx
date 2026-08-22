/**
 * @role One deck's transport: play/pause, stop, loop, cropping the source down to that loop and
 *   flattening the yard onto the sound it is making, each sending the one ordinary command its
 *   gesture means. The two halves of stopping are the whole point — pause holds the playhead where
 *   it is, stop sends it back to the top of the loop (0038). Crop and flatten are the two that
 *   write audio (0047, 0112), and only a looped deck offers either.
 * @instead What each of those commands does to the transport → src/audio/deck.ts, which owns the
 *   held position; the buttons here only read it back off the deck's state.
 */

import { useCallback } from "react";

import type { Instrument } from "@/app/facade";
import { ACTION_TOOLTIPS } from "@/lib/copy";
import { toneOf } from "@/lib/source";
import type { DeckId, DeckState } from "@/state/store";
import { playToggleCommand, stopCommand } from "@/ui/actions";
import { Button } from "@/ui/components/button";
import { Toggle } from "@/ui/components/toggle";
import { ACTION_ICONS } from "@/ui/icons";
import { Says } from "@/ui/Says";

/**
 * The play button is one control sending one command — the same toggle Space sends, so the
 * pointer and the key can never disagree about what a press does. Stop is enabled by there being
 * a playhead to send home, which a held deck has as much as a playing one; stopping a stopped
 * deck is a no-op the control should not offer.
 *
 * Play and loop hold a state the deck already has, so they are Toggles and report it as
 * `aria-pressed`; stop and crop happen once per press and are Buttons (P25). Both toggles are
 * *controlled by the session*: `pressed` is read off the deck and the change handler sends the
 * ordinary command, so the control can never hold an opinion the instrument does not share.
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
  // Play and stop come from src/ui/actions.ts: the Space key and the palette send the same two
  // constructions, so no two surfaces can disagree about what the gesture means (P41).
  const onPlayToggle = useCallback(() => {
    instrument.send(playToggleCommand(deck));
  }, [instrument, deck]);
  const onStop = useCallback(() => {
    instrument.send(stopCommand(deck));
  }, [instrument, deck]);
  const onLoop = useCallback(() => {
    instrument.send({ t: "deck.loop.toggle", deck });
  }, [instrument, deck]);
  // The id the new bytes will live under is minted here, at the gesture, for the reason every
  // other durable id is: the command carries it, so what the log recorded is what a replay makes.
  const onCrop = useCallback(() => {
    instrument.send({ t: "deck.crop", deck, id: crypto.randomUUID() });
  }, [instrument, deck]);
  // The same mint for the same reason: the blob a flatten is about to render lives under the id
  // the command carries, so the log says which bytes this press made (0029, 0112).
  const onFlatten = useCallback(() => {
    instrument.send({ t: "deck.flatten", deck, id: crypto.randomUUID() });
  }, [instrument, deck]);
  const looping = state.loop !== null;
  /**
   * A tone is always looped, so there is no state for a toggle to move: the control is withdrawn
   * the way its handles and its Shift sweep are, and the reducer refuses a clear that reaches it
   * any other way (0110).
   */
  const unloopable = toneOf(state.source) !== null;
  const PlayIcon = state.playing ? ACTION_ICONS.pause : ACTION_ICONS.play;

  return (
    // Wrapped: five controls no longer fit the narrowest shell in one row, and a transport that
    // pushes the page sideways is worse than one that takes two lines (P46).
    <div className="flex flex-wrap gap-2">
      {/* Every one of the five says what it does after a rest, through the same words its action
          is filed under in the vocabulary — the word beside the icon names the gesture, the
          sentence says what the gesture costs (0055, P65). */}
      <Says what={state.playing ? ACTION_TOOLTIPS.pause : ACTION_TOOLTIPS.play}>
        <Toggle
          size="sm"
          variant="outline"
          pressed={state.playing}
          onPressedChange={onPlayToggle}
          disabled={state.duration === 0}
        >
          <PlayIcon data-icon="inline-start" />
          {state.playing ? "Pause" : "Play"}
        </Toggle>
      </Says>
      <Says what={ACTION_TOOLTIPS.stop}>
        <Button
          size="sm"
          variant="outline"
          onClick={onStop}
          disabled={!state.playing && state.paused === null}
        >
          <ACTION_ICONS.stop data-icon="inline-start" />
          Stop
        </Button>
      </Says>
      {!unloopable && (
        <Says what={ACTION_TOOLTIPS.loop}>
          <Toggle
            size="sm"
            variant="outline"
            pressed={looping}
            onPressedChange={onLoop}
            disabled={state.duration === 0}
          >
            <ACTION_ICONS.loop data-icon="inline-start" />
            Loop
          </Toggle>
        </Says>
      )}
      <Says what={ACTION_TOOLTIPS.crop}>
        <Button size="sm" variant="outline" onClick={onCrop} disabled={!looping}>
          <ACTION_ICONS.crop data-icon="inline-start" />
          Crop
        </Button>
      </Says>
      <Says what={ACTION_TOOLTIPS.flatten}>
        <Button size="sm" variant="outline" onClick={onFlatten} disabled={!looping}>
          <ACTION_ICONS.flatten data-icon="inline-start" />
          Flatten
        </Button>
      </Says>
    </div>
  );
}
