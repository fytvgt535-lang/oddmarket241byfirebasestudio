
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

// --- MOCK DATA FALLBACKS (Si la DB est vide au départ) ---
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
  const [isAuthLoading, setIsAuthLoading] = useState(false); // New loading state for auth

  // --- APP STATE ---
  const [currentView, setCurrentView] = useState<'map' | 'report' | 'dashboard' | 'profile' | 'agent-tool' | 'marketplace'>('map');
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Data from Supabase
  const [users, setUsers] = useState<User[]>([]); // Admin view mainly
  const [markets, setMarkets] = useState<Market[]>([]);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Local state for non-critical or mock-heavy features in this prototype
  const [reports, setReports] = useState<HygieneReport[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [selectedPublicMarketId, setSelectedPublicMarketId] = useState<string>('m1');

  // --- 1. INITIALIZATION & AUTH ---
  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchUserProfile(session.user.id);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) fetchUserProfile(session.user.id);
      else setCurrentUser(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- 2. DATA FETCHING & REALTIME ---
  useEffect(() => {
    const loadData = async () => {
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

    if (session) {
      loadData();

      // Subscribe to Realtime Updates
      const marketSub = SupabaseService.subscribeToTable('markets', () => loadData());
      const stallSub = SupabaseService.subscribeToTable('stalls', () => loadData());
      const productSub = SupabaseService.subscribeToTable('products', () => loadData());
      const transSub = SupabaseService.subscribeToTable('transactions', () => loadData());

      return () => {
        marketSub.unsubscribe();
        stallSub.unsubscribe();
        productSub.unsubscribe();
        transSub.unsubscribe();
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
        
        // Route based on role
        if (profile.role === 'admin') setCurrentView('dashboard');
        else if (profile.role === 'agent') setCurrentView('agent-tool');
        else if (profile.role === 'vendor') setCurrentView('map');
      } else {
        // Fallback: If profile doesn't exist in DB but user is authenticated in Supabase
        // (e.g. race condition or legacy data). Use Auth Metadata.
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
                 createdAt: new Date().getTime(),
                 passwordHash: '***'
             });
             // Set default view
             const role = user.user_metadata?.role || 'vendor';
             if (role === 'admin') setCurrentView('dashboard');
             else if (role === 'agent') setCurrentView('agent-tool');
             else setCurrentView('map');
        }
      }
    } catch (error: any) {
      console.error("Profile fetch error", error.message || error);
    }
  };

  // --- HANDLERS ---

  const handleLogin = async (email: string, pass: string) => {
    setIsAuthLoading(true);
    setLoginError('');
    try {
      await SupabaseService.signInUser(email, pass);
    } catch (error: any) {
      setLoginError(error.message || "Erreur de connexion");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleRegister = async (data: any) => {
    setIsAuthLoading(true);
    try {
      await SupabaseService.signUpUser(data.email, data.password, {
        name: data.name,
        // No phone passed here
        phone: '', 
        role: 'vendor',
        kycDocument: {
           type: data.identityType,
           number: data.identityNumber,
           fileUrl: data.identityFile, // In real app, upload to Storage first
           uploadedAt: Date.now()
        }
      });
      alert("Compte créé !");
      setAuthView('login');
    } catch (error: any) {
      alert("Erreur inscription: " + error.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await SupabaseService.signOutUser();
    setCurrentUser(null);
    setAuthView('login');
  };

  const handleAddProduct = async (productData: Omit<Product, 'id'>) => {
    try {
       await SupabaseService.createProduct(productData);
       // Realtime subscription will update the list automatically
    } catch (e) { console.error(e); }
  };

  // --- RENDER ---

  // 1. GUEST VIEW
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

  // 2. AUTH SCREENS
  if (!session && !currentUser) {
    if (authView === 'register') {
      return <RegisterScreen onRegister={handleRegister} onBackToLogin={() => setAuthView('login')} />;
    }
    return <LoginScreen 
      onLogin={handleLogin} 
      onGoToRegister={() => setAuthView('register')} 
      onGuestAccess={() => setCurrentUser({ id: 'guest', role: 'guest', name: 'Visiteur', email: '', phone: '', passwordHash: '', isBanned: false, kycStatus: 'none', createdAt: 0 })}
      error={loginError}
      isLoading={isAuthLoading}
    />;
  }

  if (!currentUser || isDataLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full"></div></div>;
  }

  const role = currentUser.role;
  // Fallback profile for vendor dashboard if user is vendor
  const vendorProfile: VendorProfile = {
      id: currentUser.id,
      userId: currentUser.id,
      name: currentUser.name,
      phone: currentUser.phone,
      stallId: stalls.find(s => s.occupantId === currentUser.id)?.id, 
      hygieneScore: 4.5,
      language: 'fr',
      isLogisticsSubscribed: false
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
      <NetworkStatus />
      
      {/* HEADER */}
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
                   {currentUser.name} ({role})
                </p>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-1">
               {role === 'vendor' && <button onClick={() => setCurrentView('map')} className="px-3 py-2 text-sm text-gray-600 font-bold hover:bg-gray-100 rounded-lg">Mon Espace</button>}
               {role === 'admin' && <button onClick={() => setCurrentView('dashboard')} className="px-3 py-2 text-sm text-gray-600 font-bold hover:bg-gray-100 rounded-lg">Administration</button>}
               
               <div className="h-6 w-px bg-gray-200 mx-2"></div>
               <button onClick={handleLogout} className="text-red-600 font-bold text-sm px-3 py-2 hover:bg-red-50 rounded-lg flex items-center gap-2">
                   <LogOut className="w-4 h-4"/> Déconnexion
               </button>
            </nav>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
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
