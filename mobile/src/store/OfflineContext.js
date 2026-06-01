import React, { createContext, useContext, useState, useEffect } from 'react';
import * as NetInfo from '@react-native-community/netinfo';
import { offlineService } from '../services/offlineService';
import { syncService } from '../services/syncService';

const OfflineContext = createContext();

export const useOffline = () => useContext(OfflineContext);

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState({ pending: 0, synced: 0, total: 0 });
  const [lastSync, setLastSync] = useState(null);
  const [syncInProgress, setSyncInProgress] = useState(false);

  useEffect(() => {
    const checkConnectivity = () => {
      NetInfo.fetch().then(state => {
        const online = state.isConnected && state.isInternetReachable;
        setIsOnline(online);
        offlineService.setOnlineStatus(online);

        if (online) {
          checkSyncStatus();
        }
      });
    };

    checkConnectivity();

    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected && state.isInternetReachable;
      setIsOnline(online);
      offlineService.setOnlineStatus(online);

      if (online) {
        checkSyncStatus();
      }
    });

    return () => unsubscribe();
  }, []);

  const checkSyncStatus = async () => {
    try {
      const status = await offlineService.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Failed to check sync status:', error);
    }
  };

  const syncData = async () => {
    if (!isOnline || syncInProgress) return;

    setSyncInProgress(true);
    try {
      const result = await syncService.synchronize();
      setLastSync(new Date().toISOString());
      await checkSyncStatus();

      if (result.failureCount > 0) {
        console.warn(`${result.failureCount} transactions failed to sync due to conflicts.`);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncInProgress(false);
    }
  };

  const value = {
    isOnline,
    syncStatus,
    lastSync,
    syncInProgress,
    syncData,
    checkSyncStatus,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};
