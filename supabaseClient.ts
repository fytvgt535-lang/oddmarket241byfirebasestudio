
import { createClient } from '@supabase/supabase-js';

// Configuration fournie (Hardcoded pour garantir la stabilité dans cet environnement)
const PROJECT_URL = 'https://uozirhzlyhrysaliryez.supabase.co';
const PROJECT_KEY = 'sb_publishable_bkO0F4yeNM2QVmG3C0a8QA_VdwOx2WV';

// Fonction utilitaire pour tenter de lire les variables d'environnement si elles existent (pour la prod),
// mais avec un repli robuste sur les valeurs hardcodées.
const getEnvValue = (key: string, fallback: string): string => {
  try {
    // Vérification sécurisée de import.meta.env
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      const val = (import.meta as any).env[key];
      if (val) return val;
    }
  } catch (e) {
    // Ignorer les erreurs d'accès
  }
  return fallback;
};

const supabaseUrl = getEnvValue('VITE_SUPABASE_URL', PROJECT_URL);
const supabaseKey = getEnvValue('VITE_SUPABASE_ANON_KEY', PROJECT_KEY);

// La configuration est maintenant toujours considérée comme valide grâce aux valeurs par défaut
export const isSupabaseConfigured = true;

export const supabase = createClient(supabaseUrl, supabaseKey);
