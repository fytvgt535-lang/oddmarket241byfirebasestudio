
import { supabase } from '../supabaseClient';
import { User, VendorProfile, Market, Stall, Product, Transaction, ClientOrder, Expense, Sanction, AppNotification, Agent, AuditLog } from '../types';

// --- CONFIGURATION ---
const QUEUE_KEY = 'mc_action_queue';
const FAILED_QUEUE_KEY = 'mc_failed_queue';
const CACHE_PREFIX = 'mc_cache_';

// --- OFFLINE QUEUE SYSTEM ---

interface QueueItem {
  id: number;
  action: string;
  payload: any;
  timestamp: number;
  retryCount: number;
  errorReason?: string;
}

const getQueue = (key: string): QueueItem[] => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : [];
  } catch { return []; }
};

const saveQueue = (key: string, queue: QueueItem[]) => {
  localStorage.setItem(key, JSON.stringify(queue));
  window.dispatchEvent(new Event('storage'));
};

export const addToQueue = async (action: string, payload: any) => {
  const queue = getQueue(QUEUE_KEY);
  queue.push({
    id: Date.now(),
    action,
    payload,
    timestamp: Date.now(),
    retryCount: 0
  });
  saveQueue(QUEUE_KEY, queue);
};

export const getOfflineQueueSize = () => getQueue(QUEUE_KEY).length;
export const getFailedQueueSize = () => getQueue(FAILED_QUEUE_KEY).length;
export const getPendingItems = () => getQueue(QUEUE_KEY);
export const getFailedItems = () => getQueue(FAILED_QUEUE_KEY);

export const removePendingItem = async (id: number) => {
  const queue = getQueue(QUEUE_KEY);
  saveQueue(QUEUE_KEY, queue.filter(i => i.id !== id));
};

export const discardFailedItem = (id: number) => {
  const queue = getQueue(FAILED_QUEUE_KEY);
  saveQueue(FAILED_QUEUE_KEY, queue.filter(i => i.id !== id));
};

export const retryFailedItem = (id: number) => {
  const failed = getQueue(FAILED_QUEUE_KEY);
  const item = failed.find(i => i.id === id);
  if (item) {
    discardFailedItem(id);
    addToQueue(item.action, item.payload);
  }
};

const executeAction = async (action: string, payload: any) => {
  switch (action) {
    case 'createTransaction': return createTransaction(payload, true);
    case 'createSanction': return createSanction(payload, true);
    case 'contestSanction': return contestSanction(payload.id, payload.reason, true);
    case 'resolveSanctionAppeal': return resolveSanctionAppeal(payload.id, payload.decision, true);
    case 'createReport': return createReport(payload, true);
    case 'createProduct': return createProduct(payload, true);
    case 'updateProduct': return updateProduct(payload.id, payload.updates, true);
    case 'createOrder': return createOrder(payload, true);
    case 'updateUserProfile': return updateUserProfile(payload.id, payload.updates, true);
    default: throw new Error(`Unknown action: ${action}`);
  }
};

export const syncOfflineQueue = async () => {
  if (!navigator.onLine) return 0;
  
  const queue = getQueue(QUEUE_KEY);
  if (queue.length === 0) return 0;

  const failedQueue = getQueue(FAILED_QUEUE_KEY);
  let processedCount = 0;
  const remainingQueue: QueueItem[] = [];

  for (const item of queue) {
    try {
      await executeAction(item.action, item.payload);
      processedCount++;
    } catch (e: any) {
      console.error(`Sync failed for ${item.action}`, e);
      item.retryCount++;
      item.errorReason = e.message;
      if (item.retryCount > 3) {
        failedQueue.push(item);
      } else {
        remainingQueue.push(item);
      }
    }
  }

  saveQueue(QUEUE_KEY, remainingQueue);
  saveQueue(FAILED_QUEUE_KEY, failedQueue);
  
  return processedCount;
};

// ==================================================================================
// CACHE PATCHING UTILS (Local-First Mutations)
// ==================================================================================

const patchLocalCache = <T>(key: string, updateFn: (data: T) => T) => {
    const fullKey = `${CACHE_PREFIX}${key}`;
    const cachedStr = localStorage.getItem(fullKey);
    if (cachedStr) {
        try {
            const cachedObj = JSON.parse(cachedStr);
            const newData = updateFn(cachedObj.data);
            localStorage.setItem(fullKey, JSON.stringify({ ...cachedObj, data: newData }));
        } catch (e) {
            console.error("Cache patch failed", e);
        }
    }
};

