/**
 * @role The `PlayerDoors` a test hands a door when what it is asking about is not the door. Nothing
 *   in production imports this file — it exists so the eight suites that draw a mulcher control
 *   share one shut set instead of each writing the pair out again, the way src/ui/keyPress.ts
 *   serves the shortcut tests (P135).
 * @instead What a door does with the set → src/ui/PlayerMore.tsx. Where the real one is held →
 *   src/ui/Deck.tsx.
 */
import { doorKey, type PlayerDoors } from "@/ui/PlayerMore";

/**
 * Shut by default, because that is the state every claim about a dial on the card is made in.
 * A suite asking what an *open* door draws names the doors it wants open by their own key, and one
 * asking what a press sends passes its own spy.
 */
export const doorsDouble = (
  open: string | null = null,
  setOpen: (open: string | null) => void = () => {},
  scope = "",
): PlayerDoors => ({ scope, open, setOpen });

/** The same, with that door open — named the way the card names it (`doorKey`). */
export const doorsOpen = (scope: string, title: string): PlayerDoors =>
  doorsDouble(doorKey(scope, title), () => {}, scope);
