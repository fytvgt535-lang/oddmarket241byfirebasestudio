
// Carte simplifiée des quartiers de Libreville (Bounding Boxes approximatives)
// Permet de donner un contexte géographique sans API Google payante à chaque ping.

export const getDistrictFromCoordinates = (lat: number, lng: number): string => {
    // Logic: North to South, West to East checks
    
    // Zone Nord (Akanda / Angondjé)
    if (lat > 0.48) return "Akanda / Angondjé";
    
    // Zone Aéroport
    if (lat > 0.45 && lng < 9.42) return "Aéroport ADL";
    
    // Zone Centre (Mont-Bouët, Peyrie) - The Core Market Zone
    if (lat > 0.38 && lat < 0.42 && lng > 9.44 && lng < 9.46) return "Marché Mont-Bouët";
    
    // Zone Bord de Mer / Louis
    if (lat > 0.38 && lat < 0.42 && lng < 9.44) return "Quartier Louis / Bord de Mer";
    
    // Zone Est (PK / Nkok)
    if (lng > 9.50) return "Zone PK / Nkok";
    
    // Zone Sud (Owendo)
    if (lat < 0.35) return "Owendo / Port";
    
    // Zone Industrielle Oloumi
    if (lat > 0.36 && lat < 0.38 && lng > 9.46) return "ZI Oloumi";

    // Défaut
    return "Secteur Inconnu";
};

// Vérifie si un agent est dans sa zone assignée
export const checkZoneCompliance = (currentDistrict: string, authorizedZones: string[] = []): boolean => {
    if (!authorizedZones || authorizedZones.length === 0) return true; // Pas de restriction
    return authorizedZones.some(zone => currentDistrict.includes(zone) || zone.includes(currentDistrict));
};
