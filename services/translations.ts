
import { Language } from '../types';

export const translations = {
  fr: {
    // General
    welcome: "Bienvenue",
    loading: "Chargement",
    search: "Recherche",
    search_placeholder: "Rechercher...",
    cancel: "Annuler",
    confirm: "Confirmer",
    delete: "Supprimer",
    edit: "Modifier",
    save: "Enregistrer",
    details: "Détails",
    actions: "Actions",
    date: "Date",
    filter: "Filtrer",
    add: "Ajouter",
    all: "Tous",
    create: "Créer",
    
    // Auth
    login_title: "Portail Sécurisé",
    email: "Adresse Email",
    password: "Mot de Passe",
    login_btn: "Se Connecter",
    register_btn: "Créer un Compte",
    logout: "Déconnexion",
    
    // Dashboard Tabs
    tab_overview: "Tour de Contrôle",
    tab_users: "Utilisateurs",
    tab_space: "Gestion Espace",
    tab_finance: "Finances",
    tab_markets: "Config Marchés",
    tab_audit: "Journal d'Audit",
    tab_agents: "Contrôleurs",
    
    // Dashboard Content
    recovery_rate: "Taux de Recouvrement",
    total_revenue: "Recettes Globales",
    active_users: "Citoyens Connectés",
    hygiene_alerts: "Alertes Critiques",
    financial_evolution: "Tendance Financière",
    activity_feed: "Flux Temps Réel",
    
    // Control Tower
    ct_system_status: "État Système",
    ct_operational: "Opérationnel",
    ct_sync_queue: "File Synchro",
    ct_active_markets: "Marchés Supervisés",
    ct_occupancy_avg: "Occupation Moy.",
    ct_revenue_today: "Recettes du Jour",
    ct_agents_active: "Agents Terrain",
    ct_security_alert: "Sécurité",
    
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
    occupied: "Loué",

    // --- NEW KEYS ---
    // Agent Manager
    agent_center: "Centre de Commandement",
    agent_subtitle: "Supervision temps réel & Dispatch",
    agent_connected: "Connectés",
    agent_cash_field: "Fonds Terrain",
    agent_radar: "Radar Live",
    agent_ops: "Opérations",
    agent_treasury: "Trésorerie",
    agent_roster: "Effectifs",
    agent_mission_new: "Nouvelle Mission",
    agent_mission_priority: "Priorité",
    agent_mission_title: "Titre",
    agent_mission_assigned: "Assigné à",
    agent_mission_status: "Statut",
    agent_cash_unpaid: "Fonds non reversés",
    agent_audit_flash: "Audit Flash",
    agent_force_deposit: "Rappel de Versement",
    agent_performance: "Performance",
    agent_battery: "Batterie",
    agent_assigned_market: "Marché Assigné",
    agent_assign: "Assigner Mission",

    // Stall Manager
    stall_management: "Gestion du Parc Immobilier",
    stall_subtitle: "Gérez les étals, les zones et les attributions.",
    stall_gen_series: "Générer Série",
    stall_new: "Nouvel Étal",
    stall_filter_market: "Tous les marchés",
    stall_filter_status: "Tous les statuts",
    stall_number: "Numéro",
    stall_zone: "Zone",
    stall_price: "Prix",
    stall_occupant: "Occupant",
    stall_size: "Taille",
    
    // Finance Manager
    fin_revenue_period: "Recettes (Période)",
    fin_total_expenses: "Dépenses Totales",
    fin_net_balance: "Solde Net",
    fin_from: "Du",
    fin_to: "Au",
    fin_export: "Export CSV",
    fin_evolution: "Évolution Recettes",
    fin_expenses: "Dépenses",
    fin_category: "Catégorie",
    fin_amount: "Montant",
    
    // Market Manager
    mkt_management: "Gestion des Marchés",
    mkt_subtitle: "Vue stratégique et opérationnelle.",
    mkt_god_mode: "Mode: Oeil de Dieu",
    mkt_std_mode: "Mode: Standard",
    mkt_occupancy: "Occupation",
    mkt_target: "Objectif Mensuel",
    mkt_recovery: "Recouvrement",
    mkt_total_debt: "Dette Totale",
    mkt_bad_payers: "mauvais payeurs",
    mkt_open: "Ouvert",
    mkt_closed: "Fermé"
  },
  en: {
    // General
    welcome: "Welcome",
    loading: "Loading",
    search: "Search",
    search_placeholder: "Search...",
    cancel: "Cancel",
    confirm: "Confirm",
    delete: "Delete",
    edit: "Edit",
    save: "Save",
    details: "Details",
    actions: "Actions",
    date: "Date",
    filter: "Filter",
    add: "Add",
    all: "All",
    create: "Create",
    
    // Auth
    login_title: "Secure Portal",
    email: "Email Address",
    password: "Password",
    login_btn: "Login",
    register_btn: "Create Account",
    logout: "Logout",
    
    // Dashboard Tabs
    tab_overview: "Control Tower",
    tab_users: "User Management",
    tab_space: "Space Management",
    tab_finance: "Finance",
    tab_markets: "Market Config",
    tab_audit: "Audit Logs",
    tab_agents: "Controllers",
    
    // Dashboard Content
    recovery_rate: "Recovery Rate",
    total_revenue: "Total Revenue",
    active_users: "Active Users",
    hygiene_alerts: "Hygiene Alerts",
    financial_evolution: "Financial Trends",
    activity_feed: "Live Feed",
    
    // Control Tower
    ct_system_status: "System Status",
    ct_operational: "Operational",
    ct_sync_queue: "Sync Queue",
    ct_active_markets: "Monitored Markets",
    ct_occupancy_avg: "Avg Occupancy",
    ct_revenue_today: "Revenue Today",
    ct_agents_active: "Field Agents",
    ct_security_alert: "Security",
    
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
    occupied: "Occupied",

    // --- NEW KEYS ---
    // Agent Manager
    agent_center: "Command Center",
    agent_subtitle: "Real-time Supervision & Dispatch",
    agent_connected: "Online",
    agent_cash_field: "Field Funds",
    agent_radar: "Live Radar",
    agent_ops: "Operations",
    agent_treasury: "Treasury",
    agent_roster: "Roster",
    agent_mission_new: "New Mission",
    agent_mission_priority: "Priority",
    agent_mission_title: "Title",
    agent_mission_assigned: "Assigned to",
    agent_mission_status: "Status",
    agent_cash_unpaid: "Unremitted Funds",
    agent_audit_flash: "Flash Audit",
    agent_force_deposit: "Recall Funds",
    agent_performance: "Performance",
    agent_battery: "Battery",
    agent_assigned_market: "Assigned Market",
    agent_assign: "Assign Mission",

    // Stall Manager
    stall_management: "Real Estate Management",
    stall_subtitle: "Manage stalls, zones and allocations.",
    stall_gen_series: "Generate Series",
    stall_new: "New Stall",
    stall_filter_market: "All Markets",
    stall_filter_status: "All Statuses",
    stall_number: "Number",
    stall_zone: "Zone",
    stall_price: "Price",
    stall_occupant: "Occupant",
    stall_size: "Size",
    
    // Finance Manager
    fin_revenue_period: "Revenue (Period)",
    fin_total_expenses: "Total Expenses",
    fin_net_balance: "Net Balance",
    fin_from: "From",
    fin_to: "To",
    fin_export: "Export CSV",
    fin_evolution: "Revenue Trends",
    fin_expenses: "Expenses",
    fin_category: "Category",
    fin_amount: "Amount",
    
    // Market Manager
    mkt_management: "Market Management",
    mkt_subtitle: "Strategic and operational view.",
    mkt_god_mode: "Mode: God's Eye",
    mkt_std_mode: "Mode: Standard",
    mkt_occupancy: "Occupancy",
    mkt_target: "Monthly Target",
    mkt_recovery: "Recovery",
    mkt_total_debt: "Total Debt",
    mkt_bad_payers: "bad payers",
    mkt_open: "Open",
    mkt_closed: "Closed"
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
