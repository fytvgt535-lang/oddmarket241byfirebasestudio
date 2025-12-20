
import React, { useState } from 'react';
import { Settings, Plus, Trash2, Tag, Info, Palette } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ProductCategory } from '../../types';
import toast from 'react-hot-toast';

interface SettingsManagerProps {
    categories: ProductCategory[];
    onAddCategory: (cat: Omit<ProductCategory, 'id'>) => void;
    onDeleteCategory: (id: string) => void;
}

const SettingsManager: React.FC<SettingsManagerProps> = ({ categories, onAddCategory, onDeleteCategory }) => {
    const [newCat, setNewCat] = useState({ label: '', color: 'bg-gray-100 text-gray-800' });
    const [previewColor, setPreviewColor] = useState('blue');

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCat.label) return;
        
        const colorClass = `bg-${previewColor}-100 text-${previewColor}-700 border-${previewColor}-200`;
        
        onAddCategory({
            label: newCat.label,
            color: colorClass
        });
        setNewCat({ label: '', color: '' });
        toast.success("Catégorie ajoutée !");
    };

    const colors = ['blue', 'green', 'red', 'orange', 'purple', 'pink', 'indigo', 'yellow', 'gray'];

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
                <div className="p-3 bg-purple-100 text-purple-700 rounded-xl shadow-inner"><Settings className="w-8 h-8"/></div>
                <div>
                    <h3 className="text-xl font-bold text-gray-900">Paramètres Globaux</h3>
                    <p className="text-sm text-gray-500">Configuration des types et taxonomies.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* CATEGORY MANAGER */}
                <Card className="flex flex-col h-full">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h4 className="font-bold text-gray-800 flex items-center gap-2"><Tag className="w-5 h-5"/> Types de Produits</h4>
                        <span className="text-xs bg-gray-200 px-2 py-1 rounded-full text-gray-600 font-bold">{categories.length}</span>
                    </div>
                    
                    <div className="p-6 space-y-6 flex-1">
                        <form onSubmit={handleAdd} className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Ajouter un nouveau type</p>
                            <div className="flex gap-2">
                                <Input 
                                    placeholder="Ex: Coiffure, Mécanique..." 
                                    value={newCat.label} 
                                    onChange={e => setNewCat({...newCat, label: e.target.value})}
                                    className="bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-2 flex items-center gap-1"><Palette className="w-3 h-3"/> Couleur du Badge</label>
                                <div className="flex gap-2 flex-wrap">
                                    {colors.map(c => (
                                        <button
                                            type="button"
                                            key={c}
                                            onClick={() => setPreviewColor(c)}
                                            className={`w-6 h-6 rounded-full bg-${c}-500 transition-transform ${previewColor === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110'}`}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border bg-${previewColor}-100 text-${previewColor}-700 border-${previewColor}-200`}>
                                    Aperçu: {newCat.label || 'Nouveau Type'}
                                </span>
                                <Button type="submit" size="sm" disabled={!newCat.label}>Ajouter</Button>
                            </div>
                        </form>

                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                            {categories.map(cat => (
                                <div key={cat.id} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-lg hover:shadow-sm transition-all group">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${cat.color}`}>
                                            {cat.label}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-mono">ID: {cat.id}</span>
                                    </div>
                                    <button 
                                        onClick={() => onDeleteCategory(cat.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                        title="Supprimer"
                                    >
                                        <Trash2 className="w-4 h-4"/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>

                {/* INFO PANEL */}
                <div className="space-y-6">
                    <Card className="p-6 border-l-4 border-blue-500">
                        <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-2"><Info className="w-5 h-5 text-blue-500"/> Note Système</h4>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Les catégories ajoutées ici seront immédiatement disponibles pour :
                        </p>
                        <ul className="list-disc pl-5 mt-2 text-sm text-gray-600 space-y-1">
                            <li>La création d'étals par l'Admin.</li>
                            <li>Le choix des produits par les Vendeurs.</li>
                            <li>Les filtres de recherche des Clients.</li>
                        </ul>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default SettingsManager;
