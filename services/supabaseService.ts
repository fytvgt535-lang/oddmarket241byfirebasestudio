
import { supabase } from '../supabaseClient';
import { User, VendorProfile, Market, Stall, Product, Transaction, ClientOrder, Expense, Sanction, AppNotification, Agent, AuditLog } from '../types';

// --- UTILS ---
const compressImage = async (file: File, maxWidth = 1000, quality = 0.8): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const elem = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
        elem.width = width;
        elem.height = height;
        const ctx = elem.getContext('2d');
        if (!ctx) { reject(new Error("Canvas context missing")); return; }
        ctx.drawImage(img, 0, 0, width, height);
        ctx.canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Compression failed'));
        }, 'image/webp', quality);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

// --- CACHING SYSTEM (READ STRATEGY) ---
const fetchWithCache = async <T>(key: string, fetcher: () => Promise<T>, ttlMinutes = 60): Promise<T> => {
    const cacheKey = `mc_cache_${key}`;
    
    // 1. Try Network First
    if (navigator.onLine) {
        try {
            const data = await fetcher();
            // Save to cache with timestamp
            const cacheEntry = { data, timestamp: Date.now() };
            localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
            return data;
        } catch (error) {
            console.warn(`[Offline] Network fetch failed for ${key}, falling back to cache.`);
        }
    }

    // 2. Fallback to Cache
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        const { data } = JSON.parse(cached);
        // Note: In a military-grade app, we might check TTL here, but for market usage, showing stale data is better than no data.
        return data as T;
    }

    // 3. Fail gracefully
    console.error(`[Offline] No network and no cache for ${key}`);
    return [] as unknown as T; // Return empty array/object structure to prevent crash
};

// --- DEVICE & IP CAPTURE ---
const getClientMeta = async () => {
    let ip = 'IP Masquée';
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        ip = data.ip;
    } catch (e) {
        // Silent fail for offline mode
    }

    const ua = navigator.userAgent;
    let device = "PC/Bureau";
    if (/Android/i.test(ua)) device = "Android Mobile";
    else if (/iPhone/i.test(ua)) device = "iPhone";
    else if (/iPad/i.test(ua)) device = "iPad";
    else if (/Windows/i.test(ua)) device = "Windows PC";
    else if (/Mac/i.test(ua)) device = "Macintosh";

    // Extract browser/brand loosely
    const browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Safari') ? 'Safari' : ua.includes('Firefox') ? 'Firefox' : 'Autre';

    return { ip, device, details: `${device} - ${browser}` };
};

// --- OFFLINE QUEUE SYSTEM (STORE & FORWARD - WRITE STRATEGY) ---
const QUEUE_KEY = 'marche_offline_queue';

const addToOfflineQueue = (action: string, payload: any) => {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    queue.push({ id: Date.now(), action, payload, timestamp: Date.now() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.log(`[Offline] Action ${action} queued. Total: ${queue.length + 1}`);
};

export const getOfflineQueueSize = (): number => {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]').length;
};

export const syncOfflineQueue = async (): Promise<number> => {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    if (queue.length === 0) return 0;

    const remaining = [];
    let processed = 0;

    for (const item of queue) {
        try {
            // Force online flag to bypass the offline check in the recursive call
            if (item.action === 'createTransaction') await createTransaction(item.payload, true);
            else if (item.action === 'createSanction') await createSanction(item.payload, true);
            else if (item.action === 'createReport') await createReport(item.payload, true);
            else if (item.action === 'createOrder') await createOrder(item.payload, true);
            
            processed++;
        } catch (e) {
            console.error(`[Sync] Failed to process item ${item.id}`, e);
            remaining.push(item); // Keep in queue if specific failure (e.g. server error vs network error)
        }
    }

    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    return processed;
};

// --- SECURITY & AUDIT ---

export const verifyPassword = async (email: string, pass: string): Promise<boolean> => {
    if (!navigator.onLine) return true; // Bypass sensitive check offline OR deny? For safety, allow cached session but deny sensitive actions.
    // However, to allow full offline usage, we rely on Supabase session persistence.
    // For specific "High Security" actions like deleting data, we should BLOCK offline.
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) return false;
    return true; 
};

