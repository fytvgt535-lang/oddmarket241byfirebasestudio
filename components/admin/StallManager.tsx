
import React, { useState, useMemo } from 'react';
import { Search, LayoutGrid, List, MapPin, Trash2, Plus, Copy, AlertTriangle, Building2, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';
import { Stall, Market, ProductCategory, User } from '../../types';
import toast from 'react-hot-toast';
import StallDigitalTwin from '../StallDigitalTwin';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface StallManagerProps {
  stalls: Stall[];
  markets: Market[];
  categories: ProductCategory[];
  users: User[];
  onCreateStall: (stall: Omit<Stall, 'id'>) => void;
  onBulkCreateStalls: (stalls: Omit<Stall, 'id'>[]) => void;
  onDeleteStall: (id: string) => void;
  currentLanguage: string;
}

const StallManager: React.FC<StallManagerProps> = ({ stalls, markets, categories, users, onCreateStall, onBulkCreateStalls, onDeleteStall }) => {
  // Filters local state
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMarketId, setFilterMarketId] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [selectedStallTwin, setSelectedStallTwin] = useState<Stall | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 20;

  // RECTIFICATION : Source de vérité unique basée sur la prop 'stalls'
  const filteredStalls = useMemo(() => {
      return stalls.filter(s => {
          const matchesMarket = filterMarketId === 'all' || s.marketId === filterMarketId;
          const matchesStatus = filterStatus === 'all' || s.status === filterStatus || s.healthStatus === filterStatus;
          const matchesSearch = s.number.toLowerCase().includes(search.toLowerCase()) || 
                               (s.occupantName || '').toLowerCase().includes(search.toLowerCase());
          return matchesMarket && matchesStatus && matchesSearch;
      });
  }, [stalls, search, filterMarketId, filterStatus]);

  const paginatedList = filteredStalls.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const defaultCat = categories.length > 0 ? categories[0].id : 'divers';
  const [newForm, setNewForm] = useState({ number: '', zone: '', price: '', size: 'S', marketId: '', productType: defaultCat, occupantId: '' });
  const [bulkForm, setBulkForm] = useState({ marketId: '', zone: '', prefix: '', startNumber: '1', count: '10', price: '', size: 'S', productType: defaultCat });

  const getMarketName = (id: string) => markets.find(m => m.id === id)?.name || 'Marché Inconnu';

  const handleCreate = (e: React.FormEvent) => {
      e.preventDefault();
      const vendor = users.find(u => u.id === newForm.occupantId);
      onCreateStall({
          ...newForm,
          price: Number(newForm.price),
          status: vendor ? 'occupied' : 'free',
          occupantId: vendor?.id,
          occupantName: vendor?.name,
          occupantPhone: vendor?.phone,
          complianceScore: 100,
          healthStatus: 'healthy',
          documents: [], employees: [], activityLog: [], messages: [], surfaceArea: 4,
          coordinates: { lat: 0.39, lng: 9.45 }
      } as any);
      setIsCreateOpen(false);
      toast.success("Étal ajouté au registre.");
  };

  return (
    <Card className="animate-fade-in border-none shadow-none">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-orange-50/30 sticky top-0 z-20 backdrop-blur-md">
            <div>
                <h3 className="text-xl font-black text-orange-950 flex items-center gap-2 uppercase tracking-tighter"><LayoutGrid className="w-6 h-6"/> Parc Immobilier</h3>
                <p className="text-xs font-bold text-orange-700/60 uppercase tracking-widest">{filteredStalls.length} unités actives</p>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsBulkOpen(true)} className="border-orange-200 text-orange-700">Générer Série</Button>
                <Button onClick={() => setIsCreateOpen(true)} className="bg-orange-600 border-none shadow-orange-200">Nouvel Étal</Button>
            </div>
        </div>

        <div className="p-6">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                    <Input placeholder="N° étal, Commerçant..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} leftIcon={Search} className="bg-gray-50 border-transparent focus:bg-white" />
                </div>
                <div className="w-48">
                    <Select value={filterMarketId} onChange={(e) => { setFilterMarketId(e.target.value); setPage(1); }} className="bg-gray-50 border-transparent">
                        <option value="all">Tous Marchés</option>
                        {markets.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </Select>
                </div>
                <div className="w-48">
                    <Select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className="bg-gray-50 border-transparent">
                        <option value="all">Tous Statuts</option>
                        <option value="occupied">Loué</option>
                        <option value="free">Libre</option>
                        <option value="critical">Alertes</option>
                    </Select>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-white shadow text-slate-900' : 'text-slate-400'}`}><LayoutGrid className="w-5 h-5"/></button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-white shadow text-slate-900' : 'text-slate-400'}`}><List className="w-5 h-5"/></button>
                </div>
            </div>

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {paginatedList.map(stall => (
                        <div key={stall.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all group p-5 relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-full h-1.5 ${stall.status === 'occupied' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                            <div className="flex justify-between items-start mb-3">
                                <h4 className="text-2xl font-black text-slate-900 leading-none">{stall.number}</h4>
                                <Badge variant={stall.status === 'occupied' ? 'success' : 'info'}>{stall.status === 'occupied' ? 'Loué' : 'Libre'}</Badge>
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{getMarketName(stall.marketId)}</p>
                            <p className="text-sm font-black text-slate-700 mb-4">{stall.price.toLocaleString()} F / mois</p>
                            <div className="flex gap-2">
                                <Button size="sm" variant="ghost" className="flex-1 bg-slate-50 text-slate-600 font-bold" onClick={() => setSelectedStallTwin(stall)}>Digital Twin</Button>
                                <button onClick={() => setDeleteId(stall.id)} className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"><Trash2 className="w-5 h-5"/></button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-gray-100">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b">
                            <tr><th className="p-4">N° Étal</th><th className="p-4">Marché</th><th className="p-4">Statut</th><th className="p-4">Prix</th><th className="p-4 text-right">Actions</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {paginatedList.map(stall => (
                                <tr key={stall.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-4 font-black text-slate-900">{stall.number}</td>
                                    <td className="p-4 text-slate-500 font-medium">{getMarketName(stall.marketId)}</td>
                                    <td className="p-4"><Badge variant={stall.status === 'occupied' ? 'success' : 'info'}>{stall.status}</Badge></td>
                                    <td className="p-4 font-bold text-slate-700">{stall.price.toLocaleString()} F</td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => setSelectedStallTwin(stall)} className="text-blue-600 font-black text-xs uppercase hover:underline">Ouvrir Twin</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="mt-6 flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                <span>Page {page} / {Math.ceil(filteredStalls.length / ITEMS_PER_PAGE)}</span>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Précédent</Button>
                    <Button size="sm" variant="outline" disabled={page * ITEMS_PER_PAGE >= filteredStalls.length} onClick={() => setPage(p => p + 1)}>Suivant</Button>
                </div>
            </div>
        </div>

        {isCreateOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl relative animate-scale-in">
                    <h3 className="text-2xl font-black text-slate-900 mb-6 tracking-tighter uppercase">Initialisation Étal</h3>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <Select label="Marché Destination" required value={newForm.marketId} onChange={e => setNewForm({...newForm, marketId: e.target.value})}>
                            <option value="">Choisir un marché...</option>
                            {markets.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </Select>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Référence" required placeholder="Ex: B-40" value={newForm.number} onChange={e => setNewForm({...newForm, number: e.target.value})} />
                            <Input label="Loyer Mensuel" required type="number" value={newForm.price} onChange={e => setNewForm({...newForm, price: e.target.value})} />
                        </div>
                        <Select label="Type d'Activité" value={newForm.productType} onChange={e => setNewForm({...newForm, productType: e.target.value})}>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </Select>
                        <div className="flex gap-3 pt-4">
                            <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
                            <Button type="submit" className="flex-1 bg-orange-600 border-none">Confirmer</Button>
                        </div>
                    </form>
                </Card>
            </div>
        )}

        {selectedStallTwin && <StallDigitalTwin stall={selectedStallTwin} transactions={[]} onClose={() => setSelectedStallTwin(null)} />}
    </Card>
  );
};

export default StallManager;
