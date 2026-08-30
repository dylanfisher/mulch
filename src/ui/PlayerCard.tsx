/**
 * @role One deck's mulcher as a full-width card of the rack: a heading that folds it, carrying the
 *   seed it draws from and — at its right-hand end — the switch that holds the pattern, and under
 *   the fold the front, then the fine tune's own fold of bordered boxes and the ground's and the
 *   arrangement's folds beside it, all of the amounts it walks and clocks itself with drawn whether or
 *   not the switch is on — one `deck.player` command per gesture, carrying the whole spec (0089,
 *   0107, 0173).
 * @instead What a step becomes in sound → src/audio/deck.ts. What a seed unfolds into →
 *   src/lib/player.ts. Nothing here draws a pattern; it only says which one the deck holds.
 */
// Over the cap, and everything over it is either a word this card says or a control it says it
// with: the card's own primitives and the registry-free knobs, plus the runs its dials stand in
// (0195). See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
// And over the line cap by the same arithmetic: this card draws one control per number the module
// declares, so its length is the size of that vocabulary rather than a judgement of its own — P118
// gave a landing a hole and the row grew a dial, and 0195 put every amount the module has on the
// card at once. Splitting it would name half a card.
// oxlint-disable max-lines
import { useCallback, useMemo } from "react";
import type { ReactNode } from "react";

import type { Instrument } from "@/app/facade";
import {
  partVoice,
  PLAYER_PART_KNOBS,
  PLAYER_SEED_MAX,
  type PlayerKnob,
  type PlayerSpec,
} from "@/lib/player";
import { bedGround, type PlantedBed } from "@/lib/playerBed";
import { bedAt, plantBed } from "@/lib/playerGround";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import { albumsArePlayed, openIn, withAlbumsPart } from "@/lib/playerAlbum";
import { albumsLabel, PLAYER_ALBUMS_LABEL } from "@/lib/copyAlbum";
import { songIsDrawn, type SongPartId } from "@/lib/playerSong";
import {
  ACTION_TOOLTIPS,
  PLAYER_GROUP_LABELS,
  PLAYER_LABEL,
  PLANT_LABEL,
  PLAYER_TOOLTIP,
  RESEED_LABEL,
  SEED_LABEL,
  yardLabel,
} from "@/lib/copy";
import type { DeckId, DeckState } from "@/state/store";
import { Button } from "@/ui/components/button";
import { Card, CardContent } from "@/ui/components/card";
import { Switch } from "@/ui/components/switch";
import { Toggle } from "@/ui/components/toggle";
import { ACTION_ICONS } from "@/ui/icons";
import { PlayerArrange } from "@/ui/PlayerArrange";
import { PlayerBed } from "@/ui/PlayerBed";
import { PlayerFront } from "@/ui/PlayerFront";
import { PlayerDial, voiceProps } from "@/ui/PlayerDial";
import { playerDials } from "@/ui/PlayerDials";
import { PLAYER_GROUND_TOOLTIP } from "@/lib/copyGround";
import { PLAYER_FINE_LABEL } from "@/lib/copyCard";
import { PlayerBeds } from "@/ui/PlayerBeds";
import { PlayerGround } from "@/ui/PlayerGround";
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
 * One of the card's three folds as its own eyebrow: the word inside the control and the caret
 * beside it, with the sentence that fold carries on the `Says` round it (0106). Written once and
 * called three times — the fine tune's, the ground's and the arrangement's are one control with
 * three words in it, and 0217 is the third of them (principle 3). Called rather than mounted, for
 * the reason `playerDials` is: what it is is the toggle, not a thing that owns one, and a
 * component here would put every fold's own handler a layer further from the card that reads them
 * (src/ui/PlayerDials.tsx, src/ui/PlayerCard.test.tsx). The argument *for* each fold stays where
 * the fold is drawn: it is about that register and not about this markup.
 */