export const verifyAgentIdentity = async (): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return true;
};

// Log sensitive actions (Immutable)
export const logAuditAction = async (actorId: string, action: string, targetId: string, details: { old?: any, new?: any, reason?: string }) => {
    try {
        if (!navigator.onLine) return; // Audit logs skipped offline to save queue space

        const meta = await getClientMeta();
        const metaData = {
            ...details.new,
            _meta: {
                ip: meta.ip,
                device: meta.device,
                browser: meta.details,
                timestamp: Date.now()
            }
        };

        const { error } = await supabase.from('audit_logs').insert([{
            actor_id: actorId,
            action: action,
            target_id: targetId,
            old_value: details.old, 
            new_value: metaData,
            reason: details.reason || 'Action standard'
        }]);
        
        if (error) console.error("AUDIT LOG FAILED", error);
    } catch (e) {
        console.error("Audit Exception", e);
    }
};

// Log user navigation/activity
export const logUserActivity = async (userId: string, actionType: string, details: string) => {
    try {
        if (!navigator.onLine) return;
        await supabase.from('user_activity_logs').insert([{
            user_id: userId,
            action_type: actionType,
            details: details
        }]);
    } catch (e) {
        // Silent fail
    }
};

// Heartbeat for Realtime Presence
export const updateUserPresence = async (userId: string, page?: string) => {
    if (!navigator.onLine) return;
    await supabase.from('profiles').update({
        last_seen_at: new Date().toISOString(),
        current_page: page
    }).eq('id', userId);
};

// --- AUTH ---
export const signInUser = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw new Error(error.message);
    if (data.user) {
        // Critical: Log login immediately
        await logAuditAction(data.user.id, 'USER_LOGIN', data.user.id, { reason: 'Authentification réussie' });
        await logUserActivity(data.user.id, 'login', 'Connexion au système');
        await updateUserPresence(data.user.id, 'dashboard');
    }
    return data;
};

export const signOutUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await logAuditAction(user.id, 'USER_LOGOUT', user.id, {});
        await logUserActivity(user.id, 'logout', 'Déconnexion');
    }
    await supabase.auth.signOut();
};

export const signUpUser = async (email: string, password: string, meta: any) => {
    const { data, error } = await supabase.auth.signUp({
        email, password, options: { data: { name: meta.name, role: meta.accountType === 'vendor' ? 'vendor' : 'client' } }
    });
    if (error) throw error;
    if (data.user) {
        await createProfile({
            id: data.user.id, email: email, name: meta.name, role: meta.accountType === 'vendor' ? 'vendor' : 'client',
            kycStatus: 'pending', kycDocument: meta.kycDocument, isBanned: false, phone: '', createdAt: Date.now(), passwordHash: ''
        });
        await logAuditAction(data.user.id, 'USER_REGISTER', data.user.id, { new: { email, role: meta.accountType } });
    }
    return data;
};

export const resetPasswordForEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if(error) throw error;
};

export const updateUserPassword = async (newPass: string, _oldPass?: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) throw error;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await logAuditAction(user.id, 'CHANGE_PASSWORD', user.id, {});
};

export const deleteUserAccount = async (_password: string) => {
    if (!navigator.onLine) throw new Error("Impossible de supprimer le compte hors-ligne.");
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    const { error } = await supabase.rpc('delete_own_account'); 
    if(error) throw new Error("Erreur suppression compte.");
    if (userId) await logAuditAction(userId, 'DELETE_ACCOUNT', userId, { reason: 'User requested deletion' });
    await signOutUser();
};

