
import React, { useState, useMemo } from 'react';
import { Store, LayoutGrid, List, Plus, Pencil, Trash2, MapPin, Loader2, X, Save, DollarSign, Users, Search, CheckCircle, ArrowRight, ArrowLeft, Clock, Eye, AlertTriangle, TrendingUp, CloudRain, Sun, CloudLightning, MessageCircle, Gavel, Megaphone, ChevronDown, ChevronUp } from 'lucide-react';
import { Market, MarketSchedule, Stall, Transaction, Sanction, HygieneReport } from '../../types';
import toast from 'react-hot-toast';
import { Button } from '../ui/Button';
import { Input, TextArea } from '../ui/Input';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { formatCurrency, calculateStallDebt } from '../../utils/coreUtils';
import StallDigitalTwin from '../StallDigitalTwin';

interface MarketManagerProps {
  markets: Market[];
  stalls?: Stall[];
  transactions?: Transaction[];
  sanctions?: Sanction[];
  reports?: HygieneReport[];
  onAddMarket: (market: Omit<Market, 'id'>) => void;
  onUpdateMarket: (id: string, updates: Partial<Market>) => void;
  onDeleteMarket: (id: string) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
}

const DEFAULT_SCHEDULE: MarketSchedule = {
    lundi: { open: '08:00', close: '18:00', isOpen: true },
    mardi: { open: '08:00', close: '18:00', isOpen: true },
    mercredi: { open: '08:00', close: '18:00', isOpen: true },
    jeudi: { open: '08:00', close: '18:00', isOpen: true },
    vendredi: { open: '08:00', close: '18:00', isOpen: true },
    samedi: { open: '08:00', close: '18:00', isOpen: true },
    dimanche: { open: '08:00', close: '13:00', isOpen: true },
};

