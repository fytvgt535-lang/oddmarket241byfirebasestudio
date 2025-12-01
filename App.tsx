
import React, { useState, useEffect } from 'react';
import { Store, LogOut } from 'lucide-react';
import { supabase } from './supabaseClient';
import * as SupabaseService from './services/supabaseService';

import MarketMap from './components/MarketMap';
import HygieneReportForm from './components/HygieneReport';
import AdminDashboard from './components/AdminDashboard';
import VendorDashboard from './components/VendorDashboard';
import AgentFieldTool from './components/AgentFieldTool';
import PublicMarketplace from './components/PublicMarketplace';
import NetworkStatus from './components/NetworkStatus';
import LoginScreen from './components/Auth/LoginScreen';
import RegisterScreen from './components/Auth/RegisterScreen';

import { 
  Stall, HygieneReport, Transaction, VendorProfile, 
  Market, Agent, Expense, Sanction, PaymentPlan, 
  Receipt, Product, ClientOrder, AppNotification, User 
} from './types';

// --- MOCK DATA FALLBACKS ---
const INITIAL_MARKETS: Market[] = [
  { id: 'm1', name: 'Marché Mont-Bouët', location: 'Libreville Centre', targetRevenue: 50000000 },
  { id: 'm2', name: 'Marché Akébé', location: '3ème Arrondissement', targetRevenue: 15000000 },
  { id: 'm3', name: 'Marché Louis', location: '1er Arrondissement', targetRevenue: 8000000 }
];

