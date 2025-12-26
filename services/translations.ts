
import { Language } from '../types';

export const translations = {
  fr: {
    // Navigation
    welcome: "Bienvenue",
    loading: "Chargement du réseau...",
    search: "Rechercher",
    cancel: "Annuler",
    confirm: "Confirmer",
    delete: "Supprimer",
    save: "Enregistrer",
    tab_overview: "Tableau de Bord",
    tab_users: "Citoyens & Accès",
    tab_finance: "Recettes Municipales",
    tab_audit: "Registre d'Audit",
    tab_legal: "Conformité Légale",
    
    // Modules Admin
    warroom_title: "War Room Stratégique",
    chaos_title: "Centre de Résilience (Chaos)",
    radar_title: "Surveillance Terrain",
    radar_legend: "Légende Temps Réel",
    agent_active: "Agents en service",
    geofence_violation: "Violation de Périmètre",
    audit_diff: "Analyse des Changements",
    audit_title: "Audit Trail Incorruptible",
    audit_subtitle: "Journal des modifications à haute intégrité",
    audit_actors: "Acteurs Systèmes",
    audit_global_view: "Vue Globale Logs",
    audit_search_placeholder: "Chercher action, acteur ou ID...",
    
    // Métriques
    occupancy_rate: "Taux d'Occupation",
    revenue_collected: "Recettes Percues",
    critical_alerts: "Alertes Hygiène",
    market_health: "Indice de Santé Marché",
    
    // Sécurité
    biometric_verification: "Authentification Biométrique",
    identity_certified: "Identité Certifiée",
    secure_handshake: "Validation Bi-latérale",
    data_protection_act: "Loi n°001/2011 (APDP Gabon)",
    
    // Boutique
    add_to_cart: "Ajouter au panier",
    checkout: "Valider la commande",
    order_success: "Commande enregistrée !",
    flash_sale: "Vente Flash",
    
    // Spécifiques
    reserve_stall: "Réserver un étal",
    priority_request: "Demande de Priorité (PMR/Enceinte)",
    anonymous: "Signalement Anonyme",
    waste: "Gestion des Déchets",
    water: "Eaux Usées / Fuites",
    pest: "Nuisibles / Insectes",
    infrastructure: "Bâtiment / Éclairage"
  },
  en: {
    welcome: "Welcome",
    loading: "Syncing network...",
    search: "Search",
    cancel: "Cancel",
    confirm: "Confirm",
    delete: "Delete",
    save: "Save",
    tab_overview: "Dashboard",
    tab_users: "Citizens & Access",
    tab_finance: "Municipal Revenue",
    tab_audit: "Audit Trail",
    tab_legal: "Legal Compliance",
    
    warroom_title: "Strategic War Room",
    chaos_title: "Chaos & Resilience Center",
    radar_title: "Field Surveillance",
    radar_legend: "Live Legend",
    agent_active: "Active Agents",
    geofence_violation: "Geofence Violation",
    audit_diff: "Change Analysis",
    audit_title: "Immutable Audit Trail",
    audit_subtitle: "High integrity activity log",
    audit_actors: "System Actors",
    audit_global_view: "Global Logs View",
    audit_search_placeholder: "Search action, actor or ID...",
    
    occupancy_rate: "Occupancy Rate",
    revenue_collected: "Collected Revenue",
    critical_alerts: "Hygiene Alerts",
    market_health: "Market Health Index",
    
    biometric_verification: "Biometric Authentication",
    identity_certified: "Certified Identity",
    secure_handshake: "Mutual Validation",
    data_protection_act: "Act n°001/2011 (APDP Gabon)",
    
    add_to_cart: "Add to cart",
    checkout: "Checkout",
    order_success: "Order confirmed!",
    flash_sale: "Flash Sale",
    
    reserve_stall: "Reserve a Stall",
    priority_request: "Priority Request",
    anonymous: "Anonymous Reporting",
    waste: "Waste Management",
    water: "Waste Water / Leaks",
    pest: "Pests / Insects",
    infrastructure: "Building / Lighting"
  }
};

export const t = (lang: string, key: string) => {
  const safeLang = (lang === 'en') ? 'en' : 'fr';
  const dict = translations[safeLang as keyof typeof translations] as Record<string, string>;
  const fallback = translations['fr'] as Record<string, string>;
  return (dict && dict[key]) || fallback[key] || key;
};
