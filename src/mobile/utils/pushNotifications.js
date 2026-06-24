/**
 * Push Notifications Manager
 * 
 * Handles push notification registration and handling.
 * Website never imports this - ISOLATED.
 */

import logger from '@/utils/logger';
import { getNotificationRoute } from '@/utils/notificationNavigation';

let PushNotifications;
let listenersRegistered = false;
const DEVICE_TOKEN_STORAGE_KEY = 'servicetones_device_token';
const PENDING_PUSH_NAVIGATION_KEY = 'servicetones_pending_push_navigation';
const ANDROID_NOTIFICATION_CHANNEL_ID = 'servicetones_alerts';

export const PUSH_NOTIFICATION_NAVIGATION_EVENT = 'servicetones:push-notification-navigation';

const storeDeviceToken = (token) => {
  if (typeof window === 'undefined' || !token) {
    return;
  }

  localStorage.setItem(DEVICE_TOKEN_STORAGE_KEY, token);
};

export const getStoredDeviceToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem(DEVICE_TOKEN_STORAGE_KEY);
};

export const clearStoredDeviceToken = () => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(DEVICE_TOKEN_STORAGE_KEY);
};

const parseSerializedNotificationValue = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue.startsWith('{') && !trimmedValue.startsWith('[')) {
    return value;
  }

  try {
    return JSON.parse(trimmedValue);
  } catch {
    return value;
  }
};

const normalizePushNotificationPayload = (action) => {
  const rawData = action?.notification?.data || {};
  const parsedData = Object.fromEntries(
    Object.entries(rawData).map(([key, value]) => [key, parseSerializedNotificationValue(value)])
  );
  const data = parsedData.data && typeof parsedData.data === 'object'
    ? parsedData.data
    : {};

  return {
    notificationId: parsedData.notification_id || action?.notification?.id || null,
    type: parsedData.type || null,
    data,
  };
};

const storePendingPushNavigation = (payload) => {
  if (typeof window === 'undefined' || !payload?.route) {
    return;
  }

  localStorage.setItem(PENDING_PUSH_NAVIGATION_KEY, JSON.stringify(payload));
};

export const consumePendingPushNavigation = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawPayload = localStorage.getItem(PENDING_PUSH_NAVIGATION_KEY);
  if (!rawPayload) {
    return null;
  }

  localStorage.removeItem(PENDING_PUSH_NAVIGATION_KEY);

  try {
    return JSON.parse(rawPayload);
  } catch {
    return null;
  }
};

export const clearPendingPushNavigation = () => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(PENDING_PUSH_NAVIGATION_KEY);
};

const queuePushNavigation = (action) => {
  const notification = normalizePushNotificationPayload(action);
  const route = getNotificationRoute(notification);

  if (!route) {
    return;
  }

  const navigationPayload = {
    route,
    notificationId: notification.notificationId,
    type: notification.type,
  };

  storePendingPushNavigation(navigationPayload);
  window.dispatchEvent(
    new CustomEvent(PUSH_NOTIFICATION_NAVIGATION_EVENT, {
      detail: navigationPayload,
    })
  );
};

const initPush = async () => {
  if (!PushNotifications && window.Capacitor?.isNativePlatform?.()) {
    const module = await import('@capacitor/push-notifications');
    PushNotifications = module.PushNotifications;
  }
};

const ensureAndroidNotificationChannel = async () => {
  if (window.Capacitor?.getPlatform?.() !== 'android' || !PushNotifications?.createChannel) {
    return;
  }

  await PushNotifications.createChannel({
    id: ANDROID_NOTIFICATION_CHANNEL_ID,
    name: 'ServiceTones Alerts',
    description: 'Project updates, messages, and account alerts',
    importance: 5,
    visibility: 1,
    vibration: true,
    lights: true,
  });
};

