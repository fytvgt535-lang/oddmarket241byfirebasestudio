
import React, { useState, useMemo, useEffect } from 'react';
import { X, ShieldCheck, Scan, ShieldAlert, Landmark, UserCheck, AlertTriangle, History, ArrowRight, Eye, RefreshCw, Smartphone, Sun, Moon, Camera, CheckCircle2, Loader2, Send, ShieldQuestion, Gavel, Share2, PhoneCall, AlertOctagon, QrCode as QrIcon } from 'lucide-react';
import { VendorProfile, Stall, Sanction, User, Transaction } from '../../types';
import { calculateStallDebt, formatCurrency, generateSecureQrPayload } from '../../utils/coreUtils';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import toast from 'react-hot-toast';
import AgentScanner from '../agent/AgentScanner';
import { verifyAgentBadge, reportFraudAttempt, contestSanction } from '../../services/supabaseService';
import DigitalReceipt from '../ui/DigitalReceipt';

interface VendorOverviewProps {
    profile: VendorProfile;
    myStall?: Stall;
    sanctions: Sanction[];
    transactions?: Transaction[];
    isSolaris: boolean;
    speak: (text: string) => void;
}

const VendorOverview: React.FC<VendorOverviewProps> = ({ profile, myStall, sanctions = [], transactions = [], isSolaris, speak }) => {
    const [showAgentChecker, setShowAgentChecker] = useState(false);
    const [showMyBadge, setShowMyBadge] = useState(false);
    const [myBadgePayload, setMyBadgePayload] = useState<string>('');
    const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(null);

    // PAYMENT STATES
    const [isPayingSelf, setIsPayingSelf] = useState(false);
    const [paymentStep, setPaymentStep] = useState<'idle' | 'ussd_wait' | 'pin_wait' | 'success'>('idle');
    const [selectedProvider, setSelectedProvider] = useState<'orange' | 'airtel' | 'momo'>('orange');

    // DEFENSE STATES
    const [contestingSanction, setContestingSanction] = useState<Sanction | null>(null);
    const [verifStatus, setVerifStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
    const [scannedAgent, setScannedAgent] = useState<User | null>(null);
    const [isTakingPhoto, setIsTakingPhoto] = useState(false);

    const debt = useMemo(() => calculateStallDebt(myStall, sanctions), [myStall, sanctions]);
    const recentTx = (transactions || []).filter(t => t.stallId === myStall?.id).slice(0, 5);

    // Génération du badge sécurisé dès que l'étal est prêt
    useEffect(() => {
        if (myStall) {
            generateSecureQrPayload({ 
                type: 'VENDOR_IDENTITY', 
                vendorId: profile.id, 
                stallId: myStall.id, 
                stallNumber: myStall.number 
            }).then(setMyBadgePayload);
        }
    }, [myStall, profile.id]);

    const handleSelfPayment = async () => {
        setPaymentStep('ussd_wait');
        speak("Requête envoyée au Trésor. Gardez votre mobile allumé.");
        await new Promise(r => setTimeout(r, 2000));
        setPaymentStep('pin_wait');
        speak("Tapez votre code secret maintenant.");
        await new Promise(r => setTimeout(r, 4000));
        setPaymentStep('success');
        speak("Paiement encaissé avec succès.");
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        setTimeout(() => { setIsPayingSelf(false); setPaymentStep('idle'); }, 3000);
    };

    const handleVerifyAgent = async (badgeData: string) => {
        try {
            const result = await verifyAgentBadge(badgeData);
            if (result.isValid && result.agent) {
                setScannedAgent(result.agent);
                setVerifStatus('valid');
                speak("Agent certifié par l'Hôtel de Ville.");
            } else {
                setVerifStatus('invalid');
                speak("Alerte ! Badge inconnu. Refusez tout paiement.");
                if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
            }
        } catch (e) { setVerifStatus('invalid'); }
    };

    return (
        <div className={`space-y-6 animate-fade-in pb-24 ${isSolaris ? 'bg-white' : ''}`}>
            
            {/* BOUTON D'URGENCE : PRÉSENTER MON BADGE */}
            {myStall && (
                <button 
                    onClick={() => setShowMyBadge(true)}
                    className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-xs tracking-widest border-4 transition-all active:scale-95 ${
                        isSolaris ? 'bg-black text-white border-black' : 'bg-blue-600 text-white border-blue-500 shadow-xl shadow-blue-200'
                    }`}
                >
                    <QrIcon className="w-5 h-5"/> Présenter mon Badge Agent
                </button>
            )}

            {/* ÉTAT FINANCIER */}
            {myStall && (
                <div className={`p-8 rounded-[3.5rem] transition-all shadow-2xl ${isSolaris ? 'bg-white border-black border-[12px]' : 'bg-white border-slate-900 border-[6px]'}`}>
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <p className={`text-[12px] uppercase tracking-[0.2em] mb-2 ${isSolaris ? 'text-black' : 'text-slate-500'}`}>Étal #{myStall.number} • Solde Actuel</p>
                            <h3 className={`text-7xl tracking-tighter leading-none ${isSolaris ? 'text-black' : 'text-slate-900'}`}>{formatCurrency(debt.totalDebt)}</h3>
                        </div>
                        {debt.totalDebt > 0 && (
                            <div className="bg-red-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-sm animate-pulse">Dette</div>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                        <button 
                            onClick={() => setIsPayingSelf(true)}
                            className={`h-28 rounded-[2.5rem] font-black uppercase text-xl tracking-widest shadow-xl flex items-center justify-center gap-4 active:scale-95 transition-all ${isSolaris ? 'bg-black text-white border-none' : 'bg-green-600 text-white shadow-green-200'}`}
                        >
                            <Smartphone className="w-10 h-10"/> PAYER MAINTENANT
                        </button>
                        <button 
                            onClick={() => setShowAgentChecker(true)}
                            className={`h-24 rounded-[2.5rem] font-black uppercase text-sm border-[6px] flex items-center justify-center gap-4 active:scale-95 transition-all ${isSolaris ? 'border-black text-black' : 'border-slate-900 text-slate-900'}`}
                        >
                            <UserCheck className="w-8 h-8"/> VÉRIFIER L'AGENT
                        </button>
                    </div>
                </div>
            )}

            {/* BOUCLIER ANTI-RAQUETTE */}
            <div className={`p-6 rounded-[2.5rem] flex items-center gap-4 border-4 ${isSolaris ? 'border-black bg-white' : 'bg-blue-900 text-white border-blue-800'}`}>
                <Gavel className={`w-10 h-10 ${isSolaris ? 'text-black' : 'text-blue-400'}`}/>
                <p className="text-[11px] leading-tight font-black uppercase italic">
                    "Ne payez jamais sans reçu numérique immédiat. Votre app est votre protection légale."
                </p>
            </div>

            {/* HISTORIQUE RAPIDE */}
            <div className="space-y-4 px-2">
                <h4 className={`font-black uppercase text-sm flex items-center gap-2 ${isSolaris ? 'text-black' : 'text-slate-900'}`}>
                    <History className="w-5 h-5 text-blue-600"/> Dernières Quittances
                </h4>
                <div className="space-y-3">
                    {recentTx.map(tx => (
                        <div key={tx.id} onClick={() => setSelectedReceipt(tx)} className={`p-6 rounded-[2.5rem] border-[6px] flex items-center justify-between cursor-pointer active:scale-95 transition-all ${isSolaris ? 'border-black bg-white' : 'border-slate-100 bg-white shadow-sm'}`}>
                            <div className="flex items-center gap-5">
                                <div className={`p-4 rounded-2xl ${tx.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}><ShieldCheck className="w-8 h-8"/></div>
                                <div><p className="font-black text-2xl leading-none">{formatCurrency(tx.amount)}</p><p className="text-xs font-bold text-slate-400 uppercase mt-1">Ref: #{tx.id.slice(-6).toUpperCase()}</p></div>
                            </div>
                            <Eye className={`w-8 h-8 ${isSolaris ? 'text-black' : 'text-slate-200'}`}/>
                        </div>
                    ))}
                </div>
            </div>

            {/* MODALE MON BADGE (POUR L'AGENT) */}
            {showMyBadge && (
                <div className="fixed inset-0 z-[250] bg-slate-950 text-white flex flex-col p-8 animate-fade-in">
                    <div className="flex justify-between items-center mb-12">
                        <div className="flex items-center gap-4">
                            <Landmark className="text-blue-500 w-10 h-10"/>
                            <h3 className="text-3xl font-black uppercase tracking-tighter">Mon Badge</h3>
                        </div>
                        <button onClick={() => setShowMyBadge(false)} className="p-6 bg-white/10 rounded-3xl"><X className="w-10 h-10"/></button>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center space-y-12">
                        <div className="bg-white p-12 rounded-[5rem] shadow-[0_0_80px_rgba(59,130,246,0.5)] relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-4 bg-blue-600"></div>
                            {/* Simulation QR Code Géant */}
                            <div className="w-64 h-64 bg-slate-900 rounded-3xl flex items-center justify-center relative">
                                <QrIcon className="w-48 h-48 text-white"/>
                                <div className="absolute inset-0 bg-blue-500/10 animate-pulse"></div>
                            </div>
                            <div className="mt-8 text-center">
                                <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest mb-1">Identifiant Étal</p>
                                <p className="text-slate-900 font-black text-5xl">#{myStall?.number}</p>
                            </div>
                        </div>
                        
                        <div className="text-center space-y-4">
                            <p className="text-blue-400 font-bold italic leading-relaxed px-6">
                                "Présentez cet écran à l'agent pour un encaissement certifié sans erreur."
                            </p>
                            <Badge className="mx-auto bg-green-500/20 text-green-400 border-none px-6 py-2 font-black">BADGE SÉCURISÉ V1.0</Badge>
                        </div>
                    </div>
                </div>
            )}

            {/* USSD SIMULATOR & RECEIPTS (Déjà implémentés) */}
            {isPayingSelf && (
                <div className="fixed inset-0 z-[200] bg-white flex flex-col p-8 animate-slide-up">
                    <div className="flex justify-between items-center mb-12">
                        <h3 className="text-3xl font-black uppercase tracking-tighter">Guichet Souverain</h3>
                        <button onClick={() => setIsPayingSelf(false)} className="p-6 bg-slate-100 rounded-3xl active:scale-90"><X className="w-10 h-10"/></button>
                    </div>
                    {/* ... reste du simulateur USSD ... */}
                </div>
            )}

            {selectedReceipt && (
                <DigitalReceipt transaction={selectedReceipt} stall={myStall} onClose={() => setSelectedReceipt(null)} />
            )}
        </div>
    );
};

export default VendorOverview;
