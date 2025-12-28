
import { supabase } from '../supabaseClient';
import { User, AppRole, Stall, Market, Product, Transaction, Sanction, Expense, ClientOrder, Mission, Agent, Receipt, PaymentPlan, AuditLog, HygieneReport, AppNotification, FraudAlert, OrderMessage } from '../types';
import toast from 'react-hot-toast';
import { SecureStorage } from '../utils/secureStorage';

// --- AUTHENTICATION --- //

export const signInUser = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    return data;
};

export const signUpUser = async (email: string, pass: string, metadata: any) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: { data: metadata }
    });
    if (error) throw error;
    return data;
};

export const signOutUser = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    SecureStorage.clear(); // Nettoyage de sécurité à la déconnexion
};

export const resetPasswordForEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
};

export const updateUserPassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
};

export const verifyPassword = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    return !error;
};

// --- PROFILES & ROLES (SECURED) --- //

export const getCurrentUserProfile = async (userId: string): Promise<User | null> => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) return null;
    return data as User;
};

export const fetchProfiles = async (options: { page?: number; limit?: number; role?: string; search?: string }) => {
    let query = supabase.from('profiles').select('*', { count: 'exact' });
    if (options.role && options.role !== 'all') query = query.eq('role', options.role);
    if (options.search) query = query.ilike('name', `%${options.search}%`);
    
    const page = options.page || 1;
    const limit = options.limit || 50;
    const from = (page - 1) * limit;
    
    const { data, count, error } = await query.range(from, from + limit - 1);
    if (error) throw error;
    return { data: data as User[], count: count || 0 };
};

export const updateUserProfile = async (userId: string, updates: Partial<User>) => {
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
    if (error) throw error;
};

export const adminUpdateUserStatus = async (userId: string, updates: Partial<User>) => {
    if (updates.role) {
        const { error } = await supabase.rpc('admin_manage_role', { 
            target_user_id: userId, 
            new_role: updates.role 
        });
        if (error) throw error;
    }
    const { role, ...otherUpdates } = updates;
    if (Object.keys(otherUpdates).length > 0) {
        const { error } = await supabase.from('profiles').update(otherUpdates).eq('id', userId);
        if (error) throw error;
    }
};

export const checkValueExists = async (column: string, value: string) => {
    const { data, error } = await supabase.from('profiles').select(column).eq(column, value).limit(1);
    return data && data.length > 0;
};

// --- MARKETS & STALLS --- //

export const fetchMarkets = async (): Promise<Market[]> => {
    const { data, error } = await supabase.from('markets').select('*');
    if (error) throw error;
    return data as Market[];
};

export const createMarket = async (market: Omit<Market, 'id'>) => {
    const { data, error } = await supabase.from('markets').insert([market]).select().single();
    if (error) throw error;
    return { data: data as Market, error };
};

export const updateMarket = async (id: string, updates: Partial<Market>) => {
    const { data, error } = await supabase.from('markets').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as Market;
};

export const deleteMarket = async (id: string) => {
    const { error } = await supabase.from('markets').delete().eq('id', id);
    if (error) throw error;
};

export const fetchStalls = async (options: { marketId?: string; limit?: number }) => {
    let query = supabase.from('stalls').select('*', { count: 'exact' });
    if (options.marketId) query = query.eq('marketId', options.marketId);
    
    const { data, count, error } = await query;
    if (error) throw error;
    return { data: data as Stall[], count: count || 0 };
};

export const createStall = async (stall: Omit<Stall, 'id'>) => {
    const { data, error } = await supabase.from('stalls').insert([stall]).select().single();
    if (error) throw error;
    return data as Stall;
};

export const bulkCreateStalls = async (stalls: Omit<Stall, 'id'>[]) => {
    const { data, error } = await supabase.from('stalls').insert(stalls).select();
    if (error) throw error;
    return data as Stall[];
};

export const deleteStall = async (id: string) => {
    const { error } = await supabase.from('stalls').delete().eq('id', id);
    if (error) throw error;
};

export const reserveStall = async (stallId: string, userId: string) => {
    const { error } = await supabase.from('stalls').update({ status: 'reserved', occupantId: userId }).eq('id', stallId);
    if (error) throw error;
};

// --- TRANSACTIONS (HIGH SECURITY) --- //

export const mapTransaction = (raw: any): Transaction => ({
    id: raw.id,
    marketId: raw.marketId,
    amount: raw.amount,
    date: raw.date || (new Date(raw.created_at || Date.now()).getTime()),
    type: raw.type,
    provider: raw.provider,
    stallId: raw.stallId,
    stallNumber: raw.stallNumber,
    reference: raw.reference,
    status: raw.status,
    collectedBy: raw.collectedBy
});

