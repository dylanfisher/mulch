/**
 * @role The gallery's own layout — the frame every dev section and specimen sits in.
 * @instead Never lay a section out by hand: the spacing is decided once, here.
 */
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/** Every section and every specimen on the dev page is framed by these two. */
export function Section({
  id,
  title,
  summary,
  children,
}: {
  id: string;
  title: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <section id={id}>
      <header className="mb-3">
        <h2 className="type-title">{title}</h2>
        <p className="type-body text-muted-foreground">{summary}</p>
      </header>
      <div className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </section>
  );
}

export function Specimen({
  name,
  wide = false,
  children,
}: {
  name: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-3 bg-background p-4", wide && "sm:col-span-2")}>
      {/* A label, so `type-eyebrow` and not `type-readout` — mono is the numeric treatment,
          and the gallery is the last place that distinction should be shown broken. */}
      <div className="type-eyebrow text-muted-foreground">{name}</div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
