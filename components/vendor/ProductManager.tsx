
import React, { useState, useMemo, useRef } from 'react';
import { Product, Stall, VendorProfile } from '../../types';
import { Search, Plus, ArrowUpDown, LayoutGrid, List, Minus, Eye, EyeOff, Edit, ImageIcon, Box, Package, TicketPercent, Loader2, X } from 'lucide-react';
import { uploadFile } from '../../services/supabaseService';
import ImageCropper from '../ImageCropper';
import toast from 'react-hot-toast';
import { Button } from '../ui/Button';
import { Input, Select, TextArea } from '../ui/Input';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface ProductManagerProps {
  products: Product[];
  myStall?: Stall;
  profile: VendorProfile;
  onAddProduct: (product: Omit<Product, 'id'>) => Promise<any>;
  onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: string) => void;
}

const ProductManager: React.FC<ProductManagerProps> = ({ products, myStall, onAddProduct, onUpdateProduct }) => {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'name' | 'price_high' | 'price_low' | 'stock_low'>('stock_low');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Modal & Wizard State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Image State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Form State
  const [form, setForm] = useState({ 
      name: '', price: '', costPrice: '', promoPrice: '', isPromo: false, isVisible: true, 
      unit: 'pièce', category: 'vivres', quantity: '1', description: '', origin: '', 
      tagsString: '', imageUrl: '', freshnessLevel: 100, qualityGrade: 'A' as 'A'|'B'|'C',
      wholesalePrice: '', wholesaleQty: ''
  });

  const myProducts = useMemo(() => products.filter(p => p.stallId === myStall?.id), [products, myStall]);
  const categories = useMemo(() => ['all', ...Array.from(new Set(myProducts.map(p => p.category)))], [myProducts]);
  
  const filteredProducts = useMemo(() => {
      let res = myProducts;
      if (filter !== 'all') res = res.filter(p => p.category === filter);
      if (search) res = res.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
      return res.sort((a, b) => {
          if (sort === 'price_high') return b.price - a.price;
          if (sort === 'price_low') return a.price - b.price;
          if (sort === 'stock_low') return a.stockQuantity - b.stockQuantity;
          return a.name.localeCompare(b.name);
      });
  }, [myProducts, filter, search, sort]);

  const stockValue = useMemo(() => myProducts.reduce((acc, p) => acc + (p.price * p.stockQuantity), 0), [myProducts]);
  const lowStockCount = useMemo(() => myProducts.filter(p => p.stockQuantity < 5).length, [myProducts]);

  const handleOpenModal = (product?: Product) => {
      setWizardStep(1);
      if (product) {
          setEditingProduct(product);
          setForm({
              name: product.name,
              price: product.price.toString(),
              costPrice: product.costPrice?.toString() || '',
              promoPrice: product.promoPrice?.toString() || '',
              isPromo: product.isPromo || false,
              isVisible: product.isVisible ?? true,
              unit: product.unit,
              category: product.category,
              quantity: product.stockQuantity.toString(),
              description: product.description || '',
              origin: product.origin || '',
              tagsString: product.tags?.join(', ') || '',
              imageUrl: product.imageUrl || '',
              freshnessLevel: product.freshnessLevel || 100,
              qualityGrade: product.qualityGrade || 'A',
              wholesalePrice: product.wholesalePrices?.[0]?.price.toString() || '',
              wholesaleQty: product.wholesalePrices?.[0]?.minQuantity.toString() || ''
          });
      } else {
          setEditingProduct(null);
          setForm({ name: '', price: '', costPrice: '', promoPrice: '', isPromo: false, isVisible: true, unit: 'pièce', category: 'vivres', quantity: '10', description: '', origin: '', tagsString: '', imageUrl: '', freshnessLevel: 100, qualityGrade: 'A', wholesalePrice: '', wholesaleQty: '' });
      }
      setIsModalOpen(true);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const reader = new FileReader();
          reader.onload = () => { setCropImage(reader.result as string); setIsCropping(true); };
          reader.readAsDataURL(e.target.files[0]);
          e.target.value = '';
      }
  };

  const handleCropComplete = async (blob: Blob) => {
      setIsUploading(true);
      try {
          // FORCE WEBP FILE
          const file = new File([blob], `prod-${Date.now()}.webp`, { type: 'image/webp' });
          const url = await uploadFile(file, 'products');
          setForm(prev => ({ ...prev, imageUrl: url }));
          setIsCropping(false);
          setCropImage(null);
      } catch (e: any) {
          toast.error("Erreur upload: " + e.message);
      } finally {
          setIsUploading(false);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!myStall) {
          toast.error("Veuillez d'abord réserver un étal.");
          return;
      }
      setIsSubmitting(true);
      try {
          const data = {
              stallId: myStall.id,
              name: form.name,
              price: Number(form.price),
              costPrice: Number(form.costPrice) || undefined,
              promoPrice: form.isPromo ? Number(form.promoPrice) : undefined,
              isPromo: form.isPromo,
              isVisible: form.isVisible,
              unit: form.unit,
              category: form.category as any,
              stockQuantity: Number(form.quantity),
              inStock: Number(form.quantity) > 0,
              description: form.description,
              imageUrl: form.imageUrl || undefined,
              tags: form.tagsString.split(',').map(t => t.trim()).filter(Boolean),
              freshnessLevel: form.freshnessLevel,
              qualityGrade: form.qualityGrade,
              wholesalePrices: (form.wholesaleQty && form.wholesalePrice) ? [{ minQuantity: Number(form.wholesaleQty), price: Number(form.wholesalePrice) }] : undefined
          };

          if (editingProduct) {
              await onUpdateProduct(editingProduct.id, data);
              toast.success("Produit mis à jour");
          } else {
              await onAddProduct(data);
              toast.success("Produit ajouté");
          }
          setIsModalOpen(false);
      } catch (e: any) {
          toast.error(e.message);
      } finally {
          setIsSubmitting(false);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
        {isCropping && cropImage && <ImageCropper imageSrc={cropImage} aspect={4/3} onCancel={() => { setIsCropping(false); setCropImage(null); }} onComplete={handleCropComplete} isLoading={isUploading}/>}

        {/* Stats & Actions */}
        <div className="grid grid-cols-2 gap-3">
            <Card className="p-4"><p className="text-xs font-bold text-gray-400 uppercase">Valeur Stock</p><h3 className="text-xl font-black text-gray-800">{stockValue.toLocaleString()} <span className="text-xs font-normal">F</span></h3></Card>
            <Card className="p-4"><p className="text-xs font-bold text-gray-400 uppercase">En Rupture</p><h3 className={`text-xl font-black ${lowStockCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{lowStockCount}</h3></Card>
        </div>

        <div className="flex gap-3">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400"/>
                <input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white text-gray-900 rounded-2xl border border-gray-200 shadow-sm outline-none focus:ring-2 focus:ring-purple-500"/>
            </div>
            <Button onClick={() => handleOpenModal()} size="lg" className="rounded-2xl px-4"><Plus className="w-6 h-6"/></Button>
        </div>

        <div className="flex justify-between items-center text-xs font-bold text-gray-400 px-2">
            <span>{filteredProducts.length} produits</span>
            <div className="flex items-center gap-4">
                <button onClick={() => setSort(prev => prev === 'stock_low' ? 'price_high' : 'stock_low')} className="flex items-center gap-1 hover:text-purple-600"><ArrowUpDown className="w-3 h-3"/> {sort === 'stock_low' ? 'Urgence' : 'Prix'}</button>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-white shadow text-gray-800' : 'text-gray-400'}`}><LayoutGrid className="w-4 h-4"/></button>
                    <button onClick={() => setViewMode('list')} className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-white shadow text-gray-800' : 'text-gray-400'}`}><List className="w-4 h-4"/></button>
                </div>
            </div>
        </div>

        {/* Product List */}
        <div className="grid grid-cols-1 gap-3 pb-24">
            {filteredProducts.map((p) => {
                const margin = (p.price > 0 && p.costPrice) ? Math.round(((p.price - p.costPrice) / p.price) * 100) : null;
                return (
                    <Card key={p.id} className={`p-3 flex gap-4 items-stretch relative overflow-hidden ${!p.isVisible ? 'opacity-70 bg-gray-50' : ''}`}>
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${p.stockQuantity === 0 ? 'bg-red-500' : p.stockQuantity < 5 ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                        <div className="w-24 h-24 bg-gray-50 rounded-xl shrink-0 overflow-hidden relative">
                            {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" alt={p.name}/> : <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon className="w-8 h-8"/></div>}
                            {!p.isVisible && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><EyeOff className="w-6 h-6 text-white"/></div>}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                            <div>
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-gray-800 truncate pr-2">{p.name}</h3>
                                    <div className="flex gap-1">
                                        <button onClick={() => onUpdateProduct(p.id, { isVisible: !p.isVisible })} className="text-gray-400 hover:text-gray-600">{p.isVisible ? <Eye className="w-4 h-4"/> : <EyeOff className="w-4 h-4"/>}</button>
                                        <button onClick={() => handleOpenModal(p)} className="text-gray-400 hover:text-blue-600"><Edit className="w-4 h-4"/></button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="font-black text-gray-800">{p.isPromo ? p.promoPrice : p.price} F</span>
                                    {margin !== null && <Badge variant={margin > 0 ? 'success' : 'danger'}>{margin > 0 ? '+' : ''}{margin}%</Badge>}
                                </div>
                            </div>
                            <div className="flex items-end justify-between mt-2">
                                <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1 border border-gray-100">
                                    <button onClick={() => onUpdateProduct(p.id, { stockQuantity: Math.max(0, p.stockQuantity - 1) })} className="p-1 hover:bg-gray-200 rounded text-gray-500"><Minus className="w-4 h-4"/></button>
                                    <span className="font-bold w-6 text-center text-gray-800">{p.stockQuantity}</span>
                                    <button onClick={() => onUpdateProduct(p.id, { stockQuantity: p.stockQuantity + 1 })} className="p-1 hover:bg-gray-200 rounded text-gray-500"><Plus className="w-4 h-4"/></button>
                                </div>
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>

        {/* Modal Wizard */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
                <Card className="w-full max-w-sm relative my-auto">
                    <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full z-10 hover:bg-gray-200"><X className="w-5 h-5"/></button>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {wizardStep === 1 && (
                                <>
                                    <div className="text-center">
                                        <h4 className="text-xl font-bold text-gray-900">Qu'est-ce que vous vendez ?</h4>
                                        <p className="text-sm text-gray-500">Nom et Catégorie</p>
                                    </div>
                                    <Input autoFocus value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ex: Manioc de Kango" leftIcon={Box} />
                                    <div className="grid grid-cols-2 gap-3">
                                        {['vivres', 'textile', 'electronique', 'divers'].map(cat => (
                                            <button key={cat} type="button" onClick={() => setForm({...form, category: cat})} className={`p-4 rounded-xl border-2 font-bold capitalize flex flex-col items-center gap-2 ${form.category === cat ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-500'}`}>
                                                {cat === 'vivres' && <Package className="w-6 h-6"/>}
                                                {cat === 'textile' && <TicketPercent className="w-6 h-6"/>}
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                            
                            {wizardStep === 2 && (
                                <>
                                    <div className="text-center"><h4 className="text-xl font-bold text-gray-900">Prix & Rentabilité</h4></div>
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <Input label="Prix Vente" type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} placeholder="0" className="text-center text-xl font-black"/>
                                        </div>
                                        <div className="w-1/3">
                                            <Select label="Unité" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
                                                <option value="pièce">Pièce</option><option value="kg">Kg</option><option value="tas">Tas</option><option value="sac">Sac</option>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                        <Input label="Prix d'Achat (Optionnel)" type="number" value={form.costPrice} onChange={e => setForm({...form, costPrice: e.target.value})} className="text-center font-bold"/>
                                    </div>
                                </>
                            )}

                            {wizardStep === 3 && (
                                <>
                                    <div className="text-center"><h4 className="text-xl font-bold text-gray-900">Stock & Image</h4></div>
                                    <div className="flex flex-col items-center">
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-2">Quantité</label>
                                        <div className="flex items-center gap-4">
                                            <button type="button" onClick={() => setForm({...form, quantity: Math.max(0, Number(form.quantity) - 1).toString()})} className="w-12 h-12 rounded-full bg-gray-100 text-gray-600 text-2xl font-bold">-</button>
                                            <input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="w-20 text-center text-3xl font-black bg-transparent outline-none text-gray-900"/>
                                            <button type="button" onClick={() => setForm({...form, quantity: (Number(form.quantity) + 1).toString()})} className="w-12 h-12 rounded-full bg-green-100 text-green-600 text-2xl font-bold">+</button>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full bg-gray-50 p-4 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 gap-2 cursor-pointer hover:bg-gray-100 h-32 relative overflow-hidden transition-colors">
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect}/>
                                        {form.imageUrl ? <img src={form.imageUrl} className="w-full h-full object-cover rounded-xl" alt="Preview"/> : isUploading ? <Loader2 className="w-6 h-6 animate-spin text-green-600"/> : <><ImageIcon className="w-6 h-6"/><span className="text-xs font-bold">Ajouter Photo</span></>}
                                    </button>
                                </>
                            )}

                            <div className="flex gap-3">
                                {wizardStep > 1 && <Button type="button" variant="ghost" onClick={() => setWizardStep(prev => prev - 1)} className="flex-1">Retour</Button>}
                                {wizardStep < 3 ? (
                                    <Button type="button" variant="secondary" onClick={() => setWizardStep(prev => prev + 1)} className="flex-1">Suivant</Button>
                                ) : (
                                    <Button type="submit" variant="primary" className="flex-1" isLoading={isSubmitting}>Terminer</Button>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        )}
    </div>
  );
};

export default ProductManager;
