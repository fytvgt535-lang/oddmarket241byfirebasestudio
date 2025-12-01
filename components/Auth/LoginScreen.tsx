
import React, { useState } from 'react';
import { LogIn, Phone, Lock, AlertCircle, ShoppingBag } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (email: string, pass: string) => void;
  onGoToRegister: () => void;
  onGuestAccess: () => void;
  error?: string;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onGoToRegister, onGuestAccess, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-green-700 p-8 text-center text-white">
          <h1 className="text-3xl font-black mb-2">MarchéConnect</h1>
          <p className="text-green-100 opacity-90">Accès Sécurisé Mairie & Vendeurs</p>
        </div>

        {/* Form */}
        <div className="p-8">
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email ou Téléphone</label>
              <div className="relative">
                <Phone className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input 
                  type="text" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="07 XX XX XX" 
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mot de Passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all font-medium"
                  required
                />
              </div>
            </div>

            <button type="submit" className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-200 transition-transform active:scale-95 flex items-center justify-center gap-2">
              <LogIn className="w-5 h-5" />
              Connexion
            </button>
          </form>

          <div className="mt-8 text-center space-y-4">
             <p className="text-gray-500 text-sm">
               Pas encore de compte ?{' '}
               <button onClick={onGoToRegister} className="text-green-700 font-bold hover:underline">
                 Créer un compte
               </button>
             </p>
             
             <div className="relative py-2">
                 <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200"></span></div>
                 <div className="relative flex justify-center"><span className="bg-white px-2 text-xs text-gray-400 uppercase">Ou</span></div>
             </div>

             <button onClick={onGuestAccess} className="w-full py-3 border-2 border-green-100 text-green-700 font-bold rounded-xl hover:bg-green-50 transition-colors flex items-center justify-center gap-2">
               <ShoppingBag className="w-5 h-5" />
               Accès Citoyen (Vitrine)
             </button>
          </div>
        </div>
      </div>
      <p className="mt-8 text-center text-xs text-gray-400">© 2024 Mairie de Libreville • Plateforme Officielle</p>
    </div>
  );
};

export default LoginScreen;
