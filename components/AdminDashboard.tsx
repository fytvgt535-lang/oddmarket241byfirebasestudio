
import React, { useState, useEffect } from 'react';
import { Activity, Building2, Users, LayoutGrid, DollarSign, Shield, Radio, Zap, Gavel, Search, Bell, Map as MapIcon, MessageSquare, Target } from 'lucide-react';
import { Stall, HygieneReport, Transaction, Market, Agent, Expense, PaymentPlan, Receipt, AppNotification, Sanction, User, ClientOrder, Mission, ProductCategory } from '../types';
import MarketManager from './admin/MarketManager';
import StallManager from './admin/StallManager';
import FinanceManager from './admin/FinanceManager';
import UserManager from './admin/UserManager';
import AuditLogViewer from './admin/AuditLogViewer';
import AgentManager from './admin/AgentManager';
import SettingsManager from './admin/SettingsManager';
import LegalCenter from './admin/LegalCenter';
import ChaosCenter from './admin/ChaosCenter';
import WarRoom from './admin/WarRoom'; // NEW
import { formatCurrency } from '../utils/coreUtils';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface AdminDashboardProps {
  markets: Market[];
  stalls: Stall[];
  reports: HygieneReport[];
  transactions: Transaction[];
  receipts: Receipt[];
  agents: Agent[];
  expenses: Expense[];
  paymentPlans: PaymentPlan[];
  notifications: AppNotification[];
  sanctions?: Sanction[];
  users?: User[];
  orders?: ClientOrder[];
  missions?: Mission[];
  productCategories?: ProductCategory[];
  loadingStates?: { finance: boolean; users: boolean; products: boolean; orders: boolean; missions?: boolean };
  onLoadFinance?: () => void;
  onLoadUsers?: () => void;
  onLoadMissions?: () => void;
  onApprovePlan: (planId: string) => void;
  onAddMarket: (market: Omit<Market, 'id'>) => void;
  onUpdateMarket: (marketId: string, updates: Partial<Market>) => void;
  onDeleteMarket: (marketId: string) => void;
  onUpdateUserStatus?: (userId: string, updates: Partial<User>) => void;
  onCreateStall?: (stall: Omit<Stall, 'id'>) => void;
  onDeleteStall?: (stallId: string) => void;
  onAddExpense?: (expense: Omit<Expense, 'id'>) => void;
  onDeleteExpense?: (expenseId: string) => void;
  onBulkCreateStalls?: (stalls: Omit<Stall, 'id'>[]) => void;
  onAssignMission?: (mission: any) => void;
  onValidateCashDrop?: (agentId: string, amount: number) => void;
  onAddCategory?: (cat: Omit<ProductCategory, 'id'>) => void;
  onDeleteCategory?: (id: string) => void;
  currentLanguage: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = (props) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'finance' | 'space' | 'markets' | 'users' | 'agents' | 'audit' | 'chaos' | 'legal'>('overview');
  const [globalSearch, setGlobalSearch] = useState('');

  useEffect(() => {
      if (activeTab === 'finance' || activeTab === 'overview') props.onLoadFinance?.();
      if (['users', 'audit', 'agents', 'space'].includes(activeTab)) props.onLoadUsers?.();
      if (activeTab === 'agents') props.onLoadMissions?.();
  }, [activeTab]);

  const stats = [
      { label: "Collecte Globale", val: "1.2M F", icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
      { label: "Agents Actifs", val: props.users?.filter(u => u.agentStats?.isShiftActive).length || 0, icon: Radio, color: "text-blue-600", bg: "bg-blue-50" },
      { label: "Occupation", val: "84%", icon: LayoutGrid, color: "text-orange-600", bg: "bg-orange-50" },
      { label: "Alertes Critiques", val: props.reports.length, icon: Shield, color: "text-red-600", bg: "bg-red-50" }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* HEADER COMMAND CENTER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-900 rounded-2xl text-white shadow-xl rotate-3">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">Command Center</h2>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Régie Municipale • Libreville</p>
          </div>
        </div>

        <div className="flex-1 max-w-md w-full relative">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-300"/>
            <input 
                placeholder="Scanner le réseau MarchéConnect..." 
                value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold text-sm text-slate-800 placeholder:text-slate-300"
            />
        </div>

        <div className="flex items-center gap-2">
            <button onClick={() => setActiveTab('chaos')} className={`p-3.5 rounded-2xl transition-all ${activeTab === 'chaos' ? 'bg-red-600 text-white shadow-lg shadow-red-200 animate-pulse' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                <Zap className="w-5 h-5" />
            </button>
            <button className="relative p-3.5 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors">
                <Bell className="w-5 h-5 text-slate-600" />
                <span className="absolute top-3.5 right-3.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
        </div>
      </div>

      {/* KPI BAR */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
              <Card key={i} className="p-5 flex items-center gap-4 hover:shadow-xl transition-all hover:-translate-y-1 bg-white border-gray-100">
                  <div className={`p-3 rounded-2xl ${s.bg} ${s.color}`}><s.icon className="w-6 h-6"/></div>
                  <div>
                      <p className="text-[9px] uppercase font-black text-gray-400 tracking-widest mb-1">{s.label}</p>
                      <h3 className="text-2xl font-black text-slate-900">{s.val}</h3>
                  </div>
              </Card>
          ))}
      </div>

      {/* NAVIGATION PRINCIPALE */}
      <div className="overflow-x-auto no-scrollbar py-2">
        <nav className="flex gap-4 min-w-max">
          {[
            { id: 'overview', label: 'War Room', icon: Target },
            { id: 'finance', label: 'Trésorerie', icon: DollarSign },
            { id: 'agents', label: 'Terrain', icon: Radio },
            { id: 'users', label: 'Citoyens', icon: Users },
            { id: 'space', label: 'Marchés', icon: LayoutGrid },
            { id: 'audit', label: 'Audit Trail', icon: Shield },
            { id: 'legal', label: 'Légal', icon: Gavel }
          ].map(tab => (
            <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)} 
                className={`py-3 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${
                    activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 hover:text-slate-600 border border-gray-100'
                }`}
            >
                <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* CONTENU DYNAMIQUE */}
      <main className="min-h-[500px]">
          {activeTab === 'overview' && (
              <div className="space-y-8 animate-slide-up">
                  <WarRoom 
                    markets={props.markets} 
                    stalls={props.stalls} 
                    transactions={props.transactions} 
                  />
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <Card className="lg:col-span-2 p-6 border-blue-100 bg-gradient-to-br from-white to-blue-50/30">
                          <div className="flex justify-between items-center mb-6">
                              <h4 className="font-black text-slate-800 flex items-center gap-2 tracking-tight"><MapIcon className="w-5 h-5 text-blue-500"/> Surveillance Terrain</h4>
                              <Button size="sm" variant="ghost" onClick={() => setActiveTab('agents')} className="text-[10px] font-black uppercase text-blue-600">Agrandir radar &rarr;</Button>
                          </div>
                          <div className="h-96 bg-slate-900 rounded-3xl border-4 border-slate-800 flex flex-col items-center justify-center text-slate-500 overflow-hidden relative shadow-2xl">
                              <MapIcon className="w-24 h-24 mb-4 opacity-5 animate-pulse"/>
                              <p className="font-black text-sm uppercase tracking-widest">Initialisation Vectorielle...</p>
                              <div className="absolute inset-0 bg-blue-500/5 backdrop-blur-[1px]"></div>
                              <Button variant="primary" className="relative z-10 bg-blue-600 border-none px-8" onClick={() => setActiveTab('agents')}>Activer le Radar Live</Button>
                          </div>
                      </Card>

                      <div className="space-y-6">
                          <Card className="p-6 border-orange-100 shadow-orange-100/50">
                              <h4 className="font-black text-slate-800 mb-4 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-orange-500"/> Bulletin Municipal</h4>
                              <p className="text-xs text-slate-500 mb-4 font-medium italic">Diffusez des alertes ou des annonces à tous les terminaux commerçants.</p>
                              <textarea className="w-full h-32 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none resize-none mb-3 font-medium transition-all" placeholder="Message broadcast..."></textarea>
                              <Button className="w-full bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-200 h-12 font-black">ENVOYER L'ALERTE</Button>
                          </Card>
                          
                          <Card className="p-6 border-slate-900 bg-slate-900 text-white shadow-2xl">
                              <h4 className="font-black text-slate-200 mb-4 uppercase tracking-widest text-[10px]">État de l'Infrastructure</h4>
                              <div className="space-y-4">
                                  <div className="flex justify-between items-center text-xs">
                                      <span className="text-slate-400 font-bold">Base Supabase</span> 
                                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Opérationnel</Badge>
                                  </div>
                                  <div className="flex justify-between items-center text-xs">
                                      <span className="text-slate-400 font-bold">Nœuds Offline</span> 
                                      <span className="font-black text-blue-400">14 Actifs</span>
                                  </div>
                                  <div className="flex justify-between items-center text-xs">
                                      <span className="text-slate-400 font-bold">Intégrité Blockchain</span> 
                                      <span className="font-black text-green-400">Certifiée</span>
                                  </div>
                              </div>
                          </Card>
                      </div>
                  </div>
              </div>
          )}
          
          {activeTab === 'finance' && <FinanceManager {...props} onAddExpense={props.onAddExpense!} onDeleteExpense={props.onDeleteExpense!} onApprovePlan={props.onApprovePlan} />}
          {activeTab === 'agents' && <AgentManager {...props} users={props.users || []} markets={props.markets} stalls={props.stalls} missions={props.missions || []} onAssignMission={props.onAssignMission!} onValidateCashDrop={props.onValidateCashDrop!} />}
          {activeTab === 'users' && <UserManager {...props} users={props.users || []} onUpdateUserStatus={props.onUpdateUserStatus!} />}
          {activeTab === 'space' && <StallManager {...props} users={props.users || []} categories={props.productCategories || []} onCreateStall={props.onCreateStall!} onBulkCreateStalls={props.onBulkCreateStalls!} onDeleteStall={props.onDeleteStall!} />}
          {activeTab === 'audit' && <AuditLogViewer users={props.users || []} currentLanguage={props.currentLanguage} />}
          {activeTab === 'chaos' && <ChaosCenter />}
          {activeTab === 'legal' && <LegalCenter />}
      </main>
    </div>
  );
};

export default AdminDashboard;
