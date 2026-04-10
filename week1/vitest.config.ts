import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@/client": path.resolve(__dirname, "app/client/src/generated"),
    },
  },
  test: {
    hookTimeout: 120_000,
    testTimeout: 1_000_000,
  },
});
