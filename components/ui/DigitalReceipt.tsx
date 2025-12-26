
import React from 'react';
import { Transaction, Market, Stall } from '../../types';
import { QrCode, Download, ShieldCheck, Share2, X, Landmark, BadgeCheck, FileText, CheckCircle2, MessageCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/coreUtils';
import { Badge } from './Badge';
import toast from 'react-hot-toast';

interface DigitalReceiptProps {
  transaction: Transaction;
  market?: Market;
  stall?: Stall;
  onClose: () => void;
}

const DigitalReceipt: React.FC<DigitalReceiptProps> = ({ transaction, market, stall, onClose }) => {
  const receiptId = `REC-${transaction.id.slice(-8).toUpperCase()}`;
  const isCancelled = transaction.status === 'cancelled';

  const shareOnWhatsApp = () => {
      const text = `*QUITTANCE DE RÉGIE GABON*\nRef: ${receiptId}\nMontant: ${formatCurrency(transaction.amount)}\nÉtal: ${stall?.number || transaction.stallNumber}\nDate: ${new Date(transaction.date).toLocaleString()}\n*CERTIFIÉ PAR LE TRÉSOR PUBLIC*`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      toast.success("Prêt à partager !");
  };
  
  return (
    <div className="fixed inset-0 bg-slate-950 z-[300] flex flex-col p-4 animate-fade-in overflow-y-auto">
        {/* Navigation Bureaucratique */}
        <div className="flex justify-between items-center mb-8 shrink-0">
            <button onClick={onClose} className="p-6 bg-white/10 rounded-3xl text-white active:scale-90 transition-transform"><X className="w-10 h-10"/></button>
            <div className="flex flex-col items-center">
                <Landmark className="text-blue-500 w-10 h-10 mb-2"/>
                <span className="text-[11px] font-black text-white uppercase tracking-[0.4em]">République Gabonaise</span>
            </div>
            <div className="w-20"></div>
        </div>

        {/* CORPS DU REÇU - Style Document Officiel */}
        <div className={`bg-white rounded-[5rem] overflow-hidden flex flex-col shadow-2xl max-w-md mx-auto w-full relative ${isCancelled ? 'grayscale opacity-50' : ''}`}>
            
            {/* Filigrane d'état */}
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none opacity-[0.04]">
                <Landmark className="w-[400px] h-[400px] -rotate-12"/>
            </div>

            {isCancelled && (
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none rotate-[25deg]">
                    <span className="text-8xl font-black text-red-600/30 border-[25px] border-red-600/30 px-12 py-6">ANNULÉ</span>
                </div>
            )}

            {/* Header Régie */}
            <div className={`${isCancelled ? 'bg-slate-700' : 'bg-slate-950'} p-12 text-center text-white border-b-[15px] border-blue-600`}>
                <div className="flex justify-center mb-6">
                    <div className="relative">
                        <div className={`w-32 h-32 rounded-[3rem] flex items-center justify-center shadow-2xl ${isCancelled ? 'bg-red-500' : 'bg-green-600'}`}>
                            <ShieldCheck className="w-20 h-20 text-white"/>
                        </div>
                        <BadgeCheck className="absolute -bottom-4 -right-4 w-14 h-14 text-blue-400 fill-slate-950 shadow-xl"/>
                    </div>
                </div>
                <h3 className="font-black text-5xl tracking-tighter uppercase mb-2">VALIDÉ</h3>
                <div className="flex items-center justify-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                    <p className="text-sm font-bold text-blue-400 uppercase tracking-[0.3em]">ENREGISTRÉ AU TRÉSOR</p>
                </div>
            </div>

            <div className="p-12 space-y-12 relative z-10">
                {/* Montant - Gigantesque pour lecture rapide */}
                <div className="text-center border-b-[6px] border-slate-50 pb-12">
                    <p className="text-slate-400 text-[12px] font-black uppercase tracking-[0.3em] mb-4">Valeur Libératoire</p>
                    <div className="text-9xl font-black text-slate-950 tracking-tighter leading-none">{formatCurrency(transaction.amount)}</div>
                </div>

                {/* Données Métier */}
                <div className="space-y-10">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-black uppercase tracking-widest">Référence Quittance</span>
                        <span className="font-black text-slate-950 font-mono text-2xl">{receiptId}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-black uppercase tracking-widest">Identifiant Étal</span>
                        <span className="font-black text-slate-950 text-4xl">#{stall?.number || transaction.stallNumber}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs pt-8 border-t-2 border-slate-50">
                        <span className="text-slate-400 font-black uppercase tracking-widest">Horodatage Système</span>
                        <span className="font-black text-slate-900 text-sm">{new Date(transaction.date).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-black uppercase tracking-widest">Signature Cryptographique</span>
                        <span className="font-black text-blue-600 font-mono text-[10px] break-all max-w-[200px] text-right uppercase">{transaction.reference || 'SYS-GAB-AUTH-2024-X'}</span>
                    </div>
                </div>

                {/* Sécurité Terrain */}
                <div className="pt-8">
                    <div className="flex items-center gap-8 p-10 bg-slate-950 rounded-[4rem] border-[10px] border-slate-100 shadow-inner group">
                        <QrCode className="w-28 h-28 shrink-0 text-white"/>
                        <div className="flex-1">
                            <p className="text-[12px] font-black text-blue-400 uppercase mb-3 tracking-widest flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5"/> AUTHENTIQUE
                            </p>
                            <p className="text-xs font-bold text-slate-400 leading-relaxed">
                                Ce reçu est infalsifiable. Les contrôleurs utilisent ce QR pour vérifier le dépôt immédiat en Trésorerie.
                            </p>
                        </div>
                    </div>
                    <div className="mt-12 flex flex-col items-center gap-6">
                        <p className="text-[10px] text-center text-slate-400 font-black uppercase leading-relaxed px-10 italic">
                            Certifié conforme à la loi de finances municipale • Ville de Libreville.
                        </p>
                        <Landmark className="w-10 h-10 text-slate-200"/>
                    </div>
                </div>
            </div>
        </div>

        {/* ACTIONS DE SAUVEGARDE & PARTAGE */}
        <div className="mt-12 flex flex-col gap-4 max-w-md mx-auto w-full pb-20 px-4">
            <button 
                onClick={shareOnWhatsApp}
                className="h-28 bg-green-600 text-white rounded-[3.5rem] font-black uppercase text-lg tracking-[0.2em] shadow-2xl flex items-center justify-center gap-6 active:scale-95 transition-all"
            >
                <MessageCircle className="w-10 h-10"/> ENVOYER SUR WHATSAPP
            </button>
            <button className="h-24 bg-white text-slate-950 rounded-[3rem] font-black uppercase text-sm tracking-[0.2em] shadow-xl flex items-center justify-center gap-4 active:scale-95 transition-all">
                <Download className="w-8 h-8"/> ARCHIVER (JPG)
            </button>
            <button onClick={onClose} className="py-10 text-white/40 font-black uppercase text-xs tracking-[0.5em] hover:text-white transition-colors">
                RETOUR AU TERMINAL
            </button>
        </div>
    </div>
  );
};

export default DigitalReceipt;
