/**
 * @role The two facts both top-level screens lay out to: how wide the shell gets, and what its
 *   header is — declared once here so the instrument and the gallery cannot drift apart (0054).
 * @instead The screens themselves → src/ui/App.tsx, src/ui/dev/DevPage.tsx.
 */

/**
 * How wide a screen gets before it stops growing. Declared here and nowhere below it: a deck, a
 * rack, a waveform or a gallery section that carried a width of its own would stop tracking this
 * one the day it changes (0054). Both routes read it, so the yard area and the primitives page
 * are the same measure (P46).
 */
export const SHELL_WIDTH = "max-w-7xl";

/**
 * The header both screens wear: fixed at the top of the viewport, over a blurred background, so
 * the menus stay reachable however far the instrument is scrolled (P46).
 */
export const SHELL_HEADER =
  "sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur";