// --- DATA WRAPPERS (Queue-Aware & Cache-Patching) ---

export const createTransaction = async (t: any, forceOnline = false) => {
    const newTx = { ...t, date: t.date || Date.now(), id: `PENDING_${Date.now()}`, status: 'pending' };

    if (!navigator.onLine && !forceOnline) {
        await addToQueue('createTransaction', newTx);
        if (t.type === 'rent' && t.stallNumber) {
            patchLocalCache<Stall[]>('stalls', (stalls) => {
                return stalls.map(s => {
                    if (s.number === t.stallNumber && s.marketId === t.marketId) {
                        return { ...s, lastPaymentDate: Date.now(), healthStatus: 'healthy' };
                    }
                    return s;
                });
            });
        }
        return;
    }
    
    const { error } = await supabase.from('transactions').insert([{
        market_id: t.marketId, amount: t.amount, type: t.type, provider: t.provider,
        stall_number: t.stallNumber, reference: t.reference, collected_by: t.collectedBy, status: 'completed',
        date: new Date(t.date || Date.now()).toISOString()
    }]);
    if (error) throw error;
};

export const createSanction = async (s: any, forceOnline = false) => {
    if (!navigator.onLine && !forceOnline) {
        await addToQueue('createSanction', { ...s, date: Date.now() });
        if (s.stallId) {
            patchLocalCache<Stall[]>('stalls', (stalls) => {
                return stalls.map(st => st.id === s.stallId ? { ...st, healthStatus: 'warning' } : st);
            });
        }
        return;
    }
    const { error } = await supabase.from('transactions').insert([{
        market_id: s.marketId, amount: s.amount, type: 'fine', provider: 'system',
        stall_number: s.stallNumber, reference: `SANCTION-${Date.now()}`, collected_by: s.issuedBy,
        status: 'completed', date: new Date(s.date || Date.now()).toISOString(), reason: s.reason
    }]);
    if (error) throw error;
    if (s.stallId) await supabase.from('stalls').update({ health_status: 'warning' }).eq('id', s.stallId);
};

export const contestSanction = async (sanctionId: string, reason: string, forceOnline = false) => {
    if (!navigator.onLine && !forceOnline) {
        await addToQueue('contestSanction', { id: sanctionId, reason });
        patchLocalCache<any[]>('sanctions', (sanctions) => {
            return sanctions.map(s => s.id === sanctionId ? { 
                ...s, 
                status: 'pending_appeal',
                appealReason: reason,
                appealDate: Date.now()
            } : s);
        });
        return;
    }

    const { error } = await supabase.from('transactions').update({
        status: 'pending_appeal',
        appeal_reason: reason,
        appeal_date: new Date().toISOString()
    }).eq('id', sanctionId);

    if (error) throw error;
};

export const resolveSanctionAppeal = async (sanctionId: string, decision: 'accepted' | 'rejected', forceOnline = false) => {
    if (!navigator.onLine && !forceOnline) {
        await addToQueue('resolveSanctionAppeal', { id: sanctionId, decision });
        patchLocalCache<any[]>('sanctions', (sanctions) => {
            return sanctions.map(s => s.id === sanctionId ? { 
                ...s, 
                status: decision === 'accepted' ? 'appeal_accepted' : 'appeal_rejected',
                amount: decision === 'accepted' ? 0 : s.amount 
            } : s);
        });
        return;
    }
    
    const updates = decision === 'accepted' 
        ? { status: 'appeal_accepted', amount: 0 } 
        : { status: 'appeal_rejected' };

    const { error } = await supabase.from('transactions').update(updates).eq('id', sanctionId);
    if (error) throw error;
};

export const createReport = async (r: any, forceOnline = false) => {
    if (!navigator.onLine && !forceOnline) {
        await addToQueue('createReport', { ...r, timestamp: Date.now() });
        return;
    }
    const { error } = await supabase.from('hygiene_reports').insert([{
        market_id: r.marketId, category: r.category, description: r.description,
        location: r.location, status: 'pending', is_anonymous: r.isAnonymous, has_audio: r.hasAudio
    }]);
    if (error) throw error;
};

