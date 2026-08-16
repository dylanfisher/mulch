/**
 * @role The mulch wordmark — recycle mark plus name, at whatever size the caller sets, and the
 *   way back to the instrument from every screen that is not it.
 * @instead Which screen is current → src/ui/routes.ts, which this asks rather than being told.
 */
import { RecycleIcon } from "@phosphor-icons/react/Recycle";

import { cn } from "@/lib/cn";
import { INSTRUMENT_ROUTE, type Route } from "@/ui/routes";

/**
 * The same recycle mark is the favicon — see `public/favicon.svg`, which carries a copy
 * of this icon's path because it is fetched outside the app.
 *
 * The wordmark carries no type of its own: the caller passes the variation it needs —
 * `type-display` on the landing screen, `type-title` in a bar — and the mark follows at
 * `1.2em`. Weight and tracking live in those utilities, so the two sizes cannot drift.
 */
export function Logo({ className }: { className?: string | undefined }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <RecycleIcon weight="regular" className="size-[1.2em] text-primary" />
      <span>mulch</span>
    </span>
  );
}

/**
 * The wordmark as every header mounts it: inert on the instrument, and a link home from the
 * gallery. The decision is made here rather than at each header, so a third screen gets the way
 * back by rendering the wordmark and naming the route it is on — which each header knows
 * without reading the hash, since a page is only mounted on its own route.
 */
export function Wordmark({ route, className }: { route: Route; className?: string | undefined }) {
  if (route === "instrument") return <Logo className={className} />;
  return (
    <a href={INSTRUMENT_ROUTE} className="transition-colors hover:text-primary">
      <Logo className={className} />
    </a>
  );
}
