// ==========================================
// POINT D'ENTRÉE DE L'APPLICATION
// ==========================================
import { VVPlaceApp } from './app.js';
import './crash-detector.js';      // Détecteur de crash automatique
import './emergency-mode.js';      // Mode d'urgence
import logger from './logger.js';

/**
 * Lance l'application une fois que le DOM est complètement chargé
 * Garantit que tous les éléments HTML sont disponibles avant l'initialisation
 */
document.addEventListener("DOMContentLoaded", async () => {
  logger.log('📄 DOM chargé - Préparation de l\'application...');
  
  // Affichage des outils d'urgence disponibles
  logger.log('🚨 Outils d\'urgence chargés:');
  logger.log('  - emergencyMode.activate() : Mode d\'urgence');
  logger.log('  - crashDetector.generateCrashReport() : Rapport de crash');
  logger.log('  - debugVV.checkCriticalIssues() : Diagnostic approfondi');
  
  // Délai réduit car l'approche incrémentale est plus robuste
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Vérifier que les dépendances essentielles sont disponibles
  if (typeof gsap === 'undefined') {
    logger.error(' GSAP n\'est pas chargé !');
    logger.error('🚨 Activation automatique du mode d\'urgence...');
    if (window.emergencyMode) {
      window.emergencyMode.activateReadOnlyMode();
    }
    return;
  }
  
  logger.loading(' Lancement de l\'application...');
  
  // Crée une nouvelle instance de l'application
  const app = new VVPlaceApp();
  
  // Expose l'app globalement pour le debugging
  window.app = app;
  
  // Lance l'initialisation complète avec gestion d'erreur robuste
  try {
    app.init();
    logger.log('🎪 Application VV Place lancée avec succès');
    
    // Surveillance automatique des crashes pendant 60 secondes
    setTimeout(() => {
      if (window.crashDetector) {
        const report = window.crashDetector.generateCrashReport();
        if (report.summary.totalCrashEvents > 0) {
          logger.warn(' Des problèmes ont été détectés. Voir le rapport ci-dessus.');
        } else {
          logger.success(' Aucun problème détecté pendant l\'initialisation');
        }
      }
    }, 60000);
    
  } catch (error) {
    logger.error(' Erreur critique lors du lancement:', error);
    logger.error('🚨 Activation automatique du mode d\'urgence...');
    
    // Activation automatique du mode d'urgence en cas d'erreur
    if (window.emergencyMode) {
      window.emergencyMode.activate().then(() => {
        logger.info(' Application lancée en mode dégradé - Fonctionnalités de base disponibles');
      });
    } else {
      logger.info(' Application lancée en mode dégradé');
    }
  }
});
