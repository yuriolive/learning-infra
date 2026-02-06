## [ADR-005] Enforced CommonJS for Backend Packages

* **Status:** Accepted
* **Date:** 2026-02-06
* **Context:** The project utilizes Medusa v2. While the ecosystem is moving toward ESM, the Medusa Admin build tools and dynamic loader rely heavily on synchronous `require()` calls.
* **Problem:** Configuring workspace packages (plugins, shared logic) as ESM (`"type": "module"`) caused production runtime crashes in Cloud Run (`Unexpected token '{'`) when the host application (compiled to CJS) attempted to load them.
* **Decision:** All backend-related packages (`packages/medusa/*`, `packages/logger`, etc.) MUST be configured as **CommonJS**.
    * `package.json`: Must NOT have `"type": "module"`.
    * `tsconfig.json`: Should target `CommonJS` modules (or `NodeNext` with `moduleResolution: NodeNext` to support package exports while emitting CJS).
* **Consequences:**
    * We cannot use top-level await in shared packages.
    * We maintain full compatibility with the Medusa v2 loader.
    * Frontend apps (Next.js) can still consume these CJS packages via Webpack/Turbopack without issues.
