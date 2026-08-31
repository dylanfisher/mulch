/** @role What the Export Audio dialog asks for, and the one thing 0056 says a driven popup must be. */
import {
  EXPORT_AUDIO,
  EXPORT_TAKES_UNMEASURED,
  EXPORT_WITH_SESSION,
  exportTakesSaid,
  INITIAL_YARD_NAME,
} from "@/lib/copy";
import { EXPORT_NAME_SEPARATOR, exportNameField } from "@/lib/exportName";
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import type * as ExportAudioTypes from "@/app/exportAudio";
import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

// The two hooks the dialog holds, made callable outside a renderer the way src/ui/FileMenu.test.tsx
// makes that menu's callable. Nothing here presses anything: what is asserted is the shape a
// first render produces.
/**
 * What this session has measured, as the one seam the box reads it through. It is module state in
 * the export door — a rate is a fact about this machine and never durable (P166) — so the two
 * sentences below are reached by standing in for that reader rather than by running a render,
 * which needs a real OfflineAudioContext this file has none of.
 */
const seam = vi.hoisted(() => ({ rate: null as number | null }));

vi.mock("@/app/exportAudio", async (importOriginal) => ({
  ...(await importOriginal<typeof ExportAudioTypes>()),
  lastRenderRate: () => seam.rate,
}));

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useRef: (initial: unknown) => ({ current: initial }),
    useState: (initial: unknown) => [initial, () => {}],
  };
});

import { manualClock } from "@/app/clock";
import {
  defaultExportSecs,
  EXPORT_AUDIO_FILE,
  EXPORT_DEFAULT_MINUTES,
  EXPORT_MAX_SECS,
  EXPORT_SECS_PER_MINUTE,
  exportSecsOf,
} from "@/app/exportAudio";
import { createInstrument, type Instrument } from "@/app/facade";
import { SETTLE_FLOOR_SECS } from "@/lib/settle";
import { ExportAudioDialog, ExportAudioForm } from "@/ui/ExportAudioDialog";

type Props = {
  className?: string;
  overlayClassName?: string;
  htmlFor?: string;
  id?: string;
  label?: string;
  value?: unknown;
  checked?: boolean;
  disabled?: boolean;
  children?: ReactNode;
};

/** Every element in a returned tree, depth first — the dialog's content never reaches markup. */
function* elements(node: ReactNode): Generator<ReactElement<Props>> {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<Props>(child)) continue;
    yield child;
    yield* elements(child.props.children ?? null);
  }
}

const instrument = createInstrument(manualClock());

/**
 * The dialog and its body, as one tree. The body is a component the dialog only mounts when it is
 * open, so it is called here rather than looked for in the markup — which is also why the length
 * it pre-fills is the session's length at the moment it opens.
 *
 * The instrument is an argument because one of the things the box says is read off its clock: a
 * performance that has been running is a different sentence from one that has not.
 */
function tree(from: Instrument = instrument): ReactElement<Props>[] {
  const dialog = ExportAudioDialog({
    instrument: from,
    open: true,
    onOpenChange: () => {},
    onError: () => {},
  });
  const body = ExportAudioForm({ instrument: from, onClose: () => {}, onError: () => {} });
  return [...elements(dialog), ...elements(body)];
}

const words = (children: ReactNode): string =>
  Children.toArray(children)
    .filter((child): child is string => typeof child === "string")
    .join("");

/**
 * The one line the box says about which seconds of the performance it is about to render. Found
 * by being the paragraph with no id: it is a sentence and not a field, so it carries none for the
 * list below to hold, which is what tells it apart from the one saying how long the render is.
 */
function begins(from: Instrument): string {
  const said = tree(from).flatMap((element) =>
    element.type === "p" && element.props.id === undefined ? [words(element.props.children)] : [],
  );
  expect(said).toHaveLength(1);
  return said.join("");
}

