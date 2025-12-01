
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Store, Flag, Menu, X, LogOut, Phone, Users, UserCircle, Briefcase, Scan, ShoppingBag } from 'lucide-react';
import MarketMap from './components/MarketMap';
import HygieneReportForm from './components/HygieneReport';
import AdminDashboard from './components/AdminDashboard';
import VendorDashboard from './components/VendorDashboard';
import AgentFieldTool from './components/AgentFieldTool';
import USSDSimulator from './components/USSDSimulator';
import PublicMarketplace from './components/PublicMarketplace';
import { Stall, HygieneReport, PaymentProvider, Transaction, VendorProfile, AppRole, Language, Market, Agent, Expense, SmsCampaign, Sanction, PaymentPlan, StallDocument, StallEmployee, StallActivity, StallMessage, StallHealth, AgentLog, Receipt, Product, ClientOrder, AppNotification } from './types';
import { t } from './services/translations';

// --- MOCK DATA GENERATION ---
const INITIAL_MARKETS: Market[] = [
  { id: 'm1', name: 'Marché Mont-Bouët', location: 'Libreville Centre', targetRevenue: 50000000 },
  { id: 'm2', name: 'Marché Akébé', location: '3ème Arrondissement', targetRevenue: 15000000 },
  { id: 'm3', name: 'Marché Louis', location: '1er Arrondissement', targetRevenue: 8000000 }
];

// Initial Logs for Agent
const INITIAL_AGENT_LOGS: AgentLog[] = [
    { id: 'log1', agentId: 'a1', actionType: 'shift_start', details: 'Début de service', timestamp: Date.now() - 3600000, hash: 'SHA256-INIT-8823', location: '0.3921, 9.4532' },
    { id: 'log2', agentId: 'a1', actionType: 'payment_collected', details: 'Loyer MB-10 (Espèces)', amount: 35000, timestamp: Date.now() - 1800000, hash: 'SHA256-TX-9923', location: '0.3925, 9.4540' },
    { id: 'log3', agentId: 'a1', actionType: 'payment_collected', details: 'Loyer MB-15 (Airtel)', amount: 15000, timestamp: Date.now() - 900000, hash: 'SHA256-TX-9945', location: '0.3930, 9.4545' },
    { id: 'log4', agentId: 'a1', actionType: 'sanction_issued', details: 'Sanction MB-22', timestamp: Date.now() - 300000, hash: 'SHA256-TX-9988', location: '0.3918, 9.4538' }
];

const AGENTS: Agent[] = [
  { id: 'a1', name: 'Jean Ntoutoume', marketId: 'm1', role: 'collector', performanceScore: 85, lastActive: Date.now(), cashInHand: 35000, isShiftActive: false, logs: INITIAL_AGENT_LOGS },
  { id: 'a2', name: 'Marie Obiang', marketId: 'm1', role: 'hygiene', performanceScore: 60, lastActive: Date.now(), cashInHand: 0, isShiftActive: false, logs: [] },
  { id: 'a3', name: 'Pierre Moussavou', marketId: 'm2', role: 'collector', performanceScore: 45, lastActive: Date.now() - 86400000, cashInHand: 0, isShiftActive: false, logs: [] },
  { id: 'a4', name: 'Sarah Bongo', marketId: 'm3', role: 'collector', performanceScore: 98, lastActive: Date.now(), cashInHand: 0, isShiftActive: false, logs: [] },
];

const MOCK_EXPENSES: Expense[] = [
  { id: 'e1', marketId: 'm1', category: 'cleaning', amount: 1500000, date: Date.now() - 86400000 * 2, description: 'Société CleanGabon - Prestation Hebdo' },
  { id: 'e2', marketId: 'm1', category: 'security', amount: 800000, date: Date.now() - 86400000 * 5, description: 'Gardiennage Nuit - Zone A' },
  { id: 'e3', marketId: 'm2', category: 'maintenance', amount: 250000, date: Date.now() - 86400000 * 10, description: 'Réparation Toiture Hall' },
  { id: 'e4', marketId: 'm1', category: 'electricity', amount: 450000, date: Date.now() - 86400000 * 15, description: 'Facture SEEG' },
];

// Helper to generate Deep Data
const generateDocuments = (): StallDocument[] => [
  { id: 'd1', type: 'lease_agreement', status: 'valid', expiryDate: Date.now() + 1000 * 60 * 60 * 24 * 365 },
  { id: 'd2', type: 'insurance', status: Math.random() > 0.8 ? 'expired' : 'valid', expiryDate: Date.now() + 1000 * 60 * 60 * 24 * 30 },
  { id: 'd3', type: 'hygiene_cert', status: 'valid', expiryDate: Date.now() + 1000 * 60 * 60 * 24 * 90 },
];

