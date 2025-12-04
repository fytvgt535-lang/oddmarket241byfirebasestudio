import React, { useState, useMemo } from 'react';
import { Activity, Building2, Bell, Users, LayoutGrid, Radar, DollarSign, HeartHandshake, MessageSquare, Settings, X, ShoppingBag, ArrowRight } from 'lucide-react';
import { Stall, HygieneReport, Transaction, Market, Agent, Expense, SmsCampaign, PaymentPlan, SmsTemplate, Receipt, AppNotification, Sanction, User, ClientOrder } from '../types';
import MarketManager from './admin/MarketManager';
import StallManager from './admin/StallManager';
import FinanceManager from './admin/FinanceManager';
import UserManager from './admin/UserManager';
import { Area, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

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
  orders?: ClientOrder[]; // NEW
  onSendSms: (marketId: string, audience: SmsCampaign['targetAudience'], message: string, tone: SmsTemplate['tone']) => void;
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
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
    markets, stalls, reports, transactions = [], receipts, agents, expenses, paymentPlans, notifications, sanctions = [], users = [], orders = [],
    onSendSms, onApprovePlan, onAddMarket, onUpdateMarket, onDeleteMarket, onResolveAppeal, onUpdateUserStatus, onCreateStall, onDeleteStall, onAddExpense, onDeleteExpense, onBulkCreateStalls 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'finance' | 'space' | 'comms' | 'social' | 'geo' | 'markets' | 'users'>('overview');
  const [selectedMarketId, setSelectedMarketId] = useState<string>('all');
  const [showNotifications, setShowNotifications] = useState(false);
  const [marketViewMode, setMarketViewMode] = useState<'grid' | 'list'>('grid');

  // Overview Calculations
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  
  const filteredTransactions = useMemo(() => selectedMarketId === 'all' ? safeTransactions : safeTransactions.filter(t => t.marketId === selectedMarketId), [safeTransactions, selectedMarketId]);
  const totalRevenue = filteredTransactions.reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  
  const potentialRevenue = stalls.reduce((acc, s) => acc + s.price, 0);
  const collectionRate = Math.round((totalRevenue / (potentialRevenue > 0 ? potentialRevenue : 1)) * 100) || 0;
  const unreadNotifs = notifications.filter(n => !n.read).length;

  // --- LIVE FEED LOGIC ---
  const activityFeed = useMemo(() => {
      // Combine transactions and orders into a single feed sorted by date
      const feedItems = [
          ...filteredTransactions.map(t => ({ ...t, kind: 'transaction' as const })),
          ...orders.map(o => ({ ...o, kind: 'order' as const, amount: o.totalAmount }))
      ].sort((a, b) => b.date - a.date).slice(0, 10); // Show last 10 activities
      return feedItems;
  }, [filteredTransactions, orders]);

  return (
    <div className="space-y-6 relative">
      {/* Notifications Panel */}
      {showNotifications && (
         <div className="absolute top-16 right-4 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-fade-in">
             <div className="bg-gray-50 p-3 border-b border-gray-100 flex justify-between items-center">
                 <h4 className="font-bold text-gray-800">Alertes Temps Réel</h4>
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
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Building2 className="text-gray-600" /> Administration Centrale</h2>
          <p className="text-sm text-gray-500">Mairie de Libreville • Gouvernance Intelligente</p>
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
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6 overflow-x-auto">
          <button onClick={() => setActiveTab('overview')} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${activeTab === 'overview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}><Activity className="w-4 h-4" /> Vue 360°</button>
          <button onClick={() => setActiveTab('users')} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${activeTab === 'users' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500'}`}><Users className="w-4 h-4" /> Utilisateurs</button>
          <button onClick={() => setActiveTab('space')} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${activeTab === 'space' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500'}`}><LayoutGrid className="w-4 h-4" /> Gestion Espace</button>
          <button onClick={() => setActiveTab('finance')} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${activeTab === 'finance' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500'}`}><DollarSign className="w-4 h-4" /> Finances</button>
          <button onClick={() => setActiveTab('markets')} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${activeTab === 'markets' ? 'border-slate-800 text-slate-900' : 'border-transparent text-gray-500'}`}><Settings className="w-4 h-4" /> Config Marchés</button>
        </nav>
      </div>

      {/* CONTENT */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 font-medium mb-1">Recouvrement</p>
                    <h3 className={`text-3xl font-bold ${collectionRate < 70 ? 'text-red-500' : 'text-green-600'}`}>{collectionRate}%</h3>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 font-medium mb-1">Recettes Totales</p>
                    <h3 className="text-3xl font-bold text-gray-800">{totalRevenue.toLocaleString()} F</h3>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 font-medium mb-1">Utilisateurs</p>
                    <h3 className="text-2xl font-bold text-gray-800">{users.length}</h3>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 font-medium mb-1">Alertes Hygiène</p>
                    <h3 className="text-2xl font-bold text-red-500">{reports.filter(r => r.status === 'pending').length}</h3>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96">
                    <h3 className="font-bold text-gray-800 mb-4">Évolution Financière</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={filteredTransactions.slice(0, 50).map(t => ({name: new Date(t.date).toLocaleDateString(), montant: t.amount}))}>
                            <XAxis dataKey="name" hide />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="montant" fill="#8884d8" stroke="#8884d8" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                {/* LIVE ACTIVITY FEED (New) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-96">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-orange-500"/> Flux d'Activité
                        <span className="animate-pulse w-2 h-2 bg-green-500 rounded-full ml-auto"></span>
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                        {activityFeed.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-10">En attente d'activité...</p>
                        ) : (
                            activityFeed.map((item: any) => (
                                <div key={item.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 animate-slide-up">
                                    <div className={`p-2 rounded-full shrink-0 ${item.kind === 'transaction' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                                        {item.kind === 'transaction' ? <DollarSign className="w-4 h-4"/> : <ShoppingBag className="w-4 h-4"/>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-800 truncate">
                                            {item.kind === 'transaction' ? 'Paiement Reçu' : 'Nouvelle Commande'}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {item.kind === 'transaction' ? `Réf: ${item.reference}` : `Client: ${item.customerName}`}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-sm font-bold ${item.kind === 'transaction' ? 'text-blue-700' : 'text-green-700'}`}>
                                            +{item.amount.toLocaleString()}
                                        </p>
                                        <p className="text-[10px] text-gray-400">{new Date(item.date).toLocaleTimeString()}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'markets' && (
          <MarketManager 
            markets={markets} 
            onAddMarket={onAddMarket} 
            onUpdateMarket={onUpdateMarket} 
            onDeleteMarket={onDeleteMarket}
            viewMode={marketViewMode}
            setViewMode={setMarketViewMode}
          />
      )}

      {activeTab === 'space' && (
          <StallManager 
            stalls={stalls} 
            markets={markets} 
            onCreateStall={onCreateStall!} 
            onBulkCreateStalls={onBulkCreateStalls!} 
            onDeleteStall={onDeleteStall!} 
          />
      )}

      {activeTab === 'finance' && (
          <FinanceManager 
            markets={markets} 
            expenses={expenses} 
            onAddExpense={onAddExpense!} 
            onDeleteExpense={onDeleteExpense!} 
          />
      )}

      {activeTab === 'users' && (
          <UserManager 
            users={users} 
            onUpdateUserStatus={onUpdateUserStatus!} 
          />
      )}
    </div>
  );
};

export default AdminDashboard;