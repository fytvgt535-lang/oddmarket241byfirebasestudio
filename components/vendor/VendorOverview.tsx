
import React, { useState } from 'react';
import { X, ShieldCheck, Scan, ShieldAlert, Radio, Landmark, UserCheck, AlertTriangle, History, ArrowRight, XCircle } from 'lucide-react';
import { VendorProfile, Stall, Sanction, User, Transaction } from '../../types';
import { calculateStallDebt, formatCurrency } from '../../utils/coreUtils';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import toast from 'react-hot-toast';
import AgentScanner from '../agent/AgentScanner';
import { verifyAgentBadge, reportFraudAttempt } from '../../services/supabaseService';

interface VendorOverviewProps {
    profile: VendorProfile;
    myStall?: Stall;
    sanctions: Sanction[];
    transactions?: Transaction[];
}

const VendorOverview: React.FC<VendorOverviewProps> = ({ profile, myStall, sanctions = [], transactions = [] }) => {
    const [showAgentChecker, setShowAgentChecker] = useState(false);
    const [verificationStatus, setVerificationStatus] = useState<'idle' | 'scanning' | 'valid' | 'invalid'>('idle');
    const [scannedAgent, setScannedAgent] = useState<User | null>(null);

    const handleVerifyAgent = async (payload: string) => {
        setVerificationStatus('scanning');
        try {
            const result = await verifyAgentBadge(payload);
            if (result.isValid && result.agent) {
                setScannedAgent(result.agent);
                setVerificationStatus('valid');
                toast.success("Agent Municipal Authentifié !");
                if (navigator.vibrate) navigator.vibrate(200);
            } else {
                setVerificationStatus('invalid');
                if (navigator.vibrate) navigator.vibrate([500, 100, 500]);
            }
        } catch (e) {
            setVerificationStatus('invalid');
        }
    };

    const handleReportFraud = async () => {
        if (!myStall) return;
        try {
            await reportFraudAttempt(myStall.marketId, myStall.id, myStall.number);
            toast.error("SIGNALEMENT ENVOYÉ À LA BRIGADE", { duration: 8000, icon: '🚨' });
            setShowAgentChecker(false);
            setVerificationStatus('idle');
        } catch (e) {
            toast.error("Erreur de signalement.");
        }
    };

    const debtDetails = calculateStallDebt(myStall, sanctions);
    const recentTx = transactions.filter(t => t.stallId === myStall?.id).slice(0, 5);

    return (
        <div className="space-y-6 animate-fade-in pb-24">
             {/* SCANNER DE CONTRÔLE AGENT */}
             {showAgentChecker && (
                 <div className="fixed inset-0 z-[120] bg-slate-950 flex flex-col p-6 animate-fade-in">
                    <div className="flex justify-between items-center mb-8 text-white">
                        <div className="flex items-center gap-2">
                            <Landmark className="text-blue-500 w-6 h-6"/>
                            <h3 className="font-black uppercase tracking-tighter text-xl">Contrôle Officiel</h3>
                        </div>
                        <button onClick={() => { setShowAgentChecker(false); setVerificationStatus('idle'); }} className="p-3 bg-white/10 rounded-full"><X className="text-white"/></button>
                    </div>

                    {verificationStatus !== 'invalid' && verificationStatus !== 'valid' && (
                        <div className="flex-1 flex flex-col">
                            <AgentScanner 
                                mode="collect" 
                                stalls={[]} 
                                onScanComplete={() => {}} 
                                onCustomVerify={handleVerifyAgent} 
                            />
                            <div className="mt-8 p-8 bg-blue-600/10 border border-blue-500/20 rounded-[2.5rem] text-center">
                                <p className="text-blue-200 text-xs font-black uppercase tracking-[0.2em]">Scannez le Badge de l'agent municipal</p>
                                <p className="text-blue-400/60 text-[11px] mt-2 font-bold italic">Ne remettez aucun paiement sans avoir certifié son identité numérique.</p>
                            </div>
                        </div>
                    )}

                    {verificationStatus === 'valid' && scannedAgent && (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-10 animate-scale-in">
                            <div className="w-40 h-40 rounded-[3.5rem] bg-green-500 flex items-center justify-center shadow-[0_0_60px_rgba(34,197,94,0.5)]">
                                <UserCheck className="w-20 h-20 text-white"/>
                            </div>
                            <div className="text-center">
                                <Badge variant="success" className="mx-auto mb-4 bg-green-500 text-white border-none px-4 py-1.5 uppercase font-black text-[10px] tracking-widest">Agent Certifié</Badge>
                                <h4 className="text-5xl font-black text-white tracking-tighter mb-2">{scannedAgent.name}</h4>
                                <p className="text-slate-500 font-mono text-xl tracking-widest">#{scannedAgent.id.slice(-8).toUpperCase()}</p>
                            </div>
                            <Button className="w-full bg-white text-black h-20 rounded-3xl font-black uppercase text-lg shadow-2xl" onClick={() => setShowAgentChecker(false)}>PROCÉDER AU PAIEMENT</Button>
                        </div>
                    )}

                    {verificationStatus === 'invalid' && (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-10 animate-shake">
                            <div className="w-40 h-40 rounded-[3.5rem] bg-red-600 flex items-center justify-center shadow-[0_0_60px_rgba(220,38,38,0.5)]">
                                <ShieldAlert className="w-20 h-20 text-white animate-pulse"/>
                            </div>
                            <div className="text-center space-y-4 px-4">
                                <h4 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">FRAUDE DÉTECTÉE</h4>
                                <p className="text-red-400 text-sm font-bold leading-relaxed max-w-xs mx-auto italic">
                                    "Individu non certifié. Ne remettez aucune quittance. Signalement requis immédiatement."
                                </p>
                            </div>
                            <div className="w-full space-y-3">
                                <Button 
                                    onClick={handleReportFraud}
                                    className="w-full bg-red-600 hover:bg-red-700 text-white h-24 rounded-[2.5rem] font-black uppercase text-xl shadow-2xl flex items-center justify-center gap-3 border-4 border-red-500"
                                >
                                    <Radio className="w-8 h-8 animate-ping"/> SIGNALER L'USURPATEUR
                                </Button>
                                <button onClick={() => setShowAgentChecker(false)} className="w-full py-4 text-slate-500 font-black text-xs uppercase underline tracking-widest opacity-60">Fermer et garder ma caisse</button>
                            </div>
                        </div>
                    )}
                 </div>
             )}

             {/* STATUT DE REDEVANCE */}
             {myStall && (
                 <div className={`rounded-[3rem] p-8 border-4 shadow-2xl transition-colors ${debtDetails.totalDebt > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100'}`}>
                     <div className="flex justify-between items-start mb-10">
                         <div>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Loyer Étal #{myStall.number}</p>
                             <h3 className={`text-5xl font-black tracking-tighter ${debtDetails.totalDebt > 0 ? 'text-red-600' : 'text-slate-900'}`}>{formatCurrency(debtDetails.totalDebt)}</h3>
                         </div>
                         {debtDetails.totalDebt > 0 && <Badge variant="danger" className="animate-pulse">À Régler</Badge>}
                     </div>
                     
                     <Button 
                        onClick={() => setShowAgentChecker(true)}
                        className="w-full bg-slate-900 text-white h-24 rounded-[2.5rem] font-black uppercase text-sm tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-4 border-b-[10px] border-slate-700"
                     >
                        <Scan className="w-8 h-8 text-blue-400"/> Authentifier l'Agent
                     </Button>
                 </div>
             )}

             {/* HISTORIQUE RÉCENT (POUR LA SÉCURITÉ) */}
             <div className="space-y-4">
                 <h3 className="text-xl font-black text-slate-900 px-1 flex items-center justify-between">
                     <div className="flex items-center gap-2"><History className="w-5 h-5 text-blue-600"/> Historique Direct</div>
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Temps Réel</span>
                 </h3>
                 <div className="space-y-3">
                     {recentTx.length === 0 ? (
                         <div className="p-8 text-center bg-white rounded-3xl border border-slate-100 text-slate-400 font-bold text-sm italic">
                             Aucune transaction enregistrée.
                         </div>
                     ) : recentTx.map(tx => (
                         <div key={tx.id} className={`p-5 rounded-[2rem] bg-white border border-slate-100 shadow-sm flex items-center justify-between transition-all ${tx.status === 'cancelled' ? 'bg-red-50 border-red-100' : ''}`}>
                             <div className="flex items-center gap-4">
                                 <div className={`p-3 rounded-2xl ${tx.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                     {tx.status === 'cancelled' ? <XCircle className="w-6 h-6"/> : <ShieldCheck className="w-6 h-6"/>}
                                 </div>
                                 <div>
                                     <p className={`font-black text-lg ${tx.status === 'cancelled' ? 'text-red-700 line-through' : 'text-slate-900'}`}>{formatCurrency(tx.amount)}</p>
                                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(tx.date).toLocaleDateString()} • {tx.collectedByName || 'Agent Mobile'}</p>
                                 </div>
                             </div>
                             {tx.status === 'cancelled' ? (
                                 <Badge variant="danger" className="font-black animate-pulse">ANNULÉ</Badge>
                             ) : (
                                 <div className="text-green-600"><ArrowRight className="w-5 h-5"/></div>
                             )}
                         </div>
                     ))}
                 </div>
                 {recentTx.length > 0 && (
                     <button className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-blue-600 transition-colors">Consulter le grand livre complet &rarr;</button>
                 )}
             </div>
        </div>
    );
};

export default VendorOverview;