export const createProduct = async (p: any, forceOnline = false) => {
    if (!navigator.onLine && !forceOnline) {
        await addToQueue('createProduct', p);
        return { ...p, id: `PENDING_${Date.now()}` };
    }
    
    const { data, error } = await supabase.from('products').insert([{
        stall_id: p.stallId, name: p.name, price: p.price, stock_quantity: p.stockQuantity, category: p.category, unit: p.unit,
        description: p.description, image_url: p.imageUrl, details: { costPrice: p.costPrice, isVisible: p.isVisible, tags: p.tags }
    }]).select();
    if(error) throw error;
    return { ...p, id: data[0].id };
};

export const updateProduct = async (id: string, updates: any, forceOnline = false) => {
    if (!navigator.onLine && !forceOnline) {
        await addToQueue('updateProduct', { id, updates });
        patchLocalCache<Product[]>('products', (products) => {
            return products.map(p => p.id === id ? { ...p, ...updates } : p);
        });
        return;
    }
    const payload: any = {};
    if(updates.name) payload.name = updates.name;
    if(updates.price !== undefined) payload.price = updates.price;
    if(updates.stockQuantity !== undefined) payload.stock_quantity = updates.stockQuantity;
    if(updates.imageUrl) payload.image_url = updates.imageUrl;
    if(updates.isVisible !== undefined) payload.is_visible = updates.isVisible;
    
    await supabase.from('products').update(payload).eq('id', id);
};

export const createOrder = async (order: any, forceOnline = false) => {
    if (!navigator.onLine && !forceOnline) {
        await addToQueue('createOrder', order);
        return;
    }
    const { error } = await supabase.rpc('create_order_atomic', {
        p_stall_id: order.stallId, p_customer_id: order.customerId, p_customer_name: order.customerName,
        p_customer_phone: order.customerPhone, p_items: order.items, p_total_amount: order.totalAmount,
        p_payment_provider: order.paymentProvider, p_payment_ref: order.paymentRef
    });
    if (error) throw new Error(error.message);
};

export const updateUserProfile = async (userId: string, updates: Partial<VendorProfile | User>, forceOnline = false) => {
     if (!navigator.onLine && !forceOnline) {
         await addToQueue('updateUserProfile', { id: userId, updates });
         const key = `profile_${userId}`;
         const cached = localStorage.getItem(key);
         if (cached) {
             localStorage.setItem(key, JSON.stringify({ ...JSON.parse(cached), ...updates }));
         }
         return;
     }
     
     const payload: any = {};
     const anyUpdates = updates as any;
     if (anyUpdates.name) payload.name = anyUpdates.name;
     if (anyUpdates.phone) payload.phone = anyUpdates.phone;
     if (anyUpdates.bio) payload.bio = anyUpdates.bio;
     if (anyUpdates.photoUrl) payload.photo_url = anyUpdates.photoUrl;
     if (anyUpdates.favorites) payload.favorites = anyUpdates.favorites;
     if (anyUpdates.preferences) payload.preferences = anyUpdates.preferences;
     if (anyUpdates.addresses) payload.addresses = anyUpdates.addresses;
     
     const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
     if (error) throw error;
};

// --- AUTH & ADMIN ---

export const signInUser = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error; return data;
};
export const signOutUser = async () => { await supabase.auth.signOut(); };
export const signUpUser = async (email: string, password: string, meta: any) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name: meta.name, role: meta.accountType === 'vendor' ? 'vendor' : 'client' } } });
    if (error) throw error;
    if (data.user) await createProfile({ id: data.user.id, email, name: meta.name, role: meta.accountType === 'vendor' ? 'vendor' : 'client', kycStatus: 'pending', kycDocument: meta.kycDocument, isBanned: false, phone: '', createdAt: Date.now(), passwordHash: '' });
};
export const createProfile = async (profile: any) => {
    const dbProfile = {
        id: profile.id, email: profile.email, name: profile.name, role: profile.role,
        kyc_status: profile.kycStatus, kyc_document: profile.kycDocument, is_banned: profile.is_banned,
        created_at: new Date(profile.createdAt).toISOString(), phone: profile.phone
    };
    const { error } = await supabase.from('profiles').insert([dbProfile]);
    if (error) throw error;
};
export const resetPasswordForEmail = async (email: string) => { await supabase.auth.resetPasswordForEmail(email); };
export const updateUserPassword = async (n: string, _o?: string) => { await supabase.auth.updateUser({ password: n }); };
export const deleteUserAccount = async (_p: string) => { await supabase.rpc('delete_own_account'); await signOutUser(); };
export const verifyPassword = async (e: string, p: string) => { if (!navigator.onLine) return true; const { error } = await supabase.auth.signInWithPassword({ email: e, password: p }); return !error; };
export const verifyAgentIdentity = async () => { await new Promise(r => setTimeout(r, 1000)); return true; };

