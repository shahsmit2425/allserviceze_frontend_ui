/**
 * Enhanced Loading Component
 * 
 * Better loading states with smooth animations.
 * Works on both web and mobile.
 */

import { Loader2 } from 'lucide-react';
import { usePlatform } from '@/mobile/hooks/usePlatform';

export const LoadingSpinner = ({ 
  size = 'md', 
  text = '', 
  fullScreen = false,
  className = '' 
}) => {
  const { isNative } = usePlatform();

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const spinner = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <Loader2 
        className={`${sizeClasses[size]} animate-spin text-primary`}
        strokeWidth={2.5}
      />
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export const SkeletonLoader = ({ className = '', variant = 'default' }) => {
  const variants = {
    default: 'h-4 w-full bg-muted rounded',
    text: 'h-4 w-3/4 bg-muted rounded',
    title: 'h-6 w-1/2 bg-muted rounded',
    avatar: 'w-12 h-12 bg-muted rounded-full',
    card: 'h-32 w-full bg-muted rounded-lg',
    image: 'aspect-video w-full bg-muted rounded-lg'
  };

  return (
    <div 
      className={`${variants[variant]} ${className} animate-pulse`}
      aria-label="Loading..."
    />
  );
};

export const SkeletonCard = () => (
  <div className="border rounded-lg p-4 space-y-3">
    <div className="flex items-center gap-3">
      <SkeletonLoader variant="avatar" />
      <div className="flex-1 space-y-2">
        <SkeletonLoader variant="title" />
        <SkeletonLoader variant="text" className="w-1/3" />
      </div>
    </div>
    <SkeletonLoader variant="text" />
    <SkeletonLoader variant="text" className="w-5/6" />
  </div>
);

export const SkeletonList = ({ count = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export const LoadingOverlay = ({ show, text = 'Loading...' }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-copper-600/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 shadow-xl">
        <LoadingSpinner size="lg" text={text} />
      </div>
    </div>
  );
};

export default LoadingSpinner;
