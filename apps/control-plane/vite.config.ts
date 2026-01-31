import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: [
      { find: /^protobufjs$/, replacement: "protobufjs/minimal" },
      {
        find: "@protobufjs/codegen",
        replacement: "./mocks/protobuf-codegen.js",
      },
      {
        find: "@protobufjs/inquire",
        replacement: "./mocks/protobuf-codegen.js",
      },
    ],
  },
  build: {
    target: "esnext",
    minify: true,
    ssr: true,
    rollupOptions: {
      input: "src/index.ts",
      output: {
        format: "esm",
        entryFileNames: "index.js",
      },
      external: ["cloudflare", /^node:/],
    },
  },
  ssr: {
    noExternal: true,
  },
});
