import React, { useState } from 'react';
import { User, Box, Truck, Settings, Bell, Volume2, ArrowLeft } from 'lucide-react';
import { VendorDashboardProps } from '../types';
import VendorOverview from './vendor/VendorOverview';
import ProductManager from './vendor/ProductManager';
import VendorSettings from './vendor/VendorSettings';
import MarketMap from './MarketMap';
import { calculateStallDebt, formatCurrency } from '../utils/coreUtils';

const VendorDashboard: React.FC<VendorDashboardProps> = ({ profile, transactions, myStall, stalls, sanctions, products, notifications, onAddProduct, onUpdateProduct, onDeleteProduct, onUpdateProfile, onToggleLogistics, onReserve, onContestSanction }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'store' | 'logistics' | 'settings'>('overview');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const unreadNotifs = notifications.filter(n => !n.read).length;
  const { totalDebt } = calculateStallDebt(myStall, sanctions);

  if (showMap && stalls && onReserve) {
      return (
          <div className="relative min-h-screen bg-gray-50 animate-fade-in">
              <div className="sticky top-0 z-10 bg-white shadow-sm p-4 flex items-center justify-between">
                  <button onClick={() => setShowMap(false)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-bold"><ArrowLeft className="w-5 h-5"/> Retour</button>
                  <h2 className="text-lg font-bold">Choisir un Emplacement</h2>
              </div>
              <div className="p-4"><MarketMap stalls={stalls} onReserve={(id, provider, priority) => { onReserve(id, provider, priority); setShowMap(false); }} language={profile.language || 'fr'}/></div>
          </div>
      );
  }

  return (
    <div className="space-y-4 relative max-w-2xl mx-auto pb-20">
      <div className="flex justify-between items-center bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
               <button className="bg-blue-100 text-blue-600 p-3 rounded-full active:scale-95 transition-transform"><Volume2 className="w-6 h-6" /></button>
               <div><h2 className="font-bold text-gray-800 text-lg leading-tight">{profile.name}</h2><p className="text-gray-400 text-xs">Vendeur Certifié</p></div>
          </div>
          <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-3 bg-gray-50 rounded-xl hover:bg-gray-100">
              <Bell className="w-6 h-6 text-gray-600"/>{unreadNotifs > 0 && <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
          </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[ { id: 'overview', icon: User, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Moi' }, { id: 'store', icon: Box, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Rayons' }, { id: 'logistics', icon: Truck, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Livraison' }, { id: 'settings', icon: Settings, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Réglages' } ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all active:scale-95 border-2 ${activeTab === tab.id ? `border-${(tab.color.split('-')[1] as string)}-200 shadow-md transform scale-105 bg-white` : 'border-transparent bg-white shadow-sm'}`}>
                <div className={`p-3 rounded-full mb-1 ${activeTab === tab.id ? tab.bg : 'bg-gray-50'}`}><tab.icon className={`w-6 h-6 ${activeTab === tab.id ? tab.color : 'text-gray-400'}`} /></div>
                <span className={`text-xs font-bold ${activeTab === tab.id ? 'text-gray-800' : 'text-gray-400'}`}>{tab.label}</span>
            </button>
        ))}
      </div>

      {activeTab === 'overview' && <VendorOverview profile={profile} myStall={myStall} totalDebt={totalDebt} transactions={transactions} sanctions={sanctions} onShowMap={() => setShowMap(true)} onSpeak={() => {}} onContestSanction={onContestSanction} />}
      {activeTab === 'store' && <ProductManager products={products} myStall={myStall} profile={profile} onAddProduct={onAddProduct} onUpdateProduct={onUpdateProduct} onDeleteProduct={onDeleteProduct} />}
      {activeTab === 'logistics' && (
           <div className={`rounded-3xl p-6 relative overflow-hidden text-white shadow-lg animate-fade-in ${profile.isLogisticsSubscribed ? 'bg-orange-500' : 'bg-slate-800'}`}>
              <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4"><div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm"><Truck className="w-8 h-8"/></div><div><p className="text-white/60 font-bold text-xs uppercase">Statut Service</p><h3 className="text-2xl font-black">{profile.isLogisticsSubscribed ? 'ACTIF' : 'INACTIF'}</h3></div></div>
                  {profile.isLogisticsSubscribed ? <div><p className="text-xs text-orange-100">Vous êtes éligible à la collecte de colis.</p></div> : <div><p className="text-slate-300 text-sm mb-4">Activez la livraison pour vendre à distance.</p><button onClick={() => onToggleLogistics && onToggleLogistics(true)} className="w-full py-3 bg-white text-slate-900 font-bold rounded-xl active:scale-95 transition-transform">Activer ({formatCurrency(5000)})</button></div>}
              </div>
          </div>
      )}
      {activeTab === 'settings' && <VendorSettings profile={profile} onUpdateProfile={onUpdateProfile!} />}
    </div>
  );
};
export default VendorDashboard;