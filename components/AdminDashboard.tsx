
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, ComposedChart, Area, ScatterChart, Scatter, ZAxis } from 'recharts';
import { Stall, HygieneReport, Transaction, Market, Agent, Expense, SmsCampaign, PaymentPlan, SmsTemplate, Receipt } from '../types';
import { generateMarketAnalysis, analyzeLocationWithMaps, MapsAnalysisResult } from '../services/geminiService';
import StallDigitalTwin from './StallDigitalTwin';
import { Sparkles, AlertTriangle, Wallet, Users, Activity, TrendingUp, Building2, MessageSquare, Send, DollarSign, FileText, HeartHandshake, Gavel, CheckCircle, Search, Map as MapIcon, Filter, AlertCircle, Trash2, Droplets, Bug, Radar, Archive, Lock, MapPin, ExternalLink, ShieldCheck, Settings, Plus, Pencil, Trash, X } from 'lucide-react';

interface AdminDashboardProps {
  markets: Market[];
  stalls: Stall[];
  reports: HygieneReport[];
  transactions: Transaction[];
  receipts: Receipt[];
  agents: Agent[];
  expenses: Expense[];
  paymentPlans: PaymentPlan[];
  onSendSms: (marketId: string, audience: SmsCampaign['targetAudience'], message: string, tone: SmsTemplate['tone']) => void;
  onApprovePlan: (planId: string) => void;
  onAddMarket: (market: Omit<Market, 'id'>) => void;
  onUpdateMarket: (marketId: string, updates: Partial<Market>) => void;
  onDeleteMarket: (marketId: string) => void;
}

