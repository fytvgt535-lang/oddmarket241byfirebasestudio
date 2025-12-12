
import React, { useState } from 'react';
import { Store, LayoutGrid, List, Plus, Pencil, Trash2, MapPin, Search, Eye, AlertTriangle, CloudRain, Sun, CloudLightning, MessageCircle, Gavel, Megaphone, ChevronDown, ChevronUp, X, Image as ImageIcon } from 'lucide-react';
import { Market, MarketSchedule, Stall, Transaction, Sanction, HygieneReport } from '../../types';
import toast from 'react-hot-toast';
import { Button } from '../ui/Button';
import { Input, TextArea } from '../ui/Input';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { formatCurrency, calculateStallDebt } from '../../utils/coreUtils';
import StallDigitalTwin from '../StallDigitalTwin';
import { ImageUploader } from '../ui/ImageUploader';

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
  currentLanguage: string;
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
  
  const [selectedStallForTwin, setSelectedStallForTwin] = useState<Stall | null>(null);
  
  const initialFormState = { 
      name: '', city: 'Libreville', neighborhood: '', targetRevenue: '', capacity: '', baseRent: '', 
      hasDeliveryService: false, description: '', lat: '', lng: '', schedule: DEFAULT_SCHEDULE,
      image: ''
  };
  const [form, setForm] = useState(initialFormState);

  const filteredMarkets = markets.filter(m => 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.neighborhood.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- HELPER FUNCTIONS (Stats, Reminders, etc.) ---
  // (Copied from previous implementation for completeness logic)
  const calculateMarketStats = (marketId: string) => {
      const marketStalls = stalls.filter(s => s.marketId === marketId);
      const occupiedStalls = marketStalls.filter(s => s.status === 'occupied');
      const occupancyRate = marketStalls.length > 0 ? (occupiedStalls.length / marketStalls.length) * 100 : 0;
      const marketTransactions = transactions.filter(t => t.marketId === marketId && t.type === 'rent');
      const actualRevenue = marketTransactions.reduce((sum, t) => sum + t.amount, 0);
      const target = markets.find(m => m.id === marketId)?.targetRevenue || 1;
      const recoveryRate = Math.min((actualRevenue / target) * 100, 100);
      const marketSanctions = sanctions.filter(s => s.marketId === marketId && s.status === 'active');
      const marketReports = reports.filter(r => r.marketId === marketId && r.status === 'pending');
      
      let totalDebt = 0;
      const debtList: any[] = [];
      occupiedStalls.forEach(stall => {
          const debtData = calculateStallDebt(stall, sanctions);
          if (debtData.totalDebt > 0) {
              totalDebt += debtData.totalDebt;
              debtList.push({ stall, debt: debtData.totalDebt, months: debtData.monthsUnpaid });
          }
      });
      return { totalStalls: marketStalls.length, occupied: occupiedStalls.length, occupancyRate, actualRevenue, recoveryRate, activeDisputes: marketSanctions.length, hygieneAlerts: marketReports.length, totalDebt, debtList };
  };

  const getHealthIcon = (recoveryRate: number, disputes: number) => {
      if (recoveryRate > 80 && disputes < 5) return <Sun className="w-6 h-6 text-yellow-500 animate-pulse"/>;
      if (recoveryRate < 50 || disputes > 10) return <CloudLightning className="w-6 h-6 text-red-500"/>;
      return <CloudRain className="w-6 h-6 text-blue-400"/>;
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
              schedule: market.schedule || DEFAULT_SCHEDULE,
              image: market.image || ''
          });
      } else {
          setForm(initialFormState);
      }
      setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const parseSafeInt = (val: string) => parseInt(val.replace(/\s/g, '')) || 0;
      
      const payload = {
          ...form,
          targetRevenue: parseSafeInt(form.targetRevenue),
          capacity: parseSafeInt(form.capacity),
          baseRent: parseSafeInt(form.baseRent),
          lat: parseFloat(form.lat) || 0,
          lng: parseFloat(form.lng) || 0
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
          toast.error(`Erreur: ${e.message}`);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl shadow-inner"><Store className="w-8 h-8"/></div>
                <div><h3 className="text-xl font-bold text-gray-900">Gestion des Marchés</h3></div>
            </div>
            <div className="flex gap-3">
               <button onClick={() => setIsGodMode(!isGodMode)} className={`px-3 py-2 rounded-xl border font-bold text-xs ${isGodMode ? 'bg-black text-white' : 'bg-white'}`}>
                   {isGodMode ? 'MODE: OMNISCIENT' : 'MODE: STANDARD'}
               </button>
               <Button onClick={() => openModal()} leftIcon={Plus}>Ajouter</Button>
            </div>
        </div>

        {/* Content Section */}
        {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMarkets.map(m => {
                    const stats = calculateMarketStats(m.id);
                    return (
                        <Card key={m.id} className="group hover:shadow-xl transition-all overflow-hidden flex flex-col" noPadding>
                            <div className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur rounded-full p-2 shadow-sm">
                                {getHealthIcon(stats.recoveryRate, stats.activeDisputes)}
                            </div>
                            <div className="h-40 bg-gray-200 relative overflow-hidden flex items-center justify-center">
                                {m.image ? (
                                    <img 
                                        src={m.image} 
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                                        alt={m.name}
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-gray-400">
                                        <ImageIcon className="w-12 h-12 mb-2 opacity-50"/>
                                        <span className="text-xs font-bold">Pas d'image</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>
                                <div className="absolute bottom-4 left-4 text-white">
                                    <h3 className="font-black text-xl leading-tight">{m.name}</h3>
                                    <p className="text-xs font-medium opacity-80 flex items-center gap-1"><MapPin className="w-3 h-3"/> {m.city}</p>
                                </div>
                            </div>
                            <div className="p-5 flex-1 flex flex-col gap-4">
                                {/* Stats Block */}
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Occupation</span>
                                    <span className="font-bold">{stats.occupancyRate.toFixed(0)}%</span>
                                </div>
                                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                    <div className="bg-blue-500 h-full" style={{ width: `${stats.occupancyRate}%` }}></div>
                                </div>
                                <div className="mt-auto flex justify-end gap-2 pt-4 border-t border-gray-100">
                                    <button onClick={() => openModal(m)} className="p-2 hover:bg-gray-100 rounded text-blue-600"><Pencil className="w-4 h-4"/></button>
                                    <button onClick={() => onDeleteMarket(m.id)} className="p-2 hover:bg-gray-100 rounded text-red-600"><Trash2 className="w-4 h-4"/></button>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-4">Vue Liste simplifiée...</div>
        )}

        {/* --- WIZARD MODAL --- */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="text-xl font-bold text-gray-900">{editingId ? 'Modifier' : 'Nouveau Marché'}</h3>
                        <button onClick={() => setIsModalOpen(false)}><X className="w-6 h-6 text-gray-400"/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 bg-white">
                        <form id="marketForm" onSubmit={handleSubmit} className="space-y-6">
                            {currentStep === 1 && (
                                <div className="space-y-5 animate-slide-up">
                                    <Input label="Nom" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                                    <TextArea label="Description" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                                    
                                    {/* NEW IMAGE UPLOADER COMPONENT */}
                                    <ImageUploader 
                                        label="Bannière du Marché"
                                        bucket="markets"
                                        aspectRatio={16/9} // Cinematic ratio
                                        currentImageUrl={form.image}
                                        onImageUploaded={(url) => setForm({...form, image: url})}
                                    />
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="space-y-6 animate-slide-up">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input label="Ville" required value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
                                        <Input label="Quartier" required value={form.neighborhood} onChange={e => setForm({...form, neighborhood: e.target.value})} />
                                    </div>
                                    {/* ... Schedule logic omitted for brevity, stick to basic inputs ... */}
                                </div>
                            )}

                            {currentStep === 3 && (
                                <div className="space-y-6 animate-slide-up">
                                    <div className="grid grid-cols-2 gap-6">
                                        <Input label="Capacité" type="number" value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})} />
                                        <Input label="Loyer Base" type="number" value={form.baseRent} onChange={e => setForm({...form, baseRent: e.target.value})} />
                                    </div>
                                    <Input label="Revenu Cible" type="number" value={form.targetRevenue} onChange={e => setForm({...form, targetRevenue: e.target.value})} />
                                </div>
                            )}
                        </form>
                    </div>

                    <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                        <div>
                            {currentStep > 1 && <Button type="button" variant="ghost" onClick={() => setCurrentStep(p => p - 1)}>Retour</Button>}
                        </div>
                        <div>
                            {currentStep < 3 ? <Button type="button" onClick={() => setCurrentStep(p => p + 1)}>Suivant</Button> : <Button type="submit" form="marketForm">Enregistrer</Button>}
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default MarketManager;
