
/**
 * Utilitaires de Sécurité Frontend
 */

export const PASSWORD_REQUIREMENTS = {
    minLength: 8,
    hasUpperCase: /[A-Z]/,
    hasLowerCase: /[a-z]/,
    hasNumber: /[0-9]/,
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/
};

export const checkPasswordStrength = (password: string) => {
    const checks = [
        { pass: password.length >= PASSWORD_REQUIREMENTS.minLength, label: "8 caractères min" },
        { pass: PASSWORD_REQUIREMENTS.hasUpperCase.test(password), label: "1 Majuscule" },
        { pass: PASSWORD_REQUIREMENTS.hasNumber.test(password), label: "1 Chiffre" },
        { pass: PASSWORD_REQUIREMENTS.hasSpecialChar.test(password), label: "1 Caractère spécial" }
    ];

    const passedCount = checks.filter(c => c.pass).length;
    
    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    if (passedCount === 4) strength = 'strong';
    else if (passedCount >= 2) strength = 'medium';

    return { strength, checks, isValid: passedCount === 4 };
};

export const sanitizeInput = (input: string): string => {
    // Basic XSS prevention for manual inputs
    return input.replace(/[<>]/g, '');
};

/**
 * Nettoyage profond des données locales lors de la déconnexion
 * pour éviter les fuites sur ordinateurs partagés.
 */
export const clearSensitiveLocalData = () => {
    // On garde 'marchconnect_saved_email' si "Se souvenir de moi" était coché, 
    // mais on vide tout cache métier sensible.
    const keysToRemove = [
        'mc_shopper_inventory', 
        'mc_shopper_vendors', 
        'sb-access-token', 
        'sb-refresh-token',
        'mc_action_queue', // Attention: perte de données offline non sync
        'mc_failed_queue'
    ];
    
    // Nettoyage intelligent
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Nettoyage Supabase par défaut
    for (const key in localStorage) {
        if (key.startsWith('sb-')) {
            localStorage.removeItem(key);
        }
    }
};