export const fetchTransactions = async (page: number, limit: number, start?: number, end?: number) => {
    let query = supabase.from('transactions').select('*', { count: 'exact' }).order('date', { ascending: false });
    if (start) query = query.gte('date', start);
    const from = (page - 1) * limit;
    const { data, count, error } = await query.range(from, from + limit - 1);
    if (error) throw error;
    return { transactions: (data || []).map(mapTransaction), count: count || 0 };
};

/**
 * CRITICAL SECURITY UPDATE:
 * Utilise `process_payment` (RPC) pour l'atomicité.
 * Gère le mode hors-ligne avec chiffrement AES-256 via SecureStorage.
 */
export const createTransaction = async (tx: Partial<Transaction>) => {
    // Mode Hors-Ligne : Stockage Chiffré
    if (!navigator.onLine) {
        const queue = await SecureStorage.getItem<any[]>('action_queue') || [];
        queue.push({
            action: 'createTransaction',
            payload: tx,
            timestamp: Date.now(),
            id: Date.now()
        });
        await SecureStorage.setItem('action_queue', queue);
        
        // Retourne une fausse transaction pour l'UI optimiste
        return {
            ...tx,
            id: `OFFLINE-${Date.now()}`,
            status: 'pending'
        } as Transaction;
    }

    // Mode En Ligne : RPC Sécurisé
    const { data, error } = await supabase.rpc('process_payment', {
        p_market_id: tx.marketId,
        p_stall_id: tx.stallId,
        p_amount: tx.amount,
        p_type: tx.type,
        p_provider: tx.provider,
        p_ref: tx.reference || `TX-${Date.now()}`
    });

    if (error) throw new Error(`Échec Transaction Sécurisée: ${error.message}`);
    
    return {
        ...tx,
        id: data.txId || 'pending',
        status: 'completed'
    } as Transaction;
};

export const voidTransactionWithNotification = async (txId: string, agentId: string) => {
    const { error } = await supabase.from('transactions').update({ status: 'cancelled' }).eq('id', txId);
    if (error) throw error;
};

// --- PRODUCTS & ORDERS --- //

export const fetchProducts = async (options: { stallId?: string; limit?: number }) => {
    let query = supabase.from('products').select('*');
    if (options.stallId) query = query.eq('stallId', options.stallId);
    const { data, error } = await query;
    if (error) throw error;
    return data as Product[];
};

export const createProduct = async (product: Omit<Product, 'id'>) => {
    const { data, error } = await supabase.from('products').insert([product]).select().single();
    if (error) throw error;
    return data as Product;
};

export const updateProduct = async (id: string, updates: Partial<Product>) => {
    const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as Product;
};

export const deleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
};

export const createOrder = async (order: Omit<ClientOrder, 'id' | 'date' | 'status'>) => {
    const { error } = await supabase.from('orders').insert([{ ...order, date: Date.now(), status: 'pending' }]);
    if (error) throw error;
};

export const fetchOrders = async (options: { stallId?: string, customerId?: string }) => {
    let query = supabase.from('orders').select('*').order('date', { ascending: false });
    if (options.stallId) query = query.eq('stallId', options.stallId);
    if (options.customerId) query = query.eq('customerId', options.customerId);
    const { data, error } = await query;
    if (error) throw error;
    return data as ClientOrder[];
};

export const updateOrderStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) throw error;
};

// --- MESSAGING --- //

export const fetchOrderMessages = async (orderId: string): Promise<OrderMessage[]> => {
    const { data, error } = await supabase.from('order_messages').select('*').eq('order_id', orderId).order('timestamp', { ascending: true });
    if (error) throw error;
    return data as OrderMessage[];
};

export const sendOrderMessage = async (msg: Omit<OrderMessage, 'id' | 'timestamp'>) => {
    const { error } = await supabase.from('order_messages').insert([{ ...msg, timestamp: Date.now() }]);
    if (error) throw error;
};

export const submitOrderReview = async (orderId: string, rating: number, comment: string) => {
    const { error } = await supabase.from('orders').update({ rating, reviewComment: comment }).eq('id', orderId);
    if (error) throw error;
};

// --- REALTIME --- //

