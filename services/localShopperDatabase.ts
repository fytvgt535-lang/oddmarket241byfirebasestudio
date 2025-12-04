
import { ProductOffer, LocalVendor } from '../types';

/**
 * BASE DE DONNÉES EMBARQUÉE (SIMULATION SQLITE/WATERMELONDB)
 * Cette donnée est stockée dans le bundle de l'app pour garantir le mode 100% Hors-Ligne.
 */

const VENDORS: LocalVendor[] = [
    { id: 'v1', name: 'Chez Maman Rose', type: 'bio', rating: 4.8, distance: 'Zone Vivres A' },
    { id: 'v2', name: 'Le Panier Frais', type: 'standard', rating: 4.2, distance: 'Zone Vivres B' },
    { id: 'v3', name: 'Grossiste 241', type: 'grossiste', rating: 3.9, distance: 'Zone Entrepôt' },
    { id: 'v4', name: 'Coopérative Locale', type: 'bio', rating: 4.9, distance: 'Zone C' },
    { id: 'v5', name: 'Discount Market', type: 'economique', rating: 3.5, distance: 'Entrée Principale' },
];

// Catalogue Inventaire (Produit -> Offres multiples)
const INVENTORY: Record<string, Omit<ProductOffer, 'productName' | 'productId'>[]> = {
    'tomate': [
        { id: 'o1', vendor: VENDORS[0], price: 1000, unit: 'tas', attributes: { isBio: true, isFresh: true, isLocal: true, isPromo: false } },
        { id: 'o2', vendor: VENDORS[2], price: 800, unit: 'tas', attributes: { isBio: false, isFresh: true, isLocal: false, isPromo: true } },
        { id: 'o3', vendor: VENDORS[4], price: 600, unit: 'tas', attributes: { isBio: false, isFresh: false, isLocal: false, isPromo: false } },
    ],
    'manioc': [
        { id: 'o4', vendor: VENDORS[3], price: 2500, unit: 'baton', attributes: { isBio: true, isFresh: true, isLocal: true, isPromo: false } },
        { id: 'o5', vendor: VENDORS[1], price: 2200, unit: 'baton', attributes: { isBio: false, isFresh: true, isLocal: true, isPromo: false } },
    ],
    'oseille': [
        { id: 'o6', vendor: VENDORS[0], price: 500, unit: 'paquet', attributes: { isBio: true, isFresh: true, isLocal: true, isPromo: false } },
    ],
    'poisson': [
        { id: 'o7', vendor: VENDORS[1], price: 4000, unit: 'kg', attributes: { isBio: false, isFresh: true, isLocal: true, isPromo: false } },
        { id: 'o8', vendor: VENDORS[4], price: 3500, unit: 'kg', attributes: { isBio: false, isFresh: false, isLocal: false, isPromo: true } },
    ],
    'riz': [
        { id: 'o9', vendor: VENDORS[2], price: 11000, unit: 'sac 25kg', attributes: { isBio: false, isFresh: false, isLocal: false, isPromo: false } },
        { id: 'o10', vendor: VENDORS[4], price: 10500, unit: 'sac 25kg', attributes: { isBio: false, isFresh: false, isLocal: false, isPromo: true } },
    ],
    'piment': [
        { id: 'o11', vendor: VENDORS[0], price: 500, unit: 'tas', attributes: { isBio: true, isFresh: true, isLocal: true, isPromo: false } },
        { id: 'o12', vendor: VENDORS[4], price: 250, unit: 'tas', attributes: { isBio: false, isFresh: false, isLocal: false, isPromo: true } },
    ]
};

// Map des synonymes pour le NLP
export const SYNONYMS: Record<string, string> = {
    'tomates': 'tomate', 'tomat': 'tomate',
    'tubercule': 'manioc', 'bâton': 'manioc', 'cassava': 'manioc',
    'feuilles': 'oseille', 'legumes': 'oseille',
    'carpe': 'poisson', 'machiron': 'poisson', 'fumé': 'poisson',
    'riz parfumé': 'riz',
    'piment oiseau': 'piment'
};

/**
 * Recherche locale dans la base
 */
export const searchOffersLocal = (term: string): ProductOffer[] => {
    // 1. Normalisation
    let cleanTerm = term.toLowerCase().trim();
    // 2. Synonymes
    if (SYNONYMS[cleanTerm]) cleanTerm = SYNONYMS[cleanTerm];
    
    // 3. Recherche exacte ou partielle
    // Priorité à la clé exacte
    if (INVENTORY[cleanTerm]) {
        return INVENTORY[cleanTerm].map(offer => ({
            ...offer,
            productId: cleanTerm,
            productName: cleanTerm.charAt(0).toUpperCase() + cleanTerm.slice(1)
        }));
    }

    // Fallback: Recherche partielle (ex: "gros manioc" -> "manioc")
    const foundKey = Object.keys(INVENTORY).find(k => cleanTerm.includes(k));
    if (foundKey) {
        return INVENTORY[foundKey].map(offer => ({
            ...offer,
            productId: foundKey,
            productName: foundKey.charAt(0).toUpperCase() + foundKey.slice(1)
        }));
    }

    return [];
};
