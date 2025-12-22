
import React, { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, X, Plus, ShoppingCart, CheckCircle, Map as MapIcon, ChevronDown, Zap, Timer, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { Stall, Market, Product, ClientOrder } from '../types';
import { Button } from './ui/Button';
import { Select } from './ui/Input';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { formatCurrency } from '../utils/coreUtils';
import { PRODUCT_CATEGORIES } from '../constants/appConstants';

interface PublicMarketplaceProps {
  stalls: Stall[];
  markets: Market[];
  products?: Product[];
  activeMarketId: string;
  onMarketChange: (id: string) => void;
  onBack: () => void;
  onCreateOrder?: (order: Omit<ClientOrder, 'id' | 'date' | 'status'>) => void;
  initialCart?: {product: Product; quantity: number}[];
  onCartUpdate?: (cart: {product: Product; quantity: number}[]) => void;
  autoOpenCheckout?: boolean;
  onCheckoutClosed?: () => void;
}

const PublicMarketplace: React.FC<PublicMarketplaceProps> = ({ 
    stalls, markets, products = [], activeMarketId, onMarketChange, onBack, onCreateOrder,
    initialCart = [], onCartUpdate, autoOpenCheckout = false, onCheckoutClosed
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');
  const [selectedStall, setSelectedStall] = useState<Stall | null>(null);
  
  // RECTIFICATION : On utilise initialCart comme source si onCartUpdate est présent
  // pour éviter la désynchronisation entre le parent et cet enfant.
  const cart = initialCart;
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(autoOpenCheckout);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', provider: 'momo' as any });
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
      if (autoOpenCheckout) setIsCheckoutOpen(true);
  }, [autoOpenCheckout]);

  const currentMarket = markets.find(m => m.id === activeMarketId) || { id: 'all', name: 'Tous les Marchés' } as any;

  const filteredStalls = stalls.filter(s => {
    const isOccupied = s.status === 'occupied';
    const matchesMarket = activeMarketId === 'all' || s.marketId === activeMarketId;
    const matchesSearch = s.occupantName?.toLowerCase().includes(searchTerm.toLowerCase()) || s.productType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || s.productType === categoryFilter;
    return isOccupied && matchesMarket && matchesSearch && matchesCategory;
  });

  const flashProducts = useMemo(() => products.filter(p => {
      if (!p.tags) return false;
      const flashTag = p.tags.find(t => t.startsWith('FLASH_END:'));
      if (!flashTag) return false;
      return parseInt(flashTag.split(':')[1]) > Date.now();
  }), [products]);

  const addToCart = (product: Product) => {
    const newCart = [...cart];
    const exist = newCart.find(i => i.product.id === product.id);
    if (exist) {
        exist.quantity += 1;
    } else {
        newCart.push({ product, quantity: 1 });
    }
    onCartUpdate?.(newCart);
    toast.success("Ajouté au panier !");
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  const handleCheckout = (e: React.FormEvent) => {
      e.preventDefault();
      if (!onCreateOrder || cart.length === 0) return;

      // Fix: Explicitly type the CartItem to fix 'unknown' inference in reduce and map calls
      type CartItem = {product: Product; quantity: number};
      const itemsByStall = cart.reduce<Record<string, CartItem[]>>((acc, item) => {
          const sid = item.product.stallId;
          if (!acc[sid]) acc[sid] = [];
          acc[sid].push(item);
          return acc;
      }, {});

      Object.entries(itemsByStall).forEach(([stallId, items]) => {
          onCreateOrder({
              stallId,
              customerName: customerInfo.name,
              customerPhone: customerInfo.phone,
              // Fix: Added explicit typing for items to resolve 'unknown' property access
              items: (items as CartItem[]).map(i => ({ productId: i.product.id, name: i.product.name, quantity: i.quantity, price: i.product.price })),
              totalAmount: (items as CartItem[]).reduce((sum, i) => sum + (i.product.price * i.quantity), 0),
              paymentProvider: customerInfo.provider,
              paymentRef: `PAY-${Date.now()}`,
              deliveryMode: 'pickup'
          });
      });

      setIsCheckoutOpen(false);
      onCheckoutClosed?.();
      setOrderSuccess(true);
      onCartUpdate?.([]); 
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col animate-fade-in relative">
      <div className="bg-slate-900 text-white sticky top-0 z-50 shadow-md h-14 flex items-center px-4 justify-between">
          <div className="flex items-center gap-2">
              <div className="p-1.5 bg-green-500 rounded-lg"><MapIcon className="w-4 h-4" /></div>
              <div className="flex flex-col relative">
                  <span className="text-[10px] text-gray-400 uppercase font-bold">Lieu</span>
                  <div className="flex items-center gap-1 font-bold text-sm">
                      {currentMarket.name} <ChevronDown className="w-3 h-3" />
                      <select className="absolute inset-0 opacity-0 cursor-pointer" value={activeMarketId} onChange={(e) => onMarketChange(e.target.value)}>
                         <option value="all">Vue Globale</option>
                         {markets.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                  </div>
              </div>
          </div>
          <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="text-white" onClick={() => setIsCheckoutOpen(true)}>
                  <ShoppingCart className="w-4 h-4"/>
                  {cart.length > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 rounded-full">{cart.length}</span>}
              </Button>
              <Button size="sm" variant="ghost" className="text-white" onClick={onBack}>Quitter</Button>
          </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-4 pt-6 space-y-6 pb-20">
          <Card className="p-3 flex flex-col md:flex-row gap-3 shadow-md">
              <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400"/>
                  <input placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:bg-white outline-none"/>
              </div>
              <div className="md:w-48">
                  <Select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                      <option value="all">Toutes Catégories</option>
                      {PRODUCT_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                  </Select>
              </div>
          </Card>

          {flashProducts.length > 0 && (
              <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                  {flashProducts.map(p => (
                      <div key={p.id} className="shrink-0 w-64 bg-white rounded-2xl shadow-lg border border-red-50 p-4">
                          <div className="flex justify-between items-center mb-2">
                              <Badge variant="danger" className="animate-pulse">FLASH</Badge>
                              <Timer className="w-4 h-4 text-red-500"/>
                          </div>
                          <h4 className="font-bold truncate">{p.name}</h4>
                          <p className="text-xl font-black text-red-600 mb-4">{formatCurrency(p.promoPrice || p.price)}</p>
                          <Button size="sm" className="w-full bg-red-600" onClick={() => addToCart(p)}>Ajouter</Button>
                      </div>
                  ))}
              </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredStalls.map(stall => (
                  <Card key={stall.id} onClick={() => setSelectedStall(stall)} className="hover:shadow-xl cursor-pointer">
                      <div className="h-40 bg-gray-100 rounded-t-2xl flex items-center justify-center">
                          <ImageIcon className="w-10 h-10 text-gray-300"/>
                      </div>
                      <div className="p-4">
                          <h3 className="text-lg font-bold">{stall.occupantName}</h3>
                          <Badge variant="info">{stall.productType}</Badge>
                      </div>
                  </Card>
              ))}
          </div>
      </div>

      {selectedStall && (
        <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col">
            <div className="bg-white p-4 flex justify-between items-center shadow-sm">
                <div><h2 className="text-xl font-black">{selectedStall.occupantName}</h2><p className="text-xs text-gray-500">Zone {selectedStall.zone}</p></div>
                <button onClick={() => setSelectedStall(null)}><X/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-4">
                {products.filter(p => p.stallId === selectedStall.id).map(p => (
                    <Card key={p.id} className="p-3">
                        <p className="font-bold truncate">{p.name}</p>
                        <p className="text-green-600 font-black mb-3">{formatCurrency(p.price)}</p>
                        <Button size="sm" className="w-full" onClick={() => addToCart(p)}>Ajouter</Button>
                    </Card>
                ))}
            </div>
            {cart.length > 0 && <div className="p-4 bg-white border-t"><Button onClick={() => setIsCheckoutOpen(true)} className="w-full bg-green-600 h-14">Voir Panier ({formatCurrency(cartTotal)})</Button></div>}
        </div>
      )}

      {isCheckoutOpen && (
          <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
              <Card className="w-full max-w-md p-6 relative">
                  <h3 className="text-xl font-bold mb-4">Confirmation</h3>
                  <div className="space-y-4">
                      <input placeholder="Nom" className="w-full p-3 bg-gray-50 rounded-xl" value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})}/>
                      <input placeholder="Téléphone" className="w-full p-3 bg-gray-50 rounded-xl" value={customerInfo.phone} onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})}/>
                      <div className="flex justify-between items-center font-black text-xl border-t pt-4"><span>Total</span><span>{formatCurrency(cartTotal)}</span></div>
                      <Button className="w-full h-14 bg-green-600" onClick={handleCheckout}>Valider la commande</Button>
                  </div>
                  <button onClick={() => { setIsCheckoutOpen(false); onCheckoutClosed?.(); }} className="absolute top-4 right-4"><X/></button>
              </Card>
          </div>
      )}
      
      {orderSuccess && (
          <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4">
              <Card className="p-8 text-center animate-scale-in">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4"/>
                  <h3 className="text-2xl font-bold mb-6">Commande Validée !</h3>
                  <Button onClick={() => setOrderSuccess(false)} className="w-full">Retour</Button>
              </Card>
          </div>
      )}
    </div>
  );
};

export default PublicMarketplace;