const App: React.FC = () => {
  // --- AUTH STATE ---
  const [session, setSession] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [loginError, setLoginError] = useState<string>('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // --- APP STATE ---
  const [currentView, setCurrentView] = useState<'map' | 'report' | 'dashboard' | 'profile' | 'agent-tool' | 'marketplace'>('map');
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Data from Supabase
  const [users, setUsers] = useState<User[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Local state for non-critical features
  const [reports, setReports] = useState<HygieneReport[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [selectedPublicMarketId, setSelectedPublicMarketId] = useState<string>('m1');

  // New: Specific state for extra profile fields not in User type
  const [vendorDetails, setVendorDetails] = useState<{bio?: string, photoUrl?: string}>({});

  // --- 1. INITIALIZATION & AUTH ---
  useEffect(() => {
    // Check session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'SIGNED_OUT' || !session) {
          setCurrentUser(null);
          setAuthView('login');
      } else if (session?.user) {
          fetchUserProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- 2. DATA FETCHING ---
  useEffect(() => {
    const loadData = async () => {
      if (!session) return;
      
      setIsDataLoading(true);
      try {
        const [fetchedMarkets, fetchedStalls, fetchedProducts, fetchedTrans] = await Promise.all([
          SupabaseService.fetchMarkets(),
          SupabaseService.fetchStalls(),
          SupabaseService.fetchProducts(),
          SupabaseService.fetchTransactions()
        ]);

        setMarkets(fetchedMarkets.length > 0 ? fetchedMarkets : INITIAL_MARKETS);
        setStalls(fetchedStalls);
        setProducts(fetchedProducts);
        setTransactions(fetchedTrans);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsDataLoading(false);
      }
    };

    loadData();

    if (session) {
      const marketSub = SupabaseService.subscribeToTable('markets', () => loadData());
      const stallSub = SupabaseService.subscribeToTable('stalls', () => loadData());
      const productSub = SupabaseService.subscribeToTable('products', () => loadData());
      
      return () => {
        marketSub.unsubscribe();
        stallSub.unsubscribe();
        productSub.unsubscribe();
      };
    }
  }, [session]);

  const fetchUserProfile = async (userId: string) => {
    try {
      const profile = await SupabaseService.getCurrentUserProfile(userId);
      
      if (profile) {
        setCurrentUser({
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role,
          phone: profile.phone,
          isBanned: profile.is_banned,
          kycStatus: profile.kyc_status,
          passwordHash: '***',
          createdAt: new Date(profile.created_at).getTime()
        });
        
        // Load extra details
        setVendorDetails({
            bio: profile.bio,
            photoUrl: profile.avatar_url
        });
        
        // Auto-route
        if (profile.role === 'admin') setCurrentView('dashboard');
        else if (profile.role === 'agent') setCurrentView('agent-tool');
        else if (profile.role === 'vendor') setCurrentView('map');
      } else {
        console.warn("Profil introuvable pour cet utilisateur auth.");
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
             setCurrentUser({
                 id: user.id,
                 email: user.email || '',
                 name: user.user_metadata?.name || 'Utilisateur',
                 role: user.user_metadata?.role || 'vendor',
                 phone: '',
                 isBanned: false,
                 kycStatus: 'pending',
                 createdAt: Date.now(),
                 passwordHash: '***'
             });
             setCurrentView('map');
        }
      }
    } catch (error: any) {
      console.error("Profile fetch error", error);
    }
  };

  // --- HANDLERS ---

  const handleLogin = async (email: string, pass: string) => {
    setIsAuthLoading(true);
    setLoginError('');
    try {
      await SupabaseService.signInUser(email, pass);
    } catch (error: any) {
      setLoginError(error.message || "Email ou mot de passe incorrect.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleRegister = async (data: any) => {
    setIsAuthLoading(true);
    try {
      const result = await SupabaseService.signUpUser(data.email, data.password, {
        name: data.name,
        role: 'vendor',
        kycDocument: {
           type: data.identityType,
           number: data.identityNumber,
           fileUrl: data.identityFile,
           uploadedAt: Date.now()
        }
      });

      if (result.session) {
         // Auto-login success handled by onAuthStateChange
      } else {
         alert("Compte créé. Connectez-vous.");
         setAuthView('login');
      }
    } catch (error: any) {
      console.error(error);
      alert("Erreur: " + (error.message || "Inscription impossible"));
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await SupabaseService.signOutUser();
    // Logic handled by onAuthStateChange
  };

  const handleAddProduct = async (productData: Omit<Product, 'id'>) => {
    try {
       await SupabaseService.createProduct(productData);
    } catch (e) { console.error(e); }
  };

  const handleUpdateLocalProfile = (updates: Partial<VendorProfile>) => {
      // Update local state immediately for UI responsiveness
      if (currentUser) {
          setCurrentUser(prev => prev ? ({ ...prev, name: updates.name || prev.name, phone: updates.phone || prev.phone }) : null);
      }
      setVendorDetails(prev => ({
          ...prev,
          bio: updates.bio !== undefined ? updates.bio : prev.bio,
          photoUrl: updates.photoUrl !== undefined ? updates.photoUrl : prev.photoUrl
      }));
  };

  // --- RENDER ---

  if (currentUser?.role === 'guest') {
    return (
      <PublicMarketplace 
          stalls={stalls} 
          markets={markets} 
          products={products}
          activeMarketId={selectedPublicMarketId}
          onMarketChange={setSelectedPublicMarketId}
          onBack={handleLogout}
      />
    );
  }

  if (!session && !currentUser) {
    if (authView === 'register') {
      return (
        <RegisterScreen 
          onRegister={handleRegister} 
          onBackToLogin={() => setAuthView('login')} 
          isLoading={isAuthLoading}
        />
      );
    }
    return <LoginScreen 
      onLogin={handleLogin} 
      onGoToRegister={() => setAuthView('register')} 
      onGuestAccess={() => setCurrentUser({ id: 'guest', role: 'guest', name: 'Visiteur', email: '', phone: '', passwordHash: '', isBanned: false, kycStatus: 'none', createdAt: 0 })}
      error={loginError}
      isLoading={isAuthLoading}
    />;
  }

  if (!currentUser) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full"></div></div>;
  }

  const role = currentUser.role;
  const vendorProfile: VendorProfile = {
      id: currentUser.id,
      userId: currentUser.id,
      name: currentUser.name,
      phone: currentUser.phone,
      stallId: stalls.find(s => s.occupantId === currentUser.id)?.id, 
      hygieneScore: 4.5,
      language: 'fr',
      isLogisticsSubscribed: false,
      bio: vendorDetails.bio,
      photoUrl: vendorDetails.photoUrl
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
      <NetworkStatus />
      
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
               <div className={`p-2 rounded-lg ${role === 'admin' ? 'bg-purple-600' : role === 'agent' ? 'bg-blue-600' : 'bg-green-600'}`}>
                <Store className="w-5 h-5 text-white" />
              </div>
              <div className="leading-tight">
                <h1 className="text-lg font-bold text-gray-900">MarchéConnect</h1>
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                   {currentUser.name}
                </p>
              </div>
            </div>

            <nav className="flex items-center gap-2">
               <button onClick={handleLogout} className="text-gray-500 hover:text-red-600 font-bold text-sm px-3 py-2 hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors">
                   <LogOut className="w-4 h-4"/>
                   <span className="hidden md:inline">Déconnexion</span>
               </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
         {currentView === 'map' && role === 'vendor' && (
             <VendorDashboard 
                profile={vendorProfile} 
                transactions={transactions.filter(t => t.stallNumber === vendorProfile.stallId)} 
                receipts={receipts}
                myStall={stalls.find(s => s.id === vendorProfile.stallId)}
                myReports={reports}
                sanctions={sanctions}
                products={products.filter(p => p.stallId === vendorProfile.stallId)}
                orders={orders}
                notifications={notifications}
                onAddProduct={handleAddProduct}
                onUpdateProduct={(id, updates) => setProducts(prev => prev.map(p => p.id === id ? {...p, ...updates} : p))}
                onDeleteProduct={(id) => setProducts(prev => prev.filter(p => p.id !== id))}
                onUpdateOrderStatus={() => {}}
                onUpdateProfile={handleUpdateLocalProfile}
             />
         )}

         {currentView === 'dashboard' && role === 'admin' && (
             <AdminDashboard 
                markets={markets}
                stalls={stalls}
                reports={reports}
                transactions={transactions}
                receipts={receipts}
                agents={agents}
                expenses={expenses}
                paymentPlans={paymentPlans}
                notifications={notifications}
                sanctions={sanctions}
                users={users}
                onSendSms={() => {}}
                onApprovePlan={() => {}}
                onAddMarket={() => {}}
                onUpdateMarket={() => {}}
                onDeleteMarket={() => {}}
             />
         )}

         {currentView === 'agent-tool' && role === 'agent' && (
             <AgentFieldTool 
                stalls={stalls}
                sanctions={sanctions}
                agentLogs={[]}
                cashInHand={0}
                isShiftActive={true}
                onCollectPayment={() => {}}
                onIssueSanction={() => {}}
                onShiftAction={() => {}}
             />
         )}
      </main>
    </div>
  );
};

export default App;