const mapProfile = (p: any): User => ({
    id: p.id, email: p.email, name: p.name, role: p.role, phone: p.phone,
    isBanned: p.is_banned, kycStatus: p.kyc_status, kycDocument: p.kyc_document,
    createdAt: new Date(p.created_at).getTime(), lastSeenAt: p.last_seen_at ? new Date(p.last_seen_at).getTime() : undefined,
    marketId: p.market_id, stallId: p.stall_id, bio: p.bio, photoUrl: p.avatar_url || p.photo_url,
    isLogisticsSubscribed: p.is_logistics_subscribed, subscriptionExpiry: p.subscription_expiry ? new Date(p.subscription_expiry).getTime() : undefined,
    passwordHash: '***', favorites: p.favorites, preferences: p.preferences, addresses: p.addresses, loyaltyPoints: p.loyalty_points
});

export const checkValueExists = async (column: string, value: string) => {
    if (!navigator.onLine) return false;
    const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq(column, value);
    return (count || 0) > 0;
};
export const logAuditAction = async (actorId: string, action: string, targetId: string, details: any) => {
    if (!navigator.onLine) return;
    await supabase.from('audit_logs').insert([{ actor_id: actorId, action, target_id: targetId, new_value: details }]);
}; 
export const logUserActivity = async (userId: string, action: string, details: string) => {
    if (!navigator.onLine) return;
    await supabase.from('user_activity_logs').insert([{ user_id: userId, action_type: action, details }]);
}; 
export const updateUserPresence = async (userId: string, status: string) => {
    if (!navigator.onLine) return;
    await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', userId);
}; 

// UPDATE: Support for Unique Channel ID to prevent collisions
export const subscribeToTable = (table: string, cb: (payload: any) => void, uniqueChannelId?: string) => {
    const channelName = uniqueChannelId || `public:${table}`;
    return supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table }, cb)
      .subscribe();
};

// --- ENTITY CRUD ---

export const createMarket = async (m: any) => { const { data } = await supabase.from('markets').insert([m]).select(); return data; };
export const updateMarket = async (id: string, m: any) => { await supabase.from('markets').update(m).eq('id', id); };
export const deleteMarket = async (id: string) => { await supabase.from('markets').delete().eq('id', id); };
export const createStall = async (s: any) => { await supabase.from('stalls').insert([s]); };
export const createBulkStalls = async (stalls: any[]) => { await supabase.from('stalls').insert(stalls); };
export const deleteStall = async (id: string) => { await supabase.from('stalls').delete().eq('id', id); };
export const createExpense = async (e: any) => { await supabase.from('expenses').insert([{...e, date: new Date(e.date).toISOString()}]); };
export const deleteExpense = async (id: string) => { await supabase.from('expenses').delete().eq('id', id); };
export const deleteProduct = async (id: string) => { await supabase.from('products').delete().eq('id', id); };
export const reserveStall = async (stallId: string, userId: string) => {
    if (!navigator.onLine) throw new Error("Réservation impossible hors-ligne.");
    await supabase.from('stalls').update({ status: 'occupied', occupant_id: userId }).eq('id', stallId);
    await supabase.from('profiles').update({ stall_id: stallId }).eq('id', userId);
};
export const adminUpdateUserStatus = async (userId: string, updates: Partial<User>) => {
     const payload: any = {};
     if (updates.isBanned !== undefined) payload.is_banned = updates.isBanned;
     if (updates.role) payload.role = updates.role;
     if (updates.kycStatus) payload.kyc_status = updates.kycStatus;
     await supabase.from('profiles').update(payload).eq('id', userId);
};

// --- DATA FETCHERS ---

export const fetchMarkets = async (): Promise<Market[]> => {
    const { data, error } = await supabase.from('markets').select('*');
    if (error) throw error;
    return data || [];
};

