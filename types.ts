
export type StallStatus = 'free' | 'occupied' | 'reserved';
export type ProductType = 'vivres' | 'textile' | 'electronique' | 'divers' | string;
export type Language = 'fr' | 'en' | 'fang' | 'mpongwe';
export type AppRole = 'vendor' | 'agent' | 'admin' | 'mediator' | 'client';
export type PaymentProvider = 'orange' | 'airtel' | 'momo' | 'cash' | 'system';
export type IdentityType = 'cni' | 'passport' | 'carte_sejour';

export interface User {
    id: string;
    email: string;
    name: string;
    role: AppRole;
    phone?: string;
    photoUrl?: string;
    marketId?: string;
    isBanned?: boolean;
    biometric?: {
        isFaceEnrolled?: boolean;
        enrolledFingers?: string[];
        useBiometricLogin?: boolean;
        lastVerification?: number;
    };
    preferences?: {
        language: Language;
        notifications: { push: boolean; sms: boolean; email: boolean };
    };
    loyaltyPoints?: number;
    favorites?: string[];
    addresses?: UserAddress[];
    agentStats?: {
        isShiftActive: boolean;
        cashInHand: number;
        lat?: number;
        lng?: number;
        currentDistrict?: string;
        battery?: number;
        status?: string;
    };
}

export interface VendorProfile extends User {
    bio?: string;
    isLogisticsSubscribed?: boolean;
    hygieneScore: number;
    averageRating?: number;
    totalReviews?: number;
    subscriptionPlan: 'free' | 'standard' | 'premium';
}

export interface Market {
    id: string;
    name: string;
    city: string;
    neighborhood: string;
    image?: string;
    capacity: number;
    targetRevenue: number;
    lat: number;
    lng: number;
    description?: string;
    hasDeliveryService?: boolean;
    baseRent: number;
}

export interface Stall {
    id: string;
    marketId: string;
    number: string;
    zone: string;
    status: StallStatus;
    productType: ProductType;
    price: number;
    size: string;
    occupantId?: string;
    occupantName?: string;
    occupantPhone?: string;
    lastPaymentDate?: number;
    healthStatus: 'healthy' | 'critical';
    complianceScore: number;
    surfaceArea?: number;
    coordinates?: { lat: number; lng: number };
}

export interface Product {
    id: string;
    stallId: string;
    name: string;
    price: number;
    promoPrice?: number;
    category: string;
    stockQuantity: number;
    inStock: boolean;
    description?: string;
    imageUrl?: string;
    unit: string;
    isVisible: boolean;
    isPromo?: boolean;
    tags?: string[];
}

export interface Transaction {
    id: string;
    marketId: string;
    amount: number;
    date: number;
    type: 'rent' | 'fine' | 'tax' | 'deposit';
    provider: PaymentProvider;
    stallId?: string;
    stallNumber?: string;
    reference: string;
    status: 'pending' | 'completed' | 'cancelled';
    collectedBy?: string;
    collectedByName?: string;
    nonce?: number;
}

export interface Sanction {
    id: string;
    marketId: string;
    stallId: string;
    vendorId?: string;
    type: 'fine' | 'warning' | 'closure';
    reason: string;
    amount: number;
    date: number;
    status: 'active' | 'resolved' | 'pending_appeal' | 'accepted' | 'rejected';
    issuedBy: string;
    evidenceUrl?: string;
    appealReason?: string;
    appealDate?: number;
}

export interface HygieneReport {
    id: string;
    marketId: string;
    category: 'waste' | 'water' | 'pest' | 'infrastructure';
    description: string;
    location: string;
    timestamp: number;
    status: 'new' | 'investigating' | 'resolved';
    isAnonymous: boolean;
}

export interface Agent extends User {}

export interface Expense {
    id: string;
    marketId: string;
    category: 'maintenance' | 'cleaning' | 'security' | 'electricity' | 'staff';
    amount: number;
    description: string;
    date: number;
}

export interface PaymentPlan {
    id: string;
    stallNumber: string;
    totalDebt: number;
    installments: number;
    amountPerMonth: number;
    status: 'active' | 'defaulted' | 'pending';
    progress: number;
}

export interface Receipt {
    id: string;
    transactionId: string;
    date: number;
}

export interface AppNotification {
    id: string;
    userId: string;
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
    type: 'info' | 'warning' | 'alert';
}

