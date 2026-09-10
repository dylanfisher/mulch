/**
 * @role The Scene card at the head of the drift's tuning panel: what the yard's name was read as,
 *   said in the reading's own words, and under it the one thing about that reading a hand may set
 *   aside — the field, on a dropdown resting on the name's own (0343). Out of
 *   src/ui/MoireTuning.tsx because that file is at oxlint's dependency cap and a picker is four
 *   imports of its own.
 * @instead The choice itself, and the hook every surface reads it through → src/ui/yardSceneRead.ts.
 *   The reading → src/lib/yardScene.ts, and its words → src/lib/copyScene.ts. The panel this card
 *   heads → src/ui/MoireTuning.tsx.
 */
import { useCallback, useMemo } from "react";

import {
  SCENE_FIELD_WORDS,
  SCENE_PICK_HINT,
  SCENE_PICK_LABEL,
  SCENE_READING_HINT,
  SCENE_READING_TITLE,
  sceneAsNamed,
  sceneReading,
} from "@/lib/copyScene";
import { SCENE_NAMES, type SceneName } from "@/lib/moireScene";
import { yardScene } from "@/lib/yardScene";

import { Card, CardContent, CardHeader } from "@/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/components/select";
import { Says } from "@/ui/Says";
import { sceneChoice, setSceneChoice, useYardScene } from "@/ui/yardSceneRead";

/** The scene a picked value names, refused rather than assumed: the picker offers only these. */
function fieldNamed(value: string): SceneName {
  const field = SCENE_NAMES.find((name) => name === value);
  if (field === undefined) throw new Error(`no field is called "${value}".`);
  return field;
}

/**
 * The dropdown's rest, which no scene is named: the name's own field. A word and not the empty
 * string, which the picker reads as nothing chosen and draws as a placeholder.
 */
const AS_NAMED = "named";

/**
 * What the yard's name was read as, at the head of the panel, and the one thing about it a hand
 * may set aside: the field. A reading is not a dial — the name sets it (0329) — so it is said
 * rather than offered, here because this is where a hand already stands while it is checking the
 * picture against what it expected. The field alone is offered under it, for this tab only, so
 * the other three grounds can be seen under this yard's own light and wind (0343).
 */
export function MoireSceneCard({ name }: { name: string }) {
  const scene = useYardScene(name);
  const named = SCENE_FIELD_WORDS[yardScene(name).scene];
  const items = useMemo(
    () => [
      { value: AS_NAMED, label: sceneAsNamed(named) },
      ...SCENE_NAMES.map((field) => ({ value: field, label: SCENE_FIELD_WORDS[field] })),
    ],
    [named],
  );
  const onValueChange = useCallback(
    (next: string | null) => {
      // The picker holds no empty item past its rest, so a cleared value is a shape nobody can
      // have picked (principle 5).
      if (next === null) throw new Error(`the field was cleared: ${name}`);
      setSceneChoice(name, next === AS_NAMED ? null : fieldNamed(next));
    },
    [name],
  );
  return (
    <Card size="sm" className="mb-3 break-inside-avoid">
      <CardHeader>
        <Says what={SCENE_READING_HINT}>
          <h3 className="type-eyebrow text-muted-foreground">{SCENE_READING_TITLE}</h3>
        </Says>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        <p className="type-readout">{sceneReading(scene)}</p>
        <Says what={SCENE_PICK_HINT}>
          <Select value={sceneChoice(name) ?? AS_NAMED} onValueChange={onValueChange} items={items}>
            <SelectTrigger aria-label={SCENE_PICK_LABEL} size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.label} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Says>
      </CardContent>
    </Card>
  );
}
