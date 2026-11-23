import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node" },
  resolve: {
    alias: {
      "server-only": new URL("./lib/test/empty.ts", import.meta.url).pathname,
      // app/api のテストで、tsconfig と同じ「@/」を使う
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
