
import React, { useState, useMemo } from 'react';
import { Product, Stall, VendorProfile, ProductCategory } from '../../types';
import { Search, Plus, ArrowUpDown, LayoutGrid, List, Edit, EyeOff, Minus, Trash2, Zap, AlertCircle, X } from 'lucide-react';
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
  productCategories?: ProductCategory[]; // NEW
  onAddProduct: (product: Omit<Product, 'id'>) => Promise<any>;
  onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: string) => void;
}

const ProductManager: React.FC<ProductManagerProps> = ({ products, myStall, productCategories = [], onAddProduct, onUpdateProduct }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Use passed categories or fall back to constants
  const availableCategories = productCategories.length > 0 ? productCategories : DEFAULT_CATS;

  // Form State
  const [form, setForm] = useState({ 
      name: '', price: '', category: availableCategories[0].id, quantity: '1', description: '', imageUrl: ''
  });

  const handleOpenModal = (product?: Product) => {
      if (product) {
          setEditingProduct(product);
          setForm({
              name: product.name,
              price: product.price.toString(),
              category: product.category,
              quantity: product.stockQuantity.toString(),
              description: product.description || '',
              imageUrl: product.imageUrl || ''
          });
      } else {
          setEditingProduct(null);
          setForm({ name: '', price: '', category: availableCategories[0].id, quantity: '10', description: '', imageUrl: '' });
      }
      setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!myStall) return toast.error("Réservez d'abord un étal.");
      
      setIsSubmitting(true);
      try {
          const data = {
              stallId: myStall.id,
              name: form.name,
              price: Number(form.price),
              category: form.category as any,
              stockQuantity: Number(form.quantity),
              inStock: Number(form.quantity) > 0,
              description: form.description,
              imageUrl: form.imageUrl,
              unit: 'unité', 
              isVisible: true
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
        <div className="flex gap-3">
            <Button onClick={() => handleOpenModal()} size="lg" className="w-full rounded-xl shadow-lg shadow-purple-200 bg-purple-600 hover:bg-purple-700">
                <Plus className="w-6 h-6"/> Nouveau Produit
            </Button>
        </div>

        {/* Product List */}
        <div className="grid grid-cols-1 gap-3 pb-24">
            {products.filter(p => p.stallId === myStall?.id).map((p) => (
                <Card key={p.id} className="p-3 flex gap-4 items-stretch relative overflow-hidden">
                    <div className="w-24 h-24 bg-gray-50 rounded-xl shrink-0 overflow-hidden relative border border-gray-100">
                        {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" alt={p.name}/> : <div className="w-full h-full bg-gray-200"/>}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                        <div>
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-gray-800 truncate pr-2">{p.name}</h3>
                                <button onClick={() => handleOpenModal(p)} className="p-1.5 text-gray-400 hover:text-blue-600"><Edit className="w-4 h-4"/></button>
                            </div>
                            <p className="font-black text-purple-600">{p.price} F</p>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500 font-bold">Stock: {p.stockQuantity}</span>
                            <Badge className="text-[10px]">{availableCategories.find(c => c.id === p.category)?.label || p.category}</Badge>
                        </div>
                    </div>
                </Card>
            ))}
        </div>

        {/* Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
                <Card className="w-full max-w-sm relative my-auto">
                    <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4"><X className="w-5 h-5 text-gray-400"/></button>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <h4 className="text-xl font-bold text-gray-900 mb-4">{editingProduct ? 'Modifier' : 'Ajouter'}</h4>
                            
                            <ImageUploader 
                                label="Photo du Produit"
                                bucket="products"
                                aspectRatio={4/3}
                                currentImageUrl={form.imageUrl}
                                onImageUploaded={(url) => setForm({...form, imageUrl: url})}
                            />

                            <Input label="Nom" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ex: Manioc" />
                            <div className="flex gap-4">
                                <Input label="Prix" type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
                                <Input label="Quantité" type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} />
                            </div>
                            <Select label="Catégorie" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                                {availableCategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                            </Select>
                            
                            <Button type="submit" isLoading={isSubmitting} className="w-full bg-purple-600 hover:bg-purple-700">Enregistrer</Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        )}
    </div>
  );
};

export default ProductManager;
