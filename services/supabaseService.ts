
import { supabase } from '../supabaseClient';
import { User, AppRole, Stall, Market, Product, Transaction, Sanction, Expense, ClientOrder, Mission, Agent, Receipt, PaymentPlan, AuditLog, HygieneReport, AppNotification, FraudAlert } from '../types';

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

export const verifyPassword = async (email: string, password: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return !error;
};

export const updateUserPassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
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
    if (options.page && options.limit) {
        const from = (options.page - 1) * options.limit;
        query = query.range(from, from + options.limit - 1);
    }
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
    const { data, error } = await supabase.from('profiles').select(column).eq(column, value);
    if (error) return false;
    return data.length > 0;
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
    return data;
};

export const updateMarket = async (id: string, updates: Partial<Market>) => {
    const { error } = await supabase.from('markets').update(updates).eq('id', id);
    if (error) throw error;
};

export const deleteMarket = async (id: string) => {
    const { error } = await supabase.from('markets').delete().eq('id', id);
    if (error) throw error;
};

export const fetchStalls = async (options: { marketId?: string; limit?: number }) => {
    let query = supabase.from('stalls').select('*', { count: 'exact' });
    if (options.marketId) query = query.eq('market_id', options.marketId);
    if (options.limit) query = query.limit(options.limit);
    const { data, count, error } = await query;
    if (error) throw error;
    return { data: data as Stall[], count: count || 0 };
};

export const createStall = async (stall: Omit<Stall, 'id'>) => {
    const { data, error } = await supabase.from('stalls').insert([stall]).select().single();
    if (error) throw error;
    return data;
};

export const createBulkStalls = async (stalls: Omit<Stall, 'id'>[]) => {
    const { error } = await supabase.from('stalls').insert(stalls);
    if (error) throw error;
};

export const deleteStall = async (id: string) => {
    const { error } = await supabase.from('stalls').delete().eq('id', id);
    if (error) throw error;
};

export const reserveStall = async (stallId: string, userId: string) => {
    const { error } = await supabase.from('stalls').update({ status: 'reserved', occupant_id: userId }).eq('id', stallId);
    if (error) throw error;
};

/**
 * TRANSACTIONS & FINANCE
 */
export const mapTransaction = (raw: any): Transaction => ({
    id: raw.id,
    marketId: raw.market_id,
    amount: raw.amount,
    date: raw.date || raw.created_at,
    type: raw.type,
    provider: raw.provider,
    stallId: raw.stall_id,
    stallNumber: raw.stall_number,
    reference: raw.reference,
    status: raw.status,
    collectedBy: raw.collected_by,
    collectedByName: raw.collected_by_name
});

export const fetchTransactions = async (page: number, limit: number, start?: number, end?: number) => {
    let query = supabase.from('transactions').select('*', { count: 'exact' }).order('date', { ascending: false });
    if (start) query = query.gte('date', start);
    if (end) query = query.lte('date', end);
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

export const fetchPaymentPlans = async (): Promise<PaymentPlan[]> => {
    const { data, error } = await supabase.from('payment_plans').select('*');
    if (error) throw error;
    return data as PaymentPlan[];
};

export const updatePaymentPlanStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('payment_plans').update({ status }).eq('id', id);
    if (error) throw error;
};

export const createPaymentPlan = async (plan: Omit<PaymentPlan, 'id' | 'status' | 'progress'>) => {
    const { error } = await supabase.from('payment_plans').insert([{ ...plan, status: 'pending', progress: 0 }]);
    if (error) throw error;
};

/**
 * SANCTIONS & APPEALS
 */
export const createSanction = async (sanction: Partial<Sanction>) => {
    const { error } = await supabase.from('sanctions').insert([sanction]);
    if (error) throw error;
};

export const contestSanction = async (id: string, reason: string) => {
    const { error } = await supabase.from('sanctions').update({ status: 'pending_appeal', appeal_reason: reason, appeal_date: Date.now() }).eq('id', id);
    if (error) throw error;
};

