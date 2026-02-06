# Medusa Plugin Development Rules

## Module System
**STRICT RULE:** All Medusa plugins in this monorepo MUST be compiled to **CommonJS**.

### `package.json` Configuration
* ❌ NEVER use `"type": "module"`.
* ✅ ALWAYS define entry points:
    ```json
    "main": "dist/index.js",
    "types": "dist/index.d.ts"
    ```

### `tsconfig.json` Configuration
* Set `compilerOptions.module` to `"CommonJS"` or `"NodeNext"`.
* Ensure build output uses `require()` syntax, not `import`.

## Dependencies
* If you install a pure-ESM dependency (like `node-fetch` v3+), you must downgrade to the CJS equivalent (e.g., `node-fetch` v2) or use a dynamic `import()` inside an async function wrapper.
