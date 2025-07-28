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
  
  // Délai réduit car l'approche incrémentale est plus robuste
  await new Promise(resolve => setTimeout(resolve, 300));
  
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
  try {
    app.init();
    console.log('🎪 Application VV Place lancée avec succès');
  } catch (error) {
    console.error('❌ Erreur lors du lancement de l\'application:', error);
    console.log('🔄 Application lancée en mode dégradé');
  }
});
