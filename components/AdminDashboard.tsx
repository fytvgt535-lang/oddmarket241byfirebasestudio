
import React, { useState, useMemo, useEffect } from 'react';
import { Activity, Building2, Bell, Users, LayoutGrid, DollarSign, Settings, X, ShoppingBag, Shield, Loader2, Globe, CreditCard, Radio, Zap, Server, AlertTriangle, TrendingUp, Map, CheckCircle, Sliders } from 'lucide-react';
import { Stall, HygieneReport, Transaction, Market, Agent, Expense, PaymentPlan, Receipt, AppNotification, Sanction, User, ClientOrder, Mission, ProductCategory } from '../types';
import MarketManager from './admin/MarketManager';
import StallManager from './admin/StallManager';
import FinanceManager from './admin/FinanceManager';
import UserManager from './admin/UserManager';
import AuditLogViewer from './admin/AuditLogViewer';
import AgentManager from './admin/AgentManager';
import SettingsManager from './admin/SettingsManager'; // NEW COMPONENT
import { Area, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { t } from '../services/translations';
import { simulateGlobalLocation, formatCurrency } from '../utils/coreUtils';
import { Skeleton } from './ui/Skeleton';

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
  
  // Aggregated Stats from RPC
  financialStats?: {
      totalRevenue: number;
      todayRevenue: number;
      occupancyRate: number;
      collectionRate: number;
  };

  // Dynamic Data
  productCategories?: ProductCategory[];

  loadingStates?: { finance: boolean; users: boolean; products: boolean; orders: boolean; missions?: boolean };
  onLoadFinance?: () => void;
  onLoadUsers?: () => void;
  onLoadMissions?: () => void;
  
  onSendSms: (marketId: string, audience: any, message: string, tone: any) => void;
  onApprovePlan: (planId: string) => void;
  onAddMarket: (market: Omit<Market, 'id'>) => void;
  onUpdateMarket: (marketId: string, updates: Partial<Market>) => void;
  onDeleteMarket: (marketId: string) => void;
  onResolveAppeal?: (sanctionId: string, decision: 'accepted' | 'rejected') => void;
  onUpdateUserStatus?: (userId: string, updates: Partial<User>) => void;
  onCreateStall?: (stall: Omit<Stall, 'id'>) => void;
  onDeleteStall?: (stallId: string) => void;
  onAddExpense?: (expense: Omit<Expense, 'id'>) => void;
  onDeleteExpense?: (expenseId: string) => void;
  onBulkCreateStalls?: (stalls: Omit<Stall, 'id'>[]) => void;
  
  // Agent Actions
  onAssignMission?: (mission: any) => void;
  onValidateCashDrop?: (agentId: string, amount: number) => void;
  
  // Settings Actions
  onAddCategory?: (cat: Omit<ProductCategory, 'id'>) => void;
  onDeleteCategory?: (id: string) => void;

  // New: Current Language
  currentLanguage: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
    markets = [], stalls = [], reports = [], transactions = [], expenses = [], notifications = [], users = [], orders = [], sanctions = [], agents = [], missions = [], paymentPlans = [],
    financialStats, productCategories = [],
    loadingStates, onLoadFinance, onLoadUsers, onLoadMissions,
    onAddMarket, onUpdateMarket, onDeleteMarket, onUpdateUserStatus, onCreateStall, onDeleteStall, onAddExpense, onDeleteExpense, onBulkCreateStalls, onApprovePlan,
    onAssignMission, onValidateCashDrop,
    onAddCategory, onDeleteCategory,
    currentLanguage
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'finance' | 'space' | 'markets' | 'users' | 'agents' | 'audit' | 'settings'>('overview');
  const [selectedMarketId, setSelectedMarketId] = useState<string>('all');
  const [showNotifications, setShowNotifications] = useState(false);
  const [marketViewMode, setMarketViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
      // Trigger lazy loads based on tab
      if (activeTab === 'finance' || activeTab === 'overview') onLoadFinance && onLoadFinance();
      if (activeTab === 'users' || activeTab === 'audit' || activeTab === 'agents' || activeTab === 'space') onLoadUsers && onLoadUsers();
      if (activeTab === 'agents') onLoadMissions && onLoadMissions();
  }, [activeTab]); 

  // Stats Logic: Prefer RPC stats if available, otherwise fallback to local calc (legacy)
  const stats = useMemo(() => {
      if (financialStats) {
          return {
              totalRevenue: financialStats.totalRevenue,
              todayRevenue: financialStats.todayRevenue,
              collectionRate: financialStats.collectionRate,
              occupancyRate: financialStats.occupancyRate
          };
      }
      
      // Fallback logic (Only accurate if all tx are loaded, which is not true anymore)
      const safeTransactions = Array.isArray(transactions) ? transactions : [];
      const totRev = safeTransactions.reduce((acc, curr) => acc + curr.amount, 0);
      return { totalRevenue: totRev, todayRevenue: 0, collectionRate: 0, occupancyRate: 0 };
  }, [financialStats, transactions]);

  const unreadNotifs = notifications.filter(n => !n.read).length;
  const isLoadingFinance = loadingStates?.finance;

  // Generate enriched activity feed with geolocation
  const activityFeed = useMemo(() => {
      const safeTransactions = Array.isArray(transactions) ? transactions : [];
      const safeOrders = Array.isArray(orders) ? orders : [];
      return [
          ...safeTransactions.map(t => ({ ...t, kind: 'transaction' as const, location: simulateGlobalLocation() })),
          ...safeOrders.map(o => ({ ...o, kind: 'order' as const, amount: o.totalAmount, location: simulateGlobalLocation() }))
      ].sort((a, b) => b.date - a.date).slice(0, 15); 
  }, [transactions, orders]);

  return (
    <div className="space-y-6 relative">
      {/* Notifications Overlay */}
      {showNotifications && (
         <div className="absolute top-16 right-4 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-fade-in">
             <div className="bg-gray-50 p-3 border-b border-gray-100 flex justify-between items-center">
                 <h4 className="font-bold text-gray-800">{t(currentLanguage, 'hygiene_alerts')}</h4>
                 <button onClick={() => setShowNotifications(false)}><X className="w-4 h-4 text-gray-400"/></button>
             </div>
             <div className="max-h-64 overflow-y-auto">
                 {notifications.length === 0 ? <p className="text-center p-4 text-gray-400 text-sm">Aucune nouvelle alerte.</p> : notifications.map(n => (
                     <div key={n.id} className="p-3 border-b border-gray-100 hover:bg-gray-50">
                         <p className="font-bold text-sm text-gray-800">{n.title}</p>
                         <p className="text-xs text-gray-500">{n.message}</p>
                     </div>
                 ))}
             </div>
         </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Building2 className="text-gray-600" /> {t(currentLanguage, 'login_title')}</h2>
          <p className="text-sm text-gray-500">Mairie de Libreville • Smart Governance</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex bg-gray-100 p-1 rounded-lg flex-1 md:flex-none overflow-x-auto">
                <button onClick={() => setSelectedMarketId('all')} className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${selectedMarketId === 'all' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Ville Globale</button>
                {markets.map(m => (
                    <button key={m.id} onClick={() => setSelectedMarketId(m.id)} className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${selectedMarketId === m.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>{m.name}</button>
                ))}
            </div>
            <button onClick={() => setShowNotifications(!showNotifications)} className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 relative">
                <Bell className="w-5 h-5 text-gray-600"/>
                {unreadNotifs > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
            </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="-mb-px flex gap-6 min-w-max">
          <button onClick={() => setActiveTab('overview')} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'overview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}><Activity className="w-4 h-4" /> {t(currentLanguage, 'tab_overview')}</button>
          
          <button onClick={() => setActiveTab('agents')} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'agents' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>
              <Radio className="w-4 h-4" /> {t(currentLanguage, 'tab_agents')}
          </button>

          <button onClick={() => setActiveTab('users')} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'users' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500'}`}>
              <Users className="w-4 h-4" /> {t(currentLanguage, 'tab_users')}
          </button>
          <button onClick={() => setActiveTab('space')} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'space' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500'}`}><LayoutGrid className="w-4 h-4" /> {t(currentLanguage, 'tab_space')}</button>
          <button onClick={() => setActiveTab('finance')} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'finance' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500'}`}>
              <DollarSign className="w-4 h-4" /> {t(currentLanguage, 'tab_finance')}
          </button>
          <button onClick={() => setActiveTab('markets')} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'markets' ? 'border-slate-800 text-slate-900' : 'border-transparent text-gray-500'}`}><Settings className="w-4 h-4" /> {t(currentLanguage, 'tab_markets')}</button>
          <button onClick={() => setActiveTab('audit')} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'audit' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500'}`}><Shield className="w-4 h-4" /> {t(currentLanguage, 'tab_audit')}</button>
          <button onClick={() => setActiveTab('settings')} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'settings' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500'}`}><Sliders className="w-4 h-4" /> Paramètres</button>
        </nav>
      </div>

      {/* CONTENT - CONTROL TOWER */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
            {/* SYSTEM STATUS BAR */}
            <div className="flex items-center justify-between bg-slate-900 text-slate-300 p-2 rounded-lg text-xs font-mono shadow-sm overflow-x-auto">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-2 text-green-400 font-bold"><Server className="w-3 h-3"/> {t(currentLanguage, 'ct_system_status')}: {t(currentLanguage, 'ct_operational')}</span>
                    <span className="flex items-center gap-2"><Zap className="w-3 h-3 text-yellow-400"/> Ping: 24ms</span>
                    <span className="flex items-center gap-2"><Globe className="w-3 h-3 text-blue-400"/> {t(currentLanguage, 'ct_sync_queue')}: 0</span>
                </div>
                <div className="flex items-center gap-4">
                    <span>Build: v2.4.2 (Smart Sync)</span>
                    <span className="flex items-center gap-2 text-white font-bold"><Users className="w-3 h-3"/> {t(currentLanguage, 'active_users')}: {loadingStates?.users ? '...' : users?.length || 0}</span>
                </div>
            </div>

            {/* MAIN KPI GRID - USING RPC STATS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase mb-1">{t(currentLanguage, 'ct_revenue_today')}</p>
                            {isLoadingFinance ? <Skeleton width={120} height={32} className="mb-1"/> : <h3 className="text-2xl font-black text-gray-800">{formatCurrency(stats.todayRevenue)}</h3>}
                        </div>
                        <div className="p-2 bg-green-100 text-green-600 rounded-lg"><TrendingUp className="w-5 h-5"/></div>
                    </div>
                    {isLoadingFinance ? <Skeleton width="100%" height={4} className="mt-4"/> : (
                        <div className="mt-4 w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                            <div className="bg-green-500 h-full" style={{ width: '65%' }}></div>
                        </div>
                    )}
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase mb-1">{t(currentLanguage, 'recovery_rate')}</p>
                            {isLoadingFinance ? <Skeleton width={80} height={32} className="mb-1"/> : <h3 className={`text-2xl font-black ${stats.collectionRate < 70 ? 'text-red-500' : 'text-blue-600'}`}>{stats.collectionRate}%</h3>}
                        </div>
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><DollarSign className="w-5 h-5"/></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Target mensuel calculé</p>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase mb-1">{t(currentLanguage, 'ct_occupancy_avg')}</p>
                            <h3 className="text-2xl font-black text-gray-800">{stats.occupancyRate}%</h3>
                        </div>
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><LayoutGrid className="w-5 h-5"/></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{t(currentLanguage, 'occupied')}</p>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase mb-1">{t(currentLanguage, 'ct_security_alert')}</p>
                            <h3 className="text-2xl font-black text-red-500">{reports.filter(r => r.status === 'pending').length}</h3>
                        </div>
                        <div className="p-2 bg-red-100 text-red-600 rounded-lg"><AlertTriangle className="w-5 h-5"/></div>
                    </div>
                    <p className="text-xs text-red-400 mt-2 font-bold">Action requise immédiate</p>
                </div>
            </div>
            
            {/* CONTROL CENTER BODY */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[600px]">
                
                {/* LEFT: MARKET HEALTH MAP (Visual Grid) */}
                <div className="lg:col-span-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2"><Map className="w-5 h-5 text-indigo-600"/> {t(currentLanguage, 'ct_active_markets')}</h3>
                        <div className="flex gap-2 text-xs">
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Sain</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Moyen</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Critique</span>
                        </div>
                    </div>
                    
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto pr-2">
                        {markets.map(m => {
                            // Quick Health Calc (Ideally this should also come from RPC but we approximate here)
                            const mStalls = stalls.filter(s => s.marketId === m.id);
                            const mTrans = Array.isArray(transactions) ? transactions.filter(t => t.marketId === m.id) : [];
                            const mRev = mTrans.reduce((acc, t) => acc + t.amount, 0);
                            const mRate = m.targetRevenue ? (mRev / m.targetRevenue) * 100 : 0;
                            const statusColor = mRate > 70 ? 'bg-green-50 border-green-200' : mRate > 40 ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200';
                            const barColor = mRate > 70 ? 'bg-green-500' : mRate > 40 ? 'bg-orange-500' : 'bg-red-500';

                            return (
                                <div key={m.id} className={`p-4 rounded-xl border-2 flex flex-col justify-between transition-all hover:scale-[1.02] cursor-pointer ${statusColor}`}>
                                    <div>
                                        <h4 className="font-bold text-gray-800 truncate">{m.name}</h4>
                                        <p className="text-xs text-gray-500">{m.city}</p>
                                    </div>
                                    <div className="mt-4">
                                        <div className="flex justify-between text-xs font-bold mb-1">
                                            <span>Rev.</span>
                                            {isLoadingFinance ? <Skeleton width={30} height={10}/> : <span>{mRate.toFixed(0)}%</span>}
                                        </div>
                                        <div className="w-full bg-white h-2 rounded-full overflow-hidden">
                                            <div className={`h-full ${barColor}`} style={{ width: `${Math.min(mRate, 100)}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {/* Fake placeholders to fill grid if few markets */}
                        {markets.length < 6 && Array.from({ length: 6 - markets.length }).map((_, i) => (
                            <div key={i} className="p-4 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300">
                                <span className="text-xs font-bold uppercase">Emplacement Vide</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: LIVE LOG STREAM */}
                <div className="lg:col-span-4 bg-slate-900 rounded-xl shadow-lg border border-slate-800 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Radio className="w-4 h-4 text-green-500 animate-pulse"/> {t(currentLanguage, 'activity_feed')}
                        </h3>
                        <span className="text-[10px] text-slate-500 font-mono">LIVE</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
                        {isLoadingFinance ? (
                            Array.from({length: 6}).map((_, i) => (
                                <div key={i} className="flex gap-3 items-center">
                                    <Skeleton variant="circular" width={8} height={8} className="bg-slate-700"/>
                                    <div className="flex-1 space-y-2">
                                        <Skeleton width="40%" height={10} className="bg-slate-700"/>
                                        <Skeleton width="80%" height={10} className="bg-slate-800"/>
                                    </div>
                                </div>
                            ))
                        ) : activityFeed.length === 0 ? (
                            <p className="text-slate-600 text-center py-10">{t(currentLanguage, 'feed_waiting')}</p>
                        ) : (
                            activityFeed.map((item: any, idx) => (
                                <div key={idx} className="pl-3 border-l border-slate-700 relative animate-fade-in">
                                    <div className={`absolute -left-[5px] top-0 w-2 h-2 rounded-full ${item.kind === 'transaction' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                                    <div className="flex justify-between text-slate-400 mb-0.5">
                                        <span>{new Date(item.date).toLocaleTimeString()}</span>
                                        <span className="opacity-50">{item.location?.city}</span>
                                    </div>
                                    <div className="text-slate-200 font-bold">
                                        {item.kind === 'transaction' ? 'PAIEMENT' : 'COMMANDE'}
                                        <span className={`ml-2 ${item.kind === 'transaction' ? 'text-blue-400' : 'text-green-400'}`}>+{formatCurrency(item.amount)}</span>
                                    </div>
                                    <div className="text-slate-500 truncate mt-0.5">
                                        {item.kind === 'transaction' ? `Ref: ${item.reference}` : `Client: ${item.customerName}`}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Other Tabs */}
      {activeTab === 'agents' && (
          <AgentManager 
            agents={agents}
            users={users || []} // PASSING USERS FOR ROSTER
            markets={markets}
            stalls={stalls}
            missions={missions}
            onAssignMission={onAssignMission!} 
            onValidateCashDrop={onValidateCashDrop!}
            currentLanguage={currentLanguage}
          />
      )}

      {activeTab === 'markets' && (
          <MarketManager 
            markets={markets} 
            stalls={stalls}
            transactions={transactions}
            sanctions={sanctions}
            reports={reports}
            onAddMarket={onAddMarket} 
            onUpdateMarket={onUpdateMarket} 
            onDeleteMarket={onDeleteMarket}
            viewMode={marketViewMode}
            setViewMode={setMarketViewMode}
            currentLanguage={currentLanguage}
          />
      )}

      {activeTab === 'space' && (
          <StallManager 
            stalls={stalls} 
            markets={markets} 
            categories={productCategories}
            users={users || []} // Pass users specifically for assignment
            onCreateStall={onCreateStall!} 
            onBulkCreateStalls={onBulkCreateStalls!} 
            onDeleteStall={onDeleteStall!}
            currentLanguage={currentLanguage}
          />
      )}

      {activeTab === 'finance' && (
          <FinanceManager 
            markets={markets} 
            expenses={expenses} 
            stalls={stalls}
            sanctions={sanctions || []}
            paymentPlans={paymentPlans}
            loading={loadingStates?.finance}
            onAddExpense={onAddExpense!} 
            onDeleteExpense={onDeleteExpense!}
            onApprovePlan={onApprovePlan}
            currentLanguage={currentLanguage}
          />
      )}

      {activeTab === 'users' && (
          <UserManager 
            users={users} 
            stalls={stalls}
            markets={markets}
            sanctions={sanctions || []}
            loading={loadingStates?.users}
            onUpdateUserStatus={onUpdateUserStatus!} 
            currentLanguage={currentLanguage}
          />
      )}

      {activeTab === 'audit' && (
          <AuditLogViewer users={users} loading={loadingStates?.users} currentLanguage={currentLanguage} />
      )}

      {activeTab === 'settings' && (
          <SettingsManager 
            categories={productCategories}
            onAddCategory={onAddCategory!}
            onDeleteCategory={onDeleteCategory!}
          />
      )}
    </div>
  );
};

export default AdminDashboard;