const generateEmployees = (): StallEmployee[] => [
  { id: 'e1', name: 'Employé 1', role: 'seller', phone: '07000000', isRegistered: true },
  { id: 'e2', name: 'Aide Familial', role: 'helper', phone: '06000000', isRegistered: Math.random() > 0.5 },
];

const generateActivity = (): StallActivity[] => [
  { id: 'act1', type: 'payment', date: Date.now() - 1000 * 60 * 60 * 24 * 2, description: 'Paiement Loyer Mars via Airtel Money' },
  { id: 'act2', type: 'inspection', date: Date.now() - 1000 * 60 * 60 * 24 * 15, description: 'Inspection Hygiène - Note 4/5', agentName: 'Marie Obiang' },
  { id: 'act3', type: 'document_update', date: Date.now() - 1000 * 60 * 60 * 24 * 60, description: 'Renouvellement Bail Annuel' },
];

const generateMessages = (): StallMessage[] => [
    { id: 'm1', direction: 'outbound', content: 'Bonjour, merci de mettre à jour votre assurance incendie.', date: Date.now() - 86400000 * 5, read: true },
    { id: 'm2', direction: 'inbound', content: 'D\'accord, je passe au bureau demain.', date: Date.now() - 86400000 * 4, read: true },
];

const getRandomCoords = (baseLat: number, baseLng: number, spread: number) => {
    return {
        lat: baseLat + (Math.random() - 0.5) * spread,
        lng: baseLng + (Math.random() - 0.5) * spread
    };
};

const createStall = (i: number, marketId: string, prefix: string, basePrice: number, zone: string): Stall => {
  const isOccupied = Math.random() > 0.3;
  const isUnpaid = isOccupied && Math.random() > 0.8;
  const documents = generateDocuments();
  const hasDocIssue = documents.some(d => d.status === 'expired');
  
  // Determine Health Status
  let health: StallHealth = 'healthy';
  if (isUnpaid || hasDocIssue) health = 'warning';
  if (isUnpaid && Math.random() > 0.5) health = 'critical'; // Simulating severe debt
  
  // Base coords for Mont-Bouet approx
  const coords = getRandomCoords(0.3920, 9.4540, 0.0030);

  return {
      id: `${marketId}-s${i}`, marketId, number: `${prefix}-${i + 1}`,
      zone,
      price: basePrice,
      status: isOccupied ? 'occupied' : 'free',
      size: 'M', productType: 'vivres',
      surfaceArea: 10,
      lastPaymentDate: isUnpaid ? Date.now() - 45 * 24 * 60 * 60 * 1000 : Date.now(),
      occupantName: isOccupied ? `Vendeur ${prefix} ${i+1}` : undefined,
      occupantPhone: '07 55 44 33',
      documents,
      employees: generateEmployees(),
      activityLog: generateActivity(),
      messages: isOccupied ? generateMessages() : [],
      complianceScore: health === 'critical' ? 45 : health === 'warning' ? 70 : 95,
      healthStatus: health,
      isPriority: Math.random() > 0.9,
      coordinates: coords // Injected coordinates
  };
};

const generateStalls = (): Stall[] => {
  let stalls: Stall[] = [];
  
  // Mont-Bouët
  stalls = stalls.concat(Array.from({ length: 50 }, (_, i) => 
    createStall(i, 'm1', 'MB', 35000, i < 20 ? 'Zone Vivres' : 'Zone Textile')
  ));
  // Akébé
  stalls = stalls.concat(Array.from({ length: 30 }, (_, i) => 
    createStall(i, 'm2', 'AK', 15000, 'Zone Unique')
  ));
  // Louis
  stalls = stalls.concat(Array.from({ length: 15 }, (_, i) => 
    createStall(i, 'm3', 'L', 60000, 'Carré VIP')
  ));

  return stalls;
};

const INITIAL_STALLS = generateStalls();

const generateTransactions = (stalls: Stall[]): Transaction[] => {
  // Only generate transactions for occupied stalls that have paid recently
  return stalls
    .filter(s => s.status === 'occupied' && s.lastPaymentDate && (Date.now() - s.lastPaymentDate < 30 * 24 * 60 * 60 * 1000))
    .map(s => ({
      id: `tx-${s.id}`, marketId: s.marketId,
      amount: s.price, date: s.lastPaymentDate!,
      type: 'rent', provider: Math.random() > 0.5 ? 'orange' : 'airtel',
      stallNumber: s.number, reference: 'REF-' + Math.random().toString(36).substr(2,5),
      status: 'completed'
    }));
};

