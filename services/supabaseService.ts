
import { supabase } from '../supabaseClient';
import { User, AppRole, Stall, Market, Product, Transaction, Sanction, Expense, ClientOrder, Mission, Agent, Receipt, PaymentPlan, AuditLog, HygieneReport, AppNotification, FraudAlert, OrderMessage } from '../types';
import toast from 'react-hot-toast';

/**
 * AUTHENTICATION
 */
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

/**
 * PROFILES
 */
export const getCurrentUserProfile = async (userId: string): Promise<User | null> => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) return null;
    return data as User;
};

export const fetchProfiles = async (options: { page?: number; limit?: number; role?: string; search?: string }) => {
    let query = supabase.from('profiles').select('*', { count: 'exact' });
    if (options.role && options.role !== 'all') query = query.eq('role', options.role);
    if (options.search) query = query.ilike('name', `%${options.search}%`);
    const { data, count, error } = await query;
    if (error) throw error;
    return { data: data as User[], count: count || 0 };
};

export const updateUserProfile = async (userId: string, updates: Partial<User>) => {
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
    if (error) throw error;
};

export const adminUpdateUserStatus = async (userId: string, updates: Partial<User>) => {
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
    if (error) throw error;
};

export const checkValueExists = async (column: string, value: string) => {
    const { data, error } = await supabase.from('profiles').select(column).eq(column, value).limit(1);
    if (error) throw error;
    return data && data.length > 0;
};

/**
 * MARKETS & STALLS
 */
export const fetchMarkets = async (): Promise<Market[]> => {
    const { data, error } = await supabase.from('markets').select('*');
    if (error) throw error;
    return data as Market[];
};

export const createMarket = async (market: Omit<Market, 'id'>) => {
    const { data, error } = await supabase.from('markets').insert([market]).select().single();
    if (error) throw error;
    return data as Market;
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
    // Note: Utilisation de snake_case pour la DB si nécessaire, mais ici on garde le mapping types.ts
    const { error } = await supabase.from('stalls').update({ status: 'reserved', occupantId: userId }).eq('id', stallId);
    if (error) throw error;
};

/**
 * TRANSACTIONS
 */
export const mapTransaction = (raw: any): Transaction => ({
    id: raw.id,
    marketId: raw.marketId,
    amount: raw.amount,
    date: raw.date || raw.created_at,
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

export const createTransaction = async (tx: Partial<Transaction>) => {
    const { data, error } = await supabase.from('transactions').insert([tx]).select().single();
    if (error) throw error;
    return mapTransaction(data);
};

export const voidTransactionWithNotification = async (txId: string, agentId: string) => {
    const { error } = await supabase.from('transactions').update({ status: 'cancelled' }).eq('id', txId);
    if (error) throw error;
};

/**
 * PRODUCTS & ORDERS
 */
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

/**
 * MESSAGING (CHAT RÉEL)
 */
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

/**
 * REALTIME SUBSCRIPTION
 */
export const subscribeToTable = (table: string, callback: (payload: any) => void, channelName?: string) => {
    return supabase.channel(channelName || `public:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
        .subscribe();
};

/**
 * EXPENSES
 */
export const createExpense = async (expense: Omit<Expense, 'id'>) => {
    const { data, error } = await supabase.from('expenses').insert([expense]).select().single();
    if (error) throw error;
    return data as Expense;
};

export const deleteExpense = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
};

/**
 * SANCTIONS & APPEALS
 */
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

/**
 * PAYMENT PLANS
 */
export const approvePaymentPlan = async (id: string) => {
    const { error } = await supabase.from('payment_plans').update({ status: 'active' }).eq('id', id);
    if (error) throw error;
};

/**
 * MISSIONS
 */
export const updateMissionStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('missions').update({ status }).eq('id', id);
    if (error) throw error;
};

/**
 * AGENTS
 */
export const verifyAgentIdentity = async () => {
    // Real implementation would involve scanning or server validation
    return true;
};

export const verifyAgentBadge = async (badgeData: string) => {
    // Mocking verification
    return { isValid: true, agent: { id: 'agent-1', name: 'Agent Test' } };
};

export const validateAgentDeposit = async (agentId: string, amount: number) => {
    // Archive or update status
    return true;
};

export const reportFraudAttempt = async (details: any) => {
    const { error } = await supabase.from('fraud_alerts').insert([details]);
    if (error) throw error;
};

/**
 * AUDIT LOGS
 */
export const fetchAuditLogs = async (): Promise<AuditLog[]> => {
    const { data, error } = await supabase.from('audit_logs').select('*').order('createdAt', { ascending: false });
    if (error) throw error;
    return data as AuditLog[];
};

export const logViewAction = async (actorId: string, action: string, targetId: string) => {
    await supabase.from('audit_logs').insert([{ actorId, action, targetId, createdAt: Date.now() }]);
};

/**
 * FILES
 */
export const uploadFile = async (file: File, bucket: string, folder: string = '', options: { skipCompression?: boolean } = {}) => {
    const path = `${folder}${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicUrl;
};

/**
 * OFFLINE MANAGEMENT
 */
export const syncOfflineQueue = async () => {
    const queue = JSON.parse(localStorage.getItem('mc_action_queue') || '[]');
    if (queue.length === 0) return 0;
    
    let processed = 0;
    for (const item of queue) {
        try {
            if (item.action === 'createTransaction') await supabase.from('transactions').insert([item.payload]);
            processed++;
        } catch (e) { console.error("Sync item failed", e); }
    }
    localStorage.setItem('mc_action_queue', '[]');
    return processed;
};

export const getOfflineQueueSize = () => JSON.parse(localStorage.getItem('mc_action_queue') || '[]').length;
export const getFailedQueueSize = () => JSON.parse(localStorage.getItem('mc_failed_queue') || '[]').length;
export const getPendingItems = () => JSON.parse(localStorage.getItem('mc_action_queue') || '[]');
export const getFailedItems = () => JSON.parse(localStorage.getItem('mc_failed_queue') || '[]');

export const retryFailedItem = (id: number) => {
    const failed = getFailedItems();
    const item = failed.find((i: any) => i.id === id);
    if (item) {
        const pending = getPendingItems();
        localStorage.setItem('mc_action_queue', JSON.stringify([...pending, item]));
        localStorage.setItem('mc_failed_queue', JSON.stringify(failed.filter((i: any) => i.id !== id)));
    }
};

export const discardFailedItem = (id: number) => {
    const failed = getFailedItems();
    localStorage.setItem('mc_failed_queue', JSON.stringify(failed.filter((i: any) => i.id !== id)));
};

export const removePendingItem = (id: number) => {
    const pending = getPendingItems();
    localStorage.setItem('mc_action_queue', JSON.stringify(pending.filter((i: any) => i.id !== id)));
};
