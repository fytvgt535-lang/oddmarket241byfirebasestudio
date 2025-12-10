
export type StallStatus = 'free' | 'occupied' | 'reserved';
export type ProductType = 'vivres' | 'textile' | 'electronique' | 'divers';
export type Language = 'fr' | 'en' | 'fang' | 'mpongwe';
export type AppRole = 'vendor' | 'agent' | 'admin' | 'mediator' | 'client';

// --- SCHEDULE SYSTEM ---
export interface DaySchedule {
  open: string;
  close: string;
  isOpen: boolean;
}

export interface MarketSchedule {
  [key: string]: DaySchedule; // lundi, mardi, etc.
}

// --- AUDIT & SECURITY ---
export interface AuditLog {
  id: string;
  actorId: string;
  actorName?: string;
  targetId: string;
  action: string;
  oldValue?: any;
  newValue?: any;
  reason?: string;
  metadata?: {
    ip?: string;
    device?: string;
    browser?: string;
    os?: string;
    location?: string;
    userAgent?: string;
  };
  created_at?: string;
  createdAt: number;
}

export interface UserActivity {
  id: string;
  userId: string;
  actionType: 'login' | 'logout' | 'navigation' | 'action';
  details: string;
  createdAt: number;
}

// --- AGENT MISSIONS (REAL DATA STRUCTURE) ---
export type MissionStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type MissionType = 'collection' | 'inspection' | 'verification' | 'security';

export interface Mission {
  id: string;
  agentId: string;
  marketId: string;
  type: MissionType;
  title: string;
  description: string;
  targetStallId?: string;
  status: MissionStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: number;
  dueDate?: number;
  completedAt?: number;
  report?: string;
}

// --- SMART SHOPPER (OFFLINE FEATURES) ---
export interface LocalVendor {
  id: string;
  name: string;
  type: 'bio' | 'grossiste' | 'economique' | 'standard';
  rating: number; // 1-5
  distance: string; // ex: "Zone A"
}

export interface ProductOffer {
  id: string;
  productId: string;
  productName: string;
  vendor: LocalVendor;
  price: number;
  unit: string;
  attributes: {
    isBio: boolean;
    isFresh: boolean;
    isLocal: boolean;
    isPromo: boolean;
  };
  score?: number;
}

export interface SmartListItem {
  id: string;
  originalText: string;
  cleanTerm: string;
  preferences: {
    bio: boolean;
    cheap: boolean;
    fresh: boolean;
  };
  offers: ProductOffer[];
  selectedOfferId: string | null;
}

export interface SmartListHistory {
  id: string;
  name: string;
  date: number;
  originalText: string;
  totalAtTheTime: number;
  itemCount: number;
}

// --- AUTHENTICATION & USER MANAGEMENT ---
export type KycStatus = 'pending' | 'verified' | 'rejected' | 'none';
export type IdentityType = 'cni' | 'passport' | 'carte_sejour' | 'permis';

export interface IdentityDocument {
  type: IdentityType;
  number: string;
  fileUrl: string;
  uploadedAt: number;
}

export interface UserAddress {
  id: string;
  label: string;
  details: string;
  isDefault: boolean;
}

export interface ShoppingItem {
  id: string;
  name: string;
  isChecked: boolean;
}

export interface UserPreferences {
  language: Language;
  notifications: {
    push: boolean;
    sms: boolean;
    email: boolean;
  };
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: AppRole;
  name: string;
  phone: string;
  isBanned: boolean;
  kycStatus: KycStatus;
  kycDocument?: IdentityDocument;
  createdAt: number;
  lastLogin?: number;
  lastSeenAt?: number;
  marketId?: string;
  stallId?: string;
  bio?: string;
  photoUrl?: string;
  isLogisticsSubscribed?: boolean;
  subscriptionExpiry?: number;
  
  addresses?: UserAddress[];
  shoppingList?: ShoppingItem[];
  loyaltyPoints?: number;
  favorites?: string[];
  preferences?: UserPreferences;
  
  // Real Agent Data Storage
  agentStats?: {
      cashInHand: number;
      performanceScore: number;
      isShiftActive: boolean;
      lastActive: number;
  };
}

export type StallHealth = 'healthy' | 'warning' | 'critical';

export interface AppNotification {
  id: string;
  recipientRole: 'admin' | 'vendor' | 'agent' | 'client';
  recipientId?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  date: number;
  read: boolean;
}

export interface Market {
  id: string;
  name: string;
  city: string;
  neighborhood: string;
  image?: string;
  targetRevenue: number;
  capacity: number;
  baseRent: number;
  hasDeliveryService: boolean;
  description?: string;
  lat?: number;
  lng?: number;
  schedule?: MarketSchedule;
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
  marketId: string;
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
  installments: number;
  amountPerMonth: number;
  startDate: number;
  status: 'active' | 'completed' | 'defaulted';
  progress: number;
  installmentsList?: { month: number; status: 'paid' | 'pending'; dueDate: number }[];
}

export interface Sanction {
  id: string;
  vendorId: string;
  marketId: string;
  type: 'warning' | 'fine' | 'suspension';
  infractionId?: string;
  reason: string;
  amount: number;
  date: number;
  status: 'active' | 'resolved' | 'pending_appeal' | 'appeal_accepted' | 'appeal_rejected';
  issuedBy: string;
  evidenceUrl?: string;
  appealReason?: string;
  appealDate?: number;
  appealStatus?: 'pending' | 'accepted' | 'rejected';
}

export interface AgentLog {
  id: string;
  agentId: string;
  actionType: 'payment_collected' | 'sanction_issued' | 'shift_start' | 'shift_end' | 'cash_deposit';
  details: string;
  amount?: number;
  timestamp: number;
  hash: string;
  location: string;
  evidenceUrl?: string;
}

