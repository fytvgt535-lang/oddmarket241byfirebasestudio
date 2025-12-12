
/**
 * SERVICE CRYPTOGRAPHIQUE (MOCK BACKEND)
 * 
 * ARCHITECTURE NOTE:
 * Dans une production réelle, ce fichier ne contiendrait PAS le sel.
 * Il ferait un appel API : return await supabase.functions.invoke('sign-transaction', { payload });
 * 
 * Pour cette démo autonome, nous simulons cette sécurité.
 */

// WARNING: In production, strictly env variable only, never in bundle.
const MOCK_SERVER_SALT = process.env.APP_SECRET_SALT || "GABON_SECURE_SALT_2024_V1";

export const CryptoService = {
    /**
     * Génère une signature HMAC-SHA256 (Simulée côté client pour la démo)
     */
    signPayload: async (payloadBase64: string): Promise<string> => {
        // SIMULATION LATENCE RÉSEAU (Pour imiter un appel Edge Function)
        await new Promise(resolve => setTimeout(resolve, 50));

        const dataToSign = `${payloadBase64}.${MOCK_SERVER_SALT}`;
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(dataToSign);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        // Retourne les 16 premiers caractères hex (Short Signature)
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
    },

    /**
     * Vérifie une signature (Devrait être fait côté serveur normalement)
     */
    verifySignature: async (payloadBase64: string, providedSignature: string): Promise<boolean> => {
        const calculatedSignature = await CryptoService.signPayload(payloadBase64);
        return calculatedSignature === providedSignature;
    },

    /**
     * Génère un hash de transaction pour l'audit
     */
    hashTransaction: async (data: string): Promise<string> => {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data + MOCK_SERVER_SALT);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return `SIG-${hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16).toUpperCase()}`;
    }
};
