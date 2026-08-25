/**
 * @role One deck's jumps as a full-width card of the rack: a heading that folds it, the switch
 *   that holds the pattern in the corner every card's switch is in, and under the fold the
 *   amounts it walks and clocks itself with, and the seed it draws
 *   from — one `deck.player` command per gesture, carrying the whole spec (0089, 0107, P87).
 * @instead What a step becomes in sound → src/audio/deck.ts. What a seed unfolds into →
 *   src/lib/player.ts. Nothing here draws a pattern; it only says which one the deck holds.
 */
// Over the cap, and everything over it is either a word this card says or a control it says it
// with: the card's own primitives and the registry-free knobs. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
// And over the line cap by the same arithmetic: this card draws one control per number the module
// declares, so its length is the size of that vocabulary rather than a judgement of its own — P118
// gave a landing a hole and the row grew a dial. Splitting it would name half a card.
// oxlint-disable max-lines
import { useCallback } from "react";

import type { Instrument } from "@/app/facade";
import { PLAYER_SEED_MAX, type PlayerKnob, type PlayerSpec } from "@/lib/player";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import { songIsDrawn } from "@/lib/playerSong";
import {
  ACTION_TOOLTIPS,
  PLAYER_LABEL,
  PLAYER_SONG_LABEL,
  PLAYER_TOOLTIP,
  RESEED_LABEL,
  SEED_LABEL,
  songLabel,
  yardLabel,
} from "@/lib/copy";
import type { DeckId, DeckState } from "@/state/store";
import { Button } from "@/ui/components/button";
import { Card, CardAction, CardContent, CardHeader } from "@/ui/components/card";
import { Switch } from "@/ui/components/switch";
import { Toggle } from "@/ui/components/toggle";
import { ACTION_ICONS } from "@/ui/icons";
import { PlayerArrange } from "@/ui/PlayerArrange";
import { PlayerCharacter } from "@/ui/PlayerCharacter";
import { PlayerDial, voiceProps } from "@/ui/PlayerDial";
import { PlayerDistance } from "@/ui/PlayerDistance";
import { PlayerPhrase } from "@/ui/PlayerPhrase";
import { PlayerRate } from "@/ui/PlayerRate";
import { PlayerRepeats } from "@/ui/PlayerRepeats";
import { PlayerRest } from "@/ui/PlayerRest";
import { PlayerSong } from "@/ui/PlayerSong";
import { PlayerStanding } from "@/ui/PlayerStanding";
import { PlayerVary } from "@/ui/PlayerVary";
import { Says } from "@/ui/Says";
import { FoldCaret } from "@/ui/FoldCaret";
// oxlint-enable import/max-dependencies

/**
 * A seed, drawn once, at the gesture that asks for one. `Math.random()` is exactly right here and
 * exactly wrong a layer down: this runs on a click and its result travels in the command, so the
 * session that was recorded is the session that replays. Nothing on a play-time or render path
 * draws anything (0089, 0068).
 */
const mintSeed = (): number => Math.floor(Math.random() * (PLAYER_SEED_MAX + 1));

/**
 * Controlled by the session throughout: every control reads the deck's own `player` and every
 * gesture sends the whole spec back, so no control can hold an opinion the instrument does not
 * share.
 *
 * A deck with no loop has nowhere to jump, so there is nothing to offer — unless it is already
 * holding a pattern, which a cleared loop leaves durably in place (0089). Hiding that one would
 * make a spec that is saved, archived and captured into every clip, and that silently starts
 * jumping again the moment a loop is set, unreachable by the only control that can clear it.
 */
