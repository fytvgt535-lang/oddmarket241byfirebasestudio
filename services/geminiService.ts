
import { GoogleGenAI, Type } from "@google/genai";
import { Stall, Market, Transaction, Sanction, PredictiveInsight } from "../types";

export interface StrategicAudit {
    diagnostic: string;
    fraudRisks: string[];
    recommendations: string[];
}

export interface FraudAnalysis {
    patterns: string[];
    riskScore: number;
    anomalies: string[];
}

export interface PatrolRecommendation {
    stallId: string;
    priority: 'high' | 'medium' | 'low';
    reason: string;
}

const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Suggère un itinéraire de patrouille optimisé pour l'agent (Efficacité terrain)
 */
export const suggestAiPatrol = async (stalls: Stall[], transactions: Transaction[], reports: any[]): Promise<PatrolRecommendation[]> => {
    try {
        const ai = getAi();
        const context = {
            stalls: stalls.map(s => ({ id: s.id, num: s.number, debt: s.price, health: s.healthStatus })),
            recentTransactions: transactions.slice(0, 20),
            reports: reports.slice(0, 10)
        };
        const prompt = `RÔLE : Superviseur de Brigade Municipale. MISSION : Prioriser 5 étals pour inspection immédiate. DATA : ${JSON.stringify(context)}`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            stallId: { type: Type.STRING },
                            priority: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                            reason: { type: Type.STRING }
                        },
                        required: ["stallId", "priority", "reason"]
                    }
                }
            }
        });
        return JSON.parse(response.text || "[]");
    } catch (e) {
        return stalls.slice(0, 5).map(s => ({ stallId: s.id, priority: 'medium', reason: 'Rotation standard' }));
    }
};

/**
 * Analyse le sentiment et la crédibilité d'un recours (Aide au médiateur)
 */
export const analyzeAppealCredibility = async (reason: string, history: Sanction[]): Promise<{ score: number; flag: boolean; advice: string }> => {
    try {
        const ai = getAi();
        const prompt = `Analyser la crédibilité de ce recours marchand : "${reason}". Historique : ${JSON.stringify(history)}`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.NUMBER, description: "Score de crédibilité 0-100" },
                        flag: { type: Type.BOOLEAN, description: "Alerte si abus suspecté" },
                        advice: { type: Type.STRING, description: "Conseil au médiateur" }
                    },
                    required: ["score", "flag", "advice"]
                }
            }
        });
        return JSON.parse(response.text || '{"score": 50, "flag": false, "advice": "Analyse indisponible."}');
    } catch (e) {
        return { score: 50, flag: false, advice: "Vérification manuelle requise." };
    }
};

export const predictMarketTrends = async (market: Market, transactions: Transaction[], reports: any[]): Promise<PredictiveInsight[]> => {
    try {
        const ai = getAi();
        const summary = { marketName: market.name, totalTx: transactions.length, hygieneAlerts: reports.length, avgAmount: transactions.length > 0 ? transactions.reduce((a,b) => a+b.amount, 0) / transactions.length : 0 };
        const prompt = `RÔLE : Analyste Prédictif - Gabon. MISSION : Prédire les flux de revenus. DATA : ${JSON.stringify(summary)}`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ parts: [{ text: prompt }] }],
            config: { 
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            zoneId: { type: Type.STRING },
                            riskLevel: { type: Type.STRING },
                            expectedRevenue: { type: Type.NUMBER },
                            recommendation: { type: Type.STRING },
                            reasoning: { type: Type.STRING }
                        },
                        required: ["zoneId", "riskLevel", "expectedRevenue", "recommendation", "reasoning"]
                    }
                }
            }
        });
        return JSON.parse(response.text || "[]");
    } catch (e) {
        return [{ zoneId: "GLOBAL", riskLevel: "medium", expectedRevenue: (market.targetRevenue || 0) * 0.9, recommendation: "Maintenance préventive réseau", reasoning: "IA hors ligne" }];
    }
};

export const runStrategicMarketAudit = async (market: Market, stalls: Stall[], transactions: Transaction[], sanctions: Sanction[]): Promise<StrategicAudit> => {
  try {
    const ai = getAi();
    const prompt = `RÔLE : Inspecteur des Finances Municipales. DATA : ${JSON.stringify(market)}`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: prompt }] }],
      config: { 
          responseMimeType: "application/json",
          responseSchema: {
              type: Type.OBJECT,
              properties: {
                  diagnostic: { type: Type.STRING },
                  fraudRisks: { type: Type.ARRAY, items: { type: Type.STRING } },
                  recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["diagnostic", "fraudRisks", "recommendations"]
          }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    return { diagnostic: "Service indisponible.", fraudRisks: [], recommendations: ["Vérification manuelle requise"] };
  }
};

export const analyzeFraudPatterns = async (transactions: Transaction[]): Promise<FraudAnalysis> => {
    try {
        const ai = getAi();
        const prompt = `RÔLE : Expert en détection de fraude financière. Analyser les patterns suivants : ${JSON.stringify(transactions.slice(0, 50))}`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ parts: [{ text: prompt }] }],
            config: { 
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
                        riskScore: { type: Type.NUMBER },
                        anomalies: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["patterns", "riskScore", "anomalies"]
                }
            }
        });
        return JSON.parse(response.text || '{"patterns":[], "riskScore":0, "anomalies":[]}');
    } catch (error) {
        return { patterns: ["Service indisponible"], riskScore: 0, anomalies: [] };
    }
};
