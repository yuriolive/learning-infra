import path from "node:path";

import * as esbuild from "esbuild";

const protobufAliasPlugin = {
  name: "protobuf-alias",
  setup(build) {
    // Best Practice: Check for the package name boundary (/ or end of string)
    build.onResolve({ filter: /^protobufjs(\/|$)/ }, () => {
      return { path: path.resolve("./src/protobuf-shim.js") };
    });
  },
};

await esbuild
  .build({
    entryPoints: ["src/index.ts"],
    bundle: true,
    format: "esm",
    outfile: "dist/index.js",
    platform: "node",
    target: "es2022",
    mainFields: ["module", "main"],
    sourcemap: true,
    plugins: [protobufAliasPlugin],
    logLevel: "info",
  })
  .catch(() => process.exit(1)); // eslint-disable-line unicorn/no-process-exit
