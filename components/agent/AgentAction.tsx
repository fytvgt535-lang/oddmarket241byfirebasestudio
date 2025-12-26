
import React, { useState } from 'react';
import { Stall, Sanction, Transaction, User } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Sun, Moon, ChevronLeft, Smartphone, CheckCircle2, MessageCircle, RotateCcw, AlertOctagon, X } from 'lucide-react';
import { formatCurrency } from '../../utils/coreUtils';
import { voidTransactionWithNotification } from '../../services/supabaseService';
import toast from 'react-hot-toast';

interface AgentActionProps {
  stall: Stall;
  mode: 'collect' | 'sanction';
  sanctions: Sanction[];
  transactions: Transaction[]; 
  onCancel: () => void;
  onSuccess: (data: any) => void;
  currentUser: User;
}

const AgentAction: React.FC<AgentActionProps> = ({ stall, mode, onCancel, onSuccess, currentUser }) => {
  const [step, setStep] = useState<'form' | 'success' | 'void_confirm'>('form');
  const [amount, setAmount] = useState<number>(0); 
  const [isSolaris, setIsSolaris] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  const containerClass = isSolaris 
    ? "bg-white text-black font-black" 
    : "bg-slate-900 text-white";

  const handleValidate = () => {
      const payload = { 
          id: `TX-${Date.now()}`,
          amount, 
          date: Date.now(), 
          ref: `GAB-${Date.now().toString().slice(-6)}`,
          status: 'completed',
          stallNumber: stall.number,
          provider: 'cash'
      };
      setSuccessData(payload);
      setStep('success');
      if (navigator.vibrate) navigator.vibrate([100, 30, 100]);
  };

  const handleVoidTransaction = async () => {
      if (!voidReason) return toast.error("Motif d'annulation requis");
      setIsVoiding(true);
      try {
          await voidTransactionWithNotification(successData.id, currentUser.id);
          toast.success("Transaction annulée. Vendeur notifié.");
          onCancel();
      } catch (e) {
          toast.error("Erreur lors de l'annulation");
      } finally {
          setIsVoiding(false);
      }
  };

  if (step === 'void_confirm') {
      return (
          <div className="fixed inset-0 z-[150] bg-red-600 p-8 flex flex-col text-white animate-fade-in">
              <div className="flex-1 flex flex-col justify-center space-y-6">
                  <AlertOctagon className="w-20 h-20 mx-auto animate-bounce"/>
                  <h3 className="text-3xl font-black text-center uppercase leading-none">Annuler l'Encaissement ?</h3>
                  <p className="text-center font-bold text-red-100 italic">"Une notification d'alerte sera envoyée sur le terminal du vendeur pour prévenir toute fraude."</p>
                  
                  <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-70">Justification Obligatoire</label>
                      <textarea 
                        value={voidReason}
                        onChange={e => setVoidReason(e.target.value)}
                        placeholder="Ex: Erreur de montant, Doublon..."
                        className="w-full p-4 bg-white/10 border-2 border-white/20 rounded-2xl text-white placeholder:text-white/40 font-bold outline-none focus:border-white"
                      />
                  </div>
              </div>
              <div className="space-y-3">
                  <Button 
                    isLoading={isVoiding}
                    className="w-full h-20 bg-white text-red-600 font-black rounded-3xl"
                    onClick={handleVoidTransaction}
                  >
                      CONFIRMER L'ANNULATION
                  </Button>
                  <button onClick={() => setStep('success')} className="w-full py-4 font-black uppercase text-xs">Retour</button>
              </div>
          </div>
      );
  }

  if (step === 'success') {
      return (
          <div className={`fixed inset-0 z-[110] bg-green-600 flex flex-col p-6 animate-fade-in text-white`}>
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-10">
                  <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center border-4 border-white/20">
                      <CheckCircle2 className="w-20 h-20 animate-scale-in"/>
                  </div>
                  <div className="w-full bg-white text-slate-900 rounded-[3.5rem] p-10 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-2 bg-green-500"></div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Encaissement Certifié</p>
                      <p className="text-6xl font-black tracking-tighter mb-4">{formatCurrency(successData.amount)}</p>
                      <div className="bg-slate-50 p-4 rounded-2xl mb-6">
                          <p className="text-[10px] font-black text-slate-400 uppercase">Code de secours (Contrôle)</p>
                          <p className="text-2xl font-mono font-black text-slate-800 tracking-[0.3em]">{successData.ref}</p>
                      </div>
                      
                      <button 
                        onClick={() => window.open(`https://wa.me/${stall.occupantPhone?.replace(/\D/g, '')}?text=RECU+GABON`)}
                        className="w-full py-5 bg-green-600 text-white rounded-2xl font-black flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg"
                      >
                        <MessageCircle className="w-6 h-6"/> WhatsApp
                      </button>
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pb-8">
                  <button onClick={() => setStep('void_confirm')} className="h-20 bg-black/20 rounded-3xl font-black uppercase text-[10px] flex items-center justify-center gap-2 border border-white/10">
                    <RotateCcw className="w-4 h-4"/> Erreur Saisie
                  </button>
                  <button onClick={() => onSuccess(successData)} className="h-20 bg-white text-green-700 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl">Terminer</button>
              </div>
          </div>
      );
  }

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col p-6 ${containerClass} animate-fade-in overflow-y-auto`}>
        <div className="flex justify-between items-center mb-6 shrink-0">
            <button onClick={onCancel} className={`p-4 rounded-2xl ${isSolaris ? 'bg-black text-white' : 'bg-slate-100 text-black'}`}><ChevronLeft/></button>
            <div className="text-center">
                <h3 className="font-black text-2xl tracking-tighter uppercase">{mode === 'collect' ? 'Collecte' : 'Sanction'}</h3>
                <p className="text-[10px] font-black uppercase opacity-60">Étal {stall.number} • {stall.occupantName}</p>
            </div>
            <button onClick={() => setIsSolaris(!isSolaris)} className={`p-4 rounded-2xl border-4 ${isSolaris ? 'border-black' : 'border-white/10'}`}>
                {isSolaris ? <Moon/> : <Sun/>}
            </button>
        </div>

        <div className="flex-1 space-y-6 pb-24">
            <div className={`p-10 rounded-[3rem] ${isSolaris ? 'bg-white border-8 border-black' : 'bg-white/5 border-2 border-white/10'}`}>
                <input 
                    type="number" 
                    inputMode="numeric"
                    value={amount || ''} 
                    onChange={e => setAmount(Number(e.target.value))} 
                    className="w-full text-7xl font-black bg-transparent border-none outline-none text-center" 
                    placeholder="0"
                />
                <p className="text-center font-black uppercase tracking-widest text-[10px] mt-2 opacity-50">Saisie Francs CFA</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
                {[1000, 2000, 5000, 10000, 25000, 50000].map(amt => (
                    <button key={amt} onClick={() => setAmount(amt)} className={`h-24 rounded-3xl font-black text-xl border-4 ${isSolaris ? 'border-black bg-white' : 'bg-slate-800 border-transparent shadow-xl'}`}>{amt/1000}k</button>
                ))}
            </div>

            <Button 
                className={`w-full h-32 text-4xl font-black uppercase shadow-2xl rounded-[3rem] ${isSolaris ? 'bg-black text-white' : 'bg-blue-600 text-white'}`}
                disabled={amount <= 0}
                onClick={handleValidate}
            >
                VALIDER
            </Button>
            <button onClick={onCancel} className="w-full py-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Annuler et sortir</button>
        </div>
    </div>
  );
};

export default AgentAction;
