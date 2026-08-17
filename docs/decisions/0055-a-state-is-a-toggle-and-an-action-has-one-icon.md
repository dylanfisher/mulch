# 0055. A state is a toggle, and an action has one icon

- **Date:** 2026-08-16
- **Status:** accepted

A control that leaves the instrument in a state a person can see is a `Toggle` — play, loop, snap — and the toggle itself reports that state as `aria-pressed`; a state that is only ever on or off, with nothing the picture on it could add, is a `Switch` instead, which is what bypass became (0076); a control whose gesture happens once per press stays a `Button`. A swapped `variant` beside a hand-written `aria-pressed` is neither, and is what this replaces. A toggle bound to session state is controlled: `pressed` is read off the store and the change handler sends the ordinary command, so a control can never hold an opinion the instrument does not share. A mutually exclusive set is one `ToggleGroup`, not a row of buttons.

Every action's icon is declared once, in `ACTION_ICONS` in `src/ui/icons.ts`, keyed by what the control does rather than where it sits, and imported per icon from `@phosphor-icons/react` rather than through the barrel. Remove is the same picture on a deck, a clip and a rack instance, and the gallery draws the real icons for the actions it names rather than choosing its own. What is _not_ an action — an effect, a theme — carries its icon beside its own identity, never as a second map from ids to pictures. An icon-only control keeps the `aria-label` that names what it acts on, because the name is the whole of what a driver and a screen reader have.
