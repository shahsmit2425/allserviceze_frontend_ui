/**
 * Pull-to-Refresh Hook
 * 
 * Enables pull-to-refresh gesture on mobile app.
 * Works with any scrollable component.
 */

import { useEffect, useCallback, useRef } from 'react';
import { usePlatform } from './usePlatform';

let App;

const initApp = async () => {
  if (!App && window.Capacitor) {
    const module = await import('@capacitor/app');
    App = module.App;
  }
};

export const usePullToRefresh = (onRefresh, options = {}) => {
  const { isNative } = usePlatform();
  const containerRef = useRef(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const pulling = useRef(false);
  const {
    threshold = 80,
    resistance = 2.5,
    enabled = true
  } = options;

  const handleTouchStart = useCallback((e) => {
    if (!enabled) return;
    const touch = e.touches[0];
    startY.current = touch.clientY;
    
    // Only enable pull if scrolled to top
    const container = containerRef.current;
    if (container && container.scrollTop === 0) {
      pulling.current = true;
    }
  }, [enabled]);

  const handleTouchMove = useCallback((e) => {
    if (!enabled || !pulling.current) return;
    
    const touch = e.touches[0];
    currentY.current = touch.clientY;
    const diff = currentY.current - startY.current;
    
    if (diff > 0) {
      // Apply resistance to pull
      const pullDistance = diff / resistance;
      
      // Show visual feedback (you can enhance this)
      const container = containerRef.current;
      if (container && pullDistance > 0) {
        container.style.transform = `translateY(${Math.min(pullDistance, threshold)}px)`;
        container.style.transition = 'none';
      }
    }
  }, [enabled, threshold, resistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || !pulling.current) return;
    
    const container = containerRef.current;
    const diff = currentY.current - startY.current;
    const pullDistance = diff / resistance;
    
    // Reset transform
    if (container) {
      container.style.transform = '';
      container.style.transition = 'transform 0.3s ease';
    }
    
    // Trigger refresh if pulled enough
    if (pullDistance >= threshold) {
      if (onRefresh) {
        await onRefresh();
      }
    }
    
    pulling.current = false;
  }, [enabled, onRefresh, threshold, resistance]);

  useEffect(() => {
    if (!isNative || !enabled) return;

    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isNative, enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return containerRef;
};

export default usePullToRefresh;
