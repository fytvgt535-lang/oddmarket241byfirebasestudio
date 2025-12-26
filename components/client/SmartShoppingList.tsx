
import React, { useState, useMemo, useEffect } from 'react';
import { Sparkles, History, Clock, Trash2, Check, RefreshCw, X, ShoppingCart, Store } from 'lucide-react';
import { SmartListItem, SmartListHistory } from '../../types';
import { parseShoppingListText } from '../../utils/smartShopperEngine';
import { syncShopperData } from '../../services/localShopperDatabase'; 
import { formatCurrency } from '../../utils/coreUtils';
import { Button } from '../ui/Button';
import { TextArea } from '../ui/Input';
import { Badge } from '../ui/Badge';
import toast from 'react-hot-toast';

interface SmartShoppingListProps {
    onValidate?: (items: SmartListItem[]) => void;
}

export const SmartShoppingList: React.FC<SmartShoppingListProps> = ({ onValidate }) => {
  const [inputText, setInputText] = useState("");
  const [analyzedItems, setAnalyzedItems] = useState<SmartListItem[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [history, setHistory] = useState<SmartListHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
      syncShopperData().catch(console.error);
      const savedHistory = localStorage.getItem('smart_shopper_history');
      if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  const handleAnalyze = async () => {
    if (!inputText.trim()) return toast.error("Liste vide.");
    setIsAnalyzing(true);
    
    if (navigator.onLine) await syncShopperData();

    setTimeout(() => {
        const results = parseShoppingListText(inputText);
        setAnalyzedItems(results);
        setIsAnalyzing(false);
        if (results.length === 0) toast.error("Aucun produit trouvé en stock.");
        else toast.success(`${results.length} articles localisés dans le marché.`);
    }, 1200);
  };

  const handleSelectOffer = (itemId: string, offerId: string) => {
      setAnalyzedItems(prev => prev ? prev.map(item => 
          item.id === itemId ? { ...item, selectedOfferId: offerId } : item
      ) : null);
  };

  const totalEstimatif = useMemo(() => {
      if (!analyzedItems) return 0;
      return analyzedItems.reduce((sum, item) => {
          const selected = item.offers.find(o => o.id === item.selectedOfferId);
          return sum + (selected ? selected.price : 0);
      }, 0);
  }, [analyzedItems]);

  return (
    <div className="space-y-6 animate-fade-in pb-24 relative px-2">
        {showHistory && (
            <div className="fixed inset-0 bg-slate-900/60 z-50 flex justify-end backdrop-blur-sm">
                <div className="w-full max-w-sm bg-white h-full shadow-2xl p-8 flex flex-col animate-slide-left">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3"><History className="w-6 h-6 text-blue-600"/> Archives</h3>
                        <button onClick={() => setShowHistory(false)} className="p-2 bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-400"/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-4">
                        {history.length === 0 ? <p className="text-gray-400 italic text-center">Aucun historique.</p> : history.map(item => (
                            <div key={item.id} className="p-4 border border-gray-100 rounded-2xl bg-gray-50 hover:bg-blue-50 transition-all cursor-pointer" onClick={() => { setInputText(item.originalText); handleAnalyze(); setShowHistory(false); }}>
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-bold text-slate-800">{item.name}</h4>
                                    <span className="text-[10px] font-black text-blue-600 uppercase">{item.itemCount} produits</span>
                                </div>
                                <p className="text-xs text-gray-400 mb-2">{new Date(item.date).toLocaleDateString()}</p>
                                <p className="font-black text-green-600">{formatCurrency(item.totalAtTheTime)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {!analyzedItems ? (
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden border border-white/10">
                <Sparkles className="absolute -top-10 -right-10 text-blue-500/20 w-64 h-64 animate-pulse"/>
                
                <div className="relative z-10 flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-3xl font-black mb-2 tracking-tighter uppercase">Assistant IA</h2>
                        <p className="text-blue-300 text-sm font-medium">Localisez les meilleurs prix en 1 seconde.</p>
                    </div>
                    <button onClick={() => setShowHistory(true)} className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-colors border border-white/10">
                        <History className="w-6 h-6"/>
                    </button>
                </div>

                <div className="bg-white/5 backdrop-blur-xl rounded-[2rem] p-6 relative z-10 border border-white/10 shadow-inner">
                    <TextArea 
                        placeholder="Ex: 2kg de manioc, poisson fumé..." 
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        className="bg-transparent border-none text-white placeholder:text-slate-500 focus:ring-0 h-40 text-xl font-bold leading-relaxed"
                    />
                </div>
                
                <div className="mt-8 relative z-10">
                    <Button 
                        onClick={handleAnalyze} 
                        isLoading={isAnalyzing}
                        disabled={!inputText.trim()}
                        className="w-full h-16 bg-blue-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-900/50"
                    >
                        Trouver dans les Marchés
                    </Button>
                </div>
            </div>
        ) : (
            <div className="space-y-8 animate-fade-in">
                <div className="flex flex-col gap-4 bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100 sticky top-4 z-30">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Estimation Panier</p>
                            <p className="text-3xl font-black text-slate-900">{formatCurrency(totalEstimatif)}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setAnalyzedItems(null)} className="p-4 bg-gray-100 rounded-2xl text-slate-400"><RefreshCw className="w-5 h-5"/></button>
                            <Button className="bg-green-600 px-6 h-14 rounded-2xl shadow-lg shadow-green-100 font-black uppercase text-xs" onClick={() => onValidate?.(analyzedItems)}>
                                <ShoppingCart className="w-5 h-5 mr-2"/> Valider Panier
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="space-y-10">
                    {analyzedItems.map((item) => (
                        <div key={item.id} className="animate-slide-up">
                            <div className="flex justify-between items-end px-2 mb-4">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 capitalize tracking-tighter">{item.cleanTerm}</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase italic">"{item.originalText}"</p>
                                </div>
                                <div className="flex gap-1">
                                    {item.preferences.bio && <Badge variant="success">BIO</Badge>}
                                    {item.preferences.cheap && <Badge variant="info">ECO</Badge>}
                                </div>
                            </div>

                            <div className="flex overflow-x-auto gap-4 pb-4 px-2 no-scrollbar snap-x">
                                {item.offers.length === 0 ? (
                                    <div className="w-full bg-slate-50 p-8 rounded-3xl border-2 border-dashed border-slate-200 text-center text-slate-400 font-bold italic">
                                        Indisponible actuellement.
                                    </div>
                                ) : item.offers.map((offer, idx) => {
                                    const isSelected = item.selectedOfferId === offer.id;
                                    return (
                                        <div 
                                            key={offer.id}
                                            onClick={() => handleSelectOffer(item.id, offer.id)}
                                            className={`
                                                snap-center shrink-0 w-[280px] p-6 rounded-[2.5rem] border-4 transition-all cursor-pointer relative overflow-hidden group
                                                ${isSelected 
                                                    ? 'bg-white border-blue-600 shadow-2xl' 
                                                    : 'bg-white border-gray-100 opacity-60 grayscale-[0.5]'}
                                            `}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-3 bg-slate-50 rounded-2xl"><Store className="w-6 h-6 text-slate-400"/></div>
                                                {isSelected && <div className="p-2 bg-blue-600 rounded-full text-white"><Check className="w-4 h-4"/></div>}
                                            </div>
                                            <h4 className="font-black text-lg text-slate-900 mb-1 truncate">{offer.vendor.name}</h4>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{offer.vendor.distance}</p>
                                            
                                            <div className="mt-6 flex justify-between items-end border-t border-slate-50 pt-4">
                                                <span className="text-[10px] font-black text-slate-300 uppercase">Prix Final</span>
                                                <span className={`text-2xl font-black ${isSelected ? 'text-blue-600' : 'text-slate-900'}`}>{formatCurrency(offer.price)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};