/** The other sentence: how long the render itself is going to take, which does carry an id. */
function takes(from: Instrument = instrument): string {
  const said = tree(from).find((element) => element.props.id === "export-audio-takes");
  return words(said?.props.children);
}

// One `it` per claim the dialog makes, over the one hand-built tree above. See 0007.
// oxlint-disable-next-line max-lines-per-function
describe("the Export Audio dialog", () => {
  it("names itself and offers the export, in the one place the name is declared", () => {
    const shown = tree().map((element) => words(element.props.children));
    // Twice, and both from the holder: the box's title and the button that starts the render say
    // one word. A surface that goes back to typing it leaves one of the two behind.
    expect(shown.filter((said) => said === EXPORT_AUDIO)).toHaveLength(2);
  });

  /**
   * The name is pre-filled and editable — a field with a value, not a fixed filename (P40), and
   * what it is filled with is the yard being exported rather than one string every export shares.
   * The date it ends with is read off the wall clock as the dialog opens, so it is asserted by
   * its shape: comparing against a second live call would disagree across a minute boundary,
   * which is exactly the difference P95 put in the name.
   */
  it("pre-fills the file name with the active yard's own, and the minute it opened in", () => {
    const name = tree().find((element) => element.props.id === "export-audio-name");
    const separator = EXPORT_NAME_SEPARATOR;
    // Three fields, because this yard has no source to be named after: the day, the app's own
    // name with the minute on it, and the yard as the one word a field is (P114).
    expect(name?.props.value).toMatch(
      new RegExp(
        `^\\d{4}-\\d{2}-\\d{2}${separator}${EXPORT_AUDIO_FILE.base}-\\d{4}` +
          `${separator}${exportNameField(INITIAL_YARD_NAME)}$`,
        "u",
      ),
    );
    expect(name?.props.value).not.toBe(EXPORT_AUDIO_FILE.base);
  });

  /** The length in the two units it is said in, where the take begins, and a fade at each end. */
  it("asks for a length in minutes and seconds, a lookback, and a fade at each end", () => {
    const labelled = tree().flatMap((element) =>
      element.props.label === undefined ? [] : [element.props.label],
    );
    expect(labelled).toEqual([
      "Length (Minutes)",
      "Length (Seconds)",
      "Start (Seconds Ago)",
      "Fade In (Seconds)",
      "Fade Out (Seconds)",
    ]);
    const fields = tree().flatMap((element) =>
      element.props.id === undefined ? [] : [element.props.id],
    );
    expect(fields).toEqual([
      "export-audio-name",
      "export-audio-minutes",
      "export-audio-secs",
      "export-audio-takes",
      "export-audio-back",
      "export-audio-fade-in",
      "export-audio-fade-out",
      "export-audio-session",
    ]);
  });

  /**
   * P91: the session leaves in the folder beside the audio unless someone says otherwise, because
   * a take nobody can reopen the performance of has left the instrument for good.
   */
  it("offers the session beside the audio, checked", () => {
    const box = tree().find((element) => element.props.id === "export-audio-session");
    expect(box?.props.checked).toBe(true);
    const labels = tree().flatMap((element) =>
      element.props.htmlFor === "export-audio-session" ? [words(element.props.children)] : [],
    );
    expect(labels).toEqual([EXPORT_WITH_SESSION]);
  });

  /** Ten minutes, said as ten and a zero rather than as the 600 the spec carries underneath. */
  it("pre-fills the default length as ten minutes and no seconds", () => {
    const field = (id: string) => tree().find((element) => element.props.id === id)?.props.value;
    expect(field("export-audio-minutes")).toBe(EXPORT_DEFAULT_MINUTES);
    expect(field("export-audio-secs")).toBe(0);
    expect(exportSecsOf(EXPORT_DEFAULT_MINUTES, 0)).toBe(defaultExportSecs());
    expect(tree().find((element) => element.props.id === "export-audio-fade-in")?.props.value).toBe(
      0,
    );
  });

  /**
   * P149: the take begins where the ear is, so the box opens on a lookback of nought and says
   * which seconds of the performance that is — the one thing about a take that a person cannot
   * read off the fields they typed.
   */
  it("opens on a take from where the ear is, and says where in the performance that is", () => {
    const back = tree().find((element) => element.props.id === "export-audio-back");
    expect(back?.props.value).toBe(0);
    // A page that has only just opened has nothing behind the ear: the take is the cold one.
    expect(begins(instrument)).toBe("Begins 0m 0s into the performance");
    // A minute and a half in, the same lookback of nought is a minute and a half of warm-up.
    expect(begins(createInstrument(manualClock(90)))).toBe("Begins 1m 30s into the performance");
  });

  /**
   * Principle 5: a performance older than the hour a tab can hold warms to the hour, so the take
   * begins earlier in it than the lookback asked and further behind the ear — said in the box
   * rather than found in the file.
   */
  it("says when the cap is what decides where the take begins", () => {
    const older = createInstrument(manualClock(EXPORT_MAX_SECS * 2));
    const room = (EXPORT_MAX_SECS - defaultExportSecs()) / EXPORT_SECS_PER_MINUTE;
    expect(begins(older)).toBe(
      `Begins ${room}m 0s into the performance — as near the ear as ` +
        `${EXPORT_MAX_SECS / EXPORT_SECS_PER_MINUTE} minutes of render reaches`,
    );
  });

  /**
   * P166: a rate is a measurement of this machine, so a session that has measured none has no
   * figure to give — and a made-up one is worse than a stated unknown (principle 5).
   */
  it("says the shape of the answer where this session has rendered nothing", () => {
    seam.rate = null;
    expect(takes()).toBe(EXPORT_TAKES_UNMEASURED);
  });

  /** And once it has measured one, the figure, said as the estimate it is. */
  it("says how long a take will take at the speed this session last managed", () => {
    // Twenty seconds of audio a second, against the ten minutes the box opens on.
    seam.rate = 20;
    expect(takes()).toBe(exportTakesSaid(defaultExportSecs(), 20));
    expect(takes()).toBe("About 30s, at the speed this session last managed");
  });

  /**
   * The figure is for the render and not for the length that was typed: the warm-up is rendered in
   * front of the take and dropped (0216), so the seconds this machine has to produce are the whole
   * of both — and how many of them there are is what the session has to settle for (0239). The box
   * has to read that off the same session the door will, or it prices a render nobody runs.
   */
  it("counts the warm-up the session actually needs into the figure", () => {
    seam.rate = 20;
    // Ten minutes into the performance with a rack that remembers everything, a ten-minute take
    // from where the ear is renders twenty: an automator's standing instances are a function of
    // how long it has been going, so no window reconstructs them.
    const running = createInstrument(manualClock(defaultExportSecs()));
    running.send({ t: "deck.add", deck: "z", emoji: "🌾", name: "Settle Yard" });
    running.send({ t: "effect.add", deck: "z", id: "aut", effect: "automator" });
    expect(takes(running)).toBe(exportTakesSaid(defaultExportSecs() * 2, 20));
    expect(takes(running)).toBe("About 1m 00s, at the speed this session last managed");
    // The same ten minutes with nothing in the rack renders the take and the second it settles
    // in, which is the whole of what P181 bought.
    running.send({ t: "effect.remove", deck: "z", instance: "aut" });
    expect(takes(running)).toBe(exportTakesSaid(defaultExportSecs() + SETTLE_FLOOR_SECS, 20));
  });

  /**
   * 0056: Playwright waits out a popup's enter and exit animations before it may click. This one
   * has none — on the popup and on the backdrop behind it, which animates on its own.
   */
  it("opens with no animation for the driver to wait out", () => {
    const content = tree().find((element) => element.props.overlayClassName !== undefined);
    expect(content?.props.className).toContain("duration-0");
    expect(content?.props.overlayClassName).toContain("duration-0");
  });
});