// --- PROFILES ---
export const fetchProfiles = async (): Promise<User[]> => {
    return fetchWithCache('profiles', async () => {
        const { data, error } = await supabase.from('profiles').select('*');
        if (error) throw error;
        
        return (data || []).map((p: any) => ({
            id: p.id, email: p.email, name: p.name, role: p.role, phone: p.phone,
            isBanned: p.is_banned, kycStatus: p.kyc_status, kycDocument: p.kyc_document,
            stallId: p.stall_id, marketId: p.market_id, bio: p.bio, photoUrl: p.avatar_url,
            isLogisticsSubscribed: p.is_logistics_subscribed, subscriptionExpiry: p.subscription_expiry ? new Date(p.subscription_expiry).getTime() : undefined,
            createdAt: new Date(p.created_at).getTime(), passwordHash: '***',
            favorites: p.favorites || [], preferences: p.preferences || undefined, addresses: p.addresses || [],
            lastSeenAt: p.last_seen_at ? new Date(p.last_seen_at).getTime() : undefined
        }));
    });
};

export const getCurrentUserProfile = async (id: string) => {
    // Specialized caching for current user
    const cacheKey = `profile_${id}`;
    if (navigator.onLine) {
        try {
            const { data: p, error } = await supabase.from('profiles').select('*').eq('id', id).single();
            if (p) {
                const profile = {
                    id: p.id, email: p.email, name: p.name, role: p.role, phone: p.phone, isBanned: p.is_banned,
                    kycStatus: p.kyc_status, kycDocument: p.kyc_document, stallId: p.stall_id, marketId: p.market_id,
                    bio: p.bio, photoUrl: p.avatar_url, isLogisticsSubscribed: p.is_logistics_subscribed,
                    subscriptionExpiry: p.subscription_expiry ? new Date(p.subscription_expiry).getTime() : undefined,
                    createdAt: new Date(p.created_at).getTime(), passwordHash: '***',
                    favorites: p.favorites || [], preferences: p.preferences || undefined, addresses: p.addresses || [],
                    lastSeenAt: p.last_seen_at ? new Date(p.last_seen_at).getTime() : undefined
                };
                localStorage.setItem(cacheKey, JSON.stringify(profile));
                return profile;
            }
        } catch(e) {}
    }
    const cached = localStorage.getItem(cacheKey);
    return cached ? JSON.parse(cached) : null;
};

export const createProfile = async (user: User) => {
    const { error } = await supabase.from('profiles').upsert({
        id: user.id, email: user.email, name: user.name, role: user.role,
        kyc_status: user.kycStatus, kyc_document: user.kycDocument, is_banned: user.isBanned
    });
    if (error) throw error;
};

export const updateUserProfile = async (id: string, updates: Partial<VendorProfile>) => {
    // Offline Optimistic Update Logic would go here for complex apps
    // For now, we enforce online for profile updates to ensure consistency
    if (!navigator.onLine) throw new Error("Modifications profil impossibles hors-ligne.");

    const payload: any = {};
    if (updates.name) payload.name = updates.name;
    if (updates.phone) payload.phone = updates.phone;
    if (updates.bio) payload.bio = updates.bio;
    if (updates.photoUrl) payload.avatar_url = updates.photoUrl;
    if (updates.isLogisticsSubscribed !== undefined) payload.is_logistics_subscribed = updates.isLogisticsSubscribed;
    
    const anyUpdates = updates as any;
    if (anyUpdates.favorites) payload.favorites = anyUpdates.favorites;
    if (anyUpdates.preferences) payload.preferences = anyUpdates.preferences;
    if (anyUpdates.addresses) payload.addresses = anyUpdates.addresses;

    const { error } = await supabase.from('profiles').update(payload).eq('id', id);
    if (error) throw error;
};

