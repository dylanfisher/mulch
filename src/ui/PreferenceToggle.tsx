/**
 * @role A header switch over one stored preference: the action's sentence on rest and its picture
 *   on the face, as an outline Toggle reporting `aria-pressed` (0055). The switch that uses it says
 *   which way pressed reads and what a press writes.
 * @instead The switches themselves → src/ui/DriftToggle.tsx, src/ui/DriftLookToggle.tsx,
 *   src/ui/SequencerToggle.tsx. A yard's own switch → src/ui/DeckMute.tsx.
 */
import { ACTION_TOOLTIPS } from "@/lib/copy";
import { Toggle } from "@/ui/components/toggle";
import { ACTION_ICONS } from "@/ui/icons";
import { Says } from "@/ui/Says";

/** An action with a sentence, which carries a picture under the same key (0055). */
type Action = keyof typeof ACTION_TOOLTIPS;

export function PreferenceToggle({
  action,
  pressed,
  onPressedChange,
  "aria-label": label,
  className,
}: {
  action: Action;
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  "aria-label": string;
  className?: string | undefined;
}) {
  const Icon = ACTION_ICONS[action];
  return (
    <Says what={ACTION_TOOLTIPS[action]}>
      <Toggle
        variant="outline"
        size="sm"
        pressed={pressed}
        onPressedChange={onPressedChange}
        aria-label={label}
        className={className}
      >
        <Icon />
      </Toggle>
    </Says>
  );
}
