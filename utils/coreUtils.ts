
import { Stall, Sanction } from '../types';
import { CryptoService } from '../services/cryptoService';

/**
 * Calcule la dette totale d'un étal avec détail granulaire
 */
export const calculateStallDebt = (stall: Stall | undefined, sanctions: Sanction[]) => {
    if (!stall) return { monthsUnpaid: 0, rentDebt: 0, fineAmount: 0, totalDebt: 0, details: [] as any[] };

    // Si pas de date, on suppose 3 mois de retard par défaut pour la sécurité (ou date création)
    const lastPayment = stall.lastPaymentDate || (Date.now() - 90 * 24 * 60 * 60 * 1000);
    const now = Date.now();
    
    // Calcul précis des mois
    const monthDiff = (d1: number, d2: number) => {
        const date1 = new Date(d1);
        const date2 = new Date(d2);
        return (date2.getFullYear() - date1.getFullYear()) * 12 + (date2.getMonth() - date1.getMonth());
    };

    const monthsUnpaid = Math.max(0, monthDiff(lastPayment, now));
    const rentDebt = monthsUnpaid * stall.price;
    
    // Génération des détails (Lignes de facture)
    const details = [];
    const dateCursor = new Date(lastPayment);
    
    // Ajouter les loyers impayés
    for (let i = 0; i < monthsUnpaid; i++) {
        dateCursor.setMonth(dateCursor.getMonth() + 1);
        details.push({
            id: `rent-${i}`,
            type: 'rent',
            label: `Loyer ${dateCursor.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}`,
            amount: stall.price,
            dueDate: dateCursor.getTime(),
            isLate: true
        });
    }

    // Ajouter les amendes actives
    const activeFines = sanctions.filter(s => 
        s.vendorId === stall.occupantId && 
        s.status === 'active' && 
        s.type === 'fine'
    );
    const fineAmount = activeFines.reduce((acc, curr) => acc + curr.amount, 0);

    activeFines.forEach(f => {
        details.push({
            id: f.id,
            type: 'fine',
            label: `Amende: ${f.reason}`,
            amount: f.amount,
            dueDate: f.date,
            isLate: true
        });
    });

    return {
        monthsUnpaid,
        rentDebt,
        fineAmount,
        totalDebt: rentDebt + fineAmount,
        details: details.sort((a,b) => a.dueDate - b.dueDate) // Les plus vieux d'abord
    };
};

export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-GA', { style: 'decimal' }).format(amount) + ' F';
};

export const generateRandomCoordinates = (centerLat = 0.3920, centerLng = 9.4540, variance = 0.005) => {
    return {
        lat: centerLat + (Math.random() - 0.5) * variance,
        lng: centerLng + (Math.random() - 0.5) * variance
    };
};

export const simulateGlobalLocation = () => {
    const locations = [
        { country: "Gabon", city: "Libreville", district: "Centre-Ville", ip: "197.241.12.45" },
        { country: "Gabon", city: "Libreville", district: "Akanda", ip: "197.241.14.88" },
        { country: "Gabon", city: "Owendo", district: "Port", ip: "197.241.10.12" },
        { country: "Gabon", city: "Franceville", district: "Plateau", ip: "197.241.22.01" },
        { country: "France", city: "Paris", district: "Île-de-France (VPN)", ip: "88.12.44.123" }, 
        { country: "USA", city: "New York", district: "Manhattan (Audit)", ip: "104.22.11.90" } 
    ];
    
    const rand = Math.random();
    let loc;
    if (rand < 0.6) loc = locations[0];
    else if (rand < 0.8) loc = locations[1];
    else loc = locations[Math.floor(Math.random() * locations.length)];

    return loc;
};

// --- SECURITY PROTOCOLS ---

/**
 * Generates a SHA-256 signature for internal logic (Delegated to CryptoService)
 */
export const generateTransactionSignature = async (
    stallId: string, 
    amount: number, 
    agentId: string, 
    timestamp: number
): Promise<string> => {
    const data = `${stallId}:${amount}:${agentId}:${timestamp}`;
    return await CryptoService.hashTransaction(data);
};

/**
 * PROTOCOLE QR SÉCURISÉ (MCONNECT)
 * Génère une chaine: MCONNECT:v1:<BASE64_PAYLOAD>:<SIGNATURE>
 */
export const generateSecureQrPayload = async (payload: object): Promise<string> => {
    // 1. Add Entropy (Nonce) to ensure uniqueness
    const payloadWithNonce = {
        ...payload,
        nonce: crypto.randomUUID(), // Unique ID per QR
        iat: Date.now() // Issued At
    };

    const jsonStr = JSON.stringify(payloadWithNonce);
    const base64Payload = btoa(jsonStr);
    
    // 2. Sign the Base64 payload using CryptoService (Simulating Backend Signing)
    const signature = await CryptoService.signPayload(base64Payload);

    // 3. Assemble Protocol String
    return `MCONNECT:v1:${base64Payload}:${signature}`;
};

/**
 * VALIDATEUR QR SÉCURISÉ
 * Vérifie le format, la signature et l'expiration.
 */
export const parseSecureQrPayload = async (qrString: string): Promise<any> => {
    // 1. Check Protocol Prefix (Isolation from other apps)
    if (!qrString.startsWith('MCONNECT:v1:')) {
        throw new Error("QR Code invalide : Format non reconnu ou externe.");
    }

    const parts = qrString.split(':');
    if (parts.length !== 4) throw new Error("QR Code corrompu ou malformé.");

    const base64Payload = parts[2];
    const providedSignature = parts[3];

    // 2. Verify Signature via CryptoService
    const isValid = await CryptoService.verifySignature(base64Payload, providedSignature);

    if (!isValid) {
        throw new Error("ALERTE SÉCURITÉ : QR Code falsifié ou modifié.");
    }

    // 3. Decode & Check Expiration (Anti-Replay / Stale)
    try {
        const payload = JSON.parse(atob(base64Payload));
        
        // Expiration check (e.g., QR valid for 5 minutes only)
        if (Date.now() - payload.iat > 5 * 60 * 1000) {
            throw new Error("QR Code expiré. Demandez à l'agent de régénérer.");
        }

        return payload;
    } catch (e) {
        throw new Error("Données QR illisibles.");
    }
};
