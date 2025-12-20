
import { useState, useEffect, useCallback } from 'react';
import * as SupabaseService from '../services/supabaseService';
import { User, Market, Stall, Product, Transaction, Expense, ClientOrder, Sanction, AppNotification, Mission, Agent, Receipt, PaymentPlan, ProductCategory } from '../types';
import { PRODUCT_CATEGORIES as DEFAULT_CATEGORIES } from '../constants/appConstants';

export const useAppData = (session: any, currentUser: User | null) => {
    const [data, setData] = useState({
        markets: [] as Market[],
        stalls: [] as Stall[],
        products: [] as Product[],
        recentTransactions: [] as Transaction[],
        sanctions: [] as Sanction[],
        reports: [] as any[],
        users: [] as User[],
        orders: [] as ClientOrder[],
        agents: [] as Agent[],
        missions: [] as Mission[],
        receipts: [] as Receipt[],
        expenses: [] as Expense[],
        paymentPlans: [] as PaymentPlan[],
        notifications: [] as AppNotification[],
        financialStats: null,
        // NEW: Dynamic Categories (Started with defaults)
        productCategories: DEFAULT_CATEGORIES as unknown as ProductCategory[]
    });

    const [isDataLoading, setIsGlobalLoading] = useState(true);
    const [loadingStates, setLoadingStates] = useState({
        finance: false,
        users: false,
        products: false,
        orders: false,
        missions: false
    });

    const loadCoreData = useCallback(async () => {
        if (!session || !currentUser) {
            setIsGlobalLoading(false);
            return;
        }

        setIsGlobalLoading(true);
        try {
            // Core data for everyone
            const markets = await SupabaseService.fetchMarkets();
            const { data: stalls } = await SupabaseService.fetchStalls({ limit: 100 });
            const { transactions: recentTransactions } = await SupabaseService.fetchTransactions(1, 10);
            
            // Payment Plans
            const paymentPlans = await SupabaseService.fetchPaymentPlans();

            // Simulate loading dynamic categories from DB/Storage
            const storedCats = localStorage.getItem('mc_custom_categories');
            let categories = [...DEFAULT_CATEGORIES];
            if (storedCats) {
                try {
                    categories = JSON.parse(storedCats);
                } catch(e) {}
            }

            // Role specific data
            let products: Product[] = [];
            if (currentUser.role === 'vendor') {
                products = await SupabaseService.fetchProducts({ stallId: currentUser.stallId });
            } else if (currentUser.role === 'client') {
                products = await SupabaseService.fetchProducts({ limit: 50 });
            }

            setData(prev => ({
                ...prev,
                markets,
                stalls,
                recentTransactions,
                products,
                paymentPlans,
                // @ts-ignore
                productCategories: categories as ProductCategory[]
            }));

        } catch (error: any) {
            console.error("Core Load Error:", error);
        } finally {
            setIsGlobalLoading(false);
        }
    }, [session, currentUser]);

    // Lazy loaders
    const loadFinance = async () => {
        setLoadingStates(prev => ({ ...prev, finance: true }));
        try {
            const { transactions } = await SupabaseService.fetchTransactions(1, 100);
            setData(prev => ({ ...prev, recentTransactions: transactions }));
        } finally {
            setLoadingStates(prev => ({ ...prev, finance: false }));
        }
    };

    const loadUsers = async () => {
        setLoadingStates(prev => ({ ...prev, users: true }));
        try {
            const { data: users } = await SupabaseService.fetchProfiles({ limit: 100 });
            setData(prev => ({ ...prev, users }));
        } finally {
            setLoadingStates(prev => ({ ...prev, users: false }));
        }
    };

    const loadMissions = async () => {
        setLoadingStates(prev => ({ ...prev, missions: true }));
        try {
            const missions = await SupabaseService.fetchMissions();
            setData(prev => ({ ...prev, missions }));
        } finally {
            setLoadingStates(prev => ({ ...prev, missions: false }));
        }
    };

    // Actions
    const actions = {
        // MARKET ACTIONS
        createMarket: async (marketData: any) => {
            const newMarket = await SupabaseService.createMarket(marketData);
            setData(prev => ({ ...prev, markets: [...prev.markets, newMarket] }));
            return newMarket;
        },
        updateMarket: async (id: string, updates: any) => {
            await SupabaseService.updateMarket(id, updates);
            setData(prev => ({
                ...prev,
                markets: prev.markets.map(m => m.id === id ? { ...m, ...updates } : m)
            }));
        },
        deleteMarket: async (id: string) => {
            await SupabaseService.deleteMarket(id);
            setData(prev => ({
                ...prev,
                markets: prev.markets.filter(m => m.id !== id)
            }));
        },

        // STALL ACTIONS
        createStall: async (stall: any) => {
            const newStall = await SupabaseService.createStall(stall);
            const mappedStall = { ...newStall, id: newStall.id || `temp-${Date.now()}` }; 
            setData(prev => ({ ...prev, stalls: [...prev.stalls, mappedStall as Stall] }));
        },
        bulkCreateStalls: async (stallsData: any[]) => {
            await SupabaseService.createBulkStalls(stallsData);
            const { data: freshStalls } = await SupabaseService.fetchStalls({ limit: 500 });
            setData(prev => ({ ...prev, stalls: freshStalls }));
        },
        deleteStall: async (id: string) => {
            await SupabaseService.deleteStall(id);
            setData(prev => ({ ...prev, stalls: prev.stalls.filter(s => s.id !== id) }));
        },

        // CATEGORY ACTIONS (NEW)
        createCategory: (cat: Omit<ProductCategory, 'id'>) => {
            const newCat = { ...cat, id: cat.label.toLowerCase().replace(/\s+/g, '_') };
            setData(prev => {
                const nextCats = [...prev.productCategories, newCat];
                localStorage.setItem('mc_custom_categories', JSON.stringify(nextCats));
                return { ...prev, productCategories: nextCats };
            });
        },
        deleteCategory: (id: string) => {
            setData(prev => {
                const nextCats = prev.productCategories.filter(c => c.id !== id);
                localStorage.setItem('mc_custom_categories', JSON.stringify(nextCats));
                return { ...prev, productCategories: nextCats };
            });
        },

        // PRODUCT ACTIONS
        createProduct: async (product: any) => { 
            const newProduct = await SupabaseService.createProduct(product);
            setData(prev => ({ ...prev, products: [...prev.products, newProduct as Product] }));
            return newProduct;
        },
        updateProduct: async (id: string, updates: any) => {
            await SupabaseService.updateProduct(id, updates);
            setData(prev => ({
                ...prev,
                products: prev.products.map(p => p.id === id ? { ...p, ...updates } : p)
            }));
        },
        deleteProduct: async (id: string) => {
            await SupabaseService.deleteProduct(id);
            setData(prev => ({ ...prev, products: prev.products.filter(p => p.id !== id) }));
        },

        // PAYMENT PLANS ACTIONS (DEBT)
        requestPaymentPlan: async (planData: any) => {
            const newPlan = await SupabaseService.createPaymentPlan(planData);
            setData(prev => ({ ...prev, paymentPlans: [...prev.paymentPlans, newPlan] }));
        },
        approvePaymentPlan: async (planId: string) => {
            await SupabaseService.updatePaymentPlanStatus(planId, 'active');
            setData(prev => ({
                ...prev,
                paymentPlans: prev.paymentPlans.map(p => p.id === planId ? { ...p, status: 'active' as const } : p)
            }));
        },

        // ORDER & MISC
        createOrder: async (order: any) => {
            await SupabaseService.createOrder(order);
        },
        updateOrderStatus: async (id: string, status: string) => {
            await SupabaseService.updateOrderStatus(id, status);
            setData(prev => ({
                ...prev,
                orders: prev.orders.map(o => o.id === id ? { ...o, status: status as any } : o)
            }));
        },
        createExpense: async (expense: any) => {
            const newExp = await SupabaseService.createExpense(expense);
            setData(prev => ({ ...prev, expenses: [newExp as Expense, ...prev.expenses] }));
        },
        deleteExpense: async (id: string) => {
            await SupabaseService.deleteExpense(id);
            setData(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== id) }));
        },
        updateUserStatus: async (id: string, updates: any) => { 
            await SupabaseService.adminUpdateUserStatus(id, updates);
            setData(prev => ({
                ...prev,
                users: prev.users.map(u => u.id === id ? { ...u, ...updates } : u)
            }));
        },
        
        // MISSION AGENT
        assignMission: async (mission: any) => {
            const newMission = await SupabaseService.createMission(mission);
            setData(prev => ({ ...prev, missions: [newMission as Mission, ...prev.missions] }));
        },
        updateMissionStatus: async (id: string, status: string, report?: string) => {
            await SupabaseService.updateMissionStatus(id, status, report);
            setData(prev => ({
                ...prev,
                missions: prev.missions.map(m => m.id === id ? { ...m, status: status as any, report: report || m.report } : m)
            }));
        },
        validateCashDrop: async (agentId: string, amount: number) => {
            await SupabaseService.validateAgentDeposit(agentId, amount);
            setData(prev => ({
                ...prev,
                agents: prev.agents.map(a => a.id === agentId ? { ...a, cashInHand: 0 } : a)
            }));
        }
    };

    useEffect(() => { loadCoreData(); }, [loadCoreData]);

    return { isDataLoading, loadingStates, lazyLoaders: { loadFinance, loadUsers, loadMissions, loadProducts: async () => {} }, data, actions };
};
