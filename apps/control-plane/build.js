import path from "node:path";

import * as esbuild from "esbuild";

const protobufAliasPlugin = {
  name: "protobuf-alias",
  setup(build) {
    // Intercept exact import "protobufjs"
    build.onResolve({ filter: /^protobufjs$/ }, () => {
      return { path: path.resolve("./src/protobuf-shim.js") };
    });
    // Intercept exact import "protobufjs/minimal"
    build.onResolve({ filter: /^protobufjs\/minimal$/ }, () => {
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
    target: "node20",
    sourcemap: true,
    plugins: [protobufAliasPlugin],
    logLevel: "info",
  })
  .catch(() => process.exit(1)); // eslint-disable-line unicorn/no-process-exit
