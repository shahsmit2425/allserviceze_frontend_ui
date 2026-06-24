import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import logger from "@/utils/logger";
import {
  createClientTelemetryHeaders,
  shouldAttachTelemetryHeaders,
} from "@/utils/monitoringContext";
import {
  clearAuthSessionSource,
  getAuthSessionSource,
  NATIVE_GOOGLE_IOS_SESSION_SOURCE,
  setAuthSessionSource,
} from "@/mobile/utils/authSessionSource";

let firebaseAuthServicePromise;
const getFirebaseAuthService = async () => {
  if (!firebaseAuthServicePromise) {
    firebaseAuthServicePromise = import("../services/firebaseAuthService").then((module) => module.default);
  }

  return firebaseAuthServicePromise;
};

const DEVICE_TOKEN_STORAGE_KEY = 'servicetones_device_token';
const PENDING_PUSH_NAVIGATION_KEY = 'servicetones_pending_push_navigation';

const getStoredDeviceToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem(DEVICE_TOKEN_STORAGE_KEY);
};

const clearStoredDeviceToken = () => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(DEVICE_TOKEN_STORAGE_KEY);
};

const clearPendingPushNavigation = () => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(PENDING_PUSH_NAVIGATION_KEY);
};

// MOBILE ONLY: Lazy import for secure storage
let secureAuthStorage;
const getSecureStorage = async () => {
  if (!secureAuthStorage && window.Capacitor?.isNativePlatform?.()) {
    const module = await import('@/mobile/utils/secureAuth');
    secureAuthStorage = module.secureAuthStorage;
  }
  return secureAuthStorage;
};

const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;
const AUTH_FLOW_TIMEOUT_MS = 15000;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

// Helper to determine theme based on user role

// Strip sensitive PII fields before writing to localStorage.
// Auth tokens live in httpOnly cookies; email/phone must not sit in localStorage
// where XSS could read them.
const sanitizeForStorage = (user) => {
  if (!user) return null;
  const { email, phone, stripe_verification_status, verification_submitted_at, verification_completed_at, ...safe } = user;
  return safe;
};

const withTimeout = (promise, message) => {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, AUTH_FLOW_TIMEOUT_MS);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    window.clearTimeout(timeoutId);
  });
};

const getFirebaseIdToken = (firebaseUser, forceRefresh = false) => {
  return withTimeout(
    firebaseUser.getIdToken(forceRefresh),
    'Sign in timed out while retrieving your Firebase session. Please try again.'
  );
};

const exchangeFirebaseSession = (idToken, payload = {}) => {
  return withTimeout(
    axios.post(
      `${API_URL}/auth/login/firebase-session`,
      { id_token: idToken, ...payload },
      {
        withCredentials: true,
        timeout: AUTH_FLOW_TIMEOUT_MS,
      }
    ),
    'Sign in timed out while finishing your session. Please try again.'
  );
};

const persistNativeAuthState = (userData, csrf, sessionSource = null, source = 'login') => {
  const isNative = window.Capacitor?.isNativePlatform?.() ?? false;
  if (!isNative || !csrf) {
    return;
  }

  void (async () => {
    const storage = await getSecureStorage();
    if (!storage) {
      return;
    }

    await withTimeout(
      storage.saveAuth(userData, csrf, null, null, sessionSource),
      'Timed out while saving your mobile session. Please try again.'
    );
    logger.info(`✅ Auth saved to SecureStorage via ${source}`);
  })().catch((error) => {
    logger.error(`Failed to persist native auth state via ${source}:`, error);
  });
};

const persistLoginState = async (userData, csrf, setUser, setCsrfToken, sessionSource = null) => {
  if (sessionSource) {
    setAuthSessionSource(sessionSource);
  } else {
    clearAuthSessionSource();
  }

  setUser(userData);
  setCsrfToken(csrf);
  localStorage.setItem('servicetones_user', JSON.stringify(sanitizeForStorage(userData)));

  persistNativeAuthState(userData, csrf, sessionSource, 'login');
};

const applySessionPayload = async (sessionPayload, setUser, setCsrfToken, sessionSource = null) => {
  if (!sessionPayload?.user) {
    throw new Error('Missing authenticated user in session response');
  }

  await persistLoginState(sessionPayload.user, sessionPayload.csrf_token, setUser, setCsrfToken, sessionSource);
  return sessionPayload.user;
};

