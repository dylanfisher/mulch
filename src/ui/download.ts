/**
 * @role Handing a file to the browser as a download — the anchor dance, once, for every thing that
 *   leaves the app.
 * @instead What the file contains → src/lib/sessionArchive.ts, src/ui/eventFeed.ts,
 *   src/app/exportAudio.ts. The menu and the dialog that offer them → src/ui/FileMenu.tsx and
 *   src/ui/ExportAudioDialog.tsx, which both reach this rather than each other.
 */

/**
 * The `revokeObjectURL` timing below is the part that is easy to get wrong twice, which is why
 * this is one function and not a line at each caller.
 */
export function downloadFile(file: File): void {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  document.body.append(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    // The navigation consumes the URL after click dispatch. Keep it alive through this task,
    // then release it rather than retaining every archive for the lifetime of the page.
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 0);
  }
}
