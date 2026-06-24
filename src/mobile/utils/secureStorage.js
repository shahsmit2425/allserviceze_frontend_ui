/**
 * Secure Storage Utilities
 *
 * Uses SecureStorage for sensitive biometric credentials and Preferences only
 * for non-sensitive flags/display data. Website-safe - does nothing when not
 * on mobile.
 */

import logger from '@/utils/logger';

let Preferences;
let SecureStoragePlugin;

const initPreferences = async () => {
  if (!Preferences && window.Capacitor) {
    const module = await import('@capacitor/preferences');
    Preferences = module.Preferences;
  }
};

const initSecureStorage = async () => {
  if (!SecureStoragePlugin && window.Capacitor?.isNativePlatform?.()) {
    const module = await import('@aparajita/capacitor-secure-storage');
    SecureStoragePlugin = module.SecureStoragePlugin;
  }
};

const KEYS = {
  BIOMETRIC_ENABLED: 'biometric_enabled',
  USER_EMAIL: 'biometric_user_email',
  USER_CREDENTIALS: 'biometric_user_credentials'
};

export const secureStorage = {
  /**
   * Check if secure storage is available
   */
  async isAvailable() {
    if (!window.Capacitor?.isNativePlatform?.()) return false;
    try {
      await initSecureStorage();
      return !!SecureStoragePlugin;
    } catch {
      return false;
    }
  },

  /**
   * Enable biometric authentication for user
   * @param {string} email - User email
   * @param {string} password - User password (will be stored securely)
   */
  async enableBiometric(email, password) {
    if (!window.Capacitor?.isNativePlatform?.()) return false;
    
    try {
      await initPreferences();
      await initSecureStorage();

      if (!SecureStoragePlugin) {
        logger.warn('Secure storage unavailable, biometric login not enabled');
        return false;
      }
      
      // Store email/flag in Preferences (non-sensitive)
      await Preferences.set({
        key: KEYS.USER_EMAIL,
        value: email
      });
      
      // Store credentials only in secure storage.
      await SecureStoragePlugin.set({
        key: KEYS.USER_CREDENTIALS,
        value: JSON.stringify({ email, password })
      });
      
      // Mark biometric as enabled
      await Preferences.set({
        key: KEYS.BIOMETRIC_ENABLED,
        value: 'true'
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to enable biometric auth:', error);
      await this.disableBiometric();
      return false;
    }
  },

  /**
   * Check if biometric login is enabled
   */
  async isBiometricEnabled() {
    if (!window.Capacitor) return false;
    
    try {
      await initPreferences();
      const result = await Preferences.get({ key: KEYS.BIOMETRIC_ENABLED });
      return result.value === 'true';
    } catch (error) {
      return false;
    }
  },

  /**
   * Get stored credentials for biometric login
   * @returns {Promise<{email: string, password: string}|null>}
   */
  async getStoredCredentials() {
    if (!window.Capacitor?.isNativePlatform?.()) return null;
    
    try {
      await initSecureStorage();
      if (!SecureStoragePlugin) return null;
      const result = await SecureStoragePlugin.get({ key: KEYS.USER_CREDENTIALS });
      
      if (result.value) {
        return JSON.parse(result.value);
      }
      return null;
    } catch (error) {
      logger.error('Failed to get stored credentials:', error);
      return null;
    }
  },

  /**
   * Get stored user email
   */
  async getStoredEmail() {
    if (!window.Capacitor?.isNativePlatform?.()) return null;
    
    try {
      await initPreferences();
      const result = await Preferences.get({ key: KEYS.USER_EMAIL });
      return result.value || null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Disable biometric authentication and clear stored credentials
   */
  async disableBiometric() {
    if (!window.Capacitor?.isNativePlatform?.()) return;
    
    try {
      await initPreferences();
      await initSecureStorage();
      await Preferences.remove({ key: KEYS.BIOMETRIC_ENABLED });
      await Preferences.remove({ key: KEYS.USER_CREDENTIALS });
      await Preferences.remove({ key: KEYS.USER_EMAIL });
      if (SecureStoragePlugin) {
        await SecureStoragePlugin.remove({ key: KEYS.USER_CREDENTIALS });
      }
    } catch (error) {
      logger.error('Failed to disable biometric auth:', error);
    }
  },

  /**
   * Clear all stored data
   */
  async clearAll() {
    await this.disableBiometric();
  }
};
