/**
 * @role The ⌘/Ctrl+K palette: one filtered list of everything the instrument's surface controls
 *   offer, each entry reaching the same construction its control does — a second way to send,
 *   never a second code path (P41, 0069).
 * @instead What a command then does → src/app/execute.ts. The construction each entry sends →
 *   src/ui/actions.ts. The key that opens this → src/ui/shortcuts.ts, where every key lives.
 */
// One import per surface the palette offers a second way into, which is the whole point of the
// file: the count tracks how many gestures it collects, not how much it decides.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { Autocomplete } from "@base-ui/react/autocomplete";

import type { Instrument } from "@/app/facade";
import { EFFECTS } from "@/audio/effects/registry";
import { EXPORT_SESSION, YARD, yardLabel } from "@/lib/copy";
import type { SessionState } from "@/state/store";
import {
  activateYardCommand,
  addEffectCommand,
  addYardCommand,
  captureClipCommand,
  playToggleCommand,
  stopCommand,
} from "@/ui/actions";
import { Dialog, DialogContent, DialogTitle } from "@/ui/components/dialog";
import { exportSession } from "@/ui/FileMenu";
import { ACTION_ICONS } from "@/ui/icons";
import { setPaletteOpen, toggleDebugConsole, usePaletteOpen } from "@/ui/shortcuts";
import { nextTheme, setTheme, useTheme, type Theme } from "@/ui/theme";
import { THEME_ICONS } from "@/ui/ThemeToggle";
// oxlint-enable import/max-dependencies

/** One row of the palette: what it is called, the picture the action already has, and the doing. */
export type PaletteEntry = {
  /** Stable across renders and unique in the list — Base UI keys the collection by it. */
  id: string;
  label: string;
  icon: typeof ACTION_ICONS.play;
  run: () => void;
};

/**
 * What the last invocation ran, by entry id — a view preference exactly like the theme and the
 * open flag: no command, nothing durable, no history entry (§2), and a module binding, so a
 * reload forgets it (P45, 0073).
 */
let lastRun: string | null = null;

/**
 * The remembered entry, first. Order is the whole mechanism: the list is offered with
 * `autoHighlight="always"`, so the first row is the active one and a typed query moves the
 * highlight to the first match by itself — nothing here pins a highlight the query would fight.
 */
function lastRunFirst(entries: PaletteEntry[]): PaletteEntry[] {
  const at = entries.findIndex((entry) => entry.id === lastRun);
  // Absent, or already first: the list it was going to build is the list.
  if (at <= 0) return entries;
  const [remembered] = entries.splice(at, 1);
  return remembered === undefined ? entries : [remembered, ...entries];
}

/**
 * Everything the palette can do right now, in the order it offers it. Two things are deliberate.
 * The active yard's entries are absent when the session holds no yards, because there is nothing
 * for them to name — the same answer the keyboard registry gives (0029). And nothing here reaches
 * past `send()`: an entry either sends an ordinary serialisable command built by
 * `src/ui/actions.ts`, or it flips a view preference through the one function its surface control
 * flips (§2).
 */
// One entry per gesture the palette offers; the length tracks how many that is, not how much this
// function decides. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function paletteEntries(
  { activeDeck, clips, deckList }: SessionState,
  {
    instrument,
    onError,
    onExportAudio,
    theme,
  }: {
    instrument: Instrument;
    onError: (message: string | null) => void;
    onExportAudio: () => void;
    theme: Theme;
  },
): PaletteEntry[] {
  const send = (build: () => Parameters<Instrument["send"]>[0]) => () => {
    instrument.send(build());
  };
  const entries: PaletteEntry[] = deckList.map(({ id, emoji, name }) => ({
    id: `go-to-${id}`,
    label: `Go To ${emoji} ${yardLabel(id)} — ${name}`,
    icon: ACTION_ICONS.goTo,
    run: send(() => activateYardCommand(id)),
  }));

  if (activeDeck !== null) {
    const active = activeDeck;
    entries.push(
      {
        id: "play-active",
        label: `Play / Pause ${yardLabel(active)}`,
        icon: ACTION_ICONS.play,
        run: send(() => playToggleCommand(active)),
      },
      {
        id: "stop-active",
        label: `Stop ${yardLabel(active)}`,
        icon: ACTION_ICONS.stop,
        run: send(() => stopCommand(active)),
      },
      {
        id: "capture-active",
        label: `Capture ${yardLabel(active)}`,
        icon: ACTION_ICONS.capture,
        run: send(() => captureClipCommand(clips, active)),
      },
      // From the registry, so an effect joins the palette by existing, exactly as it joins the
      // picker (0016, 0056) — and with the icon its own plugin declares.
      ...EFFECTS.map((effect): PaletteEntry => ({
        id: `add-${effect.id}`,
        label: `Add ${effect.label} to ${yardLabel(active)}`,
        icon: effect.icon,
        run: send(() => addEffectCommand(active, effect.id)),
      })),
    );
  }

  entries.push(
    {
      id: "add-yard",
      label: `Add ${YARD}`,
      icon: ACTION_ICONS.add,
      run: send(() => addYardCommand(deckList)),
    },
    {
      id: "export-audio",
      label: "Export Audio…",
      icon: ACTION_ICONS.exportAudio,
      run: onExportAudio,
    },
    {
      id: "export-session",
      label: EXPORT_SESSION,
      icon: ACTION_ICONS.exportSession,
      run: () => {
        void exportSession(instrument, onError);
      },
    },
    // The two view preferences: no command, nothing durable, no history entry (§2). Each calls
    // the one function its surface control calls, so the palette cannot hold a second opinion.
    {
      id: "toggle-theme",
      label: "Toggle Theme",
      // The picture the theme already carries for the one it is on, from the picker's own
      // declaration — a theme is not an action and keeps its icon beside its identity (0055).
      icon: THEME_ICONS[theme],
      run: () => {
        setTheme(nextTheme(theme));
      },
    },
    {
      id: "toggle-debug-console",
      label: "Toggle Debug Console",
      icon: ACTION_ICONS.debugConsole,
      run: toggleDebugConsole,
    },
  );

  return lastRunFirst(entries);
}