const MarketManager: React.FC<MarketManagerProps> = ({ markets, stalls = [], transactions = [], sanctions = [], reports = [], onAddMarket, onUpdateMarket, onDeleteMarket, viewMode, setViewMode }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // GOD MODE STATE
  const [isGodMode, setIsGodMode] = useState(false);
  const [expandedMarketId, setExpandedMarketId] = useState<string | null>(null);
  
  // INTERACTIVITY STATE
  const [selectedStallForTwin, setSelectedStallForTwin] = useState<Stall | null>(null);
  
  const initialFormState = { 
      name: '', city: 'Libreville', neighborhood: '', targetRevenue: '', capacity: '', baseRent: '', 
      hasDeliveryService: false, description: '', lat: '', lng: '', schedule: DEFAULT_SCHEDULE
  };
  const [form, setForm] = useState(initialFormState);

  const filteredMarkets = markets.filter(m => 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.neighborhood.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- STATS CALCULATION ---
  const calculateMarketStats = (marketId: string) => {
      const marketStalls = stalls.filter(s => s.marketId === marketId);
      const occupiedStalls = marketStalls.filter(s => s.status === 'occupied');
      
      // Occupancy
      const occupancyRate = marketStalls.length > 0 ? (occupiedStalls.length / marketStalls.length) * 100 : 0;
      
      // Finance
      const marketTransactions = transactions.filter(t => t.marketId === marketId && t.type === 'rent');
      const actualRevenue = marketTransactions.reduce((sum, t) => sum + t.amount, 0);
      const target = markets.find(m => m.id === marketId)?.targetRevenue || 1;
      const recoveryRate = Math.min((actualRevenue / target) * 100, 100);
      
      // Health / Operational
      const marketSanctions = sanctions.filter(s => s.marketId === marketId && s.status === 'active');
      const marketReports = reports.filter(r => r.marketId === marketId && r.status === 'pending');
      
      // God Mode Stats (Hidden Deep Data)
      let totalDebt = 0;
      let fraudRiskCount = 0;
      const debtList: { stall: Stall, debt: number, months: number }[] = [];

      occupiedStalls.forEach(stall => {
          const debtData = calculateStallDebt(stall, sanctions);
          const debt = debtData.totalDebt;
          
          if (debt > 0) {
              totalDebt += debt;
              debtList.push({ stall, debt, months: debtData.monthsUnpaid });
          }
          if (debt > stall.price * 3) fraudRiskCount++;
      });

      // Sort debt list by highest debt first
      debtList.sort((a, b) => b.debt - a.debt);

      return {
          totalStalls: marketStalls.length,
          occupied: occupiedStalls.length,
          occupancyRate,
          actualRevenue,
          recoveryRate,
          activeDisputes: marketSanctions.length,
          hygieneAlerts: marketReports.length,
          totalDebt,
          fraudRiskCount,
          debtList
      };
  };

  const getHealthIcon = (recoveryRate: number, disputes: number) => {
      if (recoveryRate > 80 && disputes < 5) return <Sun className="w-6 h-6 text-yellow-500 animate-pulse"/>;
      if (recoveryRate < 50 || disputes > 10) return <CloudLightning className="w-6 h-6 text-red-500"/>;
      return <CloudRain className="w-6 h-6 text-blue-400"/>;
  };

  // --- ACTIONS ---
  const handleRemind = (stallNumber: string, occupantName: string, debt: number) => {
      toast.success(`SMS envoyé à ${occupantName} (${stallNumber}) pour ${formatCurrency(debt)}`, {
          icon: '📨',
          duration: 4000
      });
  };

  const handleBulkRemind = (count: number) => {
      if(confirm(`Envoyer un rappel SMS groupé aux ${count} étals endettés ?`)) {
          toast.success(`${count} messages de rappel envoyés.`, { icon: '🚀' });
      }
  };

  const handleSanction = (stallId: string) => {
      toast("Dossier de sanction ouvert", { icon: '⚖️' });
      // Logic to open sanction modal would go here
  };

  // --- MODAL LOGIC ---
  const openModal = (market?: Market) => {
      setEditingId(market ? market.id : null);
      setCurrentStep(1);
      
      if (market) {
          setForm({
              name: market.name,
              city: market.city || '',
              neighborhood: market.neighborhood || '',
              targetRevenue: market.targetRevenue?.toString() || '',
              capacity: market.capacity?.toString() || '',
              baseRent: market.baseRent?.toString() || '',
              hasDeliveryService: market.hasDeliveryService || false,
              description: market.description || '',
              lat: market.lat?.toString() || '',
              lng: market.lng?.toString() || '',
              schedule: market.schedule || DEFAULT_SCHEDULE
          });
      } else {
          setForm(initialFormState);
      }
      setIsModalOpen(true);
  };

  const handleScheduleChange = (day: string, field: 'open' | 'close' | 'isOpen', value: any) => {
      setForm(prev => ({
          ...prev,
          schedule: {
              ...prev.schedule,
              [day]: {
                  ...prev.schedule[day as keyof MarketSchedule],
                  [field]: value
              }
          }
      }));
  };

  const validateStep = (step: number) => {
      if (step === 1) {
          if (!form.name.trim()) { toast.error("Le nom du marché est requis."); return false; }
          return true;
      }
      if (step === 2) {
          if (!form.city.trim()) { toast.error("La ville est requise."); return false; }
          return true;
      }
      if (step === 3) {
          if (!form.targetRevenue) { toast.error("Objectif de revenu requis."); return false; }
          return true;
      }
      return false;
  };

  const handleNext = () => { if (validateStep(currentStep)) setCurrentStep(prev => prev + 1); };
  const handleBack = () => { setCurrentStep(prev => prev - 1); };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validateStep(3)) return;

      const parseSafeInt = (val: string) => parseInt(val.replace(/\s/g, '')) || 0;
      const parseSafeFloat = (val: string) => parseFloat(val) || 0;
      
      const payload = {
          name: form.name,
          city: form.city,
          neighborhood: form.neighborhood,
          targetRevenue: parseSafeInt(form.targetRevenue),
          capacity: parseSafeInt(form.capacity),
          baseRent: parseSafeInt(form.baseRent),
          hasDeliveryService: form.hasDeliveryService,
          description: form.description,
          lat: form.lat ? parseSafeFloat(form.lat) : undefined,
          lng: form.lng ? parseSafeFloat(form.lng) : undefined,
          schedule: form.schedule
      };

      try {
          if (editingId) {
              await onUpdateMarket(editingId, payload);
              toast.success("Marché mis à jour !");
          } else {
              await onAddMarket(payload);
              toast.success("Nouveau marché créé !");
          }
          setIsModalOpen(false);
      } catch (e: any) {
          toast.error(`Erreur: ${e.message || "Problème d'enregistrement"}`);
      }
  };

  const handleDelete = (id: string, name: string) => {
      if (confirm(`Êtes-vous sûr de vouloir supprimer le marché "${name}" ?`)) {
          onDeleteMarket(id);
          toast.success("Marché supprimé.");
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl shadow-inner">
                    <Store className="w-8 h-8"/>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-900">Gestion des Marchés</h3>
                    <p className="text-sm text-gray-500 font-medium">Vue stratégique et opérationnelle.</p>
                </div>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
                {/* GOD MODE TOGGLE */}
                <button 
                    onClick={() => setIsGodMode(!isGodMode)} 
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${isGodMode ? 'bg-black text-white border-black shadow-lg shadow-black/20' : 'bg-white text-gray-500 border-gray-200'}`}
                    title="Afficher les données sensibles (Dettes, Risques)"
                >
                    <Eye className="w-4 h-4"/>
                    <span className="text-xs font-bold uppercase hidden md:inline">{isGodMode ? "Mode: Oeil de Dieu" : "Mode: Standard"}</span>
                </button>

                <div className="relative flex-1 md:w-48">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400"/>
                    <input 
                        type="text" 
                        placeholder="Rechercher..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-white shadow text-gray-800' : 'text-gray-400'}`}><LayoutGrid className="w-5 h-5"/></button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-white shadow text-gray-800' : 'text-gray-400'}`}><List className="w-5 h-5"/></button>
                </div>
                <Button variant="primary" onClick={() => openModal()} leftIcon={Plus} className="bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200">Ajouter</Button>
            </div>
        </div>

        {/* Content Section */}
        {filteredMarkets.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                <Store className="w-16 h-16 text-gray-300 mx-auto mb-4"/>
                <h3 className="text-lg font-bold text-gray-900">Aucun marché</h3>
                <Button variant="outline" onClick={() => openModal()} className="mt-4">Créer le premier</Button>
            </div>
        ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMarkets.map(m => {
                    const stats = calculateMarketStats(m.id);
                    const isExpanded = expandedMarketId === m.id && isGodMode;

                    return (
                        <Card key={m.id} className={`group hover:shadow-xl transition-all duration-300 border-gray-200 overflow-hidden flex flex-col relative ${isExpanded ? 'row-span-2 shadow-2xl ring-2 ring-red-500' : ''}`} noPadding>
                            {/* Weather Icon (Operational Health) */}
                            <div className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur rounded-full p-2 shadow-sm">
                                {getHealthIcon(stats.recoveryRate, stats.activeDisputes)}
                            </div>

                            <div className="h-28 bg-gradient-to-r from-slate-800 to-slate-900 relative overflow-hidden flex items-end p-4">
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                                <div className="text-white z-10 w-full">
                                    <h3 className="font-black text-xl leading-tight text-shadow">{m.name}</h3>
                                    <p className="text-xs font-medium opacity-80 flex items-center gap-1"><MapPin className="w-3 h-3"/> {m.city}</p>
                                </div>
                            </div>
                            
                            <div className="p-5 flex-1 flex flex-col gap-4">
                                {/* OCCUPANCY & TARGETS */}
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Occupation</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-xl font-black text-gray-800">{stats.occupied}</span>
                                            <span className="text-xs text-gray-400">/ {m.capacity}</span>
                                        </div>
                                        <div className="w-full bg-gray-100 h-1.5 rounded-full mt-1 overflow-hidden">
                                            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${stats.occupancyRate}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="flex-1 text-right">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Objectif Mensuel</p>
                                        <p className="text-sm font-bold text-gray-600">{formatCurrency(m.targetRevenue)}</p>
                                        <p className={`text-xs font-black ${stats.recoveryRate >= 100 ? 'text-green-600' : 'text-orange-500'}`}>
                                            {stats.recoveryRate.toFixed(0)}% atteint
                                        </p>
                                    </div>
                                </div>

                                {/* FINANCIAL PROGRESS BAR */}
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-bold text-gray-500">Recouvrement</span>
                                        <span className="font-bold text-gray-900">{formatCurrency(stats.actualRevenue)}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden relative">
                                        <div 
                                            className={`h-full transition-all duration-1000 ${stats.recoveryRate < 50 ? 'bg-red-500' : stats.recoveryRate < 80 ? 'bg-orange-500' : 'bg-green-500'}`} 
                                            style={{ width: `${stats.recoveryRate}%` }}
                                        ></div>
                                        {/* Target Marker */}
                                        <div className="absolute top-0 bottom-0 w-0.5 bg-black/20" style={{ left: '100%' }}></div>
                                    </div>
                                </div>

                                {/* GOD MODE DATA & INTERACTIVE LIST */}
                                {isGodMode && (
                                    <div className="bg-black/5 p-3 rounded-lg border border-black/10 animate-fade-in">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-bold text-red-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Impayés Total</span>
                                            <span className="font-mono font-bold text-red-700">{formatCurrency(stats.totalDebt)}</span>
                                        </div>
                                        
                                        {/* Toggle Debt List */}
                                        {stats.debtList.length > 0 && (
                                            <button 
                                                onClick={() => setExpandedMarketId(isExpanded ? null : m.id)}
                                                className="w-full mt-2 flex items-center justify-between text-xs font-bold text-slate-700 bg-white p-2 rounded border border-slate-200 hover:bg-slate-50 transition-colors"
                                            >
                                                <span>Voir {stats.debtList.length} mauvais payeurs</span>
                                                {isExpanded ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
                                            </button>
                                        )}

                                        {/* DETAILED DEBT LIST (Available only when expanded) */}
                                        {isExpanded && (
                                            <div className="mt-3 space-y-2 animate-slide-up max-h-60 overflow-y-auto pr-1">
                                                <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-200">
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase">Liste Rouge</span>
                                                    <button onClick={() => handleBulkRemind(stats.debtList.length)} className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded flex items-center gap-1 hover:bg-red-200">
                                                        <Megaphone className="w-3 h-3"/> Rappel Général
                                                    </button>
                                                </div>
                                                {stats.debtList.map(({ stall, debt, months }) => (
                                                    <div key={stall.id} className="bg-white p-2 rounded border-l-4 border-red-500 shadow-sm flex flex-col gap-1">
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-bold text-xs text-gray-900">#{stall.number} <span className="font-normal text-gray-500">- {stall.occupantName}</span></span>
                                                            <span className="font-bold text-red-600 text-xs">{formatCurrency(debt)}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center mt-1">
                                                            <span className="text-[10px] text-orange-600 bg-orange-50 px-1 rounded">{months} mois retard</span>
                                                            <div className="flex gap-1">
                                                                <button 
                                                                    onClick={() => handleRemind(stall.number, stall.occupantName || 'Locataire', debt)}
                                                                    className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100" 
                                                                    title="Envoyer SMS Rappel"
                                                                >
                                                                    <MessageCircle className="w-3 h-3"/>
                                                                </button>
                                                                <button 
                                                                    onClick={() => setSelectedStallForTwin(stall)}
                                                                    className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200" 
                                                                    title="Ouvrir Jumeau Numérique"
                                                                >
                                                                    <Eye className="w-3 h-3"/>
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleSanction(stall.id)}
                                                                    className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100" 
                                                                    title="Sanctionner"
                                                                >
                                                                    <Gavel className="w-3 h-3"/>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* FOOTER ACTIONS */}
                                <div className="pt-4 border-t border-gray-100 flex justify-between items-center mt-auto">
                                    <div className="flex gap-2">
                                        {stats.activeDisputes > 0 && <Badge variant="danger" className="text-[10px]">{stats.activeDisputes} Litiges</Badge>}
                                        {stats.hygieneAlerts > 0 && <Badge variant="warning" className="text-[10px]">{stats.hygieneAlerts} Hygiène</Badge>}
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => openModal(m)} className="p-2 hover:bg-gray-100 rounded-lg text-blue-600 transition-colors"><Pencil className="w-4 h-4"/></button>
                                        <button onClick={() => handleDelete(m.id, m.name)} className="p-2 hover:bg-gray-100 rounded-lg text-red-600 transition-colors"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        ) : (
            <Card className="overflow-hidden border-gray-200" noPadding>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="bg-gray-50 text-gray-700 font-bold border-b uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">Marché</th>
                                <th className="px-6 py-4 text-center">Occupation</th>
                                <th className="px-6 py-4 text-center">Recouvrement</th>
                                {isGodMode && <th className="px-6 py-4 text-right text-red-600">Dette Totale</th>}
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredMarkets.map(m => {
                                const stats = calculateMarketStats(m.id);
                                return (
                                    <tr key={m.id} className="hover:bg-gray-50 group">
                                        <td className="px-6 py-4 font-bold text-gray-900">
                                            {m.name}
                                            <div className="text-xs text-gray-400 font-normal">{m.city}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Badge variant={stats.occupancyRate > 90 ? 'success' : 'neutral'}>{stats.occupancyRate.toFixed(0)}%</Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden">
                                                    <div className={`h-full ${stats.recoveryRate < 50 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${stats.recoveryRate}%` }}></div>
                                                </div>
                                                <span className="text-xs font-bold w-8">{stats.recoveryRate.toFixed(0)}%</span>
                                            </div>
                                        </td>
                                        {isGodMode && (
                                            <td className="px-6 py-4 text-right font-mono font-bold text-red-600 bg-red-50/50">
                                                {formatCurrency(stats.totalDebt)}
                                                <div className="text-[10px] text-red-400">{stats.debtList.length} cas</div>
                                            </td>
                                        )}
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => openModal(m)} className="text-blue-600 hover:text-blue-800"><Pencil className="w-4 h-4"/></button>
                                                <button onClick={() => handleDelete(m.id, m.name)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4"/></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        )}

        {/* --- WIZARD MODAL (Create/Edit) --- */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-fade-in relative overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                {editingId ? <Pencil className="w-5 h-5 text-blue-600"/> : <Plus className="w-5 h-5 text-green-600"/>}
                                {editingId ? 'Modifier le Marché' : 'Configuration Assistée'}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">Étape {currentStep} sur 3</p>
                        </div>
                        <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2"><X className="w-6 h-6"/></button>
                    </div>

                    <div className="w-full bg-gray-100 h-2">
                        <div className="bg-indigo-600 h-2 transition-all duration-500 ease-out" style={{ width: `${(currentStep / 3) * 100}%` }}></div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 bg-white">
                        <form id="marketForm" onSubmit={handleSubmit} className="space-y-6">
                            {currentStep === 1 && (
                                <div className="space-y-5 animate-slide-up">
                                    <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                                        <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">1</span> Identité
                                    </h4>
                                    <Input label="Nom de l'établissement" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ex: Marché Mont-Bouët" autoFocus />
                                    <TextArea label="Description" rows={4} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Histoire, spécialités..." />
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="space-y-6 animate-slide-up">
                                    <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                                        <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">2</span> Localisation & Horaires
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input label="Ville" required value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
                                        <Input label="Quartier" required value={form.neighborhood} onChange={e => setForm({...form, neighborhood: e.target.value})} />
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><Clock className="w-4 h-4"/> Horaires d'Ouverture</h4>
                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                            {Object.keys(form.schedule).map((day) => (
                                                <div key={day} className="flex items-center gap-3 text-sm">
                                                    <div className="w-24 capitalize font-medium text-gray-700">{day}</div>
                                                    <label className="flex items-center cursor-pointer">
                                                        <input type="checkbox" checked={form.schedule[day as keyof MarketSchedule].isOpen} onChange={e => handleScheduleChange(day, 'isOpen', e.target.checked)} className="mr-2 accent-indigo-600"/>
                                                        <span className="text-xs text-gray-500">{form.schedule[day as keyof MarketSchedule].isOpen ? 'Ouvert' : 'Fermé'}</span>
                                                    </label>
                                                    {form.schedule[day as keyof MarketSchedule].isOpen && (
                                                        <div className="flex gap-2 items-center ml-auto">
                                                            <input type="time" value={form.schedule[day as keyof MarketSchedule].open} onChange={e => handleScheduleChange(day, 'open', e.target.value)} className="p-1 border rounded text-xs"/>
                                                            <span className="text-gray-400">-</span>
                                                            <input type="time" value={form.schedule[day as keyof MarketSchedule].close} onChange={e => handleScheduleChange(day, 'close', e.target.value)} className="p-1 border rounded text-xs"/>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 3 && (
                                <div className="space-y-6 animate-slide-up">
                                    <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                                        <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">3</span> Modèle Économique
                                    </h4>
                                    <div className="grid grid-cols-2 gap-6">
                                        <Input label="Capacité (Nb. Étals)" type="number" required value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})} placeholder="100" />
                                        <Input label="Loyer de Base (FCFA)" type="number" required value={form.baseRent} onChange={e => setForm({...form, baseRent: e.target.value})} placeholder="15000" />
                                    </div>
                                    <Input label="Revenu Cible Mensuel (FCFA)" type="number" required value={form.targetRevenue} onChange={e => setForm({...form, targetRevenue: e.target.value})} placeholder="5000000" />
                                    <div className="pt-4 border-t border-gray-100">
                                        <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${form.hasDeliveryService ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-full ${form.hasDeliveryService ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}><CheckCircle className="w-5 h-5"/></div>
                                                <div><span className={`font-bold block ${form.hasDeliveryService ? 'text-green-900' : 'text-gray-600'}`}>Service Livraison</span></div>
                                            </div>
                                            <input type="checkbox" checked={form.hasDeliveryService} onChange={e => setForm({...form, hasDeliveryService: e.target.checked})} className="w-5 h-5 accent-green-600"/>
                                        </label>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>

                    <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                        <div>
                            {currentStep > 1 ? <Button type="button" variant="ghost" onClick={handleBack} leftIcon={ArrowLeft}>Retour</Button> : <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Annuler</Button>}
                        </div>
                        <div>
                            {currentStep < 3 ? <Button type="button" onClick={handleNext} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200">Suivant <ArrowRight className="w-4 h-4 ml-2"/></Button> : <Button type="submit" form="marketForm" leftIcon={Save} className="bg-green-600 hover:bg-green-700 shadow-green-200">{editingId ? 'Mettre à jour' : 'Terminer'}</Button>}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- DIGITAL TWIN MODAL (INTERACTIVITY) --- */}
        {selectedStallForTwin && (
            <StallDigitalTwin 
                stall={selectedStallForTwin} 
                transactions={transactions ? transactions.filter(t => t.stallId === selectedStallForTwin.id) : []} 
                onClose={() => setSelectedStallForTwin(null)} 
            />
        )}
    </div>
  );
};

export default MarketManager;
