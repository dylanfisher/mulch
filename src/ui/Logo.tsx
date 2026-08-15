/** @role The mulch wordmark — recycle mark plus name, at whatever size the caller sets. */
import { RecycleIcon } from "@phosphor-icons/react/Recycle";

import { cn } from "@/lib/cn";

/**
 * The same recycle mark is the favicon — see `public/favicon.svg`, which carries a copy
 * of this icon's path because it is fetched outside the app.
 *
 * The wordmark carries no type of its own: the caller passes the variation it needs —
 * `type-display` on the landing screen, `type-title` in a bar — and the mark follows at
 * `1.2em`. Weight and tracking live in those utilities, so the two sizes cannot drift.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <RecycleIcon weight="regular" className="size-[1.2em] text-primary" />
      <span>mulch</span>
    </span>
  );
}
