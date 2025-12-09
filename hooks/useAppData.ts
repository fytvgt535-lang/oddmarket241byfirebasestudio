
import { useState, useCallback, useEffect, useRef } from 'react';
import { User, Market, Stall, Product, Transaction, Expense, ClientOrder, Sanction, Agent, AppNotification } from '../types';
import * as SupabaseService from '../services/supabaseService';
import toast from 'react-hot-toast';

// Durée de validité du cache en millisecondes (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

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
  const [isGlobalLoading, setIsGlobalLoading] = useState(true);
  
  // Granular Loading States
  const [loadingStates, setLoadingStates] = useState({
      finance: false,
      users: false,
      products: false,
      orders: false
  });

  // --- STATE CORE (Structurel - Chargé au démarrage) ---
  const [markets, setMarkets] = useState<Market[]>([]); 
  const [stalls, setStalls] = useState<Stall[]>([]); 
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // --- STATE LAZY (Données lourdes) ---
  const [products, setProducts] = useState<Product[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [financialStats, setFinancialStats] = useState({ totalRevenue: 0, totalExpenses: 0, netBalance: 0 });
  const [expenses, setExpenses] = useState<Expense[]>([]); 
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  
  // Placeholders
  const [reports] = useState<any[]>([]);
  const [receipts] = useState<any[]>([]);
  const [paymentPlans] = useState<any[]>([]);
  const [agents] = useState<Agent[]>([]);

  // --- CACHE MANAGEMENT ---
  // Stores timestamp of last successful fetch for each segment
  const lastFetchRef = useRef<{ [key: string]: number }>({});
  const subscriptionsRef = useRef<any[]>([]);

  // --- ACTIONS (Optimistic UI Patterns) ---
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
              const newStall = await SupabaseService.createStall(stallData);
              setStalls(prev => [...prev, newStall]);
              toast.success("Étal ajouté");
          } catch (e: any) { toast.error(e.message); }
      },
      bulkCreateStalls: async (stallsData: any[]) => {
          try {
              await SupabaseService.createBulkStalls(stallsData);
              // Force refresh logic would go here
              const freshStalls = await SupabaseService.fetchStalls();
              setStalls(freshStalls);
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
              // Recalcul simple des stats locales pour éviter un reload
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
          // Realtime will pick it up
      },
      updateOrderStatus: async (orderId: string, status: any) => {
          setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
          await SupabaseService.updateOrderStatus(orderId, status);
      },
      updateUserStatus: async (userId: string, updates: any) => {
          setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
          await SupabaseService.adminUpdateUserStatus(userId, updates);
      }
  };

  // --- LAZY LOADERS (Smart Caching) ---
  
  const lazyLoaders = {
      loadFinance: async (forceRefresh = false) => {
          const now = Date.now();
          if (!forceRefresh && lastFetchRef.current['finance'] && (now - lastFetchRef.current['finance'] < CACHE_TTL)) {
              return; // Cache hit
          }

          setLoadingStates(prev => ({ ...prev, finance: true }));
          try {
              const [trans, exps, stats] = await Promise.all([
                  fetchSafe(SupabaseService.fetchTransactions(1, 200), { transactions: [], count: 0 }, 'Transactions'),
                  fetchSafe(SupabaseService.fetchExpenses(), [], 'Dépenses'),
                  fetchSafe(SupabaseService.fetchFinancialStats(), { totalRevenue: 0, totalExpenses: 0, netBalance: 0 }, 'Stats')
              ]);
              setRecentTransactions(trans.transactions);
              setExpenses(exps);
              setFinancialStats(stats);
              lastFetchRef.current['finance'] = now;
          } finally {
              setLoadingStates(prev => ({ ...prev, finance: false }));
          }
      },

      loadUsers: async (forceRefresh = false) => {
          const now = Date.now();
          if (!forceRefresh && lastFetchRef.current['users'] && (now - lastFetchRef.current['users'] < CACHE_TTL)) return;

          setLoadingStates(prev => ({ ...prev, users: true }));
          try {
              const usersData = await fetchSafe(SupabaseService.fetchProfiles(), [], 'Utilisateurs');
              setUsers(usersData);
              lastFetchRef.current['users'] = now;
          } finally {
              setLoadingStates(prev => ({ ...prev, users: false }));
          }
      },

      loadProducts: async (forceRefresh = false) => {
          const now = Date.now();
          if (!forceRefresh && lastFetchRef.current['products'] && (now - lastFetchRef.current['products'] < CACHE_TTL)) return;

          setLoadingStates(prev => ({ ...prev, products: true }));
          try {
              const prods = await fetchSafe(SupabaseService.fetchProducts(), [], 'Produits');
              if (currentUser?.role === 'vendor') {
                  setProducts(prods.filter(p => p.stallId === currentUser.stallId));
              } else {
                  setProducts(prods);
              }
              lastFetchRef.current['products'] = now;
          } finally {
              setLoadingStates(prev => ({ ...prev, products: false }));
          }
      },

      loadOrders: async (forceRefresh = false) => {
          const now = Date.now();
          if (!forceRefresh && lastFetchRef.current['orders'] && (now - lastFetchRef.current['orders'] < CACHE_TTL)) return;

          setLoadingStates(prev => ({ ...prev, orders: true }));
          try {
              const ords = await fetchSafe(SupabaseService.fetchOrders(), [], 'Commandes');
              setOrders(ords);
              lastFetchRef.current['orders'] = now;
          } finally {
              setLoadingStates(prev => ({ ...prev, orders: false }));
          }
      }
  };

  // --- INITIAL CORE LOAD ---
  const loadCoreData = useCallback(async () => {
    if (!session || !currentUser) { 
        setIsGlobalLoading(false); 
        return; 
    }
    
    try {
        const [marketsData, stallsData] = await Promise.all([
            SupabaseService.fetchMarkets(),
            fetchSafe(SupabaseService.fetchStalls(), [], 'Étals')
        ]);
        
        setMarkets(marketsData);
        setStalls(stallsData);

        // Pre-fetch based on role importance
        if (currentUser.role === 'vendor') {
            lazyLoaders.loadProducts(); // Vendor needs products immediately
        }

    } catch (error: any) {
        console.error("Core Load Error:", error);
        toast.error("Mode hors-ligne partiel.");
    } finally {
        setIsGlobalLoading(false);
    }
  }, [session, currentUser]);

  useEffect(() => { loadCoreData(); }, [loadCoreData]);

  // --- REALTIME SUBSCRIPTIONS (Invalidate Cache on Change) ---
  useEffect(() => {
    if (!session || !currentUser) return;

    subscriptionsRef.current.forEach(sub => sub.unsubscribe());
    subscriptionsRef.current = [];

    // Quand une donnée change, on invalide le cache pour forcer un re-fetch au prochain accès
    const invalidateCache = (segment: string) => {
        delete lastFetchRef.current[segment];
    };

    const subscribe = (table: string, segment: string, callback?: () => void) => {
        const channelId = `lazy_${table}_${currentUser.id}`;
        const sub = SupabaseService.subscribeToTable(table, () => {
            invalidateCache(segment);
            if (callback) callback();
        }, channelId);
        subscriptionsRef.current.push(sub);
    };

    // Global Critical Data - Always reload
    subscribe('markets', 'core', loadCoreData);
    subscribe('stalls', 'core', loadCoreData);

    // Contextual Data
    if (currentUser.role === 'admin') {
        subscribe('transactions', 'finance');
        subscribe('expenses', 'finance');
        subscribe('profiles', 'users');
    } else if (currentUser.role === 'vendor') {
        subscribe('products', 'products', () => lazyLoaders.loadProducts(true)); // Auto refresh for own products
        subscribe('client_orders', 'orders', () => {
            toast.success("Mise à jour commande !");
            lazyLoaders.loadOrders(true);
        });
    }

    return () => {
        subscriptionsRef.current.forEach(sub => sub.unsubscribe());
        subscriptionsRef.current = [];
    };
  }, [session, currentUser, loadCoreData]);

  return {
    isDataLoading: isGlobalLoading, // Only global initial load
    loadingStates, // Granular states for UI spinners
    loadData: loadCoreData, 
    lazyLoaders,
    actions,
    data: {
      markets, stalls, products, recentTransactions, financialStats, expenses, orders, users,
      sanctions, notifications, reports, receipts, paymentPlans, agents 
    }
  };
};
