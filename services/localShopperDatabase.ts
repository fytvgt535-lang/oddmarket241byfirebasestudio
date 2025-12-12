
import { supabase } from '../supabaseClient';
import { ProductOffer, LocalVendor, Product, Stall } from '../types';

/**
 * SHOPPER SYNC SERVICE (REAL DATA + OFFLINE CACHE)
 * Remplace les données mockées par une synchronisation réelle avec Supabase.
 * Les données sont mises en cache dans localStorage pour garantir la rapidité de l'IA.
 */

const CACHE_KEY_INVENTORY = 'mc_shopper_inventory';
const CACHE_KEY_VENDORS = 'mc_shopper_vendors';
const CACHE_TTL = 1000 * 60 * 60; // 1 heure de cache

interface CachedData {
    timestamp: number;
    inventory: Record<string, Omit<ProductOffer, 'productName' | 'productId'>[]>;
    vendors: LocalVendor[];
}

// Map des synonymes pour le NLP (Statique pour l'instant, pourrait être en DB)
export const SYNONYMS: Record<string, string> = {
    'tomates': 'tomate', 'tomat': 'tomate',
    'tubercule': 'manioc', 'bâton': 'manioc', 'cassava': 'manioc',
    'feuilles': 'oseille', 'legumes': 'oseille',
    'carpe': 'poisson', 'machiron': 'poisson', 'fumé': 'poisson',
    'riz parfumé': 'riz',
    'piment oiseau': 'piment',
    'arachide': 'arachides', 'graine': 'arachides'
};

/**
 * Synchronise les données depuis Supabase vers le Cache Local
 */
export const syncShopperData = async (): Promise<void> => {
    if (!navigator.onLine) return; // Ne rien faire si hors ligne, utiliser le cache existant

    try {
        // 1. Récupérer les données brutes
        const { data: products } = await supabase.from('products').select('*, stall:stalls(id, zone, number, occupant_name, compliance_score)').eq('is_visible', true);
        
        if (!products) return;

        // 2. Transformer en format optimisé pour la recherche locale
        const vendorsMap = new Map<string, LocalVendor>();
        const inventory: Record<string, any[]> = {};

        products.forEach((p: any) => {
            // Construire le vendeur
            const stall = p.stall;
            if (!stall) return;

            const vendorId = stall.id;
            if (!vendorsMap.has(vendorId)) {
                vendorsMap.set(vendorId, {
                    id: vendorId,
                    name: stall.occupant_name || `Étal ${stall.number}`,
                    type: 'standard', // CORRECTION: Utilisation d'un type valide défini dans types.ts
                    rating: (stall.compliance_score / 20), // Score 100 -> 5 étoiles
                    distance: `Zone ${stall.zone}`
                });
            }

            // Construire l'offre
            const cleanName = p.name.toLowerCase().trim();
            // Indexer par mots clés simples du nom
            const keywords = cleanName.split(' ');
            
            const offer = {
                id: p.id,
                vendor: vendorsMap.get(vendorId),
                price: p.price,
                unit: p.unit,
                attributes: {
                    isBio: (p.tags || []).includes('bio'),
                    isFresh: p.freshness_level ? p.freshness_level > 80 : true,
                    isLocal: (p.origin || '').toLowerCase().includes('gabon'),
                    isPromo: p.is_promo || false
                }
            };

            // Ajouter aux index
            keywords.forEach((k: string) => {
                if (k.length < 3) return; // Ignorer mots courts
                if (!inventory[k]) inventory[k] = [];
                inventory[k].push(offer);
            });
            
            // Indexer aussi par catégorie
            const cat = p.category.toLowerCase();
            if (!inventory[cat]) inventory[cat] = [];
            inventory[cat].push(offer);
        });

        // 3. Sauvegarder dans le cache
        const cachePayload: CachedData = {
            timestamp: Date.now(),
            inventory,
            vendors: Array.from(vendorsMap.values())
        };
        
        localStorage.setItem(CACHE_KEY_INVENTORY, JSON.stringify(cachePayload));
        console.log("Shopper Data Synced:", Object.keys(inventory).length, "keywords indexed.");

    } catch (e) {
        console.error("Sync Error:", e);
    }
};

/**
 * Recherche locale dans la base (Cache ou Fallback)
 */
export const searchOffersLocal = (term: string): ProductOffer[] => {
    // 1. Charger le cache
    let data: CachedData | null = null;
    try {
        const cached = localStorage.getItem(CACHE_KEY_INVENTORY);
        if (cached) data = JSON.parse(cached);
    } catch (e) {}

    // Si pas de données, renvoyer vide (l'UI demandera une synchro si nécessaire)
    if (!data || !data.inventory) return [];

    // 2. Normalisation
    let cleanTerm = term.toLowerCase().trim();
    if (SYNONYMS[cleanTerm]) cleanTerm = SYNONYMS[cleanTerm];
    
    // 3. Recherche
    // Recherche exacte
    if (data.inventory[cleanTerm]) {
        return data.inventory[cleanTerm].map((offer: any) => ({
            ...offer,
            productId: cleanTerm,
            productName: cleanTerm.charAt(0).toUpperCase() + cleanTerm.slice(1)
        }));
    }

    // Fallback: Recherche partielle (ex: "gros manioc" -> "manioc")
    const foundKey = Object.keys(data.inventory).find(k => cleanTerm.includes(k) || k.includes(cleanTerm));
    if (foundKey) {
        return data.inventory[foundKey].map((offer: any) => ({
            ...offer,
            productId: foundKey,
            productName: foundKey.charAt(0).toUpperCase() + foundKey.slice(1)
        }));
    }

    return [];
};