export interface Mission {
    id: string;
    agentId: string;
    title: string;
    status: 'pending' | 'active' | 'completed';
}

export interface ProductCategory {
    id: string;
    label: string;
    color: string;
}

export interface AgentLog {
    id: string;
    agentId: string;
    actionType: 'payment_collected' | 'sanction_issued' | 'shift_start' | 'shift_end';
    details: string;
    timestamp: number;
    amount?: number;
}

export interface AuditLog {
    id: string;
    action: string;
    actorId: string;
    actorName?: string;
    targetId: string;
    reason?: string;
    oldValue?: any;
    newValue?: any;
    createdAt: number;
    metadata?: {
        device?: string;
        os?: string;
        ip?: string;
    };
}

export interface PredictiveInsight {
    zoneId: string;
    riskLevel: string;
    expectedRevenue: number;
    recommendation: string;
    reasoning: string;
}

export interface ShoppingItem {
    id: string;
    name: string;
    isChecked: boolean;
}

export interface UserAddress {
    id: string;
    label: string;
    details: string;
    isDefault: boolean;
}

export interface SmartListItem {
    id: string;
    originalText: string;
    cleanTerm: string;
    preferences: { bio: boolean, cheap: boolean, fresh: boolean };
    offers: ProductOffer[];
    selectedOfferId: string | null;
}

export interface ProductOffer {
    id: string;
    productId: string;
    productName: string;
    price: number;
    unit: string;
    vendor: {
        id: string;
        name: string;
        type: string;
        rating: number;
        distance: string;
    };
    attributes: {
        isBio: boolean;
        isFresh: boolean;
        isLocal: boolean;
        isPromo: boolean;
    };
    score?: number;
}

export interface SmartListHistory {
    id: string;
    name: string;
    originalText: string;
    itemCount: number;
    date: number;
    totalAtTheTime: number;
}

export interface StallMessage {
    id: string;
    stallId: string;
    text: string;
    timestamp: number;
    sender: 'admin' | 'vendor';
}

export interface FraudAlert {
    id: string;
    marketId: string;
    stallId: string;
    stallNumber: string;
    timestamp: number;
    description: string;
    status: 'new' | 'investigating' | 'resolved';
}

export interface OfflineProof {
    id: string;
    agentId: string;
    vendorId: string;
    amount: number;
    timestamp: number;
    nonce: number;
    signature: string;
    synced: boolean;
}

export interface ClientOrder {
    id: string;
    date: number;
    status: 'pending' | 'ready' | 'completed' | 'cancelled';
    stallId: string;
    customerName: string;
    customerPhone: string;
    customerId?: string;
    items: Array<{ productId: string; name: string; quantity: number; price: number }>;
    totalAmount: number;
    paymentProvider: PaymentProvider;
    paymentRef: string;
    deliveryMode: 'pickup' | 'delivery';
    rating?: number;
    reviewComment?: string;
}

export interface OrderMessage {
    id: string;
    orderId: string;
    senderId: string;
    senderRole: 'vendor' | 'client';
    text: string;
    timestamp: number;
    photoUrl?: string;
}

export interface VendorDashboardProps {
    profile: VendorProfile;
    transactions?: Transaction[];
    receipts?: Receipt[];
    myStall?: Stall;
    stalls?: Stall[];
    myReports?: HygieneReport[];
    sanctions?: Sanction[];
    products?: Product[];
    orders?: ClientOrder[];
    notifications?: AppNotification[];
    productCategories?: ProductCategory[];
    onAddProduct: (p: Omit<Product, 'id'>) => Promise<any>;
    onUpdateProduct: (id: string, p: Partial<Product>) => Promise<any>;
    onDeleteProduct: (id: string) => Promise<any>;
    onUpdateOrderStatus: (id: string, s: string) => Promise<any>;
    onUpdateProfile: (u: Partial<VendorProfile>) => Promise<any>;
    onToggleLogistics?: (active: boolean) => Promise<any>;
    onReserve?: (id: string, p: PaymentProvider, prio: boolean) => Promise<any>;
    onContestSanction?: (id: string, r: string) => Promise<any>;
    onRequestPlan?: (plan: Omit<PaymentPlan, 'id' | 'status' | 'progress'>) => Promise<void>;
}
