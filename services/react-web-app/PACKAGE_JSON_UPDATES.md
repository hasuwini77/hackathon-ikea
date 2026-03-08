# Package.json Updates for Sentry

This file shows the required updates to `package.json` for the Sentry integration.

## Required Dependencies

Add the following to the `dependencies` section:

```json
{
  "dependencies": {
    "@sentry/react": "^7.100.0",
    // ... existing dependencies
  }
}
```

## Required Dev Dependencies

Add the following to the `devDependencies` section:

```json
{
  "devDependencies": {
    "@sentry/vite-plugin": "^2.14.0",
    // ... existing devDependencies
  }
}
```

## Complete Example

Your `package.json` should look similar to this after installation:

```json
{
  "name": "react-web-app",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "react-router build",
    "dev": "react-router dev",
    "start": "react-router-serve ./build/server/index.js",
    "typecheck": "react-router typegen && tsc"
  },
  "dependencies": {
    "@hookform/resolvers": "^5.2.2",
    "@radix-ui/react-accordion": "^1.2.12",
    "@sentry/react": "^7.100.0",
    // ... other dependencies
  },
  "devDependencies": {
    "@react-router/dev": "^7.7.1",
    "@sentry/vite-plugin": "^2.14.0",
    "@tailwindcss/vite": "^4.1.4",
    // ... other devDependencies
  }
}
```

## Installation Command

To install these packages, run:

```bash
npm install @sentry/react @sentry/vite-plugin
```

Or with yarn:

```bash
yarn add @sentry/react @sentry/vite-plugin
```

Or with pnpm:

```bash
pnpm add @sentry/react @sentry/vite-plugin
```

## Version Notes

- **@sentry/react**: Use latest ^7.x version (minimum 7.100.0)
- **@sentry/vite-plugin**: Use latest ^2.x version (minimum 2.14.0)

To check latest versions:
```bash
npm show @sentry/react version
npm show @sentry/vite-plugin version
```

## After Installation

1. Verify packages are installed:
   ```bash
   npm list @sentry/react @sentry/vite-plugin
   ```

2. Check for peer dependency warnings and resolve if needed

3. Run typecheck to ensure TypeScript recognizes the packages:
   ```bash
   npm run typecheck
   ```

## Lock File

After installation, commit the updated lock file:
- `package-lock.json` (npm)
- `yarn.lock` (yarn)
- `pnpm-lock.yaml` (pnpm)

This ensures consistent dependency versions across environments.
