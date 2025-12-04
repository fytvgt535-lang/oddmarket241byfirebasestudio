
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { QrCode, MapPin, ListChecks, Heart, Settings, LogOut, Plus, Trash2, CheckCircle, Home, Briefcase, Star, Edit3, Camera, Loader2, X, Search, Bell } from 'lucide-react';
import { User as UserType, ShoppingItem, UserAddress, Stall, Language } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import toast from 'react-hot-toast';
import { signOutUser, uploadFile, updateUserProfile, getCurrentUserProfile } from '../../services/supabaseService';
import { supabase } from '../../supabaseClient';

interface ClientProfileProps {
  stalls: Stall[]; // Needed for favorites selection
}

const ClientProfile: React.FC<ClientProfileProps> = ({ stalls }) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'shopping' | 'addresses'>('general');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // --- STATE FOR FEATURES ---
  // Favorites
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [favSearch, setFavSearch] = useState('');
  
  // Preferences
  const [isPrefsOpen, setIsPrefsOpen] = useState(false);
  const [prefs, setPrefs] = useState({ 
      language: 'fr' as Language, 
      notifications: { push: true, sms: false, email: true } 
  });

  // Shopping List
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [newItemName, setNewItemName] = useState('');

  // Addresses
  const [addresses, setAddresses] = useState<UserAddress[]>([
    { id: '1', label: 'Maison', details: 'Quartier Louis, montée Ckdo', isDefault: true }
  ]);
  const [newAddr, setNewAddr] = useState({ label: '', details: '' });
  const [isAddingAddr, setIsAddingAddr] = useState(false);

  // --- DATA LOADING ---
  useEffect(() => {
      // Self-fetch user to ensure we have the latest data including favorites/prefs
      const loadUser = async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
              const profile = await getCurrentUserProfile(session.user.id);
              if (profile) {
                  setUser({
                      ...profile,
                      // Mapping legacy or new fields
                      favorites: profile.favorites || [],
                      preferences: profile.preferences || { language: 'fr', notifications: { push: true, sms: false, email: true } }
                  });
                  if (profile.preferences) setPrefs(profile.preferences);
              }
          }
      };
      loadUser();
  }, []);

  const handleUpdateUser = async (updates: Partial<UserType>) => {
      if (!user) return;
      try {
          await updateUserProfile(user.id, updates);
          setUser(prev => prev ? { ...prev, ...updates } : null);
          toast.success("Mise à jour effectuée");
      } catch (e: any) {
          toast.error("Erreur mise à jour");
      }
  };

  // --- IMAGE UPLOAD ---
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          setIsUploading(true);
          try {
              const file = e.target.files[0];
              const url = await uploadFile(file, 'avatars');
              await handleUpdateUser({ photoUrl: url });
          } catch (e: any) {
              toast.error(e.message);
          } finally {
              setIsUploading(false);
          }
      }
  };

  // --- FAVORITES LOGIC ---
  const myFavorites = useMemo(() => {
      if (!user?.favorites) return [];
      return stalls.filter(s => user.favorites?.includes(s.occupantId || ''));
  }, [user?.favorites, stalls]);

  const toggleFavorite = async (vendorId: string) => {
      if (!user) return;
      const currentFavs = user.favorites || [];
      let newFavs;
      if (currentFavs.includes(vendorId)) {
          newFavs = currentFavs.filter(id => id !== vendorId);
          toast.success("Retiré des favoris");
      } else {
          newFavs = [...currentFavs, vendorId];
          toast.success("Ajouté aux favoris");
      }
      // Optimistic update
      setUser({ ...user, favorites: newFavs });
      await updateUserProfile(user.id, { favorites: newFavs } as any); 
  };

  // --- PREFERENCES LOGIC ---
  const savePreferences = async () => {
      if (!user) return;
      await handleUpdateUser({ preferences: prefs } as any);
      setIsPrefsOpen(false);
  };

  // --- SHOPPING LIST LOGIC ---
  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const newItem: ShoppingItem = { id: Date.now().toString(), name: newItemName, isChecked: false };
    setShoppingList([newItem, ...shoppingList]);
    setNewItemName('');
    toast.success("Ajouté à la liste !");
  };

  const toggleItem = (id: string) => {
    setShoppingList(prev => prev.map(item => item.id === id ? { ...item, isChecked: !item.isChecked } : item));
  };

  const deleteItem = (id: string) => {
    setShoppingList(prev => prev.filter(item => item.id !== id));
  };

  // --- ADDRESS LOGIC ---
  const addAddress = () => {
    if (!newAddr.label || !newAddr.details) return;
    const newAddressObj = { id: Date.now().toString(), label: newAddr.label, details: newAddr.details, isDefault: false };
    const updatedAddresses = [...addresses, newAddressObj];
    setAddresses(updatedAddresses);
    // Persist
    handleUpdateUser({ addresses: updatedAddresses });
    setNewAddr({ label: '', details: '' });
    setIsAddingAddr(false);
  };

  if (!user) return <div className="p-10 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-500"/></div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto pb-20">
      
      {/* 1. CARTE DE FIDÉLITÉ DIGITALE */}
      <Card variant="gradient" className="relative overflow-hidden min-h-[220px] flex flex-col justify-between p-6">
        <div className="absolute top-0 right-0 p-8 opacity-10"><QrCode className="w-48 h-48"/></div>
        
        <div className="flex justify-between items-start relative z-10">
          <div className="flex items-center gap-4">
            <button className="relative group cursor-pointer bg-transparent border-none p-0" onClick={() => fileInputRef.current?.click()} aria-label="Changer photo de profil">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/50 flex items-center justify-center text-2xl font-bold text-white shadow-lg overflow-hidden">
                    {user.photoUrl ? <img src={user.photoUrl} className="w-full h-full object-cover" alt="Profil"/> : user.name?.charAt(0) || 'C'}
                </div>
                <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {isUploading ? <Loader2 className="w-5 h-5 animate-spin text-white"/> : <Camera className="w-5 h-5 text-white"/>}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect}/>
            </button>
            <div>
              <p className="text-orange-100 text-xs font-bold uppercase tracking-wider">Carte Membre</p>
              <h2 className="text-2xl font-black text-white leading-tight">{user.name || 'Client'}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-white/20 text-white border-transparent backdrop-blur-md">
                  <Star className="w-3 h-3 mr-1 fill-white"/> Gourmet
                </Badge>
              </div>
            </div>
          </div>
          <button className="bg-white text-orange-600 p-2 rounded-xl shadow-lg active:scale-95 transition-transform" onClick={() => toast("QR Code affiché !")} aria-label="Afficher QR Code">
            <QrCode className="w-6 h-6"/>
          </button>
        </div>

        <div className="relative z-10 mt-6">
          <div className="flex justify-between text-xs text-orange-100 font-medium mb-1">
            <span>Points Fidélité</span>
            <span>{user.loyaltyPoints || 0} / 500</span>
          </div>
          <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden">
            <div className="bg-white h-full rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ width: `${((user.loyaltyPoints || 0) / 500) * 100}%` }}></div>
          </div>
          <p className="text-[10px] text-orange-200 mt-2 text-right">Prochaine récompense : Panier garni (500 pts)</p>
        </div>
      </Card>

      {/* 2. NAVIGATION RAPIDE */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {[
          { id: 'general', label: 'Général', icon: Settings },
          { id: 'shopping', label: 'Liste Courses', icon: ListChecks },
          { id: 'addresses', label: 'Adresses', icon: MapPin },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap
              ${activeTab === tab.id 
                ? 'bg-gray-900 text-white shadow-lg' 
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}
            `}
          >
            <tab.icon className="w-4 h-4"/>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. CONTENU DYNAMIQUE */}
      
      {activeTab === 'general' && (
        <div className="space-y-4 animate-slide-up">
          <Card className="divide-y divide-gray-100">
            {/* FAVORITES TRIGGER - FIXED A11Y */}
            <button onClick={() => setIsFavoritesOpen(true)} className="w-full p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors text-left">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-100 text-pink-600 rounded-full"><Heart className="w-5 h-5"/></div>
                <div>
                  <p className="font-bold text-gray-900">Mes Vendeurs Favoris</p>
                  <p className="text-xs text-gray-500">{myFavorites.length} vendeurs enregistrés</p>
                </div>
              </div>
              <Edit3 className="w-4 h-4 text-gray-400"/>
            </button>

            {/* PREFERENCES TRIGGER - FIXED A11Y */}
            <button onClick={() => setIsPrefsOpen(true)} className="w-full p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors text-left">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-full"><Settings className="w-5 h-5"/></div>
                <div>
                  <p className="font-bold text-gray-900">Préférences</p>
                  <p className="text-xs text-gray-500">Langue, Notifications</p>
                </div>
              </div>
              <Edit3 className="w-4 h-4 text-gray-400"/>
            </button>
          </Card>

          <Button variant="outline" className="w-full text-red-600 border-red-100 hover:bg-red-50" onClick={signOutUser}>
            <LogOut className="w-4 h-4"/> Se Déconnecter
          </Button>
        </div>
      )}

      {/* ... (Rest of tabs remain identical but correct divs are used) ... */}
      {activeTab === 'shopping' && (
        <div className="space-y-4 animate-slide-up">
          <Card className="p-4 bg-yellow-50 border-yellow-100">
            <h3 className="font-bold text-yellow-800 mb-3 flex items-center gap-2"><ListChecks className="w-5 h-5"/> Ma Liste de Courses</h3>
            <form onSubmit={addItem} className="flex gap-2 mb-4">
              <Input 
                placeholder="Ex: Tomates, Manioc..." 
                value={newItemName} 
                onChange={e => setNewItemName(e.target.value)} 
                className="bg-white border-yellow-200"
              />
              <Button type="submit" className="bg-yellow-600 text-white hover:bg-yellow-700 shadow-none"><Plus className="w-5 h-5"/></Button>
            </form>
            
            <div className="space-y-2">
              {shoppingList.length === 0 && <p className="text-center text-yellow-600/50 text-sm py-4 italic">Votre liste est vide.</p>}
              {shoppingList.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-yellow-100 shadow-sm">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleItem(item.id)}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${item.isChecked ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                      {item.isChecked && <CheckCircle className="w-3 h-3 text-white"/>}
                    </div>
                    <span className={`font-medium ${item.isChecked ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{item.name}</span>
                  </div>
                  <button onClick={() => deleteItem(item.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'addresses' && (
        <div className="space-y-4 animate-slide-up">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-bold text-gray-800">Mes Adresses</h3>
            <Button size="sm" onClick={() => setIsAddingAddr(!isAddingAddr)} variant={isAddingAddr ? 'secondary' : 'primary'}>
              {isAddingAddr ? 'Annuler' : 'Ajouter'}
            </Button>
          </div>

          {isAddingAddr && (
            <Card className="p-4 bg-blue-50 border-blue-100 animate-fade-in">
              <div className="space-y-3">
                <Input placeholder="Nom (ex: Bureau)" value={newAddr.label} onChange={e => setNewAddr({...newAddr, label: e.target.value})} className="bg-white"/>
                <Input placeholder="Détails (ex: Quartier X, près de Y)" value={newAddr.details} onChange={e => setNewAddr({...newAddr, details: e.target.value})} className="bg-white"/>
                <Button onClick={addAddress} className="w-full">Enregistrer</Button>
              </div>
            </Card>
          )}

          {addresses.map(addr => (
            <div key={addr.id} className="p-4 bg-white border border-gray-100 rounded-2xl flex items-start gap-4 hover:border-blue-300 transition-colors shadow-sm">
              <div className={`p-3 rounded-full ${addr.label.toLowerCase().includes('maison') ? 'bg-green-100 text-green-600' : addr.label.toLowerCase().includes('bureau') ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                {addr.label.toLowerCase().includes('maison') ? <Home className="w-5 h-5"/> : addr.label.toLowerCase().includes('bureau') ? <Briefcase className="w-5 h-5"/> : <MapPin className="w-5 h-5"/>}
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <h4 className="font-bold text-gray-900">{addr.label}</h4>
                  {addr.isDefault && <Badge variant="info">Par défaut</Badge>}
                </div>
                <p className="text-sm text-gray-500 mt-1">{addr.details}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- MODALS --- */}

      {/* FAVORITES MODAL */}
      {isFavoritesOpen && (
          <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
              <Card className="w-full max-w-md h-[80vh] flex flex-col relative overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                      <h3 className="text-lg font-bold text-gray-900">Mes Favoris</h3>
                      <button onClick={() => setIsFavoritesOpen(false)}><X className="w-6 h-6 text-gray-400"/></button>
                  </div>
                  
                  <div className="p-4 bg-gray-50">
                      <Input leftIcon={Search} placeholder="Rechercher vendeur..." value={favSearch} onChange={e => setFavSearch(e.target.value)} className="bg-white"/>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                      {stalls
                        .filter(s => s.status === 'occupied' && s.occupantName?.toLowerCase().includes(favSearch.toLowerCase()))
                        .map(stall => {
                            const isFav = user.favorites?.includes(stall.occupantId || '');
                            return (
                                <div key={stall.id} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center font-bold text-green-700">{stall.occupantName?.charAt(0)}</div>
                                        <div>
                                            <p className="font-bold text-gray-800 text-sm">{stall.occupantName}</p>
                                            <p className="text-xs text-gray-500">{stall.zone} • {stall.productType}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => toggleFavorite(stall.occupantId || '')} className={`p-2 rounded-full transition-colors ${isFav ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                                        <Heart className={`w-5 h-5 ${isFav ? 'fill-current' : ''}`}/>
                                    </button>
                                </div>
                            );
                        })
                      }
                  </div>
              </Card>
          </div>
      )}

      {/* PREFERENCES MODAL */}
      {isPrefsOpen && (
          <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
              <Card className="w-full max-w-sm relative">
                  <button onClick={() => setIsPrefsOpen(false)} className="absolute top-4 right-4"><X className="w-5 h-5 text-gray-400"/></button>
                  <div className="p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2"><Settings className="w-5 h-5"/> Préférences</h3>
                      
                      <div className="space-y-6">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Langue</label>
                              <div className="grid grid-cols-3 gap-2">
                                  {['fr', 'fang', 'mpongwe'].map((l) => (
                                      <button 
                                        key={l}
                                        onClick={() => setPrefs({...prefs, language: l as any})}
                                        className={`py-2 text-sm font-bold rounded-lg border transition-all ${prefs.language === l ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}
                                      >
                                          {l === 'fr' ? 'Français' : l.charAt(0).toUpperCase() + l.slice(1)}
                                      </button>
                                  ))}
                              </div>
                          </div>

                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Notifications</label>
                              <div className="space-y-3">
                                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                      <div className="flex items-center gap-3">
                                          <Bell className="w-5 h-5 text-gray-600"/>
                                          <span className="text-sm font-medium text-gray-800">Push App</span>
                                      </div>
                                      <input type="checkbox" checked={prefs.notifications.push} onChange={e => setPrefs({...prefs, notifications: { ...prefs.notifications, push: e.target.checked }})} className="w-5 h-5 accent-blue-600"/>
                                  </div>
                                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                      <div className="flex items-center gap-3">
                                          <div className="font-bold text-xs bg-gray-200 px-1 rounded text-gray-600">SMS</div>
                                          <span className="text-sm font-medium text-gray-800">SMS</span>
                                      </div>
                                      <input type="checkbox" checked={prefs.notifications.sms} onChange={e => setPrefs({...prefs, notifications: { ...prefs.notifications, sms: e.target.checked }})} className="w-5 h-5 accent-blue-600"/>
                                  </div>
                              </div>
                          </div>

                          <Button onClick={savePreferences} className="w-full">Enregistrer</Button>
                      </div>
                  </div>
              </Card>
          </div>
      )}

    </div>
  );
};

export default ClientProfile;
