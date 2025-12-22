
import React, { useState, useRef, useEffect } from 'react';
import { Stall, Sanction, Transaction, User } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { QrCode, Sun, Moon, ChevronLeft, Volume2, Smartphone, Loader2, CheckCircle2, MessageCircle, ArrowRight, RotateCcw } from 'lucide-react';
import { generateAudioReceipt } from '../../services/geminiService';
import { formatCurrency } from '../../utils/coreUtils';
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
  const [step, setStep] = useState<'handshake' | 'form' | 'success'>('handshake');
  const [amount, setAmount] = useState<number>(0); 
  const [isSolaris, setIsSolaris] = useState(false); // Mode haute visibilité pour extérieur (Soleil)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [undoCountdown, setUndoCountdown] = useState<number>(0);

  const containerClass = isSolaris 
    ? "bg-white text-black font-black" 
    : "bg-slate-900 text-white";

  const handleValidate = () => {
      const payload = { 
          amount, 
          date: Date.now(), 
          ref: `GAB-${Date.now().toString().slice(-6)}`,
          status: 'confirmed'
      };
      setSuccessData(payload);
      setStep('success');
      setUndoCountdown(7); // Sécurité anti-erreur : 7 secondes pour annuler
      if (navigator.vibrate) navigator.vibrate([100, 30, 100]);
  };

  const shareReceiptWhatsApp = () => {
      if (!successData) return;
      const msg = `🧾 *RECU MARCHECONNECT GABON*\n--------------------------\nRef: #${successData.ref}\nClient: ${stall.occupantName}\nÉtal: ${stall.number}\nMarché: ${stall.marketId}\n*MONTANT: ${formatCurrency(successData.amount)}*\nDate: ${new Date(successData.date).toLocaleString()}\n--------------------------\n_Certifié par l'Agent ${currentUser.name}_`;
      const url = `https://wa.me/${stall.occupantPhone?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');
  };

  const playVoiceReceipt = async () => {
    if (!successData || isSpeaking) return;
    setIsSpeaking(true);
    const audioBytes = await generateAudioReceipt(successData.amount, stall.occupantName || 'le commerçant');
    if (audioBytes) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const buffer = ctx.createBuffer(1, audioBytes.length / 2, 24000);
      const data = buffer.getChannelData(0);
      const int16 = new Int16Array(audioBytes.buffer);
      for (let i = 0; i < data.length; i++) data[i] = int16[i] / 32768.0;
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setIsSpeaking(false);
      source.start();
    } else {
      setIsSpeaking(false);
      toast.error("Vocal indisponible");
    }
  };

  if (step === 'success') {
      return (
          <div className={`fixed inset-0 z-[110] ${undoCountdown > 0 ? 'bg-amber-600' : 'bg-green-600'} flex flex-col p-6 animate-fade-in text-white transition-colors duration-500`}>
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-10">
                  {undoCountdown > 0 ? (
                      <div className="w-32 h-32 border-8 border-white/20 rounded-full flex items-center justify-center text-5xl font-black">{undoCountdown}</div>
                  ) : (
                      <CheckCircle2 className="w-32 h-32 animate-scale-in"/>
                  )}
                  <div className="w-full bg-white text-slate-900 rounded-[3rem] p-8 shadow-2xl">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confirmation Finale</p>
                      <p className="text-5xl font-black tracking-tighter">{formatCurrency(successData.amount)}</p>
                      
                      <div className="grid grid-cols-2 gap-3 mt-6">
                        <button 
                          onClick={playVoiceReceipt}
                          disabled={isSpeaking}
                          className="py-4 bg-blue-50 text-blue-600 rounded-2xl font-black flex flex-col items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                          {isSpeaking ? <Loader2 className="animate-spin w-5 h-5"/> : <Volume2 className="w-5 h-5"/>}
                          <span className="text-[10px] uppercase">Vocal</span>
                        </button>
                        <button 
                          onClick={shareReceiptWhatsApp}
                          className="py-4 bg-green-50 text-green-600 rounded-2xl font-black flex flex-col items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                          <MessageCircle className="w-5 h-5"/>
                          <span className="text-[10px] uppercase">WhatsApp</span>
                        </button>
                      </div>
                  </div>
              </div>
              <div className="space-y-4 pb-8">
                  {undoCountdown > 0 ? (
                      <button onClick={() => setStep('form')} className="w-full h-24 bg-white text-amber-700 rounded-[2.5rem] font-black uppercase text-xl shadow-2xl flex items-center justify-center gap-3">
                        <RotateCcw className="w-6 h-6"/> ANNULER
                      </button>
                  ) : (
                      <button onClick={() => onSuccess(successData)} className="w-full h-20 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em]">NOUVELLE OPERATION</button>
                  )}
              </div>
          </div>
      );
  }

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col p-6 ${containerClass} animate-fade-in overflow-y-auto`}>
        <div className="flex justify-between items-center mb-6 shrink-0">
            <button onClick={onCancel} className={`p-4 rounded-2xl ${isSolaris ? 'bg-black text-white' : 'bg-slate-100 text-black'}`}><ChevronLeft/></button>
            <div className="text-center">
                <h3 className="font-black text-2xl tracking-tighter uppercase">{mode === 'collect' ? 'Encaissement' : 'Sanction'}</h3>
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
            <button onClick={onCancel} className="w-full py-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Abandonner la saisie</button>
        </div>
    </div>
  );
};

export default AgentAction;
