import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { WifiOff, RefreshCw, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getPendingScansCount } from '@/lib/offlineQueue';
import { forceSyncNow } from '@/lib/syncService';

export const OfflineDataBanner = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check pending count
    const updatePendingCount = async () => {
      const count = await getPendingScansCount();
      setPendingCount(count);
    };

    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await forceSyncNow();
      const count = await getPendingScansCount();
      setPendingCount(count);
    } finally {
      setSyncing(false);
    }
  };

  if (!isOffline) return null;

  return (
    <Alert className="mb-4 rounded-lg border border-orange-300 bg-orange-50 dark:bg-orange-950/50 dark:border-orange-800">
      <WifiOff className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      <AlertTitle className="text-orange-900 dark:text-orange-100 flex items-center gap-2">
        You're Offline
        {pendingCount > 0 && (
          <Badge variant="secondary" className="bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-100">
            {pendingCount} pending
          </Badge>
        )}
      </AlertTitle>
      <AlertDescription className="text-orange-800 dark:text-orange-200 flex items-center justify-between">
        <span>Scans and notes will sync when you're back online. Viewing cached data.</span>
        {pendingCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncNow}
            disabled={syncing || isOffline}
            className="ml-4 border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300"
          >
            {syncing ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </>
            )}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};
