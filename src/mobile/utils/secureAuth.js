/**
 * Secure Authentication Storage for Mobile Apps
 * 
 * Uses Capacitor SecureStorage to persist tokens across app restarts.
 * Website never imports this - MOBILE ONLY.
 */

import logger from '@/utils/logger';

let SecureStoragePlugin;

const initSecureStorage = async () => {
  if (!SecureStoragePlugin && window.Capacitor?.isNativePlatform?.()) {
    const module = await import('@aparajita/capacitor-secure-storage');
    SecureStoragePlugin = module.SecureStoragePlugin;
  }
};

export const secureAuthStorage = {
  /**
   * Save authentication state to secure storage
   * Also uses Capacitor Preferences as backup fallback
   */
  async saveAuth(user, csrfToken, accessToken = null, refreshToken = null, sessionSource = null) {
    if (!window.Capacitor?.isNativePlatform?.()) {
      return; // Only for mobile
    }

    try {
      await initSecureStorage();
      
      const authData = {
        user,
        csrfToken,
        accessToken: accessToken || null,
        refreshToken: refreshToken || null,
        sessionSource: sessionSource || null,
        savedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString()
      };

      await SecureStoragePlugin.set({
        key: 'servicetones_auth',
        value: JSON.stringify(authData)
      });

      // Also save to Preferences as backup
      try {
        const { Preferences } = await import('@capacitor/preferences');
        await Preferences.set({
          key: 'servicetones_auth_backup',
          value: JSON.stringify(authData)
        });
      } catch (prefError) {
        logger.warn('Preferences backup save failed:', prefError);
      }

      logger.log('Auth saved to SecureStorage + Preferences backup');
    } catch (error) {
      logger.error('Failed to save auth to SecureStorage:', error);
      
      // Try Preferences as final fallback
      try {
        const { Preferences } = await import('@capacitor/preferences');
        const authData = {
          user,
          csrfToken,
          sessionSource: sessionSource || null,
          savedAt: new Date().toISOString()
        };
        await Preferences.set({
          key: 'servicetones_auth_backup',
          value: JSON.stringify(authData)
        });
        logger.warn('Saved to Preferences fallback only');
      } catch (prefError) {
        logger.error('All storage methods failed:', prefError);
      }
    }
  },

  /**
   * Load authentication state from secure storage
   * Tries SecureStorage first, then Preferences backup
   */
  async loadAuth() {
    if (!window.Capacitor?.isNativePlatform?.()) {
      return null; // Only for mobile
    }

    // Try SecureStorage first
    try {
      await initSecureStorage();
      
      const result = await SecureStoragePlugin.get({ key: 'servicetones_auth' });
      
      if (result?.value) {
        const authData = JSON.parse(result.value);
        
        // Check if auth is not too old (max 30 days)
        const savedAt = new Date(authData.savedAt);
        const now = new Date();
        const daysDiff = (now - savedAt) / (1000 * 60 * 60 * 24);
        
        if (daysDiff > 30) {
          logger.warn('Stored auth expired (>30 days), clearing');
          await this.clearAuth();
          return null;
        }
        
        logger.log('Auth loaded from SecureStorage');
        return authData;
      }
    } catch (error) {
      logger.warn('SecureStorage read failed, trying Preferences backup:', error);
    }
    
    // Try Preferences backup
    try {
      const { Preferences } = await import('@capacitor/preferences');
      const { value } = await Preferences.get({ key: 'servicetones_auth_backup' });
      
      if (value) {
        const authData = JSON.parse(value);
        
        // Check expiry
        const savedAt = new Date(authData.savedAt);
        const now = new Date();
        const daysDiff = (now - savedAt) / (1000 * 60 * 60 * 24);
        
        if (daysDiff > 30) {
          logger.warn('Backup auth expired, clearing');
          await Preferences.remove({ key: 'servicetones_auth_backup' });
          return null;
        }
        
        logger.log('Auth loaded from Preferences backup');
        return authData;
      }
    } catch (prefError) {
      logger.warn('Preferences backup read failed:', prefError);
    }
    
    logger.log('No stored auth found anywhere');
    return null;
  },

  /**
   * Clear authentication state from secure storage
   */
  async clearAuth() {
    if (!window.Capacitor?.isNativePlatform?.()) {
      return; // Only for mobile
    }

    try {
      await initSecureStorage();
      await SecureStoragePlugin.remove({ key: 'servicetones_auth' });
      logger.log('Auth cleared from SecureStorage');
    } catch (error) {
      logger.warn('Failed to clear SecureStorage:', error);
    }
    
    // Also clear Preferences backup
    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.remove({ key: 'servicetones_auth_backup' });
      logger.log('Auth cleared from Preferences backup');
    } catch (prefError) {
      logger.warn('Failed to clear Preferences backup:', prefError);
    }
  },

  /**
   * Check if we're running on mobile
   */
  isMobile() {
    return window.Capacitor?.isNativePlatform?.() ?? false;
  }
};
