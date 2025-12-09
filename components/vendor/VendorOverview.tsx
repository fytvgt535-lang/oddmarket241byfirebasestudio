import React, { useState } from 'react';
import { QrCode, AlertTriangle, History, MapPin, CheckCircle, Sparkles, Scan, RefreshCw, ShieldCheck, X, FileText, Gavel, Send } from 'lucide-react';
import { Stall, VendorProfile, Transaction, Sanction } from '../../types';
import { generateVendorCoachTip } from '../../services/geminiService';
import { formatCurrency } from '../../utils/coreUtils';
import { Button } from '../ui/Button';

interface VendorOverviewProps {
  profile: VendorProfile;
  myStall?: Stall;
  totalDebt: number;
  transactions: Transaction[];
  sanctions: Sanction[];
  onShowMap: () => void;
  onSpeak: (text: string) => void;
  onContestSanction?: (id: string, reason: string) => void;
}

const VendorOverview: React.FC<VendorOverviewProps> = ({ profile, myStall, totalDebt, transactions, sanctions, onShowMap, onSpeak, onContestSanction }) => {
  const [isPayingDebt, setIsPayingDebt] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [agentScanned, setAgentScanned] = useState(false);
  const [isScanMode, setIsScanMode] = useState(false);
  const [aiTip, setAiTip] = useState<string | null>(null);
  
  // Contest Logic
  const [contestId, setContestId] = useState<string | null>(null);
  const [contestReason, setContestReason] = useState('');

  React.useEffect(() => {
    const loadTip = async () => {
      const tip = await generateVendorCoachTip(profile, myStall);
      setAiTip(tip);
    };
    if (myStall) loadTip();
  }, [profile, myStall]);

  const handleScanAgent = () => {
      setIsScanMode(true);
      setTimeout(() => {
          setIsScanMode(false);
          setAgentScanned(true);
      }, 1500);
  };

  const submitContest = () => {
      if (contestId && onContestSanction) {
          onContestSanction(contestId, contestReason);
          setContestId(null);
          setContestReason('');
      }
  };

  return (
    <div className="space-y-4 animate-fade-in">
        {/* Secure Debt Payment Modal */}
        {isPayingDebt && myStall && (
            <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-3xl w-full max-w-sm p-6 text-center animate-fade-in border border-gray-200">
                    <h3 className="text-xl font-black text-gray-800 mb-2">Paiement de Dette</h3>
                    <p className="text-gray-500 text-sm mb-6">Pour payer en espèces, vous devez OBLIGATOIREMENT scanner le code de l'agent.</p>
                    
                    {!agentScanned ? (
                        <button 
                            onClick={handleScanAgent}
                            className="w-full aspect-square bg-gray-50 rounded-3xl flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-blue-500 active:bg-blue-50 transition-all group"
                        >
                            {isScanMode ? (
                                <RefreshCw className="w-12 h-12 text-blue-500 animate-spin"/>
                            ) : (
                                <Scan className="w-16 h-16 text-gray-400 group-hover:text-blue-500"/>
                            )}
                            <span className="font-bold text-gray-500 mt-4 group-hover:text-blue-600">{isScanMode ? "Recherche..." : "Scanner Agent"}</span>
                        </button>
                    ) : (
                        <div className="bg-green-50 p-6 rounded-3xl border border-green-200 animate-fade-in">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2 text-green-600"><ShieldCheck className="w-8 h-8"/></div>
                            <p className="text-green-800 font-bold mb-4">Agent Authentifié</p>
                            <button onClick={() => { setIsPayingDebt(false); setAgentScanned(false); }} className="w-full py-4 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700">
                                Remettre Espèces
                            </button>
                        </div>
                    )}
                    
                    <button onClick={() => { setIsPayingDebt(false); setAgentScanned(false); }} className="mt-4 text-gray-400 text-sm font-bold hover:text-gray-600">Annuler</button>
                </div>
            </div>
        )}

        {/* History & Sanctions Modal */}
        {showHistory && (
            <div className="fixed inset-0 bg-black/80 z-[60] flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm">
                <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md h-[85vh] flex flex-col animate-slide-up">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="text-lg font-black text-gray-800 flex items-center gap-2"><History className="w-5 h-5"/> Historique & Litiges</h3>
                        <button onClick={() => setShowHistory(false)}><X className="w-6 h-6 text-gray-400"/></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {/* Section Sanctions */}
                        <div>
                            <h4 className="text-xs font-bold text-red-500 uppercase mb-3 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Sanctions Actives</h4>
                            {sanctions.length === 0 ? <p className="text-sm text-gray-400 italic">Aucune sanction.</p> : (
                                <div className="space-y-3">
                                    {sanctions.map(s => (
                                        <div key={s.id} className="bg-red-50 p-4 rounded-xl border border-red-100">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-bold text-red-800">Amende: {formatCurrency(s.amount)}</span>
                                                <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${s.status === 'pending_appeal' ? 'bg-orange-100 text-orange-700' : 'bg-red-200 text-red-800'}`}>
                                                    {s.status === 'pending_appeal' ? 'En Appel' : 'À Payer'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-700 mb-3">{s.reason}</p>
                                            
                                            {contestId === s.id ? (
                                                <div className="bg-white p-3 rounded-lg border border-red-200 animate-fade-in">
                                                    <textarea 
                                                        className="w-full text-sm p-2 border border-gray-300 rounded mb-2 h-20" 
                                                        placeholder="Pourquoi contestez-vous ?"
                                                        value={contestReason}
                                                        onChange={e => setContestReason(e.target.value)}
                                                    />
                                                    <div className="flex gap-2">
                                                        <Button size="sm" variant="ghost" onClick={() => setContestId(null)}>Annuler</Button>
                                                        <Button size="sm" variant="primary" onClick={submitContest} disabled={!contestReason}>Envoyer</Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                s.status === 'active' && (
                                                    <button onClick={() => setContestId(s.id)} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                                                        <Gavel className="w-3 h-3"/> Contester cette amende
                                                    </button>
                                                )
                                            )}
                                            {s.status === 'pending_appeal' && <p className="text-xs text-orange-600 italic mt-2">Dossier transmis au médiateur.</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Section Transactions */}
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-1"><FileText className="w-3 h-3"/> Historique Paiements</h4>
                            <div className="space-y-2">
                                {transactions.map(t => (
                                    <div key={t.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <div>
                                            <p className="font-bold text-sm text-gray-800">{t.type === 'rent' ? 'Loyer' : 'Autre'}</p>
                                            <p className="text-xs text-gray-400">{new Date(t.date).toLocaleDateString()}</p>
                                        </div>
                                        <span className={`font-bold ${t.type === 'fine' ? 'text-red-600' : 'text-green-600'}`}>
                                            {t.type === 'fine' ? '-' : '+'}{formatCurrency(t.amount)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5">
                <QrCode className="w-32 h-32 text-gray-900" />
            </div>
            <p className="text-gray-400 font-bold uppercase text-xs tracking-wider mb-1">Mon Emplacement</p>
            {myStall ? (
                <>
                    <h1 className="text-6xl font-black text-gray-800 mb-2">{myStall.number}</h1>
                    <div className="flex items-center gap-2 mb-6">
                        {myStall.healthStatus === 'healthy' ? (
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-green-200">
                                <CheckCircle className="w-3 h-3"/> À Jour
                            </span>
                        ) : (
                            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 animate-pulse border border-red-200">
                                <AlertTriangle className="w-3 h-3"/> Dette Active
                            </span>
                        )}
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold border border-gray-200">
                            {myStall.zone}
                        </span>
                    </div>
                </>
            ) : (
                <div className="py-8 text-center">
                    <p className="text-xl font-bold text-gray-400 mb-4">Pas d'étal assigné</p>
                    <button onClick={onShowMap} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-green-700 transition-colors">
                        Trouver un Emplacement
                    </button>
                </div>
            )}
             
             {myStall && (
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => onSpeak("Voici votre QR Code unique.")} className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-transform active:scale-95">
                        <QrCode className="w-8 h-8" />
                        <span className="font-bold">Mon QR</span>
                    </button>
                    {totalDebt > 0 ? (
                        <button onClick={() => setIsPayingDebt(true)} className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-lg shadow-red-200 animate-pulse transition-transform active:scale-95">
                            <AlertTriangle className="w-8 h-8" />
                            <span className="font-bold text-sm">Payer {totalDebt.toLocaleString()} F</span>
                        </button>
                    ) : (
                        <button onClick={() => setShowHistory(true)} className="bg-white border-2 border-gray-100 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-600 hover:bg-gray-50 transition-colors active:scale-95">
                            <History className="w-8 h-8" />
                            <span className="font-bold">Historique</span>
                        </button>
                    )}
                </div>
             )}
             
             {totalDebt > 0 && myStall && (
                 <div className="mt-3">
                     <button onClick={() => setShowHistory(true)} className="w-full py-3 text-red-600 bg-red-50 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors">
                         <Gavel className="w-4 h-4"/> Voir détails & Contester
                     </button>
                 </div>
             )}
             
             <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                 <button onClick={onShowMap} className="text-sm font-bold text-gray-500 flex items-center justify-center gap-1 hover:text-gray-800 transition-colors">
                     <MapPin className="w-4 h-4"/> Voir le Plan du Marché
                 </button>
             </div>
        </div>
        
        {aiTip && (
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 rounded-2xl text-white shadow-lg relative overflow-hidden">
                <Sparkles className="absolute top-2 right-2 text-white/20 w-12 h-12"/>
                <p className="text-xs text-white/60 font-bold uppercase mb-1">Conseil du Jour</p>
                <p className="font-medium text-sm leading-relaxed pr-8">"{aiTip}"</p>
            </div>
        )}
    </div>
  );
};

export default VendorOverview;