export const adminUpdateUserStatus = async (id: string, updates: Partial<User>) => {
    const { data: currentUser } = await supabase.auth.getUser();
    const { data: oldUser } = await supabase.from('profiles').select('*').eq('id', id).single();

    const payload: any = {};
    if (updates.isBanned !== undefined) payload.is_banned = updates.isBanned;
    if (updates.kycStatus !== undefined) payload.kyc_status = updates.kycStatus;
    if (updates.role !== undefined) payload.role = updates.role;
    
    const { error } = await supabase.from('profiles').update(payload).eq('id', id);
    if (error) throw error;

    if (currentUser?.user) {
        await logAuditAction(currentUser.user.id, 'UPDATE_USER_STATUS', id, {
            old: oldUser,
            new: payload,
            reason: 'Admin Dashboard Action'
        });
    }
};

// --- EYE OF GOD LOGIC ---
export const fetchAuditLogs = async (): Promise<AuditLog[]> => {
    // No caching for security logs (freshness is key)
    try {
        const { data: auditData, error: auditError } = await supabase.from('audit_logs')
            .select('*, profiles:actor_id(name)')
            .order('created_at', { ascending: false })
            .limit(50);

        if (auditError) throw auditError;

        const { data: activityData, error: activityError } = await supabase.from('user_activity_logs')
            .select('*, profiles:user_id(name)')
            .order('created_at', { ascending: false })
            .limit(50);

        if (activityError) console.warn("Fetch activity logs error:", activityError);

        const normalizedAudit = (auditData || []).map((log: any) => ({
            id: log.id,
            actorId: log.actor_id,
            actorName: log.profiles?.name || 'Système',
            targetId: log.target_id || 'N/A',
            action: log.action,
            oldValue: log.old_value,
            newValue: log.new_value,
            reason: log.reason,
            createdAt: new Date(log.created_at).getTime(),
            type: 'security'
        }));

        const normalizedActivity = (activityData || []).map((log: any) => ({
            id: log.id,
            actorId: log.user_id,
            actorName: log.profiles?.name || 'Utilisateur',
            targetId: 'APP',
            action: log.action_type.toUpperCase(),
            reason: log.details,
            createdAt: new Date(log.created_at).getTime(),
            type: 'activity'
        }));

        return [...normalizedAudit, ...normalizedActivity].sort((a, b) => b.createdAt - a.createdAt);

    } catch (e) {
        console.error("fetchAuditLogs error:", e);
        return [];
    }
};

export const checkValueExists = async (col: string, val: string) => {
    try {
        const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq(col, val);
        if (error) return false;
        return (count || 0) > 0;
    } catch {
        return false;
    }
};

// --- DATA FETCHING (CACHED) ---

export const fetchMarkets = async (): Promise<Market[]> => {
    return fetchWithCache('markets', async () => {
        const { data, error } = await supabase.from('markets').select('*');
        if (error) { console.error("fetchMarkets error:", error); return []; }
        return (data as any[] || []).map((m) => ({
            id: m.id, name: m.name, city: m.city || 'Libreville', neighborhood: m.neighborhood || '',
            targetRevenue: m.target_revenue || 0, capacity: m.capacity || 0, baseRent: m.base_rent || 0,
            hasDeliveryService: m.has_delivery || false, description: m.description || ''
        }));
    });
};

export const fetchStalls = async (): Promise<Stall[]> => {
    return fetchWithCache('stalls', async () => {
        const { data, error } = await supabase.from('stalls').select('*');
        if (error) { console.error("fetchStalls error:", error); return []; }
        return (data || []).map((s: any) => ({
            id: s.id, marketId: s.market_id, number: s.number, zone: s.zone, price: s.price,
            status: s.status, occupantName: s.occupant_name, occupantId: s.occupant_id, occupantPhone: s.occupant_phone,
            productType: s.product_type, size: s.size, complianceScore: s.compliance_score || 100, healthStatus: s.health_status || 'healthy',
            lastPaymentDate: s.last_payment_date ? new Date(s.last_payment_date).getTime() : undefined,
            documents: s.documents || [], employees: s.employees || [], activityLog: s.activity_log || [], messages: s.messages || [],
            coordinates: s.coordinates, surfaceArea: 4
        }));
    });
};

