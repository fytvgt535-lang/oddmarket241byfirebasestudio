
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
  Receipt, Product, ClientOrder, AppNotification, User, PaymentProvider 
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

  // --- APP STATE (ROUTING) ---
  // On utilise des vues explicites basées sur le rôle
  const [currentView, setCurrentView] = useState<'vendor-dashboard' | 'admin-dashboard' | 'agent-tool' | 'marketplace'>('vendor-dashboard');
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Data from Supabase
  const [users, setUsers] = useState<User[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Local state for non-critical features or mocks
  const [reports, setReports] = useState<HygieneReport[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  
  // Public View State
  const [selectedPublicMarketId, setSelectedPublicMarketId] = useState<string>('m1');

  // Specific state for extra profile fields
  const [vendorDetails, setVendorDetails] = useState<{bio?: string, photoUrl?: string}>({});

  // --- 1. INITIALIZATION & AUTH ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
    });

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
        const userObj: User = {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role,
          phone: profile.phone,
          isBanned: profile.is_banned,
          kycStatus: profile.kyc_status,
          passwordHash: '***',
          createdAt: new Date(profile.created_at).getTime()
        };
        
        setCurrentUser(userObj);
        setVendorDetails({
            bio: profile.bio,
            photoUrl: profile.avatar_url
        });
        
        // --- ROUTING INTELLIGENT ---
        // Redirection automatique selon le rôle
        switch(profile.role) {
            case 'admin':
                setCurrentView('admin-dashboard');
                break;
            case 'agent':
                setCurrentView('agent-tool');
                break;
            case 'vendor':
                setCurrentView('vendor-dashboard');
                break;
            case 'guest':
                setCurrentView('marketplace');
                break;
            default:
                setCurrentView('vendor-dashboard'); // Fallback safe
        }

      } else {
        console.warn("Profil introuvable, tentative de fallback...");
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
             const fallbackUser: User = {
                 id: user.id,
                 email: user.email || '',
                 name: user.user_metadata?.name || 'Utilisateur',
                 role: 'vendor', // Par défaut
                 phone: '',
                 isBanned: false,
                 kycStatus: 'pending',
                 createdAt: Date.now(),
                 passwordHash: '***'
             };
             setCurrentUser(fallbackUser);
             setCurrentView('vendor-dashboard');
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
        role: 'vendor', // Par défaut, on crée des vendeurs. Les agents/admins sont créés manuellement en DB ou via interface admin.
        kycDocument: {
           type: data.identityType,
           number: data.identityNumber,
           fileUrl: data.identityFile,
           uploadedAt: Date.now()
        }
      });

      if (result.session) {
         // Auto-login handled by subscription
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
  };

  const handleAddProduct = async (productData: Omit<Product, 'id'>) => {
    try {
       await SupabaseService.createProduct(productData);
    } catch (e) { throw e; }
  };

  const handleUpdateProduct = async (id: string, updates: Partial<Product>) => {
      try {
          await SupabaseService.updateProduct(id, updates);
          setProducts(prev => prev.map(p => p.id === id ? {...p, ...updates} : p));
      } catch (e) {
          throw e;
      }
  };

  const handleUpdateLocalProfile = (updates: Partial<VendorProfile>) => {
      if (currentUser) {
          setCurrentUser(prev => prev ? ({ ...prev, name: updates.name || prev.name, phone: updates.phone || prev.phone }) : null);
      }
      setVendorDetails(prev => ({
          ...prev,
          bio: updates.bio !== undefined ? updates.bio : prev.bio,
          photoUrl: updates.photoUrl !== undefined ? updates.photoUrl : prev.photoUrl
      }));
  };

  const handleReserveStall = async (stallId: string, provider: PaymentProvider, isPriority: boolean) => {
      if (!currentUser) return;
      
      try {
          const stall = stalls.find(s => s.id === stallId);
          if (!stall) return;

          await SupabaseService.updateStallStatus(stallId, 'occupied', {
              id: currentUser.id,
              name: currentUser.name,
              phone: currentUser.phone
          });

          await SupabaseService.createTransaction({
              marketId: stall.marketId,
              amount: stall.price,
              type: 'rent',
              status: 'completed',
              stallNumber: stall.number,
              reference: `RES-${Date.now()}`,
              provider: provider
          });

          setStalls(prev => prev.map(s => s.id === stallId ? { 
              ...s, 
              status: 'occupied', 
              occupantId: currentUser.id, 
              occupantName: currentUser.name,
              lastPaymentDate: Date.now()
          } : s));

          alert(`Félicitations ! Vous avez réservé l'étal ${stall.number}.`);
      } catch (error: any) {
          console.error("Reservation failed:", error);
          alert("Erreur lors de la réservation : " + error.message);
      }
  };

  // --- VIEW RENDERING ---

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
      onGuestAccess={() => {}}
      error={loginError}
      isLoading={isAuthLoading}
    />;
  }

  if (!currentUser) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full"></div></div>;
  }

  // --- ROLE-BASED VIEW SELECTION ---
  
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
      
      {/* GLOBAL HEADER (Except for Guest/Public) */}
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
                   {role === 'admin' ? 'Espace Mairie' : role === 'agent' ? 'Terminal Agent' : 'Espace Vendeur'}
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
         
         {/* 1. VENDOR VIEW */}
         {currentView === 'vendor-dashboard' && role === 'vendor' && (
             <VendorDashboard 
                profile={vendorProfile} 
                transactions={transactions.filter(t => t.stallNumber === vendorProfile.stallId)} 
                receipts={receipts}
                myStall={stalls.find(s => s.id === vendorProfile.stallId)}
                stalls={stalls} // Nécessaire pour la réservation
                myReports={reports}
                sanctions={sanctions}
                products={products.filter(p => p.stallId === vendorProfile.stallId)}
                orders={orders}
                notifications={notifications}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={(id) => setProducts(prev => prev.filter(p => p.id !== id))}
                onUpdateOrderStatus={() => {}}
                onUpdateProfile={handleUpdateLocalProfile}
                onReserve={handleReserveStall}
             />
         )}

         {/* 2. ADMIN VIEW */}
         {currentView === 'admin-dashboard' && role === 'admin' && (
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

         {/* 3. AGENT VIEW */}
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
