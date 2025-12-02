
import { supabase } from '../supabaseClient';
import { User, VendorProfile, Market, Stall, Product, Transaction, AppRole } from '../types';

// --- COMPRESSION UTILITY ---
const compressImage = async (file: File, maxWidth = 1000, quality = 0.7): Promise<Blob> => {
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

        // Calculate new dimensions
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }

        elem.width = width;
        elem.height = height;
        const ctx = elem.getContext('2d');
        
        if (!ctx) {
            reject(new Error("Canvas context not available"));
            return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        // Output as JPEG with reduced quality
        ctx.canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Compression failed'));
        }, 'image/jpeg', quality);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

// --- STORAGE ---

export const uploadFile = async (file: File, bucket: 'avatars' | 'products'): Promise<string> => {
  try {
    // 1. Compress Image
    const compressedBlob = await compressImage(file);
    
    // 2. Generate Path
    const fileExt = 'jpg'; // Always converting to JPG for consistency/size
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    // 3. Upload to Supabase
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, compressedBlob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error("Supabase Storage Error:", uploadError);
      if (uploadError.message.includes("row-level security")) {
          throw new Error("Erreur Permission : Veuillez exécuter le script SQL pour autoriser l'upload (Storage Policies).");
      }
      throw new Error(`Erreur upload: ${uploadError.message}`);
    }

    // 4. Get Public URL
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error: any) {
    console.error("Upload process failed:", error);
    throw error;
  }
};

// --- AUTHENTICATION ---

export const checkValueExists = async (field: 'email' | 'name' | 'phone', value: string): Promise<boolean> => {
  if (!value) return false;
  
  // Pour le nom, on vérifie insensible à la casse
  if (field === 'name') {
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .ilike('name', value); // ilike = case insensitive
      
    if (error) throw error;
    return (count || 0) > 0;
  }

  // Pour email et phone
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq(field, value);

  if (error) throw error;
  return (count || 0) > 0;
};

export const signUpUser = async (email: string, password: string, metadata: any) => {
  // 1. Détermination du Rôle
  let assignedRole = 'client'; // Par défaut client
  
  // Si l'utilisateur a explicitement choisi vendeur dans l'interface (passé via metadata)
  if (metadata.accountType === 'vendor') {
      assignedRole = 'vendor';
  }

  // Override par codes secrets (Prioritaire)
  if (metadata.invitationCode === 'MAIRIE24') assignedRole = 'admin';
  if (metadata.invitationCode === 'AGENT24') assignedRole = 'agent';

  // 2. Création de l'utilisateur Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: metadata.name,
        role: assignedRole
      }
    }
  });

  if (authError) {
    if (authError.message.includes("signups are disabled")) {
      throw new Error("CONFIGURATION SUPABASE REQUISE : Allez dans Authentication > Providers > Email et activez 'Enable Email provider'. Vérifiez aussi que les inscriptions sont autorisées.");
    }
    throw authError;
  }

  // 3. Création immédiate du profil dans la base de données (Public table)
  if (authData.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert([
        {
          id: authData.user.id,
          email: email,
          name: metadata.name,
          role: assignedRole,
          phone: '',
          kyc_status: 'pending',
          kyc_document: metadata.kycDocument || null,
          created_at: new Date().toISOString()
        }
      ], { onConflict: 'id' });

    if (profileError) {
      if (profileError.code === '23505') {
         // Suppression du compte Auth orphelin si le profil échoue (rollback manuel)
         await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {});
         
         if (profileError.message?.includes('unique_phone')) throw new Error("Ce numéro de téléphone est déjà utilisé.");
         if (profileError.message?.includes('unique_name')) throw new Error("Ce nom d'affichage est déjà pris.");
         if (profileError.message?.includes('unique_kyc_number')) throw new Error("Ce numéro de document d'identité est déjà enregistré.");
      }
      
      if (profileError.message?.includes('infinite recursion')) {
          await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {});
          throw new Error("ERREUR SQL CRITIQUE : 'Infinite Recursion'. Veuillez exécuter le script de correction SQL fourni (création de fonction is_admin).");
      }

      throw new Error("Erreur technique lors de la création du profil : " + profileError.message);
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
     if (error.message.includes("Invalid login credentials")) throw new Error("Identifiant ou mot de passe incorrect.");
     throw error;
  }

  // Vérification immédiate du statut BANNI
  if (data.user) {
      const profile = await getCurrentUserProfile(data.user.id);
      if (profile && profile.is_banned) {
          await signOutUser();
          throw new Error("Ce compte a été suspendu par l'administration.");
      }
  }

  return data;
};

export const signOutUser = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const resetPasswordForEmail = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  if (error) throw error;
};

export const updateUserPassword = async (newPassword: string, oldPassword?: string) => {
  // Sécurité Critique : Vérifier l'ancien mot de passe
  if (!oldPassword) {
      throw new Error("L'ancien mot de passe est obligatoire pour cette opération.");
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user && user.email) {
      // Tentative de connexion avec l'ancien mot de passe pour vérifier
      const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: oldPassword
      });
      
      if (signInError) {
          throw new Error("L'ancien mot de passe est incorrect. Impossible de modifier.");
      }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
};

