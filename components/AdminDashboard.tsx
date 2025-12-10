
import React, { useState, useMemo, useEffect } from 'react';
import { Activity, Building2, Bell, Users, LayoutGrid, DollarSign, Settings, X, ShoppingBag, Shield, Loader2, Globe, CreditCard, Radio } from 'lucide-react';
import { Stall, HygieneReport, Transaction, Market, Agent, Expense, PaymentPlan, Receipt, AppNotification, Sanction, User, ClientOrder, Mission } from '../types';
import MarketManager from './admin/MarketManager';
import StallManager from './admin/StallManager';
import FinanceManager from './admin/FinanceManager';
import UserManager from './admin/UserManager';
import AuditLogViewer from './admin/AuditLogViewer';
import AgentManager from './admin/AgentManager';
import { Area, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { t } from '../services/translations';
import { simulateGlobalLocation } from '../utils/coreUtils';

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
  
  // New: Current Language
  currentLanguage: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
    markets = [], stalls = [], reports = [], transactions = [], expenses = [], notifications = [], users = [], orders = [], sanctions = [], agents = [], missions = [],
    loadingStates, onLoadFinance, onLoadUsers, onLoadMissions,
    onAddMarket, onUpdateMarket, onDeleteMarket, onUpdateUserStatus, onCreateStall, onDeleteStall, onAddExpense, onDeleteExpense, onBulkCreateStalls,
    onAssignMission, onValidateCashDrop,
    currentLanguage
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'finance' | 'space' | 'markets' | 'users' | 'agents' | 'audit'>('overview');
  const [selectedMarketId, setSelectedMarketId] = useState<string>('all');
  const [showNotifications, setShowNotifications] = useState(false);
  const [marketViewMode, setMarketViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
      if (activeTab === 'finance' || activeTab === 'overview') onLoadFinance && onLoadFinance();
      if (activeTab === 'users' || activeTab === 'audit' || activeTab === 'agents') onLoadUsers && onLoadUsers();
      if (activeTab === 'agents') onLoadMissions && onLoadMissions(); // Fetch missions when active
  }, [activeTab, onLoadFinance, onLoadUsers, onLoadMissions]);

  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const filteredTransactions = useMemo(() => selectedMarketId === 'all' ? safeTransactions : safeTransactions.filter(t => t.marketId === selectedMarketId), [safeTransactions, selectedMarketId]);
  const totalRevenue = filteredTransactions.reduce((acc, curr) => acc + curr.amount, 0);
  const potentialRevenue = stalls.reduce((acc, s) => acc + s.price, 0);
  const collectionRate = Math.round((totalRevenue / (potentialRevenue > 0 ? potentialRevenue : 1)) * 100) || 0;
  const unreadNotifs = notifications.filter(n => !n.read).length;

  // Generate enriched activity feed with geolocation
  const activityFeed = useMemo(() => {
      return [
          ...filteredTransactions.map(t => ({ ...t, kind: 'transaction' as const, location: simulateGlobalLocation() })),
          ...orders.map(o => ({ ...o, kind: 'order' as const, amount: o.totalAmount, location: simulateGlobalLocation() }))
      ].sort((a, b) => b.date - a.date).slice(0, 10); 
  }, [filteredTransactions, orders]);

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
              {loadingStates?.users && <Loader2 className="w-3 h-3 animate-spin"/>}
          </button>
          <button onClick={() => setActiveTab('space')} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'space' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500'}`}><LayoutGrid className="w-4 h-4" /> {t(currentLanguage, 'tab_space')}</button>
          <button onClick={() => setActiveTab('finance')} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'finance' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500'}`}>
              <DollarSign className="w-4 h-4" /> {t(currentLanguage, 'tab_finance')}
              {loadingStates?.finance && <Loader2 className="w-3 h-3 animate-spin"/>}
          </button>
          <button onClick={() => setActiveTab('markets')} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'markets' ? 'border-slate-800 text-slate-900' : 'border-transparent text-gray-500'}`}><Settings className="w-4 h-4" /> {t(currentLanguage, 'tab_markets')}</button>
          <button onClick={() => setActiveTab('audit')} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'audit' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500'}`}><Shield className="w-4 h-4" /> {t(currentLanguage, 'tab_audit')}</button>
        </nav>
      </div>

      {/* CONTENT */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 font-medium mb-1">{t(currentLanguage, 'recovery_rate')}</p>
                    <h3 className={`text-3xl font-bold ${collectionRate < 70 ? 'text-red-500' : 'text-green-600'}`}>{collectionRate}%</h3>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 font-medium mb-1">{t(currentLanguage, 'total_revenue')}</p>
                    <h3 className="text-3xl font-bold text-gray-800">{totalRevenue.toLocaleString()} F</h3>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 font-medium mb-1">{t(currentLanguage, 'active_users')}</p>
                    {loadingStates?.users ? <Loader2 className="w-5 h-5 animate-spin text-gray-400"/> : <h3 className="text-2xl font-bold text-gray-800">{users.length}</h3>}
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 font-medium mb-1">{t(currentLanguage, 'hygiene_alerts')}</p>
                    <h3 className="text-2xl font-bold text-red-500">{reports.filter(r => r.status === 'pending').length}</h3>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-[500px]">
                    <h3 className="font-bold text-gray-800 mb-4">{t(currentLanguage, 'financial_evolution')}</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={filteredTransactions.slice(0, 50).map(t => ({name: new Date(t.date).toLocaleDateString(), montant: t.amount}))}>
                            <XAxis dataKey="name" hide />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="montant" fill="#8884d8" stroke="#8884d8" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                {/* ENRICHED ACTIVITY FEED */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[500px] overflow-hidden">
                    <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <Globe className="w-5 h-5 text-blue-600"/> {t(currentLanguage, 'activity_feed')}
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-0 relative">
                        {/* Timeline Line */}
                        <div className="absolute left-8 top-4 bottom-4 w-0.5 bg-gray-100"></div>

                        {loadingStates?.finance ? (
                            <div className="flex justify-center items-center h-full text-gray-400"><Loader2 className="w-8 h-8 animate-spin"/></div>
                        ) : activityFeed.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-10">{t(currentLanguage, 'feed_waiting')}</p>
                        ) : (
                            activityFeed.map((item: any) => (
                                <div key={item.id} className="flex gap-4 relative mb-6 group animate-slide-up">
                                    <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center border-2 z-10 transition-transform group-hover:scale-110 ${
                                        item.kind === 'transaction' 
                                            ? 'bg-blue-50 border-blue-200 text-blue-600' 
                                            : 'bg-green-50 border-green-200 text-green-600'
                                    }`}>
                                        {item.kind === 'transaction' ? <CreditCard className="w-4 h-4"/> : <ShoppingBag className="w-4 h-4"/>}
                                    </div>
                                    <div className="flex-1 bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">
                                                    {item.kind === 'transaction' ? t(currentLanguage, 'feed_transaction') : t(currentLanguage, 'feed_order')}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {item.kind === 'transaction' ? `Réf: ${item.reference}` : `Client: ${item.customerName}`}
                                                </p>
                                            </div>
                                            <span className={`text-sm font-black ${item.kind === 'transaction' ? 'text-blue-700' : 'text-green-700'}`}>
                                                +{item.amount.toLocaleString()}
                                            </span>
                                        </div>
                                        
                                        <div className="mt-3 pt-2 border-t border-gray-50 flex justify-between items-center text-[10px] text-gray-400">
                                            <span className="flex items-center gap-1 font-medium text-gray-500">
                                                <Globe className="w-3 h-3 text-blue-400"/> {item.location.city}, {item.location.country}
                                            </span>
                                            <span>{new Date(item.date).toLocaleTimeString()}</span>
                                        </div>
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
            loading={loadingStates?.finance}
            onAddExpense={onAddExpense!} 
            onDeleteExpense={onDeleteExpense!}
            currentLanguage={currentLanguage}
          />
      )}

      {activeTab === 'users' && (
          <UserManager 
            users={users} 
            stalls={stalls}
            markets={markets}
            sanctions={sanctions}
            loading={loadingStates?.users}
            onUpdateUserStatus={onUpdateUserStatus!} 
            currentLanguage={currentLanguage}
          />
      )}

      {activeTab === 'audit' && (
          <AuditLogViewer users={users} loading={loadingStates?.users} currentLanguage={currentLanguage} />
      )}
    </div>
  );
};

export default AdminDashboard;
