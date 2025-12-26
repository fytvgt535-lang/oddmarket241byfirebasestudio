
import React, { useState, useEffect, useRef } from 'react';
import { ClientOrder, OrderMessage } from '../../types';
import { Package, Clock, CheckCircle2, Phone, User, ShoppingBag, ArrowRight, Truck, Timer, X, Check, MessageSquare, Star, Send, Camera, Info } from 'lucide-react';
import { formatCurrency } from '../../utils/coreUtils';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { fetchOrderMessages, sendOrderMessage, subscribeToTable } from '../../services/supabaseService';
import toast from 'react-hot-toast';

interface OrderManagerProps {
  orders: ClientOrder[];
  onUpdateStatus: (id: string, status: string) => Promise<void>;
  isSolaris: boolean;
}

const OrderManager: React.FC<OrderManagerProps> = ({ orders, onUpdateStatus, isSolaris }) => {
  const [filter, setFilter] = useState<'pending' | 'ready' | 'completed'>('pending');
  const [selectedOrder, setSelectedOrder] = useState<ClientOrder | null>(null);
  const [activeView, setActiveView] = useState<'details' | 'chat' | 'feedback'>('details');
  
  // CHAT STATE
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const filtered = orders.filter(o => o.status === filter);
  const revenue = orders.filter(o => o.status === 'completed').reduce((acc, o) => acc + o.totalAmount, 0);

  // REALTIME CHAT SUBSCRIPTION
  useEffect(() => {
    if (selectedOrder && activeView === 'chat') {
        const loadMessages = async () => {
            const data = await fetchOrderMessages(selectedOrder.id);
            setMessages(data);
        };
        loadMessages();

        const channel = subscribeToTable('order_messages', (payload) => {
            if (payload.new.order_id === selectedOrder.id) {
                setMessages(prev => [...prev, payload.new as any]);
            }
        });
        return () => { channel.unsubscribe(); };
    }
  }, [selectedOrder, activeView]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleUpdate = async (id: string, status: string) => {
      await onUpdateStatus(id, status);
      toast.success(status === 'ready' ? "Commande marquée prête !" : "Vente terminée.");
      setSelectedOrder(null);
  };

  const handleSendMessage = async () => {
      if (!newMessage.trim() || !selectedOrder) return;
      setIsSending(true);
      try {
          await sendOrderMessage({
              orderId: selectedOrder.id,
              senderId: 'VENDOR_TEMP', // In real app: current user ID
              senderRole: 'vendor',
              text: newMessage
          });
          setNewMessage('');
      } catch (e) { toast.error("Échec envoi"); } finally { setIsSending(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
        {/* KPI REVENUS */}
        <Card className={`p-8 rounded-[3rem] border-8 shadow-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-blue-500`}>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-2">Chiffre d'Affaires Digital</p>
                    <h3 className="text-5xl font-black tracking-tighter">{formatCurrency(revenue)}</h3>
                </div>
                <div className="p-4 bg-white/20 rounded-2xl shadow-inner"><ShoppingBag className="w-6 h-6"/></div>
            </div>
            <div className="flex items-center gap-2">
                <Badge className="bg-white/20 text-white border-none text-[9px] uppercase font-black">{orders.length} commandes</Badge>
                <div className="flex items-center gap-1 bg-yellow-400/20 text-yellow-400 px-3 py-1 rounded-full text-[10px] font-black">
                    <Star className="w-3 h-3 fill-current"/> 4.8 Moyenne
                </div>
            </div>
        </Card>

        {/* SELECTEUR DE FLUX */}
        <div className="grid grid-cols-3 gap-2 px-1">
            {[
                { id: 'pending', label: 'À Préparer', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
                { id: 'ready', label: 'En Attente', icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50' },
                { id: 'completed', label: 'Terminées', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' }
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setFilter(tab.id as any)}
                    className={`flex flex-col items-center py-4 rounded-[2rem] border-4 transition-all ${filter === tab.id ? 'bg-white border-blue-600 shadow-xl scale-105' : 'bg-gray-50 border-transparent opacity-60'}`}
                >
                    <tab.icon className={`w-6 h-6 mb-1 ${tab.color}`}/>
                    <span className={`text-[9px] font-black uppercase tracking-tighter ${tab.color}`}>{tab.label}</span>
                </button>
            ))}
        </div>

        {/* LISTE DES COMMANDES */}
        <div className="space-y-4">
            {filtered.length === 0 ? (
                <div className="py-20 text-center text-slate-300 font-black uppercase text-sm italic">Aucune commande {filter}.</div>
            ) : filtered.map(order => (
                <div 
                    key={order.id} 
                    onClick={() => { setSelectedOrder(order); setActiveView('details'); }}
                    className={`p-6 rounded-[3rem] border-4 flex flex-col gap-6 cursor-pointer active:scale-95 transition-all ${isSolaris ? 'bg-white border-black' : 'bg-white border-slate-100 shadow-md'}`}
                >
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xl">#{order.id.slice(-4)}</div>
                            <div>
                                <h4 className="font-black text-slate-900 uppercase tracking-tighter">{order.customerName}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">{order.items.length} articles • {formatCurrency(order.totalAmount)}</p>
                            </div>
                        </div>
                        <Badge variant={filter === 'pending' ? 'warning' : 'info'}>{order.deliveryMode === 'pickup' ? 'RETRAIT' : 'LIVRAISON'}</Badge>
                    </div>

                    <div className="flex gap-2">
                        <button className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2">
                            <MessageSquare className="w-4 h-4"/> NÉGOCIER
                        </button>
                        {filter === 'pending' && (
                            <button onClick={(e) => { e.stopPropagation(); handleUpdate(order.id, 'ready'); }} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-100">MARQUER PRÊT</button>
                        )}
                        {filter === 'ready' && (
                            <button onClick={(e) => { e.stopPropagation(); handleUpdate(order.id, 'completed'); }} className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-green-100">CONFIRMER REMISE</button>
                        )}
                    </div>
                </div>
            ))}
        </div>

        {/* MODALE CONTEXTUELLE GÉANTE */}
        {selectedOrder && (
            <div className="fixed inset-0 z-[200] bg-slate-950 text-white flex flex-col animate-fade-in overflow-hidden">
                {/* Header Modale */}
                <div className="flex justify-between items-center p-8 bg-slate-900/50 backdrop-blur-xl border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl">#{selectedOrder.id.slice(-4)}</div>
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter">{selectedOrder.customerName}</h3>
                            <Badge className="bg-white/10 text-slate-400 border-none uppercase text-[9px]">{selectedOrder.status}</Badge>
                        </div>
                    </div>
                    <button onClick={() => setSelectedOrder(null)} className="p-6 bg-white/10 rounded-3xl active:scale-90"><X className="w-10 h-10"/></button>
                </div>

                {/* Sub-Navigation */}
                <div className="flex bg-slate-900/80 border-b border-white/5">
                    {[
                        { id: 'details', label: 'Sacs', icon: Package },
                        { id: 'chat', label: 'Discussion', icon: MessageSquare },
                        { id: 'feedback', label: 'Avis Client', icon: Star }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveView(tab.id as any)}
                            className={`flex-1 py-6 flex items-center justify-center gap-3 font-black uppercase text-xs tracking-widest transition-all ${activeView === tab.id ? 'text-blue-500 bg-white/5 border-b-4 border-blue-500' : 'text-slate-500'}`}
                        >
                            <tab.icon className="w-5 h-5"/> {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8 relative">
                    {activeView === 'details' && (
                        <div className="space-y-8 animate-slide-up">
                            <div className="bg-white/5 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl">
                                <div className="p-6 bg-white/5 font-black uppercase text-[10px] text-slate-500 tracking-widest">Articles à préparer</div>
                                {selectedOrder.items.map((item, idx) => (
                                    <div key={idx} className="p-6 flex justify-between items-center border-b border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center font-black text-xl">{item.quantity}x</div>
                                            <p className="font-bold text-xl">{item.name}</p>
                                        </div>
                                        <p className="font-black text-blue-400 text-lg">{formatCurrency(item.price * item.quantity)}</p>
                                    </div>
                                ))}
                                <div className="p-10 bg-white/10 flex justify-between items-center">
                                    <span className="font-black uppercase text-sm tracking-[0.2em] text-slate-400">Paiement Reçu ({selectedOrder.paymentProvider})</span>
                                    <span className="text-5xl font-black tracking-tighter">{formatCurrency(selectedOrder.totalAmount)}</span>
                                </div>
                            </div>
                            
                            <div className="p-8 bg-blue-600/10 border-2 border-blue-600/20 rounded-[2.5rem] flex items-center gap-4">
                                <Info className="w-10 h-10 text-blue-400 shrink-0"/>
                                <p className="text-sm font-bold leading-relaxed text-blue-100 italic">
                                    "Vérifiez chaque sac avant de marquer 'Prêt'. Une erreur coûte des points de réputation."
                                </p>
                            </div>
                        </div>
                    )}

                    {activeView === 'chat' && (
                        <div className="h-full flex flex-col animate-fade-in">
                            <div className="flex-1 overflow-y-auto space-y-4 pb-4">
                                {messages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50 space-y-4">
                                        <MessageSquare className="w-20 h-20"/>
                                        <p className="font-black uppercase text-xs tracking-widest">Aucun message pour cette commande.</p>
                                    </div>
                                ) : messages.map(msg => (
                                    <div key={msg.id} className={`flex ${msg.senderRole === 'vendor' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] p-5 rounded-[2rem] ${msg.senderRole === 'vendor' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white/10 text-slate-200 rounded-tl-none'}`}>
                                            <p className="font-bold text-lg leading-tight">{msg.text}</p>
                                            <p className="text-[9px] opacity-40 mt-2 uppercase font-black">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={chatEndRef}/>
                            </div>
                            
                            <div className="flex gap-3 bg-slate-900 p-4 rounded-[2.5rem] border border-white/10 shadow-2xl">
                                <button className="p-4 bg-white/5 rounded-2xl text-slate-400"><Camera className="w-6 h-6"/></button>
                                <input 
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    placeholder="Écrire au client..."
                                    className="flex-1 bg-transparent border-none outline-none font-bold text-lg placeholder:text-slate-600"
                                    onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                                />
                                <button 
                                    onClick={handleSendMessage}
                                    disabled={isSending || !newMessage.trim()}
                                    className="p-4 bg-blue-600 text-white rounded-2xl disabled:bg-slate-800 disabled:text-slate-500"
                                >
                                    <Send className="w-6 h-6"/>
                                </button>
                            </div>
                        </div>
                    )}

                    {activeView === 'feedback' && (
                        <div className="animate-fade-in space-y-6">
                            {!selectedOrder.rating ? (
                                <div className="h-96 flex flex-col items-center justify-center text-slate-600 opacity-50 space-y-4 text-center">
                                    <Timer className="w-20 h-20 animate-pulse"/>
                                    <p className="font-black uppercase text-xs tracking-widest max-w-xs leading-relaxed">
                                        L'acheteur pourra noter la qualité de ses produits une fois la commande livrée.
                                    </p>
                                </div>
                            ) : (
                                <Card className="p-10 bg-white/5 border-none rounded-[3.5rem] text-center space-y-6">
                                    <p className="text-[10px] font-black text-yellow-400 uppercase tracking-[0.3em]">Évaluation Client</p>
                                    <div className="flex justify-center gap-3">
                                        {[1,2,3,4,5].map(s => (
                                            <Star key={s} className={`w-12 h-12 ${s <= selectedOrder.rating! ? 'text-yellow-400 fill-current' : 'text-slate-800'}`}/>
                                        ))}
                                    </div>
                                    <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 italic text-xl font-medium text-slate-300">
                                        "{selectedOrder.reviewComment}"
                                    </div>
                                    <div className="pt-6">
                                        <Badge variant="success" className="mx-auto bg-green-500/20 text-green-400 border-none px-6 py-2">+10 Points d'hygiène gagnés</Badge>
                                    </div>
                                </Card>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Action Modale */}
                <div className="p-8 bg-slate-900 border-t border-white/5">
                    {selectedOrder.status === 'pending' && (
                        <button 
                            onClick={() => handleUpdate(selectedOrder.id, 'ready')}
                            className="w-full h-24 bg-blue-600 text-white rounded-[3rem] font-black text-2xl uppercase shadow-2xl active:scale-95 flex items-center justify-center gap-4"
                        >
                            <Check className="w-8 h-8"/> TERMINER LA PRÉPARATION
                        </button>
                    )}
                    {selectedOrder.status === 'ready' && (
                        <button 
                            onClick={() => handleUpdate(selectedOrder.id, 'completed')}
                            className="w-full h-24 bg-green-600 text-white rounded-[3rem] font-black text-2xl uppercase shadow-2xl active:scale-95 flex items-center justify-center gap-4"
                        >
                            <Truck className="w-8 h-8"/> VALIDER REMISE AU CLIENT
                        </button>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};

export default OrderManager;
