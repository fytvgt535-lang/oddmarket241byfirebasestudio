
import { supabase } from '../supabaseClient';
import { ProductOffer } from '../types';

/**
 * MOTEUR DE RECHERCHE LOCALE AMÉLIORÉ
 */

// Extension dynamique des racines sémantiques (Gabon Context)
const SEMANTIC_MAP: Record<string, string[]> = {
    'tomate': ['tomates', 'tomat', 'toms', 'rouges'],
    'manioc': ['tubercule', 'bâton', 'cassava', 'farine', 'foufou'],
    'poisson': ['carpe', 'machiron', 'fumé', 'salé', 'merlu', 'daurade'],
    'riz': ['parfumé', 'long grain', 'sac de riz'],
    'huile': ['palme', 'arachide', 'cuisine'],
    'banane': ['plantain', 'mûre', 'verte']
};

export const syncShopperData = async (): Promise<void> => {
    if (!navigator.onLine) return;

    try {
        const { data: products } = await supabase.from('products')
            .select('*, stall:stalls(id, zone, number, occupant_name, compliance_score)')
            .eq('is_visible', true);
        
        if (!products) return;

        const processed = {
            timestamp: Date.now(),
            inventory: products,
            index: indexData(products)
        };
        
        localStorage.setItem('mc_shopper_cache', JSON.stringify(processed));
    } catch (e) {
        console.error("Sync Error:", e);
    }
};

const indexData = (products: any[]) => {
    const index: Record<string, string[]> = {};
    products.forEach(p => {
        const keywords = p.name.toLowerCase().split(/\s+/);
        keywords.forEach((k: string) => {
            if (k.length < 3) return;
            if (!index[k]) index[k] = [];
            index[k].push(p.id);
        });
    });
    return index;
};

export const searchOffersLocal = (term: string): ProductOffer[] => {
    const cacheRaw = localStorage.getItem('mc_shopper_cache');
    if (!cacheRaw) return [];
    
    const cache = JSON.parse(cacheRaw);
    let cleanTerm = term.toLowerCase().trim();

    // 1. Expansion Sémantique
    let searchTerms = [cleanTerm];
    for (const [root, variations] of Object.entries(SEMANTIC_MAP)) {
        if (cleanTerm.includes(root) || variations.some(v => cleanTerm.includes(v))) {
            searchTerms = [root, ...variations];
            break;
        }
    }

    // 2. Filtrage multi-critères
    const results = cache.inventory.filter((p: any) => 
        searchTerms.some(t => 
            p.name.toLowerCase().includes(t) || 
            p.category.toLowerCase().includes(t) ||
            (p.tags || []).some((tag: string) => tag.toLowerCase().includes(t))
        )
    );

    return results.map((p: any) => ({
        id: p.id,
        productId: p.id,
        productName: p.name,
        price: p.price,
        unit: p.unit || 'unité',
        vendor: {
            id: p.stall.id,
            name: p.stall.occupant_name || `Étal ${p.stall.number}`,
            type: 'standard',
            rating: p.stall.compliance_score / 20,
            distance: `Zone ${p.stall.zone}`
        },
        attributes: {
            isBio: (p.tags || []).includes('bio'),
            isFresh: true,
            isLocal: true,
            isPromo: p.is_promo
        }
    }));
};
