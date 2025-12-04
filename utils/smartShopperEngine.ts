
import { searchOffersLocal } from '../services/localShopperDatabase';
import { SmartListItem, ProductOffer } from '../types';

/**
 * PARSEUR NLP LÉGER (Regex-based)
 * Transforme "tomates bio pas cher" en objets structurés
 */
export const parseShoppingListText = (text: string): SmartListItem[] => {
    // 1. Découpage par ligne ou virgule
    const lines = text.split(/[\n,]/).map(s => s.trim()).filter(Boolean);

    return lines.map(raw => {
        const lower = raw.toLowerCase();
        
        // 2. Extraction des préférences
        const isBio = lower.includes('bio') || lower.includes('organique') || lower.includes('naturel');
        const isCheap = lower.includes('pas cher') || lower.includes('moins cher') || lower.includes('promo') || lower.includes('economique');
        const isFresh = lower.includes('frais') || lower.includes('mûr') || lower.includes('du jour');

        // 3. Nettoyage du terme (enlève les mots clés et quantités basiques)
        // Regex pour enlever: bio, pas cher, frais, un peu de, 2kg, le, la, les...
        let cleanTerm = lower
            .replace(/(bio|pas cher|moins cher|promo|economique|frais|mûr|du jour)/g, '')
            .replace(/(\d+(kg|g|l|ml|pcs)?)/g, '') // Enlève "2kg"
            .replace(/\b(de|du|des|le|la|les|un|une)\b/g, '') // Enlève déterminants
            .trim();

        // Si vide après nettoyage, on garde le mot original (fallback)
        if (!cleanTerm) cleanTerm = lower.split(' ')[0];

        // 4. Recherche Database
        const offers = searchOffersLocal(cleanTerm);
        
        // 5. Scoring des offres
        const scoredOffers = scoreOffers(offers, { bio: isBio, cheap: isCheap, fresh: isFresh });

        return {
            id: `item-${Date.now()}-${Math.random()}`,
            originalText: raw,
            cleanTerm: cleanTerm,
            preferences: { bio: isBio, cheap: isCheap, fresh: isFresh },
            offers: scoredOffers,
            selectedOfferId: scoredOffers.length > 0 ? scoredOffers[0].id : null
        };
    });
};

/**
 * MOTEUR DE SCORING PONDÉRÉ
 * Trie les offres selon les préférences utilisateur
 */
const scoreOffers = (offers: ProductOffer[], prefs: { bio: boolean, cheap: boolean, fresh: boolean }): ProductOffer[] => {
    return offers.map(offer => {
        let score = 50; // Base score

        // Prix (Poids fort si demandé)
        // On compare par rapport à la moyenne des offres disponibles pour ce produit
        const avgPrice = offers.reduce((sum, o) => sum + o.price, 0) / offers.length;
        if (offer.price < avgPrice) score += 10;
        if (prefs.cheap && offer.price < avgPrice) score += 30; // Bonus majeur si "pas cher" demandé

        // Qualité / Bio
        if (offer.attributes.isBio) {
            score += 10;
            if (prefs.bio) score += 40; // Match parfait
        }

        // Fraîcheur
        if (offer.attributes.isFresh) {
            score += 5;
            if (prefs.fresh) score += 25;
        }

        // Promo
        if (offer.attributes.isPromo) score += 15;

        // Réputation Vendeur
        score += (offer.vendor.rating * 5); // Max +25 pts

        return { ...offer, score };
    }).sort((a, b) => (b.score || 0) - (a.score || 0)); // Tri décroissant par score
};
