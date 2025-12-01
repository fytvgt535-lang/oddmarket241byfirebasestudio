

export type StallStatus = 'free' | 'occupied' | 'reserved';
export type ProductType = 'vivres' | 'textile' | 'electronique' | 'divers';
export type Language = 'fr' | 'fang' | 'mpongwe';
export type AppRole = 'vendor' | 'agent' | 'admin' | 'mediator' | 'guest';

// --- NEW: STALL HEALTH STATUS ---
export type StallHealth = 'healthy' | 'warning' | 'critical';

// --- NEW: NOTIFICATION SYSTEM ---
export interface AppNotification {
  id: string;
  recipientRole: 'admin' | 'vendor' | 'agent';
  recipientId?: string; // If specific vendor
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  date: number;
  read: boolean;
}

export interface Market {
  id: string;
  name: string;
  location: string; // Quartier/Arrondissement
  image?: string;
  targetRevenue: number; // Objectif mensuel en FCFA
}

export interface Expense {
  id: string;
  marketId: string;
  category: 'cleaning' | 'security' | 'electricity' | 'maintenance' | 'staff';
  amount: number;
  date: number;
  description: string;
}

export interface SmsTemplate {
  id: string;
  tone: 'friendly' | 'firm' | 'urgent';
  label: string;
  content: string;
}

export interface SmsCampaign {
  id: string;
  marketId: string; // 'all' or specific market
  targetAudience: 'all' | 'unpaid_30' | 'unpaid_60' | 'zone_vivres' | 'vulnerable';
  message: string;
  tone: SmsTemplate['tone'];
  sentDate: number;
  status: 'sent' | 'scheduled';
  recipientCount: number;
}

export interface PaymentPlan {
  id: string;
  vendorId: string;
  stallNumber: string;
  totalDebt: number;
  installments: number; // Nombre de mois
  amountPerMonth: number;
  startDate: number;
  status: 'active' | 'completed' | 'defaulted';
  progress: number; // 0-100
  installmentsList?: { month: number; status: 'paid' | 'pending'; dueDate: number }[];
}

export interface Sanction {
  id: string;
  vendorId: string;
  marketId: string;
  type: 'warning' | 'fine' | 'suspension';
  infractionId?: string; // Code officiel
  reason: string;
  amount: number; // Prix fixe obligatoire
  date: number;
  status: 'active' | 'resolved';
  issuedBy: string; // Agent ID
  evidenceUrl?: string; // New: Proof photo
  // Justice / Appeal Module
  appealReason?: string;
  appealDate?: number;
  appealStatus?: 'pending' | 'accepted' | 'rejected';
}

// --- AGENT SECURE LOGS (BLACK BOX) ---
export interface AgentLog {
  id: string;
  agentId: string;
  actionType: 'payment_collected' | 'sanction_issued' | 'shift_start' | 'shift_end' | 'cash_deposit';
  details: string; // Ex: "Encaissement Loyer Stall MB-12"
  amount?: number;
  timestamp: number;
  hash: string; // Simulated cryptographic hash for integrity
  location: string; // Simulated GPS Coords
  evidenceUrl?: string; // Link to photo proof if applicable
}

export interface Agent {
  id: string;
  name: string;
  marketId: string;
  role: 'collector' | 'hygiene' | 'delivery'; // Added delivery role
  performanceScore: number; // 0-100 based on targets
  lastActive: number;
  cashInHand: number; // Real-time cash tracking to be deposited
  isShiftActive: boolean; // New: Shift status
  logs: AgentLog[];
}

// --- DIGITAL RECEIPT (INVIOLABLE) ---
export interface Receipt {
  id: string;
  transactionId: string;
  stallNumber: string;
  vendorName: string;
  amount: number;
  date: number;
  agentId: string;
  hash: string; // Cryptographic proof
  gpsCoordinates: string; // Where the receipt was issued
  marketId: string;
}

// --- DEEP DATA STRUCTURES FOR STALL TWIN ---

export interface StallDocument {
  id: string;
  type: 'lease_agreement' | 'insurance' | 'hygiene_cert' | 'tax_clearance';
  status: 'valid' | 'expired' | 'missing' | 'pending';
  expiryDate: number;
  url?: string; // Link to PDF/Image
}

export interface StallEmployee {
  id: string;
  name: string;
  role: 'manager' | 'seller' | 'helper';
  phone: string;
  isRegistered: boolean; // Has badge?
}

export interface StallMessage {
  id: string;
  direction: 'inbound' | 'outbound'; // From Vendor or From Admin
  content: string;
  date: number;
  read: boolean;
}

export interface StallActivity {
  id: string;
  type: 'payment' | 'infraction' | 'maintenance' | 'document_update' | 'inspection' | 'message';
  date: number;
  description: string;
  agentName?: string;
}

