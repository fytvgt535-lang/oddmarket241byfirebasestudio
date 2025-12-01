
import React, { useState, useEffect } from 'react';
import { LogIn, Mail, Lock, AlertCircle, ShoppingBag, Loader2, Store, X, Send, Eye, EyeOff, Check } from 'lucide-react';
import { resetPasswordForEmail } from '../../services/supabaseService';

interface LoginScreenProps {
  onLogin: (email: string, pass: string) => void;
  onGoToRegister: () => void;
  onGuestAccess: () => void;
  error?: string;
  isLoading?: boolean;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onGoToRegister, onGuestAccess, error, isLoading = false }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // UX States
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Forgot Password State
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  // Load remembered email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('marchconnect_saved_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    // Handle Remember Me logic
    if (rememberMe) {
      localStorage.setItem('marchconnect_saved_email', email);
    } else {
      localStorage.removeItem('marchconnect_saved_email');
    }

    onLogin(email, password);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetStatus('sending');
    try {
      await resetPasswordForEmail(resetEmail);
      setResetStatus('sent');
    } catch (e) {
      setResetStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-900">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0">
         <div className="absolute top-0 right-0 w-96 h-96 bg-green-600/20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
         <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10">
        
        {/* Header Branding */}
        <div className="bg-white p-8 pb-4 text-center">
          <div className="mx-auto w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
            <Store className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-1">MarchéConnect</h1>
          <p className="text-gray-500 text-sm">Gestion Municipale & Vente</p>
        </div>

        {/* Form Container */}
        <div className="p-8 pt-2">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-100 p-3 rounded-xl flex items-center gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-xs font-bold text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Email</label>
              <div className="relative group">
                <div className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-green-600 transition-colors">
                    <Mail className="w-5 h-5" />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com" 
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 outline-none transition-all font-medium text-gray-900"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1 ml-1">
                 <label className="block text-xs font-bold text-gray-400 uppercase">Mot de Passe</label>
                 <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-green-600 font-bold hover:underline">Oublié ?</button>
              </div>
              <div className="relative group">
                <div className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-green-600 transition-colors">
                    <Lock className="w-5 h-5" />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 outline-none transition-all font-medium text-gray-900"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center gap-2 ml-1">
              <button
                type="button"
                onClick={() => setRememberMe(!rememberMe)}
                className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${rememberMe ? 'bg-green-600 border-green-600' : 'bg-white border-gray-300'}`}
              >
                {rememberMe && <Check className="w-3.5 h-3.5 text-white" />}
              </button>
              <button type="button" onClick={() => setRememberMe(!rememberMe)} className="text-xs font-bold text-gray-500">
                Se souvenir de moi
              </button>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              {isLoading ? 'Connexion...' : 'Se Connecter'}
            </button>
          </form>

          <div className="mt-8 space-y-4">
             <div className="text-center">
               <p className="text-gray-400 text-xs mb-2">Pas encore de compte ?</p>
               <button 
                 onClick={onGoToRegister} 
                 disabled={isLoading}
                 className="text-green-600 font-bold hover:underline text-sm"
               >
                 Devenir Vendeur Certifié
               </button>
             </div>
             
             <div className="relative py-2">
                 <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-100"></span></div>
                 <div className="relative flex justify-center"><span className="bg-white px-3 text-[10px] text-gray-400 uppercase font-medium">Ou accès libre</span></div>
             </div>

             <button 
               onClick={onGuestAccess} 
               disabled={isLoading}
               className="w-full py-3 border border-green-200 bg-green-50 text-green-700 font-bold rounded-xl hover:bg-green-100 transition-colors flex items-center justify-center gap-2 text-sm"
             >
               <ShoppingBag className="w-4 h-4" />
               Vitrine Citoyenne
             </button>
          </div>
        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {showForgot && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 relative">
             <button onClick={() => setShowForgot(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
             
             <div className="text-center mb-6">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-6 h-6"/>
                </div>
                <h3 className="text-lg font-bold text-gray-800">Récupération</h3>
                <p className="text-sm text-gray-500">Entrez votre email pour réinitialiser.</p>
             </div>

             {resetStatus === 'sent' ? (
               <div className="bg-green-50 p-4 rounded-xl text-center border border-green-200">
                 <p className="text-green-700 font-bold text-sm">Email envoyé !</p>
                 <p className="text-xs text-green-600 mt-1">Vérifiez votre boîte de réception pour changer votre mot de passe.</p>
                 <button onClick={() => setShowForgot(false)} className="mt-4 text-xs font-bold underline text-green-800">Fermer</button>
               </div>
             ) : (
               <form onSubmit={handleResetPassword} className="space-y-4">
                 <input 
                    type="email" 
                    placeholder="Votre email" 
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    required
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                 />
                 {resetStatus === 'error' && <p className="text-xs text-red-500">Erreur. Email inconnu ou problème serveur.</p>}
                 <button 
                    type="submit" 
                    disabled={resetStatus === 'sending'}
                    className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:bg-gray-300"
                 >
                    {resetStatus === 'sending' ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
                    Envoyer Lien
                 </button>
               </form>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginScreen;
