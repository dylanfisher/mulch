/**
 * @role The drift's tuning panel: a popover on the zoomed picture with a slider for every number
 *   the picture can move without rebuilding anything, grouped into cards by what the numbers do
 *   and each explained on hover, a push at the head of every card that drives its dials toward
 *   their wilder ends together, a reset, and — on localhost only — a button
 *   that copies what has been moved as the sentence an agent is handed to make it the default.
 *   The values are the registry's and not this panel's: it re-renders on a move and reads every
 *   handle, so the picture underneath, which reads the same handles a painting, changes with the
 *   slider and stores nothing (0299, 0145).
 * @instead The registry itself, and which numbers are in it → src/lib/moireTuning.ts. The picture
 *   the panel is worn by, and where it is asked to paint again → src/ui/MoireStrip.tsx and
 *   `useDriftSurface` in src/ui/driftTiles.ts. The words → src/lib/copyDrift.ts, and the groups,
 *   labels and hints → src/lib/copyDriftGroups.ts.
 */
import { useCallback, useSyncExternalStore } from "react";

import {
  MOIRE_TUNE,
  MOIRE_TUNE_COPIED,
  MOIRE_TUNE_COPY,
  MOIRE_TUNE_COPY_FAILED,
  MOIRE_TUNE_PUSH,
  MOIRE_TUNE_PUSH_HINT,
  MOIRE_TUNE_RESET,
  MOIRE_TUNE_TITLE,
  tuningPrompt,
} from "@/lib/copyDrift";
import { MOIRE_TUNE_GROUPS, type TuningEntry, type TuningGroup } from "@/lib/copyDriftGroups";
import {
  resetTuning,
  setTuning,
  subscribeTuning,
  tuningChanges,
  tunings,
  tuningSnapshot,
  type Tunable,
} from "@/lib/moireTuning";
import { clamp, snapToStep } from "@/lib/range";

import { Button } from "@/ui/components/button";
import { Card, CardContent, CardHeader } from "@/ui/components/card";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/ui/components/popover";
import { Slider } from "@/ui/components/slider";
import { Says } from "@/ui/Says";
import { toast } from "@/ui/components/toast";
import { INSTANT_POPUP } from "@/ui/shell";

/**
 * Whether a page is being served to its own author: the copy button is a step in a loop that
 * ends in an edit to this repository, which is a thing nobody else's browser can offer. A hostname
 * and not a build flag, for the reason src/main.tsx gives — drive loads the preview build.
 */
export const isLocalHost = (hostname: string): boolean =>
  hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";

const onLocalHost = (): boolean =>
  typeof location !== "undefined" && isLocalHost(location.hostname);

/** Re-render on every move and every reset; the values themselves are read off the handles. */
const useTuning = (): string =>
  useSyncExternalStore(subscribeTuning, tuningSnapshot, tuningSnapshot);

/** As many decimals as the step has, so a readout says exactly what a slider can set. */
const readout = (handle: Tunable): string =>
  handle.value.toFixed(Math.max(0, -Math.floor(Math.log10(handle.step))));

/** One row resolved: the words the panel says of a tunable, and the handle it moves. */
export type TuningRowOf = { readonly entry: TuningEntry; readonly handle: Tunable };
export type TuningGroupOf = {
  readonly group: TuningGroup;
  readonly rows: readonly TuningRowOf[];
};

/**
 * The panel's groups, in the copy's own order, each row joined to its handle. A tunable the copy
 * has no row for, or a row naming no tunable, is a panel that would silently show less than the
 * registry holds — or a slider over nothing — so either throws (principle 5).
 */
export function grouped(all: readonly Tunable[]): readonly TuningGroupOf[] {
  const unseen = new Map(all.map((handle) => [handle.id, handle]));
  const groups = MOIRE_TUNE_GROUPS.map((group) => ({
    group,
    rows: group.entries.map((entry) => {
      const handle = unseen.get(entry.id);
      if (handle === undefined)
        throw new Error(`Drift tuning "${entry.id}" has words and no slider.`);
      unseen.delete(entry.id);
      return { entry, handle };
    }),
  }));
  if (unseen.size > 0) {
    throw new Error(`Drift tuning "${[...unseen.keys()].join('", "')}" has a slider and no words.`);
  }
  return groups;
}

/** The end of a row's range its group's push drives it toward, or nothing for a row a push leaves. */
const wildEnd = ({ entry, handle }: TuningRowOf): number | undefined =>
  entry.wild === undefined ? undefined : entry.wild === "max" ? handle.max : handle.min;

/**
 * How far a group stands toward its wild ends, on nought to one: the mean over its driven rows
 * of where each value sits between its rest and its wild end. Derived and never held, so a group
 * whose rows were moved one at a time reads back where they are, and reset reads nought.
 */
export function groupPush(rows: readonly TuningRowOf[]): number | undefined {
  let sum = 0;
  let driven = 0;
  for (const row of rows) {
    const wild = wildEnd(row);
    if (wild === undefined) continue;
    sum += clamp((row.handle.value - row.handle.rest) / (wild - row.handle.rest), 0, 1);
    driven += 1;
  }
  return driven === 0 ? undefined : sum / driven;
}

