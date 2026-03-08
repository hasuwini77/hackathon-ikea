import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "~/components/ui/button";
import { showReportDialog, isSentryEnabled, Sentry } from "~/lib/sentry";

interface SentryFeedbackProps {
  /**
   * Sentry event ID to associate feedback with a specific error
   */
  eventId?: string;

  /**
   * Optional custom title for the feedback dialog
   */
  title?: string;

  /**
   * Optional custom subtitle for the feedback dialog
   */
  subtitle?: string;

  /**
   * Button variant
   */
  variant?: "default" | "outline" | "ghost" | "destructive";

  /**
   * Button size
   */
  size?: "sm" | "default" | "lg";

  /**
   * Custom button text
   */
  buttonText?: string;

  /**
   * Additional CSS classes for the button
   */
  className?: string;

  /**
   * Whether to show the button when Sentry is disabled
   */
  hideWhenDisabled?: boolean;
}

/**
 * SentryFeedback Component
 *
 * Provides a button to trigger the Sentry user feedback dialog.
 * This allows users to report issues or provide additional context
 * when errors occur.
 *
 * Features:
 * - Customizable appearance and text
 * - Automatically hides when Sentry is disabled (optional)
 * - Can be associated with specific error events
 * - Accessible with proper ARIA labels
 *
 * Usage:
 * ```tsx
 * // Basic usage
 * <SentryFeedback />
 *
 * // With specific error event
 * <SentryFeedback eventId={errorEventId} />
 *
 * // Customized
 * <SentryFeedback
 *   variant="outline"
 *   buttonText="Send Feedback"
 *   title="Share Your Experience"
 * />
 * ```
 */
export function SentryFeedback({
  eventId,
  title,
  subtitle,
  variant = "outline",
  size = "sm",
  buttonText = "Report Feedback",
  className,
  hideWhenDisabled = true,
}: SentryFeedbackProps) {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    // Check if Sentry is enabled on mount
    setIsEnabled(isSentryEnabled());
  }, []);

  // Hide button if Sentry is disabled and hideWhenDisabled is true
  if (hideWhenDisabled && !isEnabled) {
    return null;
  }

  const handleClick = () => {
    if (!isEnabled) {
      console.warn('Sentry is not enabled. Cannot show feedback dialog.');
      return;
    }

    showReportDialog(eventId, {
      title: title || 'We value your feedback',
      subtitle: subtitle || 'Help us improve by sharing your experience.',
      subtitle2: 'Please describe what happened and what you expected.',
      labelName: 'Name (optional)',
      labelEmail: 'Email (optional)',
      labelComments: 'What happened?',
      labelClose: 'Close',
      labelSubmit: 'Submit Feedback',
      errorGeneric: 'An error occurred while submitting feedback. Please try again.',
      errorFormEntry: 'Please fill in the required fields.',
      successMessage: 'Thank you for your feedback! We appreciate your help.',
    });
  };

  return (
    <Button
      onClick={handleClick}
      variant={variant}
      size={size}
      className={className}
      aria-label="Report feedback to development team"
      disabled={!isEnabled}
    >
      <MessageSquare className="h-4 w-4" />
      {buttonText}
    </Button>
  );
}

/**
 * Hook to capture and show feedback for the last error
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const { captureError, showFeedback, eventId } = useSentryFeedback();
 *
 *   const handleError = () => {
 *     try {
 *       // risky operation
 *     } catch (error) {
 *       captureError(error);
 *       // Optionally show feedback dialog immediately
 *       showFeedback();
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       {eventId && <SentryFeedback eventId={eventId} />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSentryFeedback() {
  const [eventId, setEventId] = useState<string | null>(null);

  const captureError = (error: Error | unknown, context?: Record<string, any>) => {
    if (!isSentryEnabled()) {
      console.error('Error (Sentry disabled):', error, context);
      return null;
    }

    const id = Sentry.captureException(error, {
      extra: context,
    });

    setEventId(id);
    return id;
  };

  const captureMessage = (
    message: string,
    level: 'info' | 'warning' | 'error' = 'info',
    context?: Record<string, any>
  ) => {
    if (!isSentryEnabled()) {
      console.log(`Message (Sentry disabled) [${level}]:`, message, context);
      return null;
    }

    const id = Sentry.captureMessage(message, {
      level,
      extra: context,
    });

    setEventId(id);
    return id;
  };

  const showFeedback = (customEventId?: string, options?: {
    title?: string;
    subtitle?: string;
  }) => {
    const id = customEventId || eventId;
    if (!id) {
      console.warn('No event ID available for feedback');
      return;
    }

    showReportDialog(id, {
      title: options?.title || 'Report Issue',
      subtitle: options?.subtitle || 'Help us understand what went wrong.',
      subtitle2: 'Your feedback will help us fix this issue.',
      labelComments: 'What happened?',
      labelSubmit: 'Submit',
      successMessage: 'Thank you for your feedback!',
    });
  };

  const clearEventId = () => {
    setEventId(null);
  };

  return {
    eventId,
    captureError,
    captureMessage,
    showFeedback,
    clearEventId,
  };
}
