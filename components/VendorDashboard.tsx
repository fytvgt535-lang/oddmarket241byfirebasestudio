
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, Stall, HygieneReport, VendorProfile, Sanction, PaymentPlan, Receipt, Product, ClientOrder, AppNotification } from '../types';
import { Download, CheckCircle, Clock, MapPin, ShieldCheck, User, QrCode, Star, AlertTriangle, HeartHandshake, History, Sparkles, FileText, Lock, ShoppingBag, Plus, Trash2, Edit, Package, Bell, X, Gavel, Scale, Truck, Settings, Image as ImageIcon, Box, Mic, Volume2, Minus, CreditCard, Calendar, BarChart, Tag, TicketPercent, Search, Filter, ArrowUpDown, Copy, RefreshCw, AlertCircle, Scan, Camera, Save, LogOut } from 'lucide-react';
import { generateVendorCoachTip } from '../services/geminiService';
import { updateUserPassword, updateUserProfile, deleteUserAccount } from '../services/supabaseService';

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
  
  // SETTINGS STATE
  const [profileForm, setProfileForm] = useState({ name: profile.name, phone: profile.phone, bio: profile.bio || '' });
  const [passForm, setPassForm] = useState({ current: '', new: '', confirm: '' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPass, setIsSavingPass] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<{type: 'success'|'error', text: string} | null>(null);
  
  // DELETE ACCOUNT STATE
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // STORE MANAGEMENT STATE
  const [storeCategoryFilter, setStoreCategoryFilter] = useState<string>('all');
  const [storeSearch, setStoreSearch] = useState('');
  const [storeSort, setStoreSort] = useState<'name' | 'price_high' | 'price_low' | 'stock_low'>('stock_low');

  // PRODUCT FORM STATE
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // SECURE PAYMENT STATE
  const [isPayingDebt, setIsPayingDebt] = useState(false);
  const [agentScanned, setAgentScanned] = useState(false);
  const [isScanMode, setIsScanMode] = useState(false);
  
  // WIZARD STATE (Grandma Friendly)
  const [wizardStep, setWizardStep] = useState(1);
  const [isWizardActive, setIsWizardActive] = useState(false);

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
      imageUrl: '',
      freshnessLevel: 100, // 0-100
      qualityGrade: 'A' as 'A'|'B'|'C',
      wholesalePrice: '', // "3 pour 1000" logic could be added here
      wholesaleQty: ''
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

  // --- CALCULATE DEBT ---
  const totalDebt = useMemo(() => {
    if (!myStall) return 0;
    
    // Rent Debt Calculation
    const lastPayment = myStall.lastPaymentDate || (Date.now() - 90 * 24 * 60 * 60 * 1000);
    const msSincePayment = Date.now() - lastPayment;
    const monthsUnpaid = Math.floor(msSincePayment / (30 * 24 * 60 * 60 * 1000));
    const rentDebt = monthsUnpaid > 0 ? monthsUnpaid * myStall.price : 0;

    // Fines Debt
    const fines = sanctions
        .filter(s => s.vendorId === profile.id && s.status === 'active' && s.type === 'fine')
        .reduce((acc, curr) => acc + curr.amount, 0);

    return rentDebt + fines;
  }, [myStall, sanctions, profile.id]);


  // --- SETTINGS LOGIC ---
  const handleUpdateProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSavingProfile(true);
      setSettingsMsg(null);
      try {
          await updateUserProfile(profile.id, {
              name: profileForm.name,
              phone: profileForm.phone,
              bio: profileForm.bio
          });
          if (onUpdateProfile) onUpdateProfile(profileForm);
          setSettingsMsg({ type: 'success', text: 'Profil mis à jour avec succès !' });
      } catch (err: any) {
          setSettingsMsg({ type: 'error', text: err.message || 'Erreur lors de la mise à jour.' });
      } finally {
          setIsSavingProfile(false);
      }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!passForm.current) {
          setSettingsMsg({ type: 'error', text: 'Veuillez saisir votre ancien mot de passe.' });
          return;
      }
      if (passForm.new !== passForm.confirm) {
          setSettingsMsg({ type: 'error', text: 'Les nouveaux mots de passe ne correspondent pas.' });
          return;
      }
      if (passForm.new.length < 6) {
          setSettingsMsg({ type: 'error', text: 'Le nouveau mot de passe doit faire 6 caractères min.' });
          return;
      }
      
      setIsSavingPass(true);
      setSettingsMsg(null);
      try {
          // Pass old password for verification
          await updateUserPassword(passForm.new, passForm.current);
          setSettingsMsg({ type: 'success', text: 'Mot de passe modifié !' });
          setPassForm({ current: '', new: '', confirm: '' });
      } catch (err: any) {
          setSettingsMsg({ type: 'error', text: err.message || 'Erreur technique. Réessayez.' });
      } finally {
          setIsSavingPass(false);
      }
  };

  const handleDeleteAccount = async () => {
      if (deleteInput !== 'SUPPRIMER') {
          alert("Veuillez saisir le mot SUPPRIMER en majuscules pour confirmer.");
          return;
      }
      if (!deletePassword) {
          alert("Le mot de passe est obligatoire pour supprimer le compte.");
          return;
      }

      if (confirm("Êtes-vous absolument sûr ? Cette action est irréversible.")) {
          setIsDeleting(true);
          try {
              await deleteUserAccount(deletePassword);
              // App.tsx handles the logout via auth state change
          } catch (err: any) {
              alert(err.message || "Erreur lors de la suppression.");
              setIsDeleting(false);
          }
      }
  };

  const handlePhotoUpload = () => {
      // Simulate photo upload
      const dummyUrl = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200";
      if (onUpdateProfile) {
          onUpdateProfile({ photoUrl: dummyUrl });
          updateUserProfile(profile.id, { photoUrl: dummyUrl });
      }
      alert("Photo mise à jour (Simulation)");
  };


  // --- STORE LOGIC ---
  const myProducts = products.filter(p => p.stallId === myStall?.id);
  
  // Derived Categories
  const availableCategories = useMemo(() => {
      const cats = new Set(myProducts.map(p => p.category));
      return ['all', ...Array.from(cats)];
  }, [myProducts]);

  // Filtering & Sorting
  const filteredProducts = useMemo(() => {
      let result = myProducts;
      
      // Filter by Category
      if (storeCategoryFilter !== 'all') {
          result = result.filter(p => p.category === storeCategoryFilter);
      }

      // Filter by Search
      if (storeSearch) {
          const lower = storeSearch.toLowerCase();
          result = result.filter(p => 
              p.name.toLowerCase().includes(lower) || 
              p.description?.toLowerCase().includes(lower) ||
              p.tags?.some(t => t.toLowerCase().includes(lower))
          );
      }

      // Sort
      return result.sort((a, b) => {
          switch (storeSort) {
              case 'price_high': return b.price - a.price;
              case 'price_low': return a.price - b.price;
              case 'stock_low': return a.stockQuantity - b.stockQuantity; // Low stock first
              case 'name': return a.name.localeCompare(b.name);
              default: return 0;
          }
      });
  }, [myProducts, storeCategoryFilter, storeSearch, storeSort]);

  // Stats
  const stockValue = useMemo(() => myProducts.reduce((acc, p) => acc + (p.price * p.stockQuantity), 0), [myProducts]);
  const lowStockCount = useMemo(() => myProducts.filter(p => p.stockQuantity < 5).length, [myProducts]);


  const handleOpenProductModal = (product?: Product) => {
      setWizardStep(1);
      setIsWizardActive(true); // Always use wizard for now
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
              imageUrl: product.imageUrl || '',
              freshnessLevel: product.freshnessLevel || 100,
              qualityGrade: product.qualityGrade || 'A',
              wholesalePrice: product.wholesalePrices?.[0]?.price.toString() || '',
              wholesaleQty: product.wholesalePrices?.[0]?.minQuantity.toString() || ''
          });
      } else {
          setEditingProduct(null);
          setProductForm({ name: '', price: '', promoPrice: '', isPromo: false, unit: 'pièce', category: 'vivres', quantity: '10', description: '', origin: '', tagsString: '', imageUrl: '', freshnessLevel: 100, qualityGrade: 'A', wholesalePrice: '', wholesaleQty: '' });
      }
      setIsProductModalOpen(true);
  };

  const handleDuplicateProduct = (product: Product) => {
      onAddProduct({
          ...product,
          name: `${product.name} (Copie)`,
          stockQuantity: 0, // Reset stock for copy
          inStock: false
      });
      handleSpeak("Produit dupliqué. Vous pouvez modifier la copie.");
  };

  const handleTogglePromo = (product: Product) => {
      if (product.isPromo) {
          onUpdateProduct(product.id, { isPromo: false });
      } else {
          // If no promo price set, set a default 10% off
          const promoP = product.promoPrice || Math.floor(product.price * 0.9);
          onUpdateProduct(product.id, { isPromo: true, promoPrice: promoP });
      }
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
    
    // Construct Wholesale logic
    let wholesalePrices = undefined;
    if (productForm.wholesaleQty && productForm.wholesalePrice) {
        wholesalePrices = [{ minQuantity: Number(productForm.wholesaleQty), price: Number(productForm.wholesalePrice) }];
    }

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
        imageUrl: productForm.imageUrl || undefined,
        freshnessLevel: productForm.freshnessLevel,
        qualityGrade: productForm.qualityGrade,
        wholesalePrices
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
  
  // Secure Payment Logic
  const handleScanAgent = () => {
      setIsScanMode(true);
      setTimeout(() => {
          setIsScanMode(false);
          setAgentScanned(true);
          alert("Agent Authentifié. Paiement Cash débloqué.");
      }, 1500);
  };

  const myOrders = orders.filter(o => o.stallId === myStall?.id).sort((a,b) => b.date - a.date);
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

  // --- WIZARD STEPS RENDERER ---
  const renderWizardStep = () => {
    switch (wizardStep) {
        case 1: // BASICS
            return (
                <div className="space-y-6 animate-fade-in">
                    <div className="text-center">
                        <h4 className="text-xl font-bold text-gray-800">Qu'est-ce que vous vendez ?</h4>
                        <p className="text-sm text-gray-500">Nom et Catégorie</p>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="relative">
                            <Box className="absolute left-4 top-4 text-gray-400 w-6 h-6"/>
                            <input 
                                autoFocus
                                value={productForm.name}
                                onChange={e => setProductForm({...productForm, name: e.target.value})}
                                placeholder="Ex: Manioc de Kango" 
                                className="w-full pl-12 p-4 bg-gray-50 rounded-2xl text-lg font-bold outline-none border-2 border-transparent focus:border-green-500 focus:bg-white transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {['vivres', 'textile', 'electronique', 'divers'].map(cat => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setProductForm({...productForm, category: cat})}
                                    className={`p-4 rounded-xl border-2 font-bold capitalize flex flex-col items-center gap-2 transition-all
                                        ${productForm.category === cat ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 bg-white text-gray-400'}
                                    `}
                                >
                                    {cat === 'vivres' && <Package className="w-6 h-6"/>}
                                    {cat === 'textile' && <TicketPercent className="w-6 h-6"/>}
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            );
        case 2: // PRICE & UNIT
            return (
                <div className="space-y-6 animate-fade-in">
                    <div className="text-center">
                        <h4 className="text-xl font-bold text-gray-800">Combien ça coûte ?</h4>
                        <p className="text-sm text-gray-500">Prix et Unité</p>
                    </div>
                    
                    <div className="flex gap-4">
                        <div className="flex-1">
                             <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Prix Unitaire</label>
                             <div className="relative">
                                 <input 
                                    type="number"
                                    value={productForm.price}
                                    onChange={e => setProductForm({...productForm, price: e.target.value})}
                                    className="w-full p-4 bg-gray-50 rounded-2xl text-2xl font-black text-center outline-none border-2 border-transparent focus:border-green-500"
                                    placeholder="0"
                                 />
                                 <span className="absolute right-4 top-5 font-bold text-gray-400">FCFA</span>
                             </div>
                        </div>
                        <div className="w-1/3">
                             <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Par...</label>
                             <select 
                                value={productForm.unit}
                                onChange={e => setProductForm({...productForm, unit: e.target.value})}
                                className="w-full h-[68px] bg-gray-50 rounded-2xl font-bold text-center outline-none border-2 border-transparent focus:border-green-500"
                             >
                                 <option value="pièce">Pièce</option>
                                 <option value="kg">Kg</option>
                                 <option value="tas">Tas</option>
                                 <option value="sac">Sac</option>
                                 <option value="mètre">Mètre</option>
                             </select>
                        </div>
                    </div>

                    <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                        <div className="flex justify-between items-center mb-2">
                             <span className="font-bold text-orange-800 flex items-center gap-2"><Tag className="w-4 h-4"/> Prix de Gros ?</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <span>Si on prend</span>
                            <input 
                                type="number" 
                                placeholder="3" 
                                value={productForm.wholesaleQty}
                                onChange={e => setProductForm({...productForm, wholesaleQty: e.target.value})}
                                className="w-12 p-1 text-center font-bold rounded border border-orange-200"
                            />
                            <span>{productForm.unit}s, le prix est</span>
                            <input 
                                type="number" 
                                placeholder="1000" 
                                value={productForm.wholesalePrice}
                                onChange={e => setProductForm({...productForm, wholesalePrice: e.target.value})}
                                className="w-20 p-1 text-center font-bold rounded border border-orange-200"
                            />
                            <span>F</span>
                        </div>
                    </div>
                </div>
            );
        case 3: // STOCK & DETAILS
             return (
                <div className="space-y-6 animate-fade-in">
                    <div className="text-center">
                        <h4 className="text-xl font-bold text-gray-800">Stock et Qualité</h4>
                        <p className="text-sm text-gray-500">Ce que le client voit</p>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex flex-col items-center">
                        <label className="text-xs font-bold text-gray-400 uppercase mb-2">Quantité en Stock</label>
                        <div className="flex items-center gap-4">
                            <button 
                                type="button" 
                                onClick={() => setProductForm({...productForm, quantity: Math.max(0, parseInt(productForm.quantity || '0') - 1).toString()})}
                                className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-3xl font-bold text-gray-600 active:bg-gray-200"
                            >-</button>
                            <input 
                                type="number" 
                                value={productForm.quantity}
                                onChange={e => setProductForm({...productForm, quantity: e.target.value})}
                                className="w-24 text-center text-4xl font-black bg-transparent outline-none"
                            />
                            <button 
                                type="button" 
                                onClick={() => setProductForm({...productForm, quantity: (parseInt(productForm.quantity || '0') + 1).toString()})}
                                className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl font-bold text-green-600 active:bg-green-200"
                            >+</button>
                        </div>
                    </div>

                    {/* Freshness Slider */}
                    <div>
                        <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                             <span>Vieux Stock</span>
                             <span>Tout Frais</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={productForm.freshnessLevel} 
                            onChange={e => setProductForm({...productForm, freshnessLevel: parseInt(e.target.value)})}
                            className="w-full h-4 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                        />
                    </div>
                    
                    {/* Simulated Image */}
                    <div className="bg-gray-50 p-4 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 gap-2 cursor-pointer hover:bg-gray-100">
                        <div className="bg-white p-3 rounded-full shadow-sm">
                            <ImageIcon className="w-6 h-6 text-gray-600"/>
                        </div>
                        <span className="text-xs font-bold">Appuyer pour photo (Simulé)</span>
                        <input 
                            type="text" 
                            value={productForm.imageUrl} 
                            onChange={e => setProductForm({...productForm, imageUrl: e.target.value})}
                            placeholder="Ou coller URL ici"
                            className="w-full text-center bg-transparent text-xs outline-none"
                        />
                    </div>
                </div>
             );
        default: return null;
    }
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

      {/* --- TAB 1: OVERVIEW (ID + ALERTS) --- */}
      {activeTab === 'overview' && (
      <div className="space-y-4 animate-fade-in">
        
        {/* Secure Debt Payment Modal */}
        {isPayingDebt && myStall && (
            <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl w-full max-w-sm p-6 text-center animate-fade-in">
                    <h3 className="text-xl font-black text-gray-800 mb-2">Paiement de Dette</h3>
                    <p className="text-gray-500 text-sm mb-6">Pour payer en espèces, vous devez OBLIGATOIREMENT scanner le code de l'agent.</p>
                    
                    {!agentScanned ? (
                        <button 
                            onClick={handleScanAgent}
                            className="w-full aspect-square bg-gray-100 rounded-3xl flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-blue-500 active:bg-blue-50 transition-all"
                        >
                            {isScanMode ? (
                                <RefreshCw className="w-12 h-12 text-blue-500 animate-spin"/>
                            ) : (
                                <Scan className="w-16 h-16 text-gray-400"/>
                            )}
                            <span className="font-bold text-gray-500 mt-4">{isScanMode ? "Recherche..." : "Scanner Agent"}</span>
                        </button>
                    ) : (
                        <div className="bg-green-50 p-6 rounded-3xl border border-green-200 animate-fade-in">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2 text-green-600"><ShieldCheck className="w-8 h-8"/></div>
                            <p className="text-green-800 font-bold mb-4">Agent Authentifié</p>
                            <button onClick={() => { setIsPayingDebt(false); setAgentScanned(false); alert("Paiement validé par l'agent."); }} className="w-full py-4 bg-green-600 text-white font-bold rounded-xl shadow-lg">
                                Remettre Espèces
                            </button>
                        </div>
                    )}
                    
                    <button onClick={() => { setIsPayingDebt(false); setAgentScanned(false); }} className="mt-4 text-gray-400 text-sm font-bold">Annuler</button>
                </div>
            </div>
        )}

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <QrCode className="w-32 h-32 text-gray-900" />
            </div>
            <p className="text-gray-400 font-bold uppercase text-xs tracking-wider mb-1">Mon Emplacement</p>
            {myStall ? (
                <>
                    <h1 className="text-6xl font-black text-gray-800 mb-2">{myStall.number}</h1>
                    <div className="flex items-center gap-2 mb-6">
                        {myStall.healthStatus === 'healthy' ? (
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                <CheckCircle className="w-3 h-3"/> À Jour
                            </span>
                        ) : (
                            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 animate-pulse">
                                <AlertTriangle className="w-3 h-3"/> Dette Active
                            </span>
                        )}
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
                <button onClick={() => handleSpeak("Voici votre QR Code unique. Montrez-le aux agents pour tout contrôle.")} className="bg-blue-600 active:bg-blue-700 text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-lg shadow-blue-200">
                    <QrCode className="w-8 h-8" />
                    <span className="font-bold">Mon QR</span>
                </button>
                {totalDebt > 0 ? (
                    <button onClick={() => setIsPayingDebt(true)} className="bg-red-600 text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-lg shadow-red-200 animate-pulse">
                         <AlertTriangle className="w-8 h-8" />
                         <span className="font-bold text-sm">Payer {totalDebt.toLocaleString()} F</span>
                    </button>
                ) : (
                    <button className="bg-white border-2 border-gray-100 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-600 active:bg-gray-50">
                        <History className="w-8 h-8" />
                        <span className="font-bold">Historique</span>
                    </button>
                )}
            </div>
        </div>
        
        {/* AI Tip Card */}
        {aiTip && (
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 rounded-2xl text-white shadow-lg relative overflow-hidden">
                <Sparkles className="absolute top-2 right-2 text-white/20 w-12 h-12"/>
                <p className="text-xs text-white/60 font-bold uppercase mb-1">Conseil du Jour</p>
                <p className="font-medium text-sm leading-relaxed pr-8">"{aiTip}"</p>
            </div>
        )}
      </div>
      )}

      {/* --- TAB 2: STORE (RAYONS INTELLIGENTS) --- */}
      {activeTab === 'store' && (
        <div className="space-y-6 animate-fade-in">
            
            {/* 1. STOCK DASHBOARD */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase">Valeur Stock</p>
                    <h3 className="text-xl font-black text-gray-800">{stockValue.toLocaleString()} <span className="text-xs font-normal">F</span></h3>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase">En Rupture</p>
                    <h3 className={`text-xl font-black ${lowStockCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{lowStockCount}</h3>
                </div>
            </div>

            {/* 2. ACTION BAR */}
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400"/>
                    <input 
                        placeholder="Rechercher produit..." 
                        value={storeSearch}
                        onChange={(e) => setStoreSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-gray-100 shadow-sm outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>
                <button onClick={() => handleOpenProductModal()} className="bg-green-600 text-white px-4 rounded-2xl shadow-lg shadow-green-200 flex items-center justify-center">
                    <Plus className="w-6 h-6"/>
                </button>
            </div>

            {/* 3. SHELF FILTERS (Catégories) */}
            <div className="overflow-x-auto pb-2 no-scrollbar">
                <div className="flex gap-2">
                    {availableCategories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setStoreCategoryFilter(cat)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap border-2 transition-all
                                ${storeCategoryFilter === cat ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-gray-100 text-gray-500'}
                            `}
                        >
                            {cat === 'all' ? 'Tout le stock' : cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* 4. TOOLS (Sort) */}
            <div className="flex justify-between items-center text-xs font-bold text-gray-400 px-2">
                <span>{filteredProducts.length} produits trouvés</span>
                <button onClick={() => setStoreSort(prev => prev === 'stock_low' ? 'price_high' : 'stock_low')} className="flex items-center gap-1 hover:text-purple-600">
                    <ArrowUpDown className="w-3 h-3"/> {storeSort === 'stock_low' ? 'Urgence Stock' : 'Prix'}
                </button>
            </div>

            {/* 5. VISUAL INVENTORY GRID */}
            <div className="space-y-3 pb-24">
                {filteredProducts.map(product => (
                    <div key={product.id} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex gap-4 items-stretch relative overflow-hidden">
                        {/* Status Bar Indicator */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${product.stockQuantity === 0 ? 'bg-red-500' : product.stockQuantity < 5 ? 'bg-orange-500' : 'bg-green-500'}`}></div>

                        {/* Image */}
                        <div className="w-24 h-24 bg-gray-50 rounded-xl shrink-0 overflow-hidden relative group self-center">
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
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                            <div>
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-gray-800 text-base leading-tight truncate pr-2">{product.name}</h3>
                                    <button onClick={() => handleOpenProductModal(product)} className="text-gray-400 hover:text-blue-600"><Edit className="w-4 h-4"/></button>
                                </div>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="font-black text-gray-800">{product.isPromo ? product.promoPrice : product.price} F</span>
                                    {product.isPromo && <span className="text-xs text-gray-400 line-through">{product.price} F</span>}
                                </div>
                            </div>
                            
                            {/* Stock & Quick Actions */}
                            <div className="flex items-end justify-between mt-2">
                                <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1 border border-gray-100">
                                    <button onClick={() => handleQuickStockUpdate(product, -1)} className="p-1 hover:bg-gray-200 rounded text-gray-500"><Minus className="w-4 h-4"/></button>
                                    <span className={`font-bold w-6 text-center ${product.stockQuantity < 5 ? 'text-red-600' : 'text-gray-800'}`}>{product.stockQuantity}</span>
                                    <button onClick={() => handleQuickStockUpdate(product, 1)} className="p-1 hover:bg-gray-200 rounded text-gray-500"><Plus className="w-4 h-4"/></button>
                                </div>

                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleTogglePromo(product)}
                                        className={`p-2 rounded-lg ${product.isPromo ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}
                                        title="Activer/Désactiver Promo"
                                    >
                                        <TicketPercent className="w-4 h-4"/>
                                    </button>
                                    <button 
                                        onClick={() => handleDuplicateProduct(product)}
                                        className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                                        title="Dupliquer"
                                    >
                                        <Copy className="w-4 h-4"/>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {filteredProducts.length === 0 && (
                    <div className="text-center py-12">
                        <Package className="w-16 h-16 text-gray-200 mx-auto mb-4"/>
                        <p className="text-gray-400">Rayon vide.</p>
                        <button onClick={() => handleOpenProductModal()} className="mt-4 text-purple-600 font-bold text-sm">Ajouter un produit</button>
                    </div>
                )}
            </div>

            {/* PRODUCT MODAL (WIZARD) */}
            {isProductModalOpen && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm animate-fade-in relative my-auto">
                        <button onClick={() => setIsProductModalOpen(false)} className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full z-10"><X className="w-5 h-5"/></button>
                        
                        {/* Progress */}
                        <div className="flex justify-center gap-2 mb-6 mt-2">
                             {[1, 2, 3].map(step => (
                                 <div key={step} className={`h-1.5 w-8 rounded-full ${step <= wizardStep ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                             ))}
                        </div>

                        <form onSubmit={handleProductSubmit}>
                            {renderWizardStep()}

                            <div className="mt-8 flex gap-3">
                                {wizardStep > 1 && (
                                    <button type="button" onClick={() => setWizardStep(prev => prev - 1)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold">
                                        Retour
                                    </button>
                                )}
                                {wizardStep < 3 ? (
                                    <button type="button" onClick={() => setWizardStep(prev => prev + 1)} className="flex-1 py-4 bg-green-600 text-white rounded-2xl font-bold shadow-lg shadow-green-200">
                                        Suivant
                                    </button>
                                ) : (
                                    <button type="submit" className="flex-1 py-4 bg-green-600 text-white rounded-2xl font-bold shadow-lg shadow-green-200">
                                        Terminer
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
      )}

      {/* --- TAB 3: LOGISTICS --- */}
      {activeTab === 'logistics' && (
           <div className="space-y-6 animate-fade-in">
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
                              <p className="mt-4 text-xs text-orange-100">Renouvellement automatique</p>
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
           <div className="space-y-6 animate-fade-in">
               {/* Feedback Message */}
               {settingsMsg && (
                   <div className={`p-4 rounded-xl flex items-center gap-3 ${settingsMsg.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                       {settingsMsg.type === 'success' ? <CheckCircle className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>}
                       <p className="text-sm font-bold">{settingsMsg.text}</p>
                   </div>
               )}

               {/* Profile Photo */}
               <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center">
                   <div onClick={handlePhotoUpload} className="relative cursor-pointer group">
                       <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden border-4 border-white shadow-lg">
                           {profile.photoUrl ? (
                               <img src={profile.photoUrl} alt="Avatar" className="w-full h-full object-cover"/>
                           ) : (
                               <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 font-bold text-2xl">
                                   {profile.name.charAt(0)}
                               </div>
                           )}
                       </div>
                       <div className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-md border border-gray-200 group-hover:scale-110 transition-transform">
                           <Camera className="w-4 h-4 text-gray-600"/>
                       </div>
                   </div>
                   <p className="mt-3 text-xs text-gray-400">Appuyez pour changer</p>
               </div>

               {/* Personal Info Form */}
               <form onSubmit={handleUpdateProfile} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                   <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2 border-b border-gray-100 pb-2">
                       <User className="w-5 h-5 text-blue-600"/> Mes Infos
                   </h3>
                   
                   <div>
                       <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nom d'affichage</label>
                       <input 
                          type="text" 
                          value={profileForm.name} 
                          onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                          className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-800"
                       />
                   </div>
                   <div>
                       <label className="text-xs font-bold text-gray-400 uppercase ml-1">Téléphone</label>
                       <input 
                          type="tel" 
                          value={profileForm.phone} 
                          onChange={e => setProfileForm({...profileForm, phone: e.target.value})}
                          className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-800"
                       />
                   </div>
                   <div>
                       <label className="text-xs font-bold text-gray-400 uppercase ml-1">Bio Boutique</label>
                       <textarea 
                          value={profileForm.bio} 
                          onChange={e => setProfileForm({...profileForm, bio: e.target.value})}
                          placeholder="Décrivez votre étal..."
                          className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700 h-24 resize-none"
                       />
                   </div>
                   
                   <button 
                      type="submit" 
                      disabled={isSavingProfile}
                      className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 disabled:bg-gray-300 flex items-center justify-center gap-2"
                   >
                       {isSavingProfile ? "Enregistrement..." : <><Save className="w-4 h-4"/> Enregistrer</>}
                   </button>
               </form>

               {/* Password Form */}
               <form onSubmit={handleChangePassword} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                   <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2 border-b border-gray-100 pb-2">
                       <Lock className="w-5 h-5 text-orange-600"/> Sécurité
                   </h3>

                    <div>
                       <label className="text-xs font-bold text-gray-400 uppercase ml-1">Ancien Mot de Passe (Requis)</label>
                       <input 
                          type="password" 
                          value={passForm.current} 
                          onChange={e => setPassForm({...passForm, current: e.target.value})}
                          placeholder="••••••••"
                          required
                          className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-orange-500 font-bold text-gray-800"
                       />
                   </div>
                   
                   <div>
                       <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nouveau Mot de Passe</label>
                       <input 
                          type="password" 
                          value={passForm.new} 
                          onChange={e => setPassForm({...passForm, new: e.target.value})}
                          placeholder="••••••••"
                          className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-orange-500 font-bold text-gray-800"
                       />
                   </div>
                   <div>
                       <label className="text-xs font-bold text-gray-400 uppercase ml-1">Confirmer Nouveau</label>
                       <input 
                          type="password" 
                          value={passForm.confirm} 
                          onChange={e => setPassForm({...passForm, confirm: e.target.value})}
                          placeholder="••••••••"
                          className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-orange-500 font-bold text-gray-800"
                       />
                   </div>

                   <button 
                      type="submit" 
                      disabled={isSavingPass || !passForm.current}
                      className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl shadow-lg disabled:bg-gray-300 flex items-center justify-center gap-2"
                   >
                       {isSavingPass ? "Modification..." : "Changer Mot de Passe"}
                   </button>
               </form>

               {/* Danger Zone */}
               <div className="pt-8 bg-red-50 p-6 rounded-3xl border border-red-100">
                    <h3 className="font-bold text-red-800 text-lg flex items-center gap-2 mb-4">
                       <AlertTriangle className="w-5 h-5"/> Zone de Danger
                   </h3>
                   <p className="text-sm text-red-600 mb-4">
                       La suppression est définitive. Vous perdrez votre historique, vos produits et votre solde.
                   </p>
                   {!showDeleteConfirm ? (
                       <button type="button" onClick={() => setShowDeleteConfirm(true)} className="w-full py-3 bg-white border border-red-200 text-red-600 font-bold text-sm hover:bg-red-100 rounded-xl transition-colors">
                           Supprimer mon compte
                       </button>
                   ) : (
                       <div className="space-y-3 animate-fade-in">
                           <p className="text-xs font-bold text-red-800 uppercase">Pour confirmer, écrivez "SUPPRIMER" :</p>
                           <input 
                                type="text" 
                                value={deleteInput}
                                onChange={e => setDeleteInput(e.target.value)}
                                placeholder="SUPPRIMER"
                                className="w-full p-3 bg-white border border-red-300 rounded-xl font-bold text-red-600 focus:ring-2 focus:ring-red-500 outline-none"
                           />
                           
                           <p className="text-xs font-bold text-red-800 uppercase mt-2">Mot de passe de sécurité :</p>
                           <input 
                                type="password" 
                                value={deletePassword}
                                onChange={e => setDeletePassword(e.target.value)}
                                placeholder="Votre mot de passe"
                                className="w-full p-3 bg-white border border-red-300 rounded-xl font-bold text-red-600 focus:ring-2 focus:ring-red-500 outline-none"
                           />

                           <div className="flex gap-2 mt-4">
                               <button onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); setDeletePassword(''); }} className="flex-1 py-3 bg-gray-200 text-gray-600 font-bold rounded-xl">Annuler</button>
                               <button onClick={handleDeleteAccount} disabled={deleteInput !== 'SUPPRIMER' || !deletePassword || isDeleting} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl disabled:bg-red-300">
                                   {isDeleting ? "Adieu..." : "Confirmer"}
                               </button>
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
