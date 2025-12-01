
import React, { useState } from 'react';
import { User, Mail, Lock, ArrowRight, ArrowLeft, CheckCircle, CreditCard, Loader2, Camera, AlertTriangle } from 'lucide-react';
import { IdentityType } from '../../types';

interface RegisterScreenProps {
  onRegister: (data: any) => void;
  onBackToLogin: () => void;
  isLoading?: boolean;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ onRegister, onBackToLogin, isLoading = false }) => {
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    identityType: 'cni' as IdentityType,
    identityNumber: '',
    identityFile: null as string | null
  });

  const handleNext = () => setStep(prev => prev + 1);
  const handlePrev = () => setStep(prev => prev - 1);

  const handleFileUpload = () => {
    // Simulation upload fichier
    setTimeout(() => {
        setFormData(prev => ({ ...prev, identityFile: "https://images.unsplash.com/photo-1633265486064-084b5f9940ce?auto=format&fit=crop&q=80&w=300" }));
    }, 800);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isLoading) return;
    
    if (formData.password !== formData.confirmPassword) {
        setError("Les mots de passe ne correspondent pas.");
        return;
    }

    try {
        await onRegister(formData);
    } catch (err: any) {
        setError(err.message || "Erreur lors de l'inscription");
    }
  };

  const renderStep = () => {
    switch(step) {
        case 1:
            return (
                <div className="space-y-5 animate-fade-in">
                    <h3 className="text-xl font-bold text-gray-800">1. Identité</h3>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nom Complet</label>
                        <div className="relative">
                            <User className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                            <input 
                              required 
                              type="text" 
                              placeholder="Ex: Paul Mba" 
                              value={formData.name} 
                              onChange={e => setFormData({...formData, name: e.target.value})} 
                              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:bg-white transition-all"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                            <input 
                              required 
                              type="email" 
                              placeholder="paul@email.com" 
                              value={formData.email} 
                              onChange={e => setFormData({...formData, email: e.target.value})} 
                              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:bg-white transition-all"
                            />
                        </div>
                    </div>
                </div>
            );
        case 2:
            return (
                <div className="space-y-5 animate-fade-in">
                    <h3 className="text-xl font-bold text-gray-800">2. Sécurité</h3>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mot de Passe</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                            <input 
                              required 
                              type="password" 
                              placeholder="••••••••" 
                              value={formData.password} 
                              onChange={e => setFormData({...formData, password: e.target.value})} 
                              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:bg-white transition-all"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirmer</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                            <input 
                              required 
                              type="password" 
                              placeholder="••••••••" 
                              value={formData.confirmPassword} 
                              onChange={e => setFormData({...formData, confirmPassword: e.target.value})} 
                              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:bg-white transition-all"
                            />
                        </div>
                    </div>
                </div>
            );
        case 3:
            return (
                <div className="space-y-6 animate-fade-in">
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-gray-800 mb-1">3. Validation (KYC)</h3>
                        <p className="text-sm text-gray-500">Pour votre badge Vendeur Officiel</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type de Document</label>
                        <select 
                            value={formData.identityType}
                            onChange={e => setFormData({...formData, identityType: e.target.value as any})}
                            className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                        >
                            <option value="cni">Carte Nationale d'Identité (CNI)</option>
                            <option value="passport">Passeport</option>
                            <option value="carte_sejour">Carte de Séjour</option>
                        </select>
                    </div>

                    <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-white hover:border-green-500 transition-all cursor-pointer" onClick={handleFileUpload}>
                        {formData.identityFile ? (
                            <div className="relative w-full h-32 bg-gray-200 rounded-lg overflow-hidden shadow-md">
                                <img src={formData.identityFile} className="w-full h-full object-cover" alt="ID Preview"/>
                                <div className="absolute inset-0 bg-green-900/40 flex items-center justify-center">
                                    <CheckCircle className="w-8 h-8 text-white"/>
                                </div>
                            </div>
                        ) : (
                            <>
                                <Camera className="w-10 h-10 text-green-600 mb-2 p-2 bg-green-100 rounded-full"/>
                                <p className="text-sm font-bold text-gray-600">Scanner la pièce</p>
                                <p className="text-xs text-gray-400 mt-1">Photo claire et lisible</p>
                            </>
                        )}
                    </div>
                </div>
            );
        default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="bg-white p-6 border-b border-gray-100 flex items-center justify-between">
                <button onClick={onBackToLogin} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft className="w-5 h-5"/></button>
                <div className="flex gap-2">
                    {[1,2,3].map(i => (
                        <div key={i} className={`h-2 w-2 rounded-full transition-all ${i === step ? 'bg-green-600 w-8' : i < step ? 'bg-green-600' : 'bg-gray-200'}`}></div>
                    ))}
                </div>
                <div className="w-9"></div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex gap-2 items-start">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                    <p className="text-xs text-red-700 font-medium">{error}</p>
                </div>
            )}

            {/* Form Body */}
            <div className="p-8 flex-1">
                <form id="register-form" onSubmit={handleSubmit}>
                    {renderStep()}
                </form>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-100 bg-gray-50">
                <div className="flex gap-4">
                    {step > 1 && (
                        <button type="button" onClick={handlePrev} className="flex-1 py-4 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50">
                            Retour
                        </button>
                    )}
                    {step < 3 ? (
                        <button type="button" onClick={handleNext} className="flex-1 py-4 bg-gray-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-black">
                            Suivant <ArrowRight className="w-5 h-5"/>
                        </button>
                    ) : (
                        <button 
                            type="submit" 
                            form="register-form"
                            disabled={!formData.identityFile || isLoading} 
                            className="flex-1 py-4 bg-green-600 disabled:bg-gray-300 disabled:text-gray-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-200 hover:bg-green-700"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Terminer"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default RegisterScreen;
