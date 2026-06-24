export const AUTH_SESSION_SOURCE_KEY = 'servicetones_auth_session_source';
export const NATIVE_GOOGLE_IOS_SESSION_SOURCE = 'native_google_ios';

export const getAuthSessionSource = () => localStorage.getItem(AUTH_SESSION_SOURCE_KEY);

export const setAuthSessionSource = (source) => {
  if (source) {
    localStorage.setItem(AUTH_SESSION_SOURCE_KEY, source);
    return;
  }
  localStorage.removeItem(AUTH_SESSION_SOURCE_KEY);
};

export const clearAuthSessionSource = () => {
  localStorage.removeItem(AUTH_SESSION_SOURCE_KEY);
};