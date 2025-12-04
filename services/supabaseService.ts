
import { supabase } from '../supabaseClient';
import { User, VendorProfile, Market, Stall, Product, Transaction, ClientOrder, Expense, Sanction, AppNotification, Agent } from '../types';

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
        // FORCE WEBP COMPRESSION
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

// --- AUTH ---
export const signInUser = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw new Error(error.message);
    return data;
};

export const signOutUser = async () => {
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
    }
    return data;
};

export const resetPasswordForEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if(error) throw error;
};

export const updateUserPassword = async (newPass: string, oldPass?: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) throw error;
};

export const deleteUserAccount = async (password: string) => {
    const { error } = await supabase.rpc('delete_own_account'); 
    if(error) throw new Error("Erreur suppression compte.");
    await signOutUser();
};

// --- PROFILES ---
export const fetchProfiles = async (): Promise<User[]> => {
    try {
        const { data, error } = await supabase.from('profiles').select('*');
        if (error) throw error;
        return data.map((p: any) => ({
            id: p.id, email: p.email, name: p.name, role: p.role, phone: p.phone,
            isBanned: p.is_banned, kycStatus: p.kyc_status, kycDocument: p.kyc_document,
            stallId: p.stall_id, marketId: p.market_id, bio: p.bio, photoUrl: p.avatar_url,
            isLogisticsSubscribed: p.is_logistics_subscribed, subscriptionExpiry: p.subscription_expiry ? new Date(p.subscription_expiry).getTime() : undefined,
            createdAt: new Date(p.created_at).getTime(), passwordHash: '***',
            favorites: p.favorites || [], preferences: p.preferences || undefined, addresses: p.addresses || []
        }));
    } catch { return []; }
};

export const getCurrentUserProfile = async (id: string) => {
    try {
        const { data: p, error } = await supabase.from('profiles').select('*').eq('id', id).single();
        if (error || !p) return null;
        
        // Correct Mapping from DB (snake_case) to App (camelCase)
        return {
            id: p.id,
            email: p.email,
            name: p.name,
            role: p.role,
            phone: p.phone,
            isBanned: p.is_banned,
            kycStatus: p.kyc_status,
            kycDocument: p.kyc_document,
            stallId: p.stall_id,
            marketId: p.market_id,
            bio: p.bio,
            photoUrl: p.avatar_url,
            isLogisticsSubscribed: p.is_logistics_subscribed,
            subscriptionExpiry: p.subscription_expiry ? new Date(p.subscription_expiry).getTime() : undefined,
            createdAt: new Date(p.created_at).getTime(),
            passwordHash: '***',
            favorites: p.favorites || [],
            preferences: p.preferences || undefined,
            addresses: p.addresses || []
        };
    } catch { return null; }
};

export const createProfile = async (user: User) => {
    const { error } = await supabase.from('profiles').upsert({
        id: user.id, email: user.email, name: user.name, role: user.role,
        kyc_status: user.kycStatus, kyc_document: user.kycDocument, is_banned: user.isBanned
    });
    if (error) throw error;
};

export const updateUserProfile = async (id: string, updates: Partial<VendorProfile>) => {
    const payload: any = {};
    if (updates.name) payload.name = updates.name;
    if (updates.phone) payload.phone = updates.phone;
    if (updates.bio) payload.bio = updates.bio;
    if (updates.photoUrl) payload.avatar_url = updates.photoUrl;
    if (updates.isLogisticsSubscribed !== undefined) payload.is_logistics_subscribed = updates.isLogisticsSubscribed;
    
    // Generic JSONB update for favorites/preferences if passed
    const anyUpdates = updates as any;
    if (anyUpdates.favorites) payload.favorites = anyUpdates.favorites;
    if (anyUpdates.preferences) payload.preferences = anyUpdates.preferences;
    if (anyUpdates.addresses) payload.addresses = anyUpdates.addresses;

    const { error } = await supabase.from('profiles').update(payload).eq('id', id);
    if (error) throw error;
};

export const adminUpdateUserStatus = async (id: string, updates: Partial<User>) => {
    const payload: any = {};
    if (updates.isBanned !== undefined) payload.is_banned = updates.isBanned;
    if (updates.kycStatus !== undefined) payload.kyc_status = updates.kycStatus;
    const { error } = await supabase.from('profiles').update(payload).eq('id', id);
    if (error) throw error;
};

