import { useCallback } from 'react';
import { useDashboardState } from '../contexts/DashboardStateContext';

export const useDashboardErrorHandler = () => {
  const { setMode } = useDashboardState();

  const handleFirestoreError = useCallback((error: any) => {
    const msg = error?.message || (typeof error === 'string' ? error : '');
    const isQuota =
      msg.includes('resource-exhausted') ||
      msg.includes('Quota limit exceeded') ||
      msg.includes('Free daily read units') ||
      msg.includes('quota') ||
      error?.code === 'resource-exhausted';

    if (isQuota) {
      console.warn('Notice: Firestore quota limit reached. Activating quota-standby cache mode.');
      setMode(prev => (prev !== 'quota-standby' ? 'quota-standby' : prev));
    } else {
      console.error('Firestore Error detected:', error);
    }
    return error;
  }, [setMode]);

  return { handleFirestoreError };
};

