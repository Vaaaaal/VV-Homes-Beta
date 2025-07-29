import logger from './logger.js';
// ==========================================
// SCRIPT DE TEST POUR LES CHANGEMENTS D'ORIENTATION
// ==========================================

/**
 * Ce script teste la robustesse du système lors des changements d'orientation
 * Simule des changements répétés pour détecter les problèmes
 */

class OrientationTester {
  constructor() {
    this.testRunning = false;
    this.changeCount = 0;
    this.errors = [];
    this.startTime = null;
  }

  /**
   * Lance une série de tests de changement d'orientation
   */
  async runOrientationStressTest() {
    if (this.testRunning) {
      logger.log('⚠️ Test déjà en cours');
      return;
    }

    console.group('🧪 TEST DE ROBUSTESSE D\'ORIENTATION');
    logger.loading(' Début du test de stress...');
    
    this.testRunning = true;
    this.changeCount = 0;
    this.errors = [];
    this.startTime = performance.now();

    try {
      // Surveiller les erreurs pendant le test
      this.setupErrorTracking();

      // Test 1: Changements rapides
      await this.testRapidChanges();
      
      // Test 2: Changements avec délai
      await this.testDelayedChanges();
      
      // Test 3: Test de résistance
      await this.testResistance();

      this.generateReport();
      
    } catch (error) {
      logger.error(' Erreur critique pendant le test:', error);
      this.errors.push({
        type: 'critical',
        message: error.message,
        timestamp: performance.now() - this.startTime
      });
    } finally {
      this.testRunning = false;
      console.groupEnd();
    }
  }

  /**
   * Configure la surveillance des erreurs
   */
  setupErrorTracking() {
    // Surveiller les erreurs dans la console
    const originalError = console.error;
    console.error = (...args) => {
      this.errors.push({
        type: 'console_error',
        message: args.join(' '),
        timestamp: performance.now() - this.startTime
      });
      originalError.apply(console, args);
    };

    // Restaurer après 30 secondes
    setTimeout(() => {
      console.error = originalError;
    }, 30000);
  }

  /**
   * Test de changements rapides d'orientation
   */
  async testRapidChanges() {
    logger.log('⚡ Test 1: Changements rapides (5 changements en 2 secondes)');
    
    for (let i = 0; i < 5; i++) {
      this.simulateOrientationChange();
      this.changeCount++;
      await this.wait(400); // 400ms entre chaque changement
    }
    
    await this.wait(1000); // Attendre la stabilisation
    logger.success(' Test 1 terminé');
  }

  /**
   * Test de changements avec délai normal
   */
  async testDelayedChanges() {
    logger.log('🕐 Test 2: Changements normaux (3 changements avec 2s de délai)');
    
    for (let i = 0; i < 3; i++) {
      this.simulateOrientationChange();
      this.changeCount++;
      await this.wait(2000); // 2 secondes entre chaque changement
    }
    
    logger.success(' Test 2 terminé');
  }

  /**
   * Test de résistance avec de nombreux changements
   */
  async testResistance() {
    logger.log('💪 Test 3: Test de résistance (10 changements aléatoires)');
    
    for (let i = 0; i < 10; i++) {
      this.simulateOrientationChange();
      this.changeCount++;
      
      // Délai aléatoire entre 100ms et 1000ms
      const randomDelay = Math.random() * 900 + 100;
      await this.wait(randomDelay);
    }
    
    await this.wait(2000); // Stabilisation finale
    logger.success(' Test 3 terminé');
  }

  /**
   * Simule un changement d'orientation
   */
  simulateOrientationChange() {
    logger.info(' Simulation changement #${this.changeCount + 1}');
    
    if (window.orientationManager) {
      // Force un rafraîchissement du gestionnaire centralisé
      window.orientationManager.forceRefresh();
    } else {
      // Fallback : déclencher un événement resize
      window.dispatchEvent(new Event('resize'));
    }
  }

  /**
   * Génère un rapport de test
   */
  generateReport() {
    const totalTime = performance.now() - this.startTime;
    
    console.group('📊 RAPPORT DE TEST');
    logger.log(`⏱️ Durée totale: ${(totalTime / 1000).toFixed(2)}s`);
    logger.info(' Changements simulés: ${this.changeCount}');
    logger.log(`❌ Erreurs détectées: ${this.errors.length}`);
    
    if (this.errors.length > 0) {
      console.group('🚨 Détail des erreurs');
      this.errors.forEach((error, index) => {
        logger.log(`${index + 1}. [${(error.timestamp / 1000).toFixed(2)}s] ${error.type}: ${error.message}`);
      });
      console.groupEnd();
    }
    
    // Vérifier l'état du gestionnaire d'orientation
    if (window.orientationManager) {
      logger.log('📡 État du gestionnaire:', window.orientationManager.getStats());
    }
    
    // Verdict final
    if (this.errors.length === 0) {
      logger.success(' SUCCÈS: Aucune erreur détectée !');
    } else if (this.errors.length < 3) {
      logger.log('⚠️ ATTENTION: Quelques erreurs détectées, à surveiller');
    } else {
      logger.log('❌ ÉCHEC: Trop d\'erreurs, des améliorations sont nécessaires');
    }
    
    console.groupEnd();
  }

  /**
   * Utilitaire d'attente
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Lance un test simple de changement d'orientation
   */
  testSingleChange() {
    logger.info(' Test simple de changement d\'orientation');
    this.simulateOrientationChange();
  }

  /**
   * Vérifie l'état actuel du système
   */
  checkSystemStatus() {
    console.group('🔍 ÉTAT DU SYSTÈME');
    
    logger.log('OrientationManager:', {
      available: !!window.orientationManager,
      orientation: window.orientationManager?.getCurrentOrientation(),
      subscribers: window.orientationManager?.getStats()
    });
    
    logger.log('App instance:', {
      available: !!window.app,
      managers: window.app ? {
        smoothScroll: !!window.app.smoothScrollManager,
        slider: !!window.app.sliderManager,
        menu: !!window.app.menuManager,
        modal: !!window.app.modalManager
      } : null
    });
    
    logger.log('Window dimensions:', {
      width: window.innerWidth,
      height: window.innerHeight,
      orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
    });
    
    console.groupEnd();
  }
}

// Rendre disponible globalement
window.OrientationTester = OrientationTester;
window.orientationTester = new OrientationTester();

// Instructions pour l'utilisateur
logger.log('🧪 OrientationTester chargé !');
logger.log('📋 Commandes disponibles:');
logger.log('  - orientationTester.runOrientationStressTest() : Lance le test complet');
logger.log('  - orientationTester.testSingleChange() : Test simple');
logger.log('  - orientationTester.checkSystemStatus() : Vérifie l\'état du système');
