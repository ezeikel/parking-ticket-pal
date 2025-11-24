import { Platform } from 'react-native'
import * as Sentry from '@sentry/react-native'
import { usePostHog } from 'posthog-react-native'
import Constants from 'expo-constants'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogContext = {
  screen?: string
  action?: string
  userId?: string
  sessionId?: string
  deviceInfo?: {
    platform: string
    version?: string
    model?: string
  }
  networkInfo?: {
    connected: boolean
    type?: string
  }
  appInfo?: {
    version: string
    buildNumber?: string
    environment: 'development' | 'preview' | 'production' | 'beta'
  }
  [key: string]: any
}

export type LogEntry = {
  level: LogLevel
  message: string
  context?: LogContext
  error?: Error
  timestamp: string
}

class Logger {
  private posthog: any = null
  private sessionId: string = ''

  constructor() {
    this.sessionId = this.generateSessionId()
  }

  setPostHog(posthog: any) {
    this.posthog = posthog
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private getEnvironment(): 'development' | 'preview' | 'production' | 'beta' {
    if (__DEV__) return 'development'
    // Check for EAS build environment
    const environment = process.env.EXPO_PUBLIC_ENVIRONMENT
    if (environment === 'preview' || environment === 'beta' || environment === 'production') {
      return environment as 'preview' | 'production' | 'beta'
    }
    return 'production' // Default to production if not specified
  }

  private getBaseContext(): LogContext {
    return {
      sessionId: this.sessionId,
      deviceInfo: {
        platform: Platform.OS,
        version: Platform.Version?.toString(),
      },
      appInfo: {
        version: Constants.expoConfig?.version || '0.1.0',
        environment: this.getEnvironment()
      },
      timestamp: new Date().toISOString()
    }
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
        ...context
      },
      error,
      timestamp: new Date().toISOString()
    }
  }

  private logToConsole(entry: LogEntry) {
    // Log to console in development and preview environments
    const shouldLogToConsole = __DEV__ || process.env.EXPO_PUBLIC_ENVIRONMENT === 'preview'
    if (!shouldLogToConsole) return

    const prefix = `[${entry.level.toUpperCase()}] ${entry.timestamp}`
    const contextStr = entry.context ? JSON.stringify(entry.context, null, 2) : ''

    switch (entry.level) {
      case 'debug':
        console.debug(prefix, entry.message, contextStr)
        break
      case 'info':
        console.info(prefix, entry.message, contextStr)
        break
      case 'warn':
        console.warn(prefix, entry.message, contextStr, entry.error)
        break
      case 'error':
        console.error(prefix, entry.message, contextStr, entry.error)
        break
    }
  }

  private logToSentry(entry: LogEntry) {
    try {
      // Set context for Sentry
      if (entry.context) {
        Sentry.setContext('log_context', entry.context)

        if (entry.context.screen) {
          Sentry.setTag('screen', entry.context.screen)
        }

        if (entry.context.action) {
          Sentry.setTag('action', entry.context.action)
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
              screen: entry.context?.screen,
              action: entry.context?.action
              // Only essential context to avoid bloat
            }
          })
          break
        case 'warn':
          // Warnings are worth reporting to Sentry
          Sentry.captureMessage(entry.message, 'warning')
          break
        case 'error':
          // Errors and crashes definitely go to Sentry
          if (entry.error) {
            Sentry.captureException(entry.error)
          } else {
            Sentry.captureMessage(entry.message, 'error')
          }
          break
      }
    } catch (error) {
      const shouldLogToConsole = __DEV__ || process.env.EXPO_PUBLIC_ENVIRONMENT === 'preview'
      if (shouldLogToConsole) {
        console.error('Failed to log to Sentry:', error)
      }
    }
  }

  private logToPostHog(entry: LogEntry) {
    try {
      if (!this.posthog) return

      // Log as PostHog event for analytics
      this.posthog.capture('log_entry', {
        log_level: entry.level,
        log_message: entry.message,
        log_screen: entry.context?.screen,
        log_action: entry.context?.action,
        log_session_id: entry.context?.sessionId,
        log_error: entry.error?.message,
        log_error_stack: entry.error?.stack,
        ...entry.context
      })
    } catch (error) {
      const shouldLogToConsole = __DEV__ || process.env.EXPO_PUBLIC_ENVIRONMENT === 'preview'
      if (shouldLogToConsole) {
        console.error('Failed to log to PostHog:', error)
      }
    }
  }

  // Logging strategy:
  // - Console: All levels in dev and preview, none in production/beta
  // - Sentry: Breadcrumbs for debug/info, reports for warn/error (all environments)
  // - PostHog: All levels for analytics and behavior tracking (all environments)

  debug(message: string, context?: LogContext) {
    const entry = this.createLogEntry('debug', message, context)
    this.logToConsole(entry)
    this.logToSentry(entry) // Breadcrumb only
    this.logToPostHog(entry) // Full analytics
  }

  info(message: string, context?: LogContext) {
    const entry = this.createLogEntry('info', message, context)
    this.logToConsole(entry)
    this.logToSentry(entry) // Breadcrumb only
    this.logToPostHog(entry) // Full analytics
  }

  warn(message: string, context?: LogContext, error?: Error) {
    const entry = this.createLogEntry('warn', message, context, error)
    this.logToConsole(entry)
    this.logToSentry(entry) // Reported as warning
    this.logToPostHog(entry) // Full analytics
  }

  error(message: string, context?: LogContext, error?: Error) {
    const entry = this.createLogEntry('error', message, context, error)
    this.logToConsole(entry)
    this.logToSentry(entry) // Reported as error/exception
    this.logToPostHog(entry) // Full analytics
  }

  // Specialized methods for common scenarios
  scannerError(message: string, error?: Error, context?: LogContext) {
    this.error(message, {
      screen: 'scanner',
      action: 'scanning',
      ...context
    }, error)
  }

  ocrError(message: string, error?: Error, context?: LogContext) {
    this.error(message, {
      screen: 'scanner',
      action: 'ocr_processing',
      ...context
    }, error)
  }

  networkError(message: string, error?: Error, context?: LogContext) {
    this.error(message, {
      error_type: 'network',
      ...context
    }, error)
  }

  permissionError(message: string, context?: LogContext) {
    this.error(message, {
      error_type: 'permission',
      ...context
    })
  }

  // Performance logging
  logPerformance(action: string, duration: number, context?: LogContext) {
    this.info(`Performance: ${action} took ${duration}ms`, {
      action,
      performance_duration_ms: duration,
      ...context
    })
  }

  // User flow logging
  logUserFlow(step: string, context?: LogContext) {
    this.info(`User flow: ${step}`, {
      user_flow_step: step,
      ...context
    })
  }
}

// Create singleton instance
const logger = new Logger()

/**
 * Hook to use logger with PostHog integration
 */
export function useLogger() {
  const posthog = usePostHog()

  // Set PostHog instance if not already set
  if (posthog && !logger['posthog']) {
    logger.setPostHog(posthog)
  }

  return logger
}

// Export logger instance for non-hook usage
export { logger }

// Convenience function to track scanner issues specifically
export function logScannerIssue(
  step: 'initialization' | 'permission' | 'camera_open' | 'document_scan' | 'image_pick' | 'ocr_process' | 'gallery_open',
  error: Error,
  context?: LogContext
) {
  logger.scannerError(`Scanner failed at ${step}`, error, {
    scanner_step: step,
    ...context
  })
}