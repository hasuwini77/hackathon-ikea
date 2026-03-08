import { Component, type ReactNode } from "react";
import { WifiOff, RotateCcw, MessageSquare } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { captureException, addBreadcrumb, showReportDialog, Sentry } from "~/lib/sentry";

interface OfflineErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
}

interface OfflineErrorBoundaryState {
  hasError: boolean;
  isNetworkError: boolean;
  eventId: string | null;
}

/**
 * OfflineErrorBoundary Component
 *
 * Specialized error boundary for handling network-related errors.
 * Detects offline scenarios and network failures, showing appropriate
 * messaging and recovery options.
 *
 * Features:
 * - Detects network-related errors (offline, fetch failures)
 * - Shows "You're offline" message with offline styling
 * - "Retry when online" functionality with visual feedback
 * - Uses yellow/orange indicators consistent with SyncStatus
 * - Provides optional callback for retry attempts
 *
 * Styling:
 * - Yellow/orange indicator (matches offline state in SyncStatus)
 * - Accessible error messaging with appropriate ARIA labels
 * - Mobile-responsive card layout
 */
export class OfflineErrorBoundary extends Component<
  OfflineErrorBoundaryProps,
  OfflineErrorBoundaryState
> {
  private retryAttempts = 0;
  private maxRetries = 3;

  constructor(props: OfflineErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      isNetworkError: false,
      eventId: null,
    };
  }

  static getDerivedStateFromError(error: Error) {
    // Check if this is a network-related error
    const isNetworkError =
      error.message.includes("fetch") ||
      error.message.includes("network") ||
      error.message.includes("offline") ||
      error.name === "NetworkError";

    return {
      hasError: true,
      isNetworkError,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Network error caught by OfflineErrorBoundary:", error);
    console.error("Error Info:", errorInfo);

    // Add breadcrumb for network error
    addBreadcrumb(
      'Network error detected',
      'network',
      'warning',
      {
        online: navigator.onLine,
        errorMessage: error.message,
      }
    );

    // Capture in Sentry with offline context
    Sentry.withScope((scope) => {
      scope.setTag('errorBoundary', 'OfflineErrorBoundary');
      scope.setTag('networkError', 'true');
      scope.setTag('online', navigator.onLine ? 'true' : 'false');
      scope.setContext('errorInfo', {
        componentStack: errorInfo.componentStack,
        isNetworkError: this.state.isNetworkError,
      });

      const eventId = Sentry.captureException(error);
      this.setState({ eventId });
    });
  }

  handleRetry = async () => {
    // Check if online before attempting retry
    if (!navigator.onLine) {
      console.warn("Cannot retry: still offline");
      return;
    }

    this.retryAttempts++;

    if (this.retryAttempts <= this.maxRetries) {
      // Call custom retry handler if provided
      if (this.props.onRetry) {
        this.props.onRetry();
      }

      // Add breadcrumb for retry attempt
      addBreadcrumb(
        `Retry attempt ${this.retryAttempts}`,
        'network',
        'info',
        {
          online: navigator.onLine,
          retryAttempts: this.retryAttempts,
        }
      );

      // Reset error state to allow re-rendering
      this.setState({
        hasError: false,
        isNetworkError: false,
        eventId: null,
      });
    } else {
      console.error("Max retries exceeded");
    }
  };

  handleReportFeedback = () => {
    if (this.state.eventId) {
      showReportDialog(this.state.eventId, {
        title: 'Connection Issues',
        subtitle: 'We detected a network error.',
        subtitle2: 'If you\'d like to provide additional context, please share below.',
        labelComments: 'What were you trying to do?',
        labelSubmit: 'Submit',
        successMessage: 'Thank you for your feedback!',
      });
    }
  };

  render() {
    if (this.state.hasError && this.state.isNetworkError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-500">
                <WifiOff className="h-5 w-5" aria-hidden="true" />
                You're Offline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                It looks like you've lost your internet connection. Some features may not work as expected.
              </p>

              <div className="bg-yellow-100/50 dark:bg-yellow-900/20 p-3 rounded-md space-y-2">
                <p className="text-xs font-medium text-yellow-700 dark:text-yellow-500">
                  What you can do:
                </p>
                <ul className="text-xs text-yellow-700 dark:text-yellow-400 space-y-1 list-disc list-inside">
                  <li>Check your internet connection</li>
                  <li>Try using the app in offline mode</li>
                  <li>Retry when your connection is restored</li>
                </ul>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={this.handleRetry}
                  disabled={!navigator.onLine}
                  variant="outline"
                  size="sm"
                  className="w-full border-yellow-500/30 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                  aria-label="Retry connection"
                >
                  <RotateCcw className="h-4 w-4" />
                  {!navigator.onLine
                    ? "Waiting for connection..."
                    : `Retry (${this.retryAttempts}/${this.maxRetries})`}
                </Button>

                {this.state.eventId && navigator.onLine && (
                  <Button
                    onClick={this.handleReportFeedback}
                    variant="outline"
                    size="sm"
                    className="w-full border-yellow-500/30"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Report Issue
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Retries remaining: {this.maxRetries - this.retryAttempts}
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
