
import React, { useState, useMemo } from 'react';
import { Market, Stall } from '../../types';
import { MapPin, Star, TrendingUp, Users, ArrowRight, ChevronLeft, ShoppingBag, ShieldCheck, Activity, Search, BarChart3, Lock, Clock, Info, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatCurrency } from '../../utils/coreUtils';

interface MarketExplorerProps {
  markets: Market[];
  stalls: Stall[];
  onSelectMarket: (marketId: string) => void;
}

// --- DATA STRUCTURES FOR DECISION AID ---
interface TrendProduct {
    name: string;
    volume: 'high' | 'med' | 'low';
    change: number;
}

interface MarketAnalytics {
    dailyTraffic: number;
    securityLevel: 'High' | 'Medium' | 'Low';
    trendProducts: TrendProduct[];
    peakHours: string;
}

// --- SAFE ANALYTICS GENERATOR ---
const getMarketAnalytics = (market: Market): MarketAnalytics => {
    // Safe ID access using String() to prevent crash if ID is number
    const safeId = String(market.id || '0');
    const safeName = market.name || '';
    const seed = safeId.length + safeName.length;
    
    const productsBase = ['Manioc', 'Banane', 'Piment', 'Textile', 'Poisson', 'Épices', 'Riz', 'Savon', 'Fripes', 'Cosmétique'];
    
    // Deterministic Shuffle based on seed
    const shuffled = [...productsBase].sort((a, b) => (a.charCodeAt(0) + seed) - (b.charCodeAt(0) + seed));

    // Traffic estimation: fallback to seed based logic if capacity is missing
    const cap = market.capacity || 100;
    const estimatedTraffic = Math.round(cap * (10 + (seed % 10)));

    return {
        dailyTraffic: estimatedTraffic, 
        securityLevel: seed % 3 === 0 ? 'High' : 'Medium',
        peakHours: "08h - 11h",
        trendProducts: [
            { name: shuffled[0], volume: 'high', change: 10 + (seed % 10) },
            { name: shuffled[1], volume: 'high', change: 5 + (seed % 5) },
            { name: shuffled[2], volume: 'med', change: -2 },
        ]
    };
};