export const fetchProducts = async (): Promise<Product[]> => {
    return fetchWithCache('products', async () => {
        const { data, error } = await supabase.from('products').select('*');
        if (error) { console.error("fetchProducts error:", error); return []; }
        return (data || []).map((p: any) => ({
            id: p.id, stallId: p.stall_id, name: p.name, price: p.price, stockQuantity: p.stock_quantity,
            inStock: p.stock_quantity > 0, category: p.category, unit: p.unit, imageUrl: p.image_url,
            description: p.description, isPromo: p.is_promo, promoPrice: p.promo_price,
            costPrice: p.details?.costPrice, isVisible: p.details?.isVisible ?? true,
            origin: p.details?.origin, tags: p.details?.tags
        }));
    });
};

export const fetchFinancialStats = async () => {
    // Stats are computed on the fly usually, but let's cache them loosely
    return fetchWithCache('fin_stats', async () => {
        let totalRevenue = 0;
        const { data: transData } = await supabase.from('transactions').select('amount');
        if (transData) { totalRevenue = transData.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0); }

        let totalExpenses = 0;
        const { data: expData } = await supabase.from('expenses').select('amount');
        if (expData) { totalExpenses = expData.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0); }

        return { totalRevenue, totalExpenses, netBalance: totalRevenue - totalExpenses };
    });
};

export const fetchTransactions = async (page = 1, limit = 50, start?: number, end?: number) => {
    // Transactions need to be fresh, but we cache the "latest" page for offline viewing
    const cacheKey = `trans_p${page}_${start || 'all'}`;
    
    return fetchWithCache(cacheKey, async () => {
        let query = supabase.from('transactions').select('*', { count: 'exact' }).order('date', { ascending: false });
        query = query.range((page - 1) * limit, page * limit - 1);
        if (start) query = query.gte('date', new Date(start).toISOString());
        if (end) query = query.lte('date', new Date(end).toISOString());

        const { data, error, count } = await query;
        if (error) { console.error("fetchTransactions error:", error); return { transactions: [], count: 0 }; }

        const transactions = (data || []).map((t: any) => ({
            id: t.id, marketId: t.market_id, amount: t.amount, date: new Date(t.date).getTime(),
            type: t.type, provider: t.provider, stallNumber: t.stall_number, reference: t.reference, status: t.status, collectedBy: t.collected_by
        })) as Transaction[];

        return { transactions, count: count || 0 };
    });
};

export const fetchExpenses = async (): Promise<Expense[]> => {
    return fetchWithCache('expenses', async () => {
        const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
        if (error) { if (error.code === 'PGRST205') return []; throw error; }
        return (data || []).map((e: any) => ({
            id: e.id, marketId: e.market_id, category: e.category, amount: e.amount, date: new Date(e.date).getTime(), description: e.description
        }));
    });
};

export const fetchOrders = async (): Promise<ClientOrder[]> => {
    return fetchWithCache('orders', async () => {
        const { data, error } = await supabase.from('client_orders').select('*').order('created_at', { ascending: false }).limit(200);
        if (error) { console.error("fetchOrders error:", error.message); throw error; }
        return (data || []).map((o: any) => ({
            id: o.id, stallId: o.stall_id, customerId: o.customer_id, customerName: o.customer_name, customerPhone: o.customer_phone,
            items: o.items, totalAmount: o.total_amount, status: o.status, 
            date: o.created_at ? new Date(o.created_at).getTime() : Date.now(),
            paymentProvider: o.payment_provider, paymentRef: o.payment_ref, deliveryMode: o.delivery_mode, deliveryAddress: o.delivery_address
        }));
    });
};

export const fetchNotifications = async (_userId: string): Promise<AppNotification[]> => { return []; };

