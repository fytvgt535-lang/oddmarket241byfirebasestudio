
import React, { useState, useRef, useEffect } from 'react';
import { User, Mail, Lock, ArrowRight, ArrowLeft, CheckCircle, CreditCard, Loader2, Camera, AlertTriangle, Key, ShieldCheck, XCircle } from 'lucide-react';
import { IdentityType } from '../../types';
import { checkValueExists, uploadFile } from '../../services/supabaseService';
import { checkPasswordStrength } from '../../utils/security';

interface RegisterScreenProps {
  onRegister: (data: any) => void;
  onBackToLogin: () => void;
  isLoading?: boolean;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ onRegister, onBackToLogin, isLoading = false }) => {
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Real File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    identityType: 'cni' as IdentityType,
    identityNumber: '',
    identityFile: null as string | null,
    invitationCode: ''
  });

  // Password Analysis
  const [passwordAnalysis, setPasswordAnalysis] = useState<any>(null);

  useEffect(() => {
      setPasswordAnalysis(checkPasswordStrength(formData.password));
  }, [formData.password]);

  const handleNextStep = async () => {
    setError(null);
    
    // --- STEP 1 VALIDATION (IDENTITY) ---
    if (step === 1) {
        if (!formData.name.trim()) { setError("Le nom complet est obligatoire."); return; }
        if (!formData.email.trim()) { setError("L'adresse email est obligatoire."); return; }
        if (!formData.email.includes('@')) { setError("Format d'email invalide."); return; }

        setIsVerifying(true);
        try {
            const emailTaken = await checkValueExists('email', formData.email.trim());
            if (emailTaken) {
                setError("Cette adresse email est déjà inscrite. Connectez-vous.");
                setIsVerifying(false);
                return;
            }
            setStep(2);
        } catch (e: any) {
            // En cas d'erreur réseau (ex: offline), on laisse passer pour UX, le serveur rejettera au final
            setStep(2);
        } finally {
            setIsVerifying(false);
        }
        return;
    }

    // --- STEP 2 VALIDATION (SECURITY) ---
    if (step === 2) {
        if (!passwordAnalysis.isValid) {
            setError("Le mot de passe ne respecte pas les critères de sécurité.");
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            setError("Les mots de passe ne correspondent pas.");
            return;
        }
        setStep(3);
    }
  };

  const handlePrev = () => {
      setError(null);
      setStep(prev => prev - 1);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        setIsUploading(true);
        setError(null);
        try {
            const file = e.target.files[0];
            const url = await uploadFile(file, 'avatars'); 
            setFormData(prev => ({ ...prev, identityFile: url }));
        } catch (err: any) {
            setError("Erreur upload: " + err.message);
        } finally {
            setIsUploading(false);
        }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isLoading) return;
    
    if (!formData.identityFile) {
        setError("La photo de la pièce d'identité est obligatoire.");
        return;
    }

    try {
        await onRegister(formData);
    } catch (err: any) {
        setError(err.message || "Erreur lors de l'inscription");
    }
  };

  const renderPasswordStrength = () => {
      if (!formData.password) return null;
      return (
          <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
              <p className="font-bold text-gray-500 mb-2 uppercase">Sécurité du mot de passe</p>
              <div className="grid grid-cols-2 gap-2">
                  {passwordAnalysis.checks.map((check: any, idx: number) => (
                      <div key={idx} className={`flex items-center gap-1 ${check.pass ? 'text-green-600' : 'text-gray-400'}`}>
                          {check.pass ? <CheckCircle className="w-3 h-3"/> : <XCircle className="w-3 h-3"/>}
                          <span>{check.label}</span>
                      </div>
                  ))}
              </div>
              <div className="w-full bg-gray-200 h-1 mt-3 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                        passwordAnalysis.strength === 'strong' ? 'bg-green-500 w-full' : 
                        passwordAnalysis.strength === 'medium' ? 'bg-orange-500 w-2/3' : 'bg-red-500 w-1/3'
                    }`}
                  ></div>
              </div>
          </div>
      );
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
                            <input required type="text" placeholder="Ex: Paul Mba" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:bg-white transition-all"/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                            <input required type="email" placeholder="paul@email.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:bg-white transition-all"/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Code d'Invitation (Optionnel)</label>
                        <div className="relative">
                            <Key className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                            <input type="text" placeholder="Pour Admin/Agent" value={formData.invitationCode} onChange={e => setFormData({...formData, invitationCode: e.target.value})} className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:bg-white transition-all uppercase"/>
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
                            <input required type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:bg-white transition-all"/>
                        </div>
                        {renderPasswordStrength()}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirmer</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                            <input required type="password" placeholder="••••••••" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:bg-white transition-all"/>
                        </div>
                    </div>
                </div>
            );
        case 3:
            return (
                <div className="space-y-6 animate-fade-in">
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-gray-800 mb-1">3. Validation (KYC)</h3>
                        <p className="text-sm text-gray-500">Pour votre badge Officiel</p>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type de Document</label>
                        <select value={formData.identityType} onChange={e => setFormData({...formData, identityType: e.target.value as any})} className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500">
                            <option value="cni">Carte Nationale d'Identité (CNI)</option>
                            <option value="passport">Passeport</option>
                            <option value="carte_sejour">Carte de Séjour</option>
                        </select>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,application/pdf" />
                    <div className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center transition-all cursor-pointer ${isUploading ? 'bg-gray-100 border-gray-300' : 'bg-gray-50 hover:bg-white border-gray-300 hover:border-green-500'}`} onClick={() => fileInputRef.current?.click()}>
                        {isUploading ? (
                            <div className="flex flex-col items-center"><Loader2 className="w-10 h-10 text-green-600 animate-spin mb-2"/><p className="text-sm font-bold text-gray-500">Téléchargement...</p></div>
                        ) : formData.identityFile ? (
                            <div className="relative w-full h-32 bg-gray-200 rounded-lg overflow-hidden shadow-md">
                                <img src={formData.identityFile} className="w-full h-full object-cover" alt="ID Preview"/>
                                <div className="absolute inset-0 bg-green-900/40 flex items-center justify-center"><CheckCircle className="w-8 h-8 text-white"/></div>
                            </div>
                        ) : (
                            <><Camera className="w-10 h-10 text-green-600 mb-2 p-2 bg-green-100 rounded-full"/><p className="text-sm font-bold text-gray-600">Scanner la pièce</p><p className="text-xs text-gray-400 mt-1">Toucher pour importer</p></>
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
            <div className="bg-white p-6 border-b border-gray-100 flex items-center justify-between">
                <button onClick={onBackToLogin} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft className="w-5 h-5"/></button>
                <div className="flex gap-2">{[1,2,3].map(i => <div key={i} className={`h-2 w-2 rounded-full transition-all ${i === step ? 'bg-green-600 w-8' : i < step ? 'bg-green-600' : 'bg-gray-200'}`}></div>)}</div>
                <div className="w-9"></div>
            </div>
            {error && (
                <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex gap-2 items-start animate-fade-in">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                    <p className="text-xs text-red-700 font-medium">{error}</p>
                </div>
            )}
            <div className="p-8 flex-1"><form id="register-form" onSubmit={handleSubmit}>{renderStep()}</form></div>
            <div className="p-6 border-t border-gray-100 bg-gray-50">
                <div className="flex gap-4">
                    {step > 1 && <button type="button" onClick={handlePrev} className="flex-1 py-4 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50">Retour</button>}
                    {step < 3 ? (
                        <button type="button" onClick={handleNextStep} disabled={isVerifying} className="flex-1 py-4 bg-gray-900 disabled:bg-gray-400 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-black transition-colors">{isVerifying ? <Loader2 className="w-5 h-5 animate-spin"/> : <>Suivant <ArrowRight className="w-5 h-5"/></>}</button>
                    ) : (
                        <button type="submit" form="register-form" disabled={!formData.identityFile || isLoading || isUploading} className="flex-1 py-4 bg-green-600 disabled:bg-gray-300 disabled:text-gray-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-200 hover:bg-green-700">{isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Terminer"}</button>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default RegisterScreen;
