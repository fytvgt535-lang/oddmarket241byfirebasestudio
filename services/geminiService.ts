
import { Stall, Market, Transaction, Sanction, PredictiveInsight } from "../types";

// --- TYPES (Conservés pour la compatibilité) ---
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

// --- MOCK IMPLEMENTATION (SIMULATEUR) ---
// Le module IA est désactivé pour la stabilité. Ces fonctions retournent des données simulées.

export const suggestAiPatrol = async (stalls: Stall[], transactions: Transaction[], reports: any[]): Promise<PatrolRecommendation[]> => {
    console.log("[IA] Suggestion de patrouille (Mode Simulation)");
    // Retourne simplement les 5 premiers étals comme prioritaires
    return stalls.slice(0, 5).map(s => ({
        stallId: s.id,
        priority: 'medium',
        reason: 'Inspection de routine (IA Désactivée)'
    }));
};

export const analyzeAppealCredibility = async (reason: string, history: Sanction[]): Promise<{ score: number; flag: boolean; advice: string }> => {
    console.log("[IA] Analyse Recours (Mode Simulation)");
    return {
        score: 85,
        flag: false,
        advice: "Le profil du commerçant est stable. L'IA est en mode maintenance, validation manuelle recommandée."
    };
};

export const predictMarketTrends = async (market: Market, transactions: Transaction[], reports: any[]): Promise<PredictiveInsight[]> => {
    console.log("[IA] Prédiction (Mode Simulation)");
    const simulatedRevenue = (market.capacity * (market.baseRent || 1000));
    return [{
        zoneId: "GLOBAL",
        riskLevel: "low",
        expectedRevenue: simulatedRevenue,
        recommendation: "Maintenir la pression fiscale actuelle.",
        reasoning: "Projection linéaire basée sur l'occupation théorique (Mode Simulation)."
    }];
};

export const runStrategicMarketAudit = async (market: Market, stalls: Stall[], transactions: Transaction[], sanctions: Sanction[]): Promise<StrategicAudit> => {
    console.log("[IA] Audit (Mode Simulation)");
    return {
        diagnostic: "Santé financière du marché stable. Aucune anomalie critique détectée par le système de secours.",
        fraudRisks: ["Risque de sous-déclaration en espèces", "Délai de versement des agents"],
        recommendations: ["Renforcer les contrôles inopinés", "Vérifier les terminaux agents"]
    };
};

export const analyzeFraudPatterns = async (transactions: Transaction[]): Promise<FraudAnalysis> => {
    console.log("[IA] Fraude (Mode Simulation)");
    return {
        patterns: ["Activité normale"],
        riskScore: 5,
        anomalies: []
    };
};