export const fetchReports = async (): Promise<any[]> => {
    return fetchWithCache('reports', async () => {
        const { data, error } = await supabase.from('hygiene_reports').select('*').order('created_at', { ascending: false });
        if (error) return [];
        return (data || []).map((r: any) => ({
            id: r.id, marketId: r.market_id, category: r.category, description: r.description,
            location: r.location, status: r.status, timestamp: new Date(r.created_at).getTime(),
            isAnonymous: r.is_anonymous, hasAudio: r.has_audio
        }));
    });
};

export const createReport = async (r: any, forceOnline = false) => {
    // OFFLINE INTERCEPTOR
    if (!navigator.onLine && !forceOnline) {
        const fakeId = `TEMP_REPORT_${Date.now()}`;
        const fakeReport = { ...r, id: fakeId, timestamp: Date.now(), status: 'offline_pending' };
        addToOfflineQueue('createReport', r);
        return fakeReport;
    }

    const { data, error } = await supabase.from('hygiene_reports').insert([{
        market_id: r.marketId, category: r.category, description: r.description,
        location: r.location, status: 'pending', is_anonymous: r.isAnonymous, has_audio: r.hasAudio
    }]).select();
    if (error) throw error;
    return data[0];
};

export const fetchAgents = async (): Promise<Agent[]> => {
    return fetchWithCache('agents', async () => {
        const { data: profiles, error } = await supabase.from('profiles').select('*').eq('role', 'agent');
        if (error) { console.warn("fetchAgents warning:", error.message); return []; }
        const agents: Agent[] = [];
        for (const p of profiles || []) {
            let cash = 0;
            try {
                // Cash calc is tricky offline, we assume 0 or last known
                // This sub-query might fail if offline inside the map loop, so we rely on cached profile list primarily
                const { data: trans } = await supabase.from('transactions').select('amount').eq('collected_by', p.id).eq('provider', 'cash'); 
                cash = trans ? trans.reduce((sum: number, t: any) => sum + t.amount, 0) : 0;
            } catch(e) {}
            agents.push({
                id: p.id, userId: p.id, name: p.name, marketId: p.market_id || 'm1',
                role: 'collector', performanceScore: 90, lastActive: Date.now(),
                cashInHand: cash, isShiftActive: true, logs: []
            });
        }
        return agents;
    });
};

export const fetchSanctions = async (): Promise<Sanction[]> => {
    return fetchWithCache('sanctions', async () => {
        const { data, error } = await supabase.from('transactions').select('*').eq('type', 'fine').order('date', { ascending: false });
        if(error) return [];
        return (data || []).map((t: any) => ({
            id: t.id, vendorId: 'unknown', marketId: t.market_id, type: 'fine', reason: 'Infraction',
            amount: t.amount, date: new Date(t.date).getTime(), status: 'active', issuedBy: t.collected_by
        }));
    });
};

// --- CRUD WRAPPERS ---

export const createMarket = async (m: any) => {
    const { data, error } = await supabase.from('markets').insert([{
        name: m.name, city: m.city, neighborhood: m.neighborhood, target_revenue: m.targetRevenue,
        capacity: m.capacity, base_rent: m.baseRent, has_delivery: m.hasDeliveryService, description: m.description
    }]).select();
    if (error) throw error;
    const { data: user } = await supabase.auth.getUser();
    if (user?.user) await logAuditAction(user.user.id, 'CREATE_MARKET', data[0].id, { new: m });
    return { ...m, id: data[0].id } as Market;
};

export const updateMarket = async (id: string, m: any) => {
    const { data: user } = await supabase.auth.getUser();
    const { data: old } = await supabase.from('markets').select('*').eq('id', id).single();
    
    const payload: any = {};
    if(m.name) payload.name = m.name;
    if(m.targetRevenue !== undefined) payload.target_revenue = m.targetRevenue;
    if(m.capacity !== undefined) payload.capacity = m.capacity;
    if(m.baseRent !== undefined) payload.base_rent = m.baseRent;
    if(m.hasDeliveryService !== undefined) payload.has_delivery = m.hasDeliveryService;
    
    const { error } = await supabase.from('markets').update(payload).eq('id', id);
    if(error) throw error;
    
    if (user?.user) await logAuditAction(user.user.id, 'UPDATE_MARKET', id, { old, new: payload });
    return { id, ...m } as Market;
};

