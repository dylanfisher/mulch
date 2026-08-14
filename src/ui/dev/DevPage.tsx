// The dependency count is the section count: this file exists to mount every section, and a
// barrel to hide that would trade a visible import list for an invisible one — the gallery's lazy
// chunk pulls the same modules either way. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-dependencies

/**
 * @role The gallery shell at #/dev — the nav, and the list of sections it mounts.
 * @instead Adding a primitive means adding it to a section here; an unlisted primitive
 *   is one nobody can see drift.
 */
import type { MouseEvent } from "react";

import { DEV_ROUTE } from "@/ui/App";
import { TooltipProvider } from "@/ui/components/tooltip";
import { ButtonsSection } from "@/ui/dev/ButtonsSection";
import { InputsSection } from "@/ui/dev/InputsSection";
import { KnobsSection } from "@/ui/dev/KnobsSection";
import { OverlaysSection } from "@/ui/dev/OverlaysSection";
import { Section } from "@/ui/dev/Specimen";
import { SurfacesSection } from "@/ui/dev/SurfacesSection";
import { TogglesSection } from "@/ui/dev/TogglesSection";
import { TypeSection } from "@/ui/dev/TypeSection";
import { Logo } from "@/ui/Logo";
import { ThemeToggle } from "@/ui/ThemeToggle";

/**
 * Every generic control mulch has, on one page, with nothing from the audio graph
 * behind it. A section's identity is written here and nowhere else: the id is both
 * the nav's anchor and the heading's, and the label is the heading. A section module
 * exports only its specimens, so the two cannot drift apart in separate files.
 */
const SECTIONS = [
  {
    id: "type",
    label: "Type",
    summary:
      "Every type variation. A call site names one of these and sets no size, weight, leading or tracking of its own.",
    Content: TypeSection,
  },
  {
    id: "buttons",
    label: "Buttons",
    summary: "Transport actions, deck actions and destructive operations.",
    Content: ButtonsSection,
  },
  {
    id: "toggles",
    label: "Toggles",
    summary: "Latched state — loop on/off, FX units armed, quantize division.",
    Content: TogglesSection,
  },
  {
    id: "inputs",
    label: "Inputs",
    summary: "Text and numeric entry, device pickers, and horizontal ranges.",
    Content: InputsSection,
  },
  {
    id: "knobs",
    label: "Knobs",
    summary:
      "Drag horizontally or vertically to change, Shift to refine, double-click to reset, arrow keys to step, Page Up/Down for ten.",
    Content: KnobsSection,
  },
  {
    id: "surfaces",
    label: "Surfaces",
    summary: "Panels, section dividers, status labels and the FX rack's tab strip.",
    Content: SurfacesSection,
  },
  {
    id: "overlays",
    label: "Overlays",
    summary:
      "Confirmations, parameter detail popovers and the hints that replace title attributes.",
    Content: OverlaysSection,
  },
];

/**
 * The nav scrolls rather than linking: the route is the whole hash, so a bare `#buttons`
 * would leave `#/dev` and unmount the gallery. Every link stays on the dev route.
 */
function scrollToSection(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  // The id rides on the link rather than a closure, so this stays one function for the page.
  const id = event.currentTarget.dataset["section"];
  const section = id === undefined ? null : document.getElementById(id);
  if (section === null) throw new Error(`No section is rendered for the nav item "${id}".`);
  section.scrollIntoView({ behavior: "smooth" });
}

export function DevPage() {
  return (
    <TooltipProvider>
      <div className="min-h-dvh">
        <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
            <Logo className="type-title" />
            <span className="type-body text-muted-foreground">primitives</span>
            <nav className="ml-auto flex flex-wrap items-center gap-3">
              {SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={DEV_ROUTE}
                  data-section={section.id}
                  onClick={scrollToSection}
                  className="type-body text-muted-foreground transition-colors hover:text-foreground"
                >
                  {section.label}
                </a>
              ))}
            </nav>
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-8">
          {SECTIONS.map(({ id, label, summary, Content }) => (
            <Section key={id} id={id} title={label} summary={summary}>
              <Content />
            </Section>
          ))}
        </main>
      </div>
    </TooltipProvider>
  );
}