export const deleteUserAccount = async (password: string) => {
  // 1. Vérification de sécurité ultime : Re-authentification avec le mot de passe
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || !user.email) throw new Error("Session invalide. Veuillez vous reconnecter.");

  // Vérification mot de passe
  const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: password
  });

  if (authError) {
      throw new Error("Mot de passe incorrect. Suppression impossible.");
  }

  // 2. Appel de la fonction RPC sécurisée (définie en SQL) pour tout nettoyer
  const { error } = await supabase.rpc('delete_own_account');
  
  if (error) {
      console.error("Delete account error details:", error);
      
      // Gestion des erreurs spécifiques
      if (error.message?.includes('function delete_own_account() does not exist')) {
          throw new Error("Erreur Système : La fonction SQL de suppression manque. Contactez le support (Admin).");
      }
      if (error.message?.includes('column "occupant_phone" of relation "stalls" does not exist')) {
          throw new Error("ERREUR CRITIQUE BASE DE DONNÉES : La colonne 'occupant_phone' manque dans la table 'stalls'. Veuillez exécuter le script SQL de migration fourni.");
      }
      
      throw new Error(`Erreur technique : ${error.message || JSON.stringify(error)}`);
  }
  
  // 3. Déconnexion forcée locale si succès (et si la session n'est pas déjà tuée par le serveur)
  await supabase.auth.signOut().catch(() => {});
};

export const getCurrentUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) return null;
    return data;
  } catch (e) {
    return null;
  }
};

export const updateUserProfile = async (userId: string, updates: Partial<VendorProfile>) => {
  const dbUpdates: any = {};
  if (updates.name) dbUpdates.name = updates.name;
  if (updates.phone) dbUpdates.phone = updates.phone;
  if (updates.bio) dbUpdates.bio = updates.bio;
  if (updates.photoUrl) dbUpdates.avatar_url = updates.photoUrl;
  
  const { error } = await supabase
    .from('profiles')
    .update(dbUpdates)
    .eq('id', userId);

  if (error) {
      if (error.code === '23505') {
         if (error.message?.includes('unique_name')) throw new Error("Ce nom est déjà pris.");
      }
      if (error.message?.includes('infinite recursion')) {
          throw new Error("ERREUR SQL : Boucle infinie dans les permissions. Exécutez le script de correction SQL.");
      }
      throw error;
  }

  if (updates.name) {
    await supabase.auth.updateUser({ data: { name: updates.name } });
  }
};

// --- ADMIN FEATURES ---
export const fetchProfiles = async () => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*');
    
    if (error) throw error;
    
    return data.map((p: any) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        role: p.role,
        kycStatus: p.kyc_status,
        kycDocument: p.kyc_document,
        isBanned: p.is_banned,
        createdAt: new Date(p.created_at).getTime(),
        passwordHash: '***' // dummy
    })) as User[];
};

export const adminUpdateUserStatus = async (userId: string, updates: Partial<User>) => {
    const dbUpdates: any = {};
    if (updates.isBanned !== undefined) dbUpdates.is_banned = updates.isBanned;
    if (updates.kycStatus !== undefined) dbUpdates.kyc_status = updates.kycStatus;
    
    const { error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', userId);
        
    if (error) throw error;
};

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

export const createStall = async (stall: Omit<Stall, 'id'>) => {
    const { error } = await supabase
        .from('stalls')
        .insert([{
            market_id: stall.marketId,
            number: stall.number,
            zone: stall.zone,
            price: stall.price,
            size: stall.size,
            product_type: stall.productType,
            status: 'free',
            compliance_score: 100,
            health_status: 'healthy'
        }]);
    if (error) throw error;
};

export const deleteStall = async (stallId: string) => {
    const { error } = await supabase
        .from('stalls')
        .delete()
        .eq('id', stallId);
    if (error) throw error;
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
    costPrice: p.details?.costPrice,
    isVisible: p.details?.isVisible !== undefined ? p.details.isVisible : true,
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

export const createProduct = async (product: Omit<Product, 'id'>) => {
  const { stallId, name, price, category, stockQuantity, description, imageUrl, isPromo, promoPrice, costPrice, isVisible, ...details } = product;
  
  const productDetails = {
      ...details,
      costPrice,
      isVisible
  };

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
      details: productDetails
    }])
    .select();
  if (error) throw error;
  return data;
};

export const updateProduct = async (productId: string, updates: Partial<Product>) => {
  const { name, price, stockQuantity, category, description, imageUrl, isPromo, promoPrice, stallId, costPrice, isVisible, ...detailsUpdates } = updates;
  
  const { data: existingData, error: fetchError } = await supabase
    .from('products')
    .select('details')
    .eq('id', productId)
    .single();
    
  if (fetchError) throw fetchError;
  
  const existingDetails = existingData.details || {};
  const newDetails = { 
      ...existingDetails, 
      ...detailsUpdates,
      ...(costPrice !== undefined && { costPrice }),
      ...(isVisible !== undefined && { isVisible })
  };

  const dbUpdates: any = { details: newDetails };
  
  if (name !== undefined) dbUpdates.name = name;
  if (price !== undefined) dbUpdates.price = price;
  if (stockQuantity !== undefined) dbUpdates.stock_quantity = stockQuantity;
  if (category !== undefined) dbUpdates.category = category;
  if (description !== undefined) dbUpdates.description = description;
  if (imageUrl !== undefined) dbUpdates.image_url = imageUrl;
  if (isPromo !== undefined) dbUpdates.is_promo = isPromo;
  if (promoPrice !== undefined) dbUpdates.promo_price = promoPrice;

  const { error } = await supabase
    .from('products')
    .update(dbUpdates)
    .eq('id', productId);

  if (error) throw error;
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

export const createTransaction = async (transaction: Omit<Transaction, 'id' | 'date'>) => {
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
