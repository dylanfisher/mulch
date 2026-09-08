/**
 * @role One yard's ground: the Every dial, and beside it in its own run what that period is counted
 *   in (0192) and the three rows of words a move is said in — whether the loop wanders or stays
 *   put, how far one move may carry it and which way it leans (0277). Four rows of presses and no
 *   further dial: every word the fold can say is on the board at once, which is the argument the
 *   switchboard won the bench on. Fields of one `deck.player` spec, patched by the card that owns
 *   the command — the song's own, so no selection reaches them and the dial wears no mark (0184,
 *   the way the arrangement's four are drawn).
 * @instead The Bed dial the three rows are measured from, which stands on the fold's own row
 *   because it is a place and not a fact about the move → src/ui/PlayerCard.tsx. What a bed
 *   becomes in sound — how far through the source a landing reads, counted in the loop's own
 *   sixteenths (0185) → src/audio/player.ts. What the three words are as numbers, said once →
 *   `bedMove`, src/lib/playerBed.ts, and the move itself → src/lib/playerWalk.ts. The words each
 *   press wears → src/lib/copyGround.ts. The run they stand in → src/ui/PlayerRun.tsx.
 */
// One import per word the board says and per bound the shared ground stands in: the count is how
// many controls this fold offers rather than how much it decides. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { useCallback, useMemo, useSyncExternalStore } from "react";

import type { Instrument } from "@/app/facade";
import { yardLabel } from "@/lib/copy";
import {
  PLAYER_BED_PER_LABEL,
  PLAYER_BED_PER_LABELS,
  PLAYER_BED_PER_TOOLTIP,
  PLAYER_BED_REACH_LABEL,
  PLAYER_BED_REACH_LABELS,
  PLAYER_BED_REACH_TOOLTIP,
  PLAYER_BED_WANDERS_LABEL,
  PLAYER_BED_WANDERS_LABELS,
  PLAYER_BED_WANDERS_TOOLTIP,
  PLAYER_BED_WAY_LABEL,
  PLAYER_BED_TOGETHER_LABEL,
  PLAYER_BED_TOGETHER_LABELS,
  PLAYER_BED_TOGETHER_TOOLTIP,
  PLAYER_BED_WAY_LABELS,
  PLAYER_BED_WAY_TOOLTIP,
  PLAYER_GROUND_EVERY_LABEL,
  PLAYER_GROUND_EVERY_TOOLTIP,
  PLAYER_GROUND_LEADER_LABEL,
  PLAYER_GROUND_LEADER_TOOLTIP,
  PLAYER_GROUND_PER_LABEL,
  PLAYER_GROUND_PER_LABELS,
  PLAYER_GROUND_PER_TOOLTIP,
  PLAYER_GROUND_SHARED_SAID,
} from "@/lib/copyGround";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import type { DeckId } from "@/state/store";
import { PLAYER_BED_PERS, PLAYER_BED_REACHES, PLAYER_BED_WAYS } from "@/lib/playerBed";
import {
  GROUND_EVERY_MAX_SECS,
  GROUND_EVERY_MIN_SECS,
  GROUND_PERS,
  GROUND_ROUNDS_DEFAULT,
  GROUND_ROUNDS_MAX,
  GROUND_ROUNDS_MIN,
  groundIsLed,
  SESSION_GROUND_DEFAULTS,
  type GroundPer,
  type SessionGround,
} from "@/lib/sessionGround";
import { ToggleGroup, ToggleGroupItem } from "@/ui/components/toggle-group";
import { Knob, secondsLabel, secondsValue } from "@/ui/Knob";
import { PlayerDial, voiceProps } from "@/ui/PlayerDial";
import { PlayerRun, type PlayerRunProps } from "@/ui/PlayerRun";
import { Says } from "@/ui/Says";

/** The two words for whether the loop moves on its own, as the row they stand in. */
const WANDERS = ["stays", "wanders"] as const;

/** And the two for whose ground it is walking — its own, or the session's (0313). */
const TOGETHER = ["own", "together"] as const;

/**
 * One row of the board: its eyebrow, its sentence, and its words with the one that is on lit. A
 * choice and not a further amount, so a set of presses rather than a dial — the shape the cast in
 * the arrangement's own run has too (0192, 0174, src/ui/PlayerArrange.tsx). Base UI clears the
 * group when the pressed word was already on, and a row always has one word on — so an empty
 * selection is a press on the word that is already lit, and sends nothing (principle 5).
 */
