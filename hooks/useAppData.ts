
import { useState, useEffect, useCallback } from 'react';
import * as SupabaseService from '../services/supabaseService';
import { User, Market, Stall, Product, Transaction, Expense, ClientOrder, Sanction, AppNotification, Mission, Agent, Receipt, PaymentPlan, ProductCategory } from '../types';
import { PRODUCT_CATEGORIES as DEFAULT_CATEGORIES } from '../constants/appConstants';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

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
        productCategories: DEFAULT_CATEGORIES as unknown as ProductCategory[]
    });

    const [isDataLoading, setIsGlobalLoading] = useState(true);
    const [loadingStates, setLoadingStates] = useState({
        finance: false, users: false, products: false, orders: false, missions: false
    });

    const refresh = useCallback(async () => {
        if (!session || !currentUser) return;
        try {
            const [markets, stallsResult, transResult, orders] = await Promise.all([
                SupabaseService.fetchMarkets(),
                SupabaseService.fetchStalls({ limit: 200 }),
                SupabaseService.fetchTransactions(1, 100),
                SupabaseService.fetchOrders(currentUser.role === 'vendor' ? { stallId: currentUser.id } : { customerId: currentUser.id })
            ]);

            setData(prev => ({
                ...prev,
                markets,
                stalls: stallsResult.data,
                recentTransactions: transResult.transactions,
                orders: orders
            }));
        } catch (e) {
            console.error("Refresh failed", e);
        }
    }, [session, currentUser]);

    useEffect(() => {
        const init = async () => {
            if (!session || !currentUser) { setIsGlobalLoading(false); return; }
            setIsGlobalLoading(true);
            await refresh();
            
            if (currentUser.role === 'admin') {
                const { data: users } = await SupabaseService.fetchProfiles({ limit: 100 });
                setData(prev => ({ ...prev, users }));
            }
            if (currentUser.role === 'vendor' || currentUser.role === 'client') {
                const prods = await SupabaseService.fetchProducts({ limit: 100 });
                setData(prev => ({ ...prev, products: prods }));
            }
            setIsGlobalLoading(false);
        };
        init();

        // REALTIME CHANNELS
        if (session) {
            const txSub = SupabaseService.subscribeToTable('transactions', (p) => {
                if (p.eventType === 'INSERT') {
                    const newTx = SupabaseService.mapTransaction(p.new);
                    setData(prev => ({ ...prev, recentTransactions: [newTx, ...prev.recentTransactions].slice(0, 100) }));
                }
            });

            const orderSub = SupabaseService.subscribeToTable('orders', (p) => {
                refresh(); // Simple refresh for orders to keep logic robust
            });
            
            return () => { txSub.unsubscribe(); orderSub.unsubscribe(); };
        }
    }, [session, currentUser?.id, refresh]);

    const actions = {
        wrap: async (fn: () => Promise<any>, successMsg?: string) => {
            try {
                const res = await fn();
                if (successMsg) toast.success(successMsg);
                await refresh(); 
                return res;
            } catch (e: any) {
                toast.error(e.message || "Action échouée");
                throw e;
            }
        },

        // Fix: Added missing admin actions
        approvePaymentPlan: (id: string) => actions.wrap(() => SupabaseService.approvePaymentPlan(id), "Plan approuvé"),
        createMarket: (m: any) => actions.wrap(() => SupabaseService.createMarket(m), "Marché créé"),
        updateMarket: (id: string, u: any) => actions.wrap(() => SupabaseService.updateMarket(id, u), "Marché mis à jour"),
        deleteMarket: (id: string) => actions.wrap(() => SupabaseService.deleteMarket(id), "Marché supprimé"),
        createStall: (s: any) => actions.wrap(() => SupabaseService.createStall(s), "Étal créé"),
        bulkCreateStalls: (s: any[]) => actions.wrap(() => SupabaseService.bulkCreateStalls(s), "Étals créés"),
        deleteStall: (id: string) => actions.wrap(() => SupabaseService.deleteStall(id), "Étal supprimé"),
        createExpense: (e: any) => actions.wrap(() => SupabaseService.createExpense(e), "Dépense ajoutée"),
        deleteExpense: (id: string) => actions.wrap(() => SupabaseService.deleteExpense(id), "Dépense supprimée"),
        updateUserStatus: (id: string, u: any) => actions.wrap(() => SupabaseService.adminUpdateUserStatus(id, u), "Statut mis à jour"),
        
        // Fix: Added missing product/order actions
        updateProduct: (id: string, u: any) => actions.wrap(() => SupabaseService.updateProduct(id, u), "Produit mis à jour"),
        deleteProduct: (id: string) => actions.wrap(() => SupabaseService.deleteProduct(id), "Produit supprimé"),
        updateOrderStatus: (id: string, s: string) => actions.wrap(() => SupabaseService.updateOrderStatus(id, s), "Statut mis à jour"),
        createOrder: (d: any) => actions.wrap(() => SupabaseService.createOrder(d), "Commande envoyée au vendeur"),
        createProduct: (d: any) => actions.wrap(() => SupabaseService.createProduct(d), "Produit ajouté"),
        updateMissionStatus: (id: string, s: string) => actions.wrap(() => SupabaseService.updateMissionStatus(id, s), "Mission mise à jour")
    };

    return { isDataLoading, loadingStates, data, actions, lazyLoaders: { loadFinance: refresh, loadUsers: refresh, loadMissions: refresh } };
};
