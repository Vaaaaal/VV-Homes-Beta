// ==========================================
// SYSTÈME DE LOGGING CENTRALISÉ
// ==========================================

/**
 * Logger centralisé pour gérer les messages de console
 * Permet de désactiver facilement tous les logs en production
 */
class Logger {
  constructor() {
    // Mode de production : défini via une variable d'environnement ou config
    this.isProduction = this.detectProductionMode();
    
    // Niveaux de log autorisés en production
    this.productionLevels = ['error', 'warn'];
    
    // Préfixes pour chaque type de message
    this.prefixes = {
      log: '📝',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      debug: '🔍',
      success: '✅',
      loading: '⏳',
      orientation: '🧭',
      menu: '🍔',
      scroll: '📜',
      slider: '🎚️',
      modal: '🪟',
      animation: '🎭',
      emergency: '🚨'
    };
  }

  /**
   * Détecte si on est en mode production
   */
  detectProductionMode() {
    // Vérifier les indicateurs de production
    return (
      // Variable d'environnement
      window.VV_PRODUCTION === true ||
      // URL de production
      window.location.hostname !== 'localhost' ||
      // Absence de paramètres de debug
      !window.location.search.includes('debug=1')
    );
  }

  /**
   * Méthode principale de logging
   */
  _log(level, category, message, ...args) {
    // En production, filtrer selon le niveau
    if (this.isProduction && !this.productionLevels.includes(level)) {
      return;
    }

    const prefix = this.prefixes[category] || this.prefixes[level] || '';
    const formattedMessage = prefix ? `${prefix} ${message}` : message;

    // Utiliser la méthode console appropriée
    const consolMethod = console[level] || console.log;
    consolMethod(formattedMessage, ...args);
  }

  // Méthodes de logging standard
  log(message, ...args) {
    this._log('log', 'log', message, ...args);
  }

  info(message, ...args) {
    this._log('info', 'info', message, ...args);
  }

  warn(message, ...args) {
    this._log('warn', 'warn', message, ...args);
  }

  error(message, ...args) {
    this._log('error', 'error', message, ...args);
  }

  debug(message, ...args) {
    this._log('debug', 'debug', message, ...args);
  }

  // Méthodes de logging spécialisées
  success(message, ...args) {
    this._log('log', 'success', message, ...args);
  }

  loading(message, ...args) {
    this._log('log', 'loading', message, ...args);
  }

  // Méthodes par domaine fonctionnel
  orientation(message, ...args) {
    this._log('log', 'orientation', message, ...args);
  }

  menu(message, ...args) {
    this._log('log', 'menu', message, ...args);
  }

  scroll(message, ...args) {
    this._log('log', 'scroll', message, ...args);
  }

  slider(message, ...args) {
    this._log('log', 'slider', message, ...args);
  }

  modal(message, ...args) {
    this._log('log', 'modal', message, ...args);
  }

  animation(message, ...args) {
    this._log('log', 'animation', message, ...args);
  }

  emergency(message, ...args) {
    this._log('warn', 'emergency', message, ...args);
  }

  /**
   * Active ou désactive le mode production manuellement
   */
  setProductionMode(enabled) {
    this.isProduction = enabled;
    this.info(`Mode production ${enabled ? 'activé' : 'désactivé'}`);
  }

  /**
   * Affiche l'état du logger
   */
  getStatus() {
    return {
      isProduction: this.isProduction,
      allowedLevels: this.isProduction ? this.productionLevels : 'all'
    };
  }
}

// Instance globale
const logger = new Logger();

// Rendre disponible globalement
window.logger = logger;

// Pour compatibilité, créer des raccourcis
window.log = logger.log.bind(logger);

export default logger;
