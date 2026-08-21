/**
 * @role One key press, built the way the dispatcher reads one: the code, and the modifiers a
 *   press that names none of them carries. Nothing in production imports this file — it exists so
 *   the three tests that ask the registry what a press means share one set of defaults instead of
 *   writing the seven fields out again, the way src/app/engineDouble.ts serves the seam tests.
 * @instead The registry that answers it → src/ui/shortcuts.ts. A real KeyboardEvent → the browser
 *   run in scripts/smoke.d/keyboard.js, which presses keys rather than describing them.
 */
import type { ShortcutInput } from "@/ui/shortcuts";

export const keyPress = (code: string, held: Partial<ShortcutInput> = {}): ShortcutInput => ({
  code,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  repeat: false,
  defaultPrevented: false,
  ...held,
});
