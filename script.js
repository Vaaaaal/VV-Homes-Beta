// ==========================================
// POINT D'ENTRÉE DE L'APPLICATION
// ==========================================
import { VVPlaceApp } from './app.js';

/**
 * Lance l'application une fois que le DOM est complètement chargé
 * Garantit que tous les éléments HTML sont disponibles avant l'initialisation
 */
document.addEventListener("DOMContentLoaded", () => {
  // Crée une nouvelle instance de l'application
  const app = new VVPlaceApp();
  
  // Lance l'initialisation complète
  app.init();
  
  // L'application est maintenant prête et fonctionnelle !
});
