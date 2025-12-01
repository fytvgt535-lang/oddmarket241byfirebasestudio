
import { supabase } from '../supabaseClient';
import { User, VendorProfile, Market, Stall, Product, Transaction, AppRole } from '../types';

// --- AUTHENTICATION ---

export const signUpUser = async (email: string, password: string, metadata: any) => {
  // 1. Création de l'utilisateur Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: metadata.name,
        role: metadata.role || 'vendor'
      }
    }
  });

  if (authError) {
    if (authError.message.includes("signups are disabled")) {
      throw new Error("CONFIGURATION SUPABASE REQUISE : Allez dans Authentication > Providers > Email et activez 'Enable Email provider'. Vérifiez aussi que les inscriptions sont autorisées.");
    }
    throw authError;
  }

  // 2. Création immédiate du profil dans la base de données (Public table)
  if (authData.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert([
        {
          id: authData.user.id,
          email: email,
          name: metadata.name,
          role: metadata.role || 'vendor',
          phone: '',
          kyc_status: 'pending',
          kyc_document: metadata.kycDocument || null,
          created_at: new Date().toISOString()
        }
      ], { onConflict: 'id' });

    if (profileError) {
      // Gestion des doublons lors de l'inscription initiale
      if (profileError.code === '23505') {
         // Suppression du compte Auth orphelin si le profil échoue (nettoyage)
         await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {});
         
         if (profileError.message?.includes('unique_phone') || profileError.details?.includes('phone')) {
             throw new Error("Ce numéro de téléphone est déjà utilisé.");
         }
         if (profileError.message?.includes('unique_kyc') || profileError.details?.includes('kyc_document')) {
             throw new Error("Ce numéro de pièce d'identité est déjà enregistré.");
         }
         // Détection du doublon de nom (Insensible à la casse)
         if (profileError.message?.includes('unique_name') || profileError.details?.includes('name')) {
             throw new Error("Ce nom d'affichage est déjà pris (Même orthographe).");
         }
      }
      console.error("Erreur création profil DB:", profileError);
      throw new Error("Erreur technique lors de la création du profil. Réessayez.");
    }
  }

  return authData;
};

export const signInUser = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
     if (error.message.includes("Invalid login credentials")) {
         throw new Error("Email ou mot de passe incorrect.");
     }
     throw error;
  }
  return data;
};

export const signOutUser = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const resetPasswordForEmail = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin, // Redirige vers l'app après clic sur le lien email
  });
  if (error) throw error;
};

export const updateUserPassword = async (newPassword: string, oldPassword?: string) => {
  // Sécurité : Vérifier l'ancien mot de passe avant de changer
  if (oldPassword) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
              email: user.email,
              password: oldPassword
          });
          if (signInError) {
              throw new Error("L'ancien mot de passe est incorrect.");
          }
      }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
};

export const getCurrentUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error("Erreur fetch profil:", error);
      return null;
    }
    return data;
  } catch (e) {
    return null;
  }
};

export const updateUserProfile = async (userId: string, updates: Partial<VendorProfile>) => {
  // Map camelCase to snake_case for DB
  const dbUpdates: any = {};
  if (updates.name) dbUpdates.name = updates.name;
  if (updates.phone) dbUpdates.phone = updates.phone;
  if (updates.bio) dbUpdates.bio = updates.bio;
  if (updates.photoUrl) dbUpdates.avatar_url = updates.photoUrl;
  
  // Update Public Profile Table
  const { error } = await supabase
    .from('profiles')
    .update(dbUpdates)
    .eq('id', userId);

  if (error) {
      if (error.code === '23505') {
         if (error.message?.includes('unique_phone')) {
             throw new Error("Ce numéro de téléphone est déjà utilisé par un autre membre.");
         }
         if (error.message?.includes('unique_name') || error.details?.includes('name')) {
             throw new Error("Ce nom d'affichage est déjà pris (Même orthographe).");
         }
      }
      throw error;
  }

  // If name changed, update Auth metadata too for consistency
  if (updates.name) {
    await supabase.auth.updateUser({
      data: { name: updates.name }
    });
  }
};


// --- DATA FETCHING ---

export const fetchMarkets = async () => {
  const { data, error } = await supabase.from('markets').select('*');
  if (error) throw error;
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
      details: details
    }])
    .select();
  if (error) throw error;
  return data;
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
  const { error } = await supabase.from('stalls').update(updatePayload).eq('id', stallId);
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
