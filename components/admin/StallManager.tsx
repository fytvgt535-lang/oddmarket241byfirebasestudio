
import React, { useState, useMemo } from 'react';
import { Search, LayoutGrid, List, MapPin, Trash2, Plus, Database, AlertTriangle, Building2, ChevronLeft, ChevronRight, UserPlus, Zap } from 'lucide-react';
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

const StallManager: React.FC<StallManagerProps> = ({ stalls, markets, categories, users, onCreateStall }) => {
  const [search, setSearch] = useState('');
  const [selectedStallTwin, setSelectedStallTwin] = useState<Stall | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filteredStalls = stalls.filter(s => s.number.toLowerCase().includes(search.toLowerCase()));

  const handleSetupGuide = () => {
      const sql = `
-- COPIER-COLLER DANS L'EDITEUR SQL SUPABASE --

-- 1. Extensions & Auth
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tables Principales
CREATE TABLE IF NOT EXISTS markets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT, city TEXT, neighborhood TEXT, "baseRent" NUMERIC,
  lat NUMERIC, lng NUMERIC, image TEXT, capacity NUMERIC, "hasDeliveryService" BOOLEAN
);

CREATE TABLE IF NOT EXISTS stalls (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "marketId" UUID REFERENCES markets(id), 
  number TEXT, zone TEXT, status TEXT, price NUMERIC, "productType" TEXT,
  "occupantId" UUID, "occupantName" TEXT, "occupantPhone" TEXT,
  "healthStatus" TEXT DEFAULT 'healthy', "complianceScore" NUMERIC DEFAULT 100
);

-- 3. Profils (Link avec Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT, name TEXT, role TEXT, phone TEXT, "photoUrl" TEXT,
  "loyaltyPoints" NUMERIC DEFAULT 0, preferences JSONB, "agentStats" JSONB
);

-- 4. Finance & Commerce
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "marketId" UUID REFERENCES markets(id), "stallId" UUID REFERENCES stalls(id),
  amount NUMERIC, type TEXT, provider TEXT, status TEXT, date BIGINT, reference TEXT,
  "collectedBy" UUID
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "stallId" UUID REFERENCES stalls(id), "customerId" UUID,
  "customerName" TEXT, "customerPhone" TEXT, items JSONB, "totalAmount" NUMERIC,
  "paymentProvider" TEXT, "paymentRef" TEXT, status TEXT, "deliveryMode" TEXT, date BIGINT,
  rating NUMERIC, "reviewComment" TEXT
);

CREATE TABLE IF NOT EXISTS order_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "order_id" UUID REFERENCES orders(id) ON DELETE CASCADE,
  "senderId" UUID, "senderRole" TEXT, text TEXT, timestamp BIGINT, "photoUrl" TEXT
);

CREATE TABLE IF NOT EXISTS sanctions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "stallId" UUID REFERENCES stalls(id), "marketId" UUID REFERENCES markets(id),
  type TEXT, reason TEXT, amount NUMERIC, status TEXT, date BIGINT,
  "issuedBy" UUID, "appealReason" TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  action TEXT, "actorId" UUID, "targetId" TEXT, "createdAt" BIGINT
);

CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "stallId" UUID REFERENCES stalls(id),
  name TEXT, price NUMERIC, category TEXT, "stockQuantity" NUMERIC,
  "inStock" BOOLEAN, description TEXT, "imageUrl" TEXT, unit TEXT, "isVisible" BOOLEAN,
  tags TEXT[]
);

-- 5. Sécurité (RLS) - Permissive pour le prototype
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE stalls ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sanctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read" ON profiles FOR SELECT USING (true);
CREATE POLICY "Self Update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Public Read Markets" ON markets FOR SELECT USING (true);
CREATE POLICY "Admin All Markets" ON markets FOR ALL USING (true);
CREATE POLICY "Public Read Stalls" ON stalls FOR SELECT USING (true);
CREATE POLICY "Vendor Update Stall" ON stalls FOR UPDATE USING (true);
CREATE POLICY "Public Tx" ON transactions FOR ALL USING (true);
CREATE POLICY "Public Orders" ON orders FOR ALL USING (true);
CREATE POLICY "Public Messages" ON order_messages FOR ALL USING (true);
CREATE POLICY "Public Sanctions" ON sanctions FOR ALL USING (true);
CREATE POLICY "Public Audit" ON audit_logs FOR ALL USING (true);
CREATE POLICY "Public Products" ON products FOR ALL USING (true);
      `;
      console.log(sql);
      alert("Le script SQL COMPLET a été généré dans la Console F12. Copiez-le dans Supabase !");
  };

  return (
    <Card className="animate-fade-in border-none shadow-none">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-orange-50/30">
            <div>
                <h3 className="text-xl font-black text-orange-950 flex items-center gap-2 uppercase tracking-tighter">Parc Immobilier</h3>
                <p className="text-xs font-bold text-orange-700/60 uppercase">{stalls.length} étals détectés</p>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={handleSetupGuide} className="border-orange-200 text-orange-700 flex gap-2">
                    <Database className="w-4 h-4"/> Configurer SQL
                </Button>
                <Button onClick={() => setIsCreateOpen(true)} className="bg-orange-600 border-none shadow-orange-200">Nouveau</Button>
            </div>
        </div>

        <div className="p-6">
            <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} leftIcon={Search} className="mb-6"/>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredStalls.map(stall => (
                    <div key={stall.id} className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between mb-3">
                            <span className="text-2xl font-black">{stall.number}</span>
                            <Badge variant={stall.status === 'occupied' ? 'success' : 'info'}>{stall.status}</Badge>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stall.productType}</p>
                        <p className="text-sm font-black text-slate-700 mt-2">{stall.price.toLocaleString()} F</p>
                        <Button size="sm" variant="ghost" className="w-full mt-4 bg-slate-50" onClick={() => setSelectedStallTwin(stall)}>Ouvrir Twin</Button>
                    </div>
                ))}
            </div>
        </div>

        {selectedStallTwin && <StallDigitalTwin stall={selectedStallTwin} transactions={[]} onClose={() => setSelectedStallTwin(null)} />}
    </Card>
  );
};

export default StallManager;
