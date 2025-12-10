
import React, { useState, useMemo } from 'react';
import { Search, LayoutGrid, List, MapPin, Trash2, Plus, Copy, AlertTriangle, Building2 } from 'lucide-react';
import { Stall, Market } from '../../types';
import toast from 'react-hot-toast';
import StallDigitalTwin from '../StallDigitalTwin';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { t } from '../../services/translations';

interface StallManagerProps {
  stalls: Stall[];
  markets: Market[];
  onCreateStall: (stall: Omit<Stall, 'id'>) => void;
  onBulkCreateStalls: (stalls: Omit<Stall, 'id'>[]) => void;
  onDeleteStall: (id: string) => void;
  currentLanguage?: string;
}

const StallManager: React.FC<StallManagerProps> = ({ stalls, markets, onCreateStall, onBulkCreateStalls, onDeleteStall, currentLanguage = 'fr' }) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'healthy' | 'warning' | 'critical'>('all');
  const [filterMarketId, setFilterMarketId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [selectedStallTwin, setSelectedStallTwin] = useState<Stall | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Forms
  const [newForm, setNewForm] = useState({ number: '', zone: '', price: '', size: 'S', marketId: '', productType: 'divers' });
  const [bulkForm, setBulkForm] = useState({ marketId: '', zone: '', prefix: '', startNumber: '1', count: '10', price: '', size: 'S', productType: 'divers' });

  const filteredStalls = useMemo(() => {
      return stalls.filter(s => {
          const matchSearch = s.number.toLowerCase().includes(search.toLowerCase()) || s.occupantName?.toLowerCase().includes(search.toLowerCase());
          const matchStatus = filterStatus === 'all' || s.healthStatus === filterStatus;
          const matchMarket = filterMarketId === 'all' || s.marketId === filterMarketId;
          return matchSearch && matchStatus && matchMarket;
      });
  }, [stalls, search, filterStatus, filterMarketId]);

  const getMarketName = (id: string) => markets.find(m => m.id === id)?.name || 'Marché Inconnu';

  const handleCreate = (e: React.FormEvent) => {
      e.preventDefault();
      const lat = 0.3920 + (Math.random() - 0.5) * 0.005;
      const lng = 9.4540 + (Math.random() - 0.5) * 0.005;
      
      onCreateStall({
          number: newForm.number,
          zone: newForm.zone,
          price: Number(newForm.price),
          size: newForm.size as any,
          marketId: newForm.marketId,
          productType: newForm.productType as any,
          status: 'free',
          complianceScore: 100,
          healthStatus: 'healthy',
          documents: [], employees: [], activityLog: [], messages: [], surfaceArea: 4,
          coordinates: { lat, lng }
      });
      setIsCreateOpen(false);
      setNewForm({ number: '', zone: '', price: '', size: 'S', marketId: '', productType: 'divers' });
      toast.success("Étal créé !");
  };

  const handleBulkCreate = (e: React.FormEvent) => {
      e.preventDefault();
      const stallsToCreate: any[] = [];
      const start = parseInt(bulkForm.startNumber) || 1;
      const count = parseInt(bulkForm.count) || 10;
      const end = start + count;
      
      for (let i = start; i < end; i++) {
          const numStr = i.toString().padStart(2, '0');
          const lat = 0.3920 + (Math.random() - 0.5) * 0.01;
          const lng = 9.4540 + (Math.random() - 0.5) * 0.01;
          
          stallsToCreate.push({
              number: `${bulkForm.prefix}${numStr}`,
              zone: bulkForm.zone,
              price: Number(bulkForm.price),
              size: bulkForm.size as any,
              marketId: bulkForm.marketId,
              productType: bulkForm.productType as any,
              status: 'free',
              complianceScore: 100,
              healthStatus: 'healthy',
              documents: [], employees: [], activityLog: [], messages: [], surfaceArea: 4,
              coordinates: { lat, lng }
          });
      }
      onBulkCreateStalls(stallsToCreate);
      setIsBulkOpen(false);
      toast.success(`${stallsToCreate.length} étals générés !`);
  };

  const handleDelete = () => {
      if (deleteId) {
          onDeleteStall(deleteId);
          setDeleteId(null);
          toast.success("Étal supprimé.");
      }
  };

  return (
    <Card className="animate-fade-in">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-orange-50/50">
            <div>
                <h3 className="text-lg font-bold text-orange-900 flex items-center gap-2"><LayoutGrid className="w-5 h-5"/> {t(currentLanguage, 'stall_management')}</h3>
                <p className="text-sm text-orange-700">{t(currentLanguage, 'stall_subtitle')}</p>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsBulkOpen(true)} leftIcon={Copy}>{t(currentLanguage, 'stall_gen_series')}</Button>
                <Button variant="primary" onClick={() => setIsCreateOpen(true)} leftIcon={Plus} className="bg-orange-600 hover:bg-orange-700">{t(currentLanguage, 'stall_new')}</Button>
            </div>
        </div>

        <CardContent>
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                    <Input placeholder={`${t(currentLanguage, 'search_placeholder')}...`} value={search} onChange={(e) => setSearch(e.target.value)} leftIcon={Search} />
                </div>
                <div className="w-48">
                    <Select value={filterMarketId} onChange={(e) => setFilterMarketId(e.target.value)}>
                        <option value="all">{t(currentLanguage, 'stall_filter_market')}</option>
                        {markets.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </Select>
                </div>
                <div className="w-48">
                    <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
                        <option value="all">{t(currentLanguage, 'stall_filter_status')}</option>
                        <option value="healthy">Sain (Vert)</option>
                        <option value="warning">Avertissement</option>
                        <option value="critical">Critique (Rouge)</option>
                    </Select>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl h-fit">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow text-gray-900' : 'text-gray-400'}`}><LayoutGrid className="w-5 h-5"/></button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-400'}`}><List className="w-5 h-5"/></button>
                </div>
            </div>

            {/* List/Grid View */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredStalls.map(stall => (
                        <div key={stall.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-all group relative">
                            <div className={`h-2 ${stall.healthStatus === 'healthy' ? 'bg-green-500' : stall.healthStatus === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                            <div className="p-5">
                                <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 flex items-center gap-1">
                                    <Building2 className="w-3 h-3"/> {getMarketName(stall.marketId)}
                                </div>
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="text-2xl font-black text-gray-800">{stall.number}</h4>
                                    <Badge variant={stall.status === 'occupied' ? 'success' : 'neutral'}>
                                        {stall.status === 'occupied' ? t(currentLanguage, 'occupied') : t(currentLanguage, 'available')}
                                    </Badge>
                                </div>
                                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3"/> {t(currentLanguage, 'stall_zone')} {stall.zone}</p>
                                <p className="text-sm font-bold text-gray-800 mb-4">{stall.price.toLocaleString()} FCFA</p>
                                {stall.occupantName && <div className="mb-4 p-2 bg-gray-50 rounded-lg text-xs font-bold text-gray-700 truncate">{stall.occupantName}</div>}
                                <div className="flex gap-2">
                                    <Button size="sm" variant="ghost" className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100" onClick={() => setSelectedStallTwin(stall)}>{t(currentLanguage, 'details')}</Button>
                                    <button onClick={() => setDeleteId(stall.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4"/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-sm text-left text-gray-700">
                        <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200">
                            <tr>
                                <th className="p-4">{t(currentLanguage, 'stall_number')}</th>
                                <th className="p-4">{t(currentLanguage, 'user_market')}</th>
                                <th className="p-4">{t(currentLanguage, 'stall_zone')}</th>
                                <th className="p-4">{t(currentLanguage, 'stall_price')}</th>
                                <th className="p-4">{t(currentLanguage, 'stall_occupant')}</th>
                                <th className="p-4 text-right">{t(currentLanguage, 'actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStalls.map(stall => (
                                <tr key={stall.id} className="hover:bg-gray-50 border-b last:border-0">
                                    <td className="p-4 font-bold text-gray-900">{stall.number}</td>
                                    <td className="p-4 text-sm text-gray-600">{getMarketName(stall.marketId)}</td>
                                    <td className="p-4">{stall.zone}</td>
                                    <td className="p-4 font-medium">{stall.price.toLocaleString()} F</td>
                                    <td className="p-4 text-gray-600">{stall.occupantName || '-'}</td>
                                    <td className="p-4 text-right flex justify-end gap-2">
                                        <Button size="sm" variant="ghost" onClick={() => setSelectedStallTwin(stall)}>{t(currentLanguage, 'details')}</Button>
                                        <button onClick={() => setDeleteId(stall.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4"/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </CardContent>

        {/* Modal Création Unitaire */}
        {isCreateOpen && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl">
                    <h3 className="text-xl font-bold mb-6 text-gray-900">{t(currentLanguage, 'stall_new')}</h3>
                    <form onSubmit={handleCreate} className="space-y-5">
                        <Select label={t(currentLanguage, 'user_market')} required value={newForm.marketId} onChange={e => setNewForm({...newForm, marketId: e.target.value})}>
                            <option value="">Sélectionner...</option>
                            {markets.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </Select>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label={t(currentLanguage, 'stall_number')} required placeholder="A-12" value={newForm.number} onChange={e => setNewForm({...newForm, number: e.target.value})} />
                            <Input label={t(currentLanguage, 'stall_zone')} required placeholder="Textile" value={newForm.zone} onChange={e => setNewForm({...newForm, zone: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label={`${t(currentLanguage, 'stall_price')} (FCFA)`} required type="number" placeholder="15000" value={newForm.price} onChange={e => setNewForm({...newForm, price: e.target.value})} />
                            <Select label={t(currentLanguage, 'stall_size')} value={newForm.size} onChange={e => setNewForm({...newForm, size: e.target.value})}>
                                <option value="S">Petit (S)</option><option value="M">Moyen (M)</option><option value="L">Grand (L)</option>
                            </Select>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="flex-1">{t(currentLanguage, 'cancel')}</Button>
                            <Button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700">{t(currentLanguage, 'create')}</Button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Modal Bulk */}
        {isBulkOpen && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-lg p-8 shadow-2xl">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-900"><Copy className="w-6 h-6 text-orange-600"/> {t(currentLanguage, 'stall_gen_series')}</h3>
                    <form onSubmit={handleBulkCreate} className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <Select label={t(currentLanguage, 'user_market')} required value={bulkForm.marketId} onChange={e => setBulkForm({...bulkForm, marketId: e.target.value})}>
                                <option value="">Choisir...</option>
                                {markets.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </Select>
                            <Input label={t(currentLanguage, 'stall_zone')} required placeholder="Ex: Vivres" value={bulkForm.zone} onChange={e => setBulkForm({...bulkForm, zone: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <Input label="Préfixe" required placeholder="A-" value={bulkForm.prefix} onChange={e => setBulkForm({...bulkForm, prefix: e.target.value})} />
                            <Input label="Début N°" required type="number" placeholder="1" value={bulkForm.startNumber} onChange={e => setBulkForm({...bulkForm, startNumber: e.target.value})} />
                            <Input label="Quantité" required type="number" placeholder="50" value={bulkForm.count} onChange={e => setBulkForm({...bulkForm, count: e.target.value})} />
                        </div>
                        <Input label="Loyer Unitaire (FCFA)" required type="number" placeholder="10000" value={bulkForm.price} onChange={e => setBulkForm({...bulkForm, price: e.target.value})} />
                        
                        <div className="bg-orange-50 p-4 rounded-xl text-xs text-orange-800 border border-orange-100">
                            Cela va générer {bulkForm.count} étals (ex: {bulkForm.prefix}{bulkForm.startNumber} à {bulkForm.prefix}{parseInt(bulkForm.startNumber) + parseInt(bulkForm.count) - 1}).
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button type="button" variant="ghost" onClick={() => setIsBulkOpen(false)} className="flex-1">{t(currentLanguage, 'cancel')}</Button>
                            <Button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700">Lancer Génération</Button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Modal Suppression */}
        {deleteId && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600"><AlertTriangle className="w-8 h-8"/></div>
                    <h3 className="text-xl font-bold mb-2 text-gray-900">Supprimer l'étal ?</h3>
                    <p className="text-gray-500 text-sm mb-6">Cette action est irréversible.</p>
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={() => setDeleteId(null)} className="flex-1">{t(currentLanguage, 'cancel')}</Button>
                        <Button variant="danger" onClick={handleDelete} className="flex-1">{t(currentLanguage, 'confirm')}</Button>
                    </div>
                </div>
            </div>
        )}

        {selectedStallTwin && <StallDigitalTwin stall={selectedStallTwin} transactions={[]} onClose={() => setSelectedStallTwin(null)} />}
    </Card>
  );
};

export default StallManager;