const MarketExplorer: React.FC<MarketExplorerProps> = ({ markets = [], stalls = [], onSelectMarket }) => {
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'high_traffic' | 'secure'>('all');

  // Filter Logic - Strictly respects the `markets` prop with safe accessors
  const filteredMarkets = useMemo(() => {
      if (!markets) return [];
      
      return markets.filter(m => {
          if (!m) return false;
          
          const searchLower = searchTerm.toLowerCase();
          const nameMatch = (m.name || '').toLowerCase().includes(searchLower);
          const cityMatch = (m.city || '').toLowerCase().includes(searchLower);
          const hoodMatch = (m.neighborhood || '').toLowerCase().includes(searchLower);
          
          const matchesSearch = nameMatch || cityMatch || hoodMatch;
          
          if (!matchesSearch) return false;
          
          const analytics = getMarketAnalytics(m);
          if (filterType === 'high_traffic') return analytics.dailyTraffic > 2000;
          if (filterType === 'secure') return analytics.securityLevel === 'High';
          
          return true;
      });
  }, [markets, searchTerm, filterType]);

  // --- DETAILED VIEW ---
  if (selectedMarket) {
      const marketStalls = stalls.filter(s => s.marketId === selectedMarket.id);
      const freeStalls = marketStalls.filter(s => s.status === 'free').length;
      
      // Safe math for occupancy
      const totalStallsCreated = marketStalls.length;
      const capacity = selectedMarket.capacity || 100;
      const isConfigurationPending = totalStallsCreated === 0;
      
      const occupancyRate = totalStallsCreated > 0 
          ? Math.round(((totalStallsCreated - freeStalls) / totalStallsCreated) * 100) 
          : 0;
      
      const analytics = getMarketAnalytics(selectedMarket);

      return (
          <div className="animate-fade-in space-y-6 pb-24 relative">
              {/* IMMERSIVE HEADER */}
              <div className="relative h-72 rounded-3xl overflow-hidden shadow-2xl group bg-slate-900 flex items-center justify-center">
                  {selectedMarket.image ? (
                      <img 
                          src={selectedMarket.image} 
                          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 opacity-80"
                          alt={selectedMarket.name}
                      />
                  ) : (
                      <div className="flex flex-col items-center justify-center text-gray-500">
                          <ImageIcon className="w-16 h-16 mb-2 opacity-50"/>
                          <span className="text-sm font-bold">Image non disponible</span>
                      </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent pointer-events-none"></div>
                  
                  <div className="absolute top-4 left-4 z-10 pointer-events-auto">
                      <button 
                          onClick={() => setSelectedMarket(null)}
                          className="bg-white/20 backdrop-blur-md p-2 rounded-full hover:bg-white/30 transition-colors text-white border border-white/20"
                      >
                          <ChevronLeft className="w-6 h-6"/>
                      </button>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white pointer-events-none">
                      <div className="flex justify-between items-end">
                          <div>
                              <Badge className="bg-blue-600/90 text-white border-none mb-2 backdrop-blur-sm shadow-lg">
                                  {selectedMarket.city || 'Libreville'}
                              </Badge>
                              <h2 className="text-4xl font-black leading-none mb-2 text-shadow">{selectedMarket.name}</h2>
                              <p className="text-sm opacity-90 font-medium flex items-center gap-1">
                                  <MapPin className="w-4 h-4 text-blue-400"/> {selectedMarket.neighborhood || 'Centre-ville'}
                              </p>
                          </div>
                          <div className="text-right hidden sm:block bg-black/30 p-3 rounded-xl backdrop-blur-md border border-white/10">
                              <p className="text-xs font-bold uppercase opacity-70">Loyer de référence</p>
                              <p className="text-2xl font-black text-green-400">{formatCurrency(selectedMarket.baseRent || 0)}</p>
                          </div>
                      </div>
                  </div>
              </div>

              {/* DESCRIPTION & METRICS */}
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2"><Info className="w-4 h-4 text-blue-500"/> À propos</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                      {selectedMarket.description || "Un marché dynamique géré par la municipalité."}
                  </p>
                  {selectedMarket.hasDeliveryService && (
                      <div className="mt-3 flex items-center gap-2 text-xs font-bold text-green-700 bg-green-50 px-3 py-2 rounded-lg w-fit">
                          <CheckCircle className="w-4 h-4"/> Service de Livraison Disponible
                      </div>
                  )}
              </div>

              {/* ANALYTICS GRID */}
              <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-lg text-center flex flex-col items-center justify-center">
                      <Users className="w-5 h-5 text-blue-500 mb-1"/>
                      <p className="text-lg font-black text-gray-800 leading-none">{analytics.dailyTraffic}</p>
                      <p className="text-[9px] text-gray-400 uppercase font-bold mt-1">Visiteurs/J</p>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-lg text-center flex flex-col items-center justify-center">
                      <Activity className={`w-5 h-5 mb-1 ${occupancyRate > 90 ? 'text-red-500' : 'text-green-500'}`}/>
                      <p className="text-lg font-black text-gray-800 leading-none">{occupancyRate}%</p>
                      <p className="text-[9px] text-gray-400 uppercase font-bold mt-1">Occupation</p>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-lg text-center flex flex-col items-center justify-center">
                      <ShieldCheck className={`w-5 h-5 mb-1 ${analytics.securityLevel === 'High' ? 'text-green-500' : 'text-orange-500'}`}/>
                      <p className="text-lg font-black text-gray-800 leading-none">{analytics.securityLevel}</p>
                      <p className="text-[9px] text-gray-400 uppercase font-bold mt-1">Sécurité</p>
                  </div>
              </div>

              {/* TRENDS */}
              <div className="space-y-4">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2 text-lg px-1">
                      <TrendingUp className="w-5 h-5 text-indigo-600"/> Opportunités de Vente
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {analytics.trendProducts.map((t, i) => (
                          <div key={i} className="bg-gradient-to-br from-white to-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                              <div className="absolute right-0 top-0 opacity-5"><BarChart3 className="w-16 h-16"/></div>
                              <p className="text-xs text-gray-500 font-bold uppercase mb-1">Produit Phare #{i+1}</p>
                              <h4 className="text-lg font-black text-gray-800">{t.name}</h4>
                              <div className="flex items-center gap-2 mt-2">
                                  <Badge variant={t.volume === 'high' ? 'success' : 'warning'} className="text-[10px]">
                                      Demande {t.volume === 'high' ? 'Élevée' : 'Moyenne'}
                                  </Badge>
                                  <span className={`text-xs font-bold ${t.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {t.change > 0 ? '+' : ''}{t.change}%
                                  </span>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              {/* ACTION FOOTER */}
              <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-lg border-t border-gray-200 z-30 md:static md:bg-transparent md:border-none md:p-0 mt-8">
                  <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
                      <div className="hidden md:block">
                          <p className="text-xs text-gray-500 font-bold uppercase">Disponibilité</p>
                          <p className="text-xl font-black text-green-600">
                              {isConfigurationPending ? 'Ouverture Prochaine' : freeStalls > 0 ? `${freeStalls} places` : 'Liste d\'attente'}
                          </p>
                      </div>
                      <Button 
                          onClick={() => onSelectMarket(selectedMarket.id)} 
                          className="w-full py-4 text-lg bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200 text-white font-bold flex justify-center items-center"
                          disabled={freeStalls === 0 && !isConfigurationPending}
                      >
                          {freeStalls > 0 ? <>Voir le Plan & Réserver <ArrowRight className="w-5 h-5 ml-2"/></> : isConfigurationPending ? "Voir le site" : "Marché Complet"}
                      </Button>
                  </div>
              </div>
          </div>
      );
  }

  // --- LIST VIEW ---
  return (
    <div className="space-y-6 animate-fade-in pb-24">
        {/* HEADER & SEARCH */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 sticky top-0 z-20">
            <h2 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">Explorer les Marchés</h2>
            <div className="space-y-3">
                <div className="relative">
                    <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400"/>
                    <input 
                        type="text" 
                        placeholder="Trouver un marché, un quartier..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-gray-900 font-medium"
                    />
                </div>
                {/* FILTERS */}
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    <button onClick={() => setFilterType('all')} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${filterType === 'all' ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>Tout</button>
                    <button onClick={() => setFilterType('high_traffic')} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all flex items-center gap-1 ${filterType === 'high_traffic' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}><TrendingUp className="w-3 h-3"/> Forte Affluence</button>
                    <button onClick={() => setFilterType('secure')} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all flex items-center gap-1 ${filterType === 'secure' ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}><ShieldCheck className="w-3 h-3"/> Haute Sécurité</button>
                </div>
            </div>
        </div>

        {/* MARKET LIST */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-1">
            {filteredMarkets.length === 0 ? (
                <div className="col-span-full text-center py-16 text-gray-400 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-20"/>
                    <p className="font-medium">Aucun marché trouvé.</p>
                    {markets.length === 0 && <p className="text-xs mt-2 opacity-70">L'administrateur n'a pas encore créé de marché.</p>}
                </div>
            ) : (
                filteredMarkets.map(market => {
                    const marketStalls = stalls.filter(s => s.marketId === market.id);
                    const freeCount = marketStalls.filter(s => s.status === 'free').length;
                    const analytics = getMarketAnalytics(market);
                    const isConfigPending = marketStalls.length === 0;

                    return (
                        <div 
                            key={market.id}
                            onClick={() => setSelectedMarket(market)}
                            className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group overflow-hidden relative flex flex-col h-full transform hover:-translate-y-1 duration-300"
                        >
                            {/* Image Section */}
                            <div className="h-44 bg-gray-200 relative overflow-hidden flex items-center justify-center">
                                {market.image ? (
                                    <img 
                                        src={market.image} 
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        alt={market.name}
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-gray-400">
                                        <ImageIcon className="w-10 h-10 mb-2 opacity-50"/>
                                        <span className="text-xs font-bold">Pas d'image</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none"></div>
                                
                                <div className="absolute top-3 right-3 flex flex-col gap-1 items-end pointer-events-none">
                                    <div className="bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg text-xs font-bold text-gray-800 shadow-sm flex items-center gap-1">
                                        <Star className="w-3 h-3 text-yellow-400 fill-current"/> 4.5
                                    </div>
                                    {analytics.securityLevel === 'High' && (
                                        <div className="bg-green-500/90 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold text-white shadow-sm flex items-center gap-1">
                                            <Lock className="w-3 h-3"/> Sécurisé
                                        </div>
                                    )}
                                </div>

                                <div className="absolute bottom-3 left-3 text-white pointer-events-none">
                                    <h3 className="font-bold text-xl leading-none shadow-black drop-shadow-md mb-1">{market.name}</h3>
                                    <p className="text-xs opacity-90 drop-shadow-md font-medium">{market.city} • {market.neighborhood}</p>
                                </div>
                            </div>

                            {/* Details Section */}
                            <div className="p-5 flex-1 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                                            <Users className="w-3 h-3"/> ~{analytics.dailyTraffic} visiteurs/j
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                                            <Clock className="w-3 h-3"/> Pic: {analytics.peakHours}
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-1 mb-4">
                                        {analytics.trendProducts.slice(0, 2).map((t, i) => (
                                            <span key={i} className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full font-bold border border-indigo-100">
                                                🔥 {t.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                                    <div className="flex items-center gap-2">
                                        {isConfigPending ? (
                                            <>
                                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div>
                                                <span className="text-sm font-bold text-blue-700">Bientôt disponible</span>
                                            </>
                                        ) : freeCount > 0 ? (
                                            <>
                                                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                                                <span className="text-sm font-bold text-green-700">{freeCount} places dispo</span>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                                                <span className="text-sm font-bold text-red-700">Complet</span>
                                            </>
                                        )}
                                    </div>
                                    <div className="text-blue-600 font-bold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform bg-blue-50 px-3 py-1.5 rounded-full">
                                        Explorer <ArrowRight className="w-3 h-3"/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    </div>
  );
};

export default MarketExplorer;
