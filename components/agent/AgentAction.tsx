
import React, { useState, useMemo, useEffect } from 'react';
import { Stall, Sanction, Mission } from '../../types';
import { INFRACTIONS_CATALOG } from '../../constants/appConstants';
import { calculateStallDebt, formatCurrency, generateSecureQrPayload } from '../../utils/coreUtils';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Card } from '../ui/Card';
import { Target, Volume2, Eye, Check, AlertOctagon, Printer, QrCode, Loader2, CheckCircle as CheckIcon, AlertTriangle, List } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../supabaseClient';

interface AgentActionProps {
  stall: Stall;
  mode: 'collect' | 'sanction';
  sanctions: Sanction[];
  activeMission?: Mission | null;
  onCancel: () => void;
  onPayment: (amount: number) => void;
  onSanction: (infractionId: string) => void;
  isProcessing: boolean;
}

const AgentAction: React.FC<AgentActionProps> = ({ stall, mode, sanctions, activeMission, onCancel, onPayment, onSanction, isProcessing }) => {
  const [amount, setAmount] = useState<number>(0); 
  const [infractionId, setInfractionId] = useState('');
  
  // SECURITY & PAYMENT FLOW STATE
  const [showInvoiceQR, setShowInvoiceQR] = useState(false);
  const [invoicePayload, setInvoicePayload] = useState<string>('');
  const [waitingForVendor, setWaitingForVendor] = useState(false);
  const [showDebtDetails, setShowDebtDetails] = useState(false);

  const financials = useMemo(() => calculateStallDebt(stall, sanctions), [stall, sanctions]);

  // Alert Agent immediately if debt is critical
  useEffect(() => {
      if (mode === 'collect' && financials.monthsUnpaid >= 3) {
          toast(`ALERTE: ${financials.monthsUnpaid} mois d'impayés !`, { icon: '🚨', style: { background: '#fee2e2', color: '#b91c1c' }, duration: 5000 });
      }
  }, [mode, financials.monthsUnpaid]);

  // Generate SECURE QR Payload when amount is set and confirmed
  const generateInvoice = async () => {
      if (!amount || amount <= 0) return;
      
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      // 1. Prepare raw payload
      const rawData = {
          type: 'PAYMENT_REQUEST',
          agentId: user.id,
          stallId: stall.id,
          amount: amount
      };

      // 2. Wrap in SECURE PROTOCOL (MCONNECT)
      const secureString = await generateSecureQrPayload(rawData);

      setInvoicePayload(secureString);
      setShowInvoiceQR(true);
      setWaitingForVendor(true);
      speakInvoice();
  };

  // Listen for Payment Confirmation from Vendor
  useEffect(() => {
      if (!waitingForVendor) return;

      const channel = supabase.channel(`payment_watch_${stall.id}`)
          .on('postgres_changes', { 
              event: 'INSERT', 
              schema: 'public', 
              table: 'transactions',
              filter: `stall_id=eq.${stall.id}`
          }, (payload) => {
              if (payload.new.amount === amount && payload.new.status === 'completed') {
                  setWaitingForVendor(false);
                  setShowInvoiceQR(false);
                  toast.success("Paiement validé par le vendeur !", { duration: 5000, icon: '✅' });
                  onPayment(amount); // Trigger success flow in parent
              }
          })
          .subscribe();

      return () => { supabase.removeChannel(channel); };
  }, [waitingForVendor, stall.id, amount]);

  const speakInvoice = () => {
      const text = `Facture de ${amount} francs générée. Veuillez scanner pour valider.`;
      if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'fr-FR';
          window.speechSynthesis.speak(utterance);
      }
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(invoicePayload)}&color=0f172a`;

  return (
    <div className="space-y-6">
        
        {/* INVOICE QR OVERLAY */}
        {showInvoiceQR && (
            <div className="fixed inset-0 z-[200] bg-slate-900 flex flex-col items-center justify-center p-4 animate-scale-in">
                <div className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-sm text-center relative">
                    <button onClick={() => setShowInvoiceQR(false)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                        <XIcon className="w-5 h-5 text-gray-600"/>
                    </button>

                    <h3 className="text-xl font-black text-slate-900 mb-1">Facture à Scanner</h3>
                    <p className="text-sm text-gray-500 mb-6">Présentez ce code au vendeur</p>
                    
                    <div className="bg-white border-4 border-slate-900 p-2 rounded-xl inline-block mb-6 relative">
                        <img src={qrUrl} alt="Facture QR" className="w-64 h-64 mix-blend-multiply"/>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            {waitingForVendor && <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-bold text-blue-600 border border-blue-200 flex items-center gap-2 animate-pulse"><Loader2 className="w-3 h-3 animate-spin"/> En attente du vendeur...</div>}
                        </div>
                    </div>

                    <div className="text-4xl font-black text-slate-900 mb-2">{formatCurrency(amount)}</div>
                    <p className="text-xs text-slate-400 font-mono flex items-center justify-center gap-1">
                        <CheckIcon className="w-3 h-3 text-green-500"/> Signature Numérique Active
                    </p>
                </div>
                <p className="text-white mt-8 text-sm opacity-70">Protocole MCONNECT v1.0 • Expire dans 5min</p>
            </div>
        )}

        {mode === 'collect' && (
            <Card className="animate-fade-in shadow-xl border-t-4 border-blue-600">
                <div className={`p-6 border-b border-gray-100 ${financials.totalDebt > 0 ? 'bg-red-50' : 'bg-blue-50'}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-3xl font-black text-gray-900">{stall.number}</h3>
                            <p className="text-sm font-bold opacity-70 text-gray-600">{stall.occupantName || 'Inconnu'}</p>
                        </div>
                        <div className="text-right">
                            <p className={`text-xs font-bold uppercase ${financials.totalDebt > 0 ? 'text-red-600' : 'text-gray-400'}`}>Dette Totale</p>
                            <p className={`text-xl font-black ${financials.totalDebt > 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatCurrency(financials.totalDebt)}</p>
                        </div>
                    </div>
                    
                    {/* Debt Details Expander */}
                    {financials.totalDebt > 0 && (
                        <div className="mt-4">
                            <button onClick={() => setShowDebtDetails(!showDebtDetails)} className="text-xs font-bold flex items-center gap-1 text-red-700 underline">
                                <List className="w-3 h-3"/> {showDebtDetails ? 'Masquer Détails' : 'Voir Détails Impayés'}
                            </button>
                            
                            {showDebtDetails && (
                                <div className="mt-2 bg-white/50 rounded p-2 text-xs space-y-1 max-h-32 overflow-y-auto">
                                    {(financials as any).details.map((item: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center text-red-800">
                                            <span>{item.label}</span>
                                            <span className="font-bold">{formatCurrency(item.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Suggestion Chips */}
                    <p className="text-xs font-bold text-gray-400 uppercase">Montants suggérés</p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {[stall.price, 5000, 10000, financials.totalDebt].filter(v => v > 0).map((val, idx) => (
                            <button 
                                key={idx} 
                                onClick={() => setAmount(val)} 
                                className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all shadow-sm ${amount === val ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                            >
                                {formatCurrency(val)}
                            </button>
                        ))}
                    </div>

                    <div className="relative">
                        <Input 
                            label="Montant à Facturer (FCFA)" 
                            type="number" 
                            value={amount || ''} 
                            onChange={e => setAmount(Number(e.target.value))} 
                            className="text-3xl font-black text-center h-20 text-blue-900 bg-blue-50 border-blue-200"
                            placeholder="0"
                        />
                    </div>

                    <Button 
                        onClick={generateInvoice} 
                        isLoading={isProcessing} 
                        disabled={!amount || amount <= 0}
                        className="w-full h-16 text-xl bg-slate-900 hover:bg-black text-white shadow-xl"
                    >
                        <QrCode className="w-6 h-6 mr-2"/> GÉNÉRER FACTURE
                    </Button>

                    <p className="text-center text-xs text-gray-400">Le reçu sera envoyé au vendeur après son scan.</p>

                    <Button variant="ghost" onClick={onCancel} className="w-full text-gray-400 hover:text-gray-600">Annuler</Button>
                </div>
            </Card>
        )}

        {mode === 'sanction' && (
            <div className="space-y-4">
                <Select label="Motif de l'infraction" value={infractionId} onChange={e => setInfractionId(e.target.value)}>
                    <option value="">Sélectionner dans le Code...</option>
                    {/* USING IMPORTED CONSTANTS */}
                    {INFRACTIONS_CATALOG.map(i => (
                        <option key={i.id} value={i.id}>{i.label} - {formatCurrency(i.amount)}</option>
                    ))}
                </Select>
                
                <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                    <p className="text-xs text-red-800 font-bold mb-2">Protocole Sanction:</p>
                    <ul className="text-xs text-red-700 list-disc pl-4 space-y-1">
                        <li>Preuve photo obligatoire.</li>
                        <li>Géolocalisation précise requise.</li>
                    </ul>
                </div>
                
                <Button variant="danger" onClick={() => onSanction(infractionId)} disabled={!infractionId} isLoading={isProcessing} className="w-full py-4 text-lg">
                    Confirmer Sanction
                </Button>
                <Button variant="ghost" onClick={onCancel} className="w-full text-gray-400 hover:text-gray-600">Annuler</Button>
            </div>
        )}
    </div>
  );
};

function XIcon(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 18 18"/></svg>
    )
}

export default AgentAction;
