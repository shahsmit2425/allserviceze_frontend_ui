// IMPORTANT: Must be first import to suppress all console output in production
import "@/utils/consoleOverride";

import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";
import { HelmetProvider } from "react-helmet-async";
import * as Sentry from "@sentry/react";
import logger from "@/utils/logger";
import { getClientMonitoringContext, installFetchTelemetry } from "@/utils/monitoringContext";

// Initialize Sentry for error tracking (controlled by environment variable)
const sentryEnabled = import.meta.env.VITE_SENTRY_ENABLED === 'true';
const sentryDSN = import.meta.env.VITE_SENTRY_DSN;
const clientMonitoringContext = getClientMonitoringContext();

installFetchTelemetry();

if (sentryEnabled && sentryDSN) {
  Sentry.init({
    dsn: sentryDSN,
    environment: clientMonitoringContext.environment,
    release: clientMonitoringContext.release,
    integrations: [
      Sentry.browserTracingIntegration({
        tracePropagationTargets: [
          "localhost",
          "servicetones.com",
          "dev.servicetones.com",
          "stagging.servicetones.com",
          /^\//, // All relative URLs
        ],
      }),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
      Sentry.browserProfilingIntegration(),
    ],
    tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    profilesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
    replaysSessionSampleRate: parseFloat(import.meta.env.VITE_SENTRY_REPLAYS_SESSION_RATE || '0.1'),
    replaysOnErrorSampleRate: parseFloat(import.meta.env.VITE_SENTRY_REPLAYS_ERROR_RATE || '1.0'),
    beforeSend(event, hint) {
      event.tags = {
        ...event.tags,
        surface: clientMonitoringContext.surface,
        client_platform: clientMonitoringContext.platform,
        client_runtime: clientMonitoringContext.runtime,
        client_environment: clientMonitoringContext.environment,
        app_version: clientMonitoringContext.appVersion,
        route: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
      };
      event.contexts = {
        ...event.contexts,
        client_runtime: {
          surface: clientMonitoringContext.surface,
          platform: clientMonitoringContext.platform,
          runtime: clientMonitoringContext.runtime,
          is_native: clientMonitoringContext.isNative,
          release: clientMonitoringContext.release,
          version: clientMonitoringContext.appVersion,
        },
      };

      // Filter out expected 401 errors on auth endpoints
      const error = hint.originalException;
      if (error && typeof error === 'object') {
        // Check if it's an axios error with 401 on auth endpoints
        if (error.response?.status === 401) {
          const url = error.config?.url || '';
          // Don't send to Sentry if it's an expected auth failure
          if (url.includes('/auth/me') || url.includes('/auth/refresh')) {
            return null; // Drop the event
          }
        }
      }
      
      // Add user context if available
      try {
        const userStr = localStorage.getItem('servicetones_user');
        if (userStr) {
          const user = JSON.parse(userStr);
          event.user = {
            ...event.user,
            id: user.id,
            email: user.email,
            username: user.full_name,
          };
          if (user.role) {
            event.tags.user_role = user.role;
          }
        }
      } catch (e) {
        // Silent fail
      }
      return event;
    },
  });
  Sentry.setTags({
    surface: clientMonitoringContext.surface,
    client_platform: clientMonitoringContext.platform,
    client_runtime: clientMonitoringContext.runtime,
    app_version: clientMonitoringContext.appVersion,
  });
  Sentry.setContext('client_runtime', {
    surface: clientMonitoringContext.surface,
    platform: clientMonitoringContext.platform,
    runtime: clientMonitoringContext.runtime,
    is_native: clientMonitoringContext.isNative,
    release: clientMonitoringContext.release,
    version: clientMonitoringContext.appVersion,
  });
  logger.log(`✅ Sentry frontend tracking initialized: ${clientMonitoringContext.environment} (${clientMonitoringContext.surface})`);
}

// Suppress expected auth 401 errors from appearing in console
window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason;
  // Check if it's an expected auth 401 error
  if (error && typeof error === 'object') {
    const is401 = error.response?.status === 401 || error.status === 401;
    const isAuthEndpoint = error.config?.url?.includes('/auth/me') || 
                           error.config?.url?.includes('/auth/refresh') ||
                           error.url?.includes('/auth/me') ||
                           error.url?.includes('/auth/refresh');
    
    if (is401 && isAuthEndpoint) {
      // Prevent the error from being logged to console
      event.preventDefault();
      return;
    }
  }
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>,
);
