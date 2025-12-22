
import { Stall } from '../types';
import toast from 'react-hot-toast';

/**
 * MOTEUR DE TORTURE LOGICIELLE
 */

export const simulateMassiveLoad = async (count: number): Promise<void> => {
    // Simule une saturation de mémoire UI pour tester le Virtual Scrolling (futur) ou la réactivité
    return new Promise((resolve) => {
        setTimeout(() => {
            console.warn(`[STRESS] Injecting ${count} items into memory.`);
            // Note: En démo réelle, cela peuplerait un état global éphémère
            resolve();
        }, 1000);
    });
};

export const poisonLocalData = () => {
    // Tente de corrompre les calculs de dette en injectant des valeurs absurdes
    try {
        const fakeCorruptedStall = {
            id: 'CORRUPT_01',
            price: -9999999, // Prix négatif (Faille logique)
            lastPaymentDate: Date.now() + (1000 * 60 * 60 * 24 * 365 * 10) // Date dans le futur (10 ans)
        };
        
        // Simulation de détection par le Guardian (dans coreUtils)
        console.error("SHIELD DETECTED INVALID STATE:", fakeCorruptedStall);
    } catch (e) {
        console.error("Shield failure");
    }
};

export const wipeAndRecover = async () => {
    // Simule une purge et une reconstruction
    const backup = localStorage.getItem('mc_action_queue');
    localStorage.clear();
    await new Promise(r => setTimeout(r, 1500));
    if(backup) localStorage.setItem('mc_action_queue', backup);
};
