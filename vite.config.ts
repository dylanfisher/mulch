import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { minify, type Plugin } from "vite";
import { defineConfig } from "vitest/config";

/** Where the audio worklets live: each is emitted whole through `?url` (src/audio/worklet.ts). */
const WORKLETS = "src/audio/worklets/";

/**
 * The worklets, minified. `?url` emits a file byte for byte, comments and all, and boot awaits
 * every one of them before the first paint (0088) — 87 kB of which 16 kB is code. A worklet
 * imports nothing, so minifying the file alone is the whole of bundling it.
 */
const minifiedWorklets = (): Plugin => ({
  name: "mulch:minified-worklets",
  apply: "build",
  async generateBundle(_options, bundle) {
    const worklets = Object.values(bundle).filter(
      (file) =>
        file.type === "asset" && file.originalFileNames.some((name) => name.startsWith(WORKLETS)),
    );
    await Promise.all(
      worklets.map(async (file) => {
        if (file.type !== "asset") return;
        const { code, errors } = await minify(file.fileName, String(file.source), {
          compress: true,
          mangle: true,
          module: true,
        });
        if (errors.length > 0) {
          throw new Error(`worklet ${file.fileName} did not minify: ${JSON.stringify(errors)}`);
        }
        file.source = code;
      }),
    );
  },
});

/** The one icon weight the instrument draws: Phosphor's default, which nothing overrides. */
const ICON_WEIGHT = "regular";

/**
 * Every Phosphor icon ships its six weights in one map, and only one is ever drawn — so the build
 * keeps that one, which is 136 kB of the first paint's script. Loud both ways: an icon whose map
 * holds no such weight throws here, and so does a source asking an icon for another weight, which
 * would otherwise draw an empty svg with no error (principle 5).
 */
const oneIconWeight = (): Plugin => ({
  name: "mulch:one-icon-weight",
  apply: "build",
  enforce: "pre",
  transform(code, id) {
    if (id.includes("/src/") && code.includes("@phosphor-icons/react")) {
      const other = /<\w*Icon\b[^>]*\bweight=(?!"regular")|IconContext/u.exec(code);
      if (other !== null) {
        throw new Error(`${id} asks an icon for a weight the build does not keep: ${other[0]}`);
      }
      return null;
    }
    if (!/@phosphor-icons\/react\/dist\/defs\/[^/]+\.es\.js$/u.test(id)) return null;
    const kept = new RegExp(String.raw`\[\s*"${ICON_WEIGHT}",[\s\S]*?\n  \]`, "u").exec(code);
    if (kept === null) throw new Error(`${id} holds no ${ICON_WEIGHT} weight`);
    return code.replace(/new Map\(\[[\s\S]*\]\)/u, `new Map([${kept[0]}])`);
  },
});

export default defineConfig({
  plugins: [oneIconWeight(), minifiedWorklets(), react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // Worker threads rather than the default forked processes: same isolation, ~10% less
    // startup. `isolate: false` and `experimental.fsModuleCache` were measured too — each
    // worth ~30ms here, neither worth the shared-state or the experimental flag.
    pool: "threads",
    // scripts/ is in because the profiler's comparison is arithmetic that decides what turns red,
    // and the browser it usually runs behind is not needed to test arithmetic.
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "scripts/**/*.test.js"],
  },
});
