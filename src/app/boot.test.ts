/**
 * @role The live host's start-up, checked on a held context and a held database: both are in
 *   flight at once, and either failing is reported without the other's fate being dropped.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { openLiveHost } from "./boot";

const ignore = (): void => {};

/** A promise and the two hands that settle it, for a step the test decides the end of. */
function held() {
  let resolve: () => void = ignore;
  let reject: (reason: unknown) => void = ignore;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

/** A context whose every `addModule` waits on the one gate the test holds. */
function heldContext() {
  const gate = held();
  const addModule = vi.fn(async () => {
    await gate.promise;
  });
  // oxlint-disable-next-line no-unsafe-type-assertion -- `audioWorklet.addModule` is all boot asks
  const ctx = { audioWorklet: { addModule } } as unknown as BaseAudioContext;
  return { ctx, gate, addModule };
}

/** A database factory whose one open request answers only when the test fires it. */
function heldFactory() {
  const listeners = new Map<string, () => void>();
  const request = {
    result: {},
    error: new Error("the database would not open"),
    addEventListener: (type: string, listener: () => void) => {
      listeners.set(type, listener);
    },
  };
  const open = vi.fn(() => request);
  // oxlint-disable-next-line no-unsafe-type-assertion -- `open` is all the repository asks of one
  const factory = { open } as unknown as IDBFactory;
  const fire = (type: "success" | "error") => {
    listeners.get(type)?.();
  };
  return { factory, open, fire };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the live host's start-up", () => {
  it("opens the database while the worklets are still loading", async () => {
    const { ctx, gate, addModule } = heldContext();
    const { factory, open, fire } = heldFactory();

    const opened = openLiveHost(ctx, factory);
    await Promise.resolve();
    // Neither step has finished, and both have begun: the open is not queued behind the fetches.
    expect(addModule).toHaveBeenCalled();
    expect(open).toHaveBeenCalledOnce();

    fire("success");
    gate.resolve();
    expect(typeof (await opened).load).toBe("function");
  });

  it("fails the moment the worklets do, with the database still opening", async () => {
    const { ctx, gate } = heldContext();
    const { factory } = heldFactory();

    const opened = openLiveHost(ctx, factory);
    gate.reject(new Error("a worklet would not load"));
    await expect(opened).rejects.toThrow(/worklet would not load/u);
  });

  it("logs a second failure that comes after the first rather than dropping it", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const { ctx, gate } = heldContext();
    const { factory, fire } = heldFactory();

    const opened = openLiveHost(ctx, factory);
    gate.reject(new Error("a worklet would not load"));
    await expect(opened).rejects.toThrow(/worklet would not load/u);
    expect(logged).not.toHaveBeenCalled();

    fire("error");
    await vi.waitFor(() => {
      expect(logged).toHaveBeenCalledWith(
        expect.stringContaining("failed too"),
        expect.objectContaining({ message: "the database would not open" }),
      );
    });
  });
});
