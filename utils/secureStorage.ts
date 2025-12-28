
/**
 * SERVICE DE STOCKAGE LOCAL CHIFFRÉ (AES-GCM)
 * Remplace localStorage pour les données sensibles (Transactions, Profils).
 * Utilise la Web Crypto API native pour des performances maximales sans librairie externe lourde.
 * Standard: NIST Special Publication 800-38D
 */

const ENC_ALGO = { name: "AES-GCM", length: 256 };
const STORAGE_PREFIX = "mc_secure_";

// Clé dérivée de la session.
// En production, cette clé doit être dérivée du PIN utilisateur via PBKDF2.
// Pour ce prototype, nous générons une clé persistante unique par appareil.
let deviceKey: CryptoKey | null = null;

const getDeviceKey = async (): Promise<CryptoKey> => {
  if (deviceKey) return deviceKey;
  
  const rawKey = localStorage.getItem('mc_device_key');
  
  if (rawKey) {
    // Import de la clé existante
    const keyData = new Uint8Array(JSON.parse(rawKey));
    deviceKey = await window.crypto.subtle.importKey("raw", keyData, "AES-GCM", true, ["encrypt", "decrypt"]);
  } else {
    // Génération initiale (Premier lancement)
    deviceKey = await window.crypto.subtle.generateKey(ENC_ALGO, true, ["encrypt", "decrypt"]);
    const exported = await window.crypto.subtle.exportKey("raw", deviceKey);
    // On sauvegarde la clé brute (dans un environnement réel, ceci serait stocké dans le Secure Enclave / Keystore natif)
    localStorage.setItem('mc_device_key', JSON.stringify(Array.from(new Uint8Array(exported))));
  }
  return deviceKey;
};

export const SecureStorage = {
  
  /**
   * Chiffre et stocke un objet JSON
   */
  setItem: async (key: string, data: any): Promise<void> => {
    try {
      const cryptoKey = await getDeviceKey();
      // IV (Initialization Vector) unique pour chaque écriture - Indispensable pour AES-GCM
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      
      const encoder = new TextEncoder();
      const encodedData = encoder.encode(JSON.stringify(data));

      const encryptedContent = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        cryptoKey,
        encodedData
      );

      // On stocke : IV + Données chiffrées
      const payload = {
        iv: Array.from(iv),
        content: Array.from(new Uint8Array(encryptedContent))
      };
      
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload));
    } catch (e) {
      console.error("Secure Storage Write Error:", e);
      throw new Error("Échec du chiffrement local.");
    }
  },

  /**
   * Récupère et déchiffre un objet JSON
   */
  getItem: async <T>(key: string): Promise<T | null> => {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      if (!raw) return null;

      const payload = JSON.parse(raw);
      const cryptoKey = await getDeviceKey();
      
      const iv = new Uint8Array(payload.iv);
      const data = new Uint8Array(payload.content);

      const decryptedContent = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        cryptoKey,
        data
      );

      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(decryptedContent)) as T;
    } catch (e) {
      console.error("Secure Storage Read Error (Data likely corrupted or tampered):", e);
      return null;
    }
  },

  removeItem: (key: string) => {
    localStorage.removeItem(STORAGE_PREFIX + key);
  },

  clear: () => {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith(STORAGE_PREFIX)) localStorage.removeItem(k);
    });
  }
};
