import React, { useState } from 'react';
import { LogIn, Mail, Lock, AlertCircle, ShoppingBag, Loader2, Store } from 'lucide-react';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    onLogin(email, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gray-900">
      
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0 opacity-40">
        <img 
          src="https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=1920&auto=format&fit=crop" 
          alt="Marché Background" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-green-900/50"></div>
      </div>

      <div className="max-w-md w-full bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden relative z-10 border border-white/10">
        
        {/* Header Branding */}
        <div className="bg-green-700 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
          
          <div className="mx-auto w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md mb-4 shadow-inner border border-white/30">
            <Store className="w-8 h-8 text-white" />
          </div>
          
          <h1 className="text-3xl font-black mb-1 text-white tracking-tight">MarchéConnect</h1>
          <p className="text-green-100 text-sm font-medium opacity-90">Portail Unifié • Mairie de Libreville</p>
        </div>

        {/* Form Container */}
        <div className="p-8">
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                 <p className="text-sm font-bold text-red-800">Échec de connexion</p>
                 <p className="text-xs text-red-600 mt-1">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Email</label>
              <div className="relative group">
                <div className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-green-600 transition-colors">
                    <Mail className="w-5 h-5" />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com" 
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all font-medium text-gray-900 placeholder-gray-400"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1 ml-1">
                 <label className="block text-xs font-bold text-gray-500 uppercase">Mot de Passe</label>
                 <button type="button" className="text-xs text-green-600 font-bold hover:underline" onClick={() => alert("Veuillez contacter l'administrateur système pour réinitialiser.")}>Oublié ?</button>
              </div>
              <div className="relative group">
                <div className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-green-600 transition-colors">
                    <Lock className="w-5 h-5" />
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all font-medium text-gray-900 placeholder-gray-400"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              {isLoading ? 'Connexion...' : 'Se Connecter'}
            </button>
          </form>

          <div className="mt-8 space-y-4">
             <div className="text-center">
               <p className="text-gray-500 text-sm">Nouveau vendeur ?</p>
               <button 
                 onClick={onGoToRegister} 
                 disabled={isLoading}
                 className="text-green-700 font-bold hover:underline text-sm mt-1"
               >
                 Créer un compte professionnel
               </button>
             </div>
             
             <div className="relative py-2">
                 <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200"></span></div>
                 <div className="relative flex justify-center"><span className="bg-white/95 px-3 text-xs text-gray-400 uppercase font-medium">Grand Public</span></div>
             </div>

             <button 
               onClick={onGuestAccess} 
               disabled={isLoading}
               className="w-full py-3.5 border-2 border-green-100 bg-green-50/50 text-green-800 font-bold rounded-xl hover:bg-green-100 transition-colors flex items-center justify-center gap-2"
             >
               <ShoppingBag className="w-5 h-5" />
               Accès Vitrine Citoyenne
             </button>
          </div>
        </div>
        
        {/* Footer info */}
        <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
             <p className="text-[10px] text-gray-400 font-medium">
                 Système sécurisé v2.1 • © Mairie de Libreville
             </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;