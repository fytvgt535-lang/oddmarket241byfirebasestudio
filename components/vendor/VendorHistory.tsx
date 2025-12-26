
import React, { useState, useMemo } from 'react';
import { Transaction, Stall } from '../../types';
import { Search, Filter, Download, Eye, ShieldCheck, Calendar, ArrowUpRight, ArrowDownRight, FileText } from 'lucide-react';
import { formatCurrency } from '../../utils/coreUtils';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import DigitalReceipt from '../ui/DigitalReceipt';

interface VendorHistoryProps {
  transactions: Transaction[];
  myStall?: Stall;
  isSolaris: boolean;
}

const VendorHistory: React.FC<VendorHistoryProps> = ({ transactions, myStall, isSolaris }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [monthFilter, setMonthFilter] = useState('all');

  const filtered = useMemo(() => {
      return transactions.filter(tx => {
          const matchesSearch = tx.reference.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                formatCurrency(tx.amount).includes(searchTerm);
          const txDate = new Date(tx.date);
          const matchesMonth = monthFilter === 'all' || `${txDate.getMonth()}` === monthFilter;
          return matchesSearch && matchesMonth && tx.stallId === myStall?.id;
      });
  }, [transactions, searchTerm, monthFilter, myStall]);

  const stats = useMemo(() => {
      const total = filtered.reduce((acc, t) => acc + t.amount, 0);
      const count = filtered.length;
      return { total, count };
  }, [filtered]);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
        {/* RECAPITULATIF FISCAL */}
        <Card className={`p-8 rounded-[3rem] border-8 shadow-2xl ${isSolaris ? 'bg-white border-black text-black' : 'bg-slate-950 border-slate-900 text-white'}`}>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">Total versé en Régie</p>
                    <h3 className="text-5xl font-black tracking-tighter">{formatCurrency(stats.total)}</h3>
                </div>
                <div className="p-4 bg-white/10 rounded-2xl"><Calendar className="w-6 h-6"/></div>
            </div>
            <div className="flex items-center gap-3 py-4 border-t border-white/5 mt-4">
                <ShieldCheck className="w-5 h-5 text-green-500"/>
                <p className="text-[10px] font-black uppercase tracking-widest">{stats.count} Quittances Certifiées par le Trésor</p>
            </div>
        </Card>

        {/* RECHERCHE & FILTRES */}
        <div className="flex flex-col gap-3">
            <div className="relative">
                <Search className="absolute left-6 top-6 w-8 h-8 text-slate-300"/>
                <input 
                    placeholder="Chercher une référence..." 
                    className={`w-full h-20 pl-16 pr-6 rounded-[2.5rem] font-black text-xl outline-none border-4 transition-all ${isSolaris ? 'bg-white border-black text-black' : 'bg-gray-100 border-transparent focus:bg-white focus:border-purple-200'}`}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
                {['all', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'].map(m => (
                    <button 
                        key={m}
                        onClick={() => setMonthFilter(m)}
                        className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest whitespace-nowrap transition-all border-4 ${monthFilter === m ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-400 border-gray-100'}`}
                    >
                        {m === 'all' ? 'Toute l\'année' : new Date(2024, parseInt(m)).toLocaleString('fr', { month: 'long' })}
                    </button>
                ))}
            </div>
        </div>

        {/* LISTE DES QUITTANCES */}
        <div className="space-y-4">
            {filtered.length === 0 ? (
                <div className="py-20 text-center text-slate-300 font-black uppercase text-sm italic">Aucun enregistrement trouvé.</div>
            ) : filtered.map(tx => (
                <div 
                    key={tx.id} 
                    onClick={() => setSelectedTx(tx)}
                    className={`p-6 rounded-[3rem] border-4 flex items-center justify-between cursor-pointer active:scale-95 transition-all ${isSolaris ? 'bg-white border-black' : 'bg-white border-slate-100 shadow-md hover:border-purple-200'}`}
                >
                    <div className="flex items-center gap-6">
                        <div className={`p-4 rounded-[1.5rem] ${tx.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            <FileText className="w-8 h-8"/>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quittance #{tx.id.slice(-6).toUpperCase()}</p>
                            <p className="text-2xl font-black text-slate-900 leading-none mt-1">{formatCurrency(tx.amount)}</p>
                            <p className="text-[11px] font-bold text-slate-500 mt-2">{new Date(tx.date).toLocaleDateString()} • {tx.provider.toUpperCase()}</p>
                        </div>
                    </div>
                    <Eye className={`w-8 h-8 ${isSolaris ? 'text-black' : 'text-slate-200'}`}/>
                </div>
            ))}
        </div>

        {selectedTx && (
            <DigitalReceipt 
                transaction={selectedTx} 
                stall={myStall} 
                onClose={() => setSelectedTx(null)} 
            />
        )}
    </div>
  );
};

export default VendorHistory;
