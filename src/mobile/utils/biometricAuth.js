/**
 * Biometric Authentication Utilities
 * 
 * Provides fingerprint/face recognition for mobile apps.
 * Website never imports this - ISOLATED.
 */

import logger from '@/utils/logger';

let BiometricAuth;

const initBiometric = async () => {
  if (!BiometricAuth && window.Capacitor) {
    const module = await import('@aparajita/capacitor-biometric-auth');
    BiometricAuth = module.BiometricAuth;
  }
};

export const biometricAuth = {
  /**
   * Check if biometric authentication is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    if (!window.Capacitor) return false;
    
    try {
      await initBiometric();
      const result = await BiometricAuth.checkBiometry();
      return result.isAvailable;
    } catch (error) {
      logger.error('Biometric availability check error:', error);
      return false;
    }
  },

  /**
   * Get available biometry type
   * @returns {Promise<string|null>} 'fingerprint', 'face', 'iris', etc.
   */
  async getBiometryType() {
    if (!window.Capacitor) return null;
    
    try {
      await initBiometric();
      const result = await BiometricAuth.checkBiometry();
      return result.biometryType || null;
    } catch (error) {
      logger.error('Biometric type check error:', error);
      return null;
    }
  },

  /**
   * Authenticate user with biometrics
   * @param {string} reason - Message to show user
   * @returns {Promise<boolean>} true if authenticated successfully
   */
  async authenticate(reason = 'Login to ServiceTones') {
    if (!window.Capacitor) {
      logger.warn('Biometric auth only available in mobile app');
      return false;
    }

    try {
      await initBiometric();
      
      const result = await BiometricAuth.authenticate({
        reason,
        cancelTitle: 'Cancel',
        allowDeviceCredential: true,
        iosFallbackTitle: 'Use Passcode',
        androidTitle: 'Biometric Login',
        androidSubtitle: 'Log in using your biometric credential',
        androidConfirmationRequired: false
      });

      return result.verified === true;
    } catch (error) {
      if (error.code === 'userCancel') {
        logger.log('User cancelled biometric authentication');
      } else {
        logger.error('Biometric authentication error:', error);
      }
      return false;
    }
  }
};
