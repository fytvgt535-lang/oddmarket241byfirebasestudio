
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

const NetworkStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOnlineToast, setShowOnlineToast] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOnlineToast(true);
      setTimeout(() => setShowOnlineToast(false), 3000);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showOnlineToast) return null;

  return (
    <div className={`fixed bottom-4 left-4 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 transition-all duration-300 animate-slide-up border ${isOnline ? 'bg-green-600 text-white border-green-500' : 'bg-slate-800 text-white border-slate-700'}`}>
        <div className={`p-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}>
            {isOnline ? <Wifi className="w-4 h-4"/> : <WifiOff className="w-4 h-4"/>}
        </div>
        <div>
            <p className="text-sm font-bold">{isOnline ? 'Connexion Rétablie' : 'Mode Hors Ligne'}</p>
            <p className="text-xs opacity-80 flex items-center gap-1">
                {isOnline ? 'Synchronisation terminée' : <><RefreshCw className="w-3 h-3 animate-spin"/> Sauvegarde locale active</>}
            </p>
        </div>
    </div>
  );
};

export default NetworkStatus;
