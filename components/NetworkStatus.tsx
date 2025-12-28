
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, UploadCloud, AlertTriangle, X, List, Trash2, CheckCircle, Clock } from 'lucide-react';
import { syncOfflineQueue, fetchPendingItemsAsync, fetchFailedItemsAsync, retryFailedItem, discardFailedItem, removePendingItem } from '../services/supabaseService';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/coreUtils';

const NetworkStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOnlineToast, setShowOnlineToast] = useState(false);
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [failedItems, setFailedItems] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Modal & Tabs
  const [showManager, setShowManager] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'failed'>('pending');

  const updateCounts = async () => {
      try {
          const pending = await fetchPendingItemsAsync();
          const failed = await fetchFailedItemsAsync();
          setPendingItems(pending);
          setFailedItems(failed);
      } catch (e) {
          // Silent fail if crypto not ready
      }
  };

  useEffect(() => {
    updateCounts();

    const handleOnline = async () => {
      setIsOnline(true);
      setShowOnlineToast(true);
      
      const pending = await fetchPendingItemsAsync();
      if (pending.length > 0) {
          setIsSyncing(true);
          const processed = await syncOfflineQueue();
          if (processed > 0) {
              toast.success(`${processed} actions synchronisées !`, { icon: '☁️' });
          }
          setIsSyncing(false);
      }
      updateCounts();
      setTimeout(() => setShowOnlineToast(false), 4000);
    };

    const handleOffline = () => {
        setIsOnline(false);
        updateCounts();
    };

    // Polling toutes les 3s pour vérifier le stockage chiffré
    const interval = setInterval(updateCounts, 3000);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
      if (!isOnline) {
          toast.error("Pas de connexion internet.");
          return;
      }
      setIsSyncing(true);
      const processed = await syncOfflineQueue();
      toast.success(`${processed} actions synchronisées.`);
      setIsSyncing(false);
      updateCounts();
  };

  const handleRetry = async (id: number) => {
      await retryFailedItem(id);
      updateCounts();
      toast.success("Action remise en file d'attente");
  };

  const handleDiscardFailed = async (id: number) => {
      await discardFailedItem(id);
      updateCounts();
      toast("Action supprimée", { icon: '🗑️' });
  };

  const handleCancelPending = async (id: number) => {
      if (confirm("Annuler cette action avant l'envoi ?")) {
          await removePendingItem(id);
          updateCounts();
          toast("Action annulée", { icon: '🗑️' });
      }
  };

  const getHumanReadableAction = (action: string, payload: any) => {
      try {
          switch(action) {
              case 'createTransaction': 
                  return `Encaissement : ${formatCurrency(payload.amount)} ${payload.type === 'rent' ? '(Loyer)' : '(Autre)'}`;
              default: 
                  return `${action}`;
          }
      } catch (e) {
          return action;
      }
  };

  if (isOnline && !showOnlineToast && failedItems.length === 0 && pendingItems.length === 0) return null;

  return (
    <>
        <div 
            onClick={() => setShowManager(true)}
            className={`fixed bottom-4 left-4 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 transition-all duration-300 animate-slide-up border cursor-pointer hover:scale-105 ${
            failedItems.length > 0 ? 'bg-red-600 text-white border-red-500' :
            pendingItems.length > 0 ? 'bg-slate-800 text-white border-slate-700' :
            isOnline ? 'bg-green-600 text-white border-green-500' : 'bg-slate-800 text-white border-slate-700'
        }`}>
            <div className={`p-2 rounded-full ${failedItems.length > 0 ? 'bg-red-500 animate-pulse' : isOnline ? 'bg-green-500' : 'bg-slate-600'}`}>
                {failedItems.length > 0 ? <AlertTriangle className="w-4 h-4"/> : 
                 isSyncing ? <RefreshCw className="w-4 h-4 animate-spin"/> : 
                 isOnline ? <Wifi className="w-4 h-4"/> : <WifiOff className="w-4 h-4"/>}
            </div>
            <div>
                {failedItems.length > 0 ? (
                    <div>
                        <p className="text-sm font-bold">Synchro Échouée ({failedItems.length})</p>
                        <p className="text-xs opacity-80 underline">Voir les détails</p>
                    </div>
                ) : (
                    <div>
                        <p className="text-sm font-bold">{isOnline ? (isSyncing ? 'Synchronisation...' : pendingItems.length > 0 ? 'En Attente Envoi' : 'Connecté') : 'Mode Hors Ligne'}</p>
                        <p className="text-xs opacity-80 flex items-center gap-1">
                            {pendingItems.length > 0 ? <><UploadCloud className="w-3 h-3"/> {pendingItems.length} actions chiffrées</> : isOnline ? 'Système à jour' : 'Sauvegarde sécurisée'}
                        </p>
                    </div>
                )}
            </div>
        </div>

        {/* SYNC MANAGER MODAL */}
        {showManager && (
            <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl w-full max-w-md h-[70vh] flex flex-col relative overflow-hidden shadow-2xl">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-blue-600"/> Centre de Synchronisation
                        </h3>
                        <button onClick={() => setShowManager(false)}><X className="w-5 h-5 text-gray-400"/></button>
                    </div>

                    <div className="flex border-b border-gray-200">
                        <button 
                            onClick={() => setActiveTab('pending')} 
                            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'pending' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-500'}`}
                        >
                            <UploadCloud className="w-4 h-4"/> En Attente ({pendingItems.length})
                        </button>
                        <button 
                            onClick={() => setActiveTab('failed')} 
                            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'failed' ? 'border-red-600 text-red-600 bg-red-50' : 'border-transparent text-gray-500'}`}
                        >
                            <AlertTriangle className="w-4 h-4"/> Échecs ({failedItems.length})
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3">
                        {activeTab === 'pending' && (
                            <>
                                {pendingItems.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400 flex flex-col items-center">
                                        <CheckCircle className="w-12 h-12 mb-2 text-green-500 opacity-50"/>
                                        <p>Tout est synchronisé.</p>
                                    </div>
                                ) : (
                                    pendingItems.map(item => (
                                        <div key={item.id} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-sm text-gray-800">{getHumanReadableAction(item.action, item.payload)}</p>
                                                <p className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(item.timestamp).toLocaleTimeString()}</p>
                                            </div>
                                            <button onClick={() => handleCancelPending(item.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Annuler l'action">
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    ))
                                )}
                                {pendingItems.length > 0 && isOnline && (
                                    <button onClick={handleManualSync} disabled={isSyncing} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl mt-4 flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200">
                                        {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin"/> : <UploadCloud className="w-4 h-4"/>}
                                        Forcer l'Envoi
                                    </button>
                                )}
                            </>
                        )}

                        {activeTab === 'failed' && (
                            <>
                                {failedItems.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400 flex flex-col items-center">
                                        <CheckCircle className="w-12 h-12 mb-2 text-gray-300 opacity-50"/>
                                        <p>Aucune erreur critique.</p>
                                    </div>
                                ) : (
                                    failedItems.map(item => (
                                        <div key={item.id} className="p-3 bg-red-50 border border-red-100 rounded-lg shadow-sm">
                                            <div className="flex justify-between mb-1">
                                                <span className="font-bold text-sm text-gray-800">{getHumanReadableAction(item.action, item.payload)}</span>
                                                <span className="text-xs text-gray-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
                                            </div>
                                            <p className="text-xs text-red-700 mb-3 font-mono bg-red-100 p-2 rounded break-all">{item.errorReason || "Erreur réseau inconnue"}</p>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleRetry(item.id)} className="flex-1 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors">Réessayer</button>
                                                <button onClick={() => handleDiscardFailed(item.id)} className="flex-1 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition-colors">Supprimer</button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        )}
    </>
  );
};

export default NetworkStatus;
