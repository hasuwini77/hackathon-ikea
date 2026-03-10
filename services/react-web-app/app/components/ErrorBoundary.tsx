import { Component, type ReactNode } from "react";
import { AlertCircle, RotateCcw, MessageSquare } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { captureException, showReportDialog, Sentry } from "~/lib/sentry";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  eventId: string | null;
}

/**
 * ErrorBoundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 *
 * Features:
 * - Catches render errors, lifecycle method errors, and constructor errors
 * - Logs errors to console for debugging
 * - Provides "Try again" button to reset the boundary
 * - Shows user-friendly error message
 * - Custom fallback UI support
 *
 * Note: Error boundaries do NOT catch:
 * - Event handler errors (use try/catch)
 * - Asynchronous code (setTimeout, promises)
 * - Server-side rendering errors
 * - Errors thrown in the boundary itself
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      eventId: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      eventId: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details for debugging
    console.error("Error caught by ErrorBoundary:", error);
    console.error("Error Info:", errorInfo);

    // Capture error in Sentry and store event ID for user feedback
    Sentry.withScope((scope) => {
      scope.setTag('errorBoundary', 'ErrorBoundary');
      scope.setContext('errorInfo', {
        componentStack: errorInfo.componentStack,
      });

      const eventId = Sentry.captureException(error);
      this.setState({ eventId });
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      eventId: null,
    });
  };

  handleReportFeedback = () => {
    if (this.state.eventId) {
      showReportDialog(this.state.eventId, {
        title: 'It looks like we\'re having issues.',
        subtitle: 'Our team has been notified.',
        subtitle2: 'If you\'d like to help, tell us what happened below.',
        labelComments: 'What happened?',
        labelSubmit: 'Submit',
        successMessage: 'Thank you for your feedback!',
      });
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-destructive/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" aria-hidden="true" />
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                An unexpected error occurred while rendering this page. Please try again or contact support if the problem persists.
              </p>

              {process.env.NODE_ENV === "development" && (
                <div className="bg-muted p-3 rounded-md overflow-auto max-h-40">
                  <p className="text-xs font-mono text-destructive break-words">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Button
                  onClick={this.handleReset}
                  variant="default"
                  size="sm"
                  className="w-full"
                >
                  <RotateCcw className="h-4 w-4" />
                  Try Again
                </Button>

                {this.state.eventId && (
                  <Button
                    onClick={this.handleReportFeedback}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Report Feedback
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
