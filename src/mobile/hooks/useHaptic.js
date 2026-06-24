/**
 * Haptic Feedback Hook
 * 
 * Provides haptic feedback utilities for mobile app.
 * Safe for website - does nothing when not on mobile.
 * 
 * Usage:
 * const { hapticClick, hapticSuccess, hapticError } = useHaptic();
 * <button onClick={hapticClick(myFunction)}>Click me</button>
 */

import { useCallback } from 'react';
import { usePlatform } from './usePlatform';
import { haptic } from '@/mobile/utils/haptics';

export const useHaptic = () => {
  const { isNative } = usePlatform();

  /**
   * Wrap a function with light haptic feedback
   * Perfect for: button clicks, taps, selections
   */
  const hapticClick = useCallback((fn) => {
    return async (...args) => {
      if (isNative) {
        await haptic.light();
      }
      if (fn) {
        return fn(...args);
      }
    };
  }, [isNative]);

  /**
   * Wrap a function with medium haptic feedback  
   * Perfect for: form field changes, toggles, swipes
   */
  const hapticMedium = useCallback((fn) => {
    return async (...args) => {
      if (isNative) {
        await haptic.medium();
      }
      if (fn) {
        return fn(...args);
      }
    };
  }, [isNative]);

  /**
   * Wrap a function with heavy haptic feedback
   * Perfect for: destructive actions, important confirmations
   */
  const hapticHeavy = useCallback((fn) => {
    return async (...args) => {
      if (isNative) {
        await haptic.heavy();
      }
      if (fn) {
        return fn(...args);
      }
    };
  }, [isNative]);

  /**
   * Trigger success haptic feedback
   * Perfect for: successful form submissions, confirmations
   */
  const hapticSuccess = useCallback(async () => {
    if (isNative) {
      await haptic.success();
    }
  }, [isNative]);

  /**
   * Trigger error haptic feedback
   * Perfect for: form errors, failed actions
   */
  const hapticError = useCallback(async () => {
    if (isNative) {
      await haptic.error();
    }
  }, [isNative]);

  /**
   * Direct access to all haptic types
   */
  const light = useCallback(async () => {
    if (isNative) await haptic.light();
  }, [isNative]);

  const medium = useCallback(async () => {
    if (isNative) await haptic.medium();
  }, [isNative]);

  const heavy = useCallback(async () => {
    if (isNative) await haptic.heavy();
  }, [isNative]);

  return {
    // Function wrappers
    hapticClick,
    hapticMedium,
    hapticHeavy,
    
    // Direct triggers
    hapticSuccess,
    hapticError,
    light,
    medium,
    heavy,
    
    // Context
    isNative
  };
};

export default useHaptic;
