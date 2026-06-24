const DEFAULT_APP_VERSION = "2.0.0";

function getBackendOrigin() {
  const backendBase = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL;

  if (!backendBase) {
    return typeof window !== "undefined" ? window.location.origin : null;
  }

  try {
    return new URL(backendBase, typeof window !== "undefined" ? window.location.origin : undefined).origin;
  } catch {
    return null;
  }
}

export function detectClientSurface() {
  const capacitor = typeof window !== "undefined" ? window.Capacitor : undefined;

  if (!capacitor?.isNativePlatform?.()) {
    return {
      surface: "web",
      platform: "web",
      runtime: "browser",
      isNative: false,
    };
  }

  let platform = "web";
  try {
    platform = capacitor.getPlatform?.() || "web";
  } catch {
    platform = "web";
  }

  const surface = platform === "ios" ? "ios" : platform === "android" ? "android" : "web";

  return {
    surface,
    platform: surface,
    runtime: "capacitor",
    isNative: surface !== "web",
  };
}

export function getClientMonitoringContext() {
  const surfaceContext = detectClientSurface();
  const environment = import.meta.env.VITE_ENVIRONMENT || import.meta.env.MODE || "development";
  const appVersion = import.meta.env.VITE_APP_VERSION || DEFAULT_APP_VERSION;

  return {
    ...surfaceContext,
    environment,
    appVersion,
    release: `servicetones-client-${surfaceContext.surface}@${appVersion}`,
  };
}

export function buildClientTelemetryHeaders() {
  const context = getClientMonitoringContext();

  return {
    "X-Client-Surface": context.surface,
    "X-Client-Platform": context.platform,
    "X-Client-Runtime": context.runtime,
    "X-Client-Environment": context.environment,
    "X-Client-Release": context.release,
    "X-Client-Version": context.appVersion,
  };
}


function generateRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}


export function createClientTelemetryHeaders() {
  return {
    ...buildClientTelemetryHeaders(),
    "X-Request-ID": generateRequestId(),
  };
}

export function shouldAttachTelemetryHeaders(requestUrl) {
  if (!requestUrl) return true;
  if (requestUrl.startsWith("/")) return true;

  const backendOrigin = getBackendOrigin();
  if (!backendOrigin) return false;

  try {
    const resolvedUrl = new URL(
      requestUrl,
      typeof window !== "undefined" ? window.location.origin : backendOrigin,
    );
    return resolvedUrl.origin === backendOrigin;
  } catch {
    return false;
  }
}


export function installFetchTelemetry() {
  if (typeof window === "undefined" || typeof window.fetch !== "function") {
    return;
  }

  if (window.__servicetonesFetchTelemetryInstalled) {
    return;
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const requestUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input?.url;

    if (!shouldAttachTelemetryHeaders(requestUrl)) {
      return originalFetch(input, init);
    }

    const headers = new Headers(input instanceof Request ? input.headers : init.headers);
    const telemetryHeaders = createClientTelemetryHeaders();
    Object.entries(telemetryHeaders).forEach(([headerName, headerValue]) => {
      if (headerValue && !headers.has(headerName)) {
        headers.set(headerName, headerValue);
      }
    });

    if (input instanceof Request) {
      return originalFetch(new Request(input, { ...init, headers }));
    }

    return originalFetch(input, { ...init, headers });
  };

  window.__servicetonesFetchTelemetryInstalled = true;
}