export const checkValueExists = async (col: string, val: string) => {
    try {
        const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq(col, val);
        return (count || 0) > 0;
    } catch { return false; }
};

// --- DATA FETCHING (ROBUST WRAPPERS) ---

export const fetchMarkets = async (): Promise<Market[]> => {
    try {
        const { data, error } = await supabase.from('markets').select('*');
        if (error) throw error;
        
        // Define exact shape to avoid 'any'
        type MarketRow = {
            id: string;
            name: string;
            city: string | null;
            neighborhood: string | null;
            target_revenue: number | null;
            capacity: number | null;
            base_rent: number | null;
            has_delivery: boolean | null;
            description: string | null;
        };

        return (data as MarketRow[]).map((m) => ({
            id: m.id, 
            name: m.name, 
            city: m.city || 'Libreville', 
            neighborhood: m.neighborhood || '',
            targetRevenue: m.target_revenue || 0, 
            capacity: m.capacity || 0, 
            baseRent: m.base_rent || 0,
            hasDeliveryService: m.has_delivery || false, 
            description: m.description || ''
        }));
    } catch { return []; }
};

export const fetchStalls = async (): Promise<Stall[]> => {
    try {
        const { data, error } = await supabase.from('stalls').select('*');
        if (error) throw error;
        return data.map((s: any) => ({
            id: s.id, marketId: s.market_id, number: s.number, zone: s.zone, price: s.price,
            status: s.status, occupantName: s.occupant_name, occupantId: s.occupant_id, occupantPhone: s.occupant_phone,
            productType: s.product_type, size: s.size, complianceScore: s.compliance_score || 100, healthStatus: s.health_status || 'healthy',
            lastPaymentDate: s.last_payment_date ? new Date(s.last_payment_date).getTime() : undefined,
            documents: s.documents || [], employees: s.employees || [], activityLog: s.activity_log || [], messages: s.messages || [],
            coordinates: s.coordinates, surfaceArea: 4
        }));
    } catch { return []; }
};

export const fetchProducts = async (): Promise<Product[]> => {
    try {
        const { data, error } = await supabase.from('products').select('*');
        if (error) throw error;
        return data.map((p: any) => ({
            id: p.id, stallId: p.stall_id, name: p.name, price: p.price, stockQuantity: p.stock_quantity,
            inStock: p.stock_quantity > 0, category: p.category, unit: p.unit, imageUrl: p.image_url,
            description: p.description, isPromo: p.is_promo, promoPrice: p.promo_price,
            costPrice: p.details?.costPrice, isVisible: p.details?.isVisible ?? true,
            origin: p.details?.origin, tags: p.details?.tags
        }));
    } catch { return []; }
};

export const fetchFinancialStats = async () => {
    try {
        const { data: transData, error: transError } = await supabase.from('transactions').select('amount');
        if (transError) throw transError;
        const totalRevenue = transData.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);

        let totalExpenses = 0;
        try {
            const { data: expData, error: expError } = await supabase.from('expenses').select('amount');
            if (!expError && expData) {
                totalExpenses = expData.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);
            }
        } catch (e) { 
            // Expenses table might not exist or empty, ignore
        }

        return { totalRevenue, totalExpenses, netBalance: totalRevenue - totalExpenses };
    } catch (e) {
        console.warn("Error fetching financial stats, defaulting to 0:", e);
        return { totalRevenue: 0, totalExpenses: 0, netBalance: 0 };
    }
};

export const fetchTransactions = async (page = 1, limit = 50, start?: number, end?: number) => {
    try {
        let query = supabase.from('transactions').select('*', { count: 'exact' }).order('date', { ascending: false });
        query = query.range((page - 1) * limit, page * limit - 1);
        if (start) query = query.gte('date', new Date(start).toISOString());
        if (end) query = query.lte('date', new Date(end).toISOString());

        const { data, error, count } = await query;
        if (error) throw error;

        const transactions = data.map((t: any) => ({
            id: t.id, marketId: t.market_id, amount: t.amount, date: new Date(t.date).getTime(),
            type: t.type, provider: t.provider, stallNumber: t.stall_number, reference: t.reference, status: t.status, collectedBy: t.collected_by
        })) as Transaction[];

        return { transactions, count: count || 0 };
    } catch { return { transactions: [], count: 0 }; }
};

