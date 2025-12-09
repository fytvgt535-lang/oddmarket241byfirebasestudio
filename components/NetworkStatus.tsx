
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, UploadCloud } from 'lucide-react';
import { syncOfflineQueue, getOfflineQueueSize } from '../services/supabaseService';
import toast from 'react-hot-toast';

const NetworkStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOnlineToast, setShowOnlineToast] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Check initial queue size
    setPendingCount(getOfflineQueueSize());

    const handleOnline = async () => {
      setIsOnline(true);
      setShowOnlineToast(true);
      
      const queueSize = getOfflineQueueSize();
      if (queueSize > 0) {
          setIsSyncing(true);
          const processed = await syncOfflineQueue();
          if (processed > 0) {
              toast.success(`${processed} actions synchronisées !`, { icon: '☁️' });
          }
          setIsSyncing(false);
          setPendingCount(0);
      }
      
      setTimeout(() => setShowOnlineToast(false), 4000);
    };

    const handleOffline = () => {
        setIsOnline(false);
        setPendingCount(getOfflineQueueSize());
    };

    // Listen to local storage changes to update pending count even if offline
    const handleStorageChange = () => {
        if (!navigator.onLine) setPendingCount(getOfflineQueueSize());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('storage', handleStorageChange);
    // Custom interval to check queue size in case of same-tab updates
    const interval = setInterval(() => {
        if (!navigator.onLine) setPendingCount(getOfflineQueueSize());
    }, 2000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  if (isOnline && !showOnlineToast) return null;

  return (
    <div className={`fixed bottom-4 left-4 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 transition-all duration-300 animate-slide-up border ${isOnline ? 'bg-green-600 text-white border-green-500' : 'bg-slate-800 text-white border-slate-700'}`}>
        <div className={`p-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}>
            {isOnline ? (isSyncing ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Wifi className="w-4 h-4"/>) : <WifiOff className="w-4 h-4"/>}
        </div>
        <div>
            <p className="text-sm font-bold">{isOnline ? (isSyncing ? 'Synchronisation...' : 'Connexion Rétablie') : 'Mode Hors Ligne'}</p>
            <p className="text-xs opacity-80 flex items-center gap-1">
                {isOnline ? (
                    isSyncing ? 'Envoi des données...' : 'Système à jour'
                ) : (
                    <>
                        <UploadCloud className="w-3 h-3"/> 
                        {pendingCount > 0 ? `${pendingCount} actions en attente` : 'Sauvegarde locale active'}
                    </>
                )}
            </p>
        </div>
    </div>
  );
};

export default NetworkStatus;
