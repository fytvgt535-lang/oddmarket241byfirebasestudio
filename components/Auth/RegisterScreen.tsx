
import React, { useState } from 'react';
import { User, Mail, Phone, Lock, Upload, ArrowRight, ArrowLeft, CheckCircle, ShieldCheck, CreditCard } from 'lucide-react';
import { IdentityType } from '../../types';

interface RegisterScreenProps {
  onRegister: (data: any) => void;
  onBackToLogin: () => void;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ onRegister, onBackToLogin }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    identityType: 'cni' as IdentityType,
    identityNumber: '',
    identityFile: null as string | null
  });

  const handleNext = () => setStep(prev => prev + 1);
  const handlePrev = () => setStep(prev => prev - 1);

  const handleFileUpload = () => {
    // Simulating file upload
    setTimeout(() => {
        setFormData(prev => ({ ...prev, identityFile: "https://images.unsplash.com/photo-1633265486064-084b5f9940ce?auto=format&fit=crop&q=80&w=300" }));
    }, 1000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRegister(formData);
  };

  const renderStep = () => {
    switch(step) {
        case 1:
            return (
                <div className="space-y-4 animate-fade-in">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Informations Personnelles</h3>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nom Complet</label>
                        <div className="relative">
                            <User className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                            <input required type="text" placeholder="Ex: Jean Ntoutoume" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full pl-12 pr-4 py-3 bg-gray-50 border-gray-200 border rounded-xl outline-none focus:border-green-500"/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email (Optionnel)</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                            <input type="email" placeholder="jean@email.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full pl-12 pr-4 py-3 bg-gray-50 border-gray-200 border rounded-xl outline-none focus:border-green-500"/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Téléphone Mobile</label>
                        <div className="relative">
                            <Phone className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                            <input required type="tel" placeholder="07 XX XX XX" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full pl-12 pr-4 py-3 bg-gray-50 border-gray-200 border rounded-xl outline-none focus:border-green-500"/>
                        </div>
                    </div>
                </div>
            );
        case 2:
            return (
                <div className="space-y-4 animate-fade-in">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Sécurité du Compte</h3>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mot de Passe</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                            <input required type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full pl-12 pr-4 py-3 bg-gray-50 border-gray-200 border rounded-xl outline-none focus:border-green-500"/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirmer</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                            <input required type="password" placeholder="••••••••" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} className="w-full pl-12 pr-4 py-3 bg-gray-50 border-gray-200 border rounded-xl outline-none focus:border-green-500"/>
                        </div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-xl text-xs text-blue-700 border border-blue-100 flex gap-2">
                        <ShieldCheck className="w-5 h-5 shrink-0"/>
                        <p>Votre mot de passe doit contenir au moins 6 caractères pour sécuriser vos transactions.</p>
                    </div>
                </div>
            );
        case 3:
            return (
                <div className="space-y-6 animate-fade-in">
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-gray-800 mb-1">Vérification d'Identité (KYC)</h3>
                        <p className="text-sm text-gray-500">Obligatoire pour vendre sur la plateforme.</p>
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

                    <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Numéro du Document</label>
                         <input required type="text" placeholder="Ex: 123456789" value={formData.identityNumber} onChange={e => setFormData({...formData, identityNumber: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"/>
                    </div>

                    <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-white transition-colors cursor-pointer" onClick={handleFileUpload}>
                        {formData.identityFile ? (
                            <div className="relative w-full h-32 bg-gray-200 rounded-lg overflow-hidden">
                                <img src={formData.identityFile} className="w-full h-full object-cover" alt="ID Preview"/>
                                <div className="absolute inset-0 bg-green-900/40 flex items-center justify-center">
                                    <CheckCircle className="w-8 h-8 text-white"/>
                                </div>
                            </div>
                        ) : (
                            <>
                                <CreditCard className="w-10 h-10 text-gray-300 mb-2"/>
                                <p className="text-sm font-bold text-gray-600">Appuyez pour scanner la pièce</p>
                                <p className="text-xs text-gray-400 mt-1">Format clair et lisible</p>
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
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-white p-6 border-b border-gray-100">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={onBackToLogin} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft className="w-5 h-5"/></button>
                    <span className="font-bold text-gray-400 text-xs uppercase tracking-widest">Inscription Vendeur</span>
                    <div className="w-9"></div>
                </div>
                <div className="flex justify-center gap-2">
                    {[1,2,3].map(i => (
                        <div key={i} className={`h-1.5 w-12 rounded-full transition-colors ${i <= step ? 'bg-green-600' : 'bg-gray-200'}`}></div>
                    ))}
                </div>
            </div>

            <div className="p-8 overflow-y-auto flex-1">
                <form onSubmit={handleSubmit}>
                    {renderStep()}
                </form>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50">
                <div className="flex gap-4">
                    {step > 1 && (
                        <button type="button" onClick={handlePrev} className="flex-1 py-4 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl">Retour</button>
                    )}
                    {step < 3 ? (
                        <button type="button" onClick={handleNext} className="flex-1 py-4 bg-green-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-200">
                            Suivant <ArrowRight className="w-5 h-5"/>
                        </button>
                    ) : (
                        <button type="button" onClick={handleSubmit} disabled={!formData.identityFile} className="flex-1 py-4 bg-green-600 disabled:bg-gray-300 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2">
                            Créer mon Compte
                        </button>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default RegisterScreen;
