
import { Language } from '../types';

export const translations = {
  fr: {
    // General
    welcome: "Bienvenue",
    loading: "Chargement",
    search: "Recherche",
    cancel: "Annuler",
    confirm: "Confirmer",
    delete: "Supprimer",
    edit: "Modifier",
    save: "Enregistrer",
    details: "Détails",
    actions: "Actions",
    date: "Date",
    filter: "Filtrer",
    
    // Auth
    login_title: "Portail Sécurisé",
    email: "Adresse Email",
    password: "Mot de Passe",
    login_btn: "Se Connecter",
    register_btn: "Créer un Compte",
    logout: "Déconnexion",
    
    // Dashboard Tabs
    tab_overview: "Vue d'ensemble",
    tab_users: "Utilisateurs",
    tab_space: "Gestion Espace",
    tab_finance: "Finances",
    tab_markets: "Config Marchés",
    tab_audit: "Journal d'Audit",
    
    // Dashboard Content
    recovery_rate: "Taux de Recouvrement",
    total_revenue: "Recettes Totales",
    active_users: "Utilisateurs Actifs",
    hygiene_alerts: "Alertes Hygiène",
    financial_evolution: "Évolution Financière",
    activity_feed: "Flux d'Activité & Géolocalisation",
    
    // Activity Feed
    feed_transaction: "Transaction Financière",
    feed_order: "Commande Client",
    feed_system: "Action Système",
    feed_security: "Alerte Sécurité",
    feed_waiting: "En attente d'activité...",
    
    // User Manager
    user_accounts: "Comptes",
    user_active: "Actifs",
    user_banned: "Bannis",
    user_role: "Rôle",
    user_market: "Marché",
    user_sort: "Trier par",
    
    // Audit Log
    audit_title: "L'Oeil de Dieu",
    audit_subtitle: "Journal d'Audit & Preuves Numériques",
    audit_actors: "Acteurs Identifiés",
    audit_global_view: "Vue Globale",
    audit_search_placeholder: "Rechercher IP, Action...",
    
    // Market Features
    reserve_stall: "Réserver un étal",
    report_issue: "Signaler un problème",
    my_account: "Mon Compte",
    payment: "Paiement",
    
    // Categories
    waste: "Déchets",
    water: "Eau",
    pest: "Nuisibles",
    infrastructure: "Infrastr.",
    
    // Common Actions
    send: "Envoyer",
    anonymous: "Rester anonyme",
    voice_record: "Enregistrer vocal",
    priority_request: "Demande Prioritaire",
    available: "Libre",
    occupied: "Occupé"
  },
  en: {
    // General
    welcome: "Welcome",
    loading: "Loading",
    search: "Search",
    cancel: "Cancel",
    confirm: "Confirm",
    delete: "Delete",
    edit: "Edit",
    save: "Save",
    details: "Details",
    actions: "Actions",
    date: "Date",
    filter: "Filter",
    
    // Auth
    login_title: "Secure Portal",
    email: "Email Address",
    password: "Password",
    login_btn: "Login",
    register_btn: "Create Account",
    logout: "Logout",
    
    // Dashboard Tabs
    tab_overview: "Overview",
    tab_users: "User Management",
    tab_space: "Space Management",
    tab_finance: "Finance",
    tab_markets: "Market Config",
    tab_audit: "Audit Logs",
    
    // Dashboard Content
    recovery_rate: "Recovery Rate",
    total_revenue: "Total Revenue",
    active_users: "Active Users",
    hygiene_alerts: "Hygiene Alerts",
    financial_evolution: "Financial Trends",
    activity_feed: "Activity Feed & Geolocation",
    
    // Activity Feed
    feed_transaction: "Financial Transaction",
    feed_order: "Client Order",
    feed_system: "System Action",
    feed_security: "Security Alert",
    feed_waiting: "Waiting for activity...",
    
    // User Manager
    user_accounts: "Accounts",
    user_active: "Active",
    user_banned: "Banned",
    user_role: "Role",
    user_market: "Market",
    user_sort: "Sort By",
    
    // Audit Log
    audit_title: "God's Eye",
    audit_subtitle: "Audit Log & Digital Evidence",
    audit_actors: "Identified Actors",
    audit_global_view: "Global View",
    audit_search_placeholder: "Search IP, Action...",
    
    // Market Features
    reserve_stall: "Reserve Stall",
    report_issue: "Report Issue",
    my_account: "My Account",
    payment: "Payment",
    
    // Categories
    waste: "Waste",
    water: "Water",
    pest: "Pests",
    infrastructure: "Infrastructure",
    
    // Common Actions
    send: "Send",
    anonymous: "Stay Anonymous",
    voice_record: "Record Voice",
    priority_request: "Priority Request",
    available: "Available",
    occupied: "Occupied"
  },
  // Langues locales (Fallback partiel vers FR pour les termes techniques)
  fang: {
    welcome: "Mbolo",
    reserve_stall: "Kô'ô étal",
    report_issue: "Kobô ésaï",
    my_account: "A compte dam",
    payment: "Ta'a",
    waste: "Mbi",
    water: "Medjim",
    pest: "Cok",
    infrastructure: "Ndâ",
    send: "Lôm",
    anonymous: "Kô'ô dzin",
    logout: "Kô'ô"
  },
  mpongwe: {
    welcome: "Mbolo",
    reserve_stall: "Numba étal",
    report_issue: "Bika mbe",
    my_account: "Compte zami",
    payment: "Paye",
    waste: "Mbinda",
    water: "Aningo",
    pest: "Iynè",
    infrastructure: "Nago",
    send: "Tuma",
    anonymous: "Dira dzin",
    logout: "Denda"
  }
};

export const t = (lang: string, key: string) => {
  // Safe cast logic
  const safeLang = (lang === 'en' || lang === 'fang' || lang === 'mpongwe') ? lang : 'fr';
  const dict = translations[safeLang] as Record<string, string>;
  const fallback = translations['fr'] as Record<string, string>;
  
  return dict[key] || fallback[key] || key;
};
