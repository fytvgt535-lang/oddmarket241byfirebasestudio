
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
            const [markets, stallsResult, transResult, plans, sanctions] = await Promise.all([
                SupabaseService.fetchMarkets(),
                SupabaseService.fetchStalls({ limit: 200 }),
                SupabaseService.fetchTransactions(1, 100),
                SupabaseService.fetchPaymentPlans(),
                Promise.resolve(data.sanctions) 
            ]);

            setData(prev => ({
                ...prev,
                markets,
                stalls: stallsResult.data,
                recentTransactions: transResult.transactions,
                paymentPlans: plans,
                sanctions: sanctions as Sanction[]
            }));
        } catch (e) {
            console.error("Refresh failed", e);
        }
    }, [session, currentUser, data.sanctions]);

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

        if (session) {
            const channel = supabase.channel('realtime_transactions')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, (payload) => {
                    // Correction critique : On mappe les données brutes Postgres (SnakeCase) en Transaction (CamelCase)
                    const newTx = SupabaseService.mapTransaction(payload.new);
                    setData(prev => ({
                        ...prev,
                        recentTransactions: [newTx, ...prev.recentTransactions].slice(0, 100)
                    }));
                })
                .subscribe();
            
            return () => { channel.unsubscribe(); };
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

        createMarket: (d: any) => actions.wrap(() => SupabaseService.createMarket(d), "Marché créé"),
        updateMarket: (id: string, d: any) => actions.wrap(() => SupabaseService.updateMarket(id, d), "Mise à jour effectuée"),
        deleteMarket: (id: string) => actions.wrap(() => SupabaseService.deleteMarket(id), "Marché supprimé"),
        createStall: (d: any) => actions.wrap(() => SupabaseService.createStall(d), "Étal ajouté"),
        deleteStall: (id: string) => actions.wrap(() => SupabaseService.deleteStall(id), "Étal supprimé"),
        bulkCreateStalls: (stalls: any[]) => actions.wrap(() => SupabaseService.createBulkStalls(stalls), "Série d'étals créée"),
        createProduct: (d: any) => actions.wrap(() => SupabaseService.createProduct(d), "Produit ajouté"),
        updateProduct: (id: string, d: any) => actions.wrap(() => SupabaseService.updateProduct(id, d), "Stock mis à jour"),
        deleteProduct: (id: string) => actions.wrap(() => SupabaseService.deleteProduct(id), "Produit retiré"),
        createTransaction: (d: any) => actions.wrap(() => SupabaseService.createTransaction(d), "Paiement enregistré"),
        createSanction: (d: any) => actions.wrap(() => SupabaseService.createSanction(d), "Sanction émise"),
        createExpense: (d: any) => actions.wrap(() => SupabaseService.createExpense(d), "Dépense enregistrée"),
        deleteExpense: (id: string) => actions.wrap(() => SupabaseService.deleteExpense(id), "Dépense supprimée"),
        updateUserStatus: (id: string, d: any) => actions.wrap(() => SupabaseService.adminUpdateUserStatus(id, d), "Statut citoyen modifié"),
        updateOrderStatus: (id: string, s: string) => actions.wrap(() => SupabaseService.updateOrderStatus(id, s), "Commande mise à jour"),
        createOrder: (d: any) => actions.wrap(() => SupabaseService.createOrder(d), "Commande confirmée"),
        updateMissionStatus: (id: string, s: string, r?: string) => actions.wrap(() => SupabaseService.updateMissionStatus(id, s, r), "Mission mise à jour"),
        approvePaymentPlan: (id: string) => actions.wrap(() => SupabaseService.updatePaymentPlanStatus(id, 'active'), "Plan approuvé"),
        requestPaymentPlan: (d: any) => actions.wrap(() => SupabaseService.createPaymentPlan(d), "Demande d'échéancier envoyée"),
        assignMission: (mission: any) => actions.wrap(() => SupabaseService.createMission(mission), "Mission assignée"),
        validateCashDrop: (agentId: string, amount: number) => actions.wrap(() => SupabaseService.validateAgentDeposit(agentId, amount), "Dépôt validé"),
        createCategory: (cat: any) => {
            setData(prev => ({ ...prev, productCategories: [...prev.productCategories, { ...cat, id: Math.random().toString(36).substr(2, 9) }] }));
            toast.success("Catégorie ajoutée");
        },
        deleteCategory: (id: string) => {
            setData(prev => ({ ...prev, productCategories: prev.productCategories.filter(c => c.id !== id) }));
            toast.success("Catégorie supprimée");
        }
    };

    return { isDataLoading, loadingStates, lazyLoaders: { loadFinance: refresh, loadUsers: refresh, loadMissions: refresh }, data, actions };
};
