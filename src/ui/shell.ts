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

/**
 * A popup the browser smoke opens does not animate: Playwright waits an enter and an exit
 * animation out before it may click, which cost the gate ~450ms across three gestures (0056).
 * Every popup in the app carried the class itself, and four of them re-narrated the reason —
 * declared here because the primitives that would otherwise hold it are regenerated (0003).
 */
export const INSTANT_POPUP = "duration-0";

/**
 * The body under that header: centred at the one measure, and inset the same as the header row
 * above it — which is what lines the two up, and what a per-surface gutter would quietly break
 * the way a per-surface width once did (0074). What a surface arranges inside it stays its own.
 */
export const SHELL_BODY = `mx-auto px-6 py-8 ${SHELL_WIDTH}`;

/**
 * Where a surface says out loud that something did not go: the header row draws it, because the
 * menu or dialog that caused it has already shut. `null` clears the last one. One value travels
 * the whole prop chain and seven signatures used to describe it separately.
 */
export type ReportError = (message: string | null) => void;
