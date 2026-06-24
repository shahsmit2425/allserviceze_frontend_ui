/**
 * Push Notifications Initialization Component
 * 
 * Automatically initializes push notifications for logged-in users
 * when running in the mobile app. Website stays unaffected.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePlatform } from '@/mobile/hooks/usePlatform';
import { pushNotificationManager } from '@/mobile/utils/pushNotifications';
import { isTruthyEnvFlag } from '@/utils/envFlags';
import logger from '@/utils/logger';

export const PushNotificationsInit = () => {
  const { user, csrfToken } = useAuth();
  const { isNative } = usePlatform();
  const [initialized, setInitialized] = useState(false);
  const pushNotificationsEnabled = isTruthyEnvFlag(import.meta.env.VITE_PUSH_NOTIFICATIONS_ENABLED);

  useEffect(() => {
    // Only initialize on mobile app with logged-in user
    if (!pushNotificationsEnabled || !isNative || !user || initialized) {
      return;
    }

    const initPushNotifications = async () => {
      try {
        logger.info('Initializing push notifications', {
          userId: user.id,
          platform: 'native',
        });
        
        await pushNotificationManager.initialize();
        
        setInitialized(true);
        logger.info('Push notifications initialized successfully');
        
        // Optional: Show success message (can be removed for production)
        // toast.success('Push notifications enabled');
      } catch (error) {
        logger.error('Failed to initialize push notifications:', error);
        
        // Don't crash the app - just log the error
        // Only show error if it's not a permission denial
        if (error.message && !error.message.includes('permission')) {
          logger.warn('Non-permission push notification initialization error');
        }
        
        // Mark as initialized anyway to prevent retries
        setInitialized(true);
      }
    };

    initPushNotifications();
  }, [user, isNative, initialized, pushNotificationsEnabled]);

  useEffect(() => {
    if (!pushNotificationsEnabled || !isNative || !user || !initialized || !csrfToken) {
      return;
    }

    pushNotificationManager.syncStoredTokenToBackend().catch((error) => {
      logger.error('Failed to resync stored push token:', error);
    });
  }, [user, csrfToken, isNative, initialized, pushNotificationsEnabled]);

  // This component doesn't render anything
  return null;
};

export default PushNotificationsInit;
