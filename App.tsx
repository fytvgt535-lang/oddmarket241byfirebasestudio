
import React, { useState, useEffect, Suspense } from 'react';
import { Loader2, LogOut, Store } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { supabase } from './supabaseClient';
import LoginScreen from './components/Auth/LoginScreen';
import RegisterScreen from './components/Auth/RegisterScreen';
import { useAppData } from './hooks/useAppData';
import * as SupabaseService from './services/supabaseService';
import ErrorBoundary from './components/ErrorBoundary';
import NetworkStatus from './components/NetworkStatus';

// Lazy Components
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard'));
const VendorDashboard = React.lazy(() => import('./components/VendorDashboard'));
const ClientDashboard = React.lazy(() => import('./components/ClientDashboard'));
const AgentFieldTool = React.lazy(() => import('./components/AgentFieldTool'));
const MediatorDashboard = React.lazy(() => import('./components/MediatorDashboard'));

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const { isDataLoading, loadData, data, setters } = useAppData(session, currentUser);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
      else setCurrentUser(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
      const profile = await SupabaseService.getCurrentUserProfile(userId);
      setCurrentUser(profile);
  };

  const handleLogin = async (email: string, pass: string) => {
      setIsAuthLoading(true);
      try {
          await SupabaseService.signInUser(email, pass);
      } catch (e: any) {
          toast.error("Erreur de connexion : " + e.message);
      } finally {
          setIsAuthLoading(false);
      }
  };

  const handleRegister = async (formData: any) => {
      setIsAuthLoading(true);
      try {
          await SupabaseService.signUpUser(formData.email, formData.password, { 
              name: formData.name, 
              accountType: formData.invitationCode ? (formData.invitationCode === 'ADMIN' ? 'admin' : 'vendor') : 'client',
              kycDocument: { type: formData.identityType, number: 'TEMP', fileUrl: formData.identityFile, uploadedAt: Date.now() }
          });
          toast.success("Compte créé !");
      } catch (e: any) {
          toast.error(e.message);
      } finally {
          setIsAuthLoading(false);
      }
  };

  const handleSignOut = async () => {
      await SupabaseService.signOutUser();
      setAuthView('login');
  };

  // --- DERIVED STATE ---
  const currentVendorProfile = currentUser?.role === 'vendor' ? {
      ...currentUser,
      hygieneScore: 4.5,
      subscriptionPlan: 'standard'
  } : null;

  const currentAgent = currentUser?.role === 'agent' ? {
      ...currentUser,
      marketId: 'm1',
      cashInHand: 45000,
      isShiftActive: true,
      logs: []
  } : null;

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

  const handleContestSanction = async (sanctionId: string, reason: string) => {
      try { 
          await SupabaseService.contestSanction(sanctionId, reason); 
          toast.success("Contestation envoyée au médiateur."); 
          loadData(); 
      } catch (e: any) { 
          toast.error(e.message); 
      }
  };

  if (isDataLoading && session) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-12 h-12 text-blue-600 animate-spin"/></div>;
  if (!session) return authView === 'login' ? <LoginScreen onLogin={handleLogin} onGoToRegister={() => setAuthView('register')} isLoading={isAuthLoading} onGuestAccess={()=>{}}/> : <RegisterScreen onRegister={handleRegister} onBackToLogin={() => setAuthView('login')} isLoading={isAuthLoading}/>;
  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Toaster position="top-center" />
      <NetworkStatus />
      
      <header className={`sticky top-0 z-40 shadow-md ${currentUser.role === 'admin' ? 'bg-slate-900' : currentUser.role === 'vendor' ? 'bg-green-900' : currentUser.role === 'agent' ? 'bg-blue-900' : currentUser.role === 'mediator' ? 'bg-purple-900' : 'bg-white border-b'} text-white`}>
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
                    onContestSanction={handleContestSanction}
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

            {currentUser.role === 'mediator' && (
                <MediatorDashboard 
                    sanctions={data.sanctions} 
                    stalls={data.stalls}
                    onResolveAppeal={(id, decision) => SupabaseService.resolveSanctionAppeal(id, decision).then(()=>loadData())}
                />
            )}

          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
};
export default App;
