/**
 * @role The hooks a knob suite mounts the knob on outside a renderer: one mount's refs and state
 *   cells in hook order, so a re-render sees the same ref a real mount would, and the module React
 *   is replaced with to hand them out. Shared, because the knob's gestures and its popover menu are
 *   two suites over exactly one mount, and a mock of five hooks written twice is two mounts to
 *   keep in step (principle 1).
 * @instead The mount itself, and the walks that read it → src/ui/parameterKnobDouble.ts. Nothing
 *   here is production code; a suite hands `mockReact` to `vi.mock("react")`.
 */
import type * as ReactTypes from "react";

/** One mount's refs, in hook order: emptied per mount, rewound per render. */
export const mount: { refs: { current: unknown }[]; index: number } = { refs: [], index: 0 };

/** React with its five hooks replaced — the shape a `vi.mock` factory returns, typed as it is. */
export const mockReact = (react: typeof ReactTypes) => ({
  ...react,
  memo: (component: unknown) => component,
  useCallback: (callback: unknown) => callback,
  useRef: (initial: unknown) => (mount.refs[mount.index++] ??= { current: initial }),
  // The same one mount's cells, in the same hook order: a setter writes the cell and the next
  // hand-called render reads it, which is the sequence React would flush.
  useState: (initial: unknown) => {
    const cell = (mount.refs[mount.index++] ??= { current: initial });
    const set = (next: unknown) => {
      cell.current = next;
    };
    return [cell.current, set];
  },
  // Called rather than scheduled: these renders are plain function calls, and what the effect
  // does — commit a recording once Option is up — is idempotent, so running it per render is
  // the same sequence React would flush after one.
  useEffect: (effect: () => void) => {
    effect();
  },
});