export const fetchStalls = async (): Promise<Stall[]> => {
    const { data, error } = await supabase.from('stalls').select('*');
    if (error) throw error;
    return (data || []).map((s: any) => ({
        ...s,
        occupantId: s.occupant_id,
        occupantName: s.occupant_name,
        marketId: s.market_id,
        productType: s.product_type,
        lastPaymentDate: s.last_payment_date ? new Date(s.last_payment_date).getTime() : undefined,
        healthStatus: s.health_status,
        complianceScore: s.compliance_score,
        activityLog: s.activity_log || [],
        documents: s.documents || [],
        employees: s.employees || [],
        messages: s.messages || [],
        surfaceArea: s.surface_area
    }));
};

export const fetchProducts = async (): Promise<Product[]> => {
    const { data, error } = await supabase.from('products').select('*');
    if (error) throw error;
    return (data || []).map((p: any) => ({
        ...p,
        stallId: p.stall_id,
        stockQuantity: p.stock_quantity,
        imageUrl: p.image_url,
        costPrice: p.details?.costPrice,
        isVisible: p.is_visible,
        tags: p.details?.tags
    }));
};

export const fetchTransactions = async (page = 1, limit = 50, start?: number, end?: number): Promise<{transactions: Transaction[], count: number}> => {
    let query = supabase.from('transactions').select('*', { count: 'exact' });
    if (start) query = query.gte('date', new Date(start).toISOString());
    if (end) query = query.lte('date', new Date(end).toISOString());
    query = query.range((page - 1) * limit, page * limit - 1).order('date', { ascending: false });
    
    const { data, count, error } = await query;
    if (error) throw error;
    const transactions = (data || []).map((t: any) => ({
        ...t,
        marketId: t.market_id,
        stallNumber: t.stall_number,
        collectedBy: t.collected_by,
        date: new Date(t.date).getTime()
    }));
    return { transactions, count: count || 0 };
};

export const fetchExpenses = async (): Promise<Expense[]> => {
    const { data, error } = await supabase.from('expenses').select('*');
    if (error) {
        // PGRST205: relation "public.expenses" does not exist
        // Nous gérons ce cas spécifique pour éviter un écran blanc si la table n'a pas été migrée
        if (error.code === '42P01' || error.code === 'PGRST205' || error.message.includes('expenses')) { 
            console.warn("[System] Table 'expenses' manquante ou inaccessible - Fonctionnalité Finance désactivée temporairement.");
            return [];
        }
        throw error;
    }
    return (data || []).map((e: any) => ({ ...e, marketId: e.market_id, date: new Date(e.date).getTime() }));
};

export const fetchOrders = async (): Promise<ClientOrder[]> => {
    const { data, error } = await supabase.from('client_orders').select('*');
    if (error) throw error;
    return (data || []).map((o: any) => ({
        ...o,
        stallId: o.stall_id,
        customerId: o.customer_id,
        customerName: o.customer_name,
        customerPhone: o.customer_phone,
        totalAmount: o.total_amount,
        paymentProvider: o.payment_provider,
        paymentRef: o.payment_ref,
        deliveryMode: o.delivery_mode,
        date: new Date(o.created_at).getTime()
    }));
};

export const fetchProfiles = async (): Promise<User[]> => {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) throw error;
    return (data || []).map(mapProfile);
};

export const fetchFinancialStats = async () => {
    const { data: txs } = await supabase.from('transactions').select('amount');
    const { data: exps } = await supabase.from('expenses').select('amount');
    const totalRevenue = (txs || []).reduce((acc: any, t: any) => acc + t.amount, 0);
    const totalExpenses = (exps || []).reduce((acc: any, e: any) => acc + e.amount, 0);
    return { totalRevenue, totalExpenses, netBalance: totalRevenue - totalExpenses };
};

export const fetchAuditLogs = async (): Promise<AuditLog[]> => {
    const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return (data || []).map((l: any) => ({
        ...l,
        actorId: l.actor_id,
        targetId: l.target_id,
        newValue: l.new_value,
        createdAt: new Date(l.created_at).getTime()
    }));
};

export const getCurrentUserProfile = async (userId: string): Promise<User | null> => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) return null;
    return mapProfile(data);
};

export const uploadFile = async (file: File, bucket: string): Promise<string> => {
    const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
    const { data, error } = await supabase.storage.from(bucket).upload(fileName, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return publicUrl;
};