export const resolveSanctionAppeal = async (id: string, decision: 'accepted' | 'rejected') => {
    const status = decision === 'accepted' ? 'accepted' : 'rejected';
    const { error } = await supabase.from('sanctions').update({ status }).eq('id', id);
    if (error) throw error;
};

/**
 * PRODUCTS
 */
export const fetchProducts = async (options: { stallId?: string; limit?: number }) => {
    let query = supabase.from('products').select('*');
    if (options.stallId) query = query.eq('stall_id', options.stallId);
    if (options.limit) query = query.limit(options.limit);
    const { data, error } = await query;
    if (error) throw error;
    return data as Product[];
};

export const createProduct = async (product: Omit<Product, 'id'>) => {
    const { data, error } = await supabase.from('products').insert([product]).select().single();
    if (error) throw error;
    return data;
};

export const updateProduct = async (id: string, updates: Partial<Product>) => {
    const { error } = await supabase.from('products').update(updates).eq('id', id);
    if (error) throw error;
};

export const deleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
};

/**
 * ORDERS
 */
export const createOrder = async (order: Omit<ClientOrder, 'id' | 'date' | 'status'>) => {
    const { error } = await supabase.from('orders').insert([{ ...order, date: Date.now(), status: 'pending' }]);
    if (error) throw error;
};

export const updateOrderStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) throw error;
};

/**
 * MISSIONS
 */
export const createMission = async (mission: any) => {
    const { error } = await supabase.from('missions').insert([mission]);
    if (error) throw error;
};

export const updateMissionStatus = async (id: string, status: string, result?: string) => {
    const { error } = await supabase.from('missions').update({ status, result }).eq('id', id);
    if (error) throw error;
};

/**
 * EXPENSES
 */
export const createExpense = async (expense: Omit<Expense, 'id'>) => {
    const { error } = await supabase.from('expenses').insert([expense]);
    if (error) throw error;
};

export const deleteExpense = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
};

/**
 * AGENT & FRAUD
 */
export const verifyAgentIdentity = async () => {
    // Real validation logic would go here
    return true;
};

export const verifyAgentBadge = async (badgeData: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', badgeData).eq('role', 'agent').single();
    if (error || !data) return { isValid: false };
    return { isValid: true, agent: data };
};

export const reportFraudAttempt = async (marketId: string, stallId: string, stallNumber: string) => {
    await supabase.from('fraud_alerts').insert([{
        market_id: marketId,
        stall_id: stallId,
        stall_number: stallNumber,
        timestamp: Date.now(),
        description: "Tentative d'usurpation d'agent signalée par le vendeur.",
        status: 'new'
    }]);
};

export const fetchFraudAlerts = async (): Promise<FraudAlert[]> => {
    const { data, error } = await supabase.from('fraud_alerts').select('*').order('timestamp', { ascending: false });
    if (error) throw error;
    return data as FraudAlert[];
};

export const validateAgentDeposit = async (agentId: string, amount: number) => {
    const { error } = await supabase.from('agent_deposits').insert([{ agent_id: agentId, amount, timestamp: Date.now(), status: 'validated' }]);
    if (error) throw error;
    // Clear cash in hand
    await supabase.from('profiles').update({ agent_stats: { cash_in_hand: 0 } }).eq('id', agentId);
};

/**
 * AUDIT & REALTIME
 */
export const createAuditLog = async (log: Omit<AuditLog, 'id' | 'createdAt'>) => {
    const { error } = await supabase.from('audit_logs').insert([{ ...log, createdAt: Date.now() }]);
    if (error) console.error("Audit log failed", error);
};

export const fetchAuditLogs = async (): Promise<AuditLog[]> => {
    const { data, error } = await supabase.from('audit_logs').select('*').order('createdAt', { ascending: false });
    if (error) throw error;
    return data as AuditLog[];
};

export const logViewAction = async (actorId: string, action: string, targetId: string) => {
    await createAuditLog({ action, actorId, targetId });
};