const INITIAL_TRANSACTIONS = generateTransactions(INITIAL_STALLS);

const INITIAL_RECEIPTS: Receipt[] = INITIAL_TRANSACTIONS.map(tx => ({
  id: `REC-${tx.id}`,
  transactionId: tx.id,
  stallNumber: tx.stallNumber || 'UNK',
  vendorName: 'Vendeur Existant',
  amount: tx.amount,
  date: tx.date,
  agentId: 'a1',
  marketId: tx.marketId,
  hash: `SHA256-${Math.random().toString(36).substr(2,16).toUpperCase()}`,
  gpsCoordinates: '0.3920, 9.4540'
}));

const INITIAL_REPORTS: HygieneReport[] = [
  { id: '1', marketId: 'm1', category: 'waste', description: 'Montagne de déchets entrée nord', location: 'Portail 1', status: 'pending', timestamp: Date.now(), isAnonymous: false },
  { id: '2', marketId: 'm1', category: 'water', description: 'Caniveau bouché', location: 'Zone Poisson', status: 'pending', timestamp: Date.now(), isAnonymous: true },
  { id: '3', marketId: 'm2', category: 'infrastructure', description: 'Toiture qui fuit', location: 'Allée C', status: 'resolved', timestamp: Date.now() - 86400000, isAnonymous: false },
];

const MOCK_VENDOR: VendorProfile = {
  id: 'V-LBV-2024-001',
  name: 'Mme. Ondo Clémence',
  phone: '07 23 45 67',
  hygieneScore: 4.5,
  isVulnerable: true,
  language: 'fr'
};

const INITIAL_PLANS: PaymentPlan[] = [
    { id: 'p1', vendorId: 'v_random', stallNumber: 'MB-12', totalDebt: 105000, installments: 3, amountPerMonth: 35000, startDate: Date.now(), status: 'active', progress: 33, installmentsList: [{month:1, status:'paid', dueDate: Date.now()-86400000}, {month:2, status:'pending', dueDate: Date.now()+86400000*30}] },
    { id: 'p2', vendorId: 'v_random2', stallNumber: 'AK-5', totalDebt: 45000, installments: 2, amountPerMonth: 22500, startDate: Date.now(), status: 'active', progress: 0 },
];

const INITIAL_SANCTIONS: Sanction[] = [
    { id: 's1', vendorId: MOCK_VENDOR.id, marketId: 'm1', type: 'warning', reason: 'Encombrement allée centrale', date: Date.now() - 86400000 * 3, status: 'active', issuedBy: 'a1' }
];

const INITIAL_PRODUCTS: Product[] = [
    { id: 'p1', stallId: 'm1-s1', name: 'Manioc Frais', price: 500, unit: 'kg', category: 'vivres', inStock: true, origin: 'Local (Kango)', description: 'Manioc doux fraîchement récolté ce matin.' },
    { id: 'p2', stallId: 'm1-s1', name: 'Banane Plantain', price: 2000, unit: 'régime', category: 'vivres', inStock: true, origin: 'Cameroun', description: 'Gros régime de plantain mûr à point.' },
    { id: 'p3', stallId: 'm1-s25', name: 'Tissu Wax Hollandais', price: 15000, unit: 'pièce', category: 'textile', inStock: true, origin: 'Import', description: 'Véritable Wax hollandais 6 yards, motifs exclusifs.' },
];
const INITIAL_ORDERS: ClientOrder[] = [];

// Helper for local storage
const loadState = <T,>(key: string, fallback: T): T => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
};

