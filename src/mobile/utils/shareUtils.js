/**
 * Share Utilities
 * 
 * Provides native share functionality for mobile apps.
 * Fallbacks to Web Share API on browsers.
 */

import logger from '@/utils/logger';

let Share;

const initShare = async () => {
  if (!Share && window.Capacitor) {
    const module = await import('@capacitor/share');
    Share = module.Share;
  }
};

export const shareUtils = {
  /**
   * Check if share is available
   */
  async isAvailable() {
    if (window.Capacitor) {
      await initShare();
      return true;
    }
    // Check Web Share API
    return navigator?.share !== undefined;
  },

  /**
   * Share text/link
   * @param {Object} options - Share options
   * @param {string} options.title - Title of shared content
   * @param {string} options.text - Text to share
   * @param {string} options.url - URL to share
   * @param {string} options.dialogTitle - Android dialog title
   */
  async shareText({ title, text, url, dialogTitle = 'Share via' }) {
    try {
      if (window.Capacitor) {
        await initShare();
        await Share.share({
          title,
          text,
          url,
          dialogTitle
        });
        return { success: true };
      } else if (navigator?.share) {
        // Web Share API
        await navigator.share({ title, text, url });
        return { success: true };
      } else {
        // Fallback: copy to clipboard
        if (url || text) {
          await navigator.clipboard.writeText(url || text);
          return { success: true, method: 'clipboard' };
        }
        throw new Error('Share not supported');
      }
    } catch (error) {
      if (error.message === 'Share canceled') {
        return { success: false, cancelled: true };
      }
      logger.error('Share error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Share provider profile
   * @param {Object} provider - Provider data
   */
  async shareProvider(provider) {
    const url = `${window.location.origin}/providers/${provider.id}`;
    return this.shareText({
      title: provider.business_name || provider.full_name,
      text: `Check out ${provider.business_name || provider.full_name} on ServiceTones!`,
      url,
      dialogTitle: 'Share Provider'
    });
  },

  /**
   * Share project
   * @param {Object} project - Project data
   */
  async shareProject(project) {
    const url = `${window.location.origin}/projects/${project.id}`;
    return this.shareText({
      title: project.title,
      text: `${project.title} - ${project.description?.substring(0, 100)}...`,
      url,
      dialogTitle: 'Share Project'
    });
  },

  /**
   * Share app (invite friends)
   */
  async shareApp() {
    return this.shareText({
      title: 'ServiceTones - Home Services Marketplace',
      text: 'Find trusted home service providers on ServiceTones!',
      url: window.location.origin,
      dialogTitle: 'Share ServiceTones'
    });
  },

  /**
   * Check if sharing can be done
   */
  async canShare(data) {
    if (window.Capacitor) {
      return true;
    }
    if (navigator?.canShare) {
      return navigator.canShare(data);
    }
    return navigator?.share !== undefined;
  }
};

export default shareUtils;
