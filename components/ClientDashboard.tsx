
import React, { useState } from 'react';
import { ShoppingBag, Package, User, MapPin, Clock, Search, Filter, AlertCircle, ShoppingCart, CheckCircle } from 'lucide-react';
import { Stall, Market, Product, ClientOrder } from '../types';
import PublicMarketplace from './PublicMarketplace';
import { deleteUserAccount, updateUserPassword, updateUserProfile } from '../services/supabaseService';

interface ClientDashboardProps {
  stalls: Stall[];
  markets: Market[];
  products: Product[];
  orders: ClientOrder[];
}

const ClientDashboard: React.FC<ClientDashboardProps> = ({ stalls, markets, products, orders }) => {
  const [activeTab, setActiveTab] = useState<'market' | 'orders' | 'profile'>('market');
  const [selectedMarketId, setSelectedMarketId] = useState<string>('all');
  
  // Profile Settings State
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [settingsMsg, setSettingsMsg] = useState<{type: 'success'|'error', text: string} | null>(null);

  const handleDeleteAccount = async () => {
      if (deleteInput !== 'SUPPRIMER' || !deletePassword) return;
      setIsDeleting(true);
      try {
          await deleteUserAccount(deletePassword);
      } catch (err: any) {
          setSettingsMsg({ type: 'error', text: err.message });
          setIsDeleting(false);
      }
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex justify-around">
          <button 
            onClick={() => setActiveTab('market')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${activeTab === 'market' ? 'text-green-600 bg-green-50' : 'text-gray-400'}`}
          >
              <ShoppingBag className="w-6 h-6"/>
              <span className="text-xs font-bold">Marché</span>
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${activeTab === 'orders' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}
          >
              <Package className="w-6 h-6"/>
              <span className="text-xs font-bold">Commandes</span>
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${activeTab === 'profile' ? 'text-purple-600 bg-purple-50' : 'text-gray-400'}`}
          >
              <User className="w-6 h-6"/>
              <span className="text-xs font-bold">Profil</span>
          </button>
      </div>

      {/* CONTENT */}
      <div className="animate-fade-in">
          {activeTab === 'market' && (
              // Reusing PublicMarketplace but embedding it
              <PublicMarketplace 
                  stalls={stalls} 
                  markets={markets} 
                  products={products}
                  activeMarketId={selectedMarketId}
                  onMarketChange={setSelectedMarketId}
                  onBack={() => {}} // No back in dashboard mode
                  onCreateOrder={(order) => console.log("New Order", order)} // In a real app, this connects to Supabase
              />
          )}

          {activeTab === 'orders' && (
              <div className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-800 px-2">Mes Commandes</h2>
                  {orders.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-200">
                          <Package className="w-12 h-12 text-gray-300 mx-auto mb-2"/>
                          <p className="text-gray-500">Aucune commande pour le moment.</p>
                      </div>
                  ) : (
                      orders.map(order => (
                          <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                              <div className="flex justify-between items-start mb-2">
                                  <div>
                                      <p className="font-bold text-gray-800">Commande #{order.id.slice(-6)}</p>
                                      <p className="text-xs text-gray-500">{new Date(order.date).toLocaleDateString()}</p>
                                  </div>
                                  <span className={`px-2 py-1 rounded-full text-xs font-bold capitalize 
                                      ${order.status === 'ready' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}
                                  `}>
                                      {order.status === 'ready' ? 'Prête à récupérer' : order.status}
                                  </span>
                              </div>
                              <div className="space-y-1 mb-3">
                                  {order.items.map((item, idx) => (
                                      <div key={idx} className="flex justify-between text-sm">
                                          <span className="text-gray-600">{item.quantity}x {item.name}</span>
                                          <span className="font-medium">{(item.price * item.quantity).toLocaleString()} F</span>
                                      </div>
                                  ))}
                              </div>
                              <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                                  <span className="text-sm text-gray-500">Total payé</span>
                                  <span className="text-lg font-black text-gray-900">{order.totalAmount.toLocaleString()} FCFA</span>
                              </div>
                          </div>
                      ))
                  )}
              </div>
          )}

          {activeTab === 'profile' && (
              <div className="space-y-6 px-2">
                  <h2 className="text-xl font-bold text-gray-800">Mon Compte Client</h2>
                  
                  {settingsMsg && (
                      <div className={`p-3 rounded-lg text-sm font-bold ${settingsMsg.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {settingsMsg.text}
                      </div>
                  )}

                  <div className="bg-white p-6 rounded-xl border border-gray-200">
                      <h3 className="font-bold text-red-800 mb-4 flex items-center gap-2"><AlertCircle className="w-5 h-5"/> Zone de Danger</h3>
                      <div className="space-y-3">
                          <label className="block text-xs font-bold text-gray-500">Confirmer suppression (Ecrire SUPPRIMER)</label>
                          <input type="text" value={deleteInput} onChange={e => setDeleteInput(e.target.value)} className="w-full p-2 border rounded"/>
                          <label className="block text-xs font-bold text-gray-500">Mot de passe</label>
                          <input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} className="w-full p-2 border rounded"/>
                          
                          <button 
                            onClick={handleDeleteAccount}
                            disabled={deleteInput !== 'SUPPRIMER' || !deletePassword || isDeleting}
                            className="w-full py-3 bg-red-600 text-white font-bold rounded-lg shadow-lg disabled:bg-gray-300"
                          >
                              {isDeleting ? 'Suppression...' : 'Supprimer mon Compte'}
                          </button>
                      </div>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};

export default ClientDashboard;
