# 0105 — A claimed key leaves the dispatch

`useKeyboardShortcuts` listens on `document` in the **capture** phase, and a press it claims is
both `preventDefault`ed and `stopPropagation`ed. Nothing focused ever sees it.

Bubbling was the defect: whatever had focus had already answered the press by the time the
registry prevented it, so Space with the File menu's trigger focused opened the menu and played
every yard. Capture alone is not the whole fix. `preventDefault` stops the browser's own default
action and the controls polite enough to read `defaultPrevented`; a Base UI composite item is not
one of those for Space — `useButton` returns early on a prevented Space only when the item carries
a `menuitem`, `option` or `gridcell` role, and otherwise dispatches its own click regardless.
Measured in Chromium against the built app: with the header's theme toggle focused, capture plus
`preventDefault` alone set the theme _and_ started every yard, which is the same defect one
control further along.

So the claim is both halves, applied at every site that answers a key — the palette, the debug
console and the registry. The consequence to know: from this listener `event.defaultPrevented` is
always false, so the `defaultPrevented` guards inside `commandsForShortcut`,
`isDebugConsoleToggle` and `isPaletteToggle` are reachable only from their own tests and from a
future second caller. They stay, because they are the registry's contract rather than this
listener's.