const cardFold = (
  label: string,
  what: string,
  [shut, setShut]: [folded: boolean, setFolded: (folded: boolean) => void],
): ReactNode => (
  <Says what={what}>
    <Toggle
      size="sm"
      className="-ml-2.5 self-start text-muted-foreground"
      pressed={shut}
      onPressedChange={setShut}
    >
      <span className="type-eyebrow">{label}</span>
      <FoldCaret />
    </Toggle>
  </Says>
);

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
  fineFold,
  groundFold,
  arrangeFold,
  songFold,
  songSelect,
  songOpen,
  songSolo,
  albumOpen,
  songViewOpen,
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
  /**
   * The fine tune's own fold, held by the yard for the reason the song section's is: it is drawn
   * under this card's fold, and state living here would be thrown away every time that one is used
   * (0157, src/ui/EffectRack.tsx).
   *
   * It opens shut, which is 0198's amendment to 0197: the eyebrow that ranked the front above the
   * dials was drawn over forty controls that were still all on screen, so the rank was a word and
   * the page was still the field it was before. Nothing is *gated* by it — the caret is on the
   * heading, no gesture is behind a menu, and every number the module declares is one press away
   * (0195 holds).
   */
  fineFold: [folded: boolean, setFolded: (folded: boolean) => void];
  /**
   * The ground's own fold, held by the yard for the reason the fine tune's is. It is not one of
   * the fine tune's boxes either: the fine tune is where one of the dials a press on the front
   * already moved is moved on its own (0197), and the front moves no ground — what these numbers
   * move is the window the whole song is read through, and they are the song's and not a part's
   * (0183, 0184). So it stands beside that fold under a word of its own and no box, above the
   * arrangement's (0157, 0217).
   */
  groundFold: [folded: boolean, setFolded: (folded: boolean) => void];
  /**
   * The arrangement's own fold, held by the yard for the reason the fine tune's is. It is not one
   * of the fine tune's boxes and never was one: how a pattern is arranged is the thing that
   * changes what every dial under Fine Tune means, so it stands beside that fold rather than
   * inside it, under a word of its own and no box, immediately above the section it fills
   * (0157, 0200).
   */
  arrangeFold: [folded: boolean, setFolded: (folded: boolean) => void];
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
  /** And which part the pass is playing on its own, held by the yard on exactly those terms and
   *  read by two things here: the section that toggles it, and the picture, which draws the song
   *  being *heard* (0190, src/ui/PlayerScope.tsx). */
  songSolo: [solo: SongPartId | null, setSolo: (solo: SongPartId | null) => void];
  /** And which album, and which of its songs, the section's lists are a view onto — held by the
   *  yard on exactly those terms and for that reason (plan §2, P147). */
  albumOpen: [open: string | null, setOpen: (open: string | null) => void];
  songViewOpen: [open: string | null, setOpen: (open: string | null) => void];
}) {
  const [folded, setFolded] = fold;
  // Read here and set nowhere: each fold's own toggle is handed the whole tuple (`cardFold`), and
  // what the card itself needs is which half of the body to draw.
  const [fine] = fineFold;
  const [groundShut] = groundFold;
  // `arrangeShut` and not `arranged`: the card already reads whether the *pattern* is arranged a
  // few lines down, and one word for a fold and for a run of parts is the drift this file would
  // have to keep straight forever (principle 1).
  const [arrangeShut] = arrangeFold;
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
   * Which part the dials are pointed at, or none at all. Three things make it none, and every one
   * of them is the list rather than the id: a selection naming a part the song no longer holds,
   * since the id is view state and the list is durable; a pattern drawing its own arrangement,
   * since the written list is then held and not played; and a selection naming a part of a song
   * the section is not showing, since the Select toggle goes with the rows — a selection outliving
   * the rows would be a card pointed at a part no gesture on screen could take it off, which is
   * exactly what a second and a third tier made reachable (0158, 0176, P147,
   * src/ui/PlayerSong.tsx).
   *
   * So it is looked up in the open song alone and never flat across the spec, which is the same
   * run the section draws — one answer to "which part is a hand pointed at", read the one way
   * (principle 1, `openIn`).
   */
  const shown = openIn(openIn(player?.albums ?? [], albumOpen[0])?.songs ?? [], songViewOpen[0]);
  const part =
    player === null || songIsDrawn(player)
      ? undefined
      : shown?.parts.find((held) => held.id === selected);
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
        albums: withAlbumsPart(player.albums, part.id, (entry) => ({
          ...entry,
          voice: partVoice({ ...entry.voice, ...fields }),
        })),
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
  /**
   * The end of a gesture, on the card rather than on a dial, and for the reason the Escape above is
   * on the card: pointer events from every control inside it bubble here, and there is no one
   * control this belongs on — the card holds thirty-odd dials and each of them patches the same
   * `deck.player` (0089). It is what makes one dial's drag one history entry: every pointer move
   * of a drag commits a checkpoint under the deck's own gesture key, and this is the boundary that
   * closes it so the next dial opens an entry of its own rather than joining this one (0067,
   * `gestureOf` in src/app/history.ts).
   *
   * All three pointer endings, exactly as an automated knob answers them: a release, the lost
   * capture that release takes with it, and a cancel. `gesture.end` carries nothing and takes back
   * nothing, so the three arriving in any order — or a press on something that was never an edit —
   * closes a transaction that is already closed and costs a comparison (0072).
   *
   * Deliberately not on `keyup`: the fine drag is Shift-held, so a hand letting the modifier up
   * mid-drag would split that drag into two entries — the thing `ParameterKnob` keeps a
   * `dragging` ref to avoid, and this card has no such ref because it owns no gesture. A dial
   * nudged from the keyboard is left to `GESTURE_IDLE_MS`, which is the backstop it is for.
   */
  const onGestureEnd = useCallback(() => {
    instrument.send({ t: "gesture.end" });
  }, [instrument]);
  const onReseed = useCallback(() => {
    patch({ seed: mintSeed() });
  }, [patch]);
  /**
   * Plant: the bed the walk is standing on, written back as the deck's loop. An ordinary
   * `deck.loop` and nothing else — the same command the handles and the sweep send, so it undoes,
   * it persists and it archives without any surface learning a new kind of edit (0185).
   *
   * **It restarts the pass**, the way a drag on the handles does: `moveInPlace` refuses while a
   * player is held, so the deck starts again at the new loop and the walk opens from the top of
   * its seed (0089, src/audio/deck.ts). That is what a hand is allowed to cost and a clock is not,
   * which is the whole of 0183's distinction.
   *
   * The ground is read off the peek at the press and never off a prop, the way a capture reads the
   * session: where the walk is standing is a fact about the moment the hand went down, and a
   * pattern hands it over a frame at a time. A press with no pattern armed, or one standing on the
   * loop itself, is a gesture with nothing to do rather than a loop written over itself.
   */
  /**
   * Keep: the ground the walk is standing on, added to the grounds the song comes back to — the
   * gesture the Option press on the picture makes, said as a press for the hand that is listening
   * rather than looking (0194). One `deck.player` and nothing else, so it undoes, persists and
   * archives like every other edit on this card.
   *
   * The standing ground is read off the peek at the press, for the reason the plant below reads
   * it: where the walk is *now* is a fact about the moment the hand went down. It is rounded onto
   * the nearest bed by the one function a point on the picture is read by, because the crawl may
   * leave the ground between two of them and a kept ground is a bed (`bedAt`, 0185, 0194).
   */
  /** The kept row's own edits — a count stepped, or one let go. One `deck.player` carrying the
   *  whole spec, the way the written row's edits are sent by the part that owns them (0089). */
  const onBeds = useCallback(
    (beds: readonly PlantedBed[]) => {
      patch({ beds });
    },
    [patch],
  );
  const onKeep = useCallback(() => {
    const loop = state.loop;
    const bed = instrument.peek(deck).player.step?.bed;
    if (player === null || loop === null || bed === undefined) return;
    const span = loop.out - loop.in;
    const stood = bedGround(loop.in, span, state.duration, bed);
    const beds = plantBed(player.beds, bedAt(stood.in, loop.in, span));
    if (beds !== player.beds) patch({ beds });
  }, [instrument, deck, patch, player, state.loop, state.duration]);
  const onPlant = useCallback(() => {
    const loop = state.loop;
    const bed = instrument.peek(deck).player.step?.bed;
    if (loop === null || bed === undefined) return;
    const span = loop.out - loop.in;
    const stood = bedGround(loop.in, span, state.duration, bed);
    if (stood.on === 0) return;
    instrument.send({ t: "deck.loop", deck, in: stood.in, out: stood.in + span });
  }, [instrument, deck, state.loop, state.duration]);
  /**
   * What the pattern is standing at, one knob at a time — the peek this card's dials paint from
   * while a song plays. Built here rather than in each dial so the per-frame read is asked for
   * once per card, and handed over only while there is a song to override anything: a card with
   * none registers no frame callback at all (0035, 0157).
   */
  const voice = useCallback(
    (knob: PlayerKnob): number | null => instrument.peek(deck).player.step?.voice?.[knob] ?? null,
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
  const arranged = player !== null && (songIsDrawn(player) || albumsArePlayed(player.albums));
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
    // The card's own, so its dials are named by their captions and the amounts beside them by the
    // dial they shape (0195): a part's fold is what names a second set of them (0176,
    // src/ui/PlayerPart.tsx).
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
  /** The same, and the one a run takes that a dial does not: the yard it names itself after
   *  (src/ui/PlayerRun.tsx). Built once for the reason the spec above it is — it is handed to
   *  eight runs, and a fresh object per render is a fresh prop on each. */
  const runProps = { deck, ...dialled };

  return (
    // Below the drift and above the rack, because what it moves is where inside the loop the deck
    // is reading — the transport's, never an effect's (0089) — and drawn as one of the cards under
    // it rather than as a bare section beside them: a module with knobs is a card, and this one is
    // full width because its row of dials is (0030, 0107, P87).
    // See docs/decisions/0007-reviewed-oversized-functions.md.
    <section
      className="flex w-full flex-col items-start gap-2"
      aria-label={`${yardLabel(deck)} ${PLAYER_LABEL}`}
      onPointerUp={onGestureEnd}
      onPointerCancel={onGestureEnd}
      onLostPointerCapture={onGestureEnd}
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
        {player !== null && !songIsDrawn(player) && player.albums.length > 0 && (
          <span className="type-readout text-muted-foreground">
            {`${PLAYER_ALBUMS_LABEL} ${albumsLabel(player.albums)}`}
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
          <CardContent className="flex w-full flex-col items-start gap-2">
            {/* The card's front: the picture, the six names that fill every dial under them in one
                press, and the reseed. Both of those gestures used to stand in the header's corner,
                behind an icon each — which put the shortest road from a loaded sample to a pattern
                worth hearing at the far end of the card from the picture that shows it working
                (0152, P98, 0197).

                Keyed on whether there is a spec at all, which is the one thing that must reset the
                menu inside it: it holds which name was last pressed, the draw under it and how far
                in it went — none of it durable, all of it about a pattern that is gone the moment
                the switch clears one (0152, 0173). Pointed where the dials are: while a part is
                selected a press fills that part rather than the pattern (0152, 0176). */}
            <PlayerFront
              key={off ? "off" : "on"}
              instrument={instrument}
              deck={deck}
              state={state}
              solo={songSolo[0]}
              player={painted}
              patch={dialPatch}
              reseed={onReseed}
              reseedLabel={`${RESEED_LABEL} ${PLAYER_LABEL} on ${yardLabel(deck)}`}
              selected={part !== undefined}
              disabled={off}
            />
            {/* Boxes rather than one row: thirty-odd controls at one distance from each other
                are thirty-odd things to read, and an amount nothing on screen tied to a dial was
                unfindable by anyone who did not already know it was there (0173, 0195). Each box
                says which question its dials answer and takes the card's whole width, so what
                reflows with the window is a few blocks rather than thirty controls, and every
                amount stands in the tinted run of the dial it shapes. Three of them are under this
                fold: the ground and the arrangement are folds of the card beside it and wear no
                box at all, because a box is what tells one question from the next inside a stack
                of them and neither is in that stack (0107, 0157, 0200, 0217). */}
            {/* Stacked rather than run across: each box is full width, so a dial's amounts stand
                beside it in the same box rather than pushing a column of the card sideways
                (0173, 0195). */}
            <div className="flex w-full flex-col items-stretch gap-2">
              {/* What makes the boxes under it the card's second register rather than the whole of
                  it: a press on the front moves all of these at once, and these are where one of
                  them is moved on its own (0197).

                  And the word is the fold, shut to begin with. 0197 said nothing may be folded away
                  behind it and 0198 reverses exactly that much of it: an eyebrow drawn over forty
                  controls that are all still on screen ranks them in a word and not on the page, so
                  what a hand met was the flat field 0197 was written against with a caption on top.
                  Nothing is gated — the caret is on the heading, the fold is one press either way,
                  and every number the module declares is still drawn under it (0195 holds). */}
              {cardFold(PLAYER_FINE_LABEL, ACTION_TOOLTIPS.collapse, fineFold)}
              {fine ? null : (
                <>
                  {/* The three boxes a part carries the numbers of, written once and drawn here and
                  under a part's own fold: a hand editing a part is reaching for the same dials in
                  the same order it reaches for on the card, and two copies of them would be two
                  cards to keep in step (principle 1, 0176, src/ui/PlayerDials.tsx). Called rather
                  than mounted, because what they are is the boxes and not a thing that owns them. */}
                  {playerDials(runProps)}
                </>
              )}
            </div>
            {/* And the ground, on a fold of its own beside the fine tune rather than inside it,
                and above the arrangement's — which is exactly the move 0200 made for the
                arrangement, said for the ground (0217). The argument was already written here as
                the reason the box sat at the end of that fold: it is the one thing under it that
                moves the window rather than moving inside it (0183), and it is the song's and not
                a part's — there is one loop and the whole song is read on it, so a part carrying a
                bed of its own would be the parts disagreeing about where that loop is (0184). Both
                of those are arguments for it not being under that fold at all. The fine tune is
                where one of the dials a press on the front already moved is moved on its own
                (0197), and the front moves no ground.

                Not a fourth dial in Where It Lands either: that box is about where a landing goes
                *inside* the loop, while every number here is about where the loop itself sits in
                the sample. The crawl put both boxes in slots (0185), so what separates them is no
                longer the unit but the thing being moved — which is the distinction 0173 grouped
                the card on.

                And it wears no box, on 0200's own sentence: a bordered box is what tells one of
                four questions from the next inside a stack of them, and a lone box under its own
                eyebrow is a frame around the only thing there. So the eyebrow is the fold's own
                toggle, and the sentence the box's eyebrow carried hangs off the `Says` on it —
                the picture under it is still a canvas no pointer can rest on (0080, 0191). */}
            {cardFold(PLAYER_GROUP_LABELS.ground, PLAYER_GROUND_TOOLTIP, groundFold)}
            {groundShut ? null : (
              // The row the box's own contents stood in, kept without the frame round it: full
              // width, wrapping, and every control sitting on the same baseline (0195).
              <div className="flex w-full flex-wrap items-end gap-2">
                {/* The picture first, and it is the fold's own control: the whole source with the
                    loop marked on it, the window the pattern reads drawn over that, and the
                    grounds its next moves reach ahead of it — dragged a loop-length at a time,
                    which writes the very field the dial under it turns (0191). What the dials say
                    in numbers, this says in one place; a hand asking "move the ground until it
                    sounds good" is asking a question no dial answers (0191). */}
                <PlayerGround
                  instrument={instrument}
                  deck={deck}
                  player={player}
                  loop={state.loop}
                  duration={state.duration}
                  patch={patch}
                  disabled={off}
                />
                {/* The bed first, because the three behind the dial beside it are all measured
                    from it: a distance is from here, a lean is away from here and a home is back
                    to here. It is the one dial here that is a *place* rather than an amount,
                    which is why it is on the row and not behind the marker (0124). Handed
                    `selected={false}` for the reason the arrangement below it is — a song knob
                    wears no mark, because no selection could point it anywhere else. */}
                <PlayerDial knob="bed" {...runProps} patch={patch} selected={false} />
                <PlayerBed {...runProps} patch={patch} selected={false} />
                {/* And the one gesture here, at the end of the row the ground is set on: the
                    walk moves the window and this writes it back down. A press and not a dial,
                    because it is a place a hand liked rather than an amount it is holding. */}
                <Says what={ACTION_TOOLTIPS.plant}>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    disabled={off || state.loop === null}
                    aria-label={`${PLANT_LABEL} ${PLAYER_LABEL} on ${yardLabel(deck)}`}
                    onClick={onPlant}
                  >
                    <ACTION_ICONS.plant />
                  </Button>
                </Says>
                {/* And the grounds a hand kept, on the fold's own last row: the wandering above is
                    what the pattern does on its own, and this is what it comes back to — the same
                    split the written row makes against the dials that draw one (0188, 0194). Drawn
                    only with a spec, for the reason the song section below is: the row is a list a
                    hand adds to, and a disabled Keep is a gesture with nothing to keep. */}
                {player !== null && (
                  <PlayerBeds
                    named={`${yardLabel(deck)} ${PLAYER_GROUP_LABELS.ground}`}
                    beds={player.beds}
                    onChange={onBeds}
                    onKeep={onKeep}
                    disabled={off}
                  />
                )}
              </div>
            )}
            {/* And the arrangement, on a fold of its own beside the fine tune rather than inside
                it: how a pattern is arranged is not one more question about the dials — it is the
                thing that decides which dials are being read at all, because a part hands the walk
                a whole voice at its first jump (0157, 0176). It sat in the fine tune's stack for
                as long as the fine tune was the card's only second register, and 0200 takes it
                out. Immediately above the section it fills, so the amounts that draw a run and the
                run they draw are one thing to read (0158).

                The word is the whole of it and there is no box: a bordered box is what tells one
                of four questions from the next inside a stack of them, and a lone box under its
                own eyebrow is a frame around the only thing there (0173's own argument, run the
                other way). What it is is a fold of the card, so it is drawn the way the card's
                other folds are — the word inside the control, the caret beside it (0106, 0200).

                One of the two runs a selection does not reach: the amounts here are the song's
                own, so they read and write the card's spec whatever a hand is pointed at, and they
                wear no mark saying otherwise (0158, 0176). */}
            {cardFold(PLAYER_GROUP_LABELS.arrange, ACTION_TOOLTIPS.collapse, arrangeFold)}
            {arrangeShut ? null : <PlayerArrange {...runProps} patch={patch} selected={false} />}
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
                solo={songSolo}
                album={albumOpen}
                songView={songViewOpen}
              />
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
