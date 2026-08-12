/** @role The mulch wordmark — recycle mark plus name, at whatever size the caller sets. */
import { RecycleIcon } from "@phosphor-icons/react";

import { cn } from "@/lib/cn";

/**
 * The same recycle mark is the favicon — see `public/favicon.svg`, which carries a copy
 * of this icon's path because it is fetched outside the app.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <RecycleIcon weight="regular" className="size-[1.2em] text-primary" />
      <span className="font-semibold tracking-tight">mulch</span>
    </span>
  );
}