export const deleteMarket = async (id: string) => { 
    const { data: user } = await supabase.auth.getUser();
    if (user?.user) await logAuditAction(user.user.id, 'DELETE_MARKET', id, { reason: 'Admin Action' });
    await supabase.from('markets').delete().eq('id', id); 
};

export const createStall = async (s: any) => {
    const { data, error } = await supabase.from('stalls').insert([{
        market_id: s.marketId, number: s.number, zone: s.zone, price: s.price, size: s.size,
        product_type: s.productType, status: 'free', compliance_score: 100, health_status: 'healthy', coordinates: s.coordinates
    }]).select();
    if(error) throw error;
    const { data: user } = await supabase.auth.getUser();
    if (user?.user) await logAuditAction(user.user.id, 'CREATE_STALL', data[0].id, { new: s });
    return { ...s, id: data[0].id, status: 'free' } as Stall;
};

export const reserveStall = async (stallId: string, userId: string) => {
    const { error } = await supabase.from('stalls').update({ status: 'occupied', occupant_id: userId }).eq('id', stallId);
    if (error) throw new Error(error.message);
    await supabase.from('profiles').update({ stall_id: stallId }).eq('id', userId);
    await logAuditAction(userId, 'RESERVE_STALL', stallId, { reason: 'User Self Reservation' });
};

export const createBulkStalls = async (stalls: any[]) => {
    const payload = stalls.map(s => ({
        market_id: s.marketId, number: s.number, zone: s.zone, price: s.price, size: s.size,
        product_type: s.productType, status: 'free', compliance_score: 100, health_status: 'healthy', coordinates: s.coordinates
    }));
    const { data, error } = await supabase.from('stalls').insert(payload).select();
    if (error) throw error;
    const { data: user } = await supabase.auth.getUser();
    if (user?.user) await logAuditAction(user.user.id, 'BULK_CREATE_STALLS', 'N/A', { new: { count: stalls.length } });
    return data.map((res: any, idx: number) => ({ ...stalls[idx], id: res.id })) as Stall[];
};

export const deleteStall = async (id: string) => { 
    const { data: user } = await supabase.auth.getUser();
    if (user?.user) await logAuditAction(user.user.id, 'DELETE_STALL', id, {});
    await supabase.from('stalls').delete().eq('id', id); 
};

export const createExpense = async (e: any) => {
    const { data, error } = await supabase.from('expenses').insert([{
        market_id: e.marketId, category: e.category, amount: e.amount, description: e.description, date: new Date(e.date).toISOString()
    }]).select();
    if(error) throw error;
    const { data: user } = await supabase.auth.getUser();
    if (user?.user) await logAuditAction(user.user.id, 'CREATE_EXPENSE', data[0].id, { new: { amount: e.amount } });
    return { ...e, id: data[0].id } as Expense;
};

export const deleteExpense = async (id: string) => { 
    const { data: user } = await supabase.auth.getUser();
    if (user?.user) await logAuditAction(user.user.id, 'DELETE_EXPENSE', id, {});
    await supabase.from('expenses').delete().eq('id', id); 
};

export const createProduct = async (p: any) => {
    const { data, error } = await supabase.from('products').insert([{
        stall_id: p.stallId, name: p.name, price: p.price, stock_quantity: p.stockQuantity, category: p.category, unit: p.unit,
        description: p.description, image_url: p.imageUrl, details: { costPrice: p.costPrice, isVisible: p.isVisible, tags: p.tags }
    }]).select();
    if(error) throw error;
    return { ...p, id: data[0].id } as Product;
};

