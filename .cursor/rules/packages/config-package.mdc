---
description: Config package patterns for shared ESLint, TypeScript, and Prettier configuration.
globs: packages/config/**/*
---
# Config Package Rules

## Purpose

Shared configuration for all apps and packages in the monorepo.

## Contents

- ESLint configuration
- TypeScript base configuration
- Prettier configuration

## Usage

All apps and packages extend from this base configuration:

```json
// tsconfig.json
{
  "extends": "@vendin/config/tsconfig.base.json"
}
```

```javascript
// eslint.config.js
import baseConfig from '@vendin/config/eslint.config.js';
export default baseConfig;
```
