import * as Sentry from '@sentry/nextjs';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = {
  page?: string; // Use 'page' for web instead of 'screen'
  action?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  userAgent?: string;
  ip?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  appInfo?: {
    version: string;
    environment: 'development' | 'staging' | 'production';
  };
  [key: string]: unknown;
};

export type LogEntry = {
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  timestamp: string;
};

class Logger {
  private posthog: unknown = null;
  private sessionId: string = '';

  constructor() {
    this.sessionId = Logger.generateSessionId();
  }

  setPostHog(posthog: any) {
    this.posthog = posthog;
  }

  private static generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getBaseContext(): LogContext {
    return {
      sessionId: this.sessionId,
      appInfo: {
        version: process.env.npm_package_version || '0.1.0',
        environment: process.env.NODE_ENV === 'development' ? 'development' : 'production',
      },
      timestamp: new Date().toISOString(),
    };
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    return {
      level,
      message,
      context: {
        ...this.getBaseContext(),
        ...context,
      },
      error,
      timestamp: new Date().toISOString(),
    };
  }

  private logToConsole(entry: LogEntry) {
    if (process.env.NODE_ENV !== 'development') return;

    const prefix = `[${entry.level.toUpperCase()}] ${entry.timestamp}`;
    const contextStr = entry.context ? JSON.stringify(entry.context, null, 2) : '';

    switch (entry.level) {
      case 'debug':
        console.debug(prefix, entry.message, contextStr);
        break;
      case 'info':
        console.info(prefix, entry.message, contextStr);
        break;
      case 'warn':
        console.warn(prefix, entry.message, contextStr, entry.error);
        break;
      case 'error':
        console.error(prefix, entry.message, contextStr, entry.error);
        break;
    }
  }

  private logToSentry(entry: LogEntry) {
    try {
      // Set context for Sentry
      if (entry.context) {
        Sentry.setContext('log_context', entry.context);

        if (entry.context.page) {
          Sentry.setTag('page', entry.context.page);
        }

        if (entry.context.action) {
          Sentry.setTag('action', entry.context.action);
        }

        if (entry.context.userId) {
          Sentry.setUser({ id: entry.context.userId });
        }
      }

      switch (entry.level) {
        case 'debug':
        case 'info':
          // Only add as breadcrumbs for context, don't spam Sentry with debug/info
          Sentry.addBreadcrumb({
            message: entry.message,
            level: entry.level,
            data: {
              page: entry.context?.page,
              action: entry.context?.action,
              // Only essential context to avoid bloat
            },
          });
          break;
        case 'warn':
          // Warnings are worth reporting to Sentry
          Sentry.captureMessage(entry.message, 'warning');
          break;
        case 'error':
          // Errors and crashes definitely go to Sentry
          if (entry.error) {
            Sentry.captureException(entry.error);
          } else {
            Sentry.captureMessage(entry.message, 'error');
          }
          break;
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to log to Sentry:', error);
      }
    }
  }