export const fetchExpenses = async (): Promise<Expense[]> => {
    try {
        const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
        if (error) throw error;
        return data.map((e: any) => ({
            id: e.id, marketId: e.market_id, category: e.category, amount: e.amount, date: new Date(e.date).getTime(), description: e.description
        }));
    } catch { return []; }
};

export const fetchOrders = async (): Promise<ClientOrder[]> => {
    try {
        const { data, error } = await supabase.from('client_orders').select('*').order('date', { ascending: false }).limit(200);
        if (error) throw error;
        return data.map((o: any) => ({
            id: o.id, stallId: o.stall_id, customerId: o.customer_id, customerName: o.customer_name, customerPhone: o.customer_phone,
            items: o.items, totalAmount: o.total_amount, status: o.status, date: new Date(o.date).getTime(),
            paymentProvider: o.payment_provider, paymentRef: o.payment_ref, deliveryMode: o.delivery_mode, deliveryAddress: o.delivery_address
        }));
    } catch { return []; }
};

export const fetchNotifications = async (userId: string): Promise<AppNotification[]> => {
    try {
        // Mock implementation or real table if exists
        // const { data } = await supabase.from('notifications').select('*').eq('recipient_id', userId);
        return [];
    } catch { return []; }
};

export const fetchReports = async (): Promise<any[]> => {
    try {
        const { data, error } = await supabase.from('hygiene_reports').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data.map((r: any) => ({
            id: r.id, marketId: r.market_id, category: r.category, description: r.description,
            location: r.location, status: r.status, timestamp: new Date(r.created_at).getTime(),
            isAnonymous: r.is_anonymous, hasAudio: r.has_audio
        }));
    } catch { return []; }
};

export const createReport = async (r: any) => {
    try {
        const { data, error } = await supabase.from('hygiene_reports').insert([{
            market_id: r.marketId, category: r.category, description: r.description,
            location: r.location, status: 'pending', is_anonymous: r.isAnonymous, has_audio: r.hasAudio
        }]).select();
        if (error) throw error;
        return data[0];
    } catch(e: any) {
        throw new Error(e.message || "Erreur envoi rapport");
    }
};

export const fetchAgents = async (): Promise<Agent[]> => {
    try {
        const { data: profiles, error } = await supabase.from('profiles').select('*').eq('role', 'agent');
        if (error) throw error;

        const agents: Agent[] = [];
        for (const p of profiles) {
            let cash = 0;
            try {
                const { data: trans } = await supabase.from('transactions')
                    .select('amount')
                    .eq('collected_by', p.id)
                    .eq('provider', 'cash'); 
                cash = trans ? trans.reduce((sum: number, t: any) => sum + t.amount, 0) : 0;
            } catch(e) {}
            
            agents.push({
                id: p.id, userId: p.id, name: p.name, marketId: p.market_id || 'm1',
                role: 'collector', performanceScore: 90, lastActive: Date.now(),
                cashInHand: cash, isShiftActive: true, logs: []
            });
        }
        return agents;
    } catch { return []; }
};

export const fetchSanctions = async (): Promise<Sanction[]> => {
    try {
        const { data, error } = await supabase.from('transactions').select('*').eq('type', 'fine').order('date', { ascending: false });
        if(error) throw error;
        return data.map((t: any) => ({
            id: t.id, vendorId: 'unknown', marketId: t.market_id, type: 'fine', reason: 'Infraction',
            amount: t.amount, date: new Date(t.date).getTime(), status: 'active', issuedBy: t.collected_by
        }));
    } catch { return []; }
};

// --- CRUD WRAPPERS ---

export const createMarket = async (m: any) => {
    const { data, error } = await supabase.from('markets').insert([{
        name: m.name, city: m.city, neighborhood: m.neighborhood, target_revenue: m.targetRevenue,
        capacity: m.capacity, base_rent: m.baseRent, has_delivery: m.hasDeliveryService, description: m.description
    }]).select();
    if (error) throw error;
    const res = data[0];
    return { ...m, id: res.id } as Market;
};

export const updateMarket = async (id: string, m: any) => {
    const payload: any = {};
    if(m.name) payload.name = m.name;
    if(m.targetRevenue !== undefined) payload.target_revenue = m.targetRevenue;
    if(m.capacity !== undefined) payload.capacity = m.capacity;
    if(m.baseRent !== undefined) payload.base_rent = m.baseRent;
    if(m.hasDeliveryService !== undefined) payload.has_delivery = m.hasDeliveryService;
    const { error } = await supabase.from('markets').update(payload).eq('id', id);
    if(error) throw error;
    return { id, ...m } as Market;
};