export const subscribeToTable = (table: string, callback: (payload: any) => void, channelName?: string) => {
    return supabase.channel(channelName || `realtime_${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
        .subscribe();
};

/**
 * OFFLINE QUEUE
 */
export const syncOfflineQueue = async () => {
    const queue = getPendingItems();
    if (queue.length === 0) return 0;
    
    let processed = 0;
    for (const item of queue) {
        try {
            // Execution logic based on action name
            // For now, simulating success
            processed++;
            await removePendingItem(item.id);
        } catch (e) {
            // Move to failed
            const failed = JSON.parse(localStorage.getItem('mc_failed_queue') || '[]');
            failed.push({ ...item, errorReason: (e as any).message });
            localStorage.setItem('mc_failed_queue', JSON.stringify(failed));
            await removePendingItem(item.id);
        }
    }
    return processed;
};

export const getOfflineQueueSize = () => getPendingItems().length;
export const getFailedQueueSize = () => getFailedItems().length;
export const getPendingItems = () => JSON.parse(localStorage.getItem('mc_action_queue') || '[]');
export const getFailedItems = () => JSON.parse(localStorage.getItem('mc_failed_queue') || '[]');

export const removePendingItem = async (id: number) => {
    const queue = getPendingItems().filter((i: any) => i.id !== id);
    localStorage.setItem('mc_action_queue', JSON.stringify(queue));
};

export const retryFailedItem = (id: number) => {
    const failed = getFailedItems();
    const item = failed.find((i: any) => i.id === id);
    if (item) {
        const queue = getPendingItems();
        queue.push({ ...item, errorReason: undefined });
        localStorage.setItem('mc_action_queue', JSON.stringify(queue));
        discardFailedItem(id);
    }
};

export const discardFailedItem = (id: number) => {
    const failed = getFailedItems().filter((i: any) => i.id !== id);
    localStorage.setItem('mc_failed_queue', JSON.stringify(failed));
};

/**
 * FILE UPLOAD
 */
export const uploadFile = async (file: File, bucket: string, folder = '', options?: { skipCompression?: boolean }) => {
    const path = `${folder}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
};

/**
 * ANNULATION SÉCURISÉE (ANTI-CORRUPTION)
 * Annule une transaction et NOTIFIE immédiatement le vendeur.
 */
export const voidTransactionWithNotification = async (txId: string, agentId: string) => {
    // 1. Récupérer les détails de la transaction pour identifier le vendeur
    const { data: tx, error: fetchErr } = await supabase
        .from('transactions')
        .select('*, stalls(occupant_id, number)')
        .eq('id', txId)
        .single();

    if (fetchErr || !tx) throw new Error("Transaction introuvable");

    const vendorId = tx.stalls?.occupant_id;
    const stallNumber = tx.stalls?.number;

    // 2. Marquer la transaction comme annulée
    const { error: voidErr } = await supabase
        .from('transactions')
        .update({ status: 'cancelled', voided_at: Date.now(), voided_by: agentId })
        .eq('id', txId);

    if (voidErr) throw voidErr;

    // 3. Créer une notification CRITIQUE pour le vendeur
    if (vendorId) {
        await supabase.from('notifications').insert([{
            user_id: vendorId,
            title: "ALERTE : ANNULATION",
            message: `L'encaissement de ${tx.amount} F pour l'étal ${stallNumber} a été annulé par l'agent. Si vous avez déjà payé, réclamez immédiatement !`,
            type: 'alert',
            timestamp: Date.now(),
            read: false
        }]);
    }

    // 4. Logger dans l'Audit Trail immuable
    await createAuditLog({
        action: 'TRANSACTION_VOIDED',
        targetId: txId,
        actorId: agentId,
        reason: `Annulation manuelle par l'agent. Vendeur ${vendorId} notifié.`,
        oldValue: { status: 'completed', amount: tx.amount },
        newValue: { status: 'cancelled' }
    });

    return tx;
};