/** What the primitive filters and reads an entry back as — the one string a row shows. */
const labelOf = (entry: PaletteEntry): string => entry.label;

/**
 * Choosing a row, whichever gesture chose it. The one place a palette invocation happens, which
 * is why the memory is written here rather than inside `run`: an entry's `run` is the surface
 * control's own doing and stays byte-identical to it (0069).
 */
export function choosePaletteEntry(entry: PaletteEntry): void {
  // Closed first: an entry that opens another dialog would otherwise open it underneath this
  // one, and every entry is finished the moment it is chosen.
  setPaletteOpen(false);
  lastRun = entry.id;
  entry.run();
}

/**
 * One row. `onClick` is the primitive's own selection hook — it fires for a pointer press and for
 * Enter on the highlighted row alike, so both gestures reach one handler rather than two.
 */
function PaletteItem({ entry }: { entry: PaletteEntry }) {
  const Icon = entry.icon;
  const onClick = useCallback(() => {
    choosePaletteEntry(entry);
  }, [entry]);

  return (
    <Autocomplete.Item
      value={entry}
      aria-label={entry.label}
      onClick={onClick}
      className="flex cursor-default items-center gap-2 px-3 py-2 type-body outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground [&_svg]:shrink-0"
    >
      <Icon />
      {entry.label}
    </Autocomplete.Item>
  );
}

type PaletteProps = {
  instrument: Instrument;
  onError: (message: string | null) => void;
  onExportAudio: () => void;
};

/**
 * The palette's body, mounted only while it is open. That is the whole reason it is a component
 * of its own: it reads the session as one object, and the store hands out a fresh root on every
 * `param.set` a knob drag sends — a subscription living here rather than in the shell means a
 * closed palette rebuilds nothing under a drag it cannot be seen during (§2, P42).
 */
function PaletteBody({ instrument, onError, onExportAudio }: PaletteProps) {
  const theme = useTheme();
  // Where the dialog puts focus when it opens. Not `autoFocus` on the input: that attribute is
  // a usability trap on an ordinary page, and this is the dialog's own initial focus, which Base
  // UI would otherwise leave on the popup with nothing to type into.
  const filter = useRef<HTMLInputElement | null>(null);
  const read = useCallback(() => instrument.state.getState(), [instrument]);
  const state = useSyncExternalStore(instrument.state.subscribe, read, read);
  const entries = paletteEntries(state, { instrument, onError, onExportAudio, theme });

  return (
    <>
      {/* Instantly, backdrop included: ./scripts/drive opens this one, and a popup Playwright
          waits out costs the gate hundreds of milliseconds before it may click (0056). */}
      <DialogContent
        className="top-24 max-h-[60vh] translate-y-0 gap-0 overflow-hidden p-0 duration-0 sm:max-w-lg"
        overlayClassName="duration-0"
        showCloseButton={false}
        initialFocus={filter}
      >
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        {/* `always`, so the first row is active the moment the list opens: that is what makes the
            remembered entry `lastRunFirst` puts there reachable with Enter alone (P45). */}
        <Autocomplete.Root
          inline
          open
          items={entries}
          itemToStringValue={labelOf}
          autoHighlight="always"
        >
          <Autocomplete.Input
            ref={filter}
            placeholder="Type a command…"
            aria-label="Command Palette"
            className="h-9 w-full border-b border-input bg-transparent px-3 type-body outline-none placeholder:text-muted-foreground"
          />
          <Autocomplete.List className="max-h-80 overflow-y-auto py-1">
            {(entry: PaletteEntry) => <PaletteItem key={entry.id} entry={entry} />}
          </Autocomplete.List>
          <Autocomplete.Empty className="px-3 py-4 type-body text-muted-foreground">
            No Matching Command
          </Autocomplete.Empty>
        </Autocomplete.Root>
      </DialogContent>
    </>
  );
}

/**
 * The palette. Base UI's own `Autocomplete` is the primitive — the filter, the highlight and the
 * listbox roles all come from it, so nothing here reimplements a combobox (0069). It renders
 * `inline`, without a popup of its own, inside the dialog every other overlay in the app uses.
 */
export function CommandPalette(props: PaletteProps) {
  const open = usePaletteOpen();

  useEffect(
    () => () => {
      // The flag lives in src/ui/shortcuts.ts, where every key does, so it outlives this
      // component — and the key that clears it is bound on the instrument route alone. A
      // hashchange to #/dev under an open palette would otherwise strand it open, and coming
      // back would reopen it with nothing pressed.
      setPaletteOpen(false);
    },
    [],
  );

  return (
    <Dialog open={open} onOpenChange={setPaletteOpen}>
      {open && <PaletteBody {...props} />}
    </Dialog>
  );
}
