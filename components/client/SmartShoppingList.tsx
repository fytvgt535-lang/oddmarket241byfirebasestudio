
import React, { useState, useMemo, useEffect } from 'react';
import { Sparkles, History, Clock, Trash2, Mic, MicOff, Check, RefreshCw, X, Save, ShoppingCart } from 'lucide-react';
import { SmartListItem, ProductOffer, SmartListHistory } from '../../types';
import { parseShoppingListText } from '../../utils/smartShopperEngine';
import { formatCurrency } from '../../utils/coreUtils';
import { Button } from '../ui/Button';
import { TextArea, Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import toast from 'react-hot-toast';

interface SmartShoppingListProps {
    onValidate?: (items: SmartListItem[]) => void;
}

export const SmartShoppingList: React.FC<SmartShoppingListProps> = ({ onValidate }) => {
  const [inputText, setInputText] = useState("");
  const [analyzedItems, setAnalyzedItems] = useState<SmartListItem[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // History State
  const [history, setHistory] = useState<SmartListHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [listName, setListName] = useState("");

  // Voice State
  const [isListening, setIsListening] = useState(false);

  // 1. Load History & Draft from LocalStorage on mount
  useEffect(() => {
      try {
          const savedHistory = localStorage.getItem('smart_shopper_history');
          if (savedHistory) setHistory(JSON.parse(savedHistory));

          const savedDraft = localStorage.getItem('smart_shopper_draft');
          if (savedDraft) {
              const { text, items, name } = JSON.parse(savedDraft);
              if (items && items.length > 0) {
                  setInputText(text || "");
                  setAnalyzedItems(items);
                  setListName(name || "");
              }
          }
      } catch (e) {
          console.error("Error loading local storage", e);
      }
  }, []);

  // 2. Auto-save Draft
  useEffect(() => {
      if (analyzedItems) {
          localStorage.setItem('smart_shopper_draft', JSON.stringify({
              text: inputText,
              items: analyzedItems,
              name: listName
          }));
      }
  }, [analyzedItems, inputText, listName]);

  const handleAnalyze = () => {
    if (!inputText.trim()) {
        toast.error("Veuillez écrire ou dicter une liste.");
        return;
    }
    setIsAnalyzing(true);
    
    // Simulation du temps de calcul IA
    setTimeout(() => {
        const results = parseShoppingListText(inputText);
        setAnalyzedItems(results);
        setIsAnalyzing(false);
        if (results.length === 0) toast.error("Je n'ai pas compris les produits. Essayez des mots simples.");
        else toast.success(`${results.length} produits identifiés !`);
    }, 1200);
  };

  const handleSelectOffer = (itemId: string, offerId: string) => {
      setAnalyzedItems(prev => prev ? prev.map(item => 
          item.id === itemId ? { ...item, selectedOfferId: offerId } : item
      ) : null);
  };

  const reset = () => {
      setAnalyzedItems(null);
      setInputText("");
      setListName("");
      localStorage.removeItem('smart_shopper_draft');
  };

  const handleValidateSelection = () => {
      if (!analyzedItems || analyzedItems.length === 0) return;
      
      if (onValidate) {
          onValidate(analyzedItems);
          // On ne vide pas la liste ici pour laisser l'utilisateur voir ce qu'il a fait,
          // mais le parent (ClientDashboard) va rediriger vers le panier.
      } else {
          toast.error("Erreur de connexion au panier.");
      }
  };

  // 3. Save to History
  const saveToHistory = () => {
      if (!analyzedItems || analyzedItems.length === 0) return;
      const name = listName.trim() || `Liste du ${new Date().toLocaleDateString()}`;
      
      const newEntry: SmartListHistory = {
          id: Date.now().toString(),
          name,
          date: Date.now(),
          originalText: inputText,
          totalAtTheTime: totalEstimatif,
          itemCount: analyzedItems.length
      };

      const newHistory = [newEntry, ...history];
      setHistory(newHistory);
      localStorage.setItem('smart_shopper_history', JSON.stringify(newHistory));
      toast.success("Liste sauvegardée dans l'historique");
  };

  // 4. Restore from History
  const loadFromHistory = (entry: SmartListHistory) => {
      setInputText(entry.originalText);
      setListName(entry.name);
      setIsAnalyzing(true);
      setShowHistory(false);
      
      // Re-analyze to get FRESH prices
      setTimeout(() => {
          const results = parseShoppingListText(entry.originalText);
          setAnalyzedItems(results);
          setIsAnalyzing(false);
          toast.success("Prix mis à jour selon le marché actuel !");
      }, 800);
  };

  const deleteHistoryItem = (id: string) => {
      const newHistory = history.filter(h => h.id !== id);
      setHistory(newHistory);
      localStorage.setItem('smart_shopper_history', JSON.stringify(newHistory));
  };

  // 5. Voice Input Logic
  const toggleListening = () => {
      if (isListening) {
          setIsListening(false);
          return;
      }

      if (!('webkitSpeechRecognition' in window)) {
          toast.error("Vocal non supporté sur ce navigateur (utilisez Chrome/Edge).");
          return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.lang = 'fr-FR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
          setIsListening(true);
          toast("Je vous écoute...", { icon: '🎙️' });
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputText(prev => prev + (prev ? ", " : "") + transcript);
          toast.success("Ajouté !");
      };

      recognition.onerror = () => {
          setIsListening(false);
          toast.error("Je n'ai pas bien entendu.");
      };

      recognition.onend = () => {
          setIsListening(false);
      };

      recognition.start();
  };

  // Calcul du total en temps réel
  const totalEstimatif = useMemo(() => {
      if (!analyzedItems) return 0;
      return analyzedItems.reduce((sum, item) => {
          const selected = item.offers.find(o => o.id === item.selectedOfferId);
          return sum + (selected ? selected.price : 0);
      }, 0);
  }, [analyzedItems]);

  return (
    <div className="space-y-6 animate-fade-in pb-24 relative">
        
        {/* HISTORY MODAL / SIDEBAR */}
        {showHistory && (
            <div className="fixed inset-0 bg-black/60 z-50 flex justify-end backdrop-blur-sm animate-fade-in">
                <div className="w-full max-w-sm bg-white h-full shadow-2xl p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><History className="w-5 h-5"/> Historique</h3>
                        <button onClick={() => setShowHistory(false)}><X className="w-6 h-6 text-gray-400"/></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-3">
                        {history.length === 0 ? (
                            <p className="text-gray-400 text-center italic mt-10">Aucune liste sauvegardée.</p>
                        ) : history.map(item => (
                            <div key={item.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50 hover:bg-blue-50 hover:border-blue-200 transition-all cursor-pointer group" onClick={() => loadFromHistory(item)}>
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-gray-800">{item.name}</h4>
                                    <button onClick={(e) => { e.stopPropagation(); deleteHistoryItem(item.id); }} className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(item.date).toLocaleDateString()}</span>
                                    <span>{item.itemCount} articles</span>
                                </div>
                                <p className="mt-2 font-bold text-green-600 text-sm">~ {formatCurrency(item.totalAtTheTime)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* EN-TÊTE & SAISIE */}
        {!analyzedItems ? (
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <Sparkles className="absolute top-4 right-4 text-white/20 w-32 h-32"/>
                
                <div className="relative z-10 flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-2xl font-black mb-1">Assistant Shopping</h2>
                        <p className="text-indigo-100 text-sm max-w-xs">Optimisez vos courses avec l'IA.</p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-white bg-white/10 hover:bg-white/20" onClick={() => setShowHistory(true)}>
                        <History className="w-4 h-4 mr-2"/> Historique
                    </Button>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-xl p-1 relative z-10 border border-white/20">
                    <TextArea 
                        placeholder="Ex: Tomates, 2kg de riz pas cher, poisson frais..." 
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        className="bg-transparent border-none text-white placeholder:text-indigo-200 focus:ring-0 h-32 text-lg font-medium"
                    />
                    <div className="absolute bottom-3 right-3">
                        <button 
                            onClick={toggleListening} 
                            className={`p-3 rounded-full transition-all ${isListening ? 'bg-red-500 animate-pulse text-white shadow-red-300 shadow-lg' : 'bg-white/20 text-white hover:bg-white/30'}`}
                            title="Dicter votre liste"
                        >
                            {isListening ? <MicOff className="w-5 h-5"/> : <Mic className="w-5 h-5"/>}
                        </button>
                    </div>
                </div>
                <div className="mt-4 flex justify-end relative z-10">
                    <Button 
                        onClick={handleAnalyze} 
                        isLoading={isAnalyzing}
                        disabled={!inputText.trim()}
                        className="bg-white text-indigo-700 hover:bg-indigo-50 font-bold px-6 py-3 rounded-xl shadow-lg flex items-center gap-2"
                    >
                        {isAnalyzing ? "Analyse..." : <><Sparkles className="w-5 h-5"/> Trouver les meilleurs prix</>}
                    </Button>
                </div>
            </div>
        ) : (
            // RÉSULTATS D'ANALYSE
            <div className="space-y-6">
                {/* Sticky Header with Actions */}
                <div className="flex flex-col gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100 sticky top-0 z-30">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase">Total Estimé</p>
                            <p className="text-2xl font-black text-green-600">{formatCurrency(totalEstimatif)}</p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={reset} className="text-gray-500" title="Recommencer"><RefreshCw className="w-4 h-4"/></Button>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 shadow-green-200" onClick={handleValidateSelection}>
                                <ShoppingCart className="w-4 h-4 mr-2"/> Acheter ce panier
                            </Button>
                        </div>
                    </div>
                    
                    <div className="flex gap-2 pt-2 border-t border-gray-50">
                        <Input 
                            placeholder="Nommer cette liste pour plus tard..." 
                            value={listName} 
                            onChange={e => setListName(e.target.value)}
                            className="h-10 text-sm bg-gray-50 border-none"
                        />
                        <Button size="sm" variant="secondary" onClick={saveToHistory} disabled={!listName.trim()}>
                            <Save className="w-4 h-4"/>
                        </Button>
                    </div>
                </div>

                <div className="space-y-8">
                    {analyzedItems.map((item) => (
                        <div key={item.id} className="relative">
                            <div className="flex justify-between items-end px-2 mb-3">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800 capitalize">{item.cleanTerm}</h3>
                                    <p className="text-xs text-gray-400 italic">"{item.originalText}"</p>
                                </div>
                                <div className="flex gap-1">
                                    {item.preferences.bio && <Badge variant="success" className="text-[10px]">Bio</Badge>}
                                    {item.preferences.cheap && <Badge variant="warning" className="text-[10px]">Eco</Badge>}
                                    {item.preferences.fresh && <Badge variant="info" className="text-[10px]">Frais</Badge>}
                                </div>
                            </div>

                            {/* Swipeable Offers */}
                            {item.offers.length === 0 ? (
                                <div className="bg-gray-50 p-4 rounded-xl text-center text-gray-400 text-sm border-2 border-dashed border-gray-200">
                                    Désolé, aucune offre trouvée pour ce produit aujourd'hui.
                                </div>
                            ) : (
                                <div className="flex overflow-x-auto gap-4 pb-4 px-2 snap-x snap-mandatory no-scrollbar">
                                    {item.offers.map((offer, idx) => {
                                        const isSelected = item.selectedOfferId === offer.id;
                                        const isBestMatch = idx === 0; 
                                        
                                        return (
                                            <div 
                                                key={offer.id}
                                                onClick={() => handleSelectOffer(item.id, offer.id)}
                                                className={`
                                                    snap-center shrink-0 w-[280px] p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden group
                                                    ${isSelected 
                                                        ? 'bg-white border-green-500 shadow-lg shadow-green-100 ring-1 ring-green-500' 
                                                        : 'bg-white border-gray-100 shadow-sm opacity-90 hover:opacity-100 hover:border-gray-300'}
                                                `}
                                            >
                                                {/* Selection Indicator */}
                                                <div className={`absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-green-500 border-green-500' : 'border-gray-200 bg-gray-50'}`}>
                                                    {isSelected && <Check className="w-4 h-4 text-white"/>}
                                                </div>

                                                {/* Badges */}
                                                <div className="flex flex-wrap gap-1 mb-3 pr-8">
                                                    {isBestMatch && <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px]">⭐ Top Choix</Badge>}
                                                    {offer.attributes.isPromo && <Badge variant="danger" className="text-[10px]">- Promo</Badge>}
                                                    {offer.attributes.isBio && <Badge variant="success" className="text-[10px]">Bio</Badge>}
                                                </div>

                                                <div className="flex justify-between items-end mb-2">
                                                    <div>
                                                        <p className="font-bold text-gray-900 text-lg">{offer.vendor.name}</p>
                                                        <p className="text-xs text-gray-500 flex items-center gap-1">{offer.vendor.distance} • {offer.vendor.rating}★</p>
                                                    </div>
                                                </div>

                                                <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center">
                                                    <span className="text-xs text-gray-400">Prix / {offer.unit}</span>
                                                    <span className={`text-xl font-black ${isSelected ? 'text-green-600' : 'text-gray-800'}`}>
                                                        {formatCurrency(offer.price)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {/* Spacer for scroll UX */}
                                    <div className="w-2 shrink-0"></div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};