const SMS_TEMPLATES: SmsTemplate[] = [
  { id: 't1', tone: 'friendly', label: 'Rappel Courtois', content: "Bonjour, petit rappel concernant votre loyer de ce mois. N'hésitez pas à passer au bureau si vous avez une difficulté. - La Mairie" },
  { id: 't2', tone: 'firm', label: 'Mise en Demeure', content: "URGENT: Votre retard de paiement dépasse 30 jours. Veuillez régulariser votre situation sous 48h pour éviter une suspension de votre étal." },
  { id: 't3', tone: 'urgent', label: 'Alerte Sanitaire', content: "ALERTE: Désinfection du marché prévue demain à 06h00. Veuillez impérativement couvrir vos marchandises." },
];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ markets, stalls, reports, transactions, receipts, agents, expenses, paymentPlans, onSendSms, onApprovePlan, onAddMarket, onUpdateMarket, onDeleteMarket }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'finance' | 'space' | 'comms' | 'social' | 'geo' | 'markets'>('overview');
  const [selectedMarketId, setSelectedMarketId] = useState<string>('all');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  
  // Search & Stall Twin State
  const [stallSearch, setStallSearch] = useState('');
  const [stallFilter, setStallFilter] = useState<'all' | 'critical' | 'warning' | 'healthy'>('all');
  const [selectedStallForTwin, setSelectedStallForTwin] = useState<Stall | null>(null);
  
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

  // Charts Data
  const revenueByMarketData = markets.map(m => ({
    name: m.name.replace('Marché ', ''),
    Revenu: transactions.filter(t => t.marketId === m.id).reduce((acc, t) => acc + t.amount, 0),
    Objectif: m.targetRevenue
  }));

  const expenseBreakdown = [
    { name: 'Nettoyage', value: filteredExpenses.filter(e => e.category === 'cleaning').reduce((acc, e) => acc + e.amount, 0) },
    { name: 'Sécurité', value: filteredExpenses.filter(e => e.category === 'security').reduce((acc, e) => acc + e.amount, 0) },
    { name: 'Maintenance', value: filteredExpenses.filter(e => e.category === 'maintenance').reduce((acc, e) => acc + e.amount, 0) },
    { name: 'Élec/Eau', value: filteredExpenses.filter(e => e.category === 'electricity').reduce((acc, e) => acc + e.amount, 0) },
  ];
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  // Hygiene Heatmap Data Preparation
  const hygieneHeatmapData = useMemo(() => {
    const zones = Array.from(new Set(filteredStalls.map(s => s.zone))) as string[];
    return zones.map(zone => {
      const pendingReports = filteredReports.filter(r => 
        r.status === 'pending' && 
        (r.location.toLowerCase().includes(zone.toLowerCase().split(' ')[1] || 'xyz') || Math.random() > 0.8)
      ).length;

      return {
        zone,
        count: pendingReports,
        severity: pendingReports > 3 ? 'high' : pendingReports > 0 ? 'medium' : 'low'
      };
    });
  }, [filteredStalls, filteredReports]);

  // --- GEO DATA PREPARATION ---
  const geoStallData = useMemo(() => {
    let stalls = filteredStalls;
    if (geoViewFilter === 'critical_stalls') {
      stalls = stalls.filter(s => s.healthStatus === 'critical');
    } else if (geoViewFilter === 'agent_sanctions' || geoViewFilter === 'agent_payments') {
      stalls = []; // Hide stalls when focusing on agent actions
    }

    return stalls.map(s => ({
        x: s.coordinates ? s.coordinates.lat : 0.3920,
        y: s.coordinates ? s.coordinates.lng : 9.4540,
        name: s.number,
        type: 'stall',
        payload: s,
        status: s.healthStatus,
        z: 100 // Size for scatter point
    }));
  }, [filteredStalls, geoViewFilter]);

  const geoAgentData = useMemo(() => {
    let logs = agents.flatMap(a => a.logs.map(l => ({ ...l, agentName: a.name })));
    
    if (geoViewFilter === 'agent_sanctions') {
      logs = logs.filter(l => l.actionType === 'sanction_issued');
    } else if (geoViewFilter === 'agent_payments') {
      logs = logs.filter(l => l.actionType === 'payment_collected');
    } else if (geoViewFilter === 'critical_stalls') {
       logs = []; // Hide agent logs when focusing on critical stalls
    }

    return logs.map(l => {
        const [lat, lng] = l.location.split(',').map(Number);
        return {
            x: lat || 0.392,
            y: lng || 9.454,
            name: `${l.agentName}: ${l.actionType === 'sanction_issued' ? 'Sanction' : 'Paiement'}`,
            type: 'agent_log',
            payload: l,
            actionType: l.actionType,
            z: 50 // Size
        };
    });
  }, [agents, geoViewFilter]);


  const handleGenerateInsight = async () => {
    setIsLoadingAi(true);
    const marketName = selectedMarketId === 'all' ? "Toute la Ville (Vue Globale)" : markets.find(m => m.id === selectedMarketId)?.name || "Marché";
    const analysis = await generateMarketAnalysis(marketName, filteredStalls, reports, filteredTransactions, targetRevenue);
    setAiAnalysis(analysis);
    setIsLoadingAi(false);
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    onSendSms(selectedMarketId, smsAudience, customMessage, smsTone);
    alert(`Campagne envoyée à ${recipientCount} destinataires.`);
  };

  const handleToneChange = (tone: SmsTemplate['tone']) => {
      setSmsTone(tone);
      const template = SMS_TEMPLATES.find(t => t.tone === tone);
      if (template) setCustomMessage(template.content);
  };

  const filteredStallsForSearch = filteredStalls
    .filter(s => 
      s.number.toLowerCase().includes(stallSearch.toLowerCase()) || 
      s.occupantName?.toLowerCase().includes(stallSearch.toLowerCase())
    )
    .filter(s => stallFilter === 'all' || s.healthStatus === stallFilter);

  // GEO ANALYSIS HANDLER
  const handleGeoAudit = async () => {
    if (!selectedGeoPoint) return;
    setIsGeoAnalyzing(true);
    const lat = selectedGeoPoint.x;
    const lng = selectedGeoPoint.y;
    const context = selectedGeoPoint.type === 'stall' 
        ? `Étal ${selectedGeoPoint.payload.number} au ${markets.find(m=>m.id === selectedGeoPoint.payload.marketId)?.name}` 
        : `Action Agent à Libreville`;

    const result = await analyzeLocationWithMaps(lat, lng, context);
    setGeoAnalysis(result);
    setIsGeoAnalyzing(false);
  };

  // MARKET MANAGEMENT HANDLERS
  const openMarketModal = (market?: Market) => {
    if (market) {
      setEditingMarket(market);
      setMarketForm({ name: market.name, location: market.location, targetRevenue: market.targetRevenue });
    } else {
      setEditingMarket(null);
      setMarketForm({ name: '', location: '', targetRevenue: 0 });
    }
    setIsMarketModalOpen(true);
  };

  const handleMarketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMarket) {
      onUpdateMarket(editingMarket.id, marketForm);
    } else {
      onAddMarket(marketForm);
    }
    setIsMarketModalOpen(false);
  };

  const getCardStyle = (stall: Stall) => {
    if (stall.status === 'free') return 'border-gray-200 bg-gray-50 opacity-60';
    switch(stall.healthStatus) {
      case 'critical': return 'border-red-300 bg-red-50 ring-2 ring-red-100';
      case 'warning': return 'border-yellow-300 bg-yellow-50';
      default: return 'border-green-300 bg-green-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Building2 className="text-gray-600" />
            Administration Centrale
          </h2>
          <p className="text-sm text-gray-500">Mairie de Libreville • Gouvernance Intelligente</p>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
            <button onClick={() => setSelectedMarketId('all')} className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${selectedMarketId === 'all' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Ville Globale</button>
            {markets.map(m => (
                <button key={m.id} onClick={() => setSelectedMarketId(m.id)} className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${selectedMarketId === m.id ? 'bg-white shadow-sm' : 'text-gray-500'}`}>{m.name}</button>
            ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6 overflow-x-auto">
          <button onClick={() => setActiveTab('overview')} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${activeTab === 'overview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Activity className="w-4 h-4" /> Vue 360°
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
            <HeartHandshake className="w-4 h-4" /> Social & Dettes
          </button>
          <button onClick={() => setActiveTab('comms')} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${activeTab === 'comms' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <MessageSquare className="w-4 h-4" /> Smart Comms
          </button>
          <button onClick={() => setActiveTab('markets')} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${activeTab === 'markets' ? 'border-slate-800 text-slate-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Settings className="w-4 h-4" /> Config Marchés
          </button>
        </nav>
      </div>

      {/* --- OVERVIEW TAB --- */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* KPI Cards */}
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
                <p className="text-sm text-gray-500 font-medium mb-1">Recettes Totales</p>
                <h3 className="text-2xl font-bold text-gray-800">{totalRevenue.toLocaleString()} <span className="text-sm font-normal">FCFA</span></h3>
                <p className="text-xs text-green-500 mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3"/> +12% vs mois dernier</p>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 font-medium mb-1">Fraude Détectée</p>
                <h3 className="text-2xl font-bold text-red-600">{suspiciousStalls.length}</h3>
                <p className="text-xs text-gray-400 mt-1">Étals suspects (Impayés &gt;30j)</p>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 font-medium mb-1">Social</p>
                <h3 className="text-2xl font-bold text-pink-600">{paymentPlans.length}</h3>
                <p className="text-xs text-gray-400 mt-1">Plans de paiement actifs</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Performance par Marché</h3>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={revenueByMarketData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Revenu" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={40} />
                            <Line type="monotone" dataKey="Objectif" stroke="#ff7300" strokeWidth={2} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
             </div>

             <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-xl shadow-lg flex flex-col relative overflow-hidden">
                <div className="flex justify-between items-start mb-4 z-10">
                    <h3 className="font-bold flex items-center gap-2"><Sparkles className="w-4 h-4 text-yellow-400"/> Audit IA</h3>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar text-sm text-indigo-100 mb-4 z-10">
                    {aiAnalysis ? aiAnalysis : "Cliquez pour une analyse financière et sociale avancée."}
                </div>
                <button onClick={handleGenerateInsight} disabled={isLoadingAi} className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold border border-white/10 transition-colors z-10">
                    {isLoadingAi ? 'Analyse...' : 'Lancer Audit Stratégique'}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* --- MARKET CONFIGURATION TAB --- */}
      {activeTab === 'markets' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200">
             <div>
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                   <Settings className="w-5 h-5 text-gray-600" />
                   Gestion des Marchés Municipaux
                </h3>
                <p className="text-sm text-gray-500">Ajoutez, modifiez ou supprimez des marchés du périmètre de gestion.</p>
             </div>
             <button 
               onClick={() => openMarketModal()}
               className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-200"
             >
               <Plus className="w-4 h-4" /> Nouveau Marché
             </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {markets.map(market => (
               <div key={market.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-32 bg-gradient-to-r from-slate-700 to-slate-900 flex items-center justify-center">
                     <Building2 className="w-12 h-12 text-white opacity-20" />
                  </div>
                  <div className="p-6">
                     <h4 className="text-xl font-bold text-gray-800 mb-1">{market.name}</h4>
                     <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                        <MapPin className="w-4 h-4" /> {market.location}
                     </div>
                     
                     <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-6">
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Objectif Mensuel</p>
                        <p className="text-lg font-bold text-green-600">{market.targetRevenue.toLocaleString()} FCFA</p>
                     </div>

                     <div className="flex gap-2">
                        <button 
                          onClick={() => openMarketModal(market)}
                          className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
                        >
                          <Pencil className="w-3 h-3" /> Modifier
                        </button>
                        <button 
                          onClick={() => onDeleteMarket(market.id)}
                          className="flex-1 py-2 border border-red-200 bg-red-50 rounded-lg text-sm font-bold text-red-600 hover:bg-red-100 flex items-center justify-center gap-2"
                        >
                          <Trash className="w-3 h-3" /> Supprimer
                        </button>
                     </div>
                  </div>
               </div>
             ))}
          </div>

          {/* ADD/EDIT MARKET MODAL */}
          {isMarketModalOpen && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
               <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
                  <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
                     <h3 className="font-bold">{editingMarket ? 'Modifier le Marché' : 'Ajouter un Nouveau Marché'}</h3>
                     <button onClick={() => setIsMarketModalOpen(false)} className="hover:bg-white/20 p-1 rounded-full"><X className="w-5 h-5"/></button>
                  </div>
                  <form onSubmit={handleMarketSubmit} className="p-6 space-y-4">
                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Nom du Marché</label>
                        <input 
                           type="text" 
                           required
                           value={marketForm.name}
                           onChange={(e) => setMarketForm({...marketForm, name: e.target.value})}
                           className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                           placeholder="Ex: Marché Mont-Bouët"
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Localisation / Quartier</label>
                        <input 
                           type="text" 
                           required
                           value={marketForm.location}
                           onChange={(e) => setMarketForm({...marketForm, location: e.target.value})}
                           className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                           placeholder="Ex: Libreville Centre"
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Objectif de Revenus (Mensuel)</label>
                        <div className="flex items-center gap-2">
                           <input 
                              type="number" 
                              required
                              min="0"
                              value={marketForm.targetRevenue}
                              onChange={(e) => setMarketForm({...marketForm, targetRevenue: Number(e.target.value)})}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="50000000"
                           />
                           <span className="font-bold text-gray-500">FCFA</span>
                        </div>
                     </div>

                     <div className="pt-4 flex gap-3">
                        <button type="button" onClick={() => setIsMarketModalOpen(false)} className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-lg">Annuler</button>
                        <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg">Enregistrer</button>
                     </div>
                  </form>
               </div>
            </div>
          )}
        </div>
      )}

      {/* --- SPACE MANAGEMENT TAB (ENHANCED) --- */}
      {activeTab === 'space' && (
        <div className="space-y-6 animate-fade-in">
           
           {/* 1. HEATMAP & REVENUE CHART ROW */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             
             {/* Hygiene Heatmap */}
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
               <div className="flex justify-between items-center mb-4">
                 <div>
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        Heatmap Hygiène & Incidents
                    </h3>
                    <p className="text-xs text-gray-500">Visualisation des zones critiques nécessitant intervention.</p>
                 </div>
                 <div className="text-xs font-bold bg-gray-100 px-2 py-1 rounded">
                    {filteredReports.filter(r => r.status === 'pending').length} Incidents en cours
                 </div>
               </div>
               
               <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                 {hygieneHeatmapData.map((data, idx) => (
                   <div 
                      key={idx} 
                      className={`
                        p-4 rounded-lg border flex flex-col items-center justify-center text-center transition-all cursor-pointer hover:scale-105
                        ${data.severity === 'high' ? 'bg-red-50 border-red-300 shadow-red-100' : 
                          data.severity === 'medium' ? 'bg-orange-50 border-orange-300' : 
                          'bg-green-50 border-green-300'}
                      `}
                   >
                     <span className={`font-bold text-sm mb-1 ${
                        data.severity === 'high' ? 'text-red-800' : 
                        data.severity === 'medium' ? 'text-orange-800' : 'text-green-800'
                     }`}>
                        {data.zone}
                     </span>
                     <div className="flex items-center gap-1">
                        {data.severity === 'high' ? <Trash2 className="w-4 h-4 text-red-600"/> :
                         data.severity === 'medium' ? <Bug className="w-4 h-4 text-orange-600"/> :
                         <Sparkles className="w-4 h-4 text-green-600"/>}
                        <span className="font-bold text-lg">{data.count}</span>
                     </div>
                     <span className="text-[10px] text-gray-500 mt-1">signalements</span>
                   </div>
                 ))}
               </div>
             </div>

             {/* Revenue vs Target Chart */}
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="mb-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        Objectifs vs Réalisé
                    </h3>
                    <p className="text-xs text-gray-500">Performance financière par Marché (Suivi Agents).</p>
                </div>
                <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenueByMarketData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                            <Tooltip cursor={{fill: 'transparent'}} />
                            <Legend />
                            <Bar dataKey="Revenu" fill="#10B981" radius={[0, 4, 4, 0]} barSize={20} name="Encaissé" />
                            <Bar dataKey="Objectif" fill="#E5E7EB" radius={[0, 4, 4, 0]} barSize={20} name="Cible" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
             </div>
           </div>

           {/* 2. STALL GRID */}
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                 <div>
                    <h3 className="text-lg font-bold text-gray-800">Inventaire des Étals (Vue Grille)</h3>
                    <p className="text-sm text-gray-500">Utilisez le code couleur pour identifier les étals critiques.</p>
                 </div>
                 
                 <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input 
                        type="text" 
                        placeholder="Rechercher..." 
                        value={stallSearch}
                        onChange={(e) => setStallSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <select 
                            value={stallFilter}
                            onChange={(e) => setStallFilter(e.target.value as any)}
                            className="pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                        >
                            <option value="all">Tout</option>
                            <option value="critical">🔴 Critiques</option>
                            <option value="warning">🟡 Avertissements</option>
                            <option value="healthy">🟢 Sains</option>
                        </select>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                 {filteredStallsForSearch.slice(0, 16).map(stall => (
                    <div 
                      key={stall.id}
                      onClick={() => setSelectedStallForTwin(stall)} 
                      className={`
                        border-2 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer group
                        ${getCardStyle(stall)}
                      `}
                    >
                       <div className="flex justify-between items-start mb-3">
                          <span className="font-bold text-lg text-gray-800 group-hover:underline transition-colors">{stall.number}</span>
                          {stall.status === 'occupied' ? (
                             stall.healthStatus === 'critical' ? (
                                <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
                             ) : stall.healthStatus === 'warning' ? (
                                <AlertCircle className="w-5 h-5 text-yellow-600" />
                             ) : (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                             )
                          ) : (
                             <span className="text-xs text-gray-500 font-medium">Libre</span>
                          )}
                       </div>
                       
                       <p className="text-sm font-bold text-gray-700 mb-1 truncate">{stall.occupantName || 'Vacant'}</p>
                       <p className="text-xs text-gray-500 mb-2">{stall.zone}</p>
                       
                       {stall.status === 'occupied' && (
                           <div className="flex gap-1 mt-2">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${stall.complianceScore > 80 ? 'bg-green-100 border-green-200 text-green-700' : 'bg-red-100 border-red-200 text-red-700'}`}>
                                    Score IA: {stall.complianceScore}
                                </span>
                           </div>
                       )}
                    </div>
                 ))}
              </div>
              {filteredStallsForSearch.length > 16 && (
                <p className="text-center text-sm text-gray-500 mt-4">... et {filteredStallsForSearch.length - 16} autres résultats.</p>
              )}
           </div>
        </div>
      )}

      {/* --- GEO AUDIT TAB (ENHANCED WITH FILTERS) --- */}
      {activeTab === 'geo' && (
        <div className="space-y-6 animate-fade-in">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Radar className="w-6 h-6 text-teal-600" />
                                Analyse Géospatiale & Interventions
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Cartographie temps réel des points GPS (Étals & Agents).
                            </p>
                        </div>
                        
                        {/* MAP FILTERS */}
                        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                           <button 
                             onClick={() => setGeoViewFilter('all')}
                             className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${geoViewFilter === 'all' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}
                           >
                             Tout
                           </button>
                           <button 
                             onClick={() => setGeoViewFilter('critical_stalls')}
                             className={`px-3 py-1.5 text-xs font-bold rounded transition-colors flex items-center gap-1 ${geoViewFilter === 'critical_stalls' ? 'bg-red-500 shadow text-white' : 'text-gray-500'}`}
                           >
                             <AlertTriangle className="w-3 h-3"/> Zones Critiques
                           </button>
                           <button 
                             onClick={() => setGeoViewFilter('agent_sanctions')}
                             className={`px-3 py-1.5 text-xs font-bold rounded transition-colors flex items-center gap-1 ${geoViewFilter === 'agent_sanctions' ? 'bg-orange-500 shadow text-white' : 'text-gray-500'}`}
                           >
                             <Gavel className="w-3 h-3"/> Sanctions
                           </button>
                        </div>
                    </div>

                    <div className="h-[500px] w-full border border-slate-200 rounded-xl bg-slate-50 relative overflow-hidden">
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" dataKey="x" name="Latitude" domain={['auto', 'auto']} tickFormatter={(tick) => tick.toFixed(3)} />
                                    <YAxis type="number" dataKey="y" name="Longitude" domain={['auto', 'auto']} tickFormatter={(tick) => tick.toFixed(3)} />
                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return null; // Disable default tooltip to use custom click interaction
                                        }
                                        return null;
                                    }} />
                                    <Scatter name="Stalls" data={geoStallData} fill="#3b82f6" shape="square" onClick={(e) => {
                                        setSelectedGeoPoint(e.payload);
                                        setGeoAnalysis(null);
                                    }} />
                                    <Scatter name="Agent Actions" data={geoAgentData} shape="circle" onClick={(e) => {
                                        setSelectedGeoPoint(e.payload);
                                        setGeoAnalysis(null);
                                    }}>
                                        {geoAgentData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.actionType === 'payment_collected' ? '#22c55e' : entry.actionType === 'sanction_issued' ? '#ef4444' : '#64748b'} />
                                        ))}
                                    </Scatter>
                                </ScatterChart>
                            </ResponsiveContainer>
                            
                            <div className="absolute top-2 left-2 bg-white/80 p-2 rounded border border-gray-200 text-[10px] text-gray-500 pointer-events-none z-0">
                                Projection GPS: Libreville
                            </div>

                            {/* GEO INTELLIGENCE CARD (OVERLAY) */}
                            {selectedGeoPoint && (
                                <div className="absolute top-4 right-4 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50 animate-fade-in">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${selectedGeoPoint.type === 'stall' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                            {selectedGeoPoint.type === 'stall' ? 'Étal Fixe' : 'Action Agent'}
                                        </span>
                                        <button onClick={() => setSelectedGeoPoint(null)} className="text-gray-400 hover:text-gray-600"><Lock className="w-3 h-3"/></button>
                                    </div>
                                    
                                    <h4 className="font-bold text-gray-800 text-lg mb-1">{selectedGeoPoint.name}</h4>
                                    <p className="text-xs text-gray-500 font-mono mb-3 flex items-center gap-1">
                                        <MapPin className="w-3 h-3"/> {selectedGeoPoint.x.toFixed(5)}, {selectedGeoPoint.y.toFixed(5)}
                                    </p>

                                    {selectedGeoPoint.type === 'stall' ? (
                                        <div className="space-y-2 mb-4">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-gray-500">Occupant:</span>
                                                <span className="font-bold">{selectedGeoPoint.payload.occupantName || 'Vacant'}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-gray-500">Score IA:</span>
                                                <span className={`font-bold ${selectedGeoPoint.payload.complianceScore < 50 ? 'text-red-600' : 'text-green-600'}`}>{selectedGeoPoint.payload.complianceScore}/100</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-gray-500">Statut:</span>
                                                <span className={`font-bold uppercase ${selectedGeoPoint.payload.healthStatus === 'critical' ? 'text-red-600' : 'text-gray-800'}`}>{selectedGeoPoint.payload.healthStatus}</span>
                                            </div>
                                            <button 
                                                onClick={() => setSelectedStallForTwin(selectedGeoPoint.payload)}
                                                className="w-full mt-2 py-1.5 bg-slate-800 text-white text-xs font-bold rounded hover:bg-slate-700"
                                            >
                                                Ouvrir Dossier Complet
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 mb-4">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-gray-500">Détail:</span>
                                                <span className="font-bold truncate max-w-[140px]">{selectedGeoPoint.payload.details}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-gray-500">Montant:</span>
                                                <span className="font-bold">{selectedGeoPoint.payload.amount ? selectedGeoPoint.payload.amount + ' FCFA' : '-'}</span>
                                            </div>
                                            <div className="bg-gray-100 p-2 rounded mt-2 border border-gray-200">
                                                <p className="text-[10px] text-gray-500 font-bold flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Hash Inviolable:</p>
                                                <p className="text-[10px] font-mono break-all text-gray-600">{selectedGeoPoint.payload.hash.substring(0, 16)}...</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-3 border-t border-gray-100">
                                        <button 
                                            onClick={handleGeoAudit}
                                            disabled={isGeoAnalyzing}
                                            className="w-full py-2 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-teal-100"
                                        >
                                            {isGeoAnalyzing ? <div className="animate-spin w-3 h-3 border-2 border-teal-600 rounded-full border-t-transparent"></div> : <MapIcon className="w-3 h-3" />}
                                            Vérifier avec Google Maps
                                        </button>
                                    </div>
                                </div>
                            )}
                    </div>
                </div>
                
                {/* GOOGLE MAPS RESULTS PANEL */}
                <div className="bg-teal-900 text-teal-50 p-6 rounded-xl shadow-lg border border-teal-800">
                    <h3 className="font-bold flex items-center gap-2 mb-4 text-white">
                        <Radar className="w-5 h-5 text-teal-400"/> Audit de Terrain (IA)
                    </h3>
                    
                    {!geoAnalysis ? (
                        <div className="text-center text-teal-300 py-10 opacity-70">
                            <MapIcon className="w-12 h-12 mx-auto mb-3"/>
                            <p className="text-sm">Sélectionnez un point sur la carte et lancez l'audit pour vérifier la localisation réelle.</p>
                        </div>
                    ) : (
                        <div className="animate-fade-in">
                            <div className="mb-4 text-sm leading-relaxed text-teal-100 bg-white/10 p-4 rounded-lg border border-white/10">
                                {geoAnalysis.text}
                            </div>
                            
                            {geoAnalysis.links.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-teal-400 uppercase">Sources Google Maps :</p>
                                    {geoAnalysis.links.map((link, idx) => (
                                        <a 
                                            key={idx} 
                                            href={link.uri} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="block p-2 bg-white/5 hover:bg-white/10 rounded border border-white/5 text-xs text-white truncate transition-colors flex items-center gap-2"
                                        >
                                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                            {link.title}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
           </div>
        </div>
      )}

      {/* --- FINANCE TAB --- */}
      {activeTab === 'finance' && (
        <div className="space-y-6 animate-fade-in">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 md:col-span-2">
                 <h3 className="font-bold text-gray-800 mb-6">Balance Budgétaire (Net)</h3>
                 <div className="flex items-center gap-8">
                    <div>
                        <p className="text-sm text-gray-500">Recettes</p>
                        <p className="text-2xl font-bold text-green-600">+{totalRevenue.toLocaleString()}</p>
                    </div>
                    <div className="h-10 w-px bg-gray-200"></div>
                    <div>
                        <p className="text-sm text-gray-500">Dépenses</p>
                        <p className="text-2xl font-bold text-red-500">-{totalExpenses.toLocaleString()}</p>
                    </div>
                    <div className="h-10 w-px bg-gray-200"></div>
                    <div>
                        <p className="text-sm text-gray-500">Solde Net</p>
                        <p className={`text-3xl font-bold ${netBalance >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                            {netBalance.toLocaleString()} FCFA
                        </p>
                    </div>
                 </div>
                 <div className="mt-6 h-4 bg-gray-100 rounded-full overflow-hidden flex">
                    <div className="bg-green-500 h-full" style={{width: `${(totalRevenue / (totalRevenue + totalExpenses)) * 100}%`}}></div>
                    <div className="bg-red-500 h-full" style={{width: `${(totalExpenses / (totalRevenue + totalExpenses)) * 100}%`}}></div>
                 </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                 <h3 className="font-bold text-gray-800 mb-4">Répartition Dépenses</h3>
                 <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={expenseBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value">
                                {expenseBreakdown.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                 </div>
              </div>
           </div>

           {/* --- RECEIPTS ARCHIVE SECTION (NEW) --- */}
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
               <div className="flex justify-between items-center mb-6">
                   <h3 className="font-bold text-gray-800 flex items-center gap-2">
                       <Archive className="w-5 h-5 text-blue-600" /> Archives Reçus Numériques
                   </h3>
                   <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold">
                       {filteredReceipts.length} Documents Sécurisés
                   </span>
               </div>
               
               <div className="overflow-x-auto">
                   <table className="w-full text-sm text-left">
                       <thead className="bg-gray-50 text-gray-500 font-medium">
                           <tr>
                               <th className="p-3">Réf Reçu</th>
                               <th className="p-3">Date</th>
                               <th className="p-3">Vendeur / Étal</th>
                               <th className="p-3">Montant</th>
                               <th className="p-3">Hash (Preuve)</th>
                               <th className="p-3">GPS</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                           {filteredReceipts.slice(0, 10).map(receipt => (
                               <tr key={receipt.id} className="hover:bg-gray-50">
                                   <td className="p-3 font-mono font-bold text-gray-700">{receipt.id}</td>
                                   <td className="p-3 text-gray-600">{new Date(receipt.date).toLocaleDateString()}</td>
                                   <td className="p-3">
                                       <div className="font-bold text-gray-800">{receipt.stallNumber}</div>
                                       <div className="text-xs text-gray-500">{receipt.vendorName}</div>
                                   </td>
                                   <td className="p-3 font-bold text-green-600">{receipt.amount.toLocaleString()} FCFA</td>
                                   <td className="p-3">
                                       <div className="flex items-center gap-1 text-xs font-mono text-gray-400 bg-gray-100 p-1 rounded max-w-[100px] truncate">
                                           <Lock className="w-3 h-3"/> {receipt.hash.substring(0, 10)}...
                                       </div>
                                   </td>
                                   <td className="p-3 text-xs text-blue-600 underline cursor-pointer">{receipt.gpsCoordinates}</td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
                   {filteredReceipts.length > 10 && (
                       <div className="text-center p-3 text-sm text-gray-500">
                           + {filteredReceipts.length - 10} autres reçus archivés...
                       </div>
                   )}
               </div>
           </div>
        </div>
      )}

      {/* --- SOCIAL / DEBT TAB --- */}
      {activeTab === 'social' && (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-pink-50 border border-pink-100 p-6 rounded-xl">
                <h3 className="font-bold text-pink-800 flex items-center gap-2 mb-2">
                    <HeartHandshake className="w-5 h-5"/> Politique Sociale & Médiation
                </h3>
                <p className="text-sm text-pink-700">
                    Plutôt que d'expulser les commerçants en difficulté, proposez des échelonnements de paiement. 
                    Cela sécurise les recettes futures et maintient la paix sociale.
                </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
               <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                   <h3 className="font-bold text-gray-800">Plans de Paiement en Cours</h3>
               </div>
               <table className="w-full text-sm text-left">
                   <thead className="text-gray-500 bg-gray-50 border-b border-gray-100">
                       <tr>
                           <th className="p-3">Étal</th>
                           <th className="p-3">Dette Totale</th>
                           <th className="p-3">Échéance</th>
                           <th className="p-3">Progression</th>
                           <th className="p-3 text-right">Action</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                       {paymentPlans.map(plan => (
                           <tr key={plan.id} className="hover:bg-gray-50">
                               <td className="p-3 font-medium text-gray-800">{plan.stallNumber}</td>
                               <td className="p-3 text-red-600 font-mono">{plan.totalDebt.toLocaleString()} FCFA</td>
                               <td className="p-3">{plan.amountPerMonth.toLocaleString()} / mois ({plan.installments} mois)</td>
                               <td className="p-3">
                                   <div className="flex items-center gap-2">
                                       <div className="w-24 bg-gray-200 rounded-full h-2">
                                           <div className="bg-green-500 h-2 rounded-full" style={{width: `${plan.progress}%`}}></div>
                                       </div>
                                       <span className="text-xs text-gray-500">{plan.progress}%</span>
                                   </div>
                               </td>
                               <td className="p-3 text-right">
                                   {plan.status === 'active' ? (
                                       <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">Actif</span>
                                   ) : (
                                       <button onClick={() => onApprovePlan(plan.id)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-bold transition-colors">
                                           Valider
                                       </button>
                                   )}
                               </td>
                           </tr>
                       ))}
                   </tbody>
               </table>
           </div>
        </div>
      )}

      {/* --- COMMUNICATION TAB --- */}
      {activeTab === 'comms' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-purple-100 p-2 rounded-lg"><MessageSquare className="text-purple-600 w-6 h-6"/></div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Ciblage Intelligent</h2>
                            <p className="text-gray-500 text-sm">Le système filtre automatiquement les destinataires.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSendBroadcast} className="space-y-6">
                        {/* 1. Audience Selector */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-3">1. Qui souhaitez-vous contacter ?</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {[
                                    { id: 'all', label: 'Tout le Monde', desc: 'Info générale' },
                                    { id: 'unpaid_30', label: 'Retard > 30j', desc: 'Relance 1' },
                                    { id: 'unpaid_60', label: 'Retard > 60j', desc: 'Relance 2' },
                                    { id: 'zone_vivres', label: 'Zone Vivres', desc: 'Hygiène' },
                                    { id: 'vulnerable', label: 'Vulnérables', desc: 'Prioritaires' },
                                ].map((opt) => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setSmsAudience(opt.id as any)}
                                        className={`p-3 rounded-lg border text-left transition-all ${
                                            smsAudience === opt.id 
                                            ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500' 
                                            : 'bg-white border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="font-bold text-sm text-gray-800">{opt.label}</div>
                                        <div className="text-xs text-gray-500">{opt.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. Tone Selector */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-3">2. Quel ton adopter ?</label>
                            <div className="flex gap-4 overflow-x-auto pb-2">
                                {SMS_TEMPLATES.map((tmpl) => (
                                    <button
                                        key={tmpl.id}
                                        type="button"
                                        onClick={() => handleToneChange(tmpl.tone)}
                                        className={`flex-1 min-w-[120px] p-3 rounded-lg border text-center transition-all ${
                                            smsTone === tmpl.tone 
                                            ? (tmpl.tone === 'urgent' ? 'bg-red-50 border-red-500 text-red-700' : tmpl.tone === 'firm' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-green-50 border-green-500 text-green-700')
                                            : 'bg-white border-gray-200 text-gray-600'
                                        }`}
                                    >
                                        <span className="block font-bold text-sm capitalize">{tmpl.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 3. Message Preview */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">3. Message (Modifiable)</label>
                            <textarea 
                                required
                                value={customMessage}
                                onChange={(e) => setCustomMessage(e.target.value)}
                                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none h-32 resize-none text-sm bg-gray-50"
                            />
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                             <div className="text-sm">
                                <span className="text-gray-500">Destinataires estimés : </span>
                                <span className="font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">{recipientCount}</span>
                             </div>
                             <button type="submit" disabled={recipientCount === 0} className="py-3 px-6 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-purple-200 transition-all">
                                <Send className="w-5 h-5" />
                                Diffuser
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Sidebar Guidelines */}
            <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl">
                    <h4 className="font-bold text-yellow-800 flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4"/> Bonnes Pratiques</h4>
                    <ul className="text-sm text-yellow-800 space-y-2 list-disc pl-4">
                        <li>Privilégiez toujours le <b>Rappel Courtois</b> en première intention.</li>
                        <li>Les messages en <b>Mpongwè/Fang</b> sont générés automatiquement selon le profil du vendeur.</li>
                        <li>Évitez les envois après 20h00.</li>
                    </ul>
                </div>
                
                <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                    <h4 className="font-bold text-gray-800 mb-3">Historique Récent</h4>
                    <div className="space-y-3">
                        <div className="text-xs p-2 bg-gray-50 rounded border border-gray-100">
                            <div className="flex justify-between mb-1">
                                <span className="font-bold text-gray-700">Alerte Sanitaire</span>
                                <span className="text-gray-400">Hier</span>
                            </div>
                            <p className="text-gray-500 truncate">Désinfection zone B...</p>
                            <div className="mt-1 text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> 145 reçus</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
      
      {/* --- STALL DIGITAL TWIN MODAL --- */}
      {selectedStallForTwin && (
        <StallDigitalTwin 
          stall={selectedStallForTwin} 
          transactions={transactions.filter(t => t.stallNumber === selectedStallForTwin.number)}
          onClose={() => setSelectedStallForTwin(null)} 
        />
      )}
    </div>
  );
};

export default AdminDashboard;