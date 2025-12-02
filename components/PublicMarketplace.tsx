
import React, { useState, useEffect } from 'react';
import { Search, MapPin, Star, ShoppingBag, ArrowLeft, Filter, Leaf, Shirt, Smartphone, Sparkles, X, Plus, Minus, ShoppingCart, CheckCircle, Smartphone as PhoneIcon, Clock, Download, Map as MapIcon, Navigation, MessageCircle, Info, ChevronDown } from 'lucide-react';
import { Stall, Market, Product, ClientOrder } from '../types';

interface PublicMarketplaceProps {
  stalls: Stall[];
  markets: Market[];
  products?: Product[];
  activeMarketId: string; // Context
  onMarketChange: (id: string) => void;
  onBack: () => void;
  onCreateOrder?: (order: Omit<ClientOrder, 'id' | 'date' | 'status'>) => void;
}

const PublicMarketplace: React.FC<PublicMarketplaceProps> = ({ stalls, markets, products = [], activeMarketId, onMarketChange, onBack, onCreateOrder }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'vivres' | 'textile' | 'electronique'>('all');
  
  // Storefront & Interaction State
  const [selectedStall, setSelectedStall] = useState<Stall | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null); // For detailed view
  const [cart, setCart] = useState<{product: Product; quantity: number}[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false); // Vendor Chat
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', provider: 'momo' as 'momo'|'orange'|'airtel' });
  const [orderSuccess, setOrderSuccess] = useState(false);
  
  // UX States
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const [isShopOpen, setIsShopOpen] = useState(true);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [chatMessage, setChatMessage] = useState('');

  // SAFETY FIX: Default market if list is empty to prevent crash
  const currentMarket = markets.find(m => m.id === activeMarketId) || markets[0] || { id: 'loading', name: 'Chargement...', location: '...', targetRevenue: 0 };

  useEffect(() => {
    const hour = new Date().getHours();
    setIsShopOpen(hour >= 8 && hour < 18);
  }, []);

  // Image Helper
  const getCategoryImage = (type: string, index: number) => {
    const bases = {
        vivres: ['https://images.unsplash.com/photo-1488459716781-31db52582fe9', 'https://images.unsplash.com/photo-1610832958506-aa56368176cf', 'https://images.unsplash.com/photo-1542838132-92c53300491e'],
        textile: ['https://images.unsplash.com/photo-1520006403909-838d6b92c22e', 'https://images.unsplash.com/photo-1596464522432-6a682f7c2299', 'https://images.unsplash.com/photo-1605763240004-7b93b172d7d6'],
        electronique: ['https://images.unsplash.com/photo-1550009158-9ebf69173e03', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9', 'https://images.unsplash.com/photo-1592899677712-a5a25450346d'],
        divers: ['https://images.unsplash.com/photo-1531297461136-82lw9b44d94l']
    };
    const cat = (type as keyof typeof bases) || 'divers';
    const arr = bases[cat];
    return `${arr[index % arr.length]}?auto=format&fit=crop&w=400&q=80`;
  };

  // Filter Logic: Strictly enforce current market context
  const filteredStalls = stalls.filter(stall => {
    const isOccupied = stall.status === 'occupied';
    const matchesSearch = 
      stall.occupantName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      stall.productType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stall.number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || stall.productType === categoryFilter;
    const matchesMarket = activeMarketId === 'all' || stall.marketId === activeMarketId;

    return isOccupied && matchesSearch && matchesCategory && matchesMarket;
  });

  const getCategoryIcon = (type: string) => {
    switch(type) {
      case 'vivres': return <Leaf className="w-4 h-4 text-white" />;
      case 'textile': return <Shirt className="w-4 h-4 text-white" />;
      case 'electronique': return <Smartphone className="w-4 h-4 text-white" />;
      default: return <ShoppingBag className="w-4 h-4 text-white" />;
    }
  };

  // Cart & Checkout Logic
  const addToCart = (product: Product, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!product.inStock) return;
    setAnimatingId(product.id);
    setTimeout(() => setAnimatingId(null), 1000);

    setCart(prev => {
        const existing = prev.find(item => item.product.id === product.id);
        if (existing) {
            if (existing.quantity >= 20) return prev;
            return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
        }
        return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
      setCart(prev => prev.map(item => {
          if (item.product.id === productId) {
              const newQty = Math.max(1, Math.min(20, item.quantity + delta));
              return { ...item, quantity: newQty };
          }
          return item;
      }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId: string) => {
      setCart(prev => prev.filter(item => item.product.id !== productId));
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
          paymentRef: `PAY-${Date.now()}`,
          deliveryMode: 'pickup'
      });

      setIsCheckoutOpen(false);
      setOrderSuccess(true);
  };

  const closeStorefront = () => {
      setSelectedStall(null);
      setCart([]);
      setOrderSuccess(false);
      setShowMobileCart(false);
      setIsChatOpen(false);
  };

  const handleDownloadReceipt = () => {
      alert("Téléchargement du reçu PDF en cours... (Simulation)");
  };

  const handleSendMessage = (e: React.FormEvent) => {
      e.preventDefault();
      if(!chatMessage.trim()) return;
      alert(`Message envoyé au vendeur : "${chatMessage}"`);
      setChatMessage('');
      setIsChatOpen(false);
  };

  // --- SUB-COMPONENTS ---

  // Sticky Market Context Bar
  const MarketContextBar = () => (
      <div className="bg-slate-900 text-white sticky top-0 z-50 shadow-md">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
              <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-green-500 rounded-lg">
                      <MapIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Vous êtes à</span>
                      <div className="relative group cursor-pointer flex items-center gap-1 font-bold text-sm">
                          {activeMarketId === 'all' ? 'Tous les Marchés' : currentMarket?.name}
                          <ChevronDown className="w-3 h-3 text-gray-400" />
                          
                          {/* Dropdown */}
                          <select 
                            value={activeMarketId}
                            onChange={(e) => onMarketChange(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          >
                             <option value="all">Vue Globale (Tous)</option>
                             {markets.map(m => (
                                 <option key={m.id} value={m.id}>{m.name}</option>
                             ))}
                          </select>
                      </div>
                  </div>
              </div>

              <div className="flex items-center gap-4">
                  <div className="hidden md:flex items-center gap-2 text-xs font-medium text-gray-300">
                      <Clock className="w-3 h-3" />
                      {isShopOpen ? 'Marché Ouvert (08h-18h)' : 'Marché Fermé'}
                  </div>
                  <button onClick={onBack} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors">
                      Quitter
                  </button>
              </div>
          </div>
      </div>
  );

  // --- STOREFRONT MODAL ---
  if (selectedStall) {
      const stallProducts = products.filter(p => p.stallId === selectedStall.id);
      
      return (
        <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col animate-fade-in overflow-hidden">
            
            {/* Store Header */}
            <div className={`shadow-md relative ${selectedStall.productType === 'vivres' ? 'bg-green-800' : 'bg-blue-800'} text-white shrink-0`}>
                <div className="absolute inset-0 bg-black/20"></div>
                <button onClick={closeStorefront} className="absolute top-4 right-4 z-20 bg-black/20 p-2 rounded-full hover:bg-black/40 transition-colors backdrop-blur-md">
                    <X className="w-5 h-5"/>
                </button>

                <div className="max-w-4xl mx-auto p-6 relative z-10 flex flex-col md:flex-row items-center gap-6">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-2xl font-bold text-gray-500 shadow-2xl border-4 border-white overflow-hidden">
                        {selectedStall.occupantName?.charAt(0)}
                    </div>
                    
                    <div className="text-center md:text-left flex-1">
                        <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                            <h2 className="text-2xl font-extrabold">{selectedStall.occupantName}</h2>
                            <div className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold flex items-center gap-1 ${isShopOpen ? 'bg-green-500' : 'bg-red-500'}`}>
                                <Clock className="w-3 h-3"/> {isShopOpen ? 'Ouvert' : 'Fermé'}
                            </div>
                        </div>

                        <p className="text-white/80 flex items-center justify-center md:justify-start gap-2 text-sm font-medium">
                            <MapPin className="w-4 h-4"/> {selectedStall.zone} • Étal #{selectedStall.number}
                        </p>
                        
                        <div className="mt-3 flex gap-2 justify-center md:justify-start">
                             <button 
                                onClick={() => setIsChatOpen(true)}
                                className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors"
                             >
                                 <MessageCircle className="w-4 h-4" /> Discuter avec le vendeur
                             </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Modal */}
            {isChatOpen && (
                <div className="absolute inset-0 z-50 flex items-end md:items-center justify-center pointer-events-none">
                    <div className="bg-white w-full md:max-w-sm h-[400px] shadow-2xl md:rounded-2xl border border-gray-200 pointer-events-auto flex flex-col overflow-hidden animate-slide-up">
                        <div className="bg-slate-800 text-white p-3 flex justify-between items-center">
                            <h4 className="font-bold flex items-center gap-2"><MessageCircle className="w-4 h-4"/> Chat Direct</h4>
                            <button onClick={() => setIsChatOpen(false)}><X className="w-4 h-4"/></button>
                        </div>
                        <div className="flex-1 bg-gray-50 p-4 overflow-y-auto">
                            <div className="bg-white p-3 rounded-lg rounded-tl-none shadow-sm text-sm text-gray-700 max-w-[85%] mb-2">
                                Bonjour ! Bienvenue sur mon étal digital. Comment puis-je vous aider ?
                            </div>
                        </div>
                        <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-100 flex gap-2">
                            <input 
                                type="text" 
                                value={chatMessage} 
                                onChange={(e) => setChatMessage(e.target.value)}
                                placeholder="Posez une question..." 
                                className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                            />
                            <button type="submit" className="bg-green-600 text-white p-2 rounded-full"><Navigation className="w-4 h-4 rotate-90"/></button>
                        </form>
                    </div>
                </div>
            )}

            {/* Product Detail Modal */}
            {selectedProduct && (
                <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedProduct(null)}>
                    <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedProduct(null)} className="absolute top-3 right-3 bg-white/50 p-1 rounded-full hover:bg-white"><X className="w-5 h-5 text-gray-800"/></button>
                        <div className="h-48 bg-gray-100">
                             <img src={selectedProduct.imageUrl || getCategoryImage(selectedProduct.category, 0)} alt="" className="w-full h-full object-cover"/>
                        </div>
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900">{selectedProduct.name}</h3>
                                    <p className="text-sm text-gray-500 uppercase font-bold">{selectedProduct.category}</p>
                                </div>
                                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-lg font-black text-lg">
                                    {selectedProduct.price} <span className="text-xs font-normal">FCFA</span>
                                </span>
                            </div>

                            <div className="space-y-4 mt-4">
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Origine</p>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-orange-500"/>
                                        <span className="font-medium text-gray-800">{selectedProduct.origin || "Origine locale (Gabon)"}</span>
                                    </div>
                                </div>
                                
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Description</p>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        {selectedProduct.description || "Produit frais de qualité, sélectionné ce matin au marché."}
                                    </p>
                                </div>
                            </div>

                            <button 
                                onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}
                                disabled={!selectedProduct.inStock}
                                className="w-full mt-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                            >
                                <Plus className="w-5 h-5"/> Ajouter au Panier
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50 pb-20 lg:pb-0">
                <div className="max-w-5xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Products Grid */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-gray-800 text-xl flex items-center gap-2">
                                <ShoppingBag className="w-6 h-6 text-green-600"/> Rayons
                            </h3>
                            <div className="flex gap-2">
                                {/* Simulated Category Pills */}
                                {['Tout', 'Frais', 'Sec', 'Import'].map(cat => (
                                    <button key={cat} className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-medium hover:bg-gray-50">{cat}</button>
                                ))}
                            </div>
                        </div>
                        
                        {stallProducts.length === 0 ? (
                            <div className="p-12 border-2 border-dashed border-gray-300 rounded-xl text-center">
                                <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3"/>
                                <p className="text-gray-500 font-medium">Ce vendeur prépare sa vitrine.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                {stallProducts.map((prod, idx) => (
                                    <div 
                                        key={prod.id} 
                                        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-shadow cursor-pointer"
                                        onClick={() => setSelectedProduct(prod)}
                                    >
                                        <div className="h-32 bg-gray-100 relative overflow-hidden">
                                            <img 
                                                src={prod.imageUrl || getCategoryImage(prod.category, idx)} 
                                                alt={prod.name}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            />
                                            {!prod.inStock && (
                                                <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-sm">
                                                    <span className="bg-gray-800 text-white text-xs font-bold px-3 py-1 rounded-full">Rupture</span>
                                                </div>
                                            )}
                                            <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-xs font-bold text-gray-800 shadow-sm flex items-center gap-1">
                                                <Info className="w-3 h-3 text-blue-500"/> Détails
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <p className="font-bold text-gray-800 truncate">{prod.name}</p>
                                            <p className="text-xs text-gray-500 mb-2">{prod.origin || 'Gabon'}</p>
                                            
                                            <div className="flex items-center justify-between">
                                                <span className="font-extrabold text-green-700 text-sm">{prod.price.toLocaleString()} F</span>
                                                
                                                <button 
                                                    onClick={(e) => addToCart(prod, e)}
                                                    disabled={!prod.inStock}
                                                    className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs font-bold
                                                        ${animatingId === prod.id 
                                                            ? 'bg-green-600 text-white scale-105 shadow-lg' 
                                                            : 'bg-gray-100 text-gray-700 hover:bg-green-100 hover:text-green-700'}
                                                    `}
                                                >
                                                    {animatingId === prod.id ? <CheckCircle className="w-4 h-4"/> : <Plus className="w-4 h-4"/>}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Desktop Cart Sidebar */}
                    <div className="hidden lg:block h-fit sticky top-4">
                         <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                            <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                <ShoppingCart className="w-5 h-5 text-green-600"/> Votre Panier
                            </h3>
                            
                            {cart.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <ShoppingBag className="w-8 h-8 text-gray-300"/>
                                    </div>
                                    <p className="text-gray-400 text-sm">Votre panier est vide.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1">
                                        {cart.map(item => (
                                            <div key={item.product.id} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <img src={item.product.imageUrl || getCategoryImage(item.product.category, 0)} className="w-8 h-8 rounded object-cover" alt="" />
                                                    <div>
                                                        <div className="font-bold text-gray-700 truncate w-20">{item.product.name}</div>
                                                        <div className="text-xs text-gray-400">{item.product.price} x {item.quantity}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 bg-white rounded border border-gray-200 shadow-sm">
                                                    <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 hover:bg-gray-100 text-gray-500"><Minus className="w-3 h-3"/></button>
                                                    <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 hover:bg-gray-100 text-gray-500"><Plus className="w-3 h-3"/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="border-t border-gray-100 pt-4">
                                        <div className="flex justify-between items-center text-xl font-black text-gray-800 mb-4">
                                            <span>Total</span>
                                            <span>{cartTotal.toLocaleString()} <span className="text-sm font-normal text-gray-500">FCFA</span></span>
                                        </div>
                                        <button 
                                            onClick={() => setIsCheckoutOpen(true)}
                                            disabled={!isShopOpen}
                                            className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold rounded-xl shadow-lg shadow-green-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            {isShopOpen ? 'Commander (Mobile Money)' : 'Boutique Fermée'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Cart Bar */}
            {cart.length > 0 && (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white shadow-[0_-5px_15px_rgba(0,0,0,0.1)] p-4 z-40 animate-slide-up border-t border-gray-200">
                    <div className="flex justify-between items-center max-w-md mx-auto">
                        <div onClick={() => setShowMobileCart(!showMobileCart)} className="flex items-center gap-3 cursor-pointer">
                            <div className="relative">
                                <div className="p-3 bg-green-100 text-green-700 rounded-xl">
                                    <ShoppingCart className="w-6 h-6"/>
                                </div>
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white font-bold">
                                    {cart.reduce((acc, i) => acc + i.quantity, 0)}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase">Total Panier</p>
                                <p className="text-lg font-black text-gray-900">{cartTotal.toLocaleString()} FCFA</p>
                            </div>
                        </div>
                        <button 
                             onClick={() => setIsCheckoutOpen(true)}
                             disabled={!isShopOpen}
                             className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg disabled:bg-gray-300"
                        >
                            Payer
                        </button>
                    </div>
                </div>
            )}
             {/* Checkout & Success Modals (Same as before) */}
             {isCheckoutOpen && (
                <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 animate-fade-in relative">
                        <button onClick={() => setIsCheckoutOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                        
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-green-100 rounded-full text-green-600">
                                <PhoneIcon className="w-6 h-6"/>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">Paiement Sécurisé</h3>
                                <p className="text-xs text-gray-500">Via Mobile Money (Airtel/MoMo)</p>
                            </div>
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded-xl mb-6 text-sm border border-gray-100 flex justify-between items-center">
                            <span className="text-gray-500 font-medium">Total à payer :</span>
                            <span className="text-2xl font-black text-gray-800">{cartTotal.toLocaleString()} FCFA</span>
                        </div>

                        <form onSubmit={handleCheckout} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Votre Nom Complet</label>
                                <input required type="text" placeholder="Ex: Jean Ntoutoume" value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500"/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Numéro Mobile</label>
                                <input required type="tel" placeholder="07 XX XX XX" value={customerInfo.phone} onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500"/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Opérateur</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['momo', 'airtel', 'orange'].map(prov => (
                                        <button 
                                            key={prov}
                                            type="button" 
                                            onClick={() => setCustomerInfo({...customerInfo, provider: prov as any})}
                                            className={`p-3 rounded-lg border text-sm font-bold capitalize transition-all flex flex-col items-center gap-1 ${customerInfo.provider === prov ? 'bg-green-50 border-green-500 text-green-700 shadow-sm' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'}`}
                                        >
                                            <Smartphone className="w-4 h-4"/>
                                            {prov}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" className="w-full py-4 bg-green-600 text-white font-bold rounded-xl mt-4 shadow-lg shadow-green-200 hover:bg-green-700 transition-transform active:scale-95">
                                Confirmer & Payer
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {orderSuccess && selectedStall && (
                <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-2xl p-0 overflow-hidden animate-fade-in relative">
                        <div className="bg-green-600 p-6 text-center text-white">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
                                <CheckCircle className="w-8 h-8 text-white"/>
                            </div>
                            <h3 className="text-xl font-bold">Commande Validée !</h3>
                            <p className="text-green-100 text-sm">Merci pour votre soutien local.</p>
                        </div>
                        
                        <div className="p-6">
                            <div className="bg-gray-50 border border-dashed border-gray-300 p-4 rounded-lg mb-4 text-center">
                                <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Reçu de Commande</p>
                                <p className="font-mono font-bold text-gray-800 text-lg mb-1">REF: {Date.now().toString().slice(-6)}</p>
                                <p className="text-2xl font-black text-gray-900">{cartTotal.toLocaleString()} FCFA</p>
                                <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500 flex justify-between">
                                    <span>{new Date().toLocaleDateString()}</span>
                                    <span>{selectedStall.occupantName}</span>
                                </div>
                            </div>
                            <button onClick={closeStorefront} className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl shadow-lg">
                                Retour au Marché
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
      );
  }

  // --- MAIN LAYOUT ---
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col animate-fade-in relative">
      <MarketContextBar />

      {/* Hero */}
      <div className="bg-gradient-to-br from-green-800 to-green-900 text-white p-6 pb-24 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="max-w-7xl mx-auto w-full relative z-10">
          <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tight mt-4">MarchéConnect Citoyen</h1>
          <p className="text-green-100 max-w-xl text-lg font-medium leading-relaxed">
            Découvrez les produits frais de <span className="text-yellow-300 border-b-2 border-yellow-300">{currentMarket.name}</span>.
          </p>
        </div>
      </div>

      {/* Floating Search Bar */}
      <div className="max-w-7xl mx-auto w-full px-4 -mt-10 relative z-20 mb-12">
        <div className="bg-white rounded-2xl shadow-xl p-2 md:p-3 border border-gray-100 flex flex-col md:flex-row gap-2">
            <div className="flex-1 relative">
                <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Rechercher (ex: Manioc, Tissu, Électronique...)" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-transparent rounded-xl focus:bg-gray-50 outline-none transition-colors text-gray-800 placeholder-gray-400 font-medium"
                />
            </div>
            <div className="h-px md:h-auto md:w-px bg-gray-200 mx-2"></div>
            <div className="flex gap-2">
                <div className="relative flex-1 md:w-48">
                    <Filter className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
                    <select 
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value as any)}
                        className="w-full pl-10 pr-8 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl outline-none appearance-none cursor-pointer text-sm font-bold text-gray-700 transition-colors border-r-8 border-transparent"
                    >
                        <option value="all">Toutes Catégories</option>
                        <option value="vivres">Vivres</option>
                        <option value="textile">Textile</option>
                        <option value="electronique">Tech</option>
                    </select>
                </div>
            </div>
        </div>
      </div>

      {/* Results Grid */}
      <main className="max-w-7xl mx-auto w-full px-4 pb-16 flex-1">
        <div className="flex justify-between items-end mb-8">
          <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                Vendeurs à {currentMarket.name}
                <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{filteredStalls.length}</span>
              </h2>
          </div>
        </div>

        {filteredStalls.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Aucun vendeur trouvé</h3>
            <p className="text-gray-400 max-w-xs mx-auto">Essayez d'autres mots-clés ou changez de marché dans la barre du haut.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredStalls.map((stall, idx) => {
              const productCount = products.filter(p => p.stallId === stall.id).length;
              const imgIndex = stall.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
              const coverImage = getCategoryImage(stall.productType, imgIndex);

              return (
                <div key={stall.id} onClick={() => setSelectedStall(stall)} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden group cursor-pointer flex flex-col h-full">
                  <div className="h-40 relative overflow-hidden bg-gray-200">
                    <img src={coverImage} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                    <div className="absolute bottom-3 left-3 flex items-center gap-2">
                         <div className={`p-1.5 rounded-lg ${stall.productType === 'vivres' ? 'bg-green-500' : stall.productType === 'textile' ? 'bg-purple-500' : 'bg-blue-500'}`}>
                             {getCategoryIcon(stall.productType)}
                         </div>
                         <span className="text-white font-bold text-sm capitalize shadow-black drop-shadow-md">{stall.productType}</span>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-lg font-bold text-gray-800 group-hover:text-green-700 transition-colors line-clamp-1">
                        {stall.occupantName || 'Vendeur'}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-500 mb-4 flex items-center gap-1">
                        <MapPin className="w-3 h-3"/> {stall.zone}
                    </p>
                    <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs font-bold text-gray-500">
                             <ShoppingBag className="w-3 h-3"/> {productCount} Produits
                        </div>
                        <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">
                             <Star className="w-3 h-3 text-yellow-400 fill-current" />
                             <span className="text-xs font-bold text-yellow-700">4.5</span>
                        </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default PublicMarketplace;
