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

/**
 * How tall the row is before anything in it asks for more: the bar the menubar already makes —
 * its own `h-8` (src/ui/components/menubar.tsx) plus this row's `py-3` on both edges, which is a
 * number the minimum has to carry itself because `box-sizing: border-box` measures the padding
 * inside it. Declared here because the height of the bar is a shell fact — left to what a screen
 * happens to put in the row, the instrument's header stood 56px and the gallery's and the drift
 * overlay's stood 52px, and the one header three surfaces share was three heights (0074, P80). A
 * taller control still grows the row.
 */
export const SHELL_HEADER_ROW_HEIGHT = "min-h-14";

/**
 * The row inside it: where a heading sits, how far it runs and how tall it stands, at the one
 * measure above. Declared beside the treatment it fills because a third surface now wears this
 * header — the drift's own overlay — and a header restated a third time is a header that stops
 * tracking this one.
 */
export const SHELL_HEADER_ROW = `mx-auto flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3 ${SHELL_HEADER_ROW_HEIGHT} ${SHELL_WIDTH}`;
