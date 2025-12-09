
import React, { useState, useEffect, useMemo, Suspense, ReactNode, ErrorInfo } from 'react';
import { Store, LogOut, Loader2, Database } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import * as SupabaseService from './services/supabaseService';
import { Toaster, toast } from 'react-hot-toast';
import { useAppData } from './hooks/useAppData';

import NetworkStatus from './components/NetworkStatus';
import LoginScreen from './components/Auth/LoginScreen';
import RegisterScreen from './components/Auth/RegisterScreen';

// Lazy Load Components
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard'));
const VendorDashboard = React.lazy(() => import('./components/VendorDashboard'));
const AgentFieldTool = React.lazy(() => import('./components/AgentFieldTool'));
const ClientDashboard = React.lazy(() => import('./components/ClientDashboard'));

import { User, VendorProfile, Agent } from './types';

// Strict Type Error Boundary
interface ErrorBoundaryProps { children?: ReactNode }
interface ErrorBoundaryState { hasError: boolean }

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };
  static getDerivedStateFromError(_: Error): ErrorBoundaryState { return { hasError: true }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error("Uncaught error:", error, errorInfo); }
  render() { 
    if (this.state.hasError) return <div className="min-h-screen flex items-center justify-center bg-red-50 text-red-600 font-bold p-10">Une erreur critique est survenue. Veuillez rafraîchir.</div>; 
    return (this as any).props.children; 
  }
}

