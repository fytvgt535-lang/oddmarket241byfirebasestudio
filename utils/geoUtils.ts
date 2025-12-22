
/**
 * Calcule la distance entre deux points GPS (Formule Haversine)
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance en mètres
};

/**
 * Identifie le quartier de Libreville à partir des coordonnées
 */
export const getLibrevilleDistrict = (lat: number, lng: number): string => {
    // Coordonnées approximatives des hubs
    const districts = [
        { name: "Mont-Bouët", lat: 0.3944, lng: 9.4536 },
        { name: "Akanda", lat: 0.4800, lng: 9.4800 },
        { name: "Owendo", lat: 0.2900, lng: 9.5000 },
        { name: "Nzeng-Ayong", lat: 0.4100, lng: 9.4800 },
        { name: "Aéroport", lat: 0.4580, lng: 9.4120 },
        { name: "Louis", lat: 0.4080, lng: 9.4350 }
    ];

    let nearest = districts[0];
    let minDistance = calculateDistance(lat, lng, districts[0].lat, districts[0].lng);

    districts.forEach(d => {
        const dist = calculateDistance(lat, lng, d.lat, d.lng);
        if (dist < minDistance) {
            minDistance = dist;
            nearest = d;
        }
    });

    return nearest.name;
};

/**
 * Vérifie si un agent respecte son périmètre d'action (Geofence)
 */
export const isWithinMarketBounds = (agentLat: number, agentLng: number, marketLat: number, marketLng: number, radiusMeters: number = 500): boolean => {
    const distance = calculateDistance(agentLat, agentLng, marketLat, marketLng);
    return distance <= radiusMeters;
};
