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
import { useCallback, useMemo } from "react";

import type { Instrument } from "@/app/facade";
import {
  partVoice,
  PLAYER_PART_KNOBS,
  PLAYER_SEED_MAX,
  type PlayerKnob,
  type PlayerSpec,
} from "@/lib/player";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import { songIsDrawn, songIsPlayed, type SongPartId } from "@/lib/playerSong";
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
import { voiceProps } from "@/ui/PlayerDial";
import { playerDials } from "@/ui/PlayerDials";
import { PlayerGroup } from "@/ui/PlayerGroup";
import { PlayerSong } from "@/ui/PlayerSong";
import { PlayerStanding } from "@/ui/PlayerStanding";
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
  songSelect,
  songOpen,
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
  /** Which part of the song this card's dials are pointed at, held by the yard for the reason both
   *  folds are: it is state about a card that a fold may put away, and a view preference either
   *  way — no command, nothing durable, no history entry (plan §2, 0176). */
  songSelect: [selected: SongPartId | null, setSelected: (selected: SongPartId | null) => void];
  /** And which part has its own dials open under it, held by the yard for the reason the selection
   *  is: a fold that reopened a part shut is the bug those lines are written against (0176). */
  songOpen: [open: SongPartId | null, setOpen: (open: SongPartId | null) => void];
}) {
  const [folded, setFolded] = fold;
  const [selected] = songSelect;
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

  /**
   * Which part the dials are pointed at, or none at all. Two things make it none, and both are the
   * list rather than the id: a selection naming a part the song no longer holds, since the id is
   * view state and the list is durable, and a pattern drawing its own arrangement, since the
   * written list is then held and not played — the Select toggle goes with the rows, so a
   * selection outliving it would be a card pointed at a part no gesture on screen could take it
   * off (0158, 0176, src/ui/PlayerSong.tsx).
   */
  const part =
    player === null || songIsDrawn(player)
      ? undefined
      : player.song.find((held) => held.id === selected);
  /**
   * And what a dial writes, which is the selection when there is one: a knob a part carries goes
   * into that part, and everything else — the four the song itself is drawn by, the seed, the list
   * — goes into the spec, so one patch answers for both and no control has to know which it is
   * turning (0176). That is the second half of 0157 reversed: a dial used to patch the pattern the
   * parts were a distance from whatever was standing, and now it patches what a hand pointed it at.
   */
  const dialPatch = useCallback(
    (fields: Partial<PlayerSpec>) => {
      if (player === null) return;
      if (part === undefined) {
        send({ ...player, ...fields });
        return;
      }
      const spread: Partial<PlayerSpec> = { ...fields };
      for (const knob of PLAYER_PART_KNOBS) delete spread[knob];
      send({
        ...player,
        ...spread,
        song: player.song.map((entry) =>
          entry.id === part.id
            ? { ...entry, voice: partVoice({ ...entry.voice, ...fields }) }
            : entry,
        ),
      });
    },
    [player, send, part],
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
  /**
   * What every dial reads: the card's own spec, with the selected part's numbers laid over it. The
   * four the song is drawn by are not among a part's, so the Arrange box goes on reading and
   * writing the card's own however a hand is pointed (0158, 0176).
   */
  const painted: PlayerSpec = useMemo(
    () => (player === null ? OFF_SPEC : part === undefined ? player : { ...player, ...part.voice }),
    [player, part],
  );
  /** And what Add Part captures, which is those same dials said as a part carries them (0176).
   *  Memoised beside the spec it is read off for the reason that one is: it is handed straight to
   *  a component as a prop, and a new object per render is a new prop per render. */
  const captured = useMemo(() => partVoice(painted), [painted]);
  if (state.loop === null && player === null) return null;
  /**
   * Whether an arrangement is playing at all, whoever wrote it: parts a hand typed, or an
   * `arrange` above zero, which is the whole of "the pattern is drawing its own" (0158). The one
   * question the three surfaces below ask, so it is asked once (principle 1).
   */
  const off = player === null;
  const arranged = player !== null && (songIsDrawn(player) || songIsPlayed(player.song));
  // The dials paint the voice exactly while one could be standing: a song is arranged and the deck
  // is playing. Turning one of them still patches the spec the parts are a distance from — a song
  // never becomes an edit of the part standing (0153, 0157).
  // …and not while a hand is pointed at a part: the dials are then that part's own numbers, which
  // are a thing a hand set rather than a thing the walk is reading, and a live paint over them
  // would be the card showing two answers at once (0176).
  const voiced = voiceProps(arranged && state.playing && part === undefined ? voice : undefined);
  /**
   * What every control on the card is handed, built once: the spec they read and patch, what they
   * snap back to, whether they are refused, and the voice a song paints them with. Fourteen
   * controls spelling out the same four props was fourteen places for the next card-wide flag to
   * be forgotten at — and a control drawn while the switch is off that did not get `disabled` is
   * one whose gestures reach `patch`'s own null guard and go nowhere, silently (principle 1).
   */
  const dialled = {
    // The card's own, so its dials are named by their captions and its doors by the yard alone: a
    // part's fold is what names a second set of them (0176, src/ui/PlayerPart.tsx).
    named: "",
    player: painted,
    defaults: PLAYER_DEFAULTS,
    patch: dialPatch,
    disabled: off,
    // Every dial the selection reaches wears its mark, in the ink the selected row wears and never
    // the one a standing part paints with: a dial standing somewhere the hand did not leave it must
    // never read as one the hand moved, and neither must the reverse (0157, 0176).
    selected: part !== undefined,
    ...voiced,
  };
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
              {/* Pointed where the dials are: a character press is one way of filling a part's
                  spec, and while a part is selected it fills that part rather than the pattern
                  (0152, 0176). */}
              <PlayerCharacter
                key={off ? "off" : "on"}
                deck={deck}
                player={painted}
                patch={dialPatch}
                selected={part !== undefined}
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
              {/* The three boxes a part carries the numbers of, written once and drawn here and
                  under a part's own fold: a hand editing a part is reaching for the same dials in
                  the same order it reaches for on the card, and two copies of them would be two
                  cards to keep in step (principle 1, 0176, src/ui/PlayerDials.tsx). Called rather
                  than mounted, because what they are is the boxes and not a thing that owns them. */}
              {playerDials(doored)}
              {/* Its own box and immediately above the section it fills: the arrangement the
                  pattern draws for itself, with the three amounts saying what becomes of one
                  behind this dial's own marker — the Phrase door said in parts and rounds instead
                  of slots and passes (0124, 0151, 0158). */}
              <PlayerGroup label={PLAYER_GROUP_LABELS.arrange}>
                {/* The one box a selection does not reach: the four amounts here are the song's
                    own, so they read and write the card's spec whatever a hand is pointed at, and
                    they wear no mark saying otherwise (0158, 0176). */}
                <PlayerArrange {...doored} patch={patch} selected={false} />
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
                voice={captured}
                patch={patch}
                fold={songFold}
                select={songSelect}
                open={songOpen}
              />
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