const App: React.FC = () => {
  if (!isSupabaseConfigured) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-8 text-center">
              <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <Database className="w-10 h-10 text-white"/>
              </div>
              <h1 className="text-3xl font-black mb-4">Base de Données Non Connectée</h1>
              <p className="text-slate-400 mb-8 max-w-md">L'application ne trouve pas les clés de configuration Supabase.</p>
          </div>
      );
  }

  const [session, setSession] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const { isDataLoading, loadData, data } = useAppData(session, currentUser);

  const currentVendorProfile: VendorProfile = useMemo(() => {
    if (!currentUser) return {} as VendorProfile;
    const myStall = data.stalls.find(s => s.occupantId === currentUser.id);
    return {
      id: currentUser.id, userId: currentUser.id, name: currentUser.name, phone: currentUser.phone,
      stallId: myStall?.id, hygieneScore: 4.5, language: 'fr',
      isLogisticsSubscribed: currentUser.isLogisticsSubscribed || false,
      subscriptionExpiry: currentUser.subscriptionExpiry,
      bio: currentUser.bio || '', photoUrl: currentUser.photoUrl || ''
    };
  }, [currentUser, data.stalls]);

  const currentAgent: Agent = useMemo(() => {
    if (!currentUser) return {} as Agent;
    return data.agents.find(a => a.userId === currentUser.id) || {
        id: currentUser.id, name: currentUser.name, marketId: currentUser.marketId || 'm1',
        role: 'collector', performanceScore: 80, lastActive: Date.now(), cashInHand: 0, isShiftActive: true, logs: [] 
    };
  }, [currentUser, data.agents]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (session?.user) fetchUserProfile(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
      if (session?.user) fetchUserProfile(session.user.id); else setCurrentUser(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // --- HEARTBEAT SYSTEM (Realtime Presence) ---
  useEffect(() => {
      if (!currentUser) return;
      // Update last_seen immediately on mount
      SupabaseService.updateUserPresence(currentUser.id, 'app_active');
      
      // Update every 60 seconds
      const interval = setInterval(() => {
          SupabaseService.updateUserPresence(currentUser.id, 'app_active');
      }, 60000);

      // Log navigation (Simple implementation)
      SupabaseService.logUserActivity(currentUser.id, 'navigation', `User active on role: ${currentUser.role}`);

      return () => clearInterval(interval);
  }, [currentUser]);

  const fetchUserProfile = async (uid: string) => {
      const p = await SupabaseService.getCurrentUserProfile(uid);
      if (p) setCurrentUser({
          id: p.id, name: p.name, email: p.email, role: p.role, phone: p.phone, isBanned: p.isBanned,
          kycStatus: p.kycStatus, kycDocument: p.kycDocument, createdAt: p.createdAt,
          stallId: p.stallId, marketId: p.marketId, bio: p.bio, photoUrl: p.photoUrl,
          isLogisticsSubscribed: p.isLogisticsSubscribed, subscriptionExpiry: p.subscriptionExpiry, passwordHash: '***',
          lastSeenAt: p.lastSeenAt
      });
  };

  const handleLogin = async (e: string, p: string) => {
      setIsAuthLoading(true); 
      try { await SupabaseService.signInUser(e, p); } catch(err: any) { toast.error(err.message); } finally { setIsAuthLoading(false); }
  };

  const handleRegister = async (d: any) => {
      setIsAuthLoading(true); 
      try { await SupabaseService.signUpUser(d.email, d.password, d); setAuthView('login'); toast.success("Compte créé !"); } catch(err: any) { toast.error(err.message); } finally { setIsAuthLoading(false); }
  };

  const handleSignOut = async () => { await SupabaseService.signOutUser(); };

  // --- ACTIONS HANDLERS ---
  const handleCreateOrder = async (order: any) => {
      try { await SupabaseService.createOrder({ ...order, customerId: currentUser?.id }); toast.success("Commande envoyée !"); loadData(); } catch (e: any) { toast.error(e.message); }
  };

  const handleCollectPayment = async (stallId: string, amount: number) => {
      try { const stall = data.stalls.find(s => s.id === stallId); await SupabaseService.createTransaction({ marketId: stall?.marketId, stallNumber: stall?.number, amount, type: 'rent', provider: 'cash', collectedBy: currentUser?.id, reference: `CASH-${Date.now()}` }); toast.success("Paiement enregistré !"); loadData(); } catch (e: any) { toast.error(e.message); }
  };

  const handleIssueSanction = async (stallId: string, type: 'warning'|'fine', reason: string, amount: number) => {
      try { await SupabaseService.createSanction({ marketId: data.stalls.find(s => s.id === stallId)?.marketId, stallNumber: data.stalls.find(s => s.id === stallId)?.number, stallId, amount, type, reason, issuedBy: currentUser?.id }); toast.success("Sanction émise"); loadData(); } catch (e: any) { toast.error(e.message); }
  };

  const handleReserveStall = async (stallId: string, provider: string, isPriority: boolean) => {
      if (!currentUser) return;
      try { await SupabaseService.reserveStall(stallId, currentUser.id); toast.success("Étal réservé !"); await fetchUserProfile(currentUser.id); loadData(); } catch (e: any) { toast.error(e.message); }
  };

  if (isDataLoading && session) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-12 h-12 text-blue-600 animate-spin"/></div>;
  if (!session) return authView === 'login' ? <LoginScreen onLogin={handleLogin} onGoToRegister={() => setAuthView('register')} isLoading={isAuthLoading} onGuestAccess={()=>{}}/> : <RegisterScreen onRegister={handleRegister} onBackToLogin={() => setAuthView('login')} isLoading={isAuthLoading}/>;
  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Toaster position="top-center" />
      <NetworkStatus />
      
      <header className={`sticky top-0 z-40 shadow-md ${currentUser.role === 'admin' ? 'bg-slate-900' : currentUser.role === 'vendor' ? 'bg-green-900' : currentUser.role === 'agent' ? 'bg-blue-900' : 'bg-white border-b'} text-white`}>
          <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
              <div className="flex items-center gap-2">
                  <Store className={`w-6 h-6 ${currentUser.role === 'client' ? 'text-green-600' : 'text-white'}`}/>
                  <h1 className={`font-black ${currentUser.role === 'client' ? 'text-slate-900' : 'text-white'}`}>MarchéConnect</h1>
              </div>
              <button onClick={handleSignOut} className="opacity-80 hover:opacity-100"><LogOut className={`w-5 h-5 ${currentUser.role === 'client' ? 'text-slate-600' : 'text-white'}`}/></button>
          </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        <ErrorBoundary>
          <Suspense fallback={<div className="p-10 text-center text-gray-400">Chargement module...</div>}>
            
            {currentUser.role === 'admin' && (
                <AdminDashboard 
                    markets={data.markets} stalls={data.stalls} reports={data.reports} 
                    transactions={data.recentTransactions} receipts={data.receipts} agents={data.agents} 
                    expenses={data.expenses} paymentPlans={data.paymentPlans} notifications={data.notifications} 
                    sanctions={data.sanctions} users={data.users} orders={data.orders} 
                    onSendSms={() => {}} onApprovePlan={() => {}} 
                    onAddMarket={d => SupabaseService.createMarket(d).then(()=>loadData())} 
                    onUpdateMarket={(id, d) => SupabaseService.updateMarket(id, d).then(()=>loadData())} 
                    onDeleteMarket={id => SupabaseService.deleteMarket(id).then(()=>loadData())} 
                    onCreateStall={d => SupabaseService.createStall(d).then(()=>loadData())} 
                    onBulkCreateStalls={d => SupabaseService.createBulkStalls(d).then(()=>loadData())} 
                    onDeleteStall={id => SupabaseService.deleteStall(id).then(()=>loadData())} 
                    onAddExpense={d => SupabaseService.createExpense(d).then(()=>loadData())} 
                    onDeleteExpense={id => SupabaseService.deleteExpense(id).then(()=>loadData())} 
                    onUpdateUserStatus={(id, u) => SupabaseService.adminUpdateUserStatus(id, u).then(()=>loadData())} 
                />
            )}

            {currentUser.role === 'vendor' && (
                <VendorDashboard 
                    profile={currentVendorProfile} transactions={data.recentTransactions} receipts={data.receipts} 
                    myStall={data.stalls.find(s => s.occupantId === currentUser.id)} stalls={data.stalls} 
                    myReports={data.reports} sanctions={data.sanctions} products={data.products} orders={data.orders} 
                    notifications={data.notifications} 
                    onAddProduct={d => SupabaseService.createProduct(d).then(()=>loadData())} 
                    onUpdateProduct={(id, d) => SupabaseService.updateProduct(id, d).then(()=>loadData())} 
                    onDeleteProduct={id => SupabaseService.deleteProduct(id).then(()=>loadData())} 
                    onUpdateOrderStatus={()=>{}} 
                    onUpdateProfile={u => SupabaseService.updateUserProfile(currentUser.id, u).then(()=>fetchUserProfile(currentUser.id))} 
                    onToggleLogistics={() => Promise.resolve()} 
                    onReserve={handleReserveStall} 
                />
            )}

            {currentUser.role === 'client' && (
                <ClientDashboard 
                    stalls={data.stalls} markets={data.markets} products={data.products} orders={data.orders.filter(o => o.customerId === currentUser.id)}
                    onCreateOrder={handleCreateOrder} 
                />
            )}

            {currentUser.role === 'agent' && (
                <AgentFieldTool 
                    stalls={data.stalls} sanctions={data.sanctions} agentLogs={currentAgent.logs} 
                    cashInHand={currentAgent.cashInHand} isShiftActive={currentAgent.isShiftActive} 
                    onCollectPayment={handleCollectPayment} onIssueSanction={handleIssueSanction} onShiftAction={()=>{}} 
                />
            )}

          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
};
export default App;
