
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, Box, Truck, Settings, Bell, Volume2, ArrowLeft, Compass, ShieldCheck, RefreshCw, AlertTriangle, X, Sun, Moon, History, ShoppingBag, QrCode as QrIcon } from 'lucide-react';
import { VendorDashboardProps, Market, PaymentPlan, Sanction, Product, AppNotification, Transaction, ClientOrder } from '../types';
import VendorOverview from './vendor/VendorOverview';
import ProductManager from './vendor/ProductManager';
import VendorSettings from './vendor/VendorSettings';
import MarketExplorer from './vendor/MarketExplorer';
import BiometricValidator from './vendor/BiometricValidator';
import VendorHistory from './vendor/VendorHistory';
import OrderManager from './vendor/OrderManager';
import MarketMap from './MarketMap';
import { subscribeToTable } from '../services/supabaseService';
import toast from 'react-hot-toast';
import { Card } from './ui/Card';

const VendorDashboard: React.FC<VendorDashboardProps & { markets?: Market[] }> = ({ 
  profile, transactions = [], myStall, stalls = [], sanctions = [], products = [], notifications = [], markets = [], productCategories = [], orders = [],
  onAddProduct, onUpdateProduct, onDeleteProduct, onUpdateProfile, onUpdateOrderStatus, onToggleLogistics, onReserve, onContestSanction, onRequestPlan 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'history' | 'store' | 'explore' | 'settings'>('overview');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [isBiometricVerified, setIsBiometricVerified] = useState(false);
  
  // PERSISTANCE SOLARIS
  const [isSolaris, setIsSolaris] = useState(() => localStorage.getItem('mc_solaris') === 'true');

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  useEffect(() => {
      localStorage.setItem('mc_solaris', String(isSolaris));
  }, [isSolaris]);

  // HAPTIQUE SUR NOUVELLE COMMANDE
  useEffect(() => {
      const pendingOrders = orders.filter(o => o.status === 'pending').length;
      if (pendingOrders > 0 && navigator.vibrate) {
          navigator.vibrate([100, 30, 100]);
          speak(`Vous avez ${pendingOrders} nouvelles commandes en attente.`);
      }
  }, [orders.length, speak]);

  const unreadNotifs = notifications.filter(n => !n.read).length;
  const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;

  if (!isBiometricVerified) {
      return <BiometricValidator userId={profile.id} onVerified={() => setIsBiometricVerified(true)} onCancel={() => setIsBiometricVerified(true)} />;
  }

  const themeClass = isSolaris ? "bg-white text-black font-[900]" : "bg-gray-50 text-slate-800";

  return (
    <div className={`min-h-screen transition-colors duration-500 ${themeClass}`}>
      <div className="space-y-4 relative max-w-2xl mx-auto pb-32 px-1">
        
        {/* HEADER */}
        <div className={`flex justify-between items-center p-4 rounded-3xl shadow-sm sticky top-2 z-40 backdrop-blur-md transition-all ${isSolaris ? 'bg-white border-black border-b-4' : 'bg-white/90 border-gray-100 border-b'}`}>
            <div className="flex items-center gap-3">
                 <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black overflow-hidden border-2 bg-green-100 text-green-600">
                    {profile.photoUrl ? <img src={profile.photoUrl} className="w-full h-full object-cover"/> : profile.name.charAt(0)}
                 </div>
                 <div>
                     <h2 className="font-black text-lg leading-tight truncate max-w-[120px] uppercase tracking-tighter">{profile.name}</h2>
                     <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Étal {myStall?.number || 'Non assigné'}</span>
                 </div>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={() => { setIsSolaris(!isSolaris); speak(isSolaris ? "Mode normal" : "Mode solaire actif"); }} 
                    className={`p-3 rounded-2xl border-2 ${isSolaris ? 'bg-black text-white border-black' : 'bg-white text-slate-400 border-gray-100'}`}
                >
                    {isSolaris ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}
                </button>
                <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-3 bg-white rounded-2xl border-2 border-gray-100 text-gray-400">
                    <Bell className="w-5 h-5"/>
                    {unreadNotifs > 0 && <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
                </button>
            </div>
        </div>
        
        {/* TAB BAR SUPÉRIEURE (COMPACTE) */}
        <div className="grid grid-cols-3 gap-2 px-1">
            <button onClick={() => setActiveTab('overview')} className={`p-4 rounded-2xl font-black text-[10px] uppercase transition-all border-4 ${activeTab === 'overview' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-transparent shadow-sm'}`}>COCKPIT</button>
            <button onClick={() => setActiveTab('orders')} className={`p-4 rounded-2xl font-black text-[10px] uppercase transition-all border-4 relative ${activeTab === 'orders' ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-slate-400 border-transparent shadow-sm'}`}>
                VENTES {pendingOrdersCount > 0 && <span className="ml-1 bg-red-500 text-white px-1.5 rounded-full text-[8px] animate-bounce">{pendingOrdersCount}</span>}
            </button>
            <button onClick={() => setActiveTab('history')} className={`p-4 rounded-2xl font-black text-[10px] uppercase transition-all border-4 ${activeTab === 'history' ? 'bg-purple-600 text-white border-purple-600 shadow-lg' : 'bg-white text-slate-400 border-transparent shadow-sm'}`}>QUITTANCIER</button>
        </div>

        <div className="min-h-[500px]">
            {activeTab === 'overview' && (
                <VendorOverview 
                    profile={profile} myStall={myStall} sanctions={sanctions} transactions={transactions}
                    isSolaris={isSolaris} speak={speak}
                />
            )}
            {activeTab === 'orders' && (
                <OrderManager orders={orders} onUpdateStatus={onUpdateOrderStatus} isSolaris={isSolaris}/>
            )}
            {activeTab === 'history' && (
                <VendorHistory transactions={transactions} myStall={myStall} isSolaris={isSolaris}/>
            )}
            {activeTab === 'store' && (
                <ProductManager profile={profile} myStall={myStall} products={products} productCategories={productCategories} onAddProduct={onAddProduct} onUpdateProduct={onUpdateProduct} onDeleteProduct={onDeleteProduct} />
            )}
            {activeTab === 'explore' && (
                <MarketExplorer markets={markets} stalls={stalls} onSelectMarket={(id) => { setSelectedMarketId(id); setShowMap(true); }} />
            )}
            {activeTab === 'settings' && (
                <VendorSettings profile={profile} onUpdateProfile={onUpdateProfile} />
            )}
        </div>

        {/* NAVIGATION INFÉRIEURE (FIXE) */}
        <div className={`fixed bottom-0 left-0 right-0 p-4 border-t z-40 transition-all ${isSolaris ? 'bg-white border-black' : 'bg-white/90 backdrop-blur-xl border-gray-100 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]'}`}>
            <div className="max-w-2xl mx-auto grid grid-cols-4 gap-2">
                <button onClick={() => setActiveTab('overview')} className={`flex flex-col items-center py-2 rounded-xl transition-colors ${activeTab === 'overview' || activeTab === 'orders' || activeTab === 'history' ? 'text-blue-600' : 'text-gray-400'}`}>
                    <Box className="w-6 h-6"/><span className="text-[9px] font-black uppercase mt-1">Caisse</span>
                </button>
                <button onClick={() => setActiveTab('store')} className={`flex flex-col items-center py-2 rounded-xl transition-colors ${activeTab === 'store' ? 'text-purple-600' : 'text-gray-400'}`}>
                    <ShoppingBag className="w-6 h-6"/><span className="text-[9px] font-black uppercase mt-1">Produits</span>
                </button>
                <button onClick={() => setActiveTab('explore')} className={`flex flex-col items-center py-2 rounded-xl transition-colors ${activeTab === 'explore' ? 'text-green-600' : 'text-gray-400'}`}>
                    <Compass className="w-6 h-6"/><span className="text-[9px] font-black uppercase mt-1">Expansion</span>
                </button>
                <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center py-2 rounded-xl transition-colors ${activeTab === 'settings' ? 'text-slate-900' : 'text-gray-400'}`}>
                    <Settings className="w-6 h-6"/><span className="text-[9px] font-black uppercase mt-1">Compte</span>
                </button>
            </div>
        </div>

        {/* MAP OVERLAY */}
        {showMap && selectedMarketId && (
            <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-slide-up">
                <div className="p-6 border-b flex justify-between items-center bg-slate-900 text-white shadow-xl">
                    <h3 className="font-black uppercase tracking-tighter text-xl">Plan du Marché</h3>
                    <button onClick={() => setShowMap(false)} className="p-3 bg-white/10 rounded-2xl"><X className="w-6 h-6"/></button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <MarketMap stalls={stalls} markets={markets} onReserve={onReserve} language="fr" />
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default VendorDashboard;
