
import { Stall, Sanction } from '../types';

/**
 * Calcule la dette totale d'un étal (Loyer impayé + Amendes)
 * Centralise la logique métier pour l'Agent et le Vendeur.
 */
export const calculateStallDebt = (stall: Stall | undefined, sanctions: Sanction[]) => {
    if (!stall) return { monthsUnpaid: 0, rentDebt: 0, fineAmount: 0, totalDebt: 0 };

    const lastPayment = stall.lastPaymentDate || (Date.now() - 90 * 24 * 60 * 60 * 1000); // Default to 3 months ago if never paid
    const msSincePayment = Date.now() - lastPayment;
    // Un mois = 30 jours environ
    const monthsUnpaid = Math.floor(msSincePayment / (30 * 24 * 60 * 60 * 1000));
    
    const rentDebt = monthsUnpaid > 0 ? monthsUnpaid * stall.price : 0;
    
    // Calcul des amendes actives (non payées/résolues)
    const fineAmount = sanctions
        .filter(s => s.vendorId === stall.occupantId && s.status === 'active' && s.type === 'fine')
        .reduce((acc, curr) => acc + curr.amount, 0);

    return {
        monthsUnpaid,
        rentDebt,
        fineAmount,
        totalDebt: rentDebt + fineAmount
    };
};

/**
 * Formate un montant en FCFA avec séparateur de milliers
 */
export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-GA', { style: 'decimal' }).format(amount) + ' F';
};

/**
 * Génère des coordonnées GPS aléatoires autour d'un point central (Simulation)
 */
export const generateRandomCoordinates = (centerLat = 0.3920, centerLng = 9.4540, variance = 0.005) => {
    return {
        lat: centerLat + (Math.random() - 0.5) * variance,
        lng: centerLng + (Math.random() - 0.5) * variance
    };
};
