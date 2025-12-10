
import { supabase } from '../supabaseClient';
import { User, VendorProfile, Market, Stall, Product, Transaction, ClientOrder, Expense, Sanction, AppNotification, Agent, AuditLog, AppRole } from '../types';

// --- CONFIGURATION ---
const QUEUE_KEY = 'mc_action_queue';
const FAILED_QUEUE_KEY = 'mc_failed_queue';

// --- UTILS AUDIT & DEVICE ---
// "L'Oeil de Dieu" - Capture des métadonnées techniques pour l'audit
const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    let device = "Desktop";
    let os = "Inconnu";
    let browser = "Inconnu";

    if (/Mobi|Android/i.test(ua)) device = "Mobile";
    if (/iPad|Tablet/i.test(ua)) device = "Tablette";

    if (ua.indexOf("Win") !== -1) os = "Windows";
    if (ua.indexOf("Mac") !== -1) os = "MacOS";
    if (ua.indexOf("Linux") !== -1) os = "Linux";
    if (ua.indexOf("Android") !== -1) os = "Android";
    if (ua.indexOf("like Mac") !== -1) os = "iOS";

    if (ua.indexOf("Chrome") !== -1) browser = "Chrome";
    else if (ua.indexOf("Safari") !== -1) browser = "Safari";
    else if (ua.indexOf("Firefox") !== -1) browser = "Firefox";
    else if (ua.indexOf("Edg") !== -1) browser = "Edge";

    return { device, os, browser, userAgent: ua };
};

export const logSystemAction = async (actorId: string, action: string, targetId: string, newValue?: any, reason?: string) => {
    const meta = getDeviceInfo();
    const payload = {
        actor_id: actorId,
        action,
        target_id: targetId,
        new_value: { 
            ...newValue, 
            _meta: { 
                ...meta, 
                timestamp: Date.now(), 
                url: window.location.href 
            } 
        },
        reason,
        created_at: new Date().toISOString()
    };

    // Tente un envoi direct pour l'audit (critique)
    const { error } = await supabase.from('audit_logs').insert([payload]);
    
    if (error) {
        console.error("Audit Log Failure:", error);
        // Fallback queue si échec critique, l'audit ne doit pas être perdu
        addToQueue('logAuditFallback', payload);
    }
};

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
    case 'reserveStall': return reserveStall(payload.stallId, payload.userId, undefined, undefined, true);
    case 'logAuditFallback': return supabase.from('audit_logs').insert([payload]); // Retry log
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

// --- HELPER FUNCTIONS ---

const mapProfile = (data: any): User => ({
  id: data.id,
  email: data.email || '',
  passwordHash: '', 
  role: (data.role as AppRole) || 'client',
  name: data.name || '',
  phone: data.phone || '',
  isBanned: data.is_banned || false,
  kycStatus: data.kyc_status || 'none',
  kycDocument: data.kyc_document,
  createdAt: new Date(data.created_at).getTime(),
  lastLogin: data.last_login ? new Date(data.last_login).getTime() : undefined,
  lastSeenAt: data.last_seen_at ? new Date(data.last_seen_at).getTime() : undefined,
  marketId: data.market_id,
  stallId: data.stall_id,
  bio: data.bio,
  photoUrl: data.photo_url,
  isLogisticsSubscribed: data.is_logistics_subscribed,
  subscriptionExpiry: data.subscription_expiry ? new Date(data.subscription_expiry).getTime() : undefined,
  addresses: data.addresses,
  shoppingList: data.shopping_list,
  loyaltyPoints: data.loyalty_points,
  favorites: data.favorites,
  preferences: data.preferences
});

const mapMarketFromDB = (m: any): Market => ({
    id: m.id,
    name: m.name,
    city: m.city,
    neighborhood: m.neighborhood,
    targetRevenue: m.target_revenue,
    capacity: m.capacity,
    baseRent: m.base_rent,
    hasDeliveryService: m.has_delivery_service,
    description: m.description,
    image: m.image_url
});

const mapMarketToDB = (m: any) => {
    const payload: any = {};
    if (m.name !== undefined) payload.name = m.name;
    if (m.city !== undefined) payload.city = m.city;
    if (m.neighborhood !== undefined) payload.neighborhood = m.neighborhood;
    if (m.targetRevenue !== undefined) payload.target_revenue = m.targetRevenue;
    if (m.capacity !== undefined) payload.capacity = m.capacity;
    if (m.baseRent !== undefined) payload.base_rent = m.baseRent;
    if (m.hasDeliveryService !== undefined) payload.has_delivery_service = m.hasDeliveryService;
    if (m.description !== undefined) payload.description = m.description;
    if (m.image !== undefined) payload.image_url = m.image; 
    return payload;
};

