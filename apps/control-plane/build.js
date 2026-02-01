import { createRequire } from "node:module";
import path from "node:path";

import * as esbuild from "esbuild";

const require = createRequire(import.meta.url);
const PROTOBUF_LIGHT_PATH =
  require.resolve("protobufjs/dist/light/protobuf.js");

const protobufAliasPlugin = {
  name: "protobuf-alias",
  setup(build) {
    // Resolve the virtual module "protobufjs-light-build" to the absolute path
    build.onResolve({ filter: /^protobufjs-light-build$/ }, () => {
      return { path: PROTOBUF_LIGHT_PATH };
    });

    // Best Practice: Check for the package name boundary (/ or end of string)
    build.onResolve({ filter: /^protobufjs(\/|$)/ }, (arguments_) => {
      // Avoid infinite loop: allow the virtual module to resolve handled above
      if (arguments_.path === "protobufjs-light-build") return null;
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
    alias: {
      pino: "pino/browser",
    },
    plugins: [protobufAliasPlugin],
    logLevel: "info",
    logOverride: {
      "direct-eval": "silent",
      "impossible-typeof": "silent",
    },
  })
  .catch(() => process.exit(1)); // eslint-disable-line unicorn/no-process-exit
