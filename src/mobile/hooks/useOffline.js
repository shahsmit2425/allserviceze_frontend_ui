/**
 * Offline Detection Hook
 * 
 * Detects when app is offline (no network connection).
 * Works on both web and mobile.
 */

import { useState, useEffect } from 'react';
import { usePlatform } from './usePlatform';

let Network;

const initNetwork = async () => {
  if (!Network && window.Capacitor) {
    const module = await import('@capacitor/network');
    Network = module.Network;
  }
};

export const useOffline = () => {
  const { isNative } = usePlatform();
  const [isOffline, setIsOffline] = useState(false);
  const [connectionType, setConnectionType] = useState('unknown');

  useEffect(() => {
    if (isNative) {
      // Mobile: Use Capacitor Network API
      const setupNetworkListener = async () => {
        await initNetwork();

        // Get initial status
        const status = await Network.getStatus();
        setIsOffline(!status.connected);
        setConnectionType(status.connectionType);

        // Listen for changes
        Network.addListener('networkStatusChange', (status) => {
          setIsOffline(!status.connected);
          setConnectionType(status.connectionType);
        });
      };

      setupNetworkListener();

      return () => {
        if (Network) {
          Network.removeAllListeners();
        }
      };
    } else {
      // Web: Use navigator.onLine
      const updateOnlineStatus = () => {
        setIsOffline(!navigator.onLine);
        setConnectionType(navigator.onLine ? 'wifi' : 'none');
      };

      // Set initial status
      updateOnlineStatus();

      // Listen for changes
      window.addEventListener('online', updateOnlineStatus);
      window.addEventListener('offline', updateOnlineStatus);

      return () => {
        window.removeEventListener('online', updateOnlineStatus);
        window.removeEventListener('offline', updateOnlineStatus);
      };
    }
  }, [isNative]);

  return {
    isOffline,
    isOnline: !isOffline,
    connectionType
  };
};

export default useOffline;
