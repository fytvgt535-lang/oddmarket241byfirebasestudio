
import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Package, User, Sparkles, MessageSquare, Star, Send, X, Camera, CheckCircle } from 'lucide-react';
import { Stall, Market, Product, ClientOrder, SmartListItem, OrderMessage } from '../types';
import PublicMarketplace from '../PublicMarketplace';
import { formatCurrency } from '../utils/coreUtils';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import ClientProfile from './client/ClientProfile';
import { SmartShoppingList } from './client/SmartShoppingList'; 
import { fetchOrderMessages, sendOrderMessage, subscribeToTable, submitOrderReview } from '../../services/supabaseService';
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
  const [cart, setCart] = useState<{product: Product; quantity: number}[]>([]);
  const [isCheckoutTriggered, setIsCheckoutTriggered] = useState(false); 

  // ORDER INTERACTION STATES
  const [activeOrderChat, setActiveOrderChat] = useState<ClientOrder | null>(null);
  const [activeOrderReview, setActiveOrderReview] = useState<ClientOrder | null>(null);
  const [chatMessages, setChatMessages] = useState<OrderMessage[]>([]);
  const [newMsgText, setNewMsgText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // CHAT REALTIME
  useEffect(() => {
    if (activeOrderChat) {
        fetchOrderMessages(activeOrderChat.id).then(setChatMessages);
        const channel = subscribeToTable('order_messages', (p) => {
            if (p.new.order_id === activeOrderChat.id) setChatMessages(prev => [...prev, p.new as any]);
        });
        return () => { channel.unsubscribe(); };
    }
  }, [activeOrderChat]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!newMsgText.trim() || !activeOrderChat) return;
    await sendOrderMessage({ orderId: activeOrderChat.id, senderId: 'CLIENT_TEMP', senderRole: 'client', text: newMsgText });
    setNewMsgText('');
  };

  const handleReviewSubmit = async () => {
    if (!activeOrderReview) return;
    await submitOrderReview(activeOrderReview.id, reviewRating, reviewComment);
    toast.success("Merci pour votre avis !");
    setActiveOrderReview(null);
  };

  const handleSmartCartImport = (items: SmartListItem[]) => {
      let matchesCount = 0;
      const newCart = [...cart]; 
      items.forEach(smartItem => {
          const term = smartItem.cleanTerm.toLowerCase();
          const candidates = products.filter(p => (p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term)) && p.inStock);
          if (candidates.length > 0) {
              candidates.sort((a, b) => a.price - b.price);
              const bestMatch = candidates[0];
              const exist = newCart.findIndex(i => i.product.id === bestMatch.id);
              if (exist >= 0) newCart[exist].quantity += 1;
              else newCart.push({ product: bestMatch, quantity: 1 });
              matchesCount++;
          }
      });
      if (matchesCount > 0) {
          setCart(newCart);
          toast.success(`${matchesCount} produits localisés !`);
          setActiveTab('market'); 
          setIsCheckoutTriggered(true); 
      } else toast.error("Produits indisponibles actuellement.");
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex justify-around sticky top-2 z-40 overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveTab('market')} className={`flex flex-col items-center gap-1 p-2 min-w-[60px] rounded-lg transition-colors ${activeTab === 'market' ? 'text-green-600 bg-green-50' : 'text-gray-400'}`}>
              <ShoppingBag className="w-6 h-6"/><span className="text-[10px] font-bold uppercase">Marché</span>
          </button>
          <button onClick={() => setActiveTab('smartlist')} className={`flex flex-col items-center gap-1 p-2 min-w-[60px] rounded-lg transition-colors ${activeTab === 'smartlist' ? 'text-purple-600 bg-purple-50' : 'text-gray-400'}`}>
              <Sparkles className="w-6 h-6"/><span className="text-[10px] font-bold uppercase">IA</span>
          </button>
          <button onClick={() => setActiveTab('orders')} className={`flex flex-col items-center gap-1 p-2 min-w-[60px] rounded-lg transition-colors ${activeTab === 'orders' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}>
              <div className="relative"><Package className="w-6 h-6"/>{orders.length > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>}</div>
              <span className="text-[10px] font-bold uppercase">Suivi</span>
          </button>
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 p-2 min-w-[60px] rounded-lg transition-colors ${activeTab === 'profile' ? 'text-orange-600 bg-orange-50' : 'text-gray-400'}`}>
              <User className="w-6 h-6"/><span className="text-[10px] font-bold uppercase">Moi</span>
          </button>
      </div>

      <div className="animate-fade-in pb-20">
          {activeTab === 'market' && (
              <PublicMarketplace 
                stalls={stalls} markets={markets} products={products} activeMarketId={selectedMarketId} onMarketChange={setSelectedMarketId} onBack={() => {}} onCreateOrder={onCreateOrder} initialCart={cart} onCartUpdate={setCart} autoOpenCheckout={isCheckoutTriggered} onCheckoutClosed={() => setIsCheckoutTriggered(false)}
              />
          )}

          {activeTab === 'smartlist' && <SmartShoppingList onValidate={handleSmartCartImport} />}

          {activeTab === 'orders' && (
              <div className="space-y-6 px-2">
                  <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">Mes Commandes</h2>
                  {orders.length === 0 ? (
                      <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200"><Package className="w-16 h-16 text-gray-200 mx-auto mb-4"/><p className="text-gray-400 font-bold">Aucune commande.</p></div>
                  ) : orders.map(order => (
                      <Card key={order.id} className="p-6 relative overflow-hidden border-none shadow-xl bg-white rounded-[2rem]">
                          <div className={`absolute left-0 top-0 bottom-0 w-2 ${order.status === 'completed' ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`}></div>
                          <div className="flex justify-between items-start mb-4">
                              <div>
                                  <p className="font-black text-gray-900 text-xl tracking-tighter uppercase leading-none">CMD #{order.id.slice(-4)}</p>
                                  <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">{new Date(order.date).toLocaleDateString()}</p>
                              </div>
                              <Badge variant={order.status === 'completed' ? 'success' : 'info'} className="uppercase text-[9px]">{order.status}</Badge>
                          </div>
                          
                          <div className="flex gap-2 mb-6">
                             <button onClick={() => setActiveOrderChat(order)} className="flex-1 bg-blue-50 text-blue-600 py-3 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 border border-blue-100">
                                <MessageSquare className="w-4 h-4"/> Chat Vendeur
                             </button>
                             {order.status === 'completed' && !order.rating && (
                                 <button onClick={() => setActiveOrderReview(order)} className="flex-1 bg-yellow-50 text-yellow-600 py-3 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 border border-yellow-100">
                                    <Star className="w-4 h-4"/> Donner Avis
                                 </button>
                             )}
                          </div>

                          <div className="pt-4 border-t border-gray-50 flex justify-between items-end">
                              <span className="text-xs font-bold text-gray-400 uppercase">{order.items.length} articles</span>
                              <span className="text-2xl font-black text-gray-900 leading-none">{formatCurrency(order.totalAmount)}</span>
                          </div>
                      </Card>
                  ))}
              </div>
          )}

          {activeTab === 'profile' && <ClientProfile stalls={stalls} onSignOut={onSignOut} />}
      </div>

      {/* MODALE CHAT CLIENT */}
      {activeOrderChat && (
          <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-slide-up">
              <div className="p-6 border-b flex justify-between items-center bg-blue-600 text-white shadow-lg">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center font-black">#{activeOrderChat.id.slice(-4)}</div>
                      <h3 className="font-black uppercase tracking-tighter">Chat Vendeur</h3>
                  </div>
                  <button onClick={() => setActiveOrderChat(null)} className="p-2"><X className="w-8 h-8"/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                  {chatMessages.map(m => (
                      <div key={m.id} className={`flex ${m.senderRole === 'client' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-4 rounded-2xl ${m.senderRole === 'client' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none shadow-md'}`}>
                              <p className="font-bold">{m.text}</p>
                              <p className="text-[8px] opacity-60 mt-1 uppercase">{new Date(m.timestamp).toLocaleTimeString()}</p>
                          </div>
                      </div>
                  ))}
                  <div ref={chatEndRef}/>
              </div>
              <div className="p-4 border-t bg-white flex gap-2">
                  <Input placeholder="Votre message..." value={newMsgText} onChange={e => setNewMsgText(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendMessage()}/>
                  <Button onClick={handleSendMessage} disabled={!newMsgText.trim()}><Send className="w-5 h-5"/></Button>
              </div>
          </div>
      )}

      {/* MODALE AVIS CLIENT */}
      {activeOrderReview && (
          <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm animate-fade-in">
              <Card className="w-full max-w-sm p-8 bg-white rounded-[3rem] text-center space-y-8">
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Votre Expérience</h3>
                  <p className="text-sm text-slate-500">Notez la qualité des produits de votre vendeur.</p>
                  <div className="flex justify-center gap-2">
                      {[1,2,3,4,5].map(s => (
                          <button key={s} onClick={() => setReviewRating(s)} className="p-2">
                              <Star className={`w-10 h-10 ${s <= reviewRating ? 'text-yellow-400 fill-current' : 'text-slate-200'}`}/>
                          </button>
                      ))}
                  </div>
                  <textarea 
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    placeholder="Un petit commentaire ? (Ex: Poisson frais, merci !)"
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-yellow-400 font-bold"
                    rows={3}
                  />
                  <div className="flex gap-3">
                      <button onClick={() => setActiveOrderReview(null)} className="flex-1 py-4 font-black uppercase text-xs text-slate-400">Plus tard</button>
                      <Button onClick={handleReviewSubmit} className="flex-1 bg-yellow-500 border-none h-16 shadow-yellow-100">PUBLIER</Button>
                  </div>
              </Card>
          </div>
      )}
    </div>
  );
};

export default ClientDashboard;
