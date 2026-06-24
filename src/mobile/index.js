/**
 * Mobile Utilities Index
 * 
 * Central export for all mobile utilities.
 * Website can safely import these - they all check for Capacitor existence.
 */

export { usePlatform } from './hooks/usePlatform';
export { useHaptic } from './hooks/useHaptic';
export { useOffline } from './hooks/useOffline';
export { usePullToRefresh } from './hooks/usePullToRefresh';
export { nativeCamera } from './utils/nativeCamera';
export { haptics } from './utils/haptics';
export { pushNotifications } from './utils/pushNotifications';
export { biometricAuth } from './utils/biometricAuth';
export { secureStorage } from './utils/secureStorage';
export { apiCache, cachedFetch } from './utils/apiCache';
export { shareUtils } from './utils/shareUtils';
