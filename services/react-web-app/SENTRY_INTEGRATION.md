# Sentry Error Tracking Integration

This document provides a comprehensive guide to the Sentry error tracking integration in the React web application.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Configuration](#configuration)
- [Features](#features)
- [Usage](#usage)
- [Components](#components)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

Sentry is integrated into this application to provide:

- **Error Tracking**: Automatic capture of JavaScript errors and exceptions
- **Performance Monitoring**: Track application performance and bottlenecks
- **Session Replay**: Visual reproduction of user sessions when errors occur
- **User Feedback**: Allow users to provide context when encountering errors
- **Breadcrumbs**: Track user actions leading up to errors
- **Source Maps**: Map production errors back to original source code

## Installation

### Required Packages

Add the following packages to your `package.json`:

```bash
npm install @sentry/react @sentry/vite-plugin
```

Or with yarn:

```bash
yarn add @sentry/react @sentry/vite-plugin
```

### Package Versions

The integration is compatible with:
- `@sentry/react`: ^7.0.0 or higher
- `@sentry/vite-plugin`: ^2.0.0 or higher

## Configuration

### 1. Environment Variables

Add the following to your `.env` file:

```bash
# Sentry DSN (Data Source Name)
# Get this from Sentry project settings
VITE_SENTRY_DSN=https://your-key@sentry.io/your-project-id

# Environment (development, staging, production)
VITE_ENV=production

# Application version for release tracking
VITE_APP_VERSION=1.0.0

# For source map uploads (production builds only)
SENTRY_AUTH_TOKEN=your-sentry-auth-token
SENTRY_ORG=your-organization-slug
SENTRY_PROJECT=your-project-slug
```

**Note**: Set `VITE_SENTRY_DSN=https://example@sentry.io/123` to disable Sentry.

### 2. TypeScript Configuration

Environment variables are typed in `vite-env.d.ts`:

```typescript
interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_ENV?: string;
  readonly VITE_APP_VERSION?: string;
}
```

### 3. Vite Configuration

The Vite plugin is configured in `vite.config.ts` to:
- Upload source maps in production builds
- Associate errors with specific releases
- Clean up source maps after upload

## Features

### 1. Automatic Error Capture

All uncaught errors are automatically sent to Sentry with:
- Stack traces
- Browser information
- User context (if set)
- Breadcrumbs of user actions

### 2. Performance Monitoring

Tracks:
- Page load times
- Route transitions
- API request durations
- Custom transactions

Sample rates are configurable:
- **Development**: 100% (all transactions tracked)
- **Production**: 10% (sample for cost efficiency)

### 3. Session Replay

Records user sessions when errors occur:
- **Privacy**: All text and media are masked by default
- **Network**: API calls are captured for debugging
- **Replay on Error**: 100% of sessions with errors are recorded

### 4. User Feedback

Users can provide additional context through a feedback dialog:
- Triggered automatically on errors (optional)
- Can be manually invoked via `SentryFeedback` component
- Captures user comments, email, and name (optional)

### 5. Breadcrumbs

Automatically tracked actions:
- UI clicks
- Console logs (errors and warnings)
- Navigation events
- Couchbase operations (custom)
- Network requests

## Usage

### Basic Error Capture

```typescript
import { captureException } from '~/lib/sentry';

try {
  riskyOperation();
} catch (error) {
  captureException(error, {
    extraContext: 'Additional debugging info',
  });
}
```

### Capture Messages

```typescript
import { captureMessage } from '~/lib/sentry';

captureMessage('User completed checkout', 'info', {
  orderId: '12345',
  amount: 99.99,
});
```

### Add Breadcrumbs

```typescript
import { addBreadcrumb } from '~/lib/sentry';

addBreadcrumb(
  'User clicked checkout button',
  'user-action',
  'info',
  { cartTotal: 99.99 }
);
```

### Set User Context

```typescript
import { setUser } from '~/lib/sentry';

// After login
setUser({
  id: '12345',
  email: 'user@example.com',
  username: 'john_doe',
});

// On logout
setUser(null);
```

### Custom Tags and Context

```typescript
import { setTags, setContext } from '~/lib/sentry';

// Tags for filtering
setTags({
  feature: 'checkout',
  experiment: 'variant-a',
});

// Additional context
setContext('order', {
  id: '12345',
  total: 99.99,
  items: 3,
});
```

### Performance Transactions

```typescript
import { startTransaction } from '~/lib/sentry';

const transaction = startTransaction(
  'checkout-flow',
  'user-interaction',
  { cartSize: 3 }
);

// ... perform operation ...

transaction?.finish();
```

## Components

### ErrorBoundary

The `ErrorBoundary` component catches React errors and reports them to Sentry:

```typescript
import { ErrorBoundary } from '~/components/ErrorBoundary';

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

Features:
- Automatic Sentry error capture
- User-friendly error UI
- "Report Feedback" button for user input
- "Try Again" functionality

### OfflineErrorBoundary

Specialized error boundary for network errors:

```typescript
import { OfflineErrorBoundary } from '~/components/OfflineErrorBoundary';

<OfflineErrorBoundary onRetry={handleRetry}>
  <NetworkDependentComponent />
</OfflineErrorBoundary>
```

Features:
- Detects network/offline errors
- Tagged appropriately in Sentry
- Retry logic with breadcrumbs
- Offline-specific UI

### SentryFeedback Component

Standalone feedback button:

```typescript
import { SentryFeedback } from '~/components/SentryFeedback';

// Basic usage
<SentryFeedback />

// With specific error event
<SentryFeedback eventId={errorEventId} />

// Customized
<SentryFeedback
  variant="outline"
  buttonText="Send Feedback"
  title="Share Your Experience"
/>
```

### useSentryFeedback Hook

Hook for programmatic error capture and feedback:

```typescript
import { useSentryFeedback } from '~/components/SentryFeedback';

function MyComponent() {
  const { captureError, showFeedback, eventId } = useSentryFeedback();

  const handleError = () => {
    try {
      riskyOperation();
    } catch (error) {
      captureError(error, { context: 'additional info' });
      showFeedback(); // Optional: show dialog immediately
    }
  };

  return (
    <div>
      <button onClick={handleError}>Risky Operation</button>
      {eventId && <SentryFeedback eventId={eventId} />}
    </div>
  );
}
```

## Best Practices

### 1. Error Context

Always provide context when capturing errors:

```typescript
captureException(error, {
  component: 'CheckoutForm',
  action: 'submit',
  userId: currentUser.id,
});
```

### 2. Privacy

- Never send sensitive data (passwords, tokens, PII)
- Use Sentry's data scrubbing features
- Review events before enabling in production

### 3. Performance

- Use appropriate sample rates to control costs
- Don't create transactions for every minor operation
- Focus on user-facing interactions

### 4. Breadcrumbs

Add breadcrumbs for important application events:

```typescript
// Good: Domain-specific breadcrumbs
addBreadcrumb('Product added to cart', 'cart', 'info', {
  productId: product.id,
  price: product.price,
});

// Bad: Too verbose
addBreadcrumb('Mouse moved', 'ui', 'debug'); // Don't do this
```

### 5. Filtering Errors

Some errors are expected and shouldn't be reported:

```typescript
// In sentry.ts, add to ignoreErrors array:
ignoreErrors: [
  'ResizeObserver loop limit exceeded',
  'NetworkError',
  'Failed to fetch', // Offline-first app
],
```

### 6. Release Tracking

Always set `VITE_APP_VERSION` in production:
- Use git tags or commit SHAs
- Match with deployed version
- Helps identify when regressions were introduced

### 7. User Identification

Set user context after authentication:

```typescript
// After successful login
setUser({
  id: user.id,
  email: user.email,
  // Don't include sensitive data
});
```

### 8. Testing

Test error reporting in development:

```typescript
// Add a test button in dev mode
{import.meta.env.DEV && (
  <button onClick={() => {
    throw new Error('Test Sentry integration');
  }}>
    Test Sentry
  </button>
)}
```

## Troubleshooting

### Errors Not Appearing in Sentry

1. **Check DSN**: Verify `VITE_SENTRY_DSN` is set correctly
2. **Check Console**: Look for Sentry initialization logs
3. **Network**: Check browser DevTools for failed uploads
4. **Environment**: Ensure not using placeholder DSN

### Source Maps Not Working

1. **Build**: Ensure `sourcemap: true` in vite.config.ts
2. **Auth Token**: Verify `SENTRY_AUTH_TOKEN` is valid
3. **Upload**: Check build output for source map upload logs
4. **Organization**: Verify `SENTRY_ORG` and `SENTRY_PROJECT` match your Sentry settings

### Too Many Events

1. **Sample Rates**: Lower `tracesSampleRate` and `replaysSessionSampleRate`
2. **Filtering**: Add more error patterns to `ignoreErrors`
3. **Environments**: Only enable Sentry in production

### Performance Impact

1. **Lazy Load**: Sentry initializes on first render (minimal impact)
2. **Replays**: Adjust replay sample rates if causing issues
3. **Breadcrumbs**: Limit breadcrumb verbosity
4. **Bundle Size**: Sentry adds ~50KB gzipped

### User Feedback Dialog Not Showing

1. **Event ID**: Ensure `eventId` is captured and passed
2. **Sentry Enabled**: Check `isSentryEnabled()` returns true
3. **Browser**: Some adblockers may block Sentry dialogs

## Integration Points

### Couchbase Client

All Couchbase operations include:
- Breadcrumbs for tracking operations
- Error capture with context
- Network error tagging

Example operations:
- Document fetches
- Document updates
- Conflicts
- Network timeouts

### Error Boundaries

All error boundaries integrate with Sentry:
- `ErrorBoundary`: General React errors
- `OfflineErrorBoundary`: Network-specific errors
- Root `ErrorBoundary`: Route-level errors

### React Router

Errors in route loaders and actions are captured via the root error boundary in `root.tsx`.

## Monitoring Dashboard

Access your Sentry dashboard at: https://sentry.io/organizations/[your-org]/issues/

Key views:
- **Issues**: All captured errors grouped by type
- **Performance**: Transaction durations and bottlenecks
- **Replays**: Session recordings with errors
- **Releases**: Track errors by version
- **Alerts**: Configure notifications for critical errors

## Cost Management

Sentry has quota limits. To manage costs:

1. **Sample Rates**: Adjust based on traffic
2. **Filters**: Filter noisy errors
3. **Data Retention**: Configure in Sentry settings
4. **Quota Alerts**: Set up alerts before hitting limits

## Additional Resources

- [Sentry JavaScript Documentation](https://docs.sentry.io/platforms/javascript/)
- [Sentry React Documentation](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Vite Plugin Documentation](https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite/)
- [Best Practices](https://docs.sentry.io/platforms/javascript/best-practices/)

## Support

For issues or questions:
1. Check this documentation
2. Review Sentry documentation
3. Check application logs
4. Contact the development team
