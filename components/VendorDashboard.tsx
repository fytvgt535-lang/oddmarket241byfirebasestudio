
import React, { useState, useEffect } from 'react';
import { Transaction, Stall, HygieneReport, VendorProfile, Sanction, PaymentPlan, Receipt, Product, ClientOrder } from '../types';
import { Download, CheckCircle, Clock, MapPin, ShieldCheck, User, QrCode, Star, AlertTriangle, HeartHandshake, History, Sparkles, FileText, Lock, ShoppingBag, Plus, Trash2, Edit, Package } from 'lucide-react';
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
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onDeleteProduct: (id: string) => void;
  onUpdateOrderStatus: (orderId: string, status: ClientOrder['status']) => void;
}

const VendorDashboard: React.FC<VendorDashboardProps> = ({ profile, transactions, receipts, myStall, myReports, sanctions, paymentPlan, products, orders, onAddProduct, onDeleteProduct, onUpdateOrderStatus }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'store'>('overview');
  const [aiTip, setAiTip] = useState<string | null>(null);
  
  // Product Form State
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', unit: 'pièce', category: 'vivres' });

  useEffect(() => {
    // Generate AI tip on load
    const loadTip = async () => {
      const tip = await generateVendorCoachTip(profile, myStall);
      setAiTip(tip);
    };
    loadTip();
  }, [profile.id]);

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myStall) return;
    onAddProduct({
        stallId: myStall.id,
        name: newProduct.name,
        price: Number(newProduct.price),
        unit: newProduct.unit,
        category: newProduct.category as any,
        inStock: true
    });
    setNewProduct({ name: '', price: '', unit: 'pièce', category: 'vivres' });
    setIsAddProductOpen(false);
  };

  const myOrders = orders.filter(o => o.stallId === myStall?.id).sort((a,b) => b.date - a.date);
  const myProducts = products.filter(p => p.stallId === myStall?.id);

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 flex gap-2">
        <button 
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'overview' ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:bg-gray-50'}`}
        >
            <User className="w-4 h-4" /> Mon Espace
        </button>
        <button 
            onClick={() => setActiveTab('store')}
            className={`flex-1 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'store' ? 'bg-purple-50 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`}
        >
            <ShoppingBag className="w-4 h-4" /> Ma Boutique
        </button>
      </div>

      {activeTab === 'overview' && (
      <>
      {/* AI Coach Banner */}
      {aiTip && (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-4 text-white shadow-lg flex items-start gap-4 animate-fade-in">
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
            <Sparkles className="w-6 h-6 text-yellow-300" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-purple-100 uppercase tracking-wider mb-1">Conseil du Jour (IA)</h3>
            <p className="font-medium text-white text-sm md:text-base leading-relaxed">"{aiTip}"</p>
          </div>
        </div>
      )}

      {/* Profile Header & Identity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full -mr-8 -mt-8"></div>
        
        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center border-4 border-white shadow-md overflow-hidden">
            {profile.photoUrl ? (
                <img src={profile.photoUrl} alt="Vendor" className="w-full h-full object-cover" />
            ) : (
                <User className="w-10 h-10 text-gray-400" />
            )}
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-bold text-gray-800">{profile.name}</h2>
            <p className="text-gray-500 font-mono">{profile.phone}</p>
            <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
               <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded text-yellow-700 text-xs font-bold border border-yellow-100">
                  <Star className="w-3 h-3 fill-current" />
                  {profile.hygieneScore}/5 Hygiène
               </div>
               {profile.isVulnerable && (
                 <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold border border-purple-200">
                    Prioritaire
                 </span>
               )}
            </div>
          </div>

          {/* QR Code for Physical Payment */}
          <div className="flex flex-col items-center p-4 bg-white border-2 border-dashed border-gray-300 rounded-lg">
             <QrCode className="w-16 h-16 text-gray-800" />
             <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold">Scan Agent</p>
             <p className="text-xs font-mono font-bold text-gray-800">{profile.id.toUpperCase()}</p>
          </div>
        </div>
      </div>

      {/* Warnings & Alerts Section */}
      {sanctions.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h4 className="font-bold text-red-800 flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5"/> Sanctions & Avertissements
              </h4>
              <div className="space-y-2">
                  {sanctions.map(s => (
                      <div key={s.id} className="bg-white p-3 rounded border border-red-100 flex justify-between items-center">
                          <div>
                              <p className="text-sm font-bold text-gray-800">{s.type === 'warning' ? 'Avertissement' : 'Amende'}</p>
                              <p className="text-xs text-gray-500">{s.reason} - {new Date(s.date).toLocaleDateString()}</p>
                          </div>
                          {s.type === 'fine' && <span className="font-bold text-red-600">-{s.amount} FCFA</span>}
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Payment Plan Active */}
      {paymentPlan && paymentPlan.status === 'active' && (
          <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 relative overflow-hidden">
              <HeartHandshake className="absolute right-[-10px] top-[-10px] w-24 h-24 text-pink-100 rotate-12" />
              <div className="relative z-10">
                <h4 className="font-bold text-pink-800 flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5"/> Plan de Paiement Actif
                </h4>
                <p className="text-sm text-pink-700 mb-3">La mairie a validé votre échelonnement. Merci de respecter les échéances.</p>
                
                <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-bold text-pink-600">Progression</span>
                    <span className="text-xs text-pink-500">{paymentPlan.progress}% remboursés</span>
                </div>
                <div className="w-full bg-pink-200 h-2 rounded-full mb-4">
                    <div className="bg-pink-500 h-2 rounded-full" style={{width: `${paymentPlan.progress}%`}}></div>
                </div>
                
                <div className="bg-white/60 p-3 rounded-lg flex justify-between text-sm">
                    <span>Mensualité :</span>
                    <span className="font-bold text-gray-800">{paymentPlan.amountPerMonth.toLocaleString()} FCFA / mois</span>
                </div>
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stall Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
           <h3 className="font-bold text-gray-800 mb-4">Mon Emplacement</h3>
           {myStall ? (
             <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
               <p className="text-sm text-blue-600 font-bold uppercase tracking-wide mb-1">Étal Réservé</p>
               <p className="text-5xl font-bold text-gray-800 mb-2">{myStall.number}</p>
               <p className="text-gray-600 font-medium">{myStall.zone}</p>
               <div className="mt-4 pt-4 border-t border-blue-200 flex justify-between text-sm">
                 <span>Loyer: <strong>{myStall.price.toLocaleString()} FCFA</strong></span>
                 <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4"/> À jour</span>
               </div>
             </div>
           ) : (
             <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400">
               <p>Aucun étal actif.</p>
               <button className="mt-2 text-green-600 font-bold underline">Réserver maintenant</button>
             </div>
           )}
        </div>

        {/* RECEIPTS SECTION (NEW) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-600" /> Mes Reçus Certifiés
            </h3>
          </div>
          <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
            {receipts.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-20"/>
                    <p className="text-sm">Aucun reçu disponible.</p>
                </div>
            ) : (
                receipts.map((receipt) => (
                    <div key={receipt.id} className="p-4 hover:bg-gray-50 flex justify-between items-center group cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                          <CheckCircle className="w-4 h-4"/>
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 text-sm">Paiement Loyer</p>
                          <p className="text-xs text-gray-500 font-mono flex items-center gap-1">
                              {new Date(receipt.date).toLocaleDateString() • <Lock className="w-3 h-3"/> {receipt.hash.substring(0,6)}...}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-800">{receipt.amount.toLocaleString()}</p>
                        <span className="text-[10px] text-blue-600 group-hover:underline">Voir Preuve</span>
                      </div>
                    </div>
                ))
            )}
          </div>
        </div>
      </div>
      </>
      )}

      {/* --- STOREFRONT TAB --- */}
      {activeTab === 'store' && (
        <div className="space-y-6 animate-fade-in">
            {/* Orders Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-orange-600"/> Commandes Clients (Click & Collect)
                </h3>
                <div className="divide-y divide-gray-100">
                    {myOrders.length === 0 ? (
                        <p className="text-center text-gray-400 py-6">Aucune commande en attente.</p>
                    ) : (
                        myOrders.map(order => (
                            <div key={order.id} className="py-4 flex flex-col md:flex-row justify-between md:items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${order.status === 'paid' ? 'bg-yellow-100 text-yellow-700' : order.status === 'picked_up' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
                                            {order.status === 'paid' ? 'Payé - À Préparer' : 'Livré'}
                                        </span>
                                        <span className="text-xs text-gray-400 font-mono">#{order.id.slice(-6)}</span>
                                    </div>
                                    <p className="font-bold text-gray-800">{order.customerName} ({order.customerPhone})</p>
                                    <p className="text-sm text-gray-600">
                                        {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                                    </p>
                                </div>
                                <div className="text-right flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="font-bold text-green-600">{order.totalAmount.toLocaleString()} FCFA</p>
                                        <p className="text-xs text-gray-400 capitalize">{order.paymentProvider} Money</p>
                                    </div>
                                    {order.status === 'paid' && (
                                        <button 
                                            onClick={() => onUpdateOrderStatus(order.id, 'picked_up')}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg"
                                        >
                                            Marquer Livré
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Products Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-purple-600"/> Mes Produits
                    </h3>
                    <button 
                        onClick={() => setIsAddProductOpen(true)}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold text-sm"
                    >
                        <Plus className="w-4 h-4"/> Ajouter Produit
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {myProducts.map(product => (
                        <div key={product.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center bg-gray-50">
                            <div>
                                <p className="font-bold text-gray-800">{product.name}</p>
                                <p className="text-sm text-gray-600">{product.price.toLocaleString()} FCFA / {product.unit}</p>
                                <span className="text-[10px] uppercase text-gray-400 font-bold">{product.category}</span>
                            </div>
                            <button 
                                onClick={() => onDeleteProduct(product.id)}
                                className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors"
                            >
                                <Trash2 className="w-4 h-4"/>
                            </button>
                        </div>
                    ))}
                    {myProducts.length === 0 && (
                        <div className="col-span-full text-center py-8 border-2 border-dashed border-gray-200 rounded-lg text-gray-400">
                            Votre vitrine est vide. Ajoutez des produits pour vendre en ligne.
                        </div>
                    )}
                </div>

                {/* Add Product Modal */}
                {isAddProductOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl p-6 w-full max-w-sm">
                            <h3 className="font-bold text-lg mb-4">Nouveau Produit</h3>
                            <form onSubmit={handleProductSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700">Nom du produit</label>
                                    <input required type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-2 border rounded"/>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700">Prix (FCFA)</label>
                                        <input required type="number" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full p-2 border rounded"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700">Unité</label>
                                        <select value={newProduct.unit} onChange={e => setNewProduct({...newProduct, unit: e.target.value})} className="w-full p-2 border rounded">
                                            <option value="pièce">Pièce</option>
                                            <option value="kg">Kg</option>
                                            <option value="tas">Tas</option>
                                            <option value="litre">Litre</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700">Catégorie</label>
                                    <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full p-2 border rounded">
                                        <option value="vivres">Vivres</option>
                                        <option value="textile">Textile</option>
                                        <option value="electronique">Électronique</option>
                                        <option value="divers">Divers</option>
                                    </select>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button type="button" onClick={() => setIsAddProductOpen(false)} className="flex-1 py-2 text-gray-600">Annuler</button>
                                    <button type="submit" className="flex-1 py-2 bg-purple-600 text-white rounded font-bold">Ajouter</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default VendorDashboard;
