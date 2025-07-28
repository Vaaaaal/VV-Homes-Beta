// ==========================================
// POINT D'ENTRÉE DE L'APPLICATION
// ==========================================
import { VVPlaceApp } from './app.js';

/**
 * Lance l'application une fois que le DOM est complètement chargé
 * Garantit que tous les éléments HTML sont disponibles avant l'initialisation
 */
document.addEventListener("DOMContentLoaded", async () => {
  console.log('📄 DOM chargé - Préparation de l\'application...');
  
  // Attendre un court délai pour que Webflow et Finsweet aient le temps de s'initialiser
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Vérifier que les dépendances essentielles sont disponibles
  if (typeof gsap === 'undefined') {
    console.error('❌ GSAP n\'est pas chargé !');
    return;
  }
  
  console.log('🚀 Lancement de l\'application...');
  
  // Crée une nouvelle instance de l'application
  const app = new VVPlaceApp();
  
  // Expose l'app globalement pour le debugging
  window.app = app;
  
  // Lance l'initialisation complète
  app.init();
  
  // L'application est maintenant prête et fonctionnelle !
  console.log('🎪 Application VV Place lancée');
});
