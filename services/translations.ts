
import { Language } from '../types';

export const translations = {
  fr: {
    welcome: "Bienvenue",
    reserve_stall: "Réserver un étal",
    report_issue: "Signaler un problème",
    my_account: "Mon Compte",
    payment: "Paiement",
    waste: "Déchets",
    water: "Eau",
    pest: "Nuisibles",
    infrastructure: "Infrastr.",
    send: "Envoyer",
    anonymous: "Rester anonyme",
    voice_record: "Enregistrer message vocal",
    priority_request: "Demande Prioritaire (Vulnérabilité)",
    available: "Libre",
    occupied: "Occupé"
  },
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
    voice_record: "Tate voice",
    priority_request: "Mê ne nkok", // Simplification for "I am old/weak" context
    available: "Ne fô'ô",
    occupied: "Be nga niong"
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
    voice_record: "Bika voice",
    priority_request: "Mi re nkok",
    available: "Re libre",
    occupied: "Wi nangu"
  }
};

export const t = (lang: Language, key: keyof typeof translations['fr']) => {
  return translations[lang][key] || translations['fr'][key];
};
