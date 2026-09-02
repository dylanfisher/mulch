/**
 * @role Move sketch 04 — the four facts as one sentence, each of its words a press that turns it to
 *   the next word. The argument: "the loop wanders a nudge on, and grows" is already how a hand
 *   would say it, so the control is the sentence and a press is the whole of setting it — and a
 *   loop that stays put loses the two words that were about going.
 * @instead The other five readings of the same seam → the files beside this one. The wheels of
 *   words → src/ui/sketch/sketchMove.ts. The file the consequence is drawn on →
 *   src/ui/sketch/move/SketchMoveFile.tsx.
 */
import { useCallback, useState } from "react";

import { Button } from "@/ui/components/button";
import { SKETCH_VIEW as VIEW } from "@/ui/sketch/SketchFrame";
import { SketchSays, SketchStage } from "@/ui/sketch/SketchStage";
import { MoveFile, type MoveBox } from "@/ui/sketch/move/SketchMoveFile";
import {
  moveSaid,
  nextOf,
  SKETCH_BREATHS,
  SKETCH_MOVE,
  SKETCH_REACHES,
  SKETCH_WANDERS_SAID,
  SKETCH_WAYS,
  type SketchMove,
} from "@/ui/sketch/sketchMove";

const FILE: MoveBox = { left: 0, wide: VIEW.wide, top: 22, high: 110 };

/** One word of the sentence, and the press that turns it. */
function Word({ says, what, onPress }: { says: string; what: string; onPress: () => void }) {
  return (
    <Button variant="outline" size="xs" aria-label={what} onClick={onPress}>
      {says}
    </Button>
  );
}

export function SketchMoveSentence() {
  const [move, setMove] = useState<SketchMove>(SKETCH_MOVE);
  const turnWanders = useCallback(() => {
    setMove((had) => ({ ...had, wanders: !had.wanders }));
  }, []);
  const turnReach = useCallback(() => {
    setMove((had) => ({ ...had, reach: nextOf(SKETCH_REACHES, had.reach) }));
  }, []);
  const turnWay = useCallback(() => {
    setMove((had) => ({ ...had, way: nextOf(SKETCH_WAYS, had.way) }));
  }, []);
  const turnBreath = useCallback(() => {
    setMove((had) => ({ ...had, breath: nextOf(SKETCH_BREATHS, had.breath) }));
  }, []);

  return (
    <SketchStage
      bench="move"
      reading="sentence"
      label="The Sentence"
      under={
        <p className="flex flex-wrap items-center gap-1.5 type-body">
          <span>The loop</span>
          <Word
            says={move.wanders ? SKETCH_WANDERS_SAID.wanders : SKETCH_WANDERS_SAID.stays}
            what="Whether the loop moves on its own"
            onPress={turnWanders}
          />
          {move.wanders && (
            <>
              <Word says={move.reach} what="How far the loop wanders" onPress={turnReach} />
              <Word says={move.way} what="Which way the loop wanders" onPress={turnWay} />
            </>
          )}
          <span>, and</span>
          <Word says={move.breath} what="How the loop breathes" onPress={turnBreath} />
          <span>.</span>
        </p>
      }
    >
      <SketchSays x={4} y={14}>
        {moveSaid(move)}
      </SketchSays>
      <MoveFile reading="sentence" move={move} box={FILE} />
      <SketchSays x={4} y={VIEW.high - 4}>
        a word is not a number: no odds of home, a nudge is a nudge
      </SketchSays>
    </SketchStage>
  );
}
