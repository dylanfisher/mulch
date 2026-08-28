/**
 * @role A button that reports the state of the async work it kicked off, in its own label.
 * @instead A button that does not await → src/ui/components/button.tsx.
 */
import {
  type ComponentProps,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { Button } from "@/ui/components/button";

/**
 * A button whose label reports the state of the work it kicked off: idle → busy →
 * (briefly) done. Anything that awaits — export, save, load — uses this rather than
 * hand-rolling a `busy` flag at the call site.
 *
 * `busy` may be passed to drive the state from outside; left undefined, the button
 * tracks the promise returned by `onAction` itself.
 *
 * Nine lines over the cap, all of them the prop list and its type. There is no second
 * behaviour in here to lift out — see docs/decisions/0007-reviewed-oversized-functions.md.
 */
// oxlint-disable-next-line max-lines-per-function
function AsyncButton({
  children,
  busyLabel,
  doneLabel,
  doneDurationMs = 1200,
  busy,
  disabled,
  onAction,
  ...props
}: Omit<ComponentProps<typeof Button>, "onClick"> & {
  busyLabel: ReactNode;
  doneLabel?: ReactNode;
  doneDurationMs?: number;
  busy?: boolean;
  onAction: () => void | Promise<void>;
}) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const timeout = useRef(0);
  const isBusy = busy ?? running;

  useEffect(() => {
    return () => {
      window.clearTimeout(timeout.current);
    };
  }, []);

  const handleClick = useCallback(() => {
    if (isBusy) return;
    setRunning(true);
    setDone(false);
    // No `catch` on purpose — principle 5. The button recovers either way, but a failed
    // export or save surfaces as an unhandled rejection rather than a silent no-op.
    void (async () => {
      try {
        await onAction();
        if (doneLabel === undefined) return;
        setDone(true);
        window.clearTimeout(timeout.current);
        timeout.current = window.setTimeout(() => {
          setDone(false);
        }, doneDurationMs);
      } finally {
        setRunning(false);
      }
    })();
    // oxlint-disable-next-line react/memo-dependencies -- exhaustive-deps requires all four
  }, [doneDurationMs, doneLabel, isBusy, onAction]);

  return (
    <Button
      data-slot="async-button"
      disabled={disabled === true || isBusy}
      onClick={handleClick}
      {...props}
    >
      {isBusy ? busyLabel : done ? doneLabel : children}
    </Button>
  );
}

export { AsyncButton };
