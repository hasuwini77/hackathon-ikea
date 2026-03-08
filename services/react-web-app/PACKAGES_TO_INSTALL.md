# Required Packages for Sentry Integration

The following packages need to be installed for the Sentry error tracking integration to work.

## NPM Installation

```bash
npm install @sentry/react @sentry/vite-plugin
```

## Yarn Installation

```bash
yarn add @sentry/react @sentry/vite-plugin
```

## PNPM Installation

```bash
pnpm add @sentry/react @sentry/vite-plugin
```

## Package Details

### @sentry/react

- **Purpose**: Core Sentry SDK for React applications
- **Features**:
  - Error boundary integration
  - Performance monitoring
  - Session replay
  - Breadcrumbs
  - User context tracking
- **Minimum Version**: ^7.0.0 (recommended: latest)
- **Size**: ~50KB gzipped

### @sentry/vite-plugin

- **Purpose**: Vite plugin for uploading source maps to Sentry
- **Features**:
  - Automatic source map upload during production builds
  - Release tracking
  - Source map cleanup after upload
- **Minimum Version**: ^2.0.0 (recommended: latest)
- **Size**: Dev dependency only (not included in production bundle)

## Verify Installation

After installation, verify the packages are in your `package.json`:

```json
{
  "dependencies": {
    "@sentry/react": "^7.100.0"
  },
  "devDependencies": {
    "@sentry/vite-plugin": "^2.14.0"
  }
}
```

**Note**: Version numbers are examples. Use the latest stable versions.

## Next Steps

After installing packages:

1. ✅ Install dependencies
2. 📝 Configure environment variables (see [SENTRY_SETUP.md](./SENTRY_SETUP.md))
3. 🧪 Test integration in development
4. 🚀 Deploy to production

## Additional Notes

- **Bundle Size**: The core Sentry integration adds approximately 50KB (gzipped) to your production bundle
- **Tree Shaking**: The Vite plugin is a dev dependency and won't affect production bundle size
- **TypeScript**: Both packages include TypeScript definitions out of the box
- **React Version**: Compatible with React 16.8+ (hooks support required)
- **Browser Support**: Supports all modern browsers (Chrome, Firefox, Safari, Edge)

## Optional: Verify Import

After installation, verify you can import from the packages:

```typescript
// Should not produce TypeScript errors
import * as Sentry from '@sentry/react';
import { sentryVitePlugin } from '@sentry/vite-plugin';
```

If you see import errors, try:
```bash
npm install
npm run typecheck
```

## Troubleshooting

### Package Not Found

If you get "package not found" errors:
1. Delete `node_modules` and lock file
2. Run `npm install` again
3. Clear npm cache: `npm cache clean --force`

### TypeScript Errors

If you get TypeScript errors:
1. Ensure packages are in `node_modules/@sentry/`
2. Run `npm install --save-dev @types/react @types/react-dom` if needed
3. Restart TypeScript server in your editor

### Version Conflicts

If you encounter peer dependency warnings:
1. Check React version compatibility
2. Update to latest compatible versions
3. Use `--legacy-peer-deps` flag if needed (not recommended)

## Documentation Links

- [@sentry/react on npm](https://www.npmjs.com/package/@sentry/react)
- [@sentry/vite-plugin on npm](https://www.npmjs.com/package/@sentry/vite-plugin)
- [Sentry React SDK Docs](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Vite Plugin Docs](https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite/)
