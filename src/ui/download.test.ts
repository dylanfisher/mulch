/**
 * @role The anchor dance every file leaving the app goes through, and the one ordering in it that
 *   is easy to get wrong: the URL is given back after the click has consumed it, never before,
 *   and the anchor comes out of the page whether or not the click went through.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { downloadFile } from "@/ui/download";

/** The anchor the code builds, and what the page did with it, in the order it happened. */
type Anchor = { href: string; download: string; click: () => void; remove: () => void };

let anchor: Anchor;
let log: string[];
let revoked: string[];
/** What the click does — a real one navigates; a blocked popup throws out of it. */
let onClick: () => void;

beforeEach(() => {
  log = [];
  revoked = [];
  onClick = () => {};
  anchor = {
    href: "",
    download: "",
    click: () => {
      log.push("click");
      onClick();
    },
    remove: () => {
      log.push("remove");
    },
  };
  vi.stubGlobal("document", {
    createElement: () => anchor,
    body: { append: () => log.push("append") },
  });
  vi.stubGlobal("URL", {
    createObjectURL: () => "blob:the-archive",
    revokeObjectURL: (url: string) => {
      log.push("revoke");
      revoked.push(url);
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The task the revoke was deferred to, arrived. */
const laterTask = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

describe("handing a file to the browser", () => {
  it("offers it under its own name, and gives the URL back only once it is spent", async () => {
    downloadFile(new File([], "north-willow.wav"));
    expect(anchor).toMatchObject({ href: "blob:the-archive", download: "north-willow.wav" });
    // The navigation consumes the URL after the click is dispatched, not during it: revoked in
    // the same task and the download is of nothing.
    expect(log).toEqual(["append", "click", "remove"]);
    await laterTask();
    expect(log).toEqual(["append", "click", "remove", "revoke"]);
    expect(revoked).toEqual(["blob:the-archive"]);
  });

  it("takes the anchor back out of the page even when the click does not go through", async () => {
    onClick = () => {
      throw new Error("blocked");
    };
    expect(() => {
      downloadFile(new File([], "north-willow.wav"));
    }).toThrow("blocked");
    await laterTask();
    // Left in, it is one dangling anchor per attempt and one object URL held for the life of
    // the page — and the failure still belongs to the caller (principle 5).
    expect(log).toEqual(["append", "click", "remove", "revoke"]);
  });
});
