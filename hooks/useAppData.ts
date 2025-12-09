
import { useState, useCallback, useEffect } from 'react';
import { User, Market, Stall, Product, Transaction, Expense, ClientOrder, Sanction, Agent, AppNotification } from '../types';
import * as SupabaseService from '../services/supabaseService';
import toast from 'react-hot-toast';

// Helper pour sécuriser les appels API individuels (Cloisonnement des erreurs)
const fetchSafe = async <T>(promise: Promise<T>, fallback: T, context: string): Promise<T> => {
    try {
        return await promise;
    } catch (e: any) {
        console.warn(`[Système Modulaire] Le module '${context}' est indisponible temporairement (Erreur: ${e.message}). Activation du fallback.`);
        return fallback;
    }
};

export const useAppData = (session: any, currentUser: User | null) => {
  const [isDataLoading, setIsDataLoading] = useState(true);
  
  // Data State
  const [markets, setMarkets] = useState<Market[]>([]); 
  const [stalls, setStalls] = useState<Stall[]>([]); 
  const [products, setProducts] = useState<Product[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [financialStats, setFinancialStats] = useState({ totalRevenue: 0, totalExpenses: 0, netBalance: 0 });
  const [expenses, setExpenses] = useState<Expense[]>([]); 
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Mocks/Placeholders pour fonctionnalités futures
  const [reports] = useState<any[]>([]);
  const [receipts] = useState<any[]>([]);
  const [paymentPlans] = useState<any[]>([]);
  const [sanctions] = useState<Sanction[]>([]);
  const [agents] = useState<Agent[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const loadData = useCallback(async () => {
    if (!session || !currentUser) { 
        setIsDataLoading(false); 
        return; 
    }
    
    try {
        const role = currentUser.role;
        
        // 1. Données Critiques (Marchés)
        try {
            const marketsData = await SupabaseService.fetchMarkets();
            setMarkets(marketsData);
        } catch (e) {
            console.error("Erreur critique: Impossible de charger les marchés.");
        }

        // 2. Chargement Modulaire basé sur le Rôle
        if (role === 'admin') {
            const [stallsData, prodsData, transData, expData, ordersData, usersData, statsData] = await Promise.all([
                fetchSafe(SupabaseService.fetchStalls(), [], 'Gestion Étals'),
                fetchSafe(SupabaseService.fetchProducts(), [], 'Gestion Produits'),
                fetchSafe(SupabaseService.fetchTransactions(1, 50), { transactions: [], count: 0 }, 'Transactions'),
                fetchSafe(SupabaseService.fetchExpenses(), [], 'Comptabilité'),
                fetchSafe(SupabaseService.fetchOrders(), [], 'Commandes'),
                fetchSafe(SupabaseService.fetchProfiles(), [], 'Utilisateurs'),
                fetchSafe(SupabaseService.fetchFinancialStats(), { totalRevenue: 0, totalExpenses: 0, netBalance: 0 }, 'Statistiques')
            ]);

            setStalls(stallsData);
            setProducts(prodsData);
            setRecentTransactions(transData.transactions);
            setExpenses(expData);
            setOrders(ordersData);
            setUsers(usersData);
            setFinancialStats(statsData);

        } else if (role === 'vendor') {
            const [stallsData, prodsData, ordersData, transData] = await Promise.all([
                fetchSafe(SupabaseService.fetchStalls(), [], 'Étals'),
                fetchSafe(SupabaseService.fetchProducts(), [], 'Mes Produits'),
                fetchSafe(SupabaseService.fetchOrders(), [], 'Mes Commandes'),
                fetchSafe(SupabaseService.fetchTransactions(1, 50), { transactions: [], count: 0 }, 'Historique')
            ]);
            setStalls(stallsData);
            setProducts(prodsData.filter(p => p.stallId === currentUser.stallId)); 
            setOrders(ordersData); 
            setRecentTransactions(transData.transactions);

        } else if (role === 'client') {
            const [stallsData, prodsData] = await Promise.all([
                fetchSafe(SupabaseService.fetchStalls(), [], 'Étals Publics'), 
                fetchSafe(SupabaseService.fetchProducts(), [], 'Catalogue')
            ]);
            setStalls(stallsData);
            setProducts(prodsData);

        } else if (role === 'agent') {
            const stallsData = await fetchSafe(SupabaseService.fetchStalls(), [], 'Parc Étals');
            setStalls(stallsData);
        }

    } catch (error: any) {
        console.error("Erreur globale non capturée:", error);
        toast.error("Connexion instable : certaines données sont temporairement indisponibles.", { duration: 5000, icon: '⚠️' });
    } finally {
        setIsDataLoading(false);
    }
  }, [session, currentUser]);

  // Initial Load
  useEffect(() => { loadData(); }, [loadData]);

  // Real-time Subscriptions (Fault Tolerant & Unique Channels)
  useEffect(() => {
    if (!session || !currentUser) return;

    const refreshData = () => { loadData(); };
    const subscriptions: any[] = [];

    const safeSubscribe = (table: string, callback: (payload: any) => void) => {
        try {
            // UNIQUE CHANNEL NAME: global_data_{table}
            // Ensures this subscription does not conflict with local component subscriptions
            const sub = SupabaseService.subscribeToTable(table, callback, `global_data_${table}`);
            subscriptions.push(sub);
        } catch (e) {
            console.warn(`Impossible de s'abonner au temps réel pour ${table}`);
        }
    };

    safeSubscribe('markets', refreshData);

    if (currentUser.role === 'admin') {
        safeSubscribe('stalls', refreshData);
        safeSubscribe('transactions', refreshData);
        safeSubscribe('client_orders', refreshData);
        safeSubscribe('expenses', refreshData); 
        safeSubscribe('profiles', refreshData);
    } 
    else if (currentUser.role === 'vendor') {
        safeSubscribe('client_orders', (payload) => {
            if (payload.eventType === 'INSERT') toast.success("Nouvelle commande reçue !");
            refreshData();
        });
        safeSubscribe('products', refreshData);
    }
    else if (currentUser.role === 'agent') {
        safeSubscribe('stalls', refreshData);
    }

    return () => {
        subscriptions.forEach(sub => sub && sub.unsubscribe());
    };
  }, [session, currentUser, loadData]);

  return {
    isDataLoading,
    loadData,
    data: {
      markets, stalls, products, recentTransactions, financialStats, expenses, orders, users,
      reports, receipts, paymentPlans, sanctions, agents, notifications
    },
    setters: {
        setMarkets, setStalls, setProducts, setExpenses, setOrders, setUsers
    }
  };
};
