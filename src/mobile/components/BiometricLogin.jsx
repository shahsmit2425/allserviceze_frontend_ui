/**
 * Biometric Login Component
 * 
 * Shows biometric authentication option on login page (mobile only).
 * When clicked, authenticates with fingerprint/face and auto-logs in.
 */

import { useState, useEffect } from 'react';
import { usePlatform } from '@/mobile/hooks/usePlatform';
import { biometricAuth } from '@/mobile/utils/biometricAuth';
import { secureStorage } from '@/mobile/utils/secureStorage';
import { haptic } from '@/mobile/utils/haptics';
import { Button } from '@/components/ui/button';
import { Fingerprint } from 'lucide-react';
import logger from '@/utils/logger';

export const BiometricLogin = ({ onLogin, className = "" }) => {
  const { isNative } = usePlatform();
  const [available, setAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isNative) return;

    const checkBiometric = async () => {
      try {
        // Check if biometric is enabled and available
        const [isEnabled, isAvail, bioType] = await Promise.all([
          secureStorage.isBiometricEnabled(),
          biometricAuth.isAvailable(),
          biometricAuth.getBiometryType()
        ]);

        if (isEnabled && isAvail) {
          setAvailable(true);
          setBiometryType(bioType);
          
          // Get stored email for display
          const email = await secureStorage.getStoredEmail();
          setUserEmail(email || '');
        }
      } catch (error) {
        logger.error('Biometric check failed:', error);
      }
    };

    checkBiometric();
  }, [isNative]);

  const handleBiometricLogin = async () => {
    try {
      setLoading(true);
      await haptic.light();

      // Prompt for biometric authentication
      const authenticated = await biometricAuth.authenticate(
        'Login to ServiceTones'
      );

      if (!authenticated) {
        logger.info('Biometric authentication cancelled or failed');
        setLoading(false);
        return;
      }

      // Get stored credentials
      const credentials = await secureStorage.getStoredCredentials();
      
      if (!credentials) {
        logger.error('No stored credentials found');
        await secureStorage.disableBiometric();
        setAvailable(false);
        await haptic.error();
        setLoading(false);
        return;
      }

      // Auto-login with stored credentials
      await onLogin(credentials.email, credentials.password);
      await haptic.success();
    } catch (error) {
      logger.error('Biometric login error:', error);
      await haptic.error();
    } finally {
      setLoading(false);
    }
  };

  // Don't render on web or if biometric not available
  if (!isNative || !available) {
    return null;
  }

  const getBiometricIcon = () => {
    if (biometryType === 'face') return '👤';
    if (biometryType === 'iris') return '👁️';
    return '👆';
  };

  const getBiometricLabel = () => {
    if (biometryType === 'face') return 'Face ID';
    if (biometryType === 'iris') return 'Iris';
    return 'Fingerprint';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {userEmail && (
        <p className="text-sm text-center text-muted-foreground">
          Continue as <span className="font-medium">{userEmail}</span>
        </p>
      )}
      
      <Button
        type="button"
        variant="outline"
        className="w-full h-12 text-base border-primary hover:bg-primary/5"
        onClick={handleBiometricLogin}
        disabled={loading}
      >
        <span className="text-2xl mr-2">{getBiometricIcon()}</span>
        {loading ? 'Authenticating...' : `Login with ${getBiometricLabel()}`}
      </Button>
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with email
          </span>
        </div>
      </div>
    </div>
  );
};

export default BiometricLogin;
