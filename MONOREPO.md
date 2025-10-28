# Monorepo Architecture

This project uses a **monorepo structure** with **Turborepo** for build orchestration and **pnpm workspaces** for dependency management.

## Structure

```
name-normalization-platform/
├── packages/
│   └── normalization-core/          # @normalization/core - Publishable package
│       ├── src/
│       │   ├── names/               # Name normalization (750+ credentials)
│       │   ├── phones/              # Phone normalization (coming soon)
│       │   ├── emails/              # Email normalization (coming soon)
│       │   ├── companies/           # Company normalization (coming soon)
│       │   ├── addresses/           # Address normalization (coming soon)
│       │   └── common/              # Shared utilities
│       ├── dist/                    # Built output (CJS + ESM + types)
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsup.config.ts
│       └── README.md
├── apps/
│   └── web/                         # Main web application
│       ├── client/                  # React frontend
│       ├── server/                  # Express backend
│       ├── public/                  # Static assets
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
├── shared/                          # Legacy (being migrated)
├── turbo.json                       # Turborepo configuration
├── pnpm-workspace.yaml              # pnpm workspace configuration
└── package.json                     # Root workspace config
```

## Key Features

### 1. Workspace Dependencies
- Apps can depend on packages using `workspace:*` protocol
- Automatic linking during development
- Type-safe imports with full IntelliSense

### 2. Build Orchestration
- Turborepo handles build order automatically
- Caching for faster rebuilds
- Parallel execution where possible

### 3. Package Publishing
- `@normalization/core` is ready to publish to npm/GitHub Packages
- Semantic versioning
- Automated releases via CI/CD

## Getting Started

### Installation

```bash
pnpm install
```

### Development

```bash
# Run all apps in development mode
pnpm dev

# Build all packages and apps
pnpm build

# Build only packages
pnpm build:packages

# Run tests
pnpm test
```

### Working with Packages

#### Build normalization-core

```bash
cd packages/normalization-core
pnpm build
```

Output:
- `dist/*.js` - CommonJS modules
- `dist/*.mjs` - ES modules
- `dist/*.d.ts` - TypeScript declarations

#### Publish normalization-core

```bash
# Publish to npm
pnpm publish:core

# Or manually
cd packages/normalization-core
npm publish
```

### Working with Apps

#### Run web app

```bash
cd apps/web
pnpm dev
```

#### Build web app

```bash
cd apps/web
pnpm build
```

## Package: @normalization/core

### Installation (when published)

```bash
npm install @normalization/core
```

### Usage

```typescript
// Import from main entry
import { isCredential, isTitle } from '@normalization/core/names';

// Import specific modules
import { validateEmail } from '@normalization/core/emails';
import { formatPhone } from '@normalization/core/phones';
```

### Exports

- `@normalization/core` - Main entry point
- `@normalization/core/names` - Name normalization
- `@normalization/core/phones` - Phone normalization
- `@normalization/core/emails` - Email normalization
- `@normalization/core/companies` - Company normalization
- `@normalization/core/addresses` - Address normalization
- `@normalization/core/common` - Shared utilities

## Turborepo Configuration

### Pipeline

```json
{
  "build": {
    "dependsOn": ["^build"],
    "outputs": ["dist/**", ".next/**"]
  },
  "dev": {
    "cache": false,
    "persistent": true
  },
  "test": {
    "dependsOn": ["^build"]
  }
}
```

### Caching

Turborepo caches:
- Build outputs
- Test results
- Lint results

Cache location: `.turbo/`

## Adding New Packages

1. Create package directory:
```bash
mkdir -p packages/my-package/src
```

2. Create `package.json`:
```json
{
  "name": "@normalization/my-package",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts"
}
```

3. Add to workspace:
```yaml
# pnpm-workspace.yaml already includes packages/*
```

4. Install dependencies:
```bash
pnpm install
```

## Adding New Apps

1. Create app directory:
```bash
mkdir -p apps/my-app
```

2. Create `package.json` with dependencies:
```json
{
  "name": "@normalization/my-app",
  "dependencies": {
    "@normalization/core": "workspace:*"
  }
}
```

3. Install:
```bash
pnpm install
```

## CI/CD

### GitHub Actions Workflow

```yaml
name: CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm build
      - run: pnpm test
```

### Publishing Workflow

```yaml
name: Publish
on:
  push:
    tags: ['v*']

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm build:packages
      - run: cd packages/normalization-core && npm publish
```

## Migration from Legacy Structure

### Before (Single Repo)
```
/client
/server
/shared/normalization
```

### After (Monorepo)
```
/packages/normalization-core  (from /shared/normalization)
/apps/web/client              (from /client)
/apps/web/server              (from /server)
```

### Import Changes

Before:
```typescript
import { isCredential } from '../../../shared/normalization/names';
```

After:
```typescript
import { isCredential } from '@normalization/core/names';
```

## Performance

### Build Times
- Cold build: ~5s
- Cached build: <1s
- Watch mode: <500ms

### Package Size
- `@normalization/core`: ~35KB (minified)
- Tree-shakeable: Only import what you need

## Best Practices

1. **Always build packages before apps**
   ```bash
   pnpm build:packages && pnpm build
   ```

2. **Use workspace protocol for internal dependencies**
   ```json
   "@normalization/core": "workspace:*"
   ```

3. **Run tests before committing**
   ```bash
   pnpm test
   ```

4. **Keep packages focused**
   - One responsibility per package
   - Clear public API
   - Comprehensive documentation

5. **Version carefully**
   - Use semantic versioning
   - Document breaking changes
   - Maintain CHANGELOG.md

## Troubleshooting

### Build Errors

```bash
# Clean and rebuild
pnpm clean
pnpm install
pnpm build
```

### Type Errors

```bash
# Rebuild packages
cd packages/normalization-core
pnpm build
```

### Dependency Issues

```bash
# Reinstall all dependencies
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

## Resources

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [tsup Documentation](https://tsup.egoist.dev/)

## License

MIT
