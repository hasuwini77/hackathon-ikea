# Configuration Guide

This application uses environment variables for configuration, making it easy to adjust settings for different environments (development, staging, production).

## Quick Start

1. Copy `.env.example` to `.env.development`:
   ```bash
   cp .env.example .env.development
   ```

2. Adjust values in `.env.development` as needed for your local setup

3. Start the application - it will automatically load `.env.development` in development mode

## Environment Files

- `.env.example` - Template with all available environment variables and their defaults
- `.env.development` - Local development configuration (pre-filled with sensible defaults)
- `.env.production` - Production configuration (create when needed)
- `.env.local` - Local overrides (not committed to git)

## Available Environment Variables

### Couchbase Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_COUCHBASE_URL` | URL of the Couchbase Lite Edge Server | `http://127.0.0.1:59840` |
| `VITE_COUCHBASE_DB` | Database name for IKEA products | `ikea_products` |

### Network Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_REQUEST_TIMEOUT` | Request timeout in milliseconds | `5000` |
| `VITE_SYNC_POLL_INTERVAL` | Sync status polling interval in milliseconds | `10000` |
| `VITE_RETRY_ATTEMPTS` | Number of retry attempts for failed requests | `3` |
| `VITE_RETRY_DELAY` | Delay between retry attempts in milliseconds | `1000` |

### Feature Flags

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_OFFLINE_MODE` | Enable offline mode functionality | `true` |
| `VITE_CAMERA_SCANNER` | Enable camera scanner feature | `true` |

### API Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_FASTAPI_URL` | FastAPI backend URL | `http://127.0.0.1:8000` |

## Using Configuration in Code

### Import the config module

```typescript
import { config } from '~/lib/config';

// Access configuration values
const serverUrl = config.couchbase.edgeServerUrl;
const timeout = config.couchbase.timeout;
const offlineEnabled = config.features.offlineMode;
```

### Individual config sections

```typescript
import { couchbaseConfig, featureFlags, apiConfig } from '~/lib/config';

console.log(couchbaseConfig.edgeServerUrl);
console.log(featureFlags.offlineMode);
console.log(apiConfig.fastApiUrl);
```

### Helper functions

```typescript
import { getDatabaseUrl, getDocumentUrl, getAllDocsUrl } from '~/lib/config';

const dbUrl = getDatabaseUrl(); // http://127.0.0.1:59840/ikea_products
const docUrl = getDocumentUrl('product-123'); // http://127.0.0.1:59840/ikea_products/product-123
const allDocsUrl = getAllDocsUrl(); // http://127.0.0.1:59840/ikea_products/_all_docs
```

## TypeScript Support

All environment variables have TypeScript types defined in `vite-env.d.ts`. Your IDE will provide autocomplete and type checking for `import.meta.env` values.

## Vite Proxy Configuration

The development server proxies API requests to avoid CORS issues:

- `/api/couchbase/*` → `VITE_COUCHBASE_URL` (default: `http://127.0.0.1:59840`)
- `/api/postgres/*` → `VITE_FASTAPI_URL` (default: `http://127.0.0.1:8000`)

These proxies are configured in `vite.config.ts` and automatically use your environment variables.

## Migration Notes

### Backward Compatibility

The old `app/lib/couchbase/config.ts` file still works and re-exports values from the new config module. However, for new code, import from `~/lib/config` instead:

**Old (still works):**
```typescript
import { EDGE_SERVER_URL, DATABASE_NAME } from '~/lib/couchbase/config';
```

**New (recommended):**
```typescript
import { config } from '~/lib/config';
const url = config.couchbase.edgeServerUrl;
const db = config.couchbase.database;
```

## Best Practices

1. **Never commit sensitive values** - Use `.env.local` for secrets and add it to `.gitignore`
2. **Use descriptive defaults** - Defaults should work for local development
3. **Document new variables** - Update this README and `.env.example` when adding new variables
4. **Type your variables** - Add types to `vite-env.d.ts` for new environment variables
5. **Validate on startup** - Consider adding runtime validation for critical configuration

## Troubleshooting

### Environment variables not loading

- Ensure your `.env.development` file is in the project root
- Restart the Vite dev server after changing environment files
- Check that variable names start with `VITE_` prefix (required by Vite)

### TypeScript errors

- Run `npm run type-check` to verify types
- Ensure `vite-env.d.ts` is included in your `tsconfig.json`

### Proxy not working

- Verify the target services are running (Couchbase Edge Server, FastAPI)
- Check the URLs in your `.env.development` file
- Look for proxy errors in the Vite dev server console
