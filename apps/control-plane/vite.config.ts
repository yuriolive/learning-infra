import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      "protobufjs/minimal": "protobufjs/minimal",
      protobufjs: "protobufjs/minimal",
    },
  },
  build: {
    target: "esnext",
    minify: true,
    ssr: true,
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: "src/index.ts",
      output: {
        format: "esm",
        entryFileNames: "index.js",
      },
      external: ["cloudflare", /^node:/],
    },
  },
});