// One callback per field, and the length is how many fields the module declares rather than how
// much this component decides. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function PlayerCard({
  instrument,
  deck,
  state,
  fold,
  songFold,
}: {
  instrument: Instrument;
  deck: DeckId;
  state: DeckState;
  /**
   * Whether this card is folded shut, and the call that changes it — held by the yard rather than
   * here, for the reason the rack's own fold is (src/ui/EffectRack.tsx). A view preference either
   * way: no command, nothing durable, no history entry (plan §2). It is a separate thing from the
   * switch beside it, which is durable and re-arms the transport: folding must never be a way of
   * silencing this, and silencing it must never be the only way of putting it away (0107, P87).
   */
  fold: [folded: boolean, setFolded: (folded: boolean) => void];
  /** The song section's own fold, held by the yard for the same reason this card's is: it is
   *  drawn under this fold, and state living here would be thrown away every time that one is
   *  used (0157, src/ui/EffectRack.tsx). */
  songFold: [folded: boolean, setFolded: (folded: boolean) => void];
}) {
  const [folded, setFolded] = fold;
  const player = state.player;
  const send = useCallback(
    (next: PlayerSpec | null) => {
      instrument.send({ t: "deck.player", deck, player: next });
    },
    [instrument, deck],
  );
  const patch = useCallback(
    (fields: Partial<PlayerSpec>) => {
      if (player === null) return;
      send({ ...player, ...fields });
    },
    [player, send],
  );

  const onSwitch = useCallback(
    (pressed: boolean) => {
      // Opened as well as turned on: the fold is what the switch would otherwise be swallowed by
      // the moment a pattern exists for it to hide, taking the focus that just pressed it with it
      // and leaving a module nobody asked to put away (P82).
      if (pressed) setFolded(false);
      send(pressed ? { seed: mintSeed(), ...PLAYER_DEFAULTS } : null);
    },
    [send, setFolded],
  );
  const onReseed = useCallback(() => {
    patch({ seed: mintSeed() });
  }, [patch]);
  /**
   * What the pattern is standing at, one knob at a time — the peek this card's dials paint from
   * while a song plays. Built here rather than in each dial so the per-frame read is asked for
   * once per card, and handed over only while there is a song to override anything: a card with
   * none registers no frame callback at all (0035, 0157).
   */
  const voice = useCallback(
    (knob: PlayerKnob): number | null => instrument.peek(deck).player.voice?.[knob] ?? null,
    [instrument, deck],
  );
  if (state.loop === null && player === null) return null;
  /**
   * Whether an arrangement is playing at all, whoever wrote it: parts a hand typed, or an
   * `arrange` above zero, which is the whole of "the pattern is drawing its own" (0158). The one
   * question the three surfaces below ask, so it is asked once (principle 1).
   */
  const arranged = player !== null && (songIsDrawn(player) || player.song.length > 0);
  // The dials paint the voice exactly while one could be standing: a song is arranged and the deck
  // is playing. Turning one of them still patches the spec the parts are a distance from — a song
  // never becomes an edit of the part standing (0153, 0157).
  const voiced = voiceProps(arranged && state.playing ? voice : undefined);

  return (
    // Below the drift and above the rack, because what it moves is where inside the loop the deck
    // is reading — the transport's, never an effect's (0089) — and drawn as one of the cards under
    // it rather than as a bare section beside them: a module with knobs is a card, and this one is
    // full width because its row of dials is (0030, 0107, P87).
    <section
      className="flex w-full flex-col items-start gap-2"
      aria-label={`${yardLabel(deck)} ${PLAYER_LABEL}`}
    >
      {/* The heading is the fold, the word inside the control and the caret beside it — and it
          stands outside the card, the way the rack's section heading does (0106, P98). What
          0107 settled is untouched by the move: the switch stays in the card's own corner, and
          only the heading leaves. The fold is refused while there is no pattern, because there is
          then nothing under it to put away. */}
      <div className="flex items-center gap-2">
        <Says what={ACTION_TOOLTIPS.collapse}>
          <Toggle
            size="sm"
            className="-ml-2.5 text-muted-foreground"
            // What is actually drawn, not what is remembered: a fold left pressed by a pattern
            // something else cleared has nothing under it, and a caret turned over an open body
            // is a heading saying the opposite of what the eye reads.
            pressed={folded && player !== null}
            // Nothing under it to fold while the switch is off: the card is then its own corner
            // and the switch in it, so the fold is offered but cannot be pressed into doing
            // nothing.
            disabled={player === null}
            onPressedChange={setFolded}
          >
            <span className="type-eyebrow">{PLAYER_LABEL}</span>
            <FoldCaret />
          </Toggle>
        </Says>
        {/* The one number the whole pattern unfolds from, beside the word it belongs to and
            outside the fold: a performance is reproducible by that number, so reading it may not
            cost opening anything (0089, P98). */}
        {player !== null && (
          <span className="type-readout text-muted-foreground">{`${SEED_LABEL} ${player.seed}`}</span>
        )}
        {/* And what it is arranged as, beside that number and on the same terms: a song is parts
            in an order, so the order is the thing to read, and it is legible without opening the
            menu that edits it (0153, P98). */}
        {/* The written list only, and only while it is the one being walked: an arrangement the
            pattern drew is a run that moves as it plays, so it is read in the section that shows
            its parts and never as a line of text that would be stale by the next round (0158). */}
        {player !== null && !songIsDrawn(player) && player.song.length > 0 && (
          <span className="type-readout text-muted-foreground">
            {`${PLAYER_SONG_LABEL} ${songLabel(player.song)}`}
          </span>
        )}
        {/* And which of those parts is playing, beside the arrangement it is a part of: a song
            changes what every dial on this card means, so what it is doing is read where the
            pattern's other one-line facts are (0157). */}
        {arranged && <PlayerStanding instrument={instrument} deck={deck} playing={state.playing} />}
      </div>
      <Card size="sm" className="w-full">
        <CardHeader>
          {/* Holding a pattern is a state the yard is left in and it is on or it is off, which is
            what a Switch is — and it stands in the card's top right corner, where every other
            card's does, because a person looking for what silences a card looks in one place
            (0055, 0107, P87). Above the fold rather than under it: folding is a view preference
            and must never be the only way to reach the durable switch, which is what putting it
            under the fold made it whenever the fold could not be opened. Drawing a new seed sits
            immediately left of it, in the corner rather than at the end of the dials, because it
            is about the number the heading now reads out rather than about any one of them
            (P98). */}
          <CardAction className="flex items-center gap-1">
            {/* Both gestures that set the whole spec at once stand together, left of the switch
                and outside the fold: a character draws every dial and a reseed draws the number
                they all unfold from, so a hand reaching for "make this sound different" finds the
                two of them in one corner (0152, P98). */}
            {player !== null && <PlayerCharacter deck={deck} player={player} patch={patch} />}
            {player !== null && (
              <Says what={ACTION_TOOLTIPS.reseed}>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`${RESEED_LABEL} ${PLAYER_LABEL} on ${yardLabel(deck)}`}
                  onClick={onReseed}
                >
                  <ACTION_ICONS.reseed />
                </Button>
              </Says>
            )}
            <Says what={PLAYER_TOOLTIP}>
              <Switch
                size="sm"
                checked={player !== null}
                aria-label={`Enable ${PLAYER_LABEL} on ${yardLabel(deck)}`}
                onCheckedChange={onSwitch}
              />
            </Says>
          </CardAction>
        </CardHeader>
        {player === null || folded ? null : (
          <CardContent className="flex w-full flex-col items-start gap-2">
            {/* The dials first, then the arrangement they are a distance from under them: a song
                is the one thing on this card that changes what every one of these means, so it is
                a section of the card and not a door in its corner (0107, 0157). */}
            <div className="flex w-full flex-wrap items-end gap-2">
              {/* Every dial at the rack's own size, saying what it is and in what unit — so the two
              line boxes a caption spends are spent here too and a row holding this card measures
              one height (0093, P65). The lean the walk had as a pair of buttons is one of the three
              amounts behind this dial's own marker now: which way a jump goes is an amount of the
              same draw the distance bounds, and a spec saying it twice would be one instruction
              from two fields (0124, 0162). */}
              <PlayerDistance
                deck={deck}
                player={player}
                defaults={PLAYER_DEFAULTS}
                patch={patch}
                {...voiced}
              />
              {/* The figure the pattern lays down and plays back, beside the Distance that draws it:
              both are about where a landing reads from, and the three amounts saying what becomes of
              a figure sit behind this dial's own marker rather than on the row (0124, 0151). */}
              <PlayerPhrase
                deck={deck}
                player={player}
                defaults={PLAYER_DEFAULTS}
                patch={patch}
                {...voiced}
              />
              <PlayerRepeats
                deck={deck}
                player={player}
                defaults={PLAYER_DEFAULTS}
                patch={patch}
                {...voiced}
              />
              <PlayerDial
                knob="gate"
                player={player}
                defaults={PLAYER_DEFAULTS}
                patch={patch}
                {...voiced}
              />
              {/* The hole, beside the gate that cuts inside a repeat: the two knobs that take sound
              away without moving anything, and the only two. It is on the row rather than behind a
              framed plus because it shapes no drawn number — 0124 puts an amount behind the dial
              whose draw it shapes, and a drop shapes the landing itself (P118). */}
              <PlayerDial
                knob="drop"
                player={player}
                defaults={PLAYER_DEFAULTS}
                patch={patch}
                {...voiced}
              />
              {/* Drawn on a log curve and read in two units, both of which are the knob's own
              declaration rather than this card's: the only dial here whose range spans three
              orders of magnitude (src/lib/playerKnobs.ts). */}
              <PlayerDial
                knob="burst"
                player={player}
                defaults={PLAYER_DEFAULTS}
                patch={patch}
                {...voiced}
              />
              {/* The other three dials that draw a number rather than hold one — the Repeats above is
              the fourth — each with the amounts that shape its draw behind the marker at its
              corner rather than as eight more dials on the row (0118, P87, 0135). */}
              <PlayerVary
                deck={deck}
                player={player}
                defaults={PLAYER_DEFAULTS}
                patch={patch}
                {...voiced}
              />
              <PlayerRest
                deck={deck}
                player={player}
                defaults={PLAYER_DEFAULTS}
                patch={patch}
                {...voiced}
              />
              <PlayerRate
                deck={deck}
                player={player}
                defaults={PLAYER_DEFAULTS}
                patch={patch}
                {...voiced}
              />
              {/* Last on the row and immediately above the section it fills: the arrangement the
              pattern draws for itself, with the three amounts saying what becomes of one behind
              this dial's own marker rather than on the row — the Phrase door said in parts and
              rounds instead of slots and passes (0124, 0151, 0158). */}
              <PlayerArrange
                deck={deck}
                player={player}
                defaults={PLAYER_DEFAULTS}
                patch={patch}
                {...voiced}
              />
            </div>
            <PlayerSong
              instrument={instrument}
              deck={deck}
              player={player}
              playing={state.playing}
              patch={patch}
              fold={songFold}
            />
          </CardContent>
        )}
      </Card>
    </section>
  );
}
