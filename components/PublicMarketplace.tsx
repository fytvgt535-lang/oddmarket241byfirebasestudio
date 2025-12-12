
import React, { useState, useEffect } from 'react';
import { Search, MapPin, ShoppingBag, Filter, Shirt, Smartphone, X, Plus, Minus, ShoppingCart, CheckCircle, Clock, Map as MapIcon, Navigation, MessageCircle, ChevronDown, Leaf, Zap, Timer, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { Stall, Market, Product, ClientOrder } from '../types';
import { Button } from './ui/Button';
import { Input, Select } from './ui/Input';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { formatCurrency } from '../utils/coreUtils';
import { PRODUCT_CATEGORIES, PAYMENT_PROVIDERS } from '../constants/appConstants';
import { getProductImage } from '../utils/themeUtils';

interface PublicMarketplaceProps {
  stalls: Stall[];
  markets: Market[];
  products?: Product[];
  activeMarketId: string;
  onMarketChange: (id: string) => void;
  onBack: () => void;
  onCreateOrder?: (order: Omit<ClientOrder, 'id' | 'date' | 'status'>) => void;
  // NEW PROPS FOR BRIDGE
  initialCart?: {product: Product; quantity: number}[];
  onCartUpdate?: (cart: {product: Product; quantity: number}[]) => void;
  autoOpenCheckout?: boolean;
  onCheckoutClosed?: () => void;
}

type CartItem = { product: Product; quantity: number };

const PublicMarketplace: React.FC<PublicMarketplaceProps> = ({ 
    stalls, markets, products = [], activeMarketId, onMarketChange, onBack, onCreateOrder,
    initialCart = [], onCartUpdate, autoOpenCheckout = false, onCheckoutClosed
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');
  
  const [selectedStall, setSelectedStall] = useState<Stall | null>(null);
  const [cart, setCart] = useState<CartItem[]>(initialCart);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(autoOpenCheckout);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', provider: 'momo' as 'momo'|'orange'|'airtel' });
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Sync with external updates
  useEffect(() => {
      setCart(initialCart);
  }, [initialCart]);

  // Handle auto-open
  useEffect(() => {
      if (autoOpenCheckout) setIsCheckoutOpen(true);
  }, [autoOpenCheckout]);

  const currentMarket = markets.find(m => m.id === activeMarketId) || { id: 'all', name: 'Tous les Marchés', image: null } as unknown as Market;

  const filteredStalls = stalls.filter(s => {
    const isOccupied = s.status === 'occupied';
    const matchesMarket = activeMarketId === 'all' || s.marketId === activeMarketId;
    const matchesSearch = s.occupantName?.toLowerCase().includes(searchTerm.toLowerCase()) || s.productType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || s.productType === categoryFilter;
    return isOccupied && matchesMarket && matchesSearch && matchesCategory;
  });

  // IDENTIFIER LES PRODUITS FLASH (ANTI-GASPI)
  const flashProducts = products.filter(p => {
      if (!p.tags) return false;
      const flashTag = p.tags.find(t => t.startsWith('FLASH_END:'));
      if (!flashTag) return false;
      const endTime = parseInt(flashTag.split(':')[1]);
      return endTime > Date.now();
  });

  const updateCart = (newCart: CartItem[]) => {
      setCart(newCart);
      if (onCartUpdate) onCartUpdate(newCart);
  };

  const addToCart = (product: Product) => {
    const newCart = [...cart];
    const exist = newCart.find(i => i.product.id === product.id);
    if (exist) {
        exist.quantity += 1;
    } else {
        newCart.push({ product, quantity: 1 });
    }
    updateCart(newCart);
    toast.success("Ajouté au panier !");
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  const handleCheckout = (e: React.FormEvent) => {
      e.preventDefault();
      if (!onCreateOrder) return;

      // Group by Stall
      const itemsByStall = (cart as CartItem[]).reduce((acc, item) => {
          const sid = item.product.stallId;
          if (!acc[sid]) acc[sid] = [];
          acc[sid].push(item);
          return acc;
      }, {} as Record<string, CartItem[]>);

      Object.entries(itemsByStall).forEach(([stallId, items]) => {
          const typedItems = items as CartItem[];
          const total = typedItems.reduce((sum, i) => sum + (i.product.price * i.quantity), 0);
          onCreateOrder({
              stallId: stallId,
              customerName: customerInfo.name,
              customerPhone: customerInfo.phone,
              items: typedItems.map(i => ({ productId: i.product.id, name: i.product.name, quantity: i.quantity, price: i.product.price })),
              totalAmount: total,
              paymentProvider: customerInfo.provider,
              paymentRef: `PAY-${Date.now()}`,
              deliveryMode: 'pickup'
          });
      });

      setIsCheckoutOpen(false);
      if(onCheckoutClosed) onCheckoutClosed();
      setOrderSuccess(true);
      updateCart([]); // Clear cart
  };

  const formatCountdown = (endTime: number) => {
      const diff = Math.max(0, endTime - Date.now());
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}min`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col animate-fade-in relative">
      {/* Context Bar */}
      <div className="bg-slate-900 text-white sticky top-0 z-50 shadow-md">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
              <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-green-500 rounded-lg"><MapIcon className="w-4 h-4 text-white" /></div>
                  <div className="flex flex-col relative group">
                      <span className="text-[10px] text-gray-400 uppercase font-bold">Lieu</span>
                      <div className="flex items-center gap-1 font-bold text-sm cursor-pointer">
                          {currentMarket.name} <ChevronDown className="w-3 h-3 text-gray-400" />
                          <select className="absolute inset-0 opacity-0 cursor-pointer" value={activeMarketId} onChange={(e) => onMarketChange(e.target.value)}>
                             <option value="all">Vue Globale</option>
                             {markets.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                      </div>
                  </div>
              </div>
              <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={() => setIsCheckoutOpen(true)}>
                      <ShoppingCart className="w-4 h-4"/>
                      {cart.length > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 rounded-full">{cart.length}</span>}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={onBack}>Quitter</Button>
              </div>
          </div>
      </div>

      {/* MARKET BANNER */}
      {activeMarketId !== 'all' && (
          <div className="h-48 relative overflow-hidden bg-slate-800 flex items-center justify-center">
              {currentMarket.image ? (
                  <img src={currentMarket.image} className="w-full h-full object-cover opacity-70 animate-fade-in" alt={currentMarket.name} />
              ) : (
                  <div className="flex flex-col items-center justify-center text-gray-500">
                      <ImageIcon className="w-16 h-16 mb-2 opacity-20"/>
                  </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent pointer-events-none"></div>
              <div className="absolute bottom-4 left-4 right-4 text-white pointer-events-none">
                  <h1 className="text-3xl font-black mb-1 leading-tight text-shadow">{currentMarket.name}</h1>
                  <div className="flex items-center gap-2 text-sm font-medium">
                      <span className="bg-green-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Ouvert</span>
                      <span className="flex items-center gap-1 opacity-90"><MapPin className="w-3 h-3"/> {currentMarket.neighborhood || currentMarket.city}</span>
                  </div>
              </div>
          </div>
      )}

      <div className="max-w-7xl mx-auto w-full px-4 pt-6 space-y-6 pb-20">
          
          {/* SEARCH BAR */}
          <Card className="p-3 flex flex-col md:flex-row gap-3 shadow-md sticky top-16 z-40">
              <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400"/>
                  <input placeholder="Rechercher vendeur, produit..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white outline-none"/>
              </div>
              <div className="md:w-48">
                  <Select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                      <option value="all">Toutes Catégories</option>
                      {PRODUCT_CATEGORIES.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                  </Select>
              </div>
          </Card>

          {/* FLASH SALES SECTION (ANTI-GASPI) */}
          {flashProducts.length > 0 && (
              <div className="animate-slide-up">
                  <div className="flex items-center gap-2 mb-3 px-1">
                      <div className="bg-red-600 p-1.5 rounded-lg text-white animate-pulse shadow-lg shadow-red-200"><Zap className="w-5 h-5 fill-current"/></div>
                      <h2 className="text-xl font-black text-gray-900 tracking-tight">Urgence Anti-Gaspi</h2>
                      <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full border border-red-200">-50% OFF</span>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-6 snap-x no-scrollbar px-1">
                      {flashProducts.map(p => {
                          const endTime = parseInt(p.tags?.find(t => t.startsWith('FLASH_END:'))?.split(':')[1] || '0');
                          return (
                              <div key={p.id} className="snap-center shrink-0 w-64 bg-white rounded-2xl shadow-xl border-2 border-red-100 overflow-hidden relative group transform hover:-translate-y-1 transition-all duration-300">
                                  {/* Header pulsant */}
                                  <div className="absolute top-0 left-0 right-0 bg-red-600 text-white text-[10px] font-bold text-center py-1 z-20 animate-pulse">
                                      VENTE FLASH • SAUVEZ CE PANIER
                                  </div>
                                  <div className="h-32 bg-gray-200 relative mt-5 flex items-center justify-center">
                                      {p.imageUrl ? (
                                          <img src={p.imageUrl} className="w-full h-full object-cover" alt={p.name}/>
                                      ) : (
                                          <ImageIcon className="w-8 h-8 text-gray-400 opacity-50"/>
                                      )}
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>
                                      <div className="absolute bottom-2 left-2 text-white w-full pr-4 pointer-events-none">
                                          <div className="flex items-center gap-1 text-xs font-bold bg-white/20 px-2 py-1 rounded backdrop-blur-md w-fit mb-1 border border-white/30">
                                              <Timer className="w-3 h-3 text-yellow-400"/>
                                              {formatCountdown(endTime)}
                                          </div>
                                      </div>
                                  </div>
                                  <div className="p-3">
                                      <h3 className="font-bold text-gray-900 truncate text-lg">{p.name}</h3>
                                      <p className="text-xs text-gray-500 mb-3">Quantité limitée !</p>
                                      <div className="flex justify-between items-center mt-2 bg-red-50 p-2 rounded-xl">
                                          <div>
                                              <span className="text-xs text-gray-400 line-through block">{formatCurrency(p.price)}</span>
                                              <span className="text-xl font-black text-red-600 leading-none">{formatCurrency(p.promoPrice || p.price)}</span>
                                          </div>
                                          <button 
                                              onClick={() => addToCart(p)}
                                              className="bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-xl shadow-lg shadow-red-200 transition-transform active:scale-95"
                                          >
                                              <Plus className="w-5 h-5"/>
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          )}

          {/* MAIN GRID */}
          <div className="space-y-3">
              <h2 className="text-lg font-bold text-gray-800 px-1">Les Commerçants</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredStalls.map((stall, idx) => (
                      <Card key={stall.id} onClick={() => setSelectedStall(stall)} className="hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden cursor-pointer group border-gray-100">
                          <div className="h-40 bg-gray-200 relative flex items-center justify-center">
                              {/* Using generic fallback logic here since stall images aren't stored on stall object directly in this model, usually product images represent them. Just showing placeholder if no logic */}
                              <div className="flex flex-col items-center text-gray-400">
                                  <ImageIcon className="w-10 h-10 opacity-50 mb-1"/>
                                  <span className="text-[10px] font-bold">Voir Produits</span>
                              </div>
                              <div className="absolute inset-0 bg-black/10"></div>
                              <div className="absolute bottom-3 left-3"><Badge className="bg-white/20 text-white backdrop-blur-md border-transparent">{stall.productType}</Badge></div>
                              {/* Market Badge for Global View */}
                              {activeMarketId === 'all' && (
                                  <div className="absolute top-3 right-3"><Badge className="bg-black/50 text-white border-transparent text-[10px]"><MapPin className="w-3 h-3 mr-1"/> {markets.find(m => m.id === stall.marketId)?.name}</Badge></div>
                              )}
                          </div>
                          <div className="p-4">
                              <h3 className="text-lg font-bold text-gray-800">{stall.occupantName}</h3>
                              <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3"/> {stall.zone}</p>
                          </div>
                      </Card>
                  ))}
              </div>
          </div>
      </div>

      {/* Storefront Modal */}
      {selectedStall && (
        <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col animate-fade-in">
            <div className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-20">
                <div><h2 className="text-xl font-black text-gray-900">{selectedStall.occupantName}</h2><p className="text-xs text-gray-500">{selectedStall.zone}</p></div>
                <button onClick={() => setSelectedStall(null)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X className="w-5 h-5"/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-4">
                {products.filter(p => p.stallId === selectedStall.id).map(p => (
                    <Card key={p.id} className="p-3 flex flex-col h-full">
                        <div className="h-28 bg-gray-100 rounded-lg mb-2 overflow-hidden relative flex items-center justify-center">
                            {p.imageUrl ? (
                                <img src={p.imageUrl} className="w-full h-full object-cover" alt={p.name}/>
                            ) : (
                                <ImageIcon className="w-8 h-8 text-gray-300"/>
                            )}
                            {p.isPromo && <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded">PROMO</div>}
                        </div>
                        <p className="font-bold text-sm truncate text-gray-900 mb-1">{p.name}</p>
                        <div className="mt-auto flex justify-between items-center">
                            <div>
                                {p.isPromo ? (
                                    <>
                                        <span className="text-xs text-gray-400 line-through block">{formatCurrency(p.price)}</span>
                                        <span className="text-green-700 font-black">{formatCurrency(p.promoPrice || p.price)}</span>
                                    </>
                                ) : (
                                    <span className="text-green-700 font-black">{formatCurrency(p.price)}</span>
                                )}
                            </div>
                            <Button size="sm" onClick={(e) => { e.stopPropagation(); addToCart(p); }}><Plus className="w-3 h-3"/></Button>
                        </div>
                    </Card>
                ))}
            </div>
            {cart.length > 0 && <div className="p-4 bg-white border-t"><Button onClick={() => setIsCheckoutOpen(true)} className="w-full bg-green-600">Panier ({formatCurrency(cartTotal)})</Button></div>}
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
          <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
              <Card className="w-full max-w-md p-6 relative animate-fade-in">
                  <h3 className="text-xl font-bold mb-4 text-gray-900">Paiement</h3>
                  <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100 max-h-48 overflow-y-auto">
                      {cart.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                              <div className="flex-1">
                                  <p className="text-xs font-bold text-gray-800">{item.product.name}</p>
                                  <p className="text-[10px] text-gray-500">{item.quantity} x {formatCurrency(item.product.isPromo ? (item.product.promoPrice || item.product.price) : item.product.price)}</p>
                              </div>
                              <span className="font-bold text-sm">{formatCurrency((item.product.isPromo ? (item.product.promoPrice || item.product.price) : item.product.price) * item.quantity)}</span>
                          </div>
                      ))}
                  </div>
                  <div className="flex justify-between items-center mb-6 pt-2 border-t border-gray-200">
                      <span className="text-gray-500 font-bold">Total à payer</span>
                      <span className="text-2xl font-black text-green-600">{formatCurrency(cartTotal)}</span>
                  </div>
                  <form onSubmit={handleCheckout} className="space-y-4">
                      <Input label="Nom" required value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})}/>
                      <Input label="Téléphone" required value={customerInfo.phone} onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})}/>
                      <Select label="Moyen de paiement" value={customerInfo.provider} onChange={e => setCustomerInfo({...customerInfo, provider: e.target.value as any})}>
                          {PAYMENT_PROVIDERS.filter(p => p.id !== 'cash' && p.id !== 'system').map(p => (
                              <option key={p.id} value={p.id}>{p.label}</option>
                          ))}
                      </Select>
                      <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 shadow-lg">Confirmer Paiement</Button>
                  </form>
                  <button onClick={() => { setIsCheckoutOpen(false); if(onCheckoutClosed) onCheckoutClosed(); }} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"><X className="w-5 h-5"/></button>
              </Card>
          </div>
      )}
      
      {orderSuccess && (
          <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4">
              <Card className="p-8 text-center animate-fade-in">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4 animate-bounce"/>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Commande Validée !</h3>
                  <p className="text-gray-500 mb-6">Le commerçant a été notifié. Vous recevrez un SMS de confirmation.</p>
                  <Button onClick={() => { setOrderSuccess(false); setSelectedStall(null); updateCart([]); }} className="w-full">Retour au marché</Button>
              </Card>
          </div>
      )}
    </div>
  );
};

export default PublicMarketplace;
