import logger from './logger.js';
// ==========================================
// CONFIGURATION DE PRODUCTION
// ==========================================

/**
 * Configuration pour la production
 * À inclure dans script.js ou index.html
 */

// Activer le mode production pour désactiver la plupart des logs
window.VV_PRODUCTION = true;

// Ou utiliser l'API du logger pour plus de contrôle
// window.addEventListener('DOMContentLoaded', () => {
//   if (window.logger) {
//     window.logger.setProductionMode(true);
//   }
// });

logger.log('🏭 Mode production activé - Logs limités aux erreurs et avertissements');
