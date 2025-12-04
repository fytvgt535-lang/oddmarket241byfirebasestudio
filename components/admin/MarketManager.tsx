
import React, { useState } from 'react';
import { Store, LayoutGrid, DollarSign, Truck, Plus, Pencil, Trash, Building2, MapPin } from 'lucide-react';
import { Market } from '../../types';
import toast from 'react-hot-toast';
import { Button } from '../ui/Button';
import { Input, TextArea } from '../ui/Input';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface MarketManagerProps {
  markets: Market[];
  onAddMarket: (market: Omit<Market, 'id'>) => void;
  onUpdateMarket: (id: string, updates: Partial<Market>) => void;
  onDeleteMarket: (id: string) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
}

const MarketManager: React.FC<MarketManagerProps> = ({ markets, onAddMarket, onUpdateMarket, onDeleteMarket, viewMode, setViewMode }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [form, setForm] = useState({ 
      name: '', city: '', neighborhood: '', targetRevenue: '', capacity: '', baseRent: '', hasDeliveryService: false, description: ''
  });

  const openModal = (market?: Market) => {
      if (market) {
          setEditingId(market.id);
          setForm({
              name: market.name,
              city: market.city || '',
              neighborhood: market.neighborhood || '',
              targetRevenue: (market.targetRevenue || 0).toString(),
              capacity: (market.capacity || 0).toString(),
              baseRent: (market.baseRent || 0).toString(),
              hasDeliveryService: market.hasDeliveryService || false,
              description: market.description || ''
          });
      } else {
          setEditingId(null);
          setForm({ name: '', city: '', neighborhood: '', targetRevenue: '', capacity: '', baseRent: '', hasDeliveryService: false, description: '' });
      }
      setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const parseSafe = (val: string) => parseInt(val.replace(/\s/g, '')) || 0;
      
      const payload = {
          name: form.name,
          city: form.city,
          neighborhood: form.neighborhood,
          targetRevenue: parseSafe(form.targetRevenue),
          capacity: parseSafe(form.capacity),
          baseRent: parseSafe(form.baseRent),
          hasDeliveryService: form.hasDeliveryService,
          description: form.description
      };

      if (editingId) {
          onUpdateMarket(editingId, payload);
          toast.success("Marché mis à jour !");
      } else {
          onAddMarket(payload);
          toast.success("Marché créé !");
      }
      setIsModalOpen(false);
  };

  return (
    <Card className="animate-fade-in">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Store className="w-5 h-5 text-slate-600"/> Gestion des Marchés
            </h3>
            <div className="flex items-center gap-3">
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-white shadow text-gray-800' : 'text-gray-400'}`}><LayoutGrid className="w-4 h-4"/></button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-white shadow text-gray-800' : 'text-gray-400'}`}><Store className="w-4 h-4"/></button>
                </div>
                <Button variant="primary" size="sm" onClick={() => openModal()} leftIcon={Plus}>Ajouter Marché</Button>
            </div>
        </div>

        <CardContent>
            {markets.length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50"/>
                    <p>Aucun marché configuré.</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {markets.map(m => (
                        <div key={m.id} className="flex flex-col md:flex-row justify-between p-5 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
                            <div className="flex gap-4">
                                <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-500 shrink-0"><Store className="w-8 h-8"/></div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-gray-900 text-lg">{m.name}</p>
                                        {m.hasDeliveryService && <Badge variant="info" className="text-[10px]"><Truck className="w-3 h-3"/> Livraison</Badge>}
                                    </div>
                                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3"/> {m.city}, {m.neighborhood}</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Badge variant="info">Obj. {m.targetRevenue?.toLocaleString()} F</Badge>
                                        <Badge variant="success"><LayoutGrid className="w-3 h-3 mr-1"/> {m.capacity} pl.</Badge>
                                        <Badge variant="neutral"><DollarSign className="w-3 h-3 mr-1"/> {m.baseRent?.toLocaleString()} F</Badge>
                                    </div>
                                </div>
                            </div>
                            <div className="flex md:flex-col gap-2 mt-4 md:mt-0 md:pl-4 md:border-l border-gray-100 justify-center">
                                <button onClick={() => openModal(m)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Pencil className="w-5 h-5"/></button>
                                <button onClick={() => onDeleteMarket(m.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash className="w-5 h-5"/></button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3">Nom</th>
                                <th className="px-6 py-3">Loc.</th>
                                <th className="px-6 py-3 text-center">Capacité</th>
                                <th className="px-6 py-3 text-right">Objectif</th>
                                <th className="px-6 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {markets.map(m => (
                                <tr key={m.id} className="border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-bold text-gray-900">{m.name}</td>
                                    <td className="px-6 py-4">{m.city}, {m.neighborhood}</td>
                                    <td className="px-6 py-4 text-center">{m.capacity}</td>
                                    <td className="px-6 py-4 text-right font-medium text-blue-600">{m.targetRevenue?.toLocaleString()} F</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => openModal(m)} className="text-blue-600 hover:text-blue-800 font-medium">Éditer</button>
                                            <button onClick={() => onDeleteMarket(m.id)} className="text-red-600 hover:text-red-800 font-medium">Supprimer</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </CardContent>

        {/* Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-lg p-8 shadow-2xl animate-fade-in relative max-h-[90vh] overflow-y-auto">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        {editingId ? 'Modifier le Marché' : 'Nouveau Marché'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Input label="Nom" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ex: Marché Mont-Bouët" />
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Ville" required value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="Libreville" />
                            <Input label="Quartier" required value={form.neighborhood} onChange={e => setForm({...form, neighborhood: e.target.value})} placeholder="PK8" />
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
                            <h4 className="text-sm font-bold text-gray-800">Configuration Espace</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Capacité (Places)" required type="text" value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})} placeholder="0" />
                                <Input label="Loyer Base (FCFA)" required type="text" value={form.baseRent} onChange={e => setForm({...form, baseRent: e.target.value})} placeholder="0" />
                            </div>
                            <Input label="Objectif Revenu (FCFA)" required type="text" value={form.targetRevenue} onChange={e => setForm({...form, targetRevenue: e.target.value})} placeholder="0" />
                        </div>
                        <TextArea label="Description" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                        
                        <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                            <input type="checkbox" checked={form.hasDeliveryService} onChange={e => setForm({...form, hasDeliveryService: e.target.checked})} className="w-5 h-5 text-indigo-600 rounded cursor-pointer border-gray-300"/>
                            <label className="text-sm font-bold text-indigo-900 cursor-pointer">Activer Livraison Mairie</label>
                        </div>
                        
                        <div className="flex gap-3">
                            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1">Annuler</Button>
                            <Button type="submit" className="flex-1">Enregistrer</Button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </Card>
  );
};

export default MarketManager;
