
import { useState, useCallback, useEffect } from 'react';
import { User, Market, Stall, Product, Transaction, Expense, ClientOrder, Sanction, Agent, AppNotification } from '../types';
import * as SupabaseService from '../services/supabaseService';
import toast from 'react-hot-toast';

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
  
  // Mocks/Placeholders
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
        
        // 1. Base Data (Everyone needs markets)
        const marketsData = await SupabaseService.fetchMarkets();
        setMarkets(marketsData);

        // 2. Role-Based Fetching Strategy
        if (role === 'admin') {
            const [stallsData, prodsData, transData, expData, ordersData, usersData, statsData] = await Promise.all([
                SupabaseService.fetchStalls(),
                SupabaseService.fetchProducts(),
                SupabaseService.fetchTransactions(1, 50),
                SupabaseService.fetchExpenses(),
                SupabaseService.fetchOrders(),
                SupabaseService.fetchProfiles(),
                SupabaseService.fetchFinancialStats()
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
                SupabaseService.fetchStalls(),
                SupabaseService.fetchProducts(),
                SupabaseService.fetchOrders(),
                SupabaseService.fetchTransactions(1, 50)
            ]);
            setStalls(stallsData);
            setProducts(prodsData.filter(p => p.stallId === currentUser.stallId)); 
            setOrders(ordersData); 
            setRecentTransactions(transData.transactions);

        } else if (role === 'client') {
            const [stallsData, prodsData] = await Promise.all([
                SupabaseService.fetchStalls(), 
                SupabaseService.fetchProducts()
            ]);
            setStalls(stallsData);
            setProducts(prodsData);

        } else if (role === 'agent') {
            const stallsData = await SupabaseService.fetchStalls();
            setStalls(stallsData);
        }

    } catch (error: any) {
        console.error("Critical Data Load Error:", JSON.stringify(error, null, 2));
        toast.error("Erreur de synchronisation des données.");
    } finally {
        setIsDataLoading(false);
    }
  }, [session, currentUser]);

  // Initial Load
  useEffect(() => { loadData(); }, [loadData]);

  // Real-time Subscriptions
  useEffect(() => {
    if (!session || !currentUser) return;

    const refreshData = () => { loadData(); };
    const subscriptions: any[] = [];

    subscriptions.push(SupabaseService.subscribeToTable('markets', refreshData));

    if (currentUser.role === 'admin') {
        subscriptions.push(SupabaseService.subscribeToTable('stalls', refreshData));
        subscriptions.push(SupabaseService.subscribeToTable('transactions', refreshData));
        subscriptions.push(SupabaseService.subscribeToTable('client_orders', refreshData));
        subscriptions.push(SupabaseService.subscribeToTable('expenses', refreshData));
        subscriptions.push(SupabaseService.subscribeToTable('profiles', refreshData));
    } 
    else if (currentUser.role === 'vendor') {
        subscriptions.push(SupabaseService.subscribeToTable('client_orders', (payload) => {
            if (payload.eventType === 'INSERT') toast.success("Nouvelle commande reçue !");
            refreshData();
        }));
        subscriptions.push(SupabaseService.subscribeToTable('products', refreshData));
    }
    else if (currentUser.role === 'agent') {
        subscriptions.push(SupabaseService.subscribeToTable('stalls', refreshData));
    }

    return () => {
        subscriptions.forEach(sub => sub.unsubscribe());
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
