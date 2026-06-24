/**
 * Environment-Aware Logging Utility
 * 
 * Purpose: 
 * - Development: Logs to console for debugging
 * - Production/Stagging: Silent console (completely suppressed), errors go to Sentry only
 * 
 * Usage:
 * - Replace console.log() with logger.log()
 * - Replace console.error() with logger.error()
 * - Replace console.warn() with logger.warn()
 */

import * as Sentry from "@sentry/react";

// Determine if we're in development mode
const isDevelopment = () => {
  const env = import.meta.env.VITE_ENVIRONMENT || import.meta.env.MODE;
  // Only enable console in development/dev mode
  return env === 'development' || env === 'dev';
};

// Cache the check result
const IS_DEV = isDevelopment();

/**
 * Logger utility that only logs in development
 */
const logger = {
  /**
   * Log informational messages (only in development)
   */
  log: (...args) => {
    if (IS_DEV) {
      console.log(...args);
    }
  },

  /**
   * Log warnings (only in development)
   */
  warn: (...args) => {
    if (IS_DEV) {
      console.warn(...args);
    }
  },

  /**
   * Log errors
   * - Development: Log to console
   * - Production/Stagging: Send to Sentry only (silent console)
   */
  error: (message, error = null) => {
    if (IS_DEV) {
      console.error(message, error || '');
    } else {
      // In production/stagging, send to Sentry but don't log to console
      if (error instanceof Error) {
        Sentry.captureException(error, {
          level: 'error',
          tags: { context: message }
        });
      } else {
        Sentry.captureMessage(message, {
          level: 'error',
          extra: { details: error }
        });
      }
    }
  },

  /**
   * Log debug information (only in development)
   */
  debug: (...args) => {
    if (IS_DEV) {
      console.debug(...args);
    }
  },

  /**
   * Log to console in development, optionally send to Sentry as info
   */
  info: (message, extra = {}) => {
    if (IS_DEV) {
      console.info(message, extra);
    }
    
    // Optionally send important info to Sentry in all environments
    if (extra.sendToSentry) {
      Sentry.captureMessage(message, {
        level: 'info',
        extra
      });
    }
  },

  /**
   * Critical errors — ALWAYS sent to Sentry regardless of environment.
   * Use for failures that must be diagnosed even in dev/stagging APK builds
   * where console logs are not visible to the developer.
   */
  critical: (message, error = null, context = {}) => {
    // Always log to console when in dev (for local debugging)
    if (IS_DEV) {
      console.error('[CRITICAL]', message, error || '', context);
    }
    // Always send to Sentry in every environment
    if (error instanceof Error) {
      Sentry.captureException(error, {
        level: 'fatal',
        tags: { context: message, environment: import.meta.env.VITE_ENVIRONMENT || import.meta.env.MODE },
        extra: { message, ...context }
      });
    } else {
      Sentry.captureMessage(message, {
        level: 'fatal',
        tags: { environment: import.meta.env.VITE_ENVIRONMENT || import.meta.env.MODE },
        extra: { details: error, ...context }
      });
    }
  }
};

export default logger;