// --- AUTHENTICATION & USER MANAGEMENT ---

export const signInUser = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    
    // AUDIT LOG: LOGIN
    if (data.user) {
        logSystemAction(data.user.id, 'USER_LOGIN', data.user.id, { email }, 'Connexion au portail');
        // Update last login
        await supabase.from('profiles').update({ last_login: new Date().toISOString() }).eq('id', data.user.id);
    }
    return data;
};

export const signUpUser = async (email: string, pass: string, meta: any) => {
    const { data, error } = await supabase.auth.signUp({ 
        email, 
        password: pass,
        options: {
            data: {
                name: meta.name,
                role: meta.accountType,
                kyc_document: meta.kycDocument
            }
        }
    });
    if (error) throw error;
    if (data.user) {
        logSystemAction(data.user.id, 'USER_REGISTER', data.user.id, { email, role: meta.accountType }, 'Création de compte');
    }
    return data;
};

export const signOutUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        logSystemAction(user.id, 'USER_LOGOUT', user.id, {}, 'Déconnexion manuelle');
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

export const resetPasswordForEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
    });
    // On ne log pas l'acteur ici car il n'est pas connecté, mais on pourrait loguer la demande système
    if (error) throw error;
};

export const updateUserPassword = async (newPass: string, currentPass?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) logSystemAction(user.id, 'PASSWORD_UPDATE', user.id, {}, 'Changement mot de passe');
    
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) throw error;
};

export const verifyPassword = async (email: string, pass: string): Promise<boolean> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    return !error && !!data.user;
};

export const deleteUserAccount = async (password: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) throw new Error("Non connecté");
    
    const verified = await verifyPassword(user.email, password);
    if (!verified) throw new Error("Mot de passe incorrect");

    logSystemAction(user.id, 'ACCOUNT_DELETE_REQUEST', user.id, { email: user.email }, 'Demande suppression compte');
    console.warn("Account deletion requested.");
    await signOutUser();
};

export const checkValueExists = async (column: string, value: string): Promise<boolean> => {
    const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq(column, value);
    if (error) throw error;
    return (count || 0) > 0;
};

// --- DATA WRAPPERS ---

export const createTransaction = async (t: any, forceOnline = false) => {
    const newTx = { ...t, date: t.date || Date.now(), id: `PENDING_${Date.now()}`, status: 'pending' };

    if (!navigator.onLine && !forceOnline) {
        await addToQueue('createTransaction', newTx);
        return newTx; // Return optimistic object
    }
    
    const { data, error } = await supabase.from('transactions').insert([{
        market_id: t.marketId, amount: t.amount, type: t.type, provider: t.provider,
        stall_number: t.stallNumber, stall_id: t.stallId, reference: t.reference, collected_by: t.collectedBy, status: 'completed',
        date: new Date(t.date || Date.now()).toISOString()
    }]).select().single();
    
    if (error) throw error;
    
    if (t.collectedBy) logSystemAction(t.collectedBy, 'CREATE_TRANSACTION', data.id, { amount: t.amount, type: t.type }, `Paiement ${t.type}`);
    
    return { ...data, date: new Date(data.date).getTime() };
};

export const createSanction = async (s: any, forceOnline = false) => {
    if (!navigator.onLine && !forceOnline) {
        await addToQueue('createSanction', { ...s, date: Date.now() });
        return { ...s, id: `PENDING_${Date.now()}` };
    }
    const { data, error } = await supabase.from('transactions').insert([{
        market_id: s.marketId, amount: s.amount, type: 'fine', provider: 'system',
        stall_number: s.stallNumber, stall_id: s.stallId, reference: `SANCTION-${Date.now()}`, collected_by: s.issuedBy,
        status: 'completed', date: new Date(s.date || Date.now()).toISOString(), reason: s.reason
    }]).select().single();

    if (error) throw error;
    if (s.stallId) await supabase.from('stalls').update({ health_status: 'warning' }).eq('id', s.stallId);
    
    if (s.issuedBy) logSystemAction(s.issuedBy, 'ISSUE_SANCTION', data.id, { amount: s.amount, stall: s.stallNumber }, s.reason);

    return { ...data, date: new Date(data.date).getTime() };
};

export const createReport = async (r: any, forceOnline = false) => {
    if (!navigator.onLine && !forceOnline) {
        await addToQueue('createReport', { ...r, timestamp: Date.now() });
        return r;
    }
    const { data, error } = await supabase.from('hygiene_reports').insert([{
        market_id: r.marketId, category: r.category, description: r.description,
        location: r.location, status: 'pending', is_anonymous: r.isAnonymous, has_audio: r.hasAudio
    }]).select().single();
    if (error) throw error;
    return data;
};

