
import React, { useState, useEffect, Suspense } from 'react';
import { Loader2, LogOut, Store, Globe } from 'lucide-react';
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
  
  // GLOBAL LANGUAGE STATE (Defaults to French)
  const [currentLanguage, setCurrentLanguage] = useState<'fr' | 'en'>('fr');

  const { isDataLoading, loadingStates, lazyLoaders, data, actions } = useAppData(session, currentUser);

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

  // --- REALTIME USER PROFILE SYNC (Essential for Agent Cash updates) ---
  useEffect(() => {
      if (!currentUser) return;

      const channel = supabase
          .channel(`profile-${currentUser.id}`)
          .on('postgres_changes', { 
              event: 'UPDATE', 
              schema: 'public', 
              table: 'profiles', 
              filter: `id=eq.${currentUser.id}` 
          }, (payload) => {
              // Merge updates into current user state
              setCurrentUser((prev: any) => ({ ...prev, ...payload.new, agentStats: payload.new.agent_stats }));
              toast.success("Profil mis à jour", { icon: '🔄', duration: 2000 });
          })
          .subscribe();

      return () => {
          supabase.removeChannel(channel);
      };
  }, [currentUser?.id]);

  const fetchUserProfile = async (userId: string) => {
      const profile = await SupabaseService.getCurrentUserProfile(userId);
      setCurrentUser(profile);
      // Set language from profile if available
      if (profile?.preferences?.language && (profile.preferences.language === 'fr' || profile.preferences.language === 'en')) {
          setCurrentLanguage(profile.preferences.language as any);
      }
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
      // SECURITY CHECK: Anti-Fraud
      if (currentUser?.role === 'agent' && currentUser?.agentStats?.isShiftActive) {
          toast.error("INTERDIT: Vous devez terminer votre service avant de vous déconnecter.", { 
              duration: 5000, 
              style: { border: '2px solid red', padding: '16px', color: 'red' } 
          });
          return;
      }

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
      cashInHand: currentUser.agentStats?.cashInHand || 0,
      isShiftActive: !!currentUser.agentStats?.isShiftActive,
      logs: []
  } : null;

  // Filter missions for the logged-in agent
  const agentMissions = currentUser?.role === 'agent' 
      ? data.missions.filter(m => m.agentId === currentUser.id)
      : [];

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
              <div className="flex items-center gap-4">
                  {/* LANGUAGE TOGGLE */}
                  <button 
                    onClick={() => setCurrentLanguage(prev => prev === 'fr' ? 'en' : 'fr')}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold uppercase transition-colors ${currentUser.role === 'client' ? 'bg-gray-100 text-gray-700' : 'bg-white/10 text-white hover:bg-white/20'}`}
                  >
                      <Globe className="w-3 h-3"/>
                      {currentLanguage === 'fr' ? 'Français' : 'English'}
                  </button>
                  <button onClick={handleSignOut} className={`opacity-80 hover:opacity-100 ${currentUser.role === 'agent' && currentUser.agentStats?.isShiftActive ? 'opacity-30 cursor-not-allowed' : ''}`}>
                      <LogOut className={`w-5 h-5 ${currentUser.role === 'client' ? 'text-slate-600' : 'text-white'}`}/>
                  </button>
              </div>
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
                    
                    // NEW: Pass loading states & language down
                    loadingStates={loadingStates}
                    onLoadFinance={lazyLoaders.loadFinance}
                    onLoadUsers={lazyLoaders.loadUsers}
                    onLoadMissions={lazyLoaders.loadMissions}
                    currentLanguage={currentLanguage}

                    onSendSms={() => {}} onApprovePlan={() => {}} 
                    onAddMarket={actions.createMarket} 
                    onUpdateMarket={actions.updateMarket} 
                    onDeleteMarket={actions.deleteMarket} 
                    onCreateStall={actions.createStall} 
                    onBulkCreateStalls={actions.bulkCreateStalls} 
                    onDeleteStall={actions.deleteStall} 
                    onAddExpense={actions.createExpense} 
                    onDeleteExpense={actions.deleteExpense} 
                    onUpdateUserStatus={actions.updateUserStatus}
                    
                    // Connected Agent Actions
                    onAssignMission={actions.assignMission}
                    onValidateCashDrop={actions.validateCashDrop}
                />
            )}

            {currentUser.role === 'vendor' && (
                <VendorDashboard 
                    profile={currentVendorProfile} transactions={data.recentTransactions} receipts={data.receipts} 
                    myStall={data.stalls.find(s => s.occupantId === currentUser.id)} stalls={data.stalls} 
                    myReports={data.reports} sanctions={data.sanctions} products={data.products} orders={data.orders} 
                    notifications={data.notifications} 
                    
                    onAddProduct={actions.createProduct} 
                    onUpdateProduct={actions.updateProduct} 
                    onDeleteProduct={actions.deleteProduct} 
                    onUpdateOrderStatus={actions.updateOrderStatus} 
                    onUpdateProfile={u => SupabaseService.updateUserProfile(currentUser.id, u).then(()=>fetchUserProfile(currentUser.id))} 
                    onToggleLogistics={() => Promise.resolve()} 
                    onReserve={(id, p, prio) => SupabaseService.reserveStall(id, currentUser.id).then(() => actions.updateMarket(id, {}))} 
                    onContestSanction={(id, r) => SupabaseService.contestSanction(id, r)}
                />
            )}

            {currentUser.role === 'client' && (
                <ClientDashboard 
                    stalls={data.stalls} markets={data.markets} products={data.products} orders={data.orders.filter(o => o.customerId === currentUser.id)}
                    onCreateOrder={actions.createOrder} 
                />
            )}

            {currentUser.role === 'agent' && (
                <AgentFieldTool 
                    stalls={data.stalls} sanctions={data.sanctions} agentLogs={currentAgent.logs} 
                    missions={agentMissions} // Pass filtered missions
                    cashInHand={currentAgent.cashInHand} isShiftActive={currentAgent.isShiftActive} 
                    onCollectPayment={(id, amt) => SupabaseService.createTransaction({ marketId: 'm1', amount: amt, type: 'rent', provider: 'cash', stallId: id, collectedBy: currentUser.id }).then(() => {})} 
                    onIssueSanction={(id, t, r, a) => SupabaseService.createSanction({ marketId: 'm1', stallId: id, type: t, reason: r, amount: a, issuedBy: currentUser.id }).then(() => {})} 
                    onShiftAction={(action) => {
                        // Handle shift start/end logic
                        if (action === 'start') {
                            SupabaseService.updateUserProfile(currentUser.id, { agentStats: { ...currentAgent, isShiftActive: true } });
                        } else if (action === 'end') {
                            SupabaseService.updateUserProfile(currentUser.id, { agentStats: { ...currentAgent, isShiftActive: false } });
                        }
                    }} 
                    onUpdateMissionStatus={actions.updateMissionStatus}
                />
            )}

            {currentUser.role === 'mediator' && (
                <MediatorDashboard 
                    sanctions={data.sanctions} 
                    stalls={data.stalls}
                    onResolveAppeal={(id, decision) => SupabaseService.resolveSanctionAppeal(id, decision).then(()=> {})}
                />
            )}

          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
};
export default App;
