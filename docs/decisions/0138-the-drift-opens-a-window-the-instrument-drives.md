# 0138 — The drift opens a window the instrument drives

- **Date:** 2026-08-22
- **Status:** accepted, extending
  [0109](0109-the-drift-is-one-picture-at-two-sizes.md)

The large picture covered the instrument. Watching a yard drift while turning the knobs that make
it drift meant closing the picture to reach them, which is the one thing a picture of what a
performance is doing must not ask.

**The large picture is a second browser window, and the instrument drives it.** One `window.open`
per yard, named after the yard so asking twice reaches that window rather than stacking a second on
it, and one React root rendered from the opener into its body — the same `MoireOverlay` at both
sizes, with the same `useMoirePicture`, the same `useCanvasSurface` and the same frame loop
(0109). Nothing about the session moves: the second window holds no state, peeks the one facade,
and every command it can send is `send()` from the opener. Where a picture is drawn stays a view
preference — no command, nothing durable, no history entry (plan §2).

**A React tree in another document needs its own root, not a portal.** React attaches its listeners
at the root container, and an event in the popup's document never reaches the opener's — a portal
renders the markup and leaves every button dead. So the second window gets `createRoot` on its body
and a `render` on each of the owner's commits, which is what keeps the two documents one component
instead of two.

**The three things a canvas asks of a _window_, it asks of its own window.** `devicePixelRatio`,
`matchMedia` and `ResizeObserver` were read off the module's own, which is the opener's: a picture
on a second display would be baked to the first one's density and would watch the wrong screen for
the next change. `viewOf(node)` in `src/ui/canvasSurface.ts` answers with the node's own window,
and `bakeCanvas`, `watchDisplay`, `observeSize`, `paintMoire` and `inkThrough` all go through it.
An element belonging to no document falls back to this window, which is what every existing surface
and every hand-rolled test stand-in is. `getComputedStyle` — the ink, in `useCanvasSurface` and in
`moireScreen`'s channel tokens — is the fourth document-scoped read on that path and is left alone
on purpose: CSSOM resolves it against the _element's_ node document, not the caller's window, so it
already answers for the popup. `hairlinePx` still reads this module's global; it is used only by
the tape and the tone scope, which draw in the opener, and giving it a parameter no caller passes
would be a seam nobody crosses.

**A second document is dressed, not styled again.** `adoptStyles` clones the opener's `<style>` and
`<link rel=stylesheet>` tags into the new head and copies the classes the theme choice writes on
`<html>` and the shell writes on `<body>`. Cloned rather than shared because `adoptedStyleSheets`
only takes sheets a document constructed itself, and these are the app's own tags. So one set of
tokens dresses both documents and no colour is declared twice (boundaries). The `<html>` classes are
re-applied whenever the theme choice moves; `<body>` carries none in this app, so it is dressed once.

A cloned `<link>` loads asynchronously, so in a build the popup tree's first layout effect can read
its ink before the sheet lands. The repair is structural rather than lucky: an unstyled document
cannot give the picture's root the box a styled one does — it has no height at all until the sheet
arrives — so the `ResizeObserver` `useCanvasSurface` already holds fires when it lands and rebakes,
re-reading the token. Measured on the preview build at a device ratio of two, in both schemes: the
first photograph already carries the resolved token.

**A browser may refuse the window, and a refusal is not a failure.** `window.open` returns null
outside a user activation or under a blocker, so it is called from the click itself and `covering`
is what a refusal leaves: the same overlay over the opener's own page, which is exactly what P76
shipped. The window also closes when the opener goes away — nothing would be driving it — and a
window the person closes themselves reports back rather than leaving the hook holding one that is
not there.

**Only the picture crosses; the keyboard does not.** `src/ui/shortcuts.ts` stays bound to the
opener's document, so the palette and the Option arm are the instrument's and not the window's. The
one key the second document needs is its own Escape, which is why `useClosedByEscape` takes the
document it is bound on and nothing else did.

**The frame loop stays the opener's one loop.** The picture in the second window is painted from
`src/ui/frame.ts` like everything else, which is the boundary and is also the cost: a backgrounded
opener throttles its `requestAnimationFrame`, so a second window left in front of a hidden
instrument freezes. Giving the second document a loop of its own is a second RAF loop for one
picture, which plan §2 forbids; the honest close is a loop that can be driven by whichever document
is visible, and that is a change to what "the one frame loop" means rather than a patch here.
