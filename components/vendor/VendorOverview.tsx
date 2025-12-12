
import React, { useState, useEffect, useMemo } from 'react';
import { Receipt as ReceiptIcon, Sparkles, MapPin, Search, X, CheckCircle, AlertTriangle, FileText, CalendarClock, TrendingDown } from 'lucide-react';
import { VendorProfile, Stall, Transaction, Sanction, Market, PaymentPlan } from '../../types';
import { generateVendorCoachTip } from '../../services/geminiService';
import { calculateStallDebt, formatCurrency } from '../../utils/coreUtils';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';

interface VendorOverviewProps {
    profile: VendorProfile;
    myStall?: Stall;
    totalDebt: number;
    transactions: Transaction[];
    sanctions: Sanction[];
    onShowMap: () => void;
    onSpeak: () => void;
    onContestSanction?: (id: string, reason: string) => void;
    onRequestPlan?: (plan: Omit<PaymentPlan, 'id' | 'status' | 'progress'>) => Promise<void>;
}

const VendorOverview: React.FC<VendorOverviewProps> = ({ profile, myStall, totalDebt, transactions, sanctions, onShowMap, onSpeak, onContestSanction, onRequestPlan }) => {
    const [aiTip, setAiTip] = useState<string | null>(null);
    const [showReceipts, setShowReceipts] = useState(false);
    const [showDebtManager, setShowDebtManager] = useState(false);
    const [planDuration, setPlanDuration] = useState(3);
    const [isSubmittingPlan, setIsSubmittingPlan] = useState(false);

    useEffect(() => {
        generateVendorCoachTip(profile, myStall).then(setAiTip);
    }, [profile, myStall]);

    const debtDetails = useMemo(() => calculateStallDebt(myStall, sanctions), [myStall, sanctions]);

    const handleCreatePlan = async () => {
        if (!onRequestPlan || !myStall) {
            toast.error("Fonctionnalité non disponible ou étal non assigné.");
            return;
        }
        
        setIsSubmittingPlan(true);
        try {
            await onRequestPlan({
                vendorId: profile.id,
                stallNumber: myStall.number,
                totalDebt: debtDetails.totalDebt,
                installments: planDuration,
                amountPerMonth: Math.ceil(debtDetails.totalDebt / planDuration),
                startDate: Date.now()
            });
            toast.success("Demande d'échéancier envoyée à l'administration.", { duration: 5000, icon: '📅' });
            setShowDebtManager(false);
        } catch (e: any) {
            toast.error("Erreur lors de la création du plan.");
        } finally {
            setIsSubmittingPlan(false);
        }
    };

    return (
        <div className="space-y-4 animate-slide-up">
             {/* Main Card */}
             {!myStall ? (
                 <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
                     <h3 className="text-xl font-bold mb-2">Pas d'étal assigné ?</h3>
                     <p className="text-indigo-100 text-sm mb-6 opacity-90">Trouvez une place disponible dans les marchés de la ville et commencez à vendre.</p>
                     <button onClick={onShowMap} className="w-full bg-white text-indigo-700 font-bold py-3 px-4 rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2">
                         <Search className="w-5 h-5"/> Explorer les marchés
                     </button>
                 </div>
             ) : (
                 <div className={`rounded-3xl p-6 border shadow-sm relative overflow-hidden ${debtDetails.totalDebt > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
                     <div className="flex justify-between items-start mb-4 relative z-10">
                         <div>
                             <p className="text-xs font-bold text-gray-400 uppercase">Mon Emplacement</p>
                             <h3 className="text-2xl font-black text-gray-900">{myStall.number}</h3>
                             <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3"/> {myStall.zone}</p>
                         </div>
                         <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${debtDetails.totalDebt > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                             {debtDetails.totalDebt > 0 ? <AlertTriangle className="w-3 h-3"/> : <CheckCircle className="w-3 h-3"/>}
                             {debtDetails.totalDebt > 0 ? 'Action Requise' : 'À jour'}
                         </div>
                     </div>
                     
                     {debtDetails.totalDebt > 0 ? (
                         <div className="relative z-10">
                             <div className="flex justify-between items-end mb-3">
                                <span className="text-red-800 font-bold text-sm">Dette Totale</span>
                                <span className="text-3xl font-black text-red-600">{formatCurrency(debtDetails.totalDebt)}</span>
                             </div>
                             <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => setShowDebtManager(true)} className="text-xs bg-white border border-red-200 text-red-700 px-3 py-3 rounded-xl font-bold hover:bg-red-50 flex items-center justify-center gap-2">
                                    <FileText className="w-4 h-4"/> Détails & Plan
                                </button>
                                <button className="text-xs bg-red-600 text-white px-3 py-3 rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 flex items-center justify-center gap-2">
                                    <ReceiptIcon className="w-4 h-4"/> Payer Tout
                                </button>
                             </div>
                         </div>
                     ) : (
                         <div className="bg-green-50 p-3 rounded-xl flex items-center gap-3 relative z-10">
                             <div className="bg-green-100 p-2 rounded-full text-green-600"><CheckCircle className="w-5 h-5"/></div>
                             <div>
                                 <p className="font-bold text-green-800 text-sm">Situation Saine</p>
                                 <p className="text-xs text-green-700">Aucun impayé à ce jour.</p>
                             </div>
                         </div>
                     )}
                 </div>
             )}

             {/* Receipt Vault Button */}
             <div className="mt-2">
                 <button onClick={() => setShowReceipts(true)} className="w-full py-3 bg-white border-2 border-gray-100 rounded-xl text-gray-600 font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors active:scale-95">
                     <ReceiptIcon className="w-5 h-5 text-blue-500"/> Mes Reçus & Preuves
                 </button>
             </div>
        
            {aiTip && (
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 rounded-2xl text-white shadow-lg relative overflow-hidden">
                    <Sparkles className="absolute top-2 right-2 text-white/20 w-12 h-12"/>
                    <p className="text-xs text-white/60 font-bold uppercase mb-1">Conseil du Jour</p>
                    <p className="font-medium text-sm leading-relaxed pr-8">"{aiTip}"</p>
                </div>
            )}

            {/* DEBT MANAGER MODAL */}
            {showDebtManager && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                        <div className="p-5 border-b border-red-100 bg-red-50 flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-red-900 text-lg flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-red-600"/> Gestion de la Dette
                                </h3>
                                <p className="text-xs text-red-700 mt-1">Transparence & Solutions</p>
                            </div>
                            <button onClick={() => setShowDebtManager(false)} className="p-2 hover:bg-red-100 rounded-full text-red-400 transition-colors">
                                <X className="w-5 h-5"/>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5">
                            {/* Breakdown */}
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Composition de la dette</h4>
                            <div className="space-y-2 mb-6">
                                {debtDetails.details.map((item: any) => (
                                    <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${item.type === 'fine' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                                                {item.type === 'fine' ? <AlertTriangle className="w-4 h-4"/> : <CalendarClock className="w-4 h-4"/>}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800 text-sm">{item.label}</p>
                                                {item.type === 'fine' && <button onClick={() => { setShowDebtManager(false); onContestSanction && onContestSanction(item.id, "Je conteste cette amende."); }} className="text-[10px] text-blue-600 underline">Contester</button>}
                                            </div>
                                        </div>
                                        <span className="font-black text-gray-900">{formatCurrency(item.amount)}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Payment Plan Simulator */}
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <h4 className="font-bold text-blue-900 flex items-center gap-2 mb-2">
                                    <TrendingDown className="w-5 h-5"/> Simuler un Échéancier
                                </h4>
                                <p className="text-xs text-blue-700 mb-4">Étalez votre dette sur plusieurs mois pour alléger vos charges.</p>
                                
                                <div className="mb-4">
                                    <label className="text-xs font-bold text-blue-800 block mb-1">Durée : {planDuration} mois</label>
                                    <input 
                                        type="range" min="2" max="6" step="1" 
                                        value={planDuration} onChange={(e) => setPlanDuration(Number(e.target.value))}
                                        className="w-full accent-blue-600"
                                    />
                                    <div className="flex justify-between text-[10px] text-blue-400 mt-1">
                                        <span>2 mois</span>
                                        <span>6 mois</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-blue-100">
                                    <span className="text-sm font-medium text-gray-600">Mensualité estimée</span>
                                    <span className="text-lg font-black text-blue-600">{formatCurrency(Math.ceil(debtDetails.totalDebt / planDuration))} /mois</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
                            <Button variant="outline" onClick={() => setShowDebtManager(false)} className="flex-1">Fermer</Button>
                            <Button onClick={handleCreatePlan} isLoading={isSubmittingPlan} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">Demander ce Plan</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* RECEIPTS MODAL */}
            {showReceipts && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                <ReceiptIcon className="w-5 h-5 text-blue-600"/> Historique & Preuves
                            </h3>
                            <button onClick={() => setShowReceipts(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                                <X className="w-5 h-5"/>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {transactions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                        <ReceiptIcon className="w-8 h-8 opacity-20"/>
                                    </div>
                                    <p className="font-bold text-gray-600">Aucun reçu disponible</p>
                                    <p className="text-xs max-w-[200px] mt-1 opacity-70">Vos paiements et preuves d'opération s'afficheront ici une fois validés par l'administration.</p>
                                </div>
                            ) : (
                                transactions.map(tx => (
                                    <div key={tx.id} className="bg-white border border-gray-100 p-3 rounded-xl shadow-sm flex items-center justify-between hover:border-blue-200 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${tx.type === 'fine' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                {tx.type === 'fine' ? <AlertTriangle className="w-4 h-4"/> : <CheckCircle className="w-4 h-4"/>}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800 text-sm capitalize">{tx.type === 'rent' ? 'Loyer Étal' : tx.type}</p>
                                                <p className="text-[10px] text-gray-400">{new Date(tx.date).toLocaleDateString()} • {new Date(tx.date).toLocaleTimeString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-black ${tx.type === 'fine' ? 'text-red-600' : 'text-gray-900'}`}>{formatCurrency(tx.amount)}</p>
                                            <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-mono">#{tx.reference.slice(0,6)}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        
                        <div className="p-4 border-t border-gray-100 bg-gray-50 text-center">
                            <button onClick={() => setShowReceipts(false)} className="text-blue-600 font-bold text-sm hover:underline">Fermer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VendorOverview;