export const pushNotificationManager = {
  /**
   * Initialize push notifications
   * Call this once on app startup
   */
  async initialize() {
    if (!window.Capacitor?.isNativePlatform?.()) {
      logger.log('Push notifications only available in native mobile app');
      return false;
    }

    try {
      await initPush();

      if (!PushNotifications) {
        logger.warn('Push notifications plugin is unavailable');
        return false;
      }

      await ensureAndroidNotificationChannel();

      if (!listenersRegistered) {
        // Listen for registration success
        await PushNotifications.addListener('registration', (token) => {
          logger.log('Push registration success');
          storeDeviceToken(token.value);
          pushNotificationManager.sendTokenToBackend(token.value);
        });

        // Listen for registration errors
        await PushNotifications.addListener('registrationError', (error) => {
          logger.error('Push registration error:', error);
        });

        // Listen for notifications received while app in foreground
        await PushNotifications.addListener(
          'pushNotificationReceived',
          (notification) => {
            logger.log('Push notification received', {
              notificationId: notification.id,
              title: notification.title,
            });
            // Show in-app notification UI
            // You can integrate with your toast/notification system here
          }
        );

        // Listen for notification taps
        await PushNotifications.addListener(
          'pushNotificationActionPerformed',
          (notification) => {
            const normalizedNotification = normalizePushNotificationPayload(notification);
            logger.log('Push notification action performed', {
              actionId: notification.actionId,
              notificationId: normalizedNotification.notificationId,
              notificationType: normalizedNotification.type,
            });
            queuePushNavigation(notification);
          }
        );

        listenersRegistered = true;
      }

      // Request permission
      const permStatus = await PushNotifications.requestPermissions();
      
      if (permStatus.receive === 'granted') {
        // Register for push
        await PushNotifications.register();
        logger.log('Push notifications registration requested');

        // If a token was already captured on an earlier app session, retry the
        // backend sync now that auth state may be available.
        const storedToken = getStoredDeviceToken();
        if (storedToken) {
          await pushNotificationManager.sendTokenToBackend(storedToken);
        }
      } else {
        logger.warn('Push notification permission denied');
        return false;
      }
      return true;

    } catch (error) {
      logger.error('Push notification setup error:', error);
      return false;
    }
  },

  /**
   * Send device token to backend for storage
   */
  async sendTokenToBackend(token) {
    try {
      const backendBaseUrl = (import.meta.env.VITE_BACKEND_URL || 'https://dev-api.servicetones.com')
        .replace(/\/+$/, '');
      const csrfToken = localStorage.getItem('servicetones_csrf') || sessionStorage.getItem('servicetones_csrf');

      if (!csrfToken) {
        logger.warn('Skipping device token registration because CSRF token is missing');
        return false;
      }
      
      const payload = JSON.stringify({
        device_token: token,
        platform: window.Capacitor.getPlatform()
      });
      const candidateUrls = Array.from(new Set([
        `${backendBaseUrl}/api/users/device-token`,
        `${backendBaseUrl}/api/v1/users/device-token`,
        `${backendBaseUrl}/users/device-token`,
        `${backendBaseUrl}/v1/users/device-token`,
      ]));

      let response = null;
      let lastErrorDetail = '';
      for (const url of candidateUrls) {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          credentials: 'include',
          body: payload
        });

        if (response.ok) {
          break;
        }

        lastErrorDetail = await response.text();
        if (response.status !== 404) {
          break;
        }
      }

      if (!response?.ok) {
        throw new Error(`Device token registration failed (${response?.status ?? 'unknown'}): ${lastErrorDetail}`);
      }
      
      logger.log('Device token sent to backend', { url: response.url });
      return true;
    } catch (error) {
      logger.error('Failed to send device token to backend:', error);
      return false;
    }
  },

  async syncStoredTokenToBackend() {
    const storedToken = getStoredDeviceToken();
    if (!storedToken) {
      return false;
    }

    return pushNotificationManager.sendTokenToBackend(storedToken);
  },

  /**
   * Get delivered notifications
   */
  async getDeliveredNotifications() {
    if (!window.Capacitor?.isNativePlatform?.()) return [];
    
    try {
      await initPush();
      const result = await PushNotifications.getDeliveredNotifications();
      return result.notifications || [];
    } catch (error) {
      logger.error('Failed to get delivered notifications:', error);
      return [];
    }
  },

  /**
   * Remove all delivered notifications
   */
  async removeAllDeliveredNotifications() {
    if (!window.Capacitor?.isNativePlatform?.()) return;
    
    try {
      await initPush();
      await PushNotifications.removeAllDeliveredNotifications();
      logger.log('All notifications cleared');
    } catch (error) {
      logger.error('Failed to clear notifications:', error);
    }
  }
};
