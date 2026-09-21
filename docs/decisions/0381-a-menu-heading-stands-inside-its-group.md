# 0381 — A menu heading stands inside its group

- **Date:** 2026-09-20
- **Status:** accepted

**A `DropdownMenuLabel` is written inside the group it heads** — a `DropdownMenuGroup` or a
`DropdownMenuRadioGroup`, either of which provides the context — and a menu's own suite reads
that it is.

**Because the heading reads its group off that context and throws when there is none.** Base UI's
`Menu.GroupLabel` calls `useMenuGroupRootContext`, which throws
`Base UI: MenuGroupContext is missing` (production error 31) while the popup renders. There is no
boundary between the menu and the root one in `src/main.tsx`, so the throw does not merely fail
to open the menu: it replaces the whole instrument with the error fallback, which is the word the
human used. Nothing under the UI was wrong — the command chain carries an instance between two
yards, onto the master and back, with its values, its lanes and its bypass, and neither the store
nor the real graph over a fake context emits a refusal. `src/ui/SourcePicker.tsx` had already
paid for this once and wrote the rule in a comment; it was a comment in one file rather than a
fact a test holds, so the next menu repeated it.

**What this costs:** a heading that heads nothing still needs a group around it, which is one
element more than the markup wants. The check is structural — the popup is a portal that renders
nothing outside a browser, so no node-environment test can watch the throw itself, and the
browser proof is `scripts/smoke.d/moveCard.js`, which the local gate alone runs (0380).

**Not chosen:** a `try`/`catch` or an error boundary around the menu. A guard that swallows this
leaves a control that opens onto nothing, and the step refused one.
