/**
 * Console Override Utility
 * 
 * Suppresses ALL console output in production (including third-party libraries)
 * This completely silences the console for production/stagging environments
 * 
 * Must be imported and executed BEFORE any other code runs
 */

// Determine environment — env var takes priority over hostname check.
// CRITICAL for Capacitor iOS: the WKWebView hostname is the Capacitor
// server.hostname (e.g. dev.servicetones.com), NOT localhost, so checking
// hostname first would silence all logs in the iOS dev build.
const getEnvironment = () => {
  // VITE_ENVIRONMENT is baked in at build time by the GitHub Actions workflow.
  // This is reliable for both web and Capacitor iOS WebView.
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const viteEnv = import.meta.env.VITE_ENVIRONMENT || import.meta.env.MODE;
    if (viteEnv) return viteEnv;
  }

  // Fallback: hostname check for plain local dev without VITE_ENVIRONMENT set
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalHost = hostname === 'localhost' ||
                        hostname === '127.0.0.1' ||
                        hostname.startsWith('192.168.') ||
                        hostname.startsWith('10.0.') ||
                        hostname.endsWith('.codespaces.github.com');
    if (isLocalHost) return 'development';
  }

  return 'production'; // safe default
};

const isDevelopment = () => {
  const env = getEnvironment();
  return env === 'development' || env === 'dev';
};

/**
 * Override all console methods to be silent in production
 * This affects the entire app including all third-party libraries
 */
export const suppressConsoleInProduction = () => {
  if (!isDevelopment()) {
    // Store original methods in case they're needed for debugging
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
      debug: console.debug,
      trace: console.trace,
      table: console.table,
      group: console.group,
      groupEnd: console.groupEnd,
      groupCollapsed: console.groupCollapsed,
      dir: console.dir,
      dirxml: console.dirxml,
      assert: console.assert,
    };

    // Create no-op function
    const noop = () => {};

    // Override all console methods to do nothing
    console.log = noop;
    console.warn = noop;
    console.error = noop;
    console.info = noop;
    console.debug = noop;
    console.trace = noop;
    console.table = noop;
    console.group = noop;
    console.groupEnd = noop;
    console.groupCollapsed = noop;
    console.dir = noop;
    console.dirxml = noop;
    console.assert = noop;

    // Attach original methods to window for emergency debugging
    // Access via: window.__originalConsole.log('debug message')
    if (typeof window !== 'undefined') {
      window.__originalConsole = originalConsole;
    }
  }
};

// Auto-execute on import
suppressConsoleInProduction();