export const createProduct = async (p: any, forceOnline = false) => {
    if (!navigator.onLine && !forceOnline) {
        await addToQueue('createProduct', p);
        return { ...p, id: `PENDING_${Date.now()}` };
    }
    
    const { data, error } = await supabase.from('products').insert([{
        stall_id: p.stallId, name: p.name, price: p.price, stock_quantity: p.stockQuantity, category: p.category, unit: p.unit,
        description: p.description, image_url: p.imageUrl, details: { costPrice: p.costPrice, isVisible: p.isVisible, tags: p.tags }
    }]).select().single();
    if(error) throw error;
    
    return { 
        ...data, 
        stallId: data.stall_id, 
        stockQuantity: data.stock_quantity,
        imageUrl: data.image_url,
        costPrice: data.details?.costPrice,
        isVisible: data.is_visible,
        tags: data.details?.tags
    };
};

export const updateProduct = async (id: string, updates: any, forceOnline = false) => {
    if (!navigator.onLine && !forceOnline) {
        await addToQueue('updateProduct', { id, updates });
        return { id, ...updates };
    }
    const payload: any = {};
    if(updates.name) payload.name = updates.name;
    if(updates.price !== undefined) payload.price = updates.price;
    if(updates.stockQuantity !== undefined) payload.stock_quantity = updates.stockQuantity;
    if(updates.imageUrl) payload.image_url = updates.imageUrl;
    if(updates.isVisible !== undefined) payload.is_visible = updates.isVisible;
    
    const { data, error } = await supabase.from('products').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
};

// MARKET MANAGEMENT
export const createMarket = async (m: any) => { 
    const payload = mapMarketToDB(m);
    const { data, error } = await supabase.from('markets').insert([payload]).select().single(); 
    if (error) throw error;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) logSystemAction(user.id, 'CREATE_MARKET', data.id, payload, `Création marché ${m.name}`);
    return mapMarketFromDB(data);
};

export const updateMarket = async (id: string, m: any) => { 
    const payload = mapMarketToDB(m);
    const { data, error } = await supabase.from('markets').update(payload).eq('id', id).select().single();
    if (error) throw error;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) logSystemAction(user.id, 'UPDATE_MARKET', id, payload, `Mise à jour marché`);
    return mapMarketFromDB(data);
};

export const deleteMarket = async (id: string) => { 
    const { error } = await supabase.from('markets').delete().eq('id', id); 
    if (error) throw error;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) logSystemAction(user.id, 'DELETE_MARKET', id, {}, `Suppression marché`);
};

// STALL MANAGEMENT
export const createStall = async (s: any) => { 
    const payload = {
        market_id: s.marketId,
        number: s.number,
        zone: s.zone,
        price: s.price,
        size: s.size,
        status: s.status || 'free',
        product_type: s.productType,
        health_status: s.healthStatus || 'healthy',
        compliance_score: s.complianceScore || 100,
        surface_area: s.surfaceArea,
        lat: s.coordinates?.lat, // Mapped from coordinates object
        lng: s.coordinates?.lng, // Mapped from coordinates object
        details: { 
            documents: s.documents,
            activityLog: s.activityLog,
            employees: s.employees,
            messages: s.messages
        }
    };

    const { data, error } = await supabase.from('stalls').insert([payload]).select().single(); 
    if (error) throw error;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) logSystemAction(user.id, 'CREATE_STALL', data.id, { number: s.number }, `Création étal`);

    return {
        ...data,
        marketId: data.market_id,
        occupantId: data.occupant_id,
        surfaceArea: data.surface_area,
        productType: data.product_type,
        healthStatus: data.health_status,
        coordinates: (data.lat && data.lng) ? { lat: data.lat, lng: data.lng } : undefined,
        documents: data.details?.documents || [],
        activityLog: data.details?.activityLog || [],
        employees: data.details?.employees || [],
        messages: data.details?.messages || []
    };
};

export const createExpense = async (e: any) => { 
    const payload = {
        market_id: e.marketId,
        category: e.category,
        amount: e.amount,
        description: e.description,
        date: new Date(e.date).toISOString()
    };
    const { data, error } = await supabase.from('expenses').insert([payload]).select().single(); 
    if (error) throw error;
    return { ...data, marketId: data.market_id, date: new Date(data.date).getTime() };
};

export const subscribeToTable = (table: string, cb: (payload: any) => void, uniqueChannelId?: string) => {
    const channelName = uniqueChannelId || `public:${table}_${Date.now()}`;
    return supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table }, cb)
      .subscribe();
};

