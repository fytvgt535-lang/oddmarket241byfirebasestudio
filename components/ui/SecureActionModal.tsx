
import React, { useState } from 'react';
import { Lock, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { verifyPassword } from '../../services/supabaseService';
import toast from 'react-hot-toast';

interface SecureActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  description: string;
  email: string;
  confirmText?: string;
  variant?: 'danger' | 'primary';
}

const SecureActionModal: React.FC<SecureActionModalProps> = ({ 
  isOpen, onClose, onConfirm, title, description, email, confirmText = 'Confirmer', variant = 'danger' 
}) => {
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    try {
      const isValid = await verifyPassword(email, password);
      if (isValid) {
        await onConfirm();
        onClose();
        setPassword('');
      } else {
        toast.error("Mot de passe incorrect.");
      }
    } catch (error) {
      toast.error("Erreur de vérification.");
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative overflow-hidden">
        <div className={`absolute top-0 left-0 right-0 h-2 ${variant === 'danger' ? 'bg-red-500' : 'bg-blue-600'}`}></div>
        
        <div className="flex flex-col items-center text-center mb-6 mt-2">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${variant === 'danger' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
            <Lock className="w-8 h-8"/>
          </div>
          <h3 className="text-xl font-black text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5"/>
            <p className="text-xs text-gray-600 text-left">
              Cette action sera enregistrée dans le journal d'audit indélébile. Entrez votre mot de passe pour valider.
            </p>
          </div>

          <Input 
            type="password" 
            placeholder="Votre mot de passe" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
            autoFocus
            className="text-center"
          />

          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1" disabled={isVerifying}>
              Annuler
            </Button>
            <Button type="submit" variant={variant} className="flex-1" isLoading={isVerifying}>
              {confirmText}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SecureActionModal;
