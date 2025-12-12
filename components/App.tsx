
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
import RoleBasedRouter from './components/RoleBasedRouter';

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

  // --- REALTIME USER PROFILE SYNC (KILL SWITCH & LIVE UPDATES) ---
  useEffect(() => {
      if (!currentUser) return;

      const channel = supabase
          .channel(`profile-watch-${currentUser.id}`)
          .on('postgres_changes', { 
              event: 'UPDATE', 
              schema: 'public', 
              table: 'profiles', 
              filter: `id=eq.${currentUser.id}` 
          }, async (payload) => {
              const newData = payload.new;
              
              // 1. SECURITY KILL SWITCH
              if (newData.is_banned && !currentUser.isBanned) {
                  toast.error("Votre compte a été suspendu par l'administration.", { duration: 10000, icon: '🚫' });
                  await SupabaseService.signOutUser();
                  setAuthView('login');
                  return;
              }

              // 2. LIVE UPDATES (Role change, Agent Stats, etc.)
              setCurrentUser((prev: any) => ({ 
                  ...prev, 
                  ...newData, 
                  agentStats: newData.agent_stats 
              }));

              if (newData.role !== currentUser.role) {
                  toast(`Vos droits d'accès ont changé : ${newData.role}`, { icon: '🔄' });
              }
          })
          .subscribe();

      return () => {
          supabase.removeChannel(channel);
      };
  }, [currentUser?.id, currentUser?.isBanned, currentUser?.role]);

  const fetchUserProfile = async (userId: string) => {
      const profile = await SupabaseService.getCurrentUserProfile(userId);
      setCurrentUser(profile);
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
      if (currentUser?.role === 'agent' && currentUser?.agentStats?.isShiftActive) {
          const confirmLogout = window.confirm("ATTENTION : Vous êtes en service. Se déconnecter maintenant créera une alerte d'abandon de poste. Continuer ?");
          if (!confirmLogout) return;
      }
      
      try {
          await SupabaseService.signOutUser();
      } catch (e: any) {
          console.error("Logout Error:", e);
          // Force logout locally even if server fails
      } finally {
          setSession(null);
          setCurrentUser(null);
          setAuthView('login');
          window.location.reload(); // Hard refresh to clear any lingering state
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
              <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setCurrentLanguage(prev => prev === 'fr' ? 'en' : 'fr')}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold uppercase transition-colors ${currentUser.role === 'client' ? 'bg-gray-100 text-gray-700' : 'bg-white/10 text-white hover:bg-white/20'}`}
                  >
                      <Globe className="w-3 h-3"/>
                      {currentLanguage === 'fr' ? 'Français' : 'English'}
                  </button>
                  <button onClick={handleSignOut} className={`opacity-80 hover:opacity-100 ${currentUser.role === 'agent' && currentUser.agentStats?.isShiftActive ? 'text-red-300' : ''}`} title="Déconnexion">
                      <LogOut className={`w-5 h-5 ${currentUser.role === 'client' ? 'text-slate-600' : 'text-white'}`}/>
                  </button>
              </div>
          </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        <ErrorBoundary>
          <Suspense fallback={<div className="p-10 text-center text-gray-400">Chargement module...</div>}>
            <RoleBasedRouter 
              currentUser={currentUser}
              data={data}
              loadingStates={loadingStates}
              lazyLoaders={lazyLoaders}
              actions={actions}
              currentLanguage={currentLanguage}
              onUpdateProfile={u => SupabaseService.updateUserProfile(currentUser.id, u).then(()=>fetchUserProfile(currentUser.id))}
              onSignOut={handleSignOut}
            />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
};
export default App;
