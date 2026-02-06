// ... existing content ...

## package.json Template
{
  "name": "@vendin/medusa-plugin-name",
  "version": "0.0.1",
  "description": "A custom MedusaJS plugin",
  "author": "Vendin",
  "license": "MIT",
  "main": "dist/index.js",    <-- CRITICAL: Point to dist
  "types": "dist/index.d.ts",
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsc -b",
    "watch": "tsc -b -w",
    "clean": "rm -rf dist"
  },
  "peerDependencies": {
    "@medusajs/medusa": "^2.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
  // NOTE: Do NOT add "type": "module"
}

## tsconfig.json Template
{
  "extends": "../../../../tsconfig.base.json",
  "compilerOptions": {
    "module": "NodeNext",        <-- CRITICAL: Enforce CJS compat
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true
  },
  "include": ["src"]
}
