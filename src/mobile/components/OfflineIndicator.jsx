/**
 * Offline Indicator Component
 * 
 * Shows a banner when app is offline.
 * Works on both web and mobile.
 */

import { useOffline } from '@/mobile/hooks/useOffline';
import { WifiOff, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';

export const OfflineIndicator = () => {
  const { isOffline } = useOffline();
  const [show, setShow] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (isOffline) {
      setShow(true);
      setWasOffline(true);
    } else if (wasOffline) {
      // Show "Back online" briefly then hide
      setTimeout(() => {
        setShow(false);
      }, 3000);
    }
  }, [isOffline, wasOffline]);

  if (!show) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 text-center text-sm font-medium transition-all ${
        isOffline
          ? 'bg-red-500 text-white'
          : 'bg-green-500 text-white'
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        {isOffline ? (
          <>
            <WifiOff className="w-4 h-4" />
            <span>You're offline. Some features may be limited.</span>
          </>
        ) : (
          <>
            <Wifi className="w-4 h-4" />
            <span>Back online!</span>
          </>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator;
