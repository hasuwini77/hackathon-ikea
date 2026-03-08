/**
 * Sentry Error Tracking Configuration
 *
 * Initializes Sentry for error monitoring, performance tracking,
 * and session replay in the React web application.
 *
 * Features:
 * - Environment-based configuration
 * - Performance monitoring with adjustable sample rates
 * - Session replay for error reproduction
 * - Custom error filtering and breadcrumb tracking
 * - Offline-first error handling
 */

import * as Sentry from '@sentry/react';

/**
 * Check if Sentry is enabled based on environment configuration
 */
export function isSentryEnabled(): boolean {
  return !!(
    import.meta.env.VITE_SENTRY_DSN &&
    import.meta.env.VITE_SENTRY_DSN !== 'https://example@sentry.io/123'
  );
}

/**
 * Get environment name for Sentry
 */
function getEnvironment(): string {
  return (
    import.meta.env.VITE_ENV ||
    import.meta.env.MODE ||
    'development'
  );
}

/**
 * Get traces sample rate based on environment
 */
function getTracesSampleRate(): number {
  const env = getEnvironment();

  // Lower sample rate in production to reduce quota usage
  if (env === 'production') {
    return 0.1; // 10% of transactions
  }

  // Higher sample rate in development for debugging
  return 1.0; // 100% of transactions
}

/**
 * Get replays sample rate based on environment
 */
function getReplaysSampleRate(): number {
  const env = getEnvironment();

  if (env === 'production') {
    return 0.1; // 10% of sessions
  }

  return 1.0; // 100% of sessions in development
}

/**
 * Get replays on error sample rate
 * This determines what percentage of sessions with errors are recorded
 */
function getReplaysOnErrorSampleRate(): number {
  return 1.0; // Always record sessions with errors
}

/**
 * Initialize Sentry error tracking
 *
 * Call this function as early as possible in your application,
 * preferably before React initialization.
 */
export function initSentry(): void {
  if (!isSentryEnabled()) {
    console.info('Sentry is disabled (no DSN configured)');
    return;
  }

  const environment = getEnvironment();

  Sentry.init({
    // Data Source Name - unique identifier for your Sentry project
    dsn: import.meta.env.VITE_SENTRY_DSN,

    // Environment (development, staging, production)
    environment,

    // Release version for tracking which version errors occur in
    // This should match your deployment version
    release: import.meta.env.VITE_APP_VERSION || undefined,

    // Performance Monitoring
    integrations: [
      // Browser tracing for performance monitoring
      Sentry.browserTracingIntegration({
        // Enable automatic instrumentation
        tracePropagationTargets: [
          'localhost',
          /^\//,
          // Add your API domains here
          /^https:\/\/.*\.yourdomain\.com/,
        ],
      }),

      // Session Replay for error reproduction
      Sentry.replayIntegration({
        // Mask all text and user input by default for privacy
        maskAllText: true,
        blockAllMedia: true,

        // Network details help debug API issues
        networkDetailAllowUrls: [
          window.location.origin,
          /^\/api\//,
        ],
      }),

      // Capture console errors as breadcrumbs
      Sentry.captureConsoleIntegration({
        levels: ['error', 'warn'],
      }),
    ],

    // Performance Monitoring sample rates
    tracesSampleRate: getTracesSampleRate(),

    // Session Replay sample rates
    replaysSessionSampleRate: getReplaysSampleRate(),
    replaysOnErrorSampleRate: getReplaysOnErrorSampleRate(),

    // Don't send errors in development unless explicitly enabled
    beforeSend(event, hint) {
      // Filter out offline errors if configured to do so
      const error = hint.originalException;
      if (error && typeof error === 'object' && 'isOffline' in error) {
        // You can choose to filter these or tag them
        event.tags = {
          ...event.tags,
          offline: 'true',
        };
      }

      // Don't send errors from browser extensions
      if (event.exception?.values?.[0]?.stacktrace?.frames) {
        const frames = event.exception.values[0].stacktrace.frames;
        const hasExtensionFrame = frames.some(
          frame => frame.filename?.includes('chrome-extension://') ||
                   frame.filename?.includes('moz-extension://')
        );
        if (hasExtensionFrame) {
          return null;
        }
      }

      return event;
    },

    // Breadcrumbs help track user actions leading to errors
    beforeBreadcrumb(breadcrumb) {
      // Filter out noisy breadcrumbs
      if (breadcrumb.category === 'ui.click') {
        // You can filter or modify click breadcrumbs
        return breadcrumb;
      }

      if (breadcrumb.category === 'console') {
        // Filter out debug console logs
        if (breadcrumb.level === 'debug') {
          return null;
        }
      }

      return breadcrumb;
    },

    // Ignore specific errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',

      // Network errors that are expected in offline-first apps
      'NetworkError',
      'Failed to fetch',

      // Random plugins/extensions
      'atomicFindClose',

      // Ignore cancelled requests
      'AbortError',
      'The user aborted a request',
    ],

    // Don't report errors from certain URLs
    denyUrls: [
      // Browser extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
    ],
  });

  console.info(`Sentry initialized for ${environment} environment`);
}

/**
 * Add a breadcrumb for important operations
 *
 * Breadcrumbs are trails that help you understand what happened
 * before an error occurred.
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, any>
): void {
  if (!isSentryEnabled()) {
    return;
  }

  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Capture an exception manually
 *
 * Use this for caught exceptions that you still want to track.
 */
export function captureException(
  error: Error | unknown,
  context?: Record<string, any>
): void {
  if (!isSentryEnabled()) {
    console.error('Error (Sentry disabled):', error, context);
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message (not an error)
 *
 * Use this for important events or warnings that aren't errors.
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
): void {
  if (!isSentryEnabled()) {
    console.log(`Message (Sentry disabled) [${level}]:`, message, context);
    return;
  }

  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Set user context for error tracking
 *
 * This helps you understand which users are affected by errors.
 */
export function setUser(user: {
  id?: string;
  email?: string;
  username?: string;
  [key: string]: any;
} | null): void {
  if (!isSentryEnabled()) {
    return;
  }

  Sentry.setUser(user);
}

/**
 * Set custom tags for filtering errors
 */
export function setTags(tags: Record<string, string>): void {
  if (!isSentryEnabled()) {
    return;
  }

  Sentry.setTags(tags);
}

/**
 * Set custom context for additional debugging information
 */
export function setContext(name: string, context: Record<string, any>): void {
  if (!isSentryEnabled()) {
    return;
  }

  Sentry.setContext(name, context);
}

/**
 * Show the Sentry error feedback dialog
 *
 * This allows users to provide additional context when an error occurs.
 */
export function showReportDialog(
  eventId?: string,
  options?: {
    title?: string;
    subtitle?: string;
    subtitle2?: string;
    labelName?: string;
    labelEmail?: string;
    labelComments?: string;
    labelClose?: string;
    labelSubmit?: string;
    errorGeneric?: string;
    errorFormEntry?: string;
    successMessage?: string;
  }
): void {
  if (!isSentryEnabled()) {
    return;
  }

  Sentry.showReportDialog({
    eventId,
    ...options,
  });
}

/**
 * Start a new performance span
 *
 * Use this to measure the performance of specific operations.
 * Returns a callback to run your operation within the span.
 */
export function startSpan<T>(
  name: string,
  op: string,
  callback: () => T,
  data?: Record<string, any>
): T {
  if (!isSentryEnabled()) {
    return callback();
  }

  return Sentry.startSpan(
    {
      name,
      op,
      attributes: data,
    },
    callback
  );
}

// Export Sentry for direct access if needed
export { Sentry };
