import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // Worker threads rather than the default forked processes: same isolation, ~10% less
    // startup. `isolate: false` and `experimental.fsModuleCache` were measured too — each
    // worth ~30ms here, neither worth the shared-state or the experimental flag.
    pool: "threads",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
