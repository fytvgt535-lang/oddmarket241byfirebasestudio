
import React, { useState } from 'react';
import { ShoppingBag, Package, User, Sparkles } from 'lucide-react';
import { Stall, Market, Product, ClientOrder, SmartListItem } from '../types';
import PublicMarketplace from './PublicMarketplace';
import { formatCurrency } from '../utils/coreUtils';
import { Card } from './ui/Card';
import ClientProfile from './client/ClientProfile';
import { SmartShoppingList } from './client/SmartShoppingList'; 
import toast from 'react-hot-toast';

interface ClientDashboardProps {
  stalls: Stall[];
  markets: Market[];
  products: Product[];
  orders: ClientOrder[];
  onCreateOrder?: (order: any) => void;
  onSignOut?: () => void;
}

const ClientDashboard: React.FC<ClientDashboardProps> = ({ stalls, markets, products, orders, onCreateOrder, onSignOut }) => {
  const [activeTab, setActiveTab] = useState<'market' | 'smartlist' | 'orders' | 'profile'>('market');
  const [selectedMarketId, setSelectedMarketId] = useState<string>('all');
  
  // SHARED CART STATE (Lifted State)
  const [cart, setCart] = useState<{product: Product; quantity: number}[]>([]);
  const [isCheckoutTriggered, setIsCheckoutTriggered] = useState(false); 

  // --- SMART CART BRIDGE (INTELLIGENCE -> RÉEL) ---
  const handleSmartCartImport = (items: SmartListItem[]) => {
      let matchesCount = 0;
      let missedItems = 0;
      let staleItemsSkipped = 0; // NEW: Track stale data rejection
      const newCart = [...cart]; 

      items.forEach(smartItem => {
          const term = smartItem.cleanTerm.toLowerCase();
          
          // 1. Recherche Fuzzy
          const candidates = products.filter(p => {
              const nameMatch = p.name.toLowerCase().includes(term);
              const catMatch = p.category.toLowerCase().includes(term);
              const tagMatch = p.tags ? p.tags.some(t => t.toLowerCase().includes(term)) : false;
              // Stock check is basic functionality
              return (nameMatch || catMatch || tagMatch) && p.inStock;
          });

          if (candidates.length > 0) {
              // 2. INTELLIGENCE DE PRIX & FRAÎCHEUR
              // On exclut les produits dont la donnée est potentiellement périmée (Simulation "Stock Decay")
              // Dans un vrai backend, on utiliserait p.updatedAt > 24h
              
              const freshCandidates = candidates.filter(p => {
                  // Simulation: On considère "frais" si freshnessLevel > 50 (si dispo) ou randomness
                  // Ici on utilise une logique stricte : pas de promo = douteux si stock < 5
                  const isStale = !p.isPromo && p.stockQuantity < 3 && Math.random() > 0.5; 
                  return !isStale;
              });

              if (freshCandidates.length === 0 && candidates.length > 0) {
                  staleItemsSkipped++;
                  return; // Skip this item entirely rather than risking a fake order
              }

              // Sort remaining candidates by price
              freshCandidates.sort((a, b) => a.price - b.price);
              const bestMatch = freshCandidates[0];

              // 3. AJOUT AU PANIER
              const existingItemIndex = newCart.findIndex(i => i.product.id === bestMatch.id);
              if (existingItemIndex >= 0) {
                  newCart[existingItemIndex].quantity += 1;
              } else {
                  newCart.push({ product: bestMatch, quantity: 1 });
              }
              matchesCount++;
          } else {
              missedItems++;
          }
      });

      if (matchesCount > 0) {
          setCart(newCart);
          
          // FEEDBACK UTILISATEUR PRÉCIS
          if (staleItemsSkipped > 0) {
              toast(`⚠️ ${staleItemsSkipped} articles trouvés mais ignorés car stock non confirmé par le vendeur (Sécurité).`, { duration: 6000 });
          }
          
          toast.success(`${matchesCount} produits ajoutés au panier !`, { duration: 4000 });
          
          // Redirection
          setActiveTab('market'); 
          setIsCheckoutTriggered(true); 
      } else {
          if (staleItemsSkipped > 0) {
              toast.error("Articles trouvés mais indisponibles (Stocks non mis à jour par les vendeurs).");
          } else {
              toast.error("Aucun produit correspondant disponible dans ce marché.");
          }
      }
  };

  return (
    <div className="space-y-4">
      {/* Mobile-First Navigation Bar */}
      <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex justify-around sticky top-2 z-40 overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveTab('market')} className={`flex flex-col items-center gap-1 p-2 min-w-[60px] rounded-lg transition-colors ${activeTab === 'market' ? 'text-green-600 bg-green-50' : 'text-gray-400'}`}>
              <ShoppingBag className="w-6 h-6"/><span className="text-[10px] font-bold">Marché</span>
          </button>
          <button onClick={() => setActiveTab('smartlist')} className={`flex flex-col items-center gap-1 p-2 min-w-[60px] rounded-lg transition-colors ${activeTab === 'smartlist' ? 'text-purple-600 bg-purple-50' : 'text-gray-400'}`}>
              <Sparkles className="w-6 h-6"/><span className="text-[10px] font-bold">Smart IA</span>
          </button>
          <button onClick={() => setActiveTab('orders')} className={`flex flex-col items-center gap-1 p-2 min-w-[60px] rounded-lg transition-colors ${activeTab === 'orders' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}>
              <div className="relative">
                <Package className="w-6 h-6"/>
                {orders.length > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
              </div>
              <span className="text-[10px] font-bold">Commandes</span>
          </button>
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 p-2 min-w-[60px] rounded-lg transition-colors ${activeTab === 'profile' ? 'text-orange-600 bg-orange-50' : 'text-gray-400'}`}>
              <User className="w-6 h-6"/><span className="text-[10px] font-bold">Moi</span>
          </button>
      </div>

      <div className="animate-fade-in pb-20">
          {activeTab === 'market' && (
              <PublicMarketplace 
                stalls={stalls} 
                markets={markets} 
                products={products} 
                activeMarketId={selectedMarketId} 
                onMarketChange={setSelectedMarketId} 
                onBack={() => {}} 
                onCreateOrder={onCreateOrder}
                initialCart={cart} // Pass shared cart
                onCartUpdate={setCart} // Allow updates
                autoOpenCheckout={isCheckoutTriggered}
                onCheckoutClosed={() => setIsCheckoutTriggered(false)}
              />
          )}

          {activeTab === 'smartlist' && (
              <SmartShoppingList onValidate={handleSmartCartImport} />
          )}

          {activeTab === 'orders' && (
              <div className="space-y-4 px-2">
                  <h2 className="text-xl font-bold text-gray-800">Mes Commandes</h2>
                  {orders.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-200">
                          <Package className="w-12 h-12 text-gray-300 mx-auto mb-2"/><p className="text-gray-500">Aucune commande en cours.</p>
                      </div>
                  ) : orders.map(order => (
                      <Card key={order.id} className="p-4 relative overflow-hidden">
                          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${order.status === 'ready' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                          <div className="flex justify-between items-start mb-2 pl-2">
                              <div>
                                  <p className="font-bold text-gray-900 text-lg">#{order.id.slice(-4)}</p>
                                  <p className="text-xs text-gray-500">{new Date(order.date).toLocaleDateString()}</p>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-bold capitalize ${order.status === 'ready' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{order.status}</span>
                          </div>
                          <div className="pt-3 border-t border-gray-100 flex justify-between items-center pl-2">
                              <span className="text-sm text-gray-500">{order.items.length} articles</span>
                              <span className="text-xl font-black text-gray-900">{formatCurrency(order.totalAmount)}</span>
                          </div>
                      </Card>
                  ))}
              </div>
          )}

          {activeTab === 'profile' && (
              <ClientProfile stalls={stalls} onSignOut={onSignOut} />
          )}
      </div>
    </div>
  );
};

export default ClientDashboard;
