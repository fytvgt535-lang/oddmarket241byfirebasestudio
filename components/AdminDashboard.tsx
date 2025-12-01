
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, ComposedChart, Area, ScatterChart, Scatter, ZAxis } from 'recharts';
import { Stall, HygieneReport, Transaction, Market, Agent, Expense, SmsCampaign, PaymentPlan, SmsTemplate, Receipt, AppNotification, Sanction, User } from '../types';
import { generateMarketAnalysis, analyzeLocationWithMaps, MapsAnalysisResult } from '../services/geminiService';
import StallDigitalTwin from './StallDigitalTwin';
import { Sparkles, AlertTriangle, Wallet, Users, Activity, TrendingUp, Building2, MessageSquare, Send, DollarSign, FileText, HeartHandshake, Gavel, CheckCircle, Search, Map as MapIcon, Filter, AlertCircle, Trash2, Droplets, Bug, Radar, Archive, Lock, MapPin, ExternalLink, ShieldCheck, Settings, Plus, Pencil, Trash, X, Download, Bell, Scale, UserCheck, Ban, Eye, CreditCard, Clock } from 'lucide-react';

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
  users?: User[]; // New: List of all users
  onSendSms: (marketId: string, audience: SmsCampaign['targetAudience'], message: string, tone: SmsTemplate['tone']) => void;
  onApprovePlan: (planId: string) => void;
  onAddMarket: (market: Omit<Market, 'id'>) => void;
  onUpdateMarket: (marketId: string, updates: Partial<Market>) => void;
  onDeleteMarket: (marketId: string) => void;
  onResolveAppeal?: (sanctionId: string, decision: 'accepted' | 'rejected') => void;
  onUpdateUserStatus?: (userId: string, updates: Partial<User>) => void; // New Action
}

