/**
 * @role Move sketch 05 — the four facts as four rows of presses under the file, one word lit on
 *   each. The argument: the fold's five dials and three presses are four choices of two or three,
 *   so say them as choices — every word on the board is visible at once, which no dial, no leash
 *   and no sentence can claim.
 * @instead The other five readings of the same seam → the files beside this one. The words on
 *   each row → src/ui/sketch/sketchMove.ts. The file the consequence is drawn on →
 *   src/ui/sketch/move/SketchMoveFile.tsx. The row of presses the card already draws this way,
 *   for what the period is counted in → src/ui/PlayerBed.tsx.
 */
import { useCallback, useMemo, useState } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/ui/components/toggle-group";
import { SKETCH_VIEW as VIEW } from "@/ui/sketch/SketchFrame";
import { SketchSays, SketchStage } from "@/ui/sketch/SketchStage";
import { MoveFile, type MoveBox } from "@/ui/sketch/move/SketchMoveFile";
import {
  moveSaid,
  SKETCH_BREATHS,
  SKETCH_MOVE,
  SKETCH_REACHES,
  SKETCH_WANDERS_SAID,
  SKETCH_WAYS,
  type SketchMove,
} from "@/ui/sketch/sketchMove";

const FILE: MoveBox = { left: 0, wide: VIEW.wide, top: 22, high: 110 };

/** The two words for whether it moves, as the row they stand in. */
const WANDERS = [SKETCH_WANDERS_SAID.stays, SKETCH_WANDERS_SAID.wanders] as const;

/**
 * One row of the board: its eyebrow and its words, with the one that is on lit. Base UI clears the
 * group when the pressed word was already on, and a row always has one word on — so an empty
 * selection is a press on the word that is already lit, and changes nothing (src/ui/PlayerBed.tsx).
 */
function Row<T extends string>({
  eyebrow,
  words,
  on,
  onPress,
}: {
  eyebrow: string;
  words: readonly T[];
  on: T;
  onPress: (word: T) => void;
}) {
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
      <ToggleGroup
        value={value}
        onValueChange={onValueChange}
        variant="outline"
        size="sm"
        spacing={0}
        aria-label={eyebrow}
      >
        {words.map((word) => (
          <ToggleGroupItem key={word} value={word} aria-label={word}>
            {word}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

export function SketchMoveSwitchboard() {
  const [move, setMove] = useState<SketchMove>(SKETCH_MOVE);
  const setWanders = useCallback((word: (typeof WANDERS)[number]) => {
    setMove((had) => ({ ...had, wanders: word === SKETCH_WANDERS_SAID.wanders }));
  }, []);
  const setReach = useCallback((reach: SketchMove["reach"]) => {
    setMove((had) => ({ ...had, reach }));
  }, []);
  const setWay = useCallback((way: SketchMove["way"]) => {
    setMove((had) => ({ ...had, way }));
  }, []);
  const setBreath = useCallback((breath: SketchMove["breath"]) => {
    setMove((had) => ({ ...had, breath }));
  }, []);

  return (
    <SketchStage
      bench="move"
      reading="switchboard"
      label="The Switchboard"
      under={
        <div className="flex flex-wrap items-end gap-4">
          <Row
            eyebrow="On its own"
            words={WANDERS}
            on={move.wanders ? SKETCH_WANDERS_SAID.wanders : SKETCH_WANDERS_SAID.stays}
            onPress={setWanders}
          />
          <Row eyebrow="How far" words={SKETCH_REACHES} on={move.reach} onPress={setReach} />
          <Row eyebrow="Which way" words={SKETCH_WAYS} on={move.way} onPress={setWay} />
          <Row eyebrow="The loop" words={SKETCH_BREATHS} on={move.breath} onPress={setBreath} />
        </div>
      }
    >
      <SketchSays x={4} y={14}>
        {moveSaid(move)}
      </SketchSays>
      <MoveFile reading="switchboard" move={move} box={FILE} />
      <SketchSays x={4} y={VIEW.high - 4}>
        four rows of words: every choice visible, nothing felt
      </SketchSays>
    </SketchStage>
  );
}