const App: React.FC = () => {
  const [role, setRole] = useState<AppRole | null>(null);
  const [currentView, setCurrentView] = useState<'map' | 'report' | 'dashboard' | 'profile' | 'agent-tool' | 'marketplace'>('map');
  const [language, setLanguage] = useState<Language>('fr');
  const [showUSSD, setShowUSSD] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // App Data with Persistence
  const [markets, setMarkets] = useState<Market[]>(() => loadState('markets', INITIAL_MARKETS));
  const [stalls, setStalls] = useState<Stall[]>(() => loadState('stalls', INITIAL_STALLS));
  const [reports, setReports] = useState<HygieneReport[]>(() => loadState('reports', INITIAL_REPORTS));
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadState('transactions', INITIAL_TRANSACTIONS));
  const [receipts, setReceipts] = useState<Receipt[]>(() => loadState('receipts', INITIAL_RECEIPTS));
  const [expenses, setExpenses] = useState<Expense[]>(() => loadState('expenses', MOCK_EXPENSES));
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>(() => loadState('paymentPlans', INITIAL_PLANS));
  const [sanctions, setSanctions] = useState<Sanction[]>(() => loadState('sanctions', INITIAL_SANCTIONS));
  const [agents, setAgents] = useState<Agent[]>(() => loadState('agents', AGENTS));
  const [products, setProducts] = useState<Product[]>(() => loadState('products', INITIAL_PRODUCTS));
  const [orders, setOrders] = useState<ClientOrder[]>(() => loadState('orders', INITIAL_ORDERS));
  
  const [userProfile, setUserProfile] = useState<VendorProfile>(() => loadState('userProfile', MOCK_VENDOR));
  const [notifications, setNotifications] = useState<AppNotification[]>(() => loadState('notifications', []));
  
  // Global Market Context for Public View
  const [selectedPublicMarketId, setSelectedPublicMarketId] = useState<string>('m1'); // Default to Mont-Bouet

  // Persist State Effects
  useEffect(() => localStorage.setItem('markets', JSON.stringify(markets)), [markets]);
  useEffect(() => localStorage.setItem('stalls', JSON.stringify(stalls)), [stalls]);
  useEffect(() => localStorage.setItem('reports', JSON.stringify(reports)), [reports]);
  useEffect(() => localStorage.setItem('transactions', JSON.stringify(transactions)), [transactions]);
  useEffect(() => localStorage.setItem('receipts', JSON.stringify(receipts)), [receipts]);
  useEffect(() => localStorage.setItem('expenses', JSON.stringify(expenses)), [expenses]);
  useEffect(() => localStorage.setItem('paymentPlans', JSON.stringify(paymentPlans)), [paymentPlans]);
  useEffect(() => localStorage.setItem('sanctions', JSON.stringify(sanctions)), [sanctions]);
  useEffect(() => localStorage.setItem('agents', JSON.stringify(agents)), [agents]);
  useEffect(() => localStorage.setItem('products', JSON.stringify(products)), [products]);
  useEffect(() => localStorage.setItem('orders', JSON.stringify(orders)), [orders]);
  useEffect(() => localStorage.setItem('notifications', JSON.stringify(notifications)), [notifications]);

  // If role is Vendor, we assume they are in Mont-Bouët (m1) by default for the map view
  const activeMarketId = 'm1'; 

  const addNotification = (notif: Omit<AppNotification, 'id' | 'date' | 'read'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: `NOT-${Date.now()}`,
      date: Date.now(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // Market Management Handlers
  const handleAddMarket = (marketData: Omit<Market, 'id'>) => {
    const newId = `m-${Date.now()}`;
    const newMarket: Market = {
      ...marketData,
      id: newId
    };
    setMarkets(prev => [...prev, newMarket]);

    // Auto-generate some empty stalls for this new market so the map isn't blank
    const newStalls = Array.from({ length: 10 }, (_, i) => 
        createStall(i, newId, newMarket.name.substring(0, 2).toUpperCase(), 25000, 'Zone Nouvelle')
    );
    setStalls(prev => [...prev, ...newStalls]);
    
    addNotification({
        recipientRole: 'admin',
        title: 'Nouveau Marché Créé',
        message: `${newMarket.name} a été ajouté avec 10 étals vides générés.`,
        type: 'success'
    });
  };

  const handleUpdateMarket = (marketId: string, updates: Partial<Market>) => {
    setMarkets(prev => prev.map(m => m.id === marketId ? { ...m, ...updates } : m));
  };

  const handleDeleteMarket = (marketId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce marché ? Cette action est irréversible.")) {
      setMarkets(prev => prev.filter(m => m.id !== marketId));
    }
  };

  // Handlers
  const handleReserveStall = (stallId: string, provider: PaymentProvider, isPriority: boolean) => {
    const stall = stalls.find(s => s.id === stallId);
    if (!stall) return;

    setStalls(prev => prev.map(s => 
      s.id === stallId ? { 
        ...s, 
        status: 'occupied', 
        occupantName: userProfile.name, 
        occupantPhone: userProfile.phone,
        isPriority, 
        lastPaymentDate: Date.now(),
        complianceScore: 80, // New occupant starts good
        healthStatus: 'healthy',
        messages: []
      } : s
    ));

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      marketId: stall.marketId,
      amount: stall.price,
      date: Date.now(),
      type: 'rent',
      provider,
      stallNumber: stall.number,
      reference: Math.random().toString(36).substr(2, 6).toUpperCase(),
      status: 'completed'
    };
    setTransactions(prev => [...prev, newTx]);
    setUserProfile(prev => ({ ...prev, stallId }));
    
    addNotification({
        recipientRole: 'admin',
        title: 'Nouvelle Réservation',
        message: `${userProfile.name} a réservé l'étal ${stall.number}.`,
        type: 'info'
    });
    
    setCurrentView('profile');
  };

  const handleCashCollection = (stallId: string, amount: number, gpsCoordinates: string) => {
    const stall = stalls.find(s => s.id === stallId);
    if (!stall) return;

    // 1. Update Stall Status
    setStalls(prev => prev.map(s => 
      s.id === stallId ? { ...s, lastPaymentDate: Date.now(), healthStatus: amount >= s.price ? 'healthy' : 'warning' } : s
    ));

    // 2. Create Transaction
    const txId = `tx-cash-${Date.now()}`;
    const newTx: Transaction = {
      id: txId,
      marketId: stall.marketId,
      amount: amount,
      date: Date.now(),
      type: 'rent',
      provider: 'cash',
      stallNumber: stall.number,
      reference: 'CASH-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
      status: 'completed',
      collectedBy: 'a1' // Assuming logged in as Jean
    };
    setTransactions(prev => [...prev, newTx]);

    // 3. SECURE LOGGING & CASH UPDATE
    const hash = `SHA256-${Math.random().toString(36).substr(2, 8).toUpperCase()}-${Date.now()}`;

    const newLog: AgentLog = {
      id: `log-${Date.now()}`,
      agentId: 'a1',
      actionType: 'payment_collected',
      details: `Encaissement Stall ${stall.number} (Partiel: ${amount})`,
      amount: amount,
      timestamp: Date.now(),
      hash: hash,
      location: gpsCoordinates
    };

    setAgents(prev => prev.map(a => 
      a.id === 'a1' 
        ? { ...a, cashInHand: a.cashInHand + amount, logs: [...a.logs, newLog] }
        : a
    ));

    // 4. GENERATE DIGITAL RECEIPT (OFFICIAL)
    const newReceipt: Receipt = {
        id: `REC-${Date.now()}`,
        transactionId: txId,
        stallNumber: stall.number,
        vendorName: stall.occupantName || 'Vendeur',
        amount: amount,
        date: Date.now(),
        agentId: 'a1',
        marketId: stall.marketId,
        hash: hash,
        gpsCoordinates: gpsCoordinates
    };
    setReceipts(prev => [newReceipt, ...prev]);

    // Notify Admin
    addNotification({
        recipientRole: 'admin',
        title: 'Encaissement Terrain',
        message: `Agent a1 a collecté ${amount} FCFA sur l'étal ${stall.number}.`,
        type: 'success'
    });
  };

  const handleIssueSanction = (stallId: string, type: 'warning' | 'fine', reason: string, evidenceUrl?: string) => {
      const stall = stalls.find(s => s.id === stallId);
      const newSanction: Sanction = {
          id: `s-${Date.now()}`,
          vendorId: 'unknown', 
          marketId: 'm1',
          type,
          reason,
          date: Date.now(),
          status: 'active',
          issuedBy: 'a1',
          evidenceUrl
      };
      setSanctions(prev => [newSanction, ...prev]);
      // Downgrade stall health
      setStalls(prev => prev.map(s => s.id === stallId ? { ...s, healthStatus: 'warning' } : s));

      // SECURE LOGGING
      const gpsLocation = stall?.coordinates 
        ? `${stall.coordinates.lat.toFixed(4)}, ${stall.coordinates.lng.toFixed(4)}` 
        : '0.392, 9.454';

      const newLog: AgentLog = {
        id: `log-${Date.now()}`,
        agentId: 'a1',
        actionType: 'sanction_issued',
        details: `Sanction (${type}) Stall ${stall?.number}: ${reason}`,
        timestamp: Date.now(),
        hash: `SHA256-${Math.random().toString(36).substr(2, 8).toUpperCase()}-${Date.now()}`,
        location: gpsLocation,
        evidenceUrl
      };

      setAgents(prev => prev.map(a => 
        a.id === 'a1' ? { ...a, logs: [...a.logs, newLog] } : a
      ));

      addNotification({
        recipientRole: 'admin',
        title: 'Sanction Émise',
        message: `Sanction type ${type} sur étal ${stall?.number}.`,
        type: 'warning'
      });
  };

  const handleShiftAction = (action: 'start' | 'end' | 'deposit') => {
    const newLog: AgentLog = {
        id: `log-${Date.now()}`,
        agentId: 'a1',
        actionType: action === 'deposit' ? 'cash_deposit' : action === 'start' ? 'shift_start' : 'shift_end',
        details: action === 'deposit' ? 'Versement intermédiaire' : action === 'start' ? 'Prise de service' : 'Fin de service (Clôture)',
        timestamp: Date.now(),
        hash: `SHA256-SYS-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        location: '0.3921, 9.4532'
    };

    setAgents(prev => prev.map(a => {
        if (a.id === 'a1') {
            const updates: Partial<Agent> = { logs: [...a.logs, newLog] };
            if (action === 'start') updates.isShiftActive = true;
            if (action === 'end') { updates.isShiftActive = false; updates.cashInHand = 0; } // Assuming deposit at end
            if (action === 'deposit') { updates.cashInHand = 0; }
            return { ...a, ...updates };
        }
        return a;
    }));
  };

  const handleSendSms = (marketId: string, audience: SmsCampaign['targetAudience'], message: string, tone: any) => {
    console.log(`Sending ${tone} SMS to ${audience} in ${marketId}: ${message}`);
    addNotification({
        recipientRole: 'admin',
        title: 'Campagne SMS Envoyée',
        message: `Message envoyé à l'audience ${audience}.`,
        type: 'info'
    });
  };

  const handleReportSubmit = (reportData: any) => {
    setReports(prev => [{ ...reportData, id: `R-${Date.now()}`, marketId: 'm1', timestamp: Date.now(), status: 'pending' }, ...prev]);
    addNotification({
        recipientRole: 'admin',
        title: 'Signalement Hygiène',
        message: `Nouveau signalement reçu : ${reportData.category}.`,
        type: 'warning'
    });
  };

  const handleApprovePlan = (planId: string) => {
      setPaymentPlans(prev => prev.map(p => p.id === planId ? { ...p, status: 'active' } : p));
      addNotification({
        recipientRole: 'vendor',
        recipientId: userProfile.id, // Only relevant if user is vendor
        title: 'Plan de Paiement Validé',
        message: 'Votre échéancier a été accepté par la mairie.',
        type: 'success'
      });
  };

  // --- PRODUCT & ORDER HANDLERS ---
  const handleAddProduct = (product: Omit<Product, 'id'>) => {
    const newProd: Product = { ...product, id: `prod-${Date.now()}` };
    setProducts(prev => [...prev, newProd]);
  };

  const handleDeleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleCreateOrder = (orderData: Omit<ClientOrder, 'id' | 'date' | 'status'>) => {
    const newOrder: ClientOrder = {
        ...orderData,
        id: `ORD-${Math.random().toString(36).substr(2,5).toUpperCase()}`,
        date: Date.now(),
        status: 'paid' // Simulated immediate payment
    };
    setOrders(prev => [newOrder, ...prev]);
    
    // Notify the vendor (assuming we are the vendor for the demo if stall matches)
    addNotification({
        recipientRole: 'vendor',
        title: 'Nouvelle Commande !',
        message: `Commande de ${orderData.totalAmount} FCFA reçue.`,
        type: 'success'
    });
  };

  const handleUpdateOrderStatus = (orderId: string, status: ClientOrder['status']) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  };

  // Role Selection Screen (Landing)
  if (!role) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-8 lg:p-12 flex flex-col justify-center space-y-8">
            <div>
              <h1 className="text-4xl font-extrabold text-green-900 mb-2">MarchéConnect</h1>
              <p className="text-gray-500">Plateforme de Gouvernance Urbaine et d'Inclusion Financière.</p>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Accès Public :</p>
              
              <button onClick={() => { setRole('guest'); setCurrentView('marketplace'); }} className="w-full p-4 rounded-xl border-2 border-slate-100 hover:border-slate-500 hover:bg-slate-50 transition-all flex items-center gap-4 group">
                <div className="bg-slate-100 p-3 rounded-full text-slate-600 group-hover:bg-slate-600 group-hover:text-white transition-colors"><ShoppingBag /></div>
                <div className="text-left"><h3 className="font-bold text-gray-800">Vitrine Citoyenne</h3><p className="text-xs text-gray-500">Rechercher Produits & Vendeurs</p></div>
              </button>

              <div className="my-2 h-px bg-gray-100"></div>

              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Espace Connecté :</p>
              
              <button onClick={() => { setRole('vendor'); setCurrentView('map'); }} className="w-full p-4 rounded-xl border-2 border-green-100 hover:border-green-500 hover:bg-green-50 transition-all flex items-center gap-4 group">
                <div className="bg-green-100 p-3 rounded-full text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors"><Store /></div>
                <div className="text-left"><h3 className="font-bold text-gray-800">Commerçant</h3><p className="text-xs text-gray-500">Réserver, Payer, Signaler</p></div>
              </button>
              
              <button onClick={() => { setRole('mediator'); setCurrentView('map'); }} className="w-full p-4 rounded-xl border-2 border-orange-100 hover:border-orange-500 hover:bg-orange-50 transition-all flex items-center gap-4 group">
                <div className="bg-orange-100 p-3 rounded-full text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors"><Users /></div>
                <div className="text-left"><h3 className="font-bold text-gray-800">Médiateur</h3><p className="text-xs text-gray-500">Assistance & Inclusion Numérique</p></div>
              </button>

              <div className="my-2 h-px bg-gray-100"></div>
              
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Accès Mairie :</p>
              
              <button onClick={() => { setRole('admin'); setCurrentView('dashboard'); }} className="w-full p-4 rounded-xl border-2 border-purple-100 hover:border-purple-500 hover:bg-purple-50 transition-all flex items-center gap-4 group">
                <div className="bg-purple-100 p-3 rounded-full text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors"><Briefcase /></div>
                <div className="text-left"><h3 className="font-bold text-gray-800">Administrateur</h3><p className="text-xs text-gray-500">Finance, Audit & Stratégie</p></div>
              </button>

              <button onClick={() => { setRole('agent'); setCurrentView('agent-tool'); }} className="w-full p-4 rounded-xl border-2 border-blue-100 hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center gap-4 group">
                <div className="bg-blue-100 p-3 rounded-full text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors"><Scan /></div>
                <div className="text-left"><h3 className="font-bold text-gray-800">Agent de Collecte</h3><p className="text-xs text-gray-500">Terminal POS & Contrôle</p></div>
              </button>
            </div>

            <div className="pt-4 border-t border-gray-100">
               <button onClick={() => setShowUSSD(true)} className="text-sm text-gray-500 hover:text-green-700 flex items-center gap-2">
                 <Phone className="w-4 h-4" /> Simuler interface USSD (*#123#)
               </button>
            </div>
          </div>
          <div className="hidden md:block bg-[url('https://images.unsplash.com/photo-1542282088-fe8426682b8f?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center">
            <div className="h-full w-full bg-slate-900/60 backdrop-blur-[1px] p-10 flex flex-col justify-end text-white">
              <h2 className="text-3xl font-bold mb-2">Modernisation des Marchés</h2>
              <p className="text-slate-200">Gérez, Sécurisez et Développez l'économie locale avec transparence.</p>
            </div>
          </div>
        </div>
        {showUSSD && <USSDSimulator onClose={() => setShowUSSD(false)} />}
      </div>
    );
  }

  // PUBLIC MARKETPLACE LAYOUT (NO AUTH)
  if (role === 'guest' && currentView === 'marketplace') {
      return (
          <PublicMarketplace 
            stalls={stalls} 
            markets={markets} 
            products={products}
            activeMarketId={selectedPublicMarketId}
            onMarketChange={setSelectedPublicMarketId}
            onBack={() => { setRole(null); setCurrentView('map'); }}
            onCreateOrder={handleCreateOrder}
          />
      );
  }

  // Authenticated Layout
  const NavItem = ({ view, icon: Icon, label }: { view: typeof currentView, icon: any, label: string }) => (
    <button
      onClick={() => { setCurrentView(view); setIsMobileMenuOpen(false); }}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all w-full md:w-auto text-sm font-medium
        ${currentView === view 
          ? (role === 'admin' ? 'bg-purple-600 text-white' : role === 'agent' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white') 
          : 'text-gray-600 hover:bg-gray-100'}
      `}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${role === 'admin' ? 'bg-purple-600' : role === 'agent' ? 'bg-blue-600' : role === 'mediator' ? 'bg-orange-500' : 'bg-green-600'}`}>
                <Store className="w-5 h-5 text-white" />
              </div>
              <div className="leading-tight">
                <h1 className="text-lg font-bold text-gray-900">MarchéConnect</h1>
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                  {role === 'admin' ? 'Administration' : role === 'agent' ? 'Terrain' : role === 'mediator' ? 'Assistance' : 'Espace Vendeur'}
                </p>
              </div>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {(role === 'vendor' || role === 'mediator') && (
                <>
                  <NavItem view="map" icon={Store} label={t(language, 'reserve_stall')} />
                  <NavItem view="report" icon={Flag} label={t(language, 'report_issue')} />
                  <NavItem view="profile" icon={UserCircle} label={t(language, 'my_account')} />
                </>
              )}
              {role === 'admin' && (
                <>
                  <NavItem view="dashboard" icon={LayoutDashboard} label="Pilotage & Finances" />
                </>
              )}
               {role === 'agent' && (
                <>
                  <NavItem view="agent-tool" icon={Scan} label="Terminal Agent" />
                </>
              )}
              
              <div className="h-6 w-px bg-gray-200 mx-2"></div>
              
              {/* Language Switcher */}
              <div className="flex gap-2 mr-4">
                 {(['fr', 'fang', 'mpongwe'] as Language[]).map(lang => (
                   <button 
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`text-xs px-2 py-1 rounded uppercase font-bold ${language === lang ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500'}`}
                   >
                     {lang.slice(0, 2)}
                   </button>
                 ))}
              </div>

              <button onClick={() => setRole(null)} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Déconnexion">
                <LogOut className="w-5 h-5" />
              </button>
            </nav>

            <button className="md:hidden p-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t p-4 space-y-2 absolute w-full shadow-xl z-50">
             {(role === 'vendor' || role === 'mediator') && (
                <>
                  <NavItem view="map" icon={Store} label="Réserver" />
                  <NavItem view="report" icon={Flag} label="Signaler" />
                  <NavItem view="profile" icon={UserCircle} label="Compte" />
                </>
              )}
              {role === 'admin' && <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />}
              {role === 'agent' && <NavItem view="agent-tool" icon={Scan} label="Outil Collecte" />}
              <div className="border-t pt-2 mt-2">
                <button onClick={() => setRole(null)} className="flex items-center gap-3 px-4 py-2 text-red-600 w-full">
                  <LogOut className="w-4 h-4" /> Déconnexion
                </button>
              </div>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'map' && (
          <div className="animate-fade-in space-y-6">
            {role === 'mediator' && (
              <div className="bg-orange-100 border-l-4 border-orange-500 p-4 rounded-r shadow-sm">
                <div className="flex items-center gap-3">
                   <Users className="text-orange-600" />
                   <div>
                     <p className="font-bold text-orange-800">Mode Médiation Activé</p>
                     <p className="text-sm text-orange-700">Vous assistez un citoyen. Vérifiez son identité avant toute réservation.</p>
                   </div>
                </div>
              </div>
            )}
            {/* For demo, Map shows stalls of activeMarketId (Mont-Bouet) for vendors */}
            <MarketMap stalls={stalls.filter(s => s.marketId === activeMarketId)} onReserve={handleReserveStall} language={language} />
          </div>
        )}

        {currentView === 'profile' && (
          <VendorDashboard 
             profile={userProfile} 
             transactions={transactions} 
             receipts={receipts.filter(r => r.stallNumber === (stalls.find(s => s.id === userProfile.stallId)?.number || ''))}
             myStall={stalls.find(s => s.id === userProfile.stallId)} 
             myReports={reports}
             sanctions={sanctions.filter(s => s.vendorId === userProfile.id)}
             paymentPlan={paymentPlans.find(p => p.vendorId === userProfile.id)}
             products={products}
             orders={orders}
             notifications={notifications.filter(n => n.recipientRole === 'vendor')}
             onAddProduct={handleAddProduct}
             onDeleteProduct={handleDeleteProduct}
             onUpdateOrderStatus={handleUpdateOrderStatus}
          />
        )}

        {currentView === 'report' && (
          <div className="max-w-xl mx-auto">
            <HygieneReportForm onSubmit={handleReportSubmit} language={language} />
          </div>
        )}

        {currentView === 'dashboard' && role === 'admin' && (
          <AdminDashboard 
            markets={markets}
            stalls={stalls} 
            reports={reports} 
            transactions={transactions} 
            receipts={receipts}
            agents={AGENTS}
            expenses={expenses}
            paymentPlans={paymentPlans}
            notifications={notifications.filter(n => n.recipientRole === 'admin')}
            onSendSms={handleSendSms}
            onApprovePlan={handleApprovePlan}
            onAddMarket={handleAddMarket}
            onUpdateMarket={handleUpdateMarket}
            onDeleteMarket={handleDeleteMarket}
          />
        )}

        {currentView === 'agent-tool' && role === 'agent' && (
          <AgentFieldTool 
            stalls={stalls} 
            sanctions={sanctions}
            agentLogs={agents.find(a => a.id === 'a1')?.logs || []}
            cashInHand={agents.find(a => a.id === 'a1')?.cashInHand || 0}
            isShiftActive={agents.find(a => a.id === 'a1')?.isShiftActive || false}
            onCollectPayment={handleCashCollection} 
            onIssueSanction={handleIssueSanction}
            onShiftAction={handleShiftAction}
          />
        )}
      </main>
      
      {showUSSD && <USSDSimulator onClose={() => setShowUSSD(false)} />}
    </div>
  );
};

export default App;