const SMS_TEMPLATES: SmsTemplate[] = [
  { id: 't1', tone: 'friendly', label: 'Rappel Courtois', content: "Bonjour, petit rappel concernant votre loyer de ce mois. N'hésitez pas à passer au bureau si vous avez une difficulté. - La Mairie" },
  { id: 't2', tone: 'firm', label: 'Mise en Demeure', content: "URGENT: Votre retard de paiement dépasse 30 jours. Veuillez régulariser votre situation sous 48h pour éviter une suspension de votre étal." },
  { id: 't3', tone: 'urgent', label: 'Alerte Sanitaire', content: "ALERTE: Désinfection du marché prévue demain à 06h00. Veuillez impérativement couvrir vos marchandises." },
];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ markets, stalls, reports, transactions, receipts, agents, expenses, paymentPlans, notifications, sanctions = [], users = [], onSendSms, onApprovePlan, onAddMarket, onUpdateMarket, onDeleteMarket, onResolveAppeal, onUpdateUserStatus }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'finance' | 'space' | 'comms' | 'social' | 'geo' | 'markets' | 'users'>('overview');
  const [selectedMarketId, setSelectedMarketId] = useState<string>('all');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Search & Stall Twin State
  const [stallSearch, setStallSearch] = useState('');
  const [stallFilter, setStallFilter] = useState<'all' | 'critical' | 'warning' | 'healthy'>('all');
  const [selectedStallForTwin, setSelectedStallForTwin] = useState<Stall | null>(null);
  
  // User Management State
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserForKYC, setSelectedUserForKYC] = useState<User | null>(null);

  // SMS State
  const [smsTone, setSmsTone] = useState<SmsTemplate['tone']>('friendly');
  const [smsAudience, setSmsAudience] = useState<SmsCampaign['targetAudience']>('all');
  const [customMessage, setCustomMessage] = useState(SMS_TEMPLATES[0].content);

  // Geo Audit State
  const [selectedGeoPoint, setSelectedGeoPoint] = useState<any | null>(null);
  const [geoAnalysis, setGeoAnalysis] = useState<MapsAnalysisResult | null>(null);
  const [isGeoAnalyzing, setIsGeoAnalyzing] = useState(false);
  const [geoViewFilter, setGeoViewFilter] = useState<'all' | 'critical_stalls' | 'agent_sanctions' | 'agent_payments'>('all');

  // Market Management State
  const [isMarketModalOpen, setIsMarketModalOpen] = useState(false);
  const [editingMarket, setEditingMarket] = useState<Market | null>(null);
  const [marketForm, setMarketForm] = useState({ name: '', location: '', targetRevenue: 0 });

  // Filter Data Context
  const filteredStalls = useMemo(() => selectedMarketId === 'all' ? stalls : stalls.filter(s => s.marketId === selectedMarketId), [stalls, selectedMarketId]);
  const filteredTransactions = useMemo(() => selectedMarketId === 'all' ? transactions : transactions.filter(t => t.marketId === selectedMarketId), [transactions, selectedMarketId]);
  const filteredReceipts = useMemo(() => selectedMarketId === 'all' ? receipts : receipts.filter(r => r.marketId === selectedMarketId), [receipts, selectedMarketId]);
  const filteredExpenses = useMemo(() => selectedMarketId === 'all' ? expenses : expenses.filter(e => e.marketId === selectedMarketId), [expenses, selectedMarketId]);
  const filteredReports = useMemo(() => selectedMarketId === 'all' ? reports : reports.filter(r => r.marketId === selectedMarketId), [reports, selectedMarketId]);

  // Calculations
  const totalRevenue = filteredTransactions.reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const netBalance = totalRevenue - totalExpenses;
  
  const potentialRevenue = filteredStalls.filter(s => s.status === 'occupied').reduce((acc, s) => acc + s.price, 0);
  const targetRevenue = selectedMarketId === 'all' ? markets.reduce((acc, m) => acc + m.targetRevenue, 0) : markets.find(m => m.id === selectedMarketId)?.targetRevenue || 0;
  const collectionRate = Math.round((totalRevenue / potentialRevenue) * 100) || 0;
  
  const suspiciousStalls = filteredStalls.filter(s => s.status === 'occupied' && (!s.lastPaymentDate || Date.now() - s.lastPaymentDate > 30 * 24 * 60 * 60 * 1000));
  const unreadNotifs = notifications.filter(n => !n.read).length;

  const pendingAppeals = sanctions.filter(s => s.appealStatus === 'pending');
  const pendingKYC = users.filter(u => u.kycStatus === 'pending').length;

  // Dynamic Audience Calculation
  const getAudienceCount = (audience: SmsCampaign['targetAudience']) => {
    switch(audience) {
        case 'all': return filteredStalls.filter(s => s.status !== 'free').length;
        case 'unpaid_30': return filteredStalls.filter(s => s.status === 'occupied' && (!s.lastPaymentDate || Date.now() - s.lastPaymentDate > 30 * 86400000)).length;
        case 'unpaid_60': return filteredStalls.filter(s => s.status === 'occupied' && (!s.lastPaymentDate || Date.now() - s.lastPaymentDate > 60 * 86400000)).length;
        case 'zone_vivres': return filteredStalls.filter(s => s.status === 'occupied' && s.productType === 'vivres').length;
        case 'vulnerable': return filteredStalls.filter(s => s.isPriority).length;
        default: return 0;
    }
  };

  const recipientCount = getAudienceCount(smsAudience);

  // Filtered Users for Management
  const filteredUsers = users.filter(u => 
      u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  // ... (Keep existing chart data and handlers) ...

  const handleUserStatusUpdate = (userId: string, updates: Partial<User>) => {
      if(onUpdateUserStatus) onUpdateUserStatus(userId, updates);
      if(selectedUserForKYC && selectedUserForKYC.id === userId) setSelectedUserForKYC(null);
  };

  return (
    <div className="space-y-6 relative">
      {/* ... (Keep Notifications Panel & Header) ... */}
       {/* Notifications Panel */}
      {showNotifications && (
         <div className="absolute top-16 right-4 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-fade-in">
             <div className="bg-gray-50 p-3 border-b border-gray-100 flex justify-between items-center">
                 <h4 className="font-bold text-gray-800">Alertes Temps Réel</h4>
                 <button onClick={() => setShowNotifications(false)}><X className="w-4 h-4 text-gray-400"/></button>
             </div>
             <div className="max-h-64 overflow-y-auto">
                 {notifications.length === 0 ? (
                     <p className="text-center p-4 text-gray-400 text-sm">Aucune nouvelle alerte.</p>
                 ) : (
                     notifications.map(n => (
                         <div key={n.id} className="p-3 border-b border-gray-100 hover:bg-gray-50">
                             <div className="flex justify-between items-start mb-1">
                                 <span className={`text-xs font-bold px-1.5 py-0.5 rounded capitalize ${n.type === 'success' ? 'bg-green-100 text-green-700' : n.type === 'warning' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{n.type}</span>
                                 <span className="text-[10px] text-gray-400">{new Date(n.date).toLocaleTimeString()}</span>
                             </div>
                             <p className="font-bold text-sm text-gray-800">{n.title}</p>
                             <p className="text-xs text-gray-500">{n.message}</p>
                         </div>
                     ))
                 )}
             </div>
         </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Building2 className="text-gray-600" />
            Administration Centrale
          </h2>
          <p className="text-sm text-gray-500">Mairie de Libreville • Gouvernance Intelligente</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex bg-gray-100 p-1 rounded-lg flex-1 md:flex-none overflow-x-auto">
                <button onClick={() => setSelectedMarketId('all')} className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${selectedMarketId === 'all' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Ville Globale</button>
                {markets.map(m => (
                    <button key={m.id} onClick={() => setSelectedMarketId(m.id)} className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${selectedMarketId === m.id ? 'bg-white shadow-sm' : 'text-gray-500'}`}>{m.name}</button>
                ))}
            </div>
            
            <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 relative"
            >
                <Bell className="w-5 h-5 text-gray-600"/>
                {unreadNotifs > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                )}
            </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6 overflow-x-auto">
          <button onClick={() => setActiveTab('overview')} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${activeTab === 'overview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Activity className="w-4 h-4" /> Vue 360°
          </button>
           <button onClick={() => setActiveTab('users')} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${activeTab === 'users' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Users className="w-4 h-4" /> Utilisateurs & KYC
             {pendingKYC > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{pendingKYC}</span>}
          </button>
          <button onClick={() => setActiveTab('space')} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${activeTab === 'space' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <MapIcon className="w-4 h-4" /> Gestion Espace
          </button>
          <button onClick={() => setActiveTab('geo')} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${activeTab === 'geo' ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Radar className="w-4 h-4" /> Geo-Audit
          </button>
          <button onClick={() => setActiveTab('finance')} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${activeTab === 'finance' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <DollarSign className="w-4 h-4" /> Finances
          </button>
          <button onClick={() => setActiveTab('social')} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${activeTab === 'social' ? 'border-pink-500 text-pink-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <HeartHandshake className="w-4 h-4" /> Social & Justice
          </button>
          <button onClick={() => setActiveTab('comms')} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${activeTab === 'comms' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <MessageSquare className="w-4 h-4" /> Smart Comms
          </button>
          <button onClick={() => setActiveTab('markets')} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${activeTab === 'markets' ? 'border-slate-800 text-slate-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Settings className="w-4 h-4" /> Config Marchés
          </button>
        </nav>
      </div>

      {/* --- CONTENT TABS --- */}
      
      {/* 1. OVERVIEW (Keep existing) */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Dashboard Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 font-medium mb-1">Efficacité Fiscale</p>
                <div className="flex items-end gap-2">
                    <h3 className={`text-3xl font-bold ${collectionRate < 70 ? 'text-red-500' : 'text-green-600'}`}>{collectionRate}%</h3>
                    <span className="text-xs text-gray-400 mb-1">recouvrés</span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3"><div className="bg-blue-600 h-1.5 rounded-full" style={{width: `${collectionRate}%`}}></div></div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 font-medium mb-1">Utilisateurs Actifs</p>
                <h3 className="text-2xl font-bold text-gray-800">{users.filter(u => !u.isBanned).length}</h3>
                <p className="text-xs text-green-500 mt-1 flex items-center gap-1"><UserCheck className="w-3 h-3"/> +5 cette semaine</p>
            </div>
            {/* ... other cards ... */}
          </div>
        </div>
      )}

      {/* 2. USERS & KYC TAB (NEW) */}
      {activeTab === 'users' && (
          <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center">
                  <div className="relative w-64">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400"/>
                      <input 
                        type="text" 
                        placeholder="Rechercher utilisateur..." 
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                  </div>
                  <div className="flex gap-2">
                      <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Vérifiés</span>
                      <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Bannis</span>
                  </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200">
                          <tr>
                              <th className="p-4">Utilisateur</th>
                              <th className="p-4">Rôle</th>
                              <th className="p-4">Statut KYC</th>
                              <th className="p-4">État Compte</th>
                              <th className="p-4 text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {filteredUsers.map(user => (
                              <tr key={user.id} className="hover:bg-gray-50">
                                  <td className="p-4">
                                      <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold">
                                              {user.name.charAt(0)}
                                          </div>
                                          <div>
                                              <p className="font-bold text-gray-800">{user.name}</p>
                                              <p className="text-xs text-gray-500">{user.email || user.phone}</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="p-4 capitalize">
                                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-100' : user.role === 'agent' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                                          {user.role}
                                      </span>
                                  </td>
                                  <td className="p-4">
                                      {user.kycStatus === 'verified' ? (
                                          <span className="flex items-center gap-1 text-green-600 font-bold text-xs"><ShieldCheck className="w-4 h-4"/> Validé</span>
                                      ) : user.kycStatus === 'pending' ? (
                                          <button onClick={() => setSelectedUserForKYC(user)} className="flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold hover:bg-orange-200">
                                              <Clock className="w-3 h-3"/> En Attente (Voir)
                                          </button>
                                      ) : (
                                          <span className="text-gray-400 text-xs">Non Requis / Rejeté</span>
                                      )}
                                  </td>
                                  <td className="p-4">
                                      {user.isBanned ? (
                                          <span className="flex items-center gap-1 text-red-600 font-bold text-xs"><Ban className="w-4 h-4"/> Banni</span>
                                      ) : (
                                          <span className="flex items-center gap-1 text-green-600 font-bold text-xs"><CheckCircle className="w-4 h-4"/> Actif</span>
                                      )}
                                  </td>
                                  <td className="p-4 text-right">
                                      {user.isBanned ? (
                                          <button onClick={() => handleUserStatusUpdate(user.id, { isBanned: false })} className="text-green-600 hover:underline text-xs font-bold">Débannir</button>
                                      ) : (
                                          <button onClick={() => handleUserStatusUpdate(user.id, { isBanned: true })} className="text-red-600 hover:underline text-xs font-bold">Bannir</button>
                                      )}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>

              {/* KYC Modal */}
              {selectedUserForKYC && selectedUserForKYC.kycDocument && (
                  <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
                      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden animate-fade-in">
                          <div className="bg-indigo-900 text-white p-4 flex justify-between items-center">
                              <h3 className="font-bold">Validation d'Identité</h3>
                              <button onClick={() => setSelectedUserForKYC(null)}><X className="w-5 h-5"/></button>
                          </div>
                          <div className="p-6">
                              <div className="flex items-center gap-4 mb-6">
                                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-xl">{selectedUserForKYC.name.charAt(0)}</div>
                                  <div>
                                      <h4 className="font-bold text-lg">{selectedUserForKYC.name}</h4>
                                      <p className="text-gray-500 text-sm">Document: <span className="uppercase font-bold">{selectedUserForKYC.kycDocument.type}</span></p>
                                      <p className="text-gray-400 text-xs">N°: {selectedUserForKYC.kycDocument.number}</p>
                                  </div>
                              </div>

                              <div className="bg-gray-100 rounded-xl p-2 mb-6 border-2 border-dashed border-gray-300">
                                  <img src={selectedUserForKYC.kycDocument.fileUrl} className="w-full h-64 object-contain rounded-lg" alt="ID Document"/>
                              </div>

                              <div className="flex gap-4">
                                  <button onClick={() => handleUserStatusUpdate(selectedUserForKYC.id, { kycStatus: 'rejected' })} className="flex-1 py-3 border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50">
                                      Rejeter
                                  </button>
                                  <button onClick={() => handleUserStatusUpdate(selectedUserForKYC.id, { kycStatus: 'verified' })} className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700">
                                      Valider Document
                                  </button>
                              </div>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* ... (Existing Tabs: Space, Finance, Social, etc.) ... */}
      {activeTab === 'space' && (
          <div className="text-center p-12 text-gray-400">Section Gestion Espace (Voir MarketMap ou StallTwin)</div>
      )}
       {activeTab === 'finance' && (
          <div className="text-center p-12 text-gray-400">Section Finances (Graphs, Exports)</div>
      )}
       {activeTab === 'social' && (
          <div className="text-center p-12 text-gray-400">Section Social & Justice (Plans de paiement, Appels)</div>
      )}
    </div>
  );
};

export default AdminDashboard;
