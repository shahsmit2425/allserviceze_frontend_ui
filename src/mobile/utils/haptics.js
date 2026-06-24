/**
 * Haptic Feedback Utilities
 * 
 * Provides vibration/haptic feedback for mobile apps.
 * Website never imports this - ISOLATED.
 */

import logger from '@/utils/logger';

let Haptics, ImpactStyle, NotificationType;

const initHaptics = async () => {
  if (!Haptics && window.Capacitor) {
    const module = await import('@capacitor/haptics');
    Haptics = module.Haptics;
    ImpactStyle = module.ImpactStyle;
    NotificationType = module.NotificationType;
  }
};

export const haptic = {
  /**
   * Light impact (button tap)
   */
  async light() {
    if (!window.Capacitor) return;
    try {
      await initHaptics();
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      logger.warn('Haptic feedback error:', e);
    }
  },

  /**
   * Medium impact
   */
  async medium() {
    if (!window.Capacitor) return;
    try {
      await initHaptics();
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {
      logger.warn('Haptic feedback error:', e);
    }
  },

  /**
   * Heavy impact (important action)
   */
  async heavy() {
    if (!window.Capacitor) return;
    try {
      await initHaptics();
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (e) {
      logger.warn('Haptic feedback error:', e);
    }
  },

  /**
   * Success notification
   */
  async success() {
    if (!window.Capacitor) return;
    try {
      await initHaptics();
      await Haptics.notification({ type: NotificationType.Success });
    } catch (e) {
      logger.warn('Haptic feedback error:', e);
    }
  },

  /**
   * Error notification
   */
  async error() {
    if (!window.Capacitor) return;
    try {
      await initHaptics();
      await Haptics.notification({ type: NotificationType.Error });
    } catch (e) {
      logger.warn('Haptic feedback error:', e);
    }
  },

  /**
   * Warning notification
   */
  async warning() {
    if (!window.Capacitor) return;
    try {
      await initHaptics();
      await Haptics.notification({ type: NotificationType.Warning });
    } catch (e) {
      logger.warn('Haptic feedback error:', e);
    }
  }
};