// One prop per thing a row is — its eyebrow, its sentence, its words, which is lit and whether it
// is refused — and the length is that list. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
function Row<T extends string>({
  deck,
  eyebrow,
  says,
  words,
  labels,
  on,
  onPress,
  disabled,
}: {
  deck: DeckId;
  eyebrow: string;
  says: string;
  words: readonly T[];
  labels: Record<T, string>;
  on: T;
  onPress: (word: T) => void;
  disabled: boolean;
}) {
  // Memoised: a fresh array every render is a new prop on a control in a loop (`react-perf`).
  const value = useMemo(() => [on], [on]);
  const onValueChange = useCallback(
    (next: string[]) => {
      const [word] = next;
      const pressed = words.find((one) => one === word);
      if (pressed !== undefined) onPress(pressed);
    },
    [words, onPress],
  );
  return (
    <div className="flex flex-col gap-1">
      <span className="type-eyebrow text-muted-foreground">{eyebrow}</span>
      <Says what={says}>
        <ToggleGroup
          value={value}
          onValueChange={onValueChange}
          variant="outline"
          size="sm"
          spacing={0}
          disabled={disabled}
          aria-label={`${yardLabel(deck)} ${eyebrow}`}
        >
          {words.map((word) => (
            <ToggleGroupItem key={word} value={word} aria-label={labels[word]}>
              {labels[word]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Says>
    </div>
  );
}

// One handler per row of the board, plus the dial: the length is how many controls this run holds
// rather than how much it decides. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function PlayerBed({
  deck,
  named,
  player,
  defaults,
  patch,
  voice,
  instrument,
  selected = false,
  disabled = false,
}: PlayerRunProps & { instrument: Instrument }) {
  /**
   * Whose ground this yard is on, which decides what every row below writes: its own spec, or the
   * session's shared ground. One reading of one field rather than a branch per row, because the
   * three words mean the same thing on either ground and only their owner differs (0313).
   */
  const together = player.bedTogether;
  const readGround = useCallback(() => instrument.state.getState().ground, [instrument]);
  const ground = useSyncExternalStore(instrument.state.subscribe, readGround, readGround);
  /**
   * One `session.ground` per gesture, carrying the whole ground — the shape every gesture on this
   * card already has one tier down (0089, 0313). Composed off the store at the moment of the
   * press rather than off the render's copy, so two presses inside one frame cannot undo each
   * other.
   */
  const patchGround = useCallback(
    (fields: Partial<SessionGround>) => {
      instrument.send({
        t: "session.ground",
        ground: { ...instrument.state.getState().ground, ...fields },
      });
    },
    [instrument],
  );
  /** Each word sent as the whole spec, like every other gesture on this card (0089). */
  const setPer = useCallback(
    (bedPer: (typeof PLAYER_BED_PERS)[number]) => {
      patch({ bedPer });
    },
    [patch],
  );
  const setTogether = useCallback(
    (word: (typeof TOGETHER)[number]) => {
      patch({ bedTogether: word === "together" });
    },
    [patch],
  );
  const setWanders = useCallback(
    (word: (typeof WANDERS)[number]) => {
      const wanders = word === "wanders";
      if (together) patchGround({ wanders });
      else patch({ bedWanders: wanders });
    },
    [patch, patchGround, together],
  );
  const setReach = useCallback(
    (bedReach: (typeof PLAYER_BED_REACHES)[number]) => {
      if (together) patchGround({ reach: bedReach });
      else patch({ bedReach });
    },
    [patch, patchGround, together],
  );
  const setWay = useCallback(
    (bedWay: (typeof PLAYER_BED_WAYS)[number]) => {
      if (together) patchGround({ way: bedWay });
      else patch({ bedWay });
    },
    [patch, patchGround, together],
  );
  const setEvery = useCallback(
    (every: number) => {
      patchGround({ every });
    },
    [patchGround],
  );
  /**
   * The clock and the period move together, because the one number means two things: seconds
   * where the clock counts them, and a whole count of parts or rounds otherwise (0192's one
   * period, said for this ground). A press that changed only the clock would leave a period of
   * four seconds reading as four parts, or a period of thirty as thirty rounds — so the press
   * carries the reading its own clock opens at, and one `session.ground` carries both (0313).
   */
  const setGroundPer = useCallback(
    (per: GroundPer) => {
      const held = instrument.state.getState().ground;
      if (per === held.per) return;
      patchGround({
        per,
        every: per === "second" ? SESSION_GROUND_DEFAULTS.every : GROUND_ROUNDS_DEFAULT,
        // A clock of seconds names no yard, and one of parts opens on none until a hand says
        // which: the ground holds still meanwhile, which is the honest answer (0313, principle 5).
        leader: per === "second" ? null : held.leader,
      });
    },
    [instrument, patchGround],
  );
  const setLeader = useCallback(
    (leader: DeckId) => {
      patchGround({ leader });
    },
    [patchGround],
  );
  /** Every yard the session holds, which is what a leader may be. Read off the store beside the
   *  ground for the same reason: it is the session's list and no yard's (0029). */
  const readYards = useCallback(() => instrument.state.getState().deckList, [instrument]);
  const yards = useSyncExternalStore(instrument.state.subscribe, readYards, readYards);
  const led = groundIsLed(ground);
  /**
   * What the one period dial is, in the unit its own clock names: seconds read as seconds, and a
   * count of parts or rounds as a whole number. Built as a set of props rather than a dial each,
   * because it is one control reading one field and two dials would be two places a period could
   * be turned (principle 1, 0192).
   */
  const period = led
    ? {
        min: GROUND_ROUNDS_MIN,
        max: GROUND_ROUNDS_MAX,
        defaultValue: GROUND_ROUNDS_DEFAULT,
        step: 1,
      }
    : {
        min: GROUND_EVERY_MIN_SECS,
        max: GROUND_EVERY_MAX_SECS,
        defaultValue: SESSION_GROUND_DEFAULTS.every,
        format: secondsLabel,
        parse: secondsValue,
      };
  const leaders = useMemo(() => yards.map(({ id }) => id), [yards]);
  const leaderLabels = useMemo(
    () => Object.fromEntries(yards.map(({ id }) => [id, yardLabel(id)])),
    [yards],
  );
  return (
    <PlayerRun
      title={together ? PLAYER_GROUND_EVERY_LABEL : PLAYER_KNOB_LABELS.bedEvery}
      dial={
        together ? (
          // The shared ground's own period — a dial of its own and not this yard's `bedEvery`,
          // which counts this yard's jumps and is not what is moving the loop while the ground is
          // the session's. One dial for both clocks, reading in whichever unit `per` names: one
          // period and not one per unit (0192, 0313).
          <Knob
            label={PLAYER_GROUND_EVERY_LABEL}
            size="default"
            value={ground.every}
            {...period}
            curve="log"
            says={PLAYER_GROUND_EVERY_TOOLTIP}
            onChange={setEvery}
            disabled={disabled}
          />
        ) : (
          <PlayerDial
            named={named}
            size="default"
            knob="bedEvery"
            player={player}
            defaults={defaults}
            patch={patch}
            {...voiceProps(voice)}
            selected={selected}
            disabled={disabled}
          />
        )
      }
    >
      {/* Whose ground it is stands first, because it is what decides whether the rows after it are
          about this yard at all (0313). */}
      <Row
        deck={deck}
        eyebrow={PLAYER_BED_TOGETHER_LABEL}
        says={PLAYER_BED_TOGETHER_TOOLTIP}
        words={TOGETHER}
        labels={PLAYER_BED_TOGETHER_LABELS}
        on={together ? "together" : "own"}
        onPress={setTogether}
        disabled={disabled}
      />
      {/* What the dial beside it counts, on this yard's own ground alone: the shared one is
          counted in seconds, so a clock of jumps, parts and songs would be a row that says nothing
          about what is moving the loop (0192, 0313). */}
      {together ? (
        <Row
          deck={deck}
          eyebrow={PLAYER_GROUND_PER_LABEL}
          says={PLAYER_GROUND_PER_TOOLTIP}
          words={GROUND_PERS}
          labels={PLAYER_GROUND_PER_LABELS}
          on={ground.per}
          onPress={setGroundPer}
          disabled={disabled}
        />
      ) : (
        <Row
          deck={deck}
          eyebrow={PLAYER_BED_PER_LABEL}
          says={PLAYER_BED_PER_TOOLTIP}
          words={PLAYER_BED_PERS}
          labels={PLAYER_BED_PER_LABELS}
          on={player.bedPer}
          onPress={setPer}
          disabled={disabled}
        />
      )}
      {/* And whose parts those are, on the one clock that needs a yard named. Drawn only where it
          is asked for, because a row naming yards beside a period of seconds would be a control
          answering a question nothing put (0313). */}
      {together && led && (
        <Row
          deck={deck}
          eyebrow={PLAYER_GROUND_LEADER_LABEL}
          says={PLAYER_GROUND_LEADER_TOOLTIP}
          words={leaders}
          labels={leaderLabels}
          on={ground.leader ?? ""}
          onPress={setLeader}
          disabled={disabled}
        />
      )}
      <Row
        deck={deck}
        eyebrow={PLAYER_BED_WANDERS_LABEL}
        says={together ? PLAYER_GROUND_SHARED_SAID : PLAYER_BED_WANDERS_TOOLTIP}
        words={WANDERS}
        labels={PLAYER_BED_WANDERS_LABELS}
        on={(together ? ground.wanders : player.bedWanders) ? "wanders" : "stays"}
        onPress={setWanders}
        disabled={disabled}
      />
      <Row
        deck={deck}
        eyebrow={PLAYER_BED_REACH_LABEL}
        says={together ? PLAYER_GROUND_SHARED_SAID : PLAYER_BED_REACH_TOOLTIP}
        words={PLAYER_BED_REACHES}
        labels={PLAYER_BED_REACH_LABELS}
        on={together ? ground.reach : player.bedReach}
        onPress={setReach}
        disabled={disabled}
      />
      <Row
        deck={deck}
        eyebrow={PLAYER_BED_WAY_LABEL}
        says={together ? PLAYER_GROUND_SHARED_SAID : PLAYER_BED_WAY_TOOLTIP}
        words={PLAYER_BED_WAYS}
        labels={PLAYER_BED_WAY_LABELS}
        on={together ? ground.way : player.bedWay}
        onPress={setWay}
        disabled={disabled}
      />
    </PlayerRun>
  );
}
