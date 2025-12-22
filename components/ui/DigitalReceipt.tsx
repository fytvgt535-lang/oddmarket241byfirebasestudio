
import React from 'react';
import { Transaction, Market, Stall } from '../../types';
import { QrCode, Download, Printer, ShieldCheck, Share2 } from 'lucide-react';
import { formatCurrency } from '../../utils/coreUtils';
import { Card } from './Card';
import { Button } from './Button';

interface DigitalReceiptProps {
  transaction: Transaction;
  market?: Market;
  stall?: Stall;
  onClose: () => void;
}

const DigitalReceipt: React.FC<DigitalReceiptProps> = ({ transaction, market, stall, onClose }) => {
  const receiptId = `REC-${transaction.id.slice(-8).toUpperCase()}`;
  
  return (
    <div className="fixed inset-0 bg-black/90 z-[250] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl animate-scale-in">
        
        {/* RECEIPT CONTENT */}
        <div className="bg-white p-8 text-center space-y-4" id="printable-receipt">
            <div className="flex flex-col items-center gap-2 mb-4">
                <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                    <ShieldCheck className="w-10 h-10"/>
                </div>
                <h2 className="font-black text-xl tracking-tight">MarchéConnect</h2>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Reçu Officiel de Paiement</p>
            </div>

            <div className="border-y-2 border-dashed border-slate-100 py-4 space-y-2">
                <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Référence</span>
                    <span className="font-bold font-mono">{receiptId}</span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Date</span>
                    <span className="font-bold">{new Date(transaction.date).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Marché</span>
                    <span className="font-bold">{market?.name || 'Inconnu'}</span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Étal</span>
                    <span className="font-bold">#{stall?.number || transaction.stallNumber}</span>
                </div>
            </div>

            <div className="py-4">
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Montant Versé</p>
                <div className="text-4xl font-black text-slate-900">{formatCurrency(transaction.amount)}</div>
                <p className="text-[10px] text-green-600 font-bold mt-1">Transaction Confirmée via {transaction.provider.toUpperCase()}</p>
            </div>

            <div className="flex justify-center py-2">
                <div className="p-2 border-2 border-slate-900 rounded-xl">
                    <QrCode className="w-24 h-24 text-slate-900"/>
                </div>
            </div>
            
            <p className="text-[9px] text-slate-400 italic">
                Ce document numérique fait foi de preuve de paiement auprès des services municipaux compétents. 
                Signature électronique: {transaction.reference}
            </p>
        </div>

        {/* ACTIONS */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2"/> Imprimer
            </Button>
            <Button className="flex-1 bg-slate-900 hover:bg-black" onClick={onClose}>
                Terminer
            </Button>
        </div>
      </div>
    </div>
  );
};

export default DigitalReceipt;
