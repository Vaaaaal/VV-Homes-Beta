// ==========================================
// POINT D'ENTRÉE DE L'APPLICATION
// ==========================================
import { VVPlaceApp } from './app.js';
import './crash-detector.js';      // Détecteur de crash automatique
import './emergency-mode.js';      // Mode d'urgence
// import './orientation-tester.js';  // Testeur d'orientation
import logger from './logger.js';

/**
 * Lance l'application une fois que le DOM est complètement chargé
 * Garantit que tous les éléments HTML sont disponibles avant l'initialisation
 */
document.addEventListener("DOMContentLoaded", async () => {
  // Réduction des logs verbeux en production + lazy-load des outils de debug
  const isDebugMode = new URLSearchParams(location.search).get('debug') === '1';

  // Rate-limit pour les méthodes de log très fréquentes
  if (!isDebugMode && logger && typeof logger === 'object') {
    const rateLimit = (fn, interval = 200) => {
      let last = 0;
      return (...args) => {
        const now = Date.now();
        if (now - last >= interval) {
          last = now;
          try { return fn.apply(logger, args); } catch (_) {}
        }
      };
    };
    if (typeof logger.debug === 'function') logger.debug = rateLimit(logger.debug, 400);
    if (typeof logger.scroll === 'function') logger.scroll = rateLimit(logger.scroll, 400);
    if (typeof logger.loading === 'function') logger.loading = rateLimit(logger.loading, 500);
    if (typeof logger.menu === 'function') logger.menu = rateLimit(logger.menu, 300);
    if (typeof logger.slider === 'function') logger.slider = rateLimit(logger.slider, 300);
  }

  // Lazy-load des utilitaires de debug uniquement en mode debug
  if (isDebugMode) {
    try {
      const mod = await import('./debug-utils.js');
      window.debugVV = mod.DebugUtils || mod.default || mod;
    } catch (_) {}
  }

  logger.log('📄 DOM chargé - Préparation de l\'application...');
  
  // Affichage des outils d'urgence disponibles
  logger.log('🚨 Outils d\'urgence chargés:');
  logger.log('  - emergencyMode.activate() : Mode d\'urgence');
  logger.log('  - crashDetector.generateCrashReport() : Rapport de crash');
  logger.log('  - orientationTester.runOrientationStressTest() : Test d\'orientation');
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
