/**
 * @role One deck's mulcher as a full-width card of the rack: a heading that folds it, carrying the
 *   seed it draws from and — at its right-hand end — the switch that holds the pattern, and under
 *   the fold four bordered boxes of the amounts it walks and clocks itself with, drawn whether or
 *   not the switch is on — one `deck.player` command per gesture, carrying the whole spec (0089,
 *   0107, 0173).
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
  PLAYER_GROUP_LABELS,
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
import { PlayerGroup } from "@/ui/PlayerGroup";
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
 * What the card's body is drawn from while the switch is off, and the whole of what "off" costs
 * it: the switch's own values, painted greyed and unturnable rather than left off the page (0173).
 * A refused control is what 0121 asks for everywhere else — a person can read what the module
 * offers, and at what settings it would start, before turning it on. The seed is the one number
 * this cannot invent, so it is 0 here and read out only where there is a real one. Declared once,
 * outside any render: it is handed to every control on the card, and a spec minted in the render
 * would be a new prop on each of them every time anything on this yard changed.
 */
const OFF_SPEC: PlayerSpec = { seed: 0, ...PLAYER_DEFAULTS };

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
      // Opened as well as turned on: a module just switched on is one a hand is about to reach
      // into, and it may be standing folded from whenever it was last put away. P82's reason —
      // that the fold would otherwise swallow the switch and the focus on it — is spent: the
      // switch is on the heading now and a fold reaches neither (0173).
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
  const off = player === null;
  const painted = player ?? OFF_SPEC;
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
  /**
   * What every control on the card is handed, built once: the spec they read and patch, what they
   * snap back to, whether they are refused, and the voice a song paints them with. Fourteen
   * controls spelling out the same four props was fourteen places for the next card-wide flag to
   * be forgotten at — and a control drawn while the switch is off that did not get `disabled` is
   * one whose gestures reach `patch`'s own null guard and go nowhere, silently (principle 1).
   */
  const dialled = { player: painted, defaults: PLAYER_DEFAULTS, patch, disabled: off, ...voiced };
  /** The same, and the yard a door names its own popover after. */
  const doored = { deck, ...dialled };

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
          stands outside the card, the way the rack's section heading does (0106, P98). The switch
          stands at its right-hand end, because this card's heading is not in the card and the one
          control that silences the module may not go away with the body it silences (0107 amended,
          0173). The fold is always offered: the dials are drawn whether or not the switch is on,
          so there is always something under it to put away. */}
      <div data-slot="player-heading" className="flex w-full items-center gap-2">
        <Says what={ACTION_TOOLTIPS.collapse}>
          <Toggle
            size="sm"
            className="-ml-2.5 text-muted-foreground"
            pressed={folded}
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
        {/* Holding a pattern is a state the yard is left in and it is on or it is off, which is
            what a Switch is (0055) — and it stands at the right-hand end of the heading rather
            than in the card's action corner, which is where P87 put it and where every effect
            card's still is. The argument is the one P98 left standing: this card's heading is not
            in the card, and a folded card is now its heading and nothing else, so a switch in the
            corner would be a durable control a view preference could put away (0107 amended,
            0173). Everything else 0107 settled holds — folding says nothing to the instrument, and
            the switch is reachable in every state the card has. */}
        <Says what={PLAYER_TOOLTIP}>
          <Switch
            size="sm"
            className="ml-auto"
            checked={player !== null}
            aria-label={`Enable ${PLAYER_LABEL} on ${yardLabel(deck)}`}
            onCheckedChange={onSwitch}
          />
        </Says>
      </div>
      {/* A folded card is its heading and nothing else: no frame, no header, none of the corner's
          actions. What a fold puts away is the module, and a border with an empty header inside it
          is a card still claiming the room the fold was pressed to give back (0107 amended, 0173).
          The switch and the seed stand above this, on the heading, so nothing durable goes away
          with the body. */}
      {folded ? null : (
        <Card size="sm" className="w-full">
          <CardHeader>
            {/* Both gestures that set the whole spec at once stand together in the card's own
                corner: a character draws every dial and a reseed draws the number they all unfold
                from, so a hand reaching for "make this sound different" finds the two of them in
                one place (0152, P98). Refused rather than absent while the switch is off, the way
                the dials under them are — a corner that empties itself is a header that changes
                shape for a state it is already reporting (0121, 0173). */}
            <CardAction className="flex items-center gap-1">
              {/* Keyed on whether there is a spec at all, which is the one thing that must reset
                  it: the menu holds which name was last pressed, the draw under it and how far in
                  it went — none of it durable, all of it about a pattern that is gone the moment
                  the switch clears one. The unmount this key stands in for is what used to do it,
                  and drawing the door refused rather than absent took that away (0152, 0173). */}
              <PlayerCharacter
                key={off ? "off" : "on"}
                deck={deck}
                player={painted}
                patch={patch}
                disabled={off}
              />
              <Says what={ACTION_TOOLTIPS.reseed}>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  disabled={off}
                  aria-label={`${RESEED_LABEL} ${PLAYER_LABEL} on ${yardLabel(deck)}`}
                  onClick={onReseed}
                >
                  <ACTION_ICONS.reseed />
                </Button>
              </Says>
            </CardAction>
          </CardHeader>
          <CardContent className="flex w-full flex-col items-start gap-2">
            {/* Four boxes rather than one row: fourteen controls at one distance from each other
                are fourteen things to read, and an amount behind a framed plus on such a row is
                unfindable by anyone who does not already know it is there (0173). Each box says
                which question its dials answer, and a box of more than two stands two deep, so
                what reflows with the window is four blocks rather than fourteen controls. The
                boxes first and then the arrangement they are a distance from under them: a song is
                the one thing on this card that changes what every one of these means, so it is a
                section of the card and not a door in its corner (0107, 0157). */}
            <div className="flex w-full flex-wrap items-start gap-2">
              <PlayerGroup label={PLAYER_GROUP_LABELS.landing}>
                {/* Every dial at the rack's own size, saying what it is and in what unit — so the
                two line boxes a caption spends are spent here too and a row holding this card
                measures one height (0093, P65). The lean the walk had as a pair of buttons is one
                of the three amounts behind this dial's own marker: which way a jump goes is an
                amount of the same draw the distance bounds, and a spec saying it twice would be
                one instruction from two fields (0124, 0162). */}
                <PlayerDistance {...doored} />
                {/* The figure the pattern lays down and plays back, beside the Distance that draws
                it: both are about where a landing reads from, and the three amounts saying what
                becomes of a figure sit behind this dial's own marker (0124, 0151). */}
                <PlayerPhrase {...doored} />
              </PlayerGroup>
              {/* What a landing does with the slot it has been given, which is everything that
                  moves nothing the landing after it stands on: the gate that cuts inside a repeat,
                  the hole that never opens (P118), which way it reads (P121), the spark it throws,
                  how loud that is and how far into the landing it begins (P123, 0175), and the
                  ladder its rate climbs (0118, 0167). */}
              <PlayerGroup label={PLAYER_GROUP_LABELS.sound}>
                {/* In the order a box two deep reads them: a column is a pair. The gate over the
                    hole — the two that take sound away without moving anything (P118) — the spark
                    over how loud it is, its delay under those two (P123, 0175), and which way the
                    landing reads over the ladder its rate climbs (P121, 0167). The spark's third
                    amount is the one that leaves a cell of this box empty, and it is on the row
                    rather than behind the Spark dial's own marker for the reason the level is: it
                    shapes no draw, and 0124 puts behind a marker only the amounts that shape the
                    draw the dial above them bounds. */}
                <PlayerDial knob="gate" {...dialled} />
                <PlayerDial knob="drop" {...dialled} />
                <PlayerDial knob="spark" {...dialled} />
                <PlayerDial knob="sparkLevel" {...dialled} />
                <PlayerDial knob="sparkDelay" {...dialled} />
                <PlayerDial knob="reverse" {...dialled} />
                <PlayerRate {...doored} />
              </PlayerGroup>
              {/* When the next one comes, and how long this one lasts: the repeats a landing is
                  cut into, the burst it fills, how far that varies and the wait placed or rolled
                  between two of them (0119, 0135, 0163). */}
              <PlayerGroup label={PLAYER_GROUP_LABELS.timing}>
                {/* A column is a pair here too: the burst over how far it varies, and the repeats
                    one landing is cut into over the waits between two of them. The burst is drawn
                    on a log curve and read in two units, both of which are the knob's own
                    declaration rather than this card's — the only dial here whose range spans
                    three orders of magnitude (src/lib/playerKnobs.ts). */}
                <PlayerDial knob="burst" {...dialled} />
                <PlayerVary {...doored} />
                <PlayerRepeats {...doored} />
                <PlayerRest {...doored} />
              </PlayerGroup>
              {/* Its own box and immediately above the section it fills: the arrangement the
                  pattern draws for itself, with the three amounts saying what becomes of one
                  behind this dial's own marker — the Phrase door said in parts and rounds instead
                  of slots and passes (0124, 0151, 0158). */}
              <PlayerGroup label={PLAYER_GROUP_LABELS.arrange}>
                <PlayerArrange {...doored} />
              </PlayerGroup>
            </div>
            {/* The one part of the body that is drawn only with a spec, and it is not a dial: the
                section is a list a hand adds to, reorders and removes from, and a disabled Add
                Part is a gesture with nothing to add a part to. What it would say while the switch
                is off is what the empty-song sentence already says (0157, 0158, 0173). */}
            {player !== null && (
              <PlayerSong
                instrument={instrument}
                deck={deck}
                player={player}
                playing={state.playing}
                patch={patch}
                fold={songFold}
              />
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
