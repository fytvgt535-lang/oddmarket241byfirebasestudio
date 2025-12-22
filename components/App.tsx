
import React, { useState, useEffect, Suspense } from 'react';
import { Loader2, LogOut, Store, Globe, Zap } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { supabase } from '../supabaseClient';
import LoginScreen from './Auth/LoginScreen';
import RegisterScreen from './Auth/RegisterScreen';
import { useAppData } from '../hooks/useAppData';
import * as SupabaseService from '../services/supabaseService';
import ErrorBoundary from './ErrorBoundary';
import NetworkStatus from './NetworkStatus';
import RoleBasedRouter from './RoleBasedRouter';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  
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

  const fetchUserProfile = async (userId: string) => {
      try {
          const profile = await SupabaseService.getCurrentUserProfile(userId);
          setCurrentUser(profile);
          if (profile?.preferences?.language) {
              setCurrentLanguage(profile.preferences.language as any);
          }
      } catch (e) {
          toast.error("Erreur de récupération du profil");
      }
  };

  const handleLogin = async (email: string, pass: string) => {
      setIsAuthLoading(true);
      try {
          await SupabaseService.signInUser(email, pass);
          toast.success("Bon retour sur MarchéConnect");
      } catch (e: any) {
          toast.error("Identifiants incorrects.");
      } finally {
          setIsAuthLoading(false);
      }
  };

  const handleRegister = async (formData: any) => {
      setIsAuthLoading(true);
      try {
          await SupabaseService.signUpUser(formData.email, formData.password, { 
              name: formData.name, 
              accountType: formData.invitationCode === 'ADMIN' ? 'admin' : (formData.invitationCode === 'AGENT' ? 'agent' : 'client'),
              kycDocument: { type: formData.identityType, number: 'TEMP', fileUrl: formData.identityFile, uploadedAt: Date.now() }
          });
          toast.success("Compte créé avec succès !");
          setAuthView('login');
      } catch (e: any) {
          toast.error(e.message);
      } finally {
          setIsAuthLoading(false);
      }
  };

  const handleSignOut = async () => {
      await SupabaseService.signOutUser();
      setAuthView('login');
      setCurrentUser(null);
      setSession(null);
  };

  if (!session) {
      return (
          <div className="min-h-screen bg-slate-900">
              <Toaster position="top-center" />
              {authView === 'login' ? (
                  <LoginScreen 
                    onLogin={handleLogin} 
                    onGoToRegister={() => setAuthView('register')} 
                    isLoading={isAuthLoading}
                  />
              ) : (
                  <RegisterScreen 
                    onRegister={handleRegister} 
                    onBackToLogin={() => setAuthView('login')} 
                    isLoading={isAuthLoading}
                  />
              )}
          </div>
      );
  }

  if (isDataLoading || !currentUser) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
              <Zap className="w-12 h-12 text-blue-600 animate-pulse mb-4" />
              <p className="font-black text-slate-800 tracking-tighter uppercase">Synchronisation MarchéConnect...</p>
              <Loader2 className="w-6 h-6 text-slate-300 animate-spin mt-4"/>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans selection:bg-blue-100">
      <Toaster position="top-center" />
      <NetworkStatus />
      
      <header className={`sticky top-0 z-40 shadow-sm border-b backdrop-blur-md ${
          currentUser.role === 'admin' ? 'bg-slate-900/95 border-slate-800' : 
          currentUser.role === 'vendor' ? 'bg-green-900/95 border-green-800' : 
          'bg-white/95 border-gray-100'
      } text-white transition-colors duration-500`}>
          <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
              <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${currentUser.role === 'client' ? 'bg-green-600' : 'bg-white/10'}`}>
                    <Store className="w-6 h-6 text-white"/>
                  </div>
                  <h1 className={`font-black text-xl tracking-tighter ${currentUser.role === 'client' ? 'text-slate-900' : 'text-white'}`}>MarchéConnect</h1>
              </div>
              
              <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setCurrentLanguage(prev => prev === 'fr' ? 'en' : 'fr')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                        currentUser.role === 'client' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                      <Globe className="w-3.5 h-3.5"/>
                      {currentLanguage === 'fr' ? 'Gabon' : 'INTL'}
                  </button>
                  <button 
                    onClick={handleSignOut} 
                    className={`p-2 rounded-xl transition-colors ${currentUser.role === 'client' ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                  >
                    <LogOut className="w-5 h-5"/>
                  </button>
              </div>
          </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        <ErrorBoundary>
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center p-20 text-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4"/>
                <p className="text-slate-400 font-bold">Chargement de l'interface...</p>
            </div>
          }>
            <RoleBasedRouter 
                currentUser={currentUser}
                data={data}
                loadingStates={loadingStates}
                lazyLoaders={lazyLoaders}
                actions={actions}
                currentLanguage={currentLanguage}
                onUpdateProfile={async (u) => {
                    await SupabaseService.updateUserProfile(currentUser.id, u);
                    await fetchUserProfile(currentUser.id);
                }}
                onSignOut={handleSignOut}
            />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default App;
