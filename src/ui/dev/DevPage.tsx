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
import { SurfacesSection } from "@/ui/dev/SurfacesSection";
import { TogglesSection } from "@/ui/dev/TogglesSection";
import { Logo } from "@/ui/Logo";
import { ThemeToggle } from "@/ui/ThemeToggle";

/**
 * Every generic control mulch has, on one page, with nothing from the audio graph
 * behind it. Section ids double as the nav's anchors, so this list is the only place
 * the set of sections is written down.
 */
const SECTIONS = [
  { id: "buttons", label: "Buttons", Content: ButtonsSection },
  { id: "toggles", label: "Toggles", Content: TogglesSection },
  { id: "inputs", label: "Inputs", Content: InputsSection },
  { id: "knobs", label: "Knobs", Content: KnobsSection },
  { id: "surfaces", label: "Surfaces", Content: SurfacesSection },
  { id: "overlays", label: "Overlays", Content: OverlaysSection },
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
            <Logo className="text-sm" />
            <span className="text-xs text-muted-foreground">primitives</span>
            <nav className="ml-auto flex flex-wrap items-center gap-3">
              {SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={DEV_ROUTE}
                  data-section={section.id}
                  onClick={scrollToSection}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {section.label}
                </a>
              ))}
            </nav>
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-8">
          {SECTIONS.map(({ id, Content }) => (
            <Content key={id} />
          ))}
        </main>
      </div>
    </TooltipProvider>
  );
}
