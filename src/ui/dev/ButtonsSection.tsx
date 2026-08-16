/** @role Gallery section: every button and async-button variant, size and state. */
import { YARD } from "@/lib/copy";
import { AsyncButton } from "@/ui/AsyncButton";
import { Button } from "@/ui/components/button";
import { Specimen } from "@/ui/dev/Specimen";
// The specimens name real actions, so they draw the real icons: a gallery that chose its own
// pictures would be the second declaration this vocabulary exists to prevent.
import { ACTION_ICONS } from "@/ui/icons";

const VARIANTS = ["default", "secondary", "outline", "ghost", "destructive", "link"] as const;
const SIZES = ["xs", "sm", "default", "lg"] as const;
const ICON_SIZES = ["icon-xs", "icon-sm", "icon", "icon-lg"] as const;

/** Resolves after `ms`, standing in for the export/save work these buttons will do. */
const pretend = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
const pretendExport = () => pretend(1500);
const pretendSave = () => pretend(900);

// A section is a flat list of specimens, not branching logic: the line count tracks how many
// primitives are on show. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function ButtonsSection() {
  return (
    <>
      <Specimen name="Variants" wide>
        {VARIANTS.map((variant) => (
          <Button key={variant} variant={variant}>
            {variant}
          </Button>
        ))}
      </Specimen>

      <Specimen name="Sizes">
        {SIZES.map((size) => (
          <Button key={size} size={size} variant="secondary">
            {size}
          </Button>
        ))}
      </Specimen>

      <Specimen name="With icons">
        <Button>
          <ACTION_ICONS.play data-icon="inline-start" />
          Play
        </Button>
        <Button variant="secondary">
          <ACTION_ICONS.stop data-icon="inline-start" />
          Stop
        </Button>
        <Button variant="outline">
          Export
          <ACTION_ICONS.exportSession data-icon="inline-end" />
        </Button>
      </Specimen>

      <Specimen name="Icon only">
        {ICON_SIZES.map((size) => (
          <Button key={size} size={size} variant="outline" aria-label={`Add ${YARD} (${size})`}>
            <ACTION_ICONS.add />
          </Button>
        ))}
        <Button size="icon" variant="destructive" aria-label={`Remove ${YARD}`}>
          <ACTION_ICONS.remove />
        </Button>
      </Specimen>

      <Specimen name="Disabled">
        <Button disabled>Play</Button>
        <Button variant="outline" disabled>
          Export
        </Button>
      </Specimen>

      <Specimen name="Async">
        <AsyncButton busyLabel="Exporting…" doneLabel="Exported" onAction={pretendExport}>
          Export mix
        </AsyncButton>
        <AsyncButton variant="outline" busyLabel="Saving…" doneLabel="Saved" onAction={pretendSave}>
          Save session
        </AsyncButton>
      </Specimen>
    </>
  );
}