/**
 * Drive every driven row of the group titled `title` the same way toward its wild end, each snapped
 * to its own step. By title and not by rows, so the slider's handler closes over one string and
 * the compiler can keep it memoized. A title no group has is a slider over nothing.
 */
export function pushGroup(title: string, push: number): void {
  const found = grouped(tunings()).find(({ group }) => group.title === title);
  if (found === undefined) throw new Error(`No drift tuning group "${title}".`);
  const toward = clamp(push, 0, 1);
  for (const row of found.rows) {
    const wild = wildEnd(row);
    if (wild === undefined) continue;
    const { rest, min, max, step } = row.handle;
    setTuning(row.handle.id, snapToStep(rest + toward * (wild - rest), min, max, step));
  }
}

const PUSH_STEP = 0.01;

function PushRow({ title, rows }: { title: string; rows: readonly TuningRowOf[] }) {
  const push = groupPush(rows);
  const onValueChange = useCallback(
    (value: number | readonly number[]) => {
      pushGroup(title, typeof value === "number" ? value : (value[0] ?? 0));
    },
    [title],
  );
  if (push === undefined) return null;
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-2 gap-y-1 border-b border-foreground/10 pb-2">
      <Says what={MOIRE_TUNE_PUSH_HINT}>
        <span className="type-readout font-medium">{MOIRE_TUNE_PUSH}</span>
      </Says>
      <span className="type-readout text-muted-foreground">{push.toFixed(2)}</span>
      <Slider
        className="col-span-2"
        aria-label={`${MOIRE_TUNE_PUSH} ${title}`}
        min={0}
        max={1}
        step={PUSH_STEP}
        value={push}
        onValueChange={onValueChange}
      />
    </div>
  );
}

function TuningRow({ entry, handle }: TuningRowOf) {
  const onValueChange = useCallback(
    (value: number | readonly number[]) => {
      setTuning(handle.id, typeof value === "number" ? value : (value[0] ?? handle.value));
    },
    [handle],
  );
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-2 gap-y-1">
      <Says what={entry.hint}>
        <span className="type-readout">{entry.label}</span>
      </Says>
      <span className="type-readout text-muted-foreground">{readout(handle)}</span>
      <Slider
        className="col-span-2"
        aria-label={handle.id}
        min={handle.min}
        max={handle.max}
        step={handle.step}
        value={handle.value}
        onValueChange={onValueChange}
      />
    </div>
  );
}

async function copyTuning(): Promise<void> {
  try {
    await navigator.clipboard.writeText(tuningPrompt(tuningChanges()));
    toast.add({ title: MOIRE_TUNE_COPIED });
  } catch (error) {
    toast.add({ title: MOIRE_TUNE_COPY_FAILED, description: String(error) });
  }
}

/** The click, with the promise the copy is disowned on: the toast is the report either way. */
const onCopy = (): void => {
  void copyTuning();
};

/**
 * The panel's body, on its own so a test can render it open: the groups, each heading and each
 * label saying on hover what its numbers do, then the reset and,
 * for the author, the copy — disabled while nothing has moved, because a prompt to change
 * nothing is not one.
 */
export function TuningFields({ debug }: { debug: boolean }) {
  useTuning();
  const changed = Object.keys(tuningChanges()).length > 0;
  return (
    <>
      <div className="columns-[16rem] gap-3">
        {grouped(tunings()).map(({ group, rows }) => (
          <Card key={group.title} size="sm" className="mb-3 break-inside-avoid">
            <CardHeader>
              <Says what={group.hint}>
                <h3 className="type-eyebrow text-muted-foreground">{group.title}</h3>
              </Says>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5">
              <PushRow title={group.title} rows={rows} />
              {rows.map((row) => (
                <TuningRow key={row.handle.id} {...row} />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex justify-end gap-1 pt-3">
        <Button size="sm" variant="ghost" disabled={!changed} onClick={resetTuning}>
          {MOIRE_TUNE_RESET}
        </Button>
        {debug ? (
          <Button size="sm" variant="outline" disabled={!changed} onClick={onCopy}>
            {MOIRE_TUNE_COPY}
          </Button>
        ) : null}
      </div>
    </>
  );
}

/**
 * The button in the zoomed picture's header and the popover under it. A popup ./scripts/drive
 * presses, so it opens instantly like every other one (0056). Sixty-odd numbers in a dozen groups:
 * the panel is as wide as the screen allows, the groups are cards flowing down columns, and it
 * scrolls inside itself rather than past the screen.
 */
export function DriftTuning() {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button size="sm" variant="ghost">
            {MOIRE_TUNE}
          </Button>
        }
      />
      <PopoverContent
        align="end"
        className={`max-h-[80vh] w-[min(96vw,72rem)] overflow-y-auto ${INSTANT_POPUP}`}
      >
        <PopoverHeader>
          <PopoverTitle>{MOIRE_TUNE_TITLE}</PopoverTitle>
        </PopoverHeader>
        <TuningFields debug={onLocalHost()} />
      </PopoverContent>
    </Popover>
  );
}
