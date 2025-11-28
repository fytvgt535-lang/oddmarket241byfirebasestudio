
import React, { useState } from 'react';
import { Search, MapPin, Star, ShoppingBag, ArrowLeft, Filter, Leaf, Shirt, Smartphone, Sparkles, X, Plus, Minus, ShoppingCart, CheckCircle, Smartphone as PhoneIcon } from 'lucide-react';
import { Stall, Market, Product, ClientOrder } from '../types';

interface PublicMarketplaceProps {
  stalls: Stall[];
  markets: Market[];
  products?: Product[]; // Optional as initially it might be empty
  onBack: () => void;
  onCreateOrder?: (order: Omit<ClientOrder, 'id' | 'date' | 'status'>) => void;
}

const PublicMarketplace: React.FC<PublicMarketplaceProps> = ({ stalls, markets, products = [], onBack, onCreateOrder }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'vivres' | 'textile' | 'electronique'>('all');
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  
  // Storefront State
  const [selectedStall, setSelectedStall] = useState<Stall | null>(null);
  const [cart, setCart] = useState<{product: Product; quantity: number}[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', provider: 'momo' as 'momo'|'orange'|'airtel' });
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Filter logic
  const filteredStalls = stalls.filter(stall => {
    const isOccupied = stall.status === 'occupied';
    const matchesSearch = 
      stall.occupantName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      stall.productType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stall.number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || stall.productType === categoryFilter;
    const matchesMarket = selectedMarket === 'all' || stall.marketId === selectedMarket;

    return isOccupied && matchesSearch && matchesCategory && matchesMarket;
  });

  const getCategoryIcon = (type: string) => {
    switch(type) {
      case 'vivres': return <Leaf className="w-4 h-4 text-green-600" />;
      case 'textile': return <Shirt className="w-4 h-4 text-purple-600" />;
      case 'electronique': return <Smartphone className="w-4 h-4 text-blue-600" />;
      default: return <ShoppingBag className="w-4 h-4 text-gray-600" />;
    }
  };

  // Cart Functions
  const addToCart = (product: Product) => {
    setCart(prev => {
        const existing = prev.find(item => item.product.id === product.id);
        if (existing) {
            return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
        }
        return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
      setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
      setCart(prev => prev.map(item => {
          if (item.product.id === productId) {
              const newQty = Math.max(1, item.quantity + delta);
              return { ...item, quantity: newQty };
          }
          return item;
      }));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  const handleCheckout = (e: React.FormEvent) => {
      e.preventDefault();
      if (!onCreateOrder || !selectedStall) return;

      onCreateOrder({
          stallId: selectedStall.id,
          customerName: customerInfo.name,
          customerPhone: customerInfo.phone,
          items: cart.map(i => ({ productId: i.product.id, name: i.product.name, quantity: i.quantity, price: i.product.price })),
          totalAmount: cartTotal,
          paymentProvider: customerInfo.provider,
          paymentRef: `PAY-${Date.now()}`
      });

      setIsCheckoutOpen(false);
      setOrderSuccess(true);
      setCart([]);
  };

  const closeStorefront = () => {
      setSelectedStall(null);
      setCart([]);
      setOrderSuccess(false);
  };

  // Render STOREFRONT Modal
  if (selectedStall) {
      const stallProducts = products.filter(p => p.stallId === selectedStall.id);
      
      return (
        <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col animate-fade-in overflow-hidden">
            {/* Store Header */}
            <div className={`p-6 shadow-md relative ${selectedStall.productType === 'vivres' ? 'bg-green-700' : 'bg-blue-700'} text-white`}>
                <button onClick={closeStorefront} className="absolute top-4 right-4 bg-white/20 p-2 rounded-full hover:bg-white/30"><X className="w-5 h-5"/></button>
                <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center gap-6">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-3xl font-bold text-gray-500 shadow-lg">
                        {selectedStall.occupantName?.charAt(0)}
                    </div>
                    <div className="text-center md:text-left">
                        <h2 className="text-2xl font-bold">{selectedStall.occupantName}</h2>
                        <p className="text-white/80 flex items-center justify-center md:justify-start gap-1">
                            <MapPin className="w-4 h-4"/> {selectedStall.zone} • Étal {selectedStall.number}
                        </p>
                        <div className="mt-2 flex gap-2 justify-center md:justify-start">
                             <span className="bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                                 <Star className="w-3 h-3 fill-current"/> 4.5/5
                             </span>
                             <span className="bg-white/20 px-2 py-0.5 rounded text-xs">Ouvert maintenant</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Products Grid */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                            <ShoppingBag className="w-5 h-5"/> Produits Disponibles
                        </h3>
                        {stallProducts.length === 0 ? (
                            <div className="p-8 border-2 border-dashed rounded-xl text-center text-gray-400">
                                Ce vendeur n'a pas encore ajouté de produits en ligne.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {stallProducts.map(prod => (
                                    <div key={prod.id} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                                <ShoppingBag className="w-6 h-6 text-gray-300"/>
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800">{prod.name}</p>
                                                <p className="text-sm text-green-600 font-bold">{prod.price.toLocaleString()} FCFA <span className="text-gray-400 font-normal">/ {prod.unit}</span></p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => addToCart(prod)}
                                            className="bg-green-100 hover:bg-green-200 text-green-700 p-2 rounded-lg transition-colors"
                                        >
                                            <Plus className="w-5 h-5"/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Cart Section */}
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 h-fit sticky top-4">
                        <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5"/> Votre Panier
                        </h3>
                        
                        {cart.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-6">Votre panier est vide.</p>
                        ) : (
                            <div className="space-y-4">
                                {cart.map(item => (
                                    <div key={item.product.id} className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="font-medium text-gray-700">{item.product.name}</div>
                                            <div className="text-xs text-gray-400">x{item.quantity}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-gray-800">{(item.product.price * item.quantity).toLocaleString()}</span>
                                            <div className="flex items-center gap-1 bg-gray-100 rounded">
                                                <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 hover:bg-gray-200"><Minus className="w-3 h-3"/></button>
                                                <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 hover:bg-gray-200"><Plus className="w-3 h-3"/></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                
                                <div className="border-t border-gray-100 pt-4 mt-4">
                                    <div className="flex justify-between items-center text-lg font-bold text-gray-900 mb-4">
                                        <span>Total</span>
                                        <span>{cartTotal.toLocaleString()} FCFA</span>
                                    </div>
                                    <button 
                                        onClick={() => setIsCheckoutOpen(true)}
                                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-200"
                                    >
                                        Commander & Payer
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Checkout Modal */}
            {isCheckoutOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 animate-fade-in">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <PhoneIcon className="w-5 h-5 text-green-600"/> Paiement Mobile
                            </h3>
                            <button onClick={() => setIsCheckoutOpen(false)}><X className="w-5 h-5"/></button>
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded-xl mb-6 text-sm">
                            <p className="text-gray-500 mb-1">Montant à payer :</p>
                            <p className="text-2xl font-black text-gray-800">{cartTotal.toLocaleString()} FCFA</p>
                            <p className="text-xs text-gray-400 mt-2">Transaction sécurisée. Aucun cash accepté.</p>
                        </div>

                        <form onSubmit={handleCheckout} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Votre Nom</label>
                                <input required type="text" value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} className="w-full p-3 border rounded-lg"/>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Numéro Mobile Money</label>
                                <input required type="tel" placeholder="07 XX XX XX" value={customerInfo.phone} onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})} className="w-full p-3 border rounded-lg"/>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Opérateur</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['momo', 'airtel', 'orange'].map(prov => (
                                        <button 
                                            key={prov}
                                            type="button" 
                                            onClick={() => setCustomerInfo({...customerInfo, provider: prov as any})}
                                            className={`p-2 rounded-lg border text-sm font-bold capitalize transition-all ${customerInfo.provider === prov ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-gray-200 text-gray-500'}`}
                                        >
                                            {prov}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" className="w-full py-4 bg-green-600 text-white font-bold rounded-xl mt-4">
                                Confirmer Paiement
                            </button>
                        </form>
                    </div>
                </div>
            )}

             {/* Success Modal */}
             {orderSuccess && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-2xl p-8 text-center animate-fade-in">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-10 h-10 text-green-600"/>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">Commande Validée !</h3>
                        <p className="text-gray-500 mb-6">Le vendeur a reçu votre commande. Présentez-vous à l'étal avec votre téléphone pour récupérer vos articles.</p>
                        <button onClick={closeStorefront} className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl">
                            Retour au Marché
                        </button>
                    </div>
                </div>
            )}
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col animate-fade-in">
      {/* Hero Header */}
      <div className="bg-green-700 text-white p-6 pb-24 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 transform translate-x-10 -translate-y-10">
          <ShoppingBag className="w-64 h-64" />
        </div>
        
        <div className="max-w-7xl mx-auto w-full relative z-10">
          <button onClick={onBack} className="flex items-center gap-2 text-green-100 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-5 h-5" /> Retour à l'accueil
          </button>
          
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2">MarchéConnect Citoyen</h1>
          <p className="text-green-100 max-w-xl text-lg">
            Trouvez les meilleurs produits frais, tissus et services dans les marchés municipaux de Libreville. 
            Soutenez le commerce local certifié.
          </p>
        </div>
      </div>

      {/* Search & Filter Bar (Floating) */}
      <div className="max-w-7xl mx-auto w-full px-4 -mt-16 relative z-20 mb-8">
        <div className="bg-white rounded-xl shadow-xl p-4 md:p-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Search Input */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Que cherchez-vous ? (ex: Manioc, Tissu Wax...)" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all"
              />
            </div>

            {/* Market Filter */}
            <div className="relative">
              <MapPin className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
              <select 
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none appearance-none cursor-pointer"
              >
                <option value="all">Tous les Marchés</option>
                {markets.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="relative">
              <Filter className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none appearance-none cursor-pointer"
              >
                <option value="all">Toutes Catégories</option>
                <option value="vivres">Vivres Frais</option>
                <option value="textile">Textile & Mode</option>
                <option value="electronique">Électronique</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Grid */}
      <main className="max-w-7xl mx-auto w-full px-4 pb-12 flex-1">
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-xl font-bold text-gray-800">
            Résultats ({filteredStalls.length})
          </h2>
          <span className="text-sm text-gray-500">Classés par pertinence</span>
        </div>

        {filteredStalls.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-600">Aucun produit trouvé</h3>
            <p className="text-gray-400">Essayez de modifier vos critères de recherche.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStalls.map(stall => {
              const marketName = markets.find(m => m.id === stall.marketId)?.name || 'Marché Inconnu';
              const isPremium = stall.complianceScore > 90; // High hygiene score = Premium
              const productCount = products.filter(p => p.stallId === stall.id).length;

              return (
                <div key={stall.id} onClick={() => setSelectedStall(stall)} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden group cursor-pointer">
                  {/* Card Header Image Placeholder */}
                  <div className={`h-24 ${stall.productType === 'vivres' ? 'bg-green-100' : stall.productType === 'textile' ? 'bg-purple-100' : 'bg-blue-100'} relative`}>
                    <div className="absolute inset-0 flex items-center justify-center opacity-20">
                      {getCategoryIcon(stall.productType)}
                    </div>
                    {isPremium && (
                      <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                        <Sparkles className="w-3 h-3" /> Top Vendeur
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold text-gray-800 group-hover:text-green-700 transition-colors">
                        {stall.occupantName || 'Vendeur'}
                      </h3>
                      <div className="flex items-center gap-1 bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-100">
                         <Star className="w-3 h-3 text-yellow-500 fill-current" />
                         <span className="text-xs font-bold text-yellow-700">4.5</span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{marketName} • {stall.zone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        {getCategoryIcon(stall.productType)}
                        <span className="capitalize">{stall.productType}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <ShoppingBag className="w-4 h-4 text-gray-400"/>
                        <span>{productCount} Produits en ligne</span>
                      </div>
                    </div>

                    <button className="w-full py-2 bg-gray-50 hover:bg-green-600 hover:text-white border border-gray-200 hover:border-green-600 rounded-lg text-sm font-bold text-gray-600 transition-all flex items-center justify-center gap-2">
                       <ShoppingBag className="w-4 h-4" /> Visiter la Boutique
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 py-8 text-center text-gray-500 text-sm">
        <p>© 2025 Mairie de Libreville • MarchéConnect Citoyen</p>
      </footer>
    </div>
  );
};

export default PublicMarketplace;
