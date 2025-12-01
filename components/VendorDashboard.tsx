
import React, { useState, useEffect } from 'react';
import { Transaction, Stall, HygieneReport, VendorProfile, Sanction, PaymentPlan, Receipt, Product, ClientOrder, AppNotification } from '../types';
import { Download, CheckCircle, Clock, MapPin, ShieldCheck, User, QrCode, Star, AlertTriangle, HeartHandshake, History, Sparkles, FileText, Lock, ShoppingBag, Plus, Trash2, Edit, Package, Bell, X, Gavel, Scale, Truck, Settings, Image as ImageIcon, Box, Mic, Volume2, Minus, CreditCard, Calendar, BarChart, Tag, TicketPercent } from 'lucide-react';
import { generateVendorCoachTip } from '../services/geminiService';

interface VendorDashboardProps {
  profile: VendorProfile;
  transactions: Transaction[];
  receipts: Receipt[];
  myStall?: Stall;
  myReports: HygieneReport[];
  sanctions: Sanction[];
  paymentPlan?: PaymentPlan;
  products: Product[];
  orders: ClientOrder[];
  notifications: AppNotification[];
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onDeleteProduct: (id: string) => void;
  onUpdateOrderStatus: (orderId: string, status: ClientOrder['status']) => void;
  onContestSanction?: (sanctionId: string, reason: string) => void;
  onUpdateProfile?: (updates: Partial<VendorProfile>) => void;
  onToggleLogistics?: (subscribed: boolean) => void;
}