export interface Agent {
  id: string;
  userId?: string;
  name: string;
  marketId: string;
  role: 'collector' | 'hygiene' | 'delivery';
  performanceScore: number;
  lastActive: number;
  cashInHand: number;
  isShiftActive: boolean;
  logs: AgentLog[];
}

export interface Receipt {
  id: string;
  transactionId: string;
  stallNumber: string;
  vendorName: string;
  amount: number;
  date: number;
  agentId: string;
  hash: string;
  gpsCoordinates: string;
  marketId: string;
}

export interface StallDocument {
  id: string;
  type: 'lease_agreement' | 'insurance' | 'hygiene_cert' | 'tax_clearance';
  status: 'valid' | 'expired' | 'missing' | 'pending';
  expiryDate: number;
  url?: string;
}

export interface StallEmployee {
  id: string;
  name: string;
  role: 'manager' | 'seller' | 'helper';
  phone: string;
  isRegistered: boolean;
}

export interface StallMessage {
  id: string;
  direction: 'inbound' | 'outbound';
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
  marketId: string;
  number: string;
  zone: string;
  price: number;
  status: StallStatus;
  occupantName?: string;
  occupantPhone?: string;
  occupantId?: string;
  lastPaymentDate?: number;
  size: 'S' | 'M' | 'L';
  surfaceArea: number;
  productType: ProductType;
  isPriority?: boolean;
  complianceScore: number;
  healthStatus: StallHealth;
  documents: StallDocument[];
  employees: StallEmployee[];
  activityLog: StallActivity[];
  messages: StallMessage[];
  coordinates?: { lat: number, lng: number };
}

export interface HygieneReport {
  id: string;
  marketId: string;
  category: 'waste' | 'water' | 'pest' | 'infrastructure';
  description: string;
  timestamp: number;
  status: 'pending' | 'resolved';
  location: string;
  isAnonymous: boolean;
  hasAudio?: boolean;
}

export type PaymentProvider = 'orange' | 'momo' | 'airtel' | 'cash' | 'system';

export interface Transaction {
  id: string;
  marketId: string;
  amount: number;
  date: number;
  type: 'rent' | 'fine' | 'tax' | 'logistics_sub' | 'deposit'; // Includes 'deposit' for agent cash drops
  provider: PaymentProvider;
  stallNumber?: string;
  stallId?: string;
  reference: string;
  status: 'pending' | 'completed';
  collectedBy?: string;
}

export interface Product {
  id: string;
  stallId: string;
  name: string;
  price: number;
  promoPrice?: number;
  isPromo?: boolean;
  costPrice?: number;
  isVisible?: boolean;
  unit: string;
  imageUrl?: string;
  additionalImages?: string[];
  inStock: boolean;
  stockQuantity: number;
  category: ProductType;
  description?: string;
  origin?: string;
  subCategory?: string;
  tags?: string[];
  wholesalePrices?: { minQuantity: number, price: number }[];
  freshnessLevel?: number;
  qualityGrade?: 'A' | 'B' | 'C';
  audioDescriptionUrl?: string;
}

export interface ClientOrder {
  id: string;
  stallId: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  items: { productId: string; name: string; quantity: number; price: number }[];
  totalAmount: number;
  status: 'pending' | 'paid' | 'preparing' | 'ready' | 'picked_up' | 'in_transit' | 'delivered';
  date: number;
  paymentProvider: 'orange' | 'airtel' | 'momo';
  paymentRef: string;
  deliveryMode: 'pickup' | 'delivery';
  deliveryAddress?: string;
  deliveryFee?: number;
  assignedAgentId?: string;
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
  userId?: string;
  name: string;
  phone: string;
  stallId?: string;
  photoUrl?: string;
  bannerUrl?: string;
  bio?: string;
  hygieneScore: number;
  isVulnerable?: boolean;
  language: Language;
  isLogisticsSubscribed: boolean;
  subscriptionExpiry?: number;
  subscriptionPlan?: 'standard' | 'premium';
  subscriptionHistory?: SubscriptionHistory[];
}

export const PREDEFINED_INFRACTIONS = [
  { id: 'HYG_01', label: 'Défaut d\'hygiène (Déchets)', amount: 5000 },
  { id: 'HYG_02', label: 'Eaux usées sur voie publique', amount: 10000 },
  { id: 'OCC_01', label: 'Débordement étal (Ligne jaune)', amount: 15000 },
  { id: 'OCC_02', label: 'Obstruction allée sécurité', amount: 25000 },
  { id: 'ADM_01', label: 'Absence de badge vendeur', amount: 2000 },
  { id: 'ADM_02', label: 'Défaut carnet de santé', amount: 5000 },
  { id: 'DIV_99', label: 'Autre (Saisie Manuelle)', amount: 0 }
];

export interface VendorDashboardProps {
  profile: VendorProfile;
  transactions: Transaction[];
  receipts: Receipt[];
  myStall?: Stall;
  stalls?: Stall[];
  myReports: HygieneReport[];
  sanctions: Sanction[];
  paymentPlan?: PaymentPlan;
  products: Product[];
  orders: ClientOrder[];
  notifications: AppNotification[];
  onAddProduct: (product: Omit<Product, 'id'>) => Promise<any>;
  onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: string) => void;
  onUpdateOrderStatus: (orderId: string, status: ClientOrder['status']) => void;
  onContestSanction?: (sanctionId: string, reason: string) => void;
  onUpdateProfile?: (updates: Partial<VendorProfile>) => void;
  onToggleLogistics?: (subscribed: boolean) => Promise<any>;
  onReserve?: (stallId: string, provider: PaymentProvider, isPriority: boolean) => void;
}
