
import { GoogleGenAI } from "@google/genai";
import { Stall, HygieneReport, Market, Transaction, VendorProfile, Sanction } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface MapsAnalysisResult {
  text: string;
  links: { title: string; uri: string }[];
}

// --- GOOGLE MAPS GROUNDING ANALYSIS ---
export const analyzeLocationWithMaps = async (lat: number, lng: number, contextLabel: string): Promise<MapsAnalysisResult> => {
  try {
    const prompt = `
      Je suis un administrateur municipal à Libreville, Gabon.
      J'audite une coordonnée GPS : Latitude ${lat}, Longitude ${lng}.
      Ce point est censé correspondre à : "${contextLabel}".
      
      Utilise Google Maps pour :
      1. Identifier ce qui se trouve réellement à cet endroit ou à proximité immédiate.
      2. Me dire si cela correspond à une zone commerciale ou un marché.
      3. Donner l'adresse ou le lieu-dit précis.
      
      Réponds de manière factuelle pour un rapport d'audit.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
      }
    });

    // Extract Grounding Chunks (Links)
    const links: { title: string; uri: string }[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          links.push({ title: chunk.web.title, uri: chunk.web.uri });
        }
        // Google Maps specific grounding often comes in specific structures, 
        // but often falls back to web chunks for place links in the API response structure depending on version.
        // We handle what's available.
      });
    }

    return {
      text: response.text || "Analyse géographique indisponible.",
      links: links
    };

  } catch (error) {
    console.error("Maps analysis failed:", error);
    return { text: "Erreur lors de la connexion aux services cartographiques.", links: [] };
  }
};

// --- ADMIN STRATEGIC ANALYSIS ---
export const generateMarketAnalysis = async (
  marketName: string,
  stalls: Stall[],
  reports: HygieneReport[],
  transactions: Transaction[],
  marketTarget: number
): Promise<string> => {
  try {
    const occupiedCount = stalls.filter(s => s.status === 'occupied').length;
    const theoreticalRevenue = stalls
      .filter(s => s.status === 'occupied')
      .reduce((acc, curr) => acc + curr.price, 0);
    
    const actualRevenue = transactions.reduce((acc, curr) => acc + curr.amount, 0);
    const collectionRate = Math.round((actualRevenue / theoreticalRevenue) * 100) || 0;
    const criticalReports = reports.filter(r => r.status === 'pending');
    const fraudRiskCount = stalls.filter(s => s.status === 'occupied' && (!s.lastPaymentDate || Date.now() - s.lastPaymentDate > 30 * 24 * 60 * 60 * 1000)).length;

    const prompt = `
      Agis comme un Auditeur Financier et Urbain senior pour la mairie de Libreville.
      Tu analyses les données du périmètre : "${marketName}".

      DONNÉES CLÉS:
      - Taux de Recouvrement: ${collectionRate}%
      - Risque Fraude: ${fraudRiskCount} étals.
      - Hygiène: ${criticalReports.length} problèmes critiques.

      TÂCHE:
      Produis un rapport flash (max 100 mots) :
      1. 💰 **Diagnostic Financier**: Analyse l'écart.
      2. 🚨 **Action Prioritaire**: Une action concrète pour le Maire.
      Ton ton doit être professionnel, direct et orienté solution.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Analyse indisponible.";
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return "Erreur IA.";
  }
};

// --- VENDOR COACHING ---
export const generateVendorCoachTip = async (
  profile: VendorProfile,
  stall: Stall | undefined
): Promise<string> => {
  try {
    const prompt = `
      Tu es un coach commercial bienveillant pour un vendeur de marché au Gabon.
      Données Vendeur: ${profile.name}, Score Hygiène: ${profile.hygieneScore}/5.
      Données Étal: ${stall ? `Zone: ${stall.zone}, Loyer: ${stall.price}` : 'Pas d\'étal'}.
      
      Donne un conseil court (1 phrase) et motivant pour l'aider à améliorer ses affaires ou son score d'hygiène.
      Parle simplement.
    `;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Gardez votre étal propre pour attirer plus de clients !";
  } catch (e) { return "Gardez le sourire, les clients aiment ça !"; }
};

// --- AGENT NEGOTIATION SCRIPT ---
export const generateAgentScript = async (
  stall: Stall,
  totalDebt: number,
  unpaidMonths: number,
  fines: Sanction[]
): Promise<string> => {
  try {
    const prompt = `
      Tu es un assistant pour un agent de collecte au marché. Tu dois aider l'agent à récupérer une dette.
      
      CONTEXTE:
      - Vendeur: ${stall.occupantName}
      - Dette Totale: ${totalDebt} FCFA
      - Détails: ${unpaidMonths} mois de loyer impayés + ${fines.length} amendes.
      - Ton: Ferme mais respectueux (Culture gabonaise).
      
      Génère un script de dialogue court (2 phrases) que l'agent peut dire au vendeur pour le convaincre de payer maintenant, en expliquant les preuves.
    `;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Bonjour, nous avons plusieurs impayés enregistrés. Regardons cela ensemble pour éviter des pénalités.";
  } catch (e) { return "Bonjour, veuillez régulariser votre situation svp."; }
};
