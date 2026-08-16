import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

/** One mount's state cells, in hook order, so a re-render sees what the last one set. */
let cells: boolean[] = [];
let cell = 0;

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useMemo: (factory: () => unknown) => factory(),
    useState: (initial: boolean) => {
      const index = cell++;
      cells[index] ??= initial;
      return [
        cells[index],
        (next: boolean) => {
          cells[index] = next;
        },
      ];
    },
  };
});

import type { DragGesture } from "@/ui/fileDrop";
import { useFileDrop } from "@/ui/fileDrop";

/** The surface, re-read after every gesture, so what its highlight reports is observable. */
const surface = (onFile: (file: File) => void) => {
  cells = [];
  return () => {
    cell = 0;
    return useFileDrop(onFile);
  };
};

/** A drag carrying `names` — and carrying files at all, unless `types` says otherwise. */
const dragging = (names: string[] = [], { types = ["Files"] }: { types?: string[] } = {}) => {
  const files = names.map((name) => new File([new Uint8Array([1])], name, { type: "" }));
  let prevented = false;
  const event: DragGesture = {
    preventDefault: () => {
      prevented = true;
    },
    // A drag-over reads only the kinds it carries; a drop is the first look at the files.
    dataTransfer: {
      types,
      dropEffect: "none",
      files: { item: (index: number) => files[index] ?? null },
    },
  };
  return { event, files, prevented: () => prevented };
};

describe("useFileDrop", () => {
  it("hands over the first of several dropped files, and only the first", () => {
    const taken: File[] = [];
    const read = surface((file) => {
      taken.push(file);
    });
    const { event, files, prevented } = dragging(["first.wav", "second.wav"]);

    read().onDrop(event);

    // Unprevented, the browser leaves the page to open the file instead of dropping it here.
    expect(prevented()).toBe(true);
    expect(taken).toEqual([files[0]]);
  });

  it("hands over nothing when the drop carries no file at all", () => {
    const taken: File[] = [];
    const read = surface((file) => {
      taken.push(file);
    });

    read().onDrop(dragging().event);

    expect(taken).toEqual([]);
  });
});

describe("useFileDrop highlight", () => {
  it("lights up on drag-over and clears again on drop", () => {
    const read = surface(() => {});
    expect(read()["data-dropping"]).toBe(false);

    const over = dragging(["first.wav"]);
    read().onDragOver(over.event);

    expect(read()["data-dropping"]).toBe(true);
    expect(over.prevented()).toBe(true);
    // The cursor says what the drop will do before it happens.
    expect(over.event.dataTransfer.dropEffect).toBe("copy");

    read().onDrop(dragging(["first.wav"]).event);
    expect(read()["data-dropping"]).toBe(false);
  });

  // A drag abandoned with Escape is announced as a leave from where the pointer still is, so a
  // leave that asked whether the pointer had really gone would leave the surface lit for good.
  it("clears on a leave that says the pointer never moved", () => {
    const read = surface(() => {});
    read().onDragOver(dragging(["first.wav"]).event);

    read().onDragLeave(dragging().event);

    expect(read()["data-dropping"]).toBe(false);
  });

  it("is not a target for a drag that carries no files", () => {
    const read = surface(() => {});
    const { event, prevented } = dragging(["first.wav"], { types: [] });

    read().onDragOver(event);

    expect(read()["data-dropping"]).toBe(false);
    // Not ours, so whatever the browser meant to do with this drag still happens.
    expect(prevented()).toBe(false);
  });
});
