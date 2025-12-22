
import { Stall, Sanction, OfflineProof } from '../types';
import { CryptoService } from '../services/cryptoService';

/**
 * Capture une empreinte unique de l'appareil pour l'audit trail.
 * Empêche un utilisateur distant de falsifier des logs locaux.
 */
export const getDeviceFingerprint = async (): Promise<string> => {
    const data = [
        navigator.userAgent,
        screen.width + "x" + screen.height,
        new Date().getTimezoneOffset(),
        (navigator as any).deviceMemory || 'unknown'
    ].join('|');
    
    const encoder = new TextEncoder();
    const buffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16).toUpperCase();
};

/**
 * GÉNÉRATEUR DE PREUVE OFFLINE (GUARDIAN PROTOCOL)
 * Crée une signature HMAC-like locale pour validation différée.
 */
export const generateOfflineProof = async (agentId: string, vendorId: string, amount: number): Promise<OfflineProof> => {
    const timestamp = Date.now();
    const fingerprint = await getDeviceFingerprint();
    const rawData = `${agentId}:${vendorId}:${amount}:${timestamp}:${fingerprint}`;
    
    // On utilise la signature déterministe locale (Simulation HMAC)
    const signature = await CryptoService.signPayload(btoa(rawData));
    
    // Fix: Added missing nonce property to satisfy OfflineProof interface
    return {
        id: `OFF-${timestamp}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        agentId,
        vendorId,
        amount,
        timestamp,
        nonce: Math.floor(Math.random() * 1000000),
        signature,
        synced: false
    };
};

/**
 * VALIDATEUR D'INTÉGRITÉ (RUNTIME SHIELD)
 */
export const validateStallIntegrity = (stall: Stall): boolean => {
    if (stall.price < 0) return false;
    if (stall.lastPaymentDate && stall.lastPaymentDate > Date.now() + 60000) return false;
    return true;
};

/**
 * Calcule la dette totale d'un étal avec détail granulaire
 */
export const calculateStallDebt = (stall: Stall | undefined, sanctions: Sanction[]) => {
    if (!stall) return { monthsUnpaid: 0, rentDebt: 0, fineAmount: 0, totalDebt: 0, details: [] as any[] };

    if (!validateStallIntegrity(stall)) {
        console.error("INTEGRITY CRASH: Data poisoning detected");
        return { monthsUnpaid: 0, rentDebt: 0, fineAmount: 0, totalDebt: 0, details: [], error: "STATE_CORRUPTED" };
    }

    const lastPayment = stall.lastPaymentDate || (Date.now() - 90 * 24 * 60 * 60 * 1000);
    const now = Date.now();
    
    const monthDiff = (d1: number, d2: number) => {
        const date1 = new Date(d1);
        const date2 = new Date(d2);
        return (date2.getFullYear() - date1.getFullYear()) * 12 + (date2.getMonth() - date1.getMonth());
    };

    const monthsUnpaid = Math.max(0, monthDiff(lastPayment, now));
    const rentDebt = monthsUnpaid * stall.price;
    
    const details = [];
    const dateCursor = new Date(lastPayment);
    
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

    const activeFines = sanctions.filter(s => 
        s.stallId === stall.id && 
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
        details: details.sort((a,b) => a.dueDate - b.dueDate)
    };
};

export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-GA', { style: 'decimal' }).format(amount) + ' F';
};

// --- SECURITY PROTOCOLS ---

export const generateSecureQrPayload = async (payload: object): Promise<string> => {
    const fingerprint = await getDeviceFingerprint();
    const payloadWithMeta = {
        ...payload,
        fingerprint,
        nonce: crypto.randomUUID(),
        iat: Date.now()
    };

    const jsonStr = JSON.stringify(payloadWithMeta);
    const base64Payload = btoa(jsonStr);
    const signature = await CryptoService.signPayload(base64Payload);

    return `MCONNECT:v1:${base64Payload}:${signature}`;
};

export const parseSecureQrPayload = async (qrString: string): Promise<any> => {
    if (!qrString.startsWith('MCONNECT:v1:')) {
        throw new Error("Badge non conforme.");
    }

    const parts = qrString.split(':');
    if (parts.length !== 4) throw new Error("Format corrompu.");

    const base64Payload = parts[2];
    const signature = parts[3];

    const isValid = await CryptoService.verifySignature(base64Payload, signature);
    if (!isValid) throw new Error("SIGNATURE INVALIDE : Badge falsifié.");

    try {
        const payload = JSON.parse(atob(base64Payload));
        if (payload.type === 'PAYMENT_REQUEST' && Date.now() - payload.iat > 10 * 60 * 1000) {
            throw new Error("Facture QR expirée.");
        }
        return payload;
    } catch (e) {
        throw new Error("Erreur cryptographique.");
    }
};
