
import { useState, useCallback, useEffect, useRef } from 'react';
import { User, Market, Stall, Product, Transaction, Expense, ClientOrder, Sanction, Agent, AppNotification, Mission } from '../types';
import * as SupabaseService from '../services/supabaseService';
import toast from 'react-hot-toast';

const fetchSafe = async <T>(promise: Promise<T>, fallback: T, context: string): Promise<T> => {
    try {
        return await promise;
    } catch (e: any) {
        console.warn(`[Module ${context}] Indisponible (Offline/Error).`, e);
        return fallback;
    }
};

export const useAppData = (session: any, currentUser: User | null) => {
  // Global loading (for initial app mount only)
  // We default this to FALSE faster if we have cache, but here we set to true initially.
  const [isGlobalLoading, setIsGlobalLoading] = useState(true);
  
  // Granular Loading States
  const [loadingStates, setLoadingStates] = useState({
      finance: false,
      users: false,
      products: false,
      orders: false,
      missions: false
  });

  // --- STATE CORE ---
  const [markets, setMarkets] = useState<Market[]>([]); 
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // --- STATE LAZY ---
  const [products, setProducts] = useState<Product[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [financialStats, setFinancialStats] = useState({ totalRevenue: 0, totalExpenses: 0, netBalance: 0 });
  const [expenses, setExpenses] = useState<Expense[]>([]); 
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [users, setUsers] = useState<User[]>([]); 
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]); 
  
  const [reports] = useState<any[]>([]);
  const [receipts] = useState<any[]>([]);
  const [paymentPlans] = useState<any[]>([]);
  
  // Agents derived from users
  const agents = users
    .filter(u => u.role === 'agent')
    .map(u => ({
        id: u.id,
        userId: u.id,
        name: u.name,
        marketId: u.marketId || 'm1',
        role: 'collector' as const, 
        performanceScore: u.agentStats?.performanceScore || 85,
        lastActive: u.lastSeenAt || Date.now(),
        cashInHand: u.agentStats?.cashInHand || 0,
        isShiftActive: !!u.agentStats?.isShiftActive,
        logs: []
    }));

  // --- ACTIONS ---
  const actions = {
      createMarket: async (marketData: any) => {
          try {
              const newMarket = await SupabaseService.createMarket(marketData);
              if (newMarket) {
                  setMarkets(prev => [...prev, newMarket]);
                  toast.success("Marché initialisé");
              }
          } catch (e: any) { toast.error(e.message); }
      },
      updateMarket: async (id: string, data: any) => {
          setMarkets(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
          try { await SupabaseService.updateMarket(id, data); } catch (e) { loadCoreData(); }
      },
      deleteMarket: async (id: string) => {
          setMarkets(prev => prev.filter(m => m.id !== id));
          SupabaseService.deleteMarket(id).catch(() => loadCoreData());
      },
      createStall: async (stallData: any) => {
          try {
              await SupabaseService.createStall(stallData);
              toast.success("Étal ajouté");
          } catch (e: any) { toast.error(e.message); }
      },
      bulkCreateStalls: async (stallsData: any[]) => {
          try {
              await SupabaseService.createBulkStalls(stallsData);
              toast.success("Génération terminée");
          } catch (e: any) { toast.error(e.message); }
      },
      deleteStall: async (id: string) => {
          setStalls(prev => prev.filter(s => s.id !== id));
          SupabaseService.deleteStall(id);
      },
      createExpense: async (expenseData: any) => {
          try {
              const newExp = await SupabaseService.createExpense(expenseData);
              setExpenses(prev => [newExp, ...prev]);
              setFinancialStats(prev => ({ 
                  ...prev, 
                  totalExpenses: prev.totalExpenses + newExp.amount, 
                  netBalance: prev.netBalance - newExp.amount 
              }));
          } catch (e: any) { toast.error(e.message); }
      },
      deleteExpense: async (id: string) => {
          setExpenses(prev => prev.filter(e => e.id !== id));
          SupabaseService.deleteExpense(id);
      },
      createProduct: async (prodData: any) => {
          try {
              const newProd = await SupabaseService.createProduct(prodData);
              setProducts(prev => [...prev, newProd]);
              return newProd;
          } catch (e: any) { throw e; }
      },
      updateProduct: async (id: string, updates: any) => {
          setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
          await SupabaseService.updateProduct(id, updates);
      },
      deleteProduct: async (id: string) => {
          setProducts(prev => prev.filter(p => p.id !== id));
          await SupabaseService.deleteProduct(id);
      },
      createOrder: async (orderData: any) => {
          await SupabaseService.createOrder(orderData);
      },
      updateOrderStatus: async (orderId: string, status: any) => {
          setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
          await SupabaseService.updateOrderStatus(orderId, status);
      },
      updateUserStatus: async (userId: string, updates: any) => {
          setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
          await SupabaseService.adminUpdateUserStatus(userId, updates);
      },
      assignMission: async (missionData: any) => {
          try {
              const newMission = await SupabaseService.createMission(missionData);
              setMissions(prev => [newMission, ...prev]);
          } catch (e: any) { throw e; }
      },
      updateMissionStatus: async (id: string, status: any, report?: string) => {
          setMissions(prev => prev.map(m => m.id === id ? { ...m, status, report } : m));
          try { await SupabaseService.updateMissionStatus(id, status, report); } catch (e) { loadCoreData(); }
      },
      validateCashDrop: async (agentId: string, amount: number) => {
          try {
              await SupabaseService.validateAgentDeposit(agentId, amount);
              setUsers(prev => prev.map(u => {
                  if (u.id === agentId && u.agentStats) {
                      return { ...u, agentStats: { ...u.agentStats, cashInHand: 0 } };
                  }
                  return u;
              }));
          } catch (e: any) { toast.error("Erreur validation : " + e.message); }
      }
  };

  // --- LAZY LOADERS (With simple deduplication) ---
  const loadingRefs = useRef({ finance: false, users: false, missions: false });

  const lazyLoaders = {
      loadFinance: async () => {
          if (loadingRefs.current.finance) return;
          loadingRefs.current.finance = true;
          setLoadingStates(prev => ({ ...prev, finance: true }));
          
          try {
              // Parallel Fetch for Speed
              const [trans, exps, stats] = await Promise.all([
                  fetchSafe(SupabaseService.fetchTransactions(1, 50), { transactions: [], count: 0 }, 'Transactions'),
                  fetchSafe(SupabaseService.fetchExpenses(), [], 'Dépenses'),
                  fetchSafe(SupabaseService.fetchFinancialStats(), { totalRevenue: 0, totalExpenses: 0, netBalance: 0 }, 'Stats')
              ]);
              setRecentTransactions(trans.transactions);
              setExpenses(exps);
              setFinancialStats(stats);
          } finally {
              setLoadingStates(prev => ({ ...prev, finance: false }));
              loadingRefs.current.finance = false;
          }
      },

      loadUsers: async () => {
          if (loadingRefs.current.users) return;
          loadingRefs.current.users = true;
          setLoadingStates(prev => ({ ...prev, users: true }));
          
          try {
              const { data } = await fetchSafe(SupabaseService.fetchProfiles({ limit: 50 }), { data: [], count: 0 }, 'Utilisateurs');
              setUsers(data);
          } finally {
              setLoadingStates(prev => ({ ...prev, users: false }));
              loadingRefs.current.users = false;
          }
      },

      loadProducts: async () => {
          setLoadingStates(prev => ({ ...prev, products: true }));
          try {
              const prods = await fetchSafe(SupabaseService.fetchProducts(), [], 'Produits');
              if (currentUser?.role === 'vendor') {
                  setProducts(prods.filter(p => p.stallId === currentUser.stallId));
              } else {
                  setProducts(prods);
              }
          } finally {
              setLoadingStates(prev => ({ ...prev, products: false }));
          }
      },

      loadOrders: async () => {
          setLoadingStates(prev => ({ ...prev, orders: true }));
          try {
              const ords = await fetchSafe(SupabaseService.fetchOrders(), [], 'Commandes');
              setOrders(ords);
          } finally {
              setLoadingStates(prev => ({ ...prev, orders: false }));
          }
      },

      loadMissions: async () => {
          if (loadingRefs.current.missions) return;
          loadingRefs.current.missions = true;
          setLoadingStates(prev => ({ ...prev, missions: true }));
          try {
              const m = await fetchSafe(SupabaseService.fetchMissions(), [], 'Missions');
              setMissions(m);
          } finally {
              setLoadingStates(prev => ({ ...prev, missions: false }));
              loadingRefs.current.missions = false;
          }
      }
  };

  // --- INITIAL CORE LOAD (Ultra-Minimal) ---
  const loadCoreData = useCallback(async () => {
    if (!session || !currentUser) { 
        setIsGlobalLoading(false); 
        return; 
    }
    
    // Immediate unlock for UX, fetch in background
    setIsGlobalLoading(true);

    try {
        const marketsData = await SupabaseService.fetchMarkets();
        setMarkets(marketsData);
        
        // Only load essential context based on role
        if (currentUser.role === 'vendor') {
            lazyLoaders.loadProducts(); 
        }
    } catch (error: any) {
        console.error("Core Load Error:", error);
    } finally {
        // FAST UNLOCK
        setIsGlobalLoading(false);
    }
  }, [session, currentUser]);

  useEffect(() => { loadCoreData(); }, [loadCoreData]);

  return {
    isDataLoading: isGlobalLoading, 
    loadingStates, 
    loadData: loadCoreData, 
    lazyLoaders,
    actions,
    data: {
      markets, stalls, products, recentTransactions, financialStats, expenses, orders, users,
      sanctions, notifications, reports, receipts, paymentPlans, agents, missions 
    }
  };
};
