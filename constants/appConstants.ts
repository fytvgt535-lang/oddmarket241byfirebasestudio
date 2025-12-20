
import { PaymentProvider, ProductType } from '../types';

// --- BANNIERES MARCHÉS (IMAGES) ---
export const MARKET_BANNERS = [
  'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=1200&auto=format&fit=crop&q=80', // Market crowd generic
  'https://images.unsplash.com/photo-1605218427368-35b868d83936?w=1200&auto=format&fit=crop&q=80', // Fruits stall outdoor
  'https://images.unsplash.com/photo-1519999482648-25049ddd37b1?w=1200&auto=format&fit=crop&q=80', // Vegetables vibrant
  'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1200&auto=format&fit=crop&q=80', // Market vegetables close up
  'https://images.unsplash.com/photo-1591187843332-93822239f8bc?w=1200&auto=format&fit=crop&q=80', // African street market
  'https://images.unsplash.com/photo-1526402458422-927a239b69b9?w=1200&auto=format&fit=crop&q=80', // Spices
  'https://images.unsplash.com/photo-1626202269376-799277026df3?w=1200&auto=format&fit=crop&q=80'  // Fabric / Textile
];

// --- CATÉGORIES PRODUITS ---
export const PRODUCT_CATEGORIES: { id: ProductType; label: string; imageBase: string; color: string }[] = [
  { id: 'vivres', label: 'Vivres Frais', imageBase: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9', color: 'bg-green-100 text-green-700 border-green-200' },
  { id: 'textile', label: 'Textile & Mode', imageBase: 'https://images.unsplash.com/photo-1520006403909-838d6b92c22e', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'electronique', label: 'Électronique', imageBase: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'divers', label: 'Divers / Artisanat', imageBase: 'https://images.unsplash.com/photo-1531297461136-82lw9b44d94l', color: 'bg-gray-100 text-gray-700 border-gray-200' }
];

// --- MODES DE PAIEMENT ---
export const PAYMENT_PROVIDERS: { id: PaymentProvider; label: string; color: string }[] = [
  { id: 'orange', label: 'Orange Money', color: 'text-orange-600 border-orange-200 bg-orange-50' },
  { id: 'airtel', label: 'Airtel Money', color: 'text-red-600 border-red-200 bg-red-50' },
  { id: 'momo', label: 'MTN MoMo', color: 'text-yellow-600 border-yellow-200 bg-yellow-50' },
  { id: 'cash', label: 'Espèces (Agent)', color: 'text-green-600 border-green-200 bg-green-50' },
  { id: 'system', label: 'Système', color: 'text-gray-600 border-gray-200 bg-gray-50' }
];

// --- INFRACTIONS & AMENDES (BUSINESS LOGIC) ---
export const INFRACTIONS_CATALOG = [
  { id: 'HYG_01', label: "Défaut d'hygiène (Déchets)", amount: 5000, severity: 'medium' },
  { id: 'HYG_02', label: "Eaux usées sur voie publique", amount: 10000, severity: 'high' },
  { id: 'OCC_01', label: "Débordement étal (Ligne jaune)", amount: 15000, severity: 'medium' },
  { id: 'OCC_02', label: "Obstruction allée sécurité", amount: 25000, severity: 'critical' },
  { id: 'ADM_01', label: "Absence de badge vendeur", amount: 2000, severity: 'low' },
  { id: 'ADM_02', label: "Défaut carnet de santé", amount: 5000, severity: 'medium' },
  { id: 'DIV_99', label: "Autre (Saisie Manuelle)", amount: 0, severity: 'low' }
];

// --- ZONES GÉOGRAPHIQUES (GEOFENCING) ---
export const MARKET_ZONES_CONFIG = {
    'm1': { lat: 0.3944, lng: 9.4536, radius: 300, name: 'Marché Mont-Bouët' },
    'm2': { lat: 0.4100, lng: 9.4600, radius: 500, name: 'Marché Akanda' },
};

// --- IMAGES PAR DÉFAUT ---
export const DEFAULT_IMAGES = {
    AVATAR: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&auto=format&fit=crop&q=60',
    STALL: 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=800&auto=format&fit=crop&q=60',
    PRODUCT_PLACEHOLDER: 'https://images.unsplash.com/photo-1574315042633-54b67dd395d1?w=400&auto=format&fit=crop&q=60'
};
