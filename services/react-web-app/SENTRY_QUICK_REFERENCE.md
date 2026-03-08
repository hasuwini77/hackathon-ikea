# Sentry Quick Reference

Quick reference for common Sentry operations in the application.

## Installation

```bash
npm install @sentry/react @sentry/vite-plugin
```

## Environment Setup

```bash
# Required
VITE_SENTRY_DSN=https://your-key@sentry.io/your-project-id
VITE_ENV=development

# Optional but recommended
VITE_APP_VERSION=1.0.0

# Production only (for source maps)
SENTRY_AUTH_TOKEN=your-token
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
```

## Common Operations

### Capture Error

```typescript
import { captureException } from '~/lib/sentry';

try {
  riskyOperation();
} catch (error) {
  captureException(error, { extraContext: 'value' });
}
```

### Capture Message

```typescript
import { captureMessage } from '~/lib/sentry';

captureMessage('Important event', 'info', { userId: '123' });
```

### Add Breadcrumb

```typescript
import { addBreadcrumb } from '~/lib/sentry';

addBreadcrumb('User action', 'ui', 'info', { button: 'checkout' });
```

### Set User

```typescript
import { setUser } from '~/lib/sentry';

// Login
setUser({ id: '123', email: 'user@example.com' });

// Logout
setUser(null);
```

### Add Tags

```typescript
import { setTags } from '~/lib/sentry';

setTags({ feature: 'checkout', variant: 'a' });
```

### Add Context

```typescript
import { setContext } from '~/lib/sentry';

setContext('order', { id: '123', total: 99.99 });
```

### Performance Transaction

```typescript
import { startTransaction } from '~/lib/sentry';

const transaction = startTransaction('checkout', 'user-interaction');
// ... do work ...
transaction?.finish();
```

## Components

### Error Boundary

```typescript
import { ErrorBoundary } from '~/components/ErrorBoundary';

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

### Offline Error Boundary

```typescript
import { OfflineErrorBoundary } from '~/components/OfflineErrorBoundary';

<OfflineErrorBoundary onRetry={handleRetry}>
  <NetworkComponent />
</OfflineErrorBoundary>
```

### Feedback Button

```typescript
import { SentryFeedback } from '~/components/SentryFeedback';

<SentryFeedback eventId={errorEventId} />
```

### Feedback Hook

```typescript
import { useSentryFeedback } from '~/components/SentryFeedback';

const { captureError, showFeedback, eventId } = useSentryFeedback();

try {
  riskyOp();
} catch (error) {
  captureError(error);
  showFeedback();
}
```

## Configuration

### Disable Sentry

Set in `.env`:
```bash
VITE_SENTRY_DSN=https://example@sentry.io/123
```

### Adjust Sample Rates

Edit `app/lib/sentry.ts`:
```typescript
tracesSampleRate: 0.1,  // 10% of transactions
replaysSessionSampleRate: 0.1,  // 10% of sessions
```

### Ignore Errors

Edit `app/lib/sentry.ts`:
```typescript
ignoreErrors: [
  'NetworkError',
  'Your custom pattern',
]
```

## Testing

### Development Test

```typescript
// Add test button
<button onClick={() => {
  throw new Error('Test Sentry');
}}>Test</button>
```

### Verify Installation

1. Check console: "Sentry initialized for development environment"
2. Trigger test error
3. Check Sentry dashboard for error

## Breadcrumb Categories

| Category | Usage | Example |
|----------|-------|---------|
| `ui` | User interface actions | Button clicks |
| `navigation` | Route changes | Page transitions |
| `network` | API calls | Fetch requests |
| `couchbase` | Database ops | Document updates |
| `auth` | Authentication | Login/logout |
| `cart` | Shopping cart | Add/remove items |

## Severity Levels

- `debug`: Debug information
- `info`: Informational messages
- `warning`: Warning conditions
- `error`: Error conditions
- `fatal`: Fatal errors

## Common Patterns

### API Call with Error Tracking

```typescript
import { addBreadcrumb, captureException } from '~/lib/sentry';

async function fetchData() {
  addBreadcrumb('Fetching data', 'network', 'info');

  try {
    const response = await fetch('/api/data');
    return await response.json();
  } catch (error) {
    captureException(error, {
      endpoint: '/api/data',
      online: navigator.onLine,
    });
    throw error;
  }
}
```

### Form Submission with Tracking

```typescript
import { addBreadcrumb, captureException, setContext } from '~/lib/sentry';

async function handleSubmit(formData) {
  addBreadcrumb('Form submission', 'ui', 'info', {
    form: 'checkout',
  });

  setContext('formData', {
    items: formData.items.length,
    total: formData.total,
  });

  try {
    await submitOrder(formData);
  } catch (error) {
    captureException(error, {
      form: 'checkout',
      step: 'submission',
    });
  }
}
```

### User Action Tracking

```typescript
import { addBreadcrumb } from '~/lib/sentry';

function addToCart(product) {
  addBreadcrumb(
    'Product added to cart',
    'cart',
    'info',
    {
      productId: product.id,
      price: product.price,
      quantity: 1,
    }
  );
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Sentry not initializing | Check VITE_SENTRY_DSN is set and valid |
| Events not appearing | Verify DSN, check network tab for uploads |
| Source maps not working | Set SENTRY_AUTH_TOKEN, verify org/project |
| Too many events | Lower sample rates, add error filters |
| Dialog not showing | Check eventId is set, verify Sentry enabled |

## File Locations

| File | Purpose |
|------|---------|
| `app/lib/sentry.ts` | Sentry configuration and helpers |
| `app/components/SentryFeedback.tsx` | Feedback component |
| `app/components/ErrorBoundary.tsx` | Error boundary with Sentry |
| `app/components/OfflineErrorBoundary.tsx` | Network error boundary |
| `vite.config.ts` | Vite plugin configuration |
| `.env.example` | Environment variable template |

## Links

- 📚 [Full Documentation](./SENTRY_INTEGRATION.md)
- 🚀 [Setup Guide](./SENTRY_SETUP.md)
- 📦 [Package Info](./PACKAGES_TO_INSTALL.md)
- 📝 [Implementation Summary](./SENTRY_IMPLEMENTATION_SUMMARY.md)
- 🌐 [Sentry Dashboard](https://sentry.io)

## Quick Commands

```bash
# Install
npm install @sentry/react @sentry/vite-plugin

# Dev
npm run dev

# Build (with source maps)
npm run build

# Type check
npm run typecheck
```

## Sample Rates Explained

| Environment | Traces | Replays | Replays on Error |
|-------------|--------|---------|------------------|
| Development | 100% | 100% | 100% |
| Production | 10% | 10% | 100% |

- **Traces**: % of performance transactions tracked
- **Replays**: % of normal sessions recorded
- **Replays on Error**: % of error sessions recorded

## Privacy Defaults

- ✅ All text masked in replays
- ✅ All media blocked in replays
- ✅ Network requests for allowed URLs only
- ✅ Browser extension errors filtered
- ✅ Sensitive data scrubbing enabled

## Best Practices

1. ✅ Always provide context with errors
2. ✅ Set user context after login
3. ✅ Clear user context on logout
4. ✅ Use appropriate severity levels
5. ✅ Add breadcrumbs for important actions
6. ✅ Filter expected errors
7. ✅ Test in development before production
8. ✅ Monitor quota usage
9. ✅ Set up alerts for critical errors
10. ✅ Review errors regularly