  private logToPostHog(entry: LogEntry) {
    try {
      // Use the same clean pattern as analytics.ts
      if (typeof window !== 'undefined') {
        const posthog = (window as any).posthog;
        if (posthog && posthog.__loaded) {
          posthog.capture('log_entry', {
            log_level: entry.level,
            log_message: entry.message,
            log_page: entry.context?.page,
            log_action: entry.context?.action,
            log_session_id: entry.context?.sessionId,
            log_error: entry.error?.message,
            log_error_stack: entry.error?.stack,
            ...entry.context,
          });
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Failed to log to PostHog:', error);
      }
    }
  }

  // Logging strategy:
  // - Console: All levels in dev, none in production
  // - Sentry: Breadcrumbs for debug/info, reports for warn/error
  // - PostHog: All levels for analytics and behavior tracking

  debug(message: string, context?: LogContext) {
    const entry = this.createLogEntry('debug', message, context);
    this.logToConsole(entry);
    this.logToSentry(entry); // Breadcrumb only
    this.logToPostHog(entry); // Full analytics
  }

  info(message: string, context?: LogContext) {
    const entry = this.createLogEntry('info', message, context);
    this.logToConsole(entry);
    this.logToSentry(entry); // Breadcrumb only
    this.logToPostHog(entry); // Full analytics
  }

  warn(message: string, context?: LogContext, error?: Error) {
    const entry = this.createLogEntry('warn', message, context, error);
    this.logToConsole(entry);
    this.logToSentry(entry); // Reported as warning
    this.logToPostHog(entry); // Full analytics
  }

  error(message: string, context?: LogContext, error?: Error) {
    const entry = this.createLogEntry('error', message, context, error);
    this.logToConsole(entry);
    this.logToSentry(entry); // Reported as error/exception
    this.logToPostHog(entry); // Full analytics
  }

  // Specialized methods for common scenarios
  apiError(message: string, error?: Error, context?: LogContext) {
    this.error(message, {
      error_type: 'api',
      ...context,
    }, error);
  }

  ocrError(message: string, error?: Error, context?: LogContext) {
    this.error(message, {
      action: 'ocr_processing',
      error_type: 'ocr',
      ...context,
    }, error);
  }

  networkError(message: string, error?: Error, context?: LogContext) {
    this.error(message, {
      error_type: 'network',
      ...context,
    }, error);
  }

  authError(message: string, error?: Error, context?: LogContext) {
    this.error(message, {
      error_type: 'authentication',
      ...context,
    }, error);
  }

  // Performance logging
  logPerformance(action: string, duration: number, context?: LogContext) {
    this.info(`Performance: ${action} took ${duration}ms`, {
      action,
      performance_duration_ms: duration,
      ...context,
    });
  }

  // User flow logging
  logUserFlow(step: string, context?: LogContext) {
    this.info(`User flow: ${step}`, {
      user_flow_step: step,
      ...context,
    });
  }

  // Server action logging
  logServerAction(action: string, context?: LogContext) {
    this.info(`Server action: ${action}`, {
      action_type: 'server_action',
      action,
      ...context,
    });
  }
}

// Create singleton instance
const logger = new Logger();

// Export logger instance
export { logger };

// Server-side helper for Next.js API routes and server actions
export function createServerLogger(context?: Partial<LogContext>) {
  const baseContext = {
    server: true,
    ...context,
  };

  return {
    debug: (message: string, additionalContext?: LogContext) =>
      logger.debug(message, { ...baseContext, ...additionalContext }),
    info: (message: string, additionalContext?: LogContext) =>
      logger.info(message, { ...baseContext, ...additionalContext }),
    warn: (message: string, additionalContext?: LogContext, error?: Error) =>
      logger.warn(message, { ...baseContext, ...additionalContext }, error),
    error: (message: string, additionalContext?: LogContext, error?: Error) =>
      logger.error(message, { ...baseContext, ...additionalContext }, error),
  };
}

// Client-side helper with PostHog integration
export function createClientLogger(posthog?: any, context?: Partial<LogContext>) {
  if (posthog) {
    logger.setPostHog(posthog);
  }

  const baseContext = {
    client: true,
    ...context,
  };

  return {
    debug: (message: string, additionalContext?: LogContext) =>
      logger.debug(message, { ...baseContext, ...additionalContext }),
    info: (message: string, additionalContext?: LogContext) =>
      logger.info(message, { ...baseContext, ...additionalContext }),
    warn: (message: string, additionalContext?: LogContext, error?: Error) =>
      logger.warn(message, { ...baseContext, ...additionalContext }, error),
    error: (message: string, additionalContext?: LogContext, error?: Error) =>
      logger.error(message, { ...baseContext, ...additionalContext }, error),
  };
}

/**
 * DEPRECATED: Use `useLogger` from '@/lib/use-logger' instead
 *
 * This function remains for backward compatibility but the new
 * hook in use-logger.ts properly integrates with PostHog's
 * recommended Next.js patterns.
 */
export function useLogger(context?: Partial<LogContext>) {
  if (typeof window === 'undefined') {
    throw new Error('useLogger can only be used in client components. Use createServerLogger for server-side logging.');
  }

  console.warn('DEPRECATED: Import useLogger from "@/lib/use-logger" instead for proper PostHog integration');

  let posthog: any = null;
  try {
    if (typeof window !== 'undefined' && (window as any).posthog) {
      posthog = (window as any).posthog;
    }
  } catch {
    // PostHog not available
  }

  return createClientLogger(posthog, context);
}