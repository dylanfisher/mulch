/** @role What the Export Audio dialog asks for, and the one thing 0056 says a driven popup must be. */
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

// The two hooks the dialog holds, made callable outside a renderer the way src/ui/FileMenu.test.tsx
// makes that menu's callable. Nothing here presses anything: what is asserted is the shape a
// first render produces.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useState: (initial: unknown) => [initial, () => {}],
  };
});

import { manualClock } from "@/app/clock";
import { defaultExportName, EXPORT_AUDIO_FILE } from "@/app/exportAudio";
import { createInstrument } from "@/app/facade";
import { ExportAudioDialog, ExportAudioForm } from "@/ui/ExportAudioDialog";

type Props = {
  className?: string;
  overlayClassName?: string;
  htmlFor?: string;
  id?: string;
  label?: string;
  value?: unknown;
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
 */
function tree(): ReactElement<Props>[] {
  const dialog = ExportAudioDialog({
    instrument,
    open: true,
    onOpenChange: () => {},
    onError: () => {},
  });
  const body = ExportAudioForm({ instrument, onClose: () => {}, onError: () => {} });
  return [...elements(dialog), ...elements(body)];
}

const words = (children: ReactNode): string =>
  Children.toArray(children)
    .filter((child): child is string => typeof child === "string")
    .join("");

describe("the Export Audio dialog", () => {
  it("names itself and offers the export", () => {
    const shown = tree().map((element) => words(element.props.children));
    expect(shown).toContain("Export Audio");
  });

  /**
   * The name is pre-filled and editable — a field with a value, not a fixed filename (P40), and
   * what it is filled with is the yard being exported rather than one string every export shares.
   */
  it("pre-fills the file name with the active yard's own", () => {
    const name = tree().find((element) => element.props.id === "export-audio-name");
    expect(name?.props.value).toBe(defaultExportName(instrument.state.getState()));
    expect(name?.props.value).not.toBe(EXPORT_AUDIO_FILE.name);
  });

  /** The length to render, and a fade at each end, each as its own labelled field. */
  it("asks for a length and a fade at each end", () => {
    const labelled = tree().flatMap((element) =>
      element.props.label === undefined ? [] : [element.props.label],
    );
    expect(labelled).toEqual(["Length (Seconds)", "Fade In (Seconds)", "Fade Out (Seconds)"]);
    const fields = tree().flatMap((element) =>
      element.props.id === undefined ? [] : [element.props.id],
    );
    expect(fields).toEqual([
      "export-audio-name",
      "export-audio-secs",
      "export-audio-fade-in",
      "export-audio-fade-out",
    ]);
  });

  /** A session with nothing loaded still offers a length rather than a render of no seconds. */
  it("pre-fills a length nothing can refuse", () => {
    const secs = tree().find((element) => element.props.id === "export-audio-secs");
    expect(secs?.props.value).toBeGreaterThan(0);
    expect(tree().find((element) => element.props.id === "export-audio-fade-in")?.props.value).toBe(
      0,
    );
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