export const deleteMarket = async (id: string) => { await supabase.from('markets').delete().eq('id', id); };

export const createStall = async (s: any) => {
    const { data, error } = await supabase.from('stalls').insert([{
        market_id: s.marketId, number: s.number, zone: s.zone, price: s.price, size: s.size,
        product_type: s.productType, status: 'free', compliance_score: 100, health_status: 'healthy', coordinates: s.coordinates
    }]).select();
    if(error) throw error;
    const res = data[0];
    return { ...s, id: res.id, status: 'free' } as Stall;
};

export const createBulkStalls = async (stalls: any[]) => {
    const payload = stalls.map(s => ({
        market_id: s.marketId, number: s.number, zone: s.zone, price: s.price, size: s.size,
        product_type: s.productType, status: 'free', compliance_score: 100, health_status: 'healthy', coordinates: s.coordinates
    }));
    const { data, error } = await supabase.from('stalls').insert(payload).select();
    if (error) throw error;
    return data.map((res: any, idx: number) => ({ ...stalls[idx], id: res.id })) as Stall[];
};

export const deleteStall = async (id: string) => { await supabase.from('stalls').delete().eq('id', id); };

export const createExpense = async (e: any) => {
    const { data, error } = await supabase.from('expenses').insert([{
        market_id: e.marketId, category: e.category, amount: e.amount, description: e.description, date: new Date(e.date).toISOString()
    }]).select();
    if(error) throw error;
    return { ...e, id: data[0].id } as Expense;
};

export const deleteExpense = async (id: string) => { await supabase.from('expenses').delete().eq('id', id); };

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

export const createOrder = async (order: any) => {
    // ATOMIC TRANSACTION VIA RPC if available, fallback to simple insert
    try {
        const { data, error } = await supabase.rpc('create_order_atomic', {
            p_stall_id: order.stallId,
            p_customer_id: order.customerId,
            p_customer_name: order.customerName,
            p_customer_phone: order.customerPhone,
            p_items: order.items,
            p_total_amount: order.totalAmount,
            p_payment_provider: order.paymentProvider,
            p_payment_ref: order.paymentRef
        });
        if (!error) return data;
    } catch(e) {
        // Fallback or specific error handling
    }

    // Fallback normal insert
    const { data, error } = await supabase.from('client_orders').insert([{
        stall_id: order.stallId,
        customer_id: order.customerId,
        customer_name: order.customerName,
        customer_phone: order.customerPhone,
        items: order.items,
        total_amount: order.totalAmount,
        payment_provider: order.paymentProvider,
        payment_ref: order.paymentRef,
        status: 'pending',
        delivery_mode: order.deliveryMode,
        date: new Date().toISOString()
    }]).select();

    if (error) throw new Error(error.message);
    return data[0];
};

export const createTransaction = async (t: any) => {
    const { data, error } = await supabase.from('transactions').insert([{
        market_id: t.marketId, amount: t.amount, type: t.type, provider: t.provider,
        stall_number: t.stallNumber, reference: t.reference, collected_by: t.collectedBy, status: 'completed',
        date: new Date().toISOString()
    }]).select();
    if (error) throw error;
    return data[0];
};

export const createSanction = async (s: any) => {
    const { data, error } = await supabase.from('transactions').insert([{
        market_id: s.marketId, amount: s.amount, type: 'fine', provider: 'system',
        stall_number: s.stallNumber, reference: `SANCTION-${Date.now()}`, collected_by: s.issuedBy,
        status: 'completed', date: new Date().toISOString()
    }]).select();
    
    if (s.stallId) {
        await supabase.from('stalls').update({ health_status: 'warning' }).eq('id', s.stallId);
    }
    
    if (error) throw error;
    return data[0];
};

export const uploadFile = async (file: File, bucket: 'avatars'|'products') => {
    const blob = await compressImage(file);
    const path = `${Date.now()}.webp`;
    const { error } = await supabase.storage.from(bucket).upload(path, blob, {
        contentType: 'image/webp'
    });
    if(error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
};

export const subscribeToTable = (table: string, cb: (payload: any) => void) => {
    return supabase.channel(table).on('postgres_changes', { event: '*', schema: 'public', table }, cb).subscribe();
};