const getThemeFromUser = (user) => {
  if (!user) return "customer";
  if (user.is_admin) return "admin";
  return user.role || "customer";
};

export const AuthProvider = ({ children }) => {
  // Lazy initializer — user is set synchronously on first render from
  // localStorage so ProtectedRoute never sees a null→value flicker.
  const [user, setUser] = useState(() => {
    try {
      // Migrate legacy storage key if present.
      const old = localStorage.getItem('allservize_user');
      if (old) {
        localStorage.setItem('servicetones_user', old);
        localStorage.removeItem('allservize_user');
      }
      const saved = localStorage.getItem('servicetones_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      localStorage.removeItem('servicetones_user');
      return null;
    }
  });
  const [csrfToken, setCsrfToken] = useState(() => {
    // MOBILE FIX: Use localStorage instead of sessionStorage for mobile apps
    // sessionStorage doesn't persist when app goes to background in WebViews
    const isNative = window.Capacitor?.isNativePlatform?.() ?? false;
    const storage = isNative ? localStorage : sessionStorage;
    
    // Migrate from sessionStorage to localStorage for mobile
    if (isNative) {
      const oldCsrf = sessionStorage.getItem('servicetones_csrf');
      if (oldCsrf) {
        localStorage.setItem('servicetones_csrf', oldCsrf);
        sessionStorage.removeItem('servicetones_csrf');
        return oldCsrf;
      }
    }
    
    return storage.getItem('servicetones_csrf') || null;
  });
  const [loading, setLoading] = useState(true);

  const getStoredCsrfToken = () => localStorage.getItem('servicetones_csrf') || sessionStorage.getItem('servicetones_csrf');

  const getActiveCsrfToken = () => csrfToken || getStoredCsrfToken();

  // Persist csrfToken to appropriate storage (localStorage for mobile, sessionStorage for web)
  useEffect(() => {
    const isNative = window.Capacitor?.isNativePlatform?.() ?? false;
    const storage = isNative ? localStorage : sessionStorage;
    
    if (csrfToken) {
      storage.setItem('servicetones_csrf', csrfToken);
    } else {
      storage.removeItem('servicetones_csrf');
      // Clean up both storages to be safe
      localStorage.removeItem('servicetones_csrf');
      sessionStorage.removeItem('servicetones_csrf');
    }
  }, [csrfToken]);

  // localStorage restore is now handled by the useState lazy initializer above.

  // Setup axios interceptors for automatic CSRF token and credentials
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        // Default to cookie auth unless a caller explicitly opts out for public requests.
        if (typeof config.withCredentials === 'undefined') {
          config.withCredentials = true;
        }

        if (shouldAttachTelemetryHeaders(config.url)) {
          const telemetryHeaders = createClientTelemetryHeaders();
          config.headers = config.headers || {};
          Object.entries(telemetryHeaders).forEach(([headerName, headerValue]) => {
            if (headerValue && typeof config.headers[headerName] === 'undefined') {
              config.headers[headerName] = headerValue;
            }
          });
        }
        
        // Add CSRF token for state-changing operations
        const activeCsrfToken = getActiveCsrfToken();
        if (activeCsrfToken && ['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase())) {
          config.headers['X-CSRF-Token'] = activeCsrfToken;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    let isRefreshing = false;
    let failedQueue = [];

    const processQueue = (error) => {
      failedQueue.forEach(prom => {
        if (error) prom.reject(error);
        else prom.resolve();
      });
      failedQueue = [];
    };

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Suppress logging for expected 401s on auth endpoints (completely silent)
        const isAuthEndpoint = originalRequest.url?.includes('/auth/me') || 
                               originalRequest.url?.includes('/auth/refresh');
        const is401 = error.response?.status === 401;
        
        // Never retry the refresh endpoint itself or already-retried requests
        if (
          error.response?.status !== 401 ||
          originalRequest._retry ||
          originalRequest.url?.includes('/auth/refresh') ||
          originalRequest.url?.includes('/auth/login') ||
          originalRequest.url?.includes('/auth/register')
        ) {
          // Silently reject - no logging at all
          return Promise.reject(error);
        }

        if (isRefreshing) {
          // Queue this request until the refresh completes
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(() => {
            originalRequest._retry = true;
            return axios(originalRequest);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshResponse = await axios.post(`${API_URL}/auth/refresh`, {}, {
            withCredentials: true,
            _retry: true, // Prevent interceptor from catching this
            validateStatus: (status) => status < 500 // Treat 401 as valid, not an error
          });
          
          if (refreshResponse.status === 200) {
            // Refresh successful — update CSRF token if server rotated it
            const newCsrf = refreshResponse.data?.csrf_token;
            if (newCsrf) setCsrfToken(newCsrf);
            processQueue(null);
            return axios(originalRequest);
          } else {
            // 401 - session expired, fail all queued requests without retrying
            processQueue({ silent: true, status: 401 });
            setCsrfToken(null);
            setUser(null);
            return Promise.reject({ silent: true, status: 401 });
          }
        } catch (refreshError) {
          // Transient server errors should not force a logout.
          processQueue(refreshError);
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [csrfToken]);

  // Apply theme to document
  useEffect(() => {
    const theme = getThemeFromUser(user);
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.removeAttribute("data-color-mode");
  }, [user]);

  // Check authentication status on mount (silent - no console errors)
  useEffect(() => {
    const initAuth = async () => {
      const isNative = window.Capacitor?.isNativePlatform?.() ?? false;
      
      // MOBILE: localStorage can disappear across WebView restarts, so try
      // SecureStorage before hitting the network.
      if (isNative && !localStorage.getItem('servicetones_user')) {
        if (isNative) {
          const storage = await getSecureStorage();
          const savedAuth = storage ? await storage.loadAuth() : null;
          
          if (savedAuth && savedAuth.user) {
            logger.info('🔑 Restored auth from SecureStorage on cold start');
            setAuthSessionSource(savedAuth.sessionSource || null);
            setUser(savedAuth.user);
            setCsrfToken(savedAuth.csrfToken);
            localStorage.setItem('servicetones_user', JSON.stringify(sanitizeForStorage(savedAuth.user)));
            setLoading(false);
            return;
          }
        }
      }

      try {
        const response = await axios.get(`${API_URL}/auth/me`, {
          withCredentials: true,
          validateStatus: (status) => status < 500 // Treat 401 as valid, not an error
        });
        
        if (response.status === 200 && response.data) {
          // Successful auth — update stored profile with fresh server data
          const userData = response.data.user ?? response.data;
          const freshCsrf = response.data.csrf_token;
          setUser(userData);
          if (freshCsrf) setCsrfToken(freshCsrf);
          localStorage.setItem('servicetones_user', JSON.stringify(sanitizeForStorage(userData)));
          
          // MOBILE: Save to SecureStorage as backup
          if (isNative) {
            const storage = await getSecureStorage();
            if (storage) {
              await storage.saveAuth(userData, freshCsrf, null, null, getAuthSessionSource());
            }
          }
        } else if (response.status === 401 || response.status === 403) {
          // MOBILE: Cookie auth failed - try SecureStorage backup
          if (isNative) {
            logger.info('🔑 Cookie auth failed, trying SecureStorage backup...');
            const storage = await getSecureStorage();
            const savedAuth = storage ? await storage.loadAuth() : null;
            
            if (savedAuth && savedAuth.user) {
              logger.info('✅ Restored auth from SecureStorage - operating in offline-capable mode');
              setAuthSessionSource(savedAuth.sessionSource || null);
              setUser(savedAuth.user);
              setCsrfToken(savedAuth.csrfToken);
              localStorage.setItem('servicetones_user', JSON.stringify(sanitizeForStorage(savedAuth.user)));
              
              // Note: User stays logged in with cached data even if backend session expired
              // API calls may fail with 401, but user can still browse cached content
              logger.warn('⚠️ Backend session expired, using cached auth. Some features may be limited until online.');
            } else {
              // No backup found - clear everything
              logger.info('❌ No SecureStorage backup found');
              clearAuthSessionSource();
              setUser(null);
              setCsrfToken(null);
              localStorage.removeItem('servicetones_user');
              localStorage.removeItem('servicetones_csrf');
            }
          } else {
            // WEB: Access token expired — try refresh before giving up.
            // validateStatus on /auth/me bypasses the interceptor's refresh logic,
            // so we must attempt the refresh manually here.
            const hasCachedSession = Boolean(localStorage.getItem('servicetones_user') || getStoredCsrfToken());

            if (!hasCachedSession) {
              clearAuthSessionSource();
              setUser(null);
              setCsrfToken(null);
              localStorage.removeItem('servicetones_user');
              sessionStorage.removeItem('servicetones_csrf');
              return;
            }

            let refreshedOk = false;
            try {
              const refreshResp = await axios.post(`${API_URL}/auth/refresh`, {}, {
                withCredentials: true,
                validateStatus: (s) => s < 500,
              });
              if (refreshResp.status === 200) {
                const newCsrf = refreshResp.data?.csrf_token;
                if (newCsrf) setCsrfToken(newCsrf);
                // Retry /auth/me with fresh tokens
                const retryResp = await axios.get(`${API_URL}/auth/me`, {
                  withCredentials: true,
                  validateStatus: (s) => s < 500,
                });
                if (retryResp.status === 200 && retryResp.data) {
                  const userData = retryResp.data.user ?? retryResp.data;
                  const freshCsrf = retryResp.data.csrf_token;
                  setUser(userData);
                  if (freshCsrf) setCsrfToken(freshCsrf);
                  localStorage.setItem('servicetones_user', JSON.stringify(sanitizeForStorage(userData)));
                  refreshedOk = true;
                }
              }
            } catch {
              // Network error during refresh — keep cached session (server may be down)
              refreshedOk = true; // prevent clearing below
            }
            if (!refreshedOk) {
              // Both /auth/me and /auth/refresh returned 401 — session truly expired
              clearAuthSessionSource();
              setUser(null);
              setCsrfToken(null);
              localStorage.removeItem('servicetones_user');
              sessionStorage.removeItem('servicetones_csrf');
            }
          }
        }
        // Any other non-200 (429 rate-limit, etc.) — keep cached session.
        // The interceptor will refresh the token on the next real API call.
      } catch (error) {
        // Only 5xx errors reach here (validateStatus absorbs 4xx).
        // Server may be temporarily down — keep the cached session.
        if (error.response?.status >= 500) {
          logger.error('Server error during auth init:', error);
        }
        
        // MOBILE: On network error, still try to restore from SecureStorage
        if (isNative && !user) {
          const storage = await getSecureStorage();
          const savedAuth = storage ? await storage.loadAuth() : null;
          
          if (savedAuth && savedAuth.user) {
            logger.info('🔑 Network error, restored from SecureStorage (offline mode)');
            setAuthSessionSource(savedAuth.sessionSource || null);
            setUser(savedAuth.user);
            setCsrfToken(savedAuth.csrfToken);
            localStorage.setItem('servicetones_user', JSON.stringify(sanitizeForStorage(savedAuth.user)));
          }
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // MOBILE FIX: Refresh auth when app resumes from background
  useEffect(() => {
    // Only add listener for native mobile apps
    if (!window.Capacitor?.isNativePlatform?.()) {
      return;
    }

    let appStateListener;

    const setupAppStateListener = async () => {
      try {
        const { App } = await import('@capacitor/app');
        
        // Listen for app state changes
        appStateListener = await App.addListener('appStateChange', async ({ isActive }) => {
          if (isActive && user) {
            // App came to foreground and user was logged in - refresh session
            logger.info('App resumed - refreshing auth session');
            
            try {
              const response = await axios.get(`${API_URL}/auth/me`, {
                withCredentials: true,
                validateStatus: (status) => status < 500
              });
              
              if (response.status === 200 && response.data) {
                const userData = response.data.user ?? response.data;
                const freshCsrf = response.data.csrf_token;
                setUser(userData);
                if (freshCsrf) setCsrfToken(freshCsrf);
                localStorage.setItem('servicetones_user', JSON.stringify(sanitizeForStorage(userData)));
                
                // Update SecureStorage with fresh data
                const storage = await getSecureStorage();
                if (storage) {
                  await storage.saveAuth(userData, freshCsrf, null, null, getAuthSessionSource());
                }
                
                logger.info('Auth session refreshed successfully');
              } else if (response.status === 401 || response.status === 403) {
                // Session expired - try SecureStorage backup
                logger.warn('Session expired on app resume, trying SecureStorage...');
                const storage = await getSecureStorage();
                const savedAuth = storage ? await storage.loadAuth() : null;
                
                if (savedAuth && savedAuth.user) {
                  logger.info('✅ Restored from SecureStorage on resume');
                  setAuthSessionSource(savedAuth.sessionSource || null);
                  setUser(savedAuth.user);
                  setCsrfToken(savedAuth.csrfToken);
                  localStorage.setItem('servicetones_user', JSON.stringify(sanitizeForStorage(savedAuth.user)));
                } else {
                  // No backup - logout
                  clearAuthSessionSource();
                  setUser(null);
                  setCsrfToken(null);
                  localStorage.removeItem('servicetones_user');
                  localStorage.removeItem('servicetones_csrf');
                }
              }
            } catch (error) {
              logger.error('Failed to refresh auth on app resume:', error);
            }
          }
        });
      } catch (error) {
        logger.error('Failed to setup app state listener:', error);
      }
    };

    setupAppStateListener();

    // Cleanup listener on unmount
    return () => {
      if (appStateListener) {
        appStateListener.remove();
      }
    };
  }, [user]); // Re-run when user changes to capture current state

  const login = async (email, password) => {
    const firebaseAuthService = await getFirebaseAuthService();
    const credential = await firebaseAuthService.signIn(email, password);
    const idToken = await getFirebaseIdToken(credential.user);
    const response = await exchangeFirebaseSession(idToken);

    await persistLoginState(response.data.user, response.data.csrf_token, setUser, setCsrfToken);
    return response.data.user;
  };

  const register = async (data) => {
    const firebaseAuthService = await getFirebaseAuthService();
    const credential = await firebaseAuthService.register(data.email, data.password, data.full_name);

    const idToken = await getFirebaseIdToken(credential.user);
    const response = await exchangeFirebaseSession(idToken, {
      create_if_missing: true,
      full_name: data.full_name,
      phone: data.phone,
      role: data.role,
    });
    const { access_token, user: userData } = response.data;

    if (access_token === "VERIFICATION_REQUIRED") {
      return {
        ...userData,
        needsVerification: true,
        email: data.email,
        verificationEmailSent: response.data.verification_email_sent,
        verificationEmailMessage: response.data.verification_email_message,
      };
    }

    await persistLoginState(response.data.user, response.data.csrf_token, setUser, setCsrfToken);
    return response.data.user;
  };

  const verifyEmail = async (email) => {
    const firebaseAuthService = await getFirebaseAuthService();
    const firebaseUser = await firebaseAuthService.reloadCurrentUser();

    if (!firebaseUser || firebaseUser.email?.toLowerCase() !== email.toLowerCase()) {
      throw new Error("Sign in again before completing email verification");
    }

    if (!firebaseUser.emailVerified) {
      throw new Error("Email is not verified yet. Open the verification link from your inbox first.");
    }

    const idToken = await getFirebaseIdToken(firebaseUser, true);
    const response = await exchangeFirebaseSession(idToken);

    await persistLoginState(response.data.user, response.data.csrf_token, setUser, setCsrfToken);
    return response.data.user;
  };

  const resendVerification = async (email) => {
    const response = await axios.post(`${API_URL}/auth/resend-verification`, { email }, {
      withCredentials: true,
    });
    return response.data;
  };

  const forgotPassword = async (email) => {
    const firebaseAuthService = await getFirebaseAuthService();
    await firebaseAuthService.sendPasswordReset(email);
    return true;
  };

  const resetPassword = async () => {
    throw new Error("Use the password reset link from your email to choose a new password.");
  };

  const logout = async () => {
    const authSessionSource = getAuthSessionSource();
    const isNative = window.Capacitor?.isNativePlatform?.() ?? false;
    const storedDeviceToken = isNative ? getStoredDeviceToken() : null;
    const activeCsrfToken = csrfToken;

    // Clear local auth state first so protected routes can react immediately on
    // mobile instead of waiting on backend, Firebase, and SecureStorage cleanup.
    localStorage.removeItem('servicetones_user');
    localStorage.removeItem('servicetones_csrf');
    sessionStorage.removeItem('servicetones_csrf');
    clearAuthSessionSource();
    clearPendingPushNavigation();
    clearStoredDeviceToken();
    setUser(null);
    setCsrfToken(null);
    document.documentElement.setAttribute("data-theme", "customer");

    if (window.location.pathname !== '/auth') {
      window.history.replaceState({}, '', '/auth');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }

    try {
      await axios.post(
        `${API_URL}/auth/logout`,
        storedDeviceToken ? { device_token: storedDeviceToken } : {},
        { 
          withCredentials: true,
          headers: activeCsrfToken ? { 'X-CSRF-Token': activeCsrfToken } : {}
        }
      );
    } catch (error) {
      logger.error("Logout error:", error);
    } finally {
      // Sign out from Firebase client state
      try {
        const firebaseAuthService = await getFirebaseAuthService();
        await firebaseAuthService.signOut();
      } catch (error) {
        logger.error("Firebase sign out error:", error);
      }

      // MOBILE: Clear SecureStorage
      if (isNative) {
        const storage = await getSecureStorage();
        if (storage) {
          await storage.clearAuth();
          logger.info('✅ Auth cleared from SecureStorage on logout');
        }
      }

      if (isNative && authSessionSource === NATIVE_GOOGLE_IOS_SESSION_SOURCE) {
        try {
          const { NativeGoogleSignIn } = await import('@/mobile/plugins/nativeGoogleSignIn');
          await NativeGoogleSignIn.signOut();
        } catch (error) {
          logger.error("Native Google sign out error:", error);
        }
      }
    }
  };

  const refreshUser = async (sessionSourceOverride) => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        withCredentials: true
      });
      const userData = response.data.user ?? response.data;
      const freshCsrf = response.data.csrf_token;
      const sessionSource = typeof sessionSourceOverride === 'undefined'
        ? getAuthSessionSource()
        : sessionSourceOverride;

      if (typeof sessionSourceOverride !== 'undefined') {
        setAuthSessionSource(sessionSource);
      }

      setUser(userData);
      if (freshCsrf) setCsrfToken(freshCsrf);
      localStorage.setItem('servicetones_user', JSON.stringify(sanitizeForStorage(userData)));
      // Persist to native storage in the background so login UI is never
      // blocked by a stalled SecureStorage write on iOS.
      persistNativeAuthState(userData, freshCsrf, sessionSource, 'refreshUser');
      return userData;
    } catch (error) {
      // Don't log expected 401 errors
      if (error.response?.status !== 401) {
        logger.error("Failed to refresh user:", error);
      }
      throw error;
    }
  };

  const applySession = async (sessionPayload, sessionSourceOverride) => {
    const sessionSource = typeof sessionSourceOverride === 'undefined'
      ? getAuthSessionSource()
      : sessionSourceOverride;

    if (typeof sessionSourceOverride !== 'undefined') {
      setAuthSessionSource(sessionSource);
    }

    return applySessionPayload(sessionPayload, setUser, setCsrfToken, sessionSource);
  };

  const getAuthHeader = () => {
    const activeCsrfToken = getActiveCsrfToken();

    return activeCsrfToken ? { 'X-CSRF-Token': activeCsrfToken } : {};
  };

  // Permanently delete the current user's account
  const deleteAccount = async () => {
    await axios.delete(`${API_URL}/auth/account`, { withCredentials: true });
    try {
      const firebaseAuthService = await getFirebaseAuthService();
      await firebaseAuthService.signOut();
    } catch {}
    localStorage.removeItem('servicetones_user');
    localStorage.removeItem('servicetones_csrf');
    sessionStorage.removeItem('servicetones_csrf');
    clearPendingPushNavigation();
    clearStoredDeviceToken();
    clearAuthSessionSource();
    const isNative = window.Capacitor?.isNativePlatform?.() ?? false;
    if (isNative) { const storage = await getSecureStorage(); if (storage) await storage.clearAuth(); }
    setUser(null);
    setCsrfToken(null);
  };

  // Get current theme
  const theme = getThemeFromUser(user);

  return (
    <AuthContext.Provider value={{ 
      user, 
      csrfToken,
      loading, 
      login, 
      register, 
      logout,
      deleteAccount,
      getAuthHeader, 
      theme,
      verifyEmail,
      resendVerification,
      forgotPassword,
      resetPassword,
      refreshUser,
      applySession,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};
