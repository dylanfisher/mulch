/** @role The theme picker: light / system / dark, in that order, matching the spectrum. */
import { useMemo } from "react";
import { MonitorIcon } from "@phosphor-icons/react/Monitor";
import { MoonIcon } from "@phosphor-icons/react/Moon";
import { SunIcon } from "@phosphor-icons/react/Sun";

import { ToggleGroup, ToggleGroupItem } from "@/ui/components/toggle-group";
import { isTheme, setTheme, type Theme, THEMES, useTheme } from "@/ui/theme";

/**
 * The picture each theme carries. Beside the theme's own identity rather than in `ACTION_ICONS`,
 * which is for actions (src/ui/icons.ts) — and exported, because the palette's Toggle Theme entry
 * shows the one it is on and must not choose a second picture for it (0055).
 */
export const THEME_ICONS: Record<Theme, typeof SunIcon> = {
  light: SunIcon,
  system: MonitorIcon,
  dark: MoonIcon,
};

/** Base UI clears the group when the pressed item was already on; a theme is always one
    of the three, so an empty selection just means "no change". */
function onValueChange(value: string[]) {
  const [next] = value;
  if (isTheme(next)) setTheme(next);
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme();
  const value = useMemo(() => [theme], [theme]);

  return (
    <ToggleGroup
      value={value}
      onValueChange={onValueChange}
      variant="outline"
      size="sm"
      spacing={0}
      aria-label="Theme"
      className={className}
    >
      {THEMES.map((name) => {
        const Icon = THEME_ICONS[name];
        return (
          <ToggleGroupItem key={name} value={name} aria-label={name}>
            <Icon />
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
