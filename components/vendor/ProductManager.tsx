
import React, { useState, useMemo } from 'react';
import { Product, Stall, VendorProfile, ProductCategory } from '../../types';
import { Search, Plus, Edit, Minus, Zap, X, Check, XCircle, ShoppingBasket, TrendingUp, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { PRODUCT_CATEGORIES as DEFAULT_CATS } from '../../constants/appConstants';
import { ImageUploader } from '../ui/ImageUploader';

interface ProductManagerProps {
  products: Product[];
  myStall?: Stall;
  profile: VendorProfile;
  productCategories?: ProductCategory[];
  onAddProduct: (product: Omit<Product, 'id'>) => Promise<any>;
  onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: string) => void;
}

const ProductManager: React.FC<ProductManagerProps> = ({ products, myStall, productCategories = [], onAddProduct, onUpdateProduct }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const availableCategories = productCategories.length > 0 ? productCategories : DEFAULT_CATS;
  const [form, setForm] = useState({ name: '', price: '', category: availableCategories[0].id, quantity: '1', description: '', imageUrl: '' });

  const handleOpenModal = (product?: Product) => {
      if (product) {
          setEditingProduct(product);
          setForm({ name: product.name, price: product.price.toString(), category: product.category, quantity: product.stockQuantity.toString(), description: product.description || '', imageUrl: product.imageUrl || '' });
      } else {
          setEditingProduct(null);
          setForm({ name: '', price: '', category: availableCategories[0].id, quantity: '10', description: '', imageUrl: '' });
      }
      setIsModalOpen(true);
  };

  const toggleInStock = async (p: Product) => {
      try {
          await onUpdateProduct(p.id, { inStock: !p.inStock });
          toast.success(p.inStock ? "Rupture de stock signalée" : "Produit de nouveau disponible");
      } catch (e) { toast.error("Erreur réseau"); }
  };

  const updateQuantity = async (p: Product, delta: number) => {
      const newVal = Math.max(0, p.stockQuantity + delta);
      try {
          await onUpdateProduct(p.id, { stockQuantity: newVal, inStock: newVal > 0 });
      } catch (e) { toast.error("Erreur réseau"); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!myStall) return toast.error("Réservez d'abord un étal.");
      setIsSubmitting(true);
      try {
          const data = { stallId: myStall.id, name: form.name, price: Number(form.price), category: form.category as any, stockQuantity: Number(form.quantity), inStock: Number(form.quantity) > 0, description: form.description, imageUrl: form.imageUrl, unit: 'unité', isVisible: true };
          if (editingProduct) {
              await onUpdateProduct(editingProduct.id, data);
              toast.success("Mise à jour réussie");
          } else {
              await onAddProduct(data);
              toast.success("Produit ajouté");
          }
          setIsModalOpen(false);
      } catch (e: any) { toast.error(e.message); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24">
        <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">En Stock</p>
                <p className="text-2xl font-black text-slate-900">{products.filter(p => p.stallId === myStall?.id && p.inStock).length}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-3xl border border-red-100 shadow-sm">
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Ruptures</p>
                <p className="text-2xl font-black text-red-600">{products.filter(p => p.stallId === myStall?.id && !p.inStock).length}</p>
            </div>
        </div>

        <Button onClick={() => handleOpenModal()} className="w-full h-20 rounded-[2rem] shadow-xl bg-purple-600 hover:bg-purple-700 text-lg font-black uppercase tracking-widest flex items-center justify-center gap-3">
            <Plus className="w-6 h-6"/> Nouveau Produit
        </Button>

        <div className="space-y-4">
            {products.filter(p => p.stallId === myStall?.id).map((p) => (
                <div key={p.id} className={`p-4 rounded-[2.5rem] border-2 transition-all group relative overflow-hidden ${p.inStock ? 'bg-white border-transparent shadow-md' : 'bg-slate-50 border-slate-200 opacity-75'}`}>
                    <div className="flex gap-4 items-center mb-4">
                        <div className="w-20 h-20 bg-slate-100 rounded-[1.5rem] shrink-0 overflow-hidden relative border border-slate-200">
                            {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" alt={p.name}/> : <div className="w-full h-full flex items-center justify-center text-slate-300"><ShoppingBasket/></div>}
                            {!p.inStock && <div className="absolute inset-0 bg-red-600/70 backdrop-blur-sm flex flex-col items-center justify-center text-[10px] font-black text-white uppercase"><XCircle className="w-5 h-5 mb-1"/> Rupture</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <h3 className="font-black text-slate-900 truncate uppercase tracking-tighter text-lg leading-tight">{p.name}</h3>
                                <button onClick={() => handleOpenModal(p)} className="p-2 text-slate-400 hover:text-purple-600 transition-colors"><Edit className="w-5 h-5"/></button>
                            </div>
                            <p className="font-black text-purple-600 text-xl">{p.price.toLocaleString()} F</p>
                            <span className="text-[9px] font-black uppercase bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">{availableCategories.find(c => c.id === p.category)?.label || p.category}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                        <div className="flex items-center bg-slate-100 rounded-2xl p-1 shadow-inner">
                            <button onClick={() => updateQuantity(p, -1)} className="p-3 text-slate-600 active:scale-90 transition-transform"><Minus className="w-5 h-5"/></button>
                            <div className="px-3 min-w-[50px] text-center">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Stock</p>
                                <p className="font-black text-lg text-slate-900 leading-none">{p.stockQuantity}</p>
                            </div>
                            <button onClick={() => updateQuantity(p, 1)} className="p-3 text-slate-600 active:scale-90 transition-transform"><Plus className="w-5 h-5"/></button>
                        </div>
                        
                        <button 
                            onClick={() => toggleInStock(p)}
                            className={`flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm ${p.inStock ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-600 text-white shadow-green-100'}`}
                        >
                            {p.inStock ? <><XCircle className="w-4 h-4"/> Signaler Rupture</> : <><Check className="w-4 h-4"/> Mettre en Rayon</>}
                        </button>
                    </div>
                </div>
            ))}
        </div>

        {isModalOpen && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4 backdrop-blur-md">
                <Card className="w-full max-w-sm relative rounded-[3rem] animate-scale-in">
                    <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"><X className="w-5 h-5"/></button>
                    <CardContent className="pt-8">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <h4 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-6">{editingProduct ? 'Modifier' : 'Nouveau Produit'}</h4>
                            <ImageUploader label="Visuel Produit" bucket="products" aspectRatio={1} currentImageUrl={form.imageUrl} onImageUploaded={(url) => setForm({...form, imageUrl: url})}/>
                            <Input label="Désignation" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ex: Manioc frais" className="bg-slate-50 h-14 font-bold text-lg"/>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Prix (FCFA)" type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="bg-slate-50 h-14 font-black"/>
                                <Input label="Stock Initial" type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="bg-slate-50 h-14 font-black"/>
                            </div>
                            <Select label="Catégorie" value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="bg-slate-50 h-14 font-bold">
                                {availableCategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                            </Select>
                            <Button type="submit" isLoading={isSubmitting} className="w-full h-16 bg-slate-900 text-white font-black uppercase rounded-2xl shadow-xl mt-4">Enregistrer</Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        )}
    </div>
  );
};

export default ProductManager;
