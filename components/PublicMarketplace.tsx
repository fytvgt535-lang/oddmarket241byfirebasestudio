
import React, { useState, useEffect } from 'react';
import { Search, MapPin, ShoppingBag, Filter, Shirt, Smartphone, X, Plus, Minus, ShoppingCart, CheckCircle, Clock, Map as MapIcon, Navigation, MessageCircle, ChevronDown, Leaf } from 'lucide-react';
import { Stall, Market, Product, ClientOrder } from '../types';
import { Button } from './ui/Button';
import { Input, Select } from './ui/Input';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { formatCurrency } from '../utils/coreUtils';

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
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'vivres' | 'textile' | 'electronique'>('all');
  
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

  const currentMarket = markets.find(m => m.id === activeMarketId) || { id: 'all', name: 'Tous les Marchés' } as Market;

  const getCategoryImage = (type: string, index: number) => {
    const bases = { vivres: ['https://images.unsplash.com/photo-1488459716781-31db52582fe9'], textile: ['https://images.unsplash.com/photo-1520006403909-838d6b92c22e'], electronique: ['https://images.unsplash.com/photo-1550009158-9ebf69173e03'], divers: ['https://images.unsplash.com/photo-1531297461136-82lw9b44d94l'] };
    const arr = bases[type as keyof typeof bases] || bases.divers;
    return `${arr[index % arr.length]}?auto=format&fit=crop&w=400&q=80`;
  };

  const filteredStalls = stalls.filter(s => {
    const isOccupied = s.status === 'occupied';
    const matchesMarket = activeMarketId === 'all' || s.marketId === activeMarketId;
    const matchesSearch = s.occupantName?.toLowerCase().includes(searchTerm.toLowerCase()) || s.productType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || s.productType === categoryFilter;
    return isOccupied && matchesMarket && matchesSearch && matchesCategory;
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
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={onBack}>Quitter</Button>
          </div>
      </div>

      {/* Hero & Filters */}
      <div className="bg-green-800 text-white p-6 pb-16 shadow-xl relative"><h1 className="text-3xl font-black mb-2">MarchéConnect</h1><p className="text-green-100">Produits frais et locaux.</p></div>
      <div className="max-w-7xl mx-auto w-full px-4 -mt-8 relative z-20 mb-8">
        <Card className="p-3 flex flex-col md:flex-row gap-3 shadow-xl">
            <div className="flex-1"><Input leftIcon={Search} placeholder="Rechercher vendeur, produit..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="border-gray-100 bg-gray-50 focus:bg-white"/></div>
            <div className="md:w-48"><Select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as any)}><option value="all">Tout</option><option value="vivres">Vivres</option><option value="textile">Textile</option></Select></div>
        </Card>
      </div>

      {/* Grid */}
      <main className="max-w-7xl mx-auto w-full px-4 pb-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredStalls.map((stall, idx) => (
            <Card key={stall.id} onClick={() => setSelectedStall(stall)} className="hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden cursor-pointer group border-gray-100">
                <div className="h-40 bg-gray-200 relative">
                    <img src={getCategoryImage(stall.productType, idx)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"/>
                    <div className="absolute inset-0 bg-black/40"></div>
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
      </main>

      {/* Storefront Modal */}
      {selectedStall && (
        <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col animate-fade-in">
            <div className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-20">
                <div><h2 className="text-xl font-black text-gray-900">{selectedStall.occupantName}</h2><p className="text-xs text-gray-500">{selectedStall.zone}</p></div>
                <button onClick={() => setSelectedStall(null)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X className="w-5 h-5"/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-4">
                {products.filter(p => p.stallId === selectedStall.id).map(p => (
                    <Card key={p.id} className="p-3">
                        <div className="h-24 bg-gray-100 rounded-lg mb-2 overflow-hidden"><img src={p.imageUrl || getCategoryImage(p.category, 0)} className="w-full h-full object-cover"/></div>
                        <p className="font-bold text-sm truncate text-gray-900">{p.name}</p>
                        <div className="flex justify-between items-center mt-1"><span className="text-green-700 font-black">{formatCurrency(p.price)}</span><Button size="sm" onClick={(e) => { e.stopPropagation(); addToCart(p); }}><Plus className="w-3 h-3"/></Button></div>
                    </Card>
                ))}
            </div>
            {cart.length > 0 && <div className="p-4 bg-white border-t"><Button onClick={() => setIsCheckoutOpen(true)} className="w-full bg-green-600">Panier ({formatCurrency(cartTotal)})</Button></div>}
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
          <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
              <Card className="w-full max-w-md p-6 relative">
                  <h3 className="text-xl font-bold mb-4 text-gray-900">Paiement</h3>
                  <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100 max-h-32 overflow-y-auto">
                      {cart.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-gray-600 mb-1">
                              <span>{item.quantity}x {item.product.name}</span>
                              <span className="font-bold">{formatCurrency(item.product.price * item.quantity)}</span>
                          </div>
                      ))}
                  </div>
                  <form onSubmit={handleCheckout} className="space-y-4">
                      <Input label="Nom" required value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})}/>
                      <Input label="Téléphone" required value={customerInfo.phone} onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})}/>
                      <Button type="submit" className="w-full">Payer {formatCurrency(cartTotal)}</Button>
                  </form>
                  <button onClick={() => { setIsCheckoutOpen(false); if(onCheckoutClosed) onCheckoutClosed(); }} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"><X className="w-5 h-5"/></button>
              </Card>
          </div>
      )}
      
      {orderSuccess && (
          <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4">
              <Card className="p-8 text-center">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4"/>
                  <h3 className="text-2xl font-bold text-gray-900">Commande Validée !</h3>
                  <Button onClick={() => { setOrderSuccess(false); setSelectedStall(null); updateCart([]); }} className="mt-6 w-full">Retour</Button>
              </Card>
          </div>
      )}
    </div>
  );
};

export default PublicMarketplace;
