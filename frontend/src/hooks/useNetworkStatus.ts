import { useState, useEffect } from 'react';
import { processOfflineQueue } from '@/lib/queueProcessor';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      console.log('Network connection restored');

      // Process offline queue when coming back online
      processOfflineQueue().catch((error) => {
        console.error('Failed to process offline queue:', error);
      });
    }

    function handleOffline() {
      setIsOnline(false);
      console.log('Network connection lost');
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