export interface Stall {
  id: string;
  marketId: string; // Link to Market
  number: string;
  zone: string;
  price: number; // Monthly rent in FCFA
  status: StallStatus;
  
  // Basic Identity
  occupantName?: string; // Titulaire Legal
  occupantPhone?: string;
  
  // Metrics
  lastPaymentDate?: number; // For fraud detection
  size: 'S' | 'M' | 'L';
  surfaceArea: number; // m2
  productType: ProductType;
  isPriority?: boolean; // Reserved for vulnerable groups
  
  // Digital Twin Deep Data
  complianceScore: number; // 0-100 AI Score
  healthStatus: StallHealth; // Computed status for visual cards
  documents: StallDocument[];
  employees: StallEmployee[];
  activityLog: StallActivity[];
  messages: StallMessage[]; // Direct communication history
  
  // Geodata (Simulated)
  coordinates?: { lat: number, lng: number };
}

export interface HygieneReport {
  id: string;
  marketId: string; // Link to Market
  category: 'waste' | 'water' | 'pest' | 'infrastructure';
  description: string;
  timestamp: number;
  status: 'pending' | 'resolved';
  location: string; // Specific detail inside market
  isAnonymous: boolean;
  hasAudio?: boolean; // New: Voice recording support
}

export type PaymentProvider = 'orange' | 'momo' | 'airtel' | 'cash';

export interface Transaction {
  id: string;
  marketId: string; // Link to Market
  amount: number;
  date: number;
  type: 'rent' | 'fine' | 'tax';
  provider: PaymentProvider;
  stallNumber?: string;
  reference: string;
  status: 'pending' | 'completed';
  collectedBy?: string; // Agent ID if cash
}

// --- E-COMMERCE / PRODUCT ---
export interface Product {
  id: string;
  stallId: string;
  name: string;
  price: number;
  promoPrice?: number; // New: Promotion
  isPromo?: boolean; // New: Flag
  unit: string; // kg, paquet, pièce
  imageUrl?: string;
  additionalImages?: string[]; // New: Multiple images
  inStock: boolean;
  stockQuantity: number; // New: Precise stock management
  category: ProductType;
  description?: string;
  origin?: string; // e.g. "Gabon (Local)", "Cameroun", "Import"
  subCategory?: string; // e.g. "Tubercule", "Feuille", "Poisson fumé"
  tags?: string[]; // New: "Bio", "Pimenté", etc.
  
  // New V2 fields
  wholesalePrices?: { minQuantity: number, price: number }[];
  freshnessLevel?: number; // 0 (Old) - 100 (Fresh)
  qualityGrade?: 'A' | 'B' | 'C';
  audioDescriptionUrl?: string; // Voice Note
}

export interface ClientOrder {
  id: string;
  stallId: string;
  customerName: string;
  customerPhone: string;
  items: { productId: string; name: string; quantity: number; price: number }[];
  totalAmount: number;
  status: 'pending' | 'paid' | 'preparing' | 'ready' | 'picked_up'; // Enhanced status
  date: number;
  paymentProvider: 'orange' | 'airtel' | 'momo';
  paymentRef: string;
  
  // Logistics
  deliveryMode: 'pickup' | 'delivery';
  deliveryAddress?: string;
  deliveryFee?: number;
  assignedAgentId?: string; // Agent de mairie (livreur)
}

export interface SubscriptionHistory {
  id: string;
  date: number;
  amount: number;
  planName: string;
  status: 'active' | 'expired';
}

export interface VendorProfile {
  id: string;
  name: string;
  phone: string;
  stallId?: string;
  photoUrl?: string;
  bannerUrl?: string; // New: Storefront banner
  bio?: string; // New: Shop description
  hygieneScore: number; // 1 to 5 stars
  isVulnerable?: boolean; // Elderly or pregnant
  language: Language;
  
  // Logistics
  isLogisticsSubscribed: boolean; // 5000 FCFA/mois subscription
  subscriptionExpiry?: number;
  subscriptionPlan?: 'standard' | 'premium';
  subscriptionHistory?: SubscriptionHistory[];
}

// --- PREDEFINED INFRACTIONS (CODE PENAL MARCHE) ---
export const PREDEFINED_INFRACTIONS = [
  { id: 'HYG_01', label: 'Défaut d\'hygiène (Déchets)', amount: 5000 },
  { id: 'HYG_02', label: 'Eaux usées sur voie publique', amount: 10000 },
  { id: 'OCC_01', label: 'Débordement étal (Ligne jaune)', amount: 15000 },
  { id: 'OCC_02', label: 'Obstruction allée sécurité', amount: 25000 },
  { id: 'ADM_01', label: 'Absence de badge vendeur', amount: 2000 },
  { id: 'ADM_02', label: 'Défaut carnet de santé', amount: 5000 },
  { id: 'DIV_99', label: 'Autre (Saisie Manuelle)', amount: 0 } // Requires manual input
];