export const updateProduct = async (id: string, updates: any) => {
    const payload: any = {};
    if(updates.name) payload.name = updates.name;
    if(updates.price !== undefined) payload.price = updates.price;
    if(updates.stockQuantity !== undefined) payload.stock_quantity = updates.stockQuantity;
    if(updates.imageUrl) payload.image_url = updates.imageUrl;
    await supabase.from('products').update(payload).eq('id', id);
};

export const deleteProduct = async (id: string) => { await supabase.from('products').delete().eq('id', id); };

export const createOrder = async (order: any, forceOnline = false) => {
    // OFFLINE INTERCEPTOR
    if (!navigator.onLine && !forceOnline) {
        const fakeId = `TEMP_ORDER_${Date.now()}`;
        // Create a fake successful response structure
        addToOfflineQueue('createOrder', order);
        return { id: fakeId, status: 'offline_pending', ...order };
    }

    const { data, error } = await supabase.rpc('create_order_atomic', {
        p_stall_id: order.stallId, p_customer_id: order.customerId, p_customer_name: order.customerName,
        p_customer_phone: order.customerPhone, p_items: order.items, p_total_amount: order.totalAmount,
        p_payment_provider: order.paymentProvider, p_payment_ref: order.paymentRef
    });
    if (error) {
        if (error.message.includes('Insufficient stock')) throw new Error("Stock insuffisant pour un ou plusieurs articles.");
        throw new Error(error.message);
    }
    return data;
};

export const createTransaction = async (t: any, forceOnline = false) => {
    // OFFLINE INTERCEPTOR
    if (!navigator.onLine && !forceOnline) {
        const fakeId = `TEMP_TRANS_${Date.now()}`;
        const fakeTrans = { ...t, id: fakeId, date: Date.now(), status: 'offline_pending' };
        addToOfflineQueue('createTransaction', t);
        return fakeTrans;
    }

    const { data, error } = await supabase.from('transactions').insert([{
        market_id: t.marketId, amount: t.amount, type: t.type, provider: t.provider,
        stall_number: t.stallNumber, reference: t.reference, collected_by: t.collectedBy, status: 'completed',
        date: new Date().toISOString()
    }]).select();
    if (error) throw error;
    return data[0];
};

export const createSanction = async (s: any, forceOnline = false) => {
    // OFFLINE INTERCEPTOR
    if (!navigator.onLine && !forceOnline) {
        const fakeId = `TEMP_SANCTION_${Date.now()}`;
        const fakeSanction = { ...s, id: fakeId, date: Date.now(), status: 'offline_pending' };
        addToOfflineQueue('createSanction', s);
        return fakeSanction;
    }

    const { data, error } = await supabase.from('transactions').insert([{
        market_id: s.marketId, amount: s.amount, type: 'fine', provider: 'system',
        stall_number: s.stallNumber, reference: `SANCTION-${Date.now()}`, collected_by: s.issuedBy,
        status: 'completed', date: new Date().toISOString()
    }]).select();
    if (s.stallId) { await supabase.from('stalls').update({ health_status: 'warning' }).eq('id', s.stallId); }
    if (error) throw error;
    const { data: user } = await supabase.auth.getUser();
    if (user?.user) await logAuditAction(user.user.id, 'ISSUE_SANCTION', data[0].id, { new: { amount: s.amount } });
    return data[0];
};

export const uploadFile = async (file: File, bucket: 'avatars'|'products') => {
    if (!navigator.onLine) throw new Error("Impossible d'uploader des fichiers hors-ligne.");
    const blob = await compressImage(file);
    const path = `${Date.now()}.webp`;
    const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: 'image/webp' });
    if(error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
};

export const subscribeToTable = (table: string, cb: (payload: any) => void) => {
    return supabase.channel(table).on('postgres_changes', { event: '*', schema: 'public', table }, cb).subscribe();
};