export const fetchMarkets = async (): Promise<Market[]> => {
    const { data, error } = await supabase.from('markets').select('*');
    if (error) throw error;
    return (data || []).map(mapMarketFromDB);
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
        coordinates: (s.lat && s.lng) ? { lat: s.lat, lng: s.lng } : undefined,
        activityLog: s.details?.activityLog || [],
        documents: s.details?.documents || [],
        employees: s.details?.employees || [],
        messages: s.details?.messages || [],
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
        stallId: t.stall_id,
        stallNumber: t.stall_number,
        collectedBy: t.collected_by,
        date: new Date(t.date).getTime()
    }));
    return { transactions, count: count || 0 };
};

export const fetchExpenses = async (): Promise<Expense[]> => {
    const { data, error } = await supabase.from('expenses').select('*');
    if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205' || error.message.includes('expenses')) { 
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
    const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    return (data || []).map((l: any) => ({
        ...l,
        actorId: l.actor_id,
        targetId: l.target_id,
        newValue: l.new_value,
        createdAt: new Date(l.created_at).getTime(),
        metadata: l.new_value?._meta
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

export const updateOrderStatus = async (orderId: string, status: string) => {
    await supabase.from('client_orders').update({ status }).eq('id', orderId);
};

export const deleteProduct = async (id: string) => { await supabase.from('products').delete().eq('id', id); };
export const deleteStall = async (id: string) => { await supabase.from('stalls').delete().eq('id', id); };
export const deleteExpense = async (id: string) => { await supabase.from('expenses').delete().eq('id', id); };
export const createBulkStalls = async (stalls: any[]) => { 
    // Bulk create helper mapping
    const mappedStalls = stalls.map(s => ({
        market_id: s.marketId,
        number: s.number,
        zone: s.zone,
        price: s.price,
        size: s.size,
        status: s.status || 'free',
        product_type: s.productType,
        health_status: s.healthStatus || 'healthy',
        compliance_score: s.complianceScore || 100,
        surface_area: s.surfaceArea,
        lat: s.coordinates?.lat,
        lng: s.coordinates?.lng,
        details: { 
            documents: s.documents,
            activityLog: s.activityLog,
            employees: s.employees,
            messages: s.messages
        }
    }));
    await supabase.from('stalls').insert(mappedStalls); 
};
export const adminUpdateUserStatus = async (userId: string, updates: Partial<User>) => {
     const payload: any = {};
     if (updates.isBanned !== undefined) payload.is_banned = updates.isBanned;
     if (updates.role) payload.role = updates.role;
     if (updates.kycStatus) payload.kyc_status = updates.kycStatus;
     
     const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
     if (error) throw error;

     const { data: { user } } = await supabase.auth.getUser();
     if (user) logSystemAction(user.id, 'UPDATE_USER_STATUS', userId, updates, 'Modification statut admin');
};

export const contestSanction = async (sanctionId: string, reason: string, forceOnline = false) => {
    if (!navigator.onLine && !forceOnline) {
        await addToQueue('contestSanction', { id: sanctionId, reason });
        return;
    }
    await supabase.from('transactions').update({
        status: 'pending_appeal',
        appeal_reason: reason,
        appeal_date: new Date().toISOString()
    }).eq('id', sanctionId);
};

export const resolveSanctionAppeal = async (sanctionId: string, decision: 'accepted' | 'rejected', forceOnline = false) => {
    if (!navigator.onLine && !forceOnline) {
        await addToQueue('resolveSanctionAppeal', { id: sanctionId, decision });
        return;
    }
    const updates = decision === 'accepted' ? { status: 'appeal_accepted', amount: 0 } : { status: 'appeal_rejected' };
    await supabase.from('transactions').update(updates).eq('id', sanctionId);
};

export const updateUserProfile = async (userId: string, updates: Partial<VendorProfile | User>, forceOnline = false) => {
     if (!navigator.onLine && !forceOnline) {
         await addToQueue('updateUserProfile', { id: userId, updates });
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
     
     const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
     if (error) throw error;
     
     // Auto log profile updates (except repetitive ones like last_seen)
     if (!anyUpdates.lastSeenAt) {
         logSystemAction(userId, 'UPDATE_PROFILE', userId, payload, 'Mise à jour profil utilisateur');
     }
};

export const verifyAgentIdentity = async (): Promise<boolean> => {
    await new Promise(r => setTimeout(r, 1000));
    return true; 
};

export const reserveStall = async (stallId: string, userId: string, provider?: string, isPriority?: boolean, forceOnline = false) => {
    if (!navigator.onLine && !forceOnline) {
        await addToQueue('reserveStall', { stallId, userId, provider, isPriority });
        return;
    }
    const { error } = await supabase.from('stalls').update({ 
        status: 'occupied', 
        occupant_id: userId,
        is_priority: isPriority,
        last_payment_date: new Date().toISOString()
    }).eq('id', stallId);
    if (error) throw error;
    
    logSystemAction(userId, 'RESERVE_STALL', stallId, { provider }, 'Réservation étal');
};
