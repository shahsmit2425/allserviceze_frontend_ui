/**
 * Platform Detection Hook
 *
 * Detects if app is running in native mobile context (Capacitor)
 * or web browser. This is SAFE for website - returns isNative: false
 * when Capacitor is not present (normal web usage).
 *
 * Capacitor injects its runtime into window BEFORE the JS bundle runs,
 * so detection is purely synchronous — no useEffect / async re-render needed.
 *
 * Website Impact: ZERO - Capacitor doesn't exist on web
 */

import { useEffect, useState } from 'react';
import logger from '@/utils/logger';

const PHONE_MAX_WIDTH = 767;
const TABLET_MAX_WIDTH = 1199;

const getViewportDimensions = () => {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

const getViewportClass = (width) => {
  if (width <= PHONE_MAX_WIDTH) {
    return 'phone';
  }

  if (width <= TABLET_MAX_WIDTH) {
    return 'tablet';
  }

  return 'desktop';
};

const detectPlatform = () => {
  const { width, height } = getViewportDimensions();
  const viewportClass = getViewportClass(width);
  const orientation = width > height ? 'landscape' : 'portrait';

  if (typeof window !== 'undefined' && window.Capacitor) {
    try {
      const { Capacitor } = window;
      const platformName = Capacitor.getPlatform();
      const isNative = Capacitor.isNativePlatform();
      const deviceClass = isNative ? viewportClass : 'web';

      return {
        isNative,
        isWeb: !isNative,
        isAndroid: platformName === 'android',
        isIOS: platformName === 'ios',
        platform: platformName,
        viewportWidth: width,
        viewportHeight: height,
        orientation,
        viewportClass,
        deviceClass,
        isPhone: viewportClass === 'phone',
        isTablet: viewportClass === 'tablet',
        isDesktop: viewportClass === 'desktop',
        isNativePhone: isNative && viewportClass === 'phone',
        isNativeTablet: isNative && viewportClass === 'tablet',
        prefersBottomTray: isNative && viewportClass === 'phone',
        prefersSplitView: isNative && (viewportClass === 'tablet' || orientation === 'landscape'),
      };
    } catch (error) {
      logger.error('Capacitor detection error:', error);
    }
  }

  return {
    isNative: false,
    isWeb: true,
    isAndroid: false,
    isIOS: false,
    platform: 'web',
    viewportWidth: width,
    viewportHeight: height,
    orientation,
    viewportClass,
    deviceClass: 'web',
    isPhone: viewportClass === 'phone',
    isTablet: viewportClass === 'tablet',
    isDesktop: viewportClass === 'desktop',
    isNativePhone: false,
    isNativeTablet: false,
    prefersBottomTray: false,
    prefersSplitView: viewportClass !== 'phone',
  };
};

export const usePlatform = () => {
  // Lazy initializer: runs synchronously on the very first render.
  // isNative is correct from render #1 — no async flip from false → true.
  const [platform] = useState(detectPlatform);
  const [platformState, setPlatformState] = useState(platform);

  useEffect(() => {
    const handleViewportChange = () => {
      setPlatformState(detectPlatform());
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
    };
  }, []);

  return platformState;
};

/**
 * Usage:
 * 
 * const { isNative, isAndroid, isIOS } = usePlatform();
 * 
 * if (isNative) {
 *   // Use native features
 * } else {
 *   // Use web fallback
 * }
 */
