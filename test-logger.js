// ==========================================
// TEST DU SYSTÈME DE LOGGING
// ==========================================

import logger from './logger.js';

/**
 * Teste le système de logging en mode développement et production
 */
function testLogger() {
  console.log('🧪 TEST DU SYSTÈME DE LOGGING');
  console.log('================================');
  
  // Afficher l'état actuel
  console.log('État actuel:', logger.getStatus());
  
  console.log('\n📝 Test en mode DÉVELOPPEMENT:');
  logger.setProductionMode(false);
  
  // Tous ces logs doivent être visibles
  logger.log('Test log normal');
  logger.info('Test info');
  logger.debug('Test debug');
  logger.success('Test success');
  logger.loading('Test loading');
  logger.orientation('Test orientation');
  logger.menu('Test menu');
  logger.scroll('Test scroll');
  logger.slider('Test slider');
  logger.modal('Test modal');
  logger.animation('Test animation');
  logger.warn('Test warning');
  logger.error('Test error');
  logger.emergency('Test emergency');
  
  console.log('\n🏭 Test en mode PRODUCTION:');
  logger.setProductionMode(true);
  
  // Seuls les logs critiques doivent être visibles
  logger.log('❌ Ce log ne doit PAS être visible en production');
  logger.debug('❌ Ce debug ne doit PAS être visible en production');
  logger.success('❌ Ce success ne doit PAS être visible en production');
  
  logger.warn('✅ Ce warning DOIT être visible en production');
  logger.error('✅ Cette error DOIT être visible en production');
  logger.emergency('✅ Cette emergency DOIT être visible en production');
  
  // Restaurer le mode détecté automatiquement
  logger.setProductionMode(logger.detectProductionMode());
  
  console.log('\n✅ Test terminé !');
  console.log('Mode final:', logger.getStatus());
}

// Rendre la fonction disponible globalement pour les tests
window.testLogger = testLogger;

export { testLogger };
