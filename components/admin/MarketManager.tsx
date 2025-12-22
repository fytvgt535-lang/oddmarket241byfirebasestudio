
import React, { useState } from 'react';
import { Store, Plus, MapPin, Search, Trash2, Pencil, Sparkles, AlertCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { Market, Stall, Transaction, Sanction } from '../../types';
import { runStrategicMarketAudit, StrategicAudit } from '../../services/geminiService';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import toast from 'react-hot-toast';

interface MarketManagerProps {
  markets: Market[];
  stalls: Stall[];
  transactions: Transaction[];
  sanctions: Sanction[];
  onAddMarket: (market: any) => void;
  onUpdateMarket: (id: string, updates: any) => void;
  onDeleteMarket: (id: string) => void;
  currentLanguage: string;
}

const MarketManager: React.FC<MarketManagerProps> = ({ markets, stalls, transactions, sanctions }) => {
  const [selectedAudit, setSelectedAudit] = useState<{marketId: string, data: StrategicAudit} | null>(null);
  const [isAuditing, setIsAuditing] = useState<string | null>(null);

  const handleRunAudit = async (market: Market) => {
    setIsAuditing(market.id);
    try {
        const result = await runStrategicMarketAudit(market, stalls, transactions, sanctions);
        setSelectedAudit({ marketId: market.id, data: result });
    } catch (e) {
        toast.error("Échec de l'audit IA");
    } finally {
        setIsAuditing(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {markets.map(m => (
                <Card key={m.id} className="p-0 overflow-hidden group">
                    <div className="h-32 bg-slate-800 relative">
                        {m.image && <img src={m.image} className="w-full h-full object-cover opacity-60"/>}
                        <div className="absolute bottom-3 left-3 text-white">
                            <h3 className="font-black text-xl">{m.name}</h3>
                            <p className="text-xs opacity-80 flex items-center gap-1"><MapPin className="w-3 h-3"/> {m.neighborhood}</p>
                        </div>
                    </div>
                    <div className="p-4 space-y-4">
                        <Button 
                            variant="ghost" 
                            className="w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100"
                            onClick={() => handleRunAudit(m)}
                            disabled={!!isAuditing}
                        >
                            {isAuditing === m.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4 mr-2"/>}
                            Audit Stratégique IA
                        </Button>
                        
                        {selectedAudit?.marketId === m.id && (
                            <div className="mt-4 p-4 bg-slate-900 text-white rounded-2xl space-y-3 animate-slide-up text-xs">
                                <div className="flex items-center gap-2 text-indigo-400 font-bold">
                                    <ShieldCheck className="w-4 h-4"/> ANALYSE IA GÉNÉRATIVE
                                </div>
                                <p className="italic text-slate-300">"{selectedAudit.data.diagnostic}"</p>
                                <div>
                                    <p className="font-bold text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Risques détectés :</p>
                                    <ul className="list-disc pl-4 opacity-80">
                                        {selectedAudit.data.fraudRisks.map((r, i) => <li key={i}>{r}</li>)}
                                    </ul>
                                </div>
                                <button onClick={() => setSelectedAudit(null)} className="w-full text-center py-2 text-slate-500 hover:text-white">Fermer rapport</button>
                            </div>
                        )}
                    </div>
                </Card>
            ))}
        </div>
    </div>
  );
};

export default MarketManager;
