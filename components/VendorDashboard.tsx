
import React, { useState, useEffect, useMemo } from 'react';
import { User, Box, Truck, Settings, Bell, Volume2, ArrowLeft, Compass, ShieldCheck, RefreshCw, AlertTriangle, X } from 'lucide-react';
import { VendorDashboardProps, Market, PaymentPlan, Sanction, Product, AppNotification } from '../types';
import VendorOverview from './vendor/VendorOverview';
import ProductManager from './vendor/ProductManager';
import VendorSettings from './vendor/VendorSettings';
import MarketExplorer from './vendor/MarketExplorer';
import BiometricValidator from './vendor/BiometricValidator';
import MarketMap from './MarketMap';
import { calculateStallDebt, formatCurrency } from '../utils/coreUtils';
import { subscribeToTable } from '../services/supabaseService';
import toast from 'react-hot-toast';
// Fix: Added missing Card import
import { Card } from './ui/Card';

const VendorDashboard: React.FC<VendorDashboardProps & { markets?: Market[] }> = ({ 
  profile, transactions = [], myStall, stalls = [], sanctions = [], products = [], notifications = [], markets = [], productCategories = [], 
  onAddProduct, onUpdateProduct, onDeleteProduct, onUpdateProfile, onToggleLogistics, onReserve, onContestSanction, onRequestPlan 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'explore' | 'store' | 'logistics' | 'settings'>('overview');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [isBiometricVerified, setIsBiometricVerified] = useState(false);
  const [criticalAlert, setCriticalAlert] = useState<AppNotification | null>(null);

  // ÉCOUTEUR DE SÉCURITÉ : Annulations suspectes
  useEffect(() => {
      const channel = subscribeToTable('notifications', (payload) => {
          if (payload.eventType === 'INSERT' && payload.new.user_id === profile.id && payload.new.type === 'alert') {
              setCriticalAlert(payload.new as any);
              if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);
              // Son d'alerte si possible
          }
      });
      return () => { channel.unsubscribe(); };
  }, [profile.id]);

  const unreadNotifs = notifications.filter(n => !n.read).length;
  
  const debtInfo = useMemo(() => {
    try { return calculateStallDebt(myStall, sanctions); } 
    catch (e) { return { totalDebt: 0, details: [] }; }
  }, [myStall, sanctions]);

  if (!isBiometricVerified) {
      return <BiometricValidator userId={profile.id} onVerified={() => setIsBiometricVerified(true)} onCancel={() => setIsBiometricVerified(true)} />;
  }

  return (
    <div className="space-y-4 relative max-w-2xl mx-auto pb-24">
      {/* ALERTE CRITIQUE MODALE (S'affiche par dessus tout) */}
      {criticalAlert && (
          <div className="fixed inset-0 z-[200] bg-red-600/95 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
              <Card className="w-full max-w-sm bg-white border-none shadow-2xl p-8 text-center space-y-6 overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-full h-2 bg-red-600 animate-pulse"></div>
                  <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                      <AlertTriangle className="w-12 h-12 text-red-600 animate-bounce"/>
                  </div>
                  <div>
                      <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{criticalAlert.title}</h3>
                      <p className="text-slate-500 font-bold mt-2 leading-relaxed">{criticalAlert.message}</p>
                  </div>
                  <button 
                    onClick={() => setCriticalAlert(null)}
                    className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl uppercase tracking-widest active:scale-95 transition-all"
                  >
                      J'AI COMPRIS
                  </button>
                  <p className="text-[10px] text-slate-400 font-bold italic">Un rapport automatique a été envoyé au Régisseur Central.</p>
              </Card>
          </div>
      )}

      {/* Reste de l'UI identique... */}
      <div className="flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-gray-100 sticky top-2 z-30 backdrop-blur-md bg-white/90">
          <div className="flex items-center gap-3">
               <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center text-green-600 font-black overflow-hidden shadow-inner border border-green-200">
                      {profile.photoUrl ? <img src={profile.photoUrl} className="w-full h-full object-cover"/> : profile.name.charAt(0)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                      <ShieldCheck className="w-2 h-2 text-white"/>
                  </div>
               </div>
               <div>
                   <h2 className="font-black text-slate-900 text-lg leading-tight truncate max-w-[150px]">{profile.name}</h2>
                   <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Marchand Certifié</span>
               </div>
          </div>
          <div className="flex gap-2">
              <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-3 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors border border-gray-100">
                  <Bell className="w-5 h-5 text-gray-600"/>
                  {(unreadNotifs > 0 || criticalAlert) && <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
              </button>
          </div>
      </div>
      
      {/* ... (Code des onglets inchangé) */}
      <div className="grid grid-cols-5 gap-2 px-1">
        {[ 
            { id: 'overview', icon: Box, color: 'text-green-600', bg: 'bg-green-50', label: 'Caisse' },
            { id: 'explore', icon: Compass, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Marchés' }, 
            { id: 'store', icon: Box, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Rayons' }, 
            { id: 'logistics', icon: Truck, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Livreur' }, 
            { id: 'settings', icon: Settings, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Profil' } 
        ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all active:scale-95 border-2 ${activeTab === tab.id ? `border-${tab.color.split('-')[1]}-200 shadow-md bg-white` : 'border-transparent bg-white shadow-sm'}`}>
                <div className={`p-2 rounded-xl mb-1 ${activeTab === tab.id ? tab.bg : 'bg-gray-50'}`}><tab.icon className={`w-5 h-5 ${activeTab === tab.id ? tab.color : 'text-gray-400'}`} /></div>
                <span className={`text-[9px] font-black uppercase tracking-tighter ${activeTab === tab.id ? 'text-slate-900' : 'text-gray-400'}`}>{tab.label}</span>
            </button>
        ))}
      </div>

      <div className="min-h-[400px]">
          {activeTab === 'overview' && (
              <VendorOverview 
                profile={profile} 
                myStall={myStall} 
                sanctions={sanctions} 
              />
          )}
          {activeTab === 'explore' && (
              <MarketExplorer markets={markets} stalls={stalls} onSelectMarket={(id) => { setSelectedMarketId(id); setShowMap(true); }} />
          )}
          {activeTab === 'store' && (
              <ProductManager profile={profile} myStall={myStall} products={products} productCategories={productCategories} onAddProduct={onAddProduct} onUpdateProduct={onUpdateProduct} onDeleteProduct={onDeleteProduct} />
          )}
          {activeTab === 'settings' && (
              <VendorSettings profile={profile} onUpdateProfile={onUpdateProfile} />
          )}
      </div>

      {showMap && selectedMarketId && (
          <div className="fixed inset-0 z-50 bg-white">
              <div className="p-4 border-b flex justify-between items-center">
                  <h3 className="font-bold">Plan du Marché</h3>
                  <button onClick={() => setShowMap(false)}><X/></button>
              </div>
              <div className="p-4 h-full overflow-y-auto">
                <MarketMap stalls={stalls} markets={markets} onReserve={onReserve} language="fr" />
              </div>
          </div>
      )}
    </div>
  );
};

export default VendorDashboard;