const VendorDashboard: React.FC<VendorDashboardProps> = ({ profile, transactions, receipts, myStall, myReports, sanctions, paymentPlan, products, orders, notifications, onAddProduct, onUpdateProduct, onDeleteProduct, onUpdateOrderStatus, onContestSanction, onUpdateProfile, onToggleLogistics }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'store' | 'logistics' | 'settings'>('overview');
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // PRODUCT FORM STATE
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Extended Form
  const [productForm, setProductForm] = useState({ 
      name: '', 
      price: '', 
      promoPrice: '', 
      isPromo: false,
      unit: 'pièce', 
      category: 'vivres', 
      quantity: '1', 
      description: '', 
      origin: '',
      tagsString: '', // comma separated
      imageUrl: '' 
  });

  useEffect(() => {
    const loadTip = async () => {
      const tip = await generateVendorCoachTip(profile, myStall);
      setAiTip(tip);
    };
    loadTip();
  }, [profile.id]);

  const handleSpeak = (text: string) => {
      alert(`[🔊 AUDIO]: "${text}"`);
  };

  const handleOpenProductModal = (product?: Product) => {
      if (product) {
          setEditingProduct(product);
          setProductForm({
              name: product.name,
              price: product.price.toString(),
              promoPrice: product.promoPrice?.toString() || '',
              isPromo: product.isPromo || false,
              unit: product.unit,
              category: product.category,
              quantity: product.stockQuantity.toString(),
              description: product.description || '',
              origin: product.origin || '',
              tagsString: product.tags?.join(', ') || '',
              imageUrl: product.imageUrl || ''
          });
      } else {
          setEditingProduct(null);
          setProductForm({ name: '', price: '', promoPrice: '', isPromo: false, unit: 'pièce', category: 'vivres', quantity: '10', description: '', origin: '', tagsString: '', imageUrl: '' });
      }
      setIsProductModalOpen(true);
  };

  const handleQuickStockUpdate = (product: Product, delta: number) => {
      const newQty = Math.max(0, product.stockQuantity + delta);
      onUpdateProduct(product.id, { stockQuantity: newQty, inStock: newQty > 0 });
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myStall) return;
    
    const tags = productForm.tagsString.split(',').map(t => t.trim()).filter(t => t.length > 0);
    const promoPriceNum = productForm.isPromo && productForm.promoPrice ? Number(productForm.promoPrice) : undefined;

    const commonData = {
        name: productForm.name,
        price: Number(productForm.price),
        promoPrice: promoPriceNum,
        isPromo: productForm.isPromo,
        unit: productForm.unit,
        category: productForm.category as any,
        stockQuantity: Number(productForm.quantity),
        inStock: Number(productForm.quantity) > 0,
        description: productForm.description,
        origin: productForm.origin,
        tags: tags,
        imageUrl: productForm.imageUrl || undefined
    };

    if (editingProduct) {
        onUpdateProduct(editingProduct.id, commonData);
    } else {
        onAddProduct({
            stallId: myStall.id,
            ...commonData,
        });
    }
    setIsProductModalOpen(false);
  };

  const myOrders = orders.filter(o => o.stallId === myStall?.id).sort((a,b) => b.date - a.date);
  const myProducts = products.filter(p => p.stallId === myStall?.id);
  const unreadNotifs = notifications.filter(n => !n.read).length;

  const daysRemaining = profile.subscriptionExpiry 
    ? Math.ceil((profile.subscriptionExpiry - Date.now()) / (1000 * 60 * 60 * 24)) 
    : 0;
  
  const getSubscriptionProgress = () => {
    if (!profile.subscriptionExpiry) return 0;
    const totalDuration = 30 * 24 * 60 * 60 * 1000;
    const remaining = profile.subscriptionExpiry - Date.now();
    return Math.max(0, Math.min(100, (remaining / totalDuration) * 100));
  };

  return (
    <div className="space-y-4 relative max-w-lg mx-auto md:max-w-none">
      
      {/* HEADER */}
      <div className="flex justify-between items-center bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
               <button onClick={() => handleSpeak("Bienvenue dans votre espace. Appuyez sur les icônes pour naviguer.")} className="bg-blue-100 text-blue-600 p-3 rounded-full active:scale-95 transition-transform">
                   <Volume2 className="w-6 h-6" />
               </button>
               <div>
                   <h2 className="font-bold text-gray-800 text-lg leading-tight">{profile.name}</h2>
                   <p className="text-gray-400 text-xs">Vendeur Certifié</p>
               </div>
          </div>
          <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-3 bg-gray-50 rounded-xl hover:bg-gray-100">
              <Bell className="w-6 h-6 text-gray-600"/>
              {unreadNotifs > 0 && <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
          </button>
      </div>

      {/* NOTIFICATIONS DROPDOWN */}
      {showNotifications && (
         <div className="absolute top-20 right-0 left-0 md:left-auto md:w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-fade-in">
             <div className="bg-gray-50 p-3 border-b border-gray-100 flex justify-between items-center">
                 <h4 className="font-bold text-gray-800">Messages</h4>
                 <button onClick={() => setShowNotifications(false)}><X className="w-5 h-5 text-gray-400"/></button>
             </div>
             <div className="max-h-64 overflow-y-auto">
                 {notifications.length === 0 ? (
                     <div className="p-8 text-center text-gray-400">
                         <Bell className="w-8 h-8 mx-auto mb-2 opacity-20"/>
                         <p>Rien à signaler</p>
                     </div>
                 ) : (
                     notifications.map(n => (
                         <div key={n.id} className="p-4 border-b border-gray-100 active:bg-gray-50 flex gap-3">
                             <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${n.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                             <div>
                                 <p className="font-bold text-gray-800">{n.title}</p>
                                 <p className="text-sm text-gray-500">{n.message}</p>
                                 <p className="text-[10px] text-gray-400 mt-1">{new Date(n.date).toLocaleTimeString()}</p>
                             </div>
                         </div>
                     ))
                 )}
             </div>
         </div>
      )}

      {/* BIG ICON NAVIGATION */}
      <div className="grid grid-cols-4 gap-2">
        {[
            { id: 'overview', icon: User, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Moi' },
            { id: 'store', icon: Box, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Rayons' },
            { id: 'logistics', icon: Truck, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Livraison' },
            { id: 'settings', icon: Settings, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Réglages' }
        ].map(tab => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all active:scale-95 border-2 
                ${activeTab === tab.id ? `border-${tab.color.split('-')[1]}-200 shadow-md transform scale-105 bg-white` : 'border-transparent bg-white shadow-sm'}`}
            >
                <div className={`p-3 rounded-full mb-1 ${activeTab === tab.id ? tab.bg : 'bg-gray-50'}`}>
                    <tab.icon className={`w-6 h-6 ${activeTab === tab.id ? tab.color : 'text-gray-400'}`} />
                </div>
                <span className={`text-xs font-bold ${activeTab === tab.id ? 'text-gray-800' : 'text-gray-400'}`}>{tab.label}</span>
            </button>
        ))}
      </div>

      {/* --- TAB 1: OVERVIEW (Visual Dashboard) --- */}
      {activeTab === 'overview' && (
      <div className="space-y-4 animate-fade-in">
        
        {/* Stall Status Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <QrCode className="w-32 h-32 text-gray-900" />
            </div>
            
            <p className="text-gray-400 font-bold uppercase text-xs tracking-wider mb-1">Mon Emplacement</p>
            {myStall ? (
                <>
                    <h1 className="text-6xl font-black text-gray-800 mb-2">{myStall.number}</h1>
                    <div className="flex items-center gap-2 mb-6">
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                            <CheckCircle className="w-3 h-3"/> Payé
                        </span>
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">
                            {myStall.zone}
                        </span>
                    </div>
                </>
            ) : (
                <div className="py-8">
                    <p className="text-xl font-bold text-gray-400">Pas d'étal</p>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <button className="bg-blue-600 active:bg-blue-700 text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-lg shadow-blue-200">
                    <QrCode className="w-8 h-8" />
                    <span className="font-bold">Mon QR</span>
                </button>
                <button className="bg-white border-2 border-gray-100 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-600 active:bg-gray-50">
                    <History className="w-8 h-8" />
                    <span className="font-bold">Reçus</span>
                </button>
            </div>
        </div>

        {/* AI Tip (Audio) */}
        {aiTip && (
            <div className="bg-purple-600 rounded-2xl p-4 text-white shadow-lg flex items-center gap-4 cursor-pointer active:scale-95 transition-transform" onClick={() => handleSpeak(aiTip)}>
                <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                    <Volume2 className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                    <p className="text-purple-200 text-xs font-bold uppercase mb-1">Conseil du jour</p>
                    <p className="font-medium text-sm line-clamp-2">"{aiTip}"</p>
                </div>
            </div>
        )}
      </div>
      )}

      {/* --- TAB 2: STORE (Advanced Product Management) --- */}
      {activeTab === 'store' && (
        <div className="space-y-4 animate-fade-in">
            {/* Action Bar */}
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                <button onClick={() => handleOpenProductModal()} className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-green-200 shrink-0">
                    <Plus className="w-6 h-6"/> Nouveau Produit
                </button>
            </div>

            {/* Visual Inventory Grid */}
            <div className="grid grid-cols-1 gap-4">
                {myProducts.map(product => (
                    <div key={product.id} className="bg-white rounded-3xl p-3 shadow-sm border border-gray-100 flex gap-4 items-center">
                        {/* Image */}
                        <div className="w-24 h-24 bg-gray-100 rounded-2xl shrink-0 overflow-hidden relative group">
                             {product.imageUrl ? (
                                <img src={product.imageUrl} className="w-full h-full object-cover"/>
                             ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    <ImageIcon className="w-8 h-8"/>
                                </div>
                             )}
                             {product.isPromo && (
                                 <span className="absolute top-0 left-0 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-br-lg z-10">PROMO</span>
                             )}
                             <button onClick={() => handleOpenProductModal(product)} className="absolute bottom-1 right-1 bg-white/80 p-1.5 rounded-lg shadow-sm">
                                 <Edit className="w-4 h-4 text-gray-700"/>
                             </button>
                        </div>

                        {/* Controls */}
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-800 text-lg truncate">{product.name}</h3>
                            <div className="flex items-center gap-2 mb-2">
                                {product.isPromo ? (
                                    <>
                                        <span className="text-red-600 font-bold">{product.promoPrice} F</span>
                                        <span className="text-gray-400 text-xs line-through">{product.price} F</span>
                                    </>
                                ) : (
                                    <span className="text-gray-400 font-bold">{product.price} F</span>
                                )}
                            </div>
                            
                            {/* Visual Stock Counter */}
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => handleQuickStockUpdate(product, -1)}
                                    className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 active:bg-gray-200"
                                >
                                    <Minus className="w-5 h-5"/>
                                </button>
                                
                                <div className={`flex-1 h-10 rounded-xl flex items-center justify-center font-black text-xl 
                                    ${product.stockQuantity > 0 ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                    {product.stockQuantity}
                                </div>

                                <button 
                                    onClick={() => handleQuickStockUpdate(product, 1)}
                                    className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 active:bg-gray-200"
                                >
                                    <Plus className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* PRODUCT MODAL (FULL FREEDOM) */}
            {isProductModalOpen && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm animate-fade-in relative my-auto">
                        <button onClick={() => setIsProductModalOpen(false)} className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full"><X className="w-5 h-5"/></button>
                        <h3 className="font-bold text-2xl mb-6 text-gray-800">{editingProduct ? 'Modifier' : 'Ajouter'}</h3>
                        
                        <form onSubmit={handleProductSubmit} className="space-y-4">
                            {/* Basics */}
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-3">
                                <Box className="w-6 h-6 text-gray-400"/>
                                <input required placeholder="Nom du produit" type="text" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className="bg-transparent w-full font-bold text-lg outline-none placeholder-gray-300"/>
                            </div>

                            {/* Price & Promo */}
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs text-gray-400 font-bold uppercase flex items-center gap-1"><TicketPercent className="w-3 h-3"/> En Promotion ?</label>
                                    <input type="checkbox" checked={productForm.isPromo} onChange={e => setProductForm({...productForm, isPromo: e.target.checked})} className="w-5 h-5 accent-red-500"/>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="text-xs text-gray-400 font-bold">Prix Normal</label>
                                        <input required type="number" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} className="bg-transparent w-full font-black text-xl outline-none"/>
                                    </div>
                                    {productForm.isPromo && (
                                        <div className="flex-1">
                                            <label className="text-xs text-red-400 font-bold">Prix Promo</label>
                                            <input type="number" value={productForm.promoPrice} onChange={e => setProductForm({...productForm, promoPrice: e.target.value})} className="bg-transparent w-full font-black text-xl text-red-600 outline-none"/>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Details & Tags */}
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                                <input placeholder="Origine (ex: Gabon, Cameroun)" value={productForm.origin} onChange={e => setProductForm({...productForm, origin: e.target.value})} className="w-full bg-transparent border-b border-gray-200 py-2 outline-none text-sm"/>
                                <textarea placeholder="Description attractive..." value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} className="w-full bg-transparent border-b border-gray-200 py-2 outline-none text-sm h-16 resize-none"/>
                                <div className="flex items-center gap-2">
                                    <Tag className="w-4 h-4 text-gray-400"/>
                                    <input placeholder="Tags (ex: Bio, Frais, Pimenté)" value={productForm.tagsString} onChange={e => setProductForm({...productForm, tagsString: e.target.value})} className="w-full bg-transparent outline-none text-sm"/>
                                </div>
                            </div>

                            {/* Image (Simulated) */}
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Image (URL)</label>
                                <input placeholder="https://..." value={productForm.imageUrl} onChange={e => setProductForm({...productForm, imageUrl: e.target.value})} className="w-full bg-white p-2 rounded border border-gray-200 text-xs"/>
                            </div>

                            {/* Stock */}
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <label className="text-xs text-gray-400 font-bold uppercase">Stock Initial</label>
                                <input required type="number" value={productForm.quantity} onChange={e => setProductForm({...productForm, quantity: e.target.value})} className="bg-transparent w-full font-black text-xl outline-none"/>
                            </div>

                            <button type="submit" className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold text-xl shadow-xl shadow-green-200 active:scale-95 transition-transform">
                                Valider
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
      )}

      {/* --- TAB 3: LOGISTICS (Same as before) --- */}
      {activeTab === 'logistics' && (
          <div className="space-y-6 animate-fade-in">
              {/* Status Card */}
              <div className={`rounded-3xl p-6 relative overflow-hidden text-white shadow-lg ${profile.isLogisticsSubscribed ? 'bg-orange-500' : 'bg-slate-800'}`}>
                  <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-4">
                          <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                              <Truck className="w-8 h-8"/>
                          </div>
                          <div>
                              <p className="text-white/60 font-bold text-xs uppercase">Statut Service</p>
                              <h3 className="text-2xl font-black">{profile.isLogisticsSubscribed ? 'ACTIF' : 'INACTIF'}</h3>
                          </div>
                      </div>

                      {profile.isLogisticsSubscribed ? (
                          <div>
                              <div className="flex justify-between text-xs font-bold mb-1 text-orange-100">
                                  <span>Temps Restant</span>
                                  <span>{daysRemaining} jours</span>
                              </div>
                              <div className="w-full bg-black/20 h-3 rounded-full overflow-hidden">
                                  <div className="bg-white h-full rounded-full" style={{width: `${getSubscriptionProgress()}%`}}></div>
                              </div>
                              <p className="mt-4 text-xs text-orange-100">Renouvellement automatique le {profile.subscriptionExpiry ? new Date(profile.subscriptionExpiry).toLocaleDateString() : '-'}</p>
                          </div>
                      ) : (
                          <div>
                              <p className="text-slate-300 text-sm mb-4">Activez la livraison pour vendre à distance.</p>
                              <button 
                                onClick={() => onToggleLogistics && onToggleLogistics(true)}
                                className="w-full py-3 bg-white text-slate-900 font-bold rounded-xl active:scale-95 transition-transform"
                              >
                                  Activer (5000 F)
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

       {/* --- TAB 4: SETTINGS --- */}
       {activeTab === 'settings' && (
           <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
               <button className="w-full p-4 bg-gray-50 rounded-2xl flex items-center justify-between font-bold text-gray-700">
                   <span className="flex items-center gap-3"><User className="w-5 h-5"/> Modifier Profil</span>
                   <Settings className="w-5 h-5 text-gray-400"/>
               </button>
               <button className="w-full p-4 bg-gray-50 rounded-2xl flex items-center justify-between font-bold text-gray-700">
                   <span className="flex items-center gap-3"><Lock className="w-5 h-5"/> Sécurité & Code</span>
                   <Settings className="w-5 h-5 text-gray-400"/>
               </button>
           </div>
       )}
    </div>
  );
};

export default VendorDashboard;
