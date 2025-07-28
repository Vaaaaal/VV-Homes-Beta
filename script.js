// ==========================================
// POINT D'ENTRÉE DE L'APPLICATION
// ==========================================
import { VVPlaceApp } from './app.js';
import './crash-detector.js';      // Détecteur de crash automatique
import './emergency-mode.js';      // Mode d'urgence
import './orientation-tester.js';  // Testeur d'orientation

/**
 * Lance l'application une fois que le DOM est complètement chargé
 * Garantit que tous les éléments HTML sont disponibles avant l'initialisation
 */
document.addEventListener("DOMContentLoaded", async () => {
  console.log('📄 DOM chargé - Préparation de l\'application...');
  
  // Affichage des outils d'urgence disponibles
  console.log('🚨 Outils d\'urgence chargés:');
  console.log('  - emergencyMode.activate() : Mode d\'urgence');
  console.log('  - crashDetector.generateCrashReport() : Rapport de crash');
  console.log('  - orientationTester.runOrientationStressTest() : Test d\'orientation');
  console.log('  - debugVV.checkCriticalIssues() : Diagnostic approfondi');
  
  // Délai réduit car l'approche incrémentale est plus robuste
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Vérifier que les dépendances essentielles sont disponibles
  if (typeof gsap === 'undefined') {
    console.error('❌ GSAP n\'est pas chargé !');
    console.error('🚨 Activation automatique du mode d\'urgence...');
    if (window.emergencyMode) {
      window.emergencyMode.activateReadOnlyMode();
    }
    return;
  }
  
  console.log('🚀 Lancement de l\'application...');
  
  // Crée une nouvelle instance de l'application
  const app = new VVPlaceApp();
  
  // Expose l'app globalement pour le debugging
  window.app = app;
  
  // Lance l'initialisation complète avec gestion d'erreur robuste
  try {
    app.init();
    console.log('🎪 Application VV Place lancée avec succès');
    
    // Surveillance automatique des crashes pendant 60 secondes
    setTimeout(() => {
      if (window.crashDetector) {
        const report = window.crashDetector.generateCrashReport();
        if (report.summary.totalCrashEvents > 0) {
          console.warn('⚠️ Des problèmes ont été détectés. Voir le rapport ci-dessus.');
        } else {
          console.log('✅ Aucun problème détecté pendant l\'initialisation');
        }
      }
    }, 60000);
    
  } catch (error) {
    console.error('❌ Erreur critique lors du lancement:', error);
    console.error('🚨 Activation automatique du mode d\'urgence...');
    
    // Activation automatique du mode d'urgence en cas d'erreur
    if (window.emergencyMode) {
      window.emergencyMode.activate().then(() => {
        console.log('🔄 Application lancée en mode dégradé - Fonctionnalités de base disponibles');
      });
    } else {
      console.log('🔄 Application lancée en mode dégradé');
    }
  }
});
