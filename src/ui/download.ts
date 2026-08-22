/**
 * @role Handing a file to the browser as a download — the anchor dance, once, for every thing that
 *   leaves the app — and handing it a folder of them as the one archive a desktop unpacks back
 *   into that folder.
 * @instead What the file contains → src/lib/sessionArchive.ts, src/ui/eventFeed.ts,
 *   src/app/exportAudio.ts. What a folder is written as → src/lib/zip.ts. The menu and the dialog
 *   that offer them → src/ui/FileMenu.tsx and src/ui/ExportAudioDialog.tsx, which both reach this
 *   rather than each other.
 */
import { ZIP_FILE, zipFolder } from "@/lib/zip";

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

/**
 * Several files as one folder, downloaded once. The browser's download door takes a name and not
 * a path — Chromium turns every separator in the `download` attribute into an underscore, which
 * is the security rule that keeps a page from writing outside the downloads directory — so the
 * only way to hand someone a directory is to hand them the archive of one (P91).
 *
 * Returns what the download was called, because the surface that started it says so out loud.
 */
export async function downloadFolder(folder: string, files: readonly File[]): Promise<string> {
  const entries = await Promise.all(
    files.map(async (file) => ({
      name: file.name,
      bytes: new Uint8Array(await file.arrayBuffer()),
    })),
  );
  const name = `${folder}${ZIP_FILE.extension}`;
  downloadFile(new File([zipFolder(folder, entries)], name, { type: ZIP_FILE.mediaType }));
  return name;
}