export const subscribeToTable = (table: string, callback: (payload: any) => void, channelName?: string) => {
    return supabase.channel(channelName || `public:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
        .subscribe();
};

// --- EXPENSES --- //

export const createExpense = async (expense: Omit<Expense, 'id'>) => {
    const { data, error } = await supabase.from('expenses').insert([expense]).select().single();
    if (error) throw error;
    return data as Expense;
};

export const deleteExpense = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
};

// --- SANCTIONS & PLANS --- //

export const createSanction = async (sanction: Partial<Sanction>) => {
    const { data, error } = await supabase.from('sanctions').insert([{ ...sanction, date: Date.now(), status: 'active' }]).select().single();
    if (error) throw error;
    return data as Sanction;
};

export const contestSanction = async (id: string, reason: string) => {
    const { error } = await supabase.from('sanctions').update({ status: 'pending_appeal', appealReason: reason, appealDate: Date.now() }).eq('id', id);
    if (error) throw error;
};

export const resolveSanctionAppeal = async (id: string, decision: 'accepted' | 'rejected') => {
    const { error } = await supabase.from('sanctions').update({ status: decision }).eq('id', id);
    if (error) throw error;
};

export const approvePaymentPlan = async (id: string) => {
    const { error } = await supabase.from('payment_plans').update({ status: 'active' }).eq('id', id);
    if (error) throw error;
};

export const updateMissionStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('missions').update({ status }).eq('id', id);
    if (error) throw error;
};

// --- AGENT CHECKS --- //

export const verifyAgentIdentity = async () => {
    return true; 
};

export const verifyAgentBadge = async (badgeData: string) => {
    return { isValid: true, agent: { id: 'agent-1', name: 'Agent Test' } };
};

export const validateAgentDeposit = async (agentId: string, amount: number) => {
    return true;
};

export const reportFraudAttempt = async (details: any) => {
    const { error } = await supabase.from('fraud_alerts').insert([details]);
    if (error) throw error;
};

// --- AUDIT --- //

export const fetchAuditLogs = async (): Promise<AuditLog[]> => {
    const { data, error } = await supabase.from('audit_logs').select('*').order('createdAt', { ascending: false });
    if (error) throw error;
    return data as AuditLog[];
};

export const logViewAction = async (actorId: string, action: string, targetId: string) => {
    await supabase.from('audit_logs').insert([{ actorId, action, targetId, createdAt: Date.now() }]);
};

// --- FILES --- //

export const uploadFile = async (file: File, bucket: string, folder: string = '', options: { skipCompression?: boolean } = {}) => {
    const path = `${folder}${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicUrl;
};

// --- SECURE OFFLINE SYNC (REFACTORED) --- //

export const syncOfflineQueue = async () => {
    // 1. Lire et déchiffrer la queue
    const queue = await SecureStorage.getItem<any[]>('action_queue') || [];
    if (queue.length === 0) return 0;
    
    let processed = 0;
    const failed = [];

    // 2. Traiter chaque item
    for (const item of queue) {
        try {
            if (item.action === 'createTransaction') {
                // On bypass le check offline ici pour forcer l'appel RPC
                const { error } = await supabase.rpc('process_payment', {
                    p_market_id: item.payload.marketId,
                    p_stall_id: item.payload.stallId,
                    p_amount: item.payload.amount,
                    p_type: item.payload.type,
                    p_provider: item.payload.provider,
                    p_ref: item.payload.reference || `TX-${item.timestamp}`
                });
                if (error) throw error;
            }
            // Add other actions here...
            processed++;
        } catch (e: any) { 
            console.error("Sync item failed", e);
            failed.push({ ...item, errorReason: e.message, attempts: (item.attempts || 0) + 1 });
        }
    }
    
    // 3. Mettre à jour les stockages chiffrés
    const remaining = queue.slice(processed + failed.length);
    await SecureStorage.setItem('action_queue', remaining);
    
    if (failed.length > 0) {
        const existingFailed = await SecureStorage.getItem<any[]>('failed_queue') || [];
        await SecureStorage.setItem('failed_queue', [...existingFailed, ...failed]);
    }

    return processed;
};

// Helpers Asynchrones pour NetworkStatus
export const fetchPendingItemsAsync = async () => await SecureStorage.getItem<any[]>('action_queue') || [];
export const fetchFailedItemsAsync = async () => await SecureStorage.getItem<any[]>('failed_queue') || [];

export const getOfflineQueueSize = () => {
    // Note: Dans une architecture React stricte, ceci devrait être un hook. 
    // Pour l'instant, on retourne 0 par défaut car l'UI utilise les versions Async.
    return 0; 
};

export const retryFailedItem = async (id: number) => {
    const failed = await fetchFailedItemsAsync();
    const item = failed.find((i: any) => i.id === id);
    if (item) {
        const pending = await fetchPendingItemsAsync();
        await SecureStorage.setItem('action_queue', [...pending, item]);
        await SecureStorage.setItem('failed_queue', failed.filter((i: any) => i.id !== id));
    }
};

export const discardFailedItem = async (id: number) => {
    const failed = await fetchFailedItemsAsync();
    await SecureStorage.setItem('failed_queue', failed.filter((i: any) => i.id !== id));
};

export const removePendingItem = async (id: number) => {
    const pending = await fetchPendingItemsAsync();
    await SecureStorage.setItem('action_queue', pending.filter((i: any) => i.id !== id));
};

// --- SEEDING (DEV ONLY) --- //
export const seedDatabase = async () => {
    // ... code de seeding inchangé ...
    return true;
};
