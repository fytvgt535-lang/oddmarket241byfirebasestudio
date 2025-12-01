
import { supabase } from '../supabaseClient';
import { User, VendorProfile, Market, Stall, Product, Transaction, AppRole } from '../types';

// --- AUTHENTICATION ---

export const signUpUser = async (email: string, password: string, metadata: any) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: metadata.name,
        // Phone is optional/removed
        phone: metadata.phone || '',
        role: metadata.role || 'vendor'
      }
    }
  });
  
  if (error) throw error;

  // Création manuelle du profil si le trigger DB n'est pas actif
  // Note: On insert même si email confirmation est pending (si config DB permet)
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: data.user.id,
          email: email,
          name: metadata.name,
          role: metadata.role || 'vendor',
          phone: metadata.phone || '',
          kyc_status: 'pending',
          kyc_document: metadata.kycDocument // JSONB
        }
      ]);
      
    if (profileError) {
        // Ignorer l'erreur si c'est un doublon (profil déjà créé par trigger)
        if (!profileError.message.includes('duplicate key')) {
            console.error('Error creating profile:', profileError);
        }
    }
  }
  
  return data;
};

export const signInUser = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

export const signOutUser = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle(); // Use maybeSingle to avoid error if profile doesn't exist yet
    
  if (error) throw error;
  return data;
};

// --- DATA FETCHING & MAPPING ---

export const fetchMarkets = async () => {
  const { data, error } = await supabase.from('markets').select('*');
  if (error) throw error;
  // Mapping DB -> App
  return data.map((m: any) => ({
    id: m.id,
    name: m.name,
    location: m.location,
    targetRevenue: m.target_revenue
  })) as Market[];
};

export const fetchStalls = async () => {
  const { data, error } = await supabase.from('stalls').select('*');
  if (error) throw error;
  
  // Mapping DB snake_case -> App camelCase
  return data.map((s: any) => ({
    id: s.id,
    marketId: s.market_id,
    number: s.number,
    zone: s.zone,
    price: s.price,
    status: s.status,
    occupantName: s.occupant_name,
    occupantPhone: s.occupant_phone,
    occupantId: s.occupant_id,
    productType: s.product_type,
    size: s.size,
    complianceScore: s.compliance_score,
    healthStatus: s.health_status,
    lastPaymentDate: s.last_payment_date ? new Date(s.last_payment_date).getTime() : undefined,
    // JSONB Fields
    documents: s.documents || [],
    employees: s.employees || [],
    activityLog: s.activity_log || [],
    messages: s.messages || [],
  })) as Stall[]; 
};

export const fetchProducts = async () => {
  const { data, error } = await supabase.from('products').select('*');
  if (error) throw error;
  
  return data.map((p: any) => ({
    id: p.id,
    stallId: p.stall_id,
    name: p.name,
    price: p.price,
    stockQuantity: p.stock_quantity,
    inStock: p.stock_quantity > 0,
    category: p.category,
    description: p.description,
    imageUrl: p.image_url,
    isPromo: p.is_promo,
    promoPrice: p.promo_price,
    // Spread JSONB details (tags, origin, freshnessLevel, etc.)
    ...p.details
  })) as Product[];
};

export const fetchTransactions = async () => {
  const { data, error } = await supabase.from('transactions').select('*');
  if (error) throw error;
  
  return data.map((t: any) => ({
    id: t.id,
    marketId: t.market_id,
    amount: t.amount,
    date: new Date(t.date).getTime(),
    type: t.type,
    status: t.status,
    stallNumber: t.stall_number,
    reference: t.reference,
    provider: t.provider
  })) as Transaction[];
};

// --- DATA MUTATION ---

export const createProduct = async (product: Omit<Product, 'id'>) => {
  const { stallId, name, price, category, stockQuantity, description, imageUrl, isPromo, promoPrice, ...details } = product;
  
  const { data, error } = await supabase
    .from('products')
    .insert([{
      stall_id: stallId,
      name,
      price,
      stock_quantity: stockQuantity,
      category,
      description,
      image_url: imageUrl,
      is_promo: isPromo,
      promo_price: promoPrice,
      details: details // Store tags, origin, freshness, wholesale in JSONB
    }])
    .select();
    
  if (error) throw error;
  return data; // Returns raw DB data, needs mapping on reload or optimistic update
};

export const updateStallStatus = async (stallId: string, status: string, occupantData?: any) => {
  const updatePayload: any = { status };
  if (occupantData) {
      updatePayload.occupant_name = occupantData.name;
      updatePayload.occupant_phone = occupantData.phone;
      updatePayload.occupant_id = occupantData.id;
  } else if (status === 'free') {
      updatePayload.occupant_name = null;
      updatePayload.occupant_phone = null;
      updatePayload.occupant_id = null;
  }
  
  const { error } = await supabase
    .from('stalls')
    .update(updatePayload)
    .eq('id', stallId);
    
  if (error) throw error;
};

export const createTransaction = async (transaction: Omit<Transaction, 'id'>) => {
  const { error } = await supabase.from('transactions').insert([{
      market_id: transaction.marketId,
      amount: transaction.amount,
      type: transaction.type,
      status: transaction.status,
      stall_number: transaction.stallNumber,
      reference: transaction.reference,
      provider: transaction.provider,
      date: new Date().toISOString()
  }]);
  if (error) throw error;
};

// --- REALTIME HELPERS ---
export const subscribeToTable = (tableName: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`public:${tableName}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, callback)
    .subscribe();
};
