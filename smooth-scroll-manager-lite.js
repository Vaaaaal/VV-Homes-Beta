// ==========================================
// GESTIONNAIRE DE SCROLL SIMPLIFIÉ (MOBILE LITE)
// ==========================================
import logger from './logger.js';

/**
 * Version simplifiée du SmoothScrollManager pour mobile < 768px
 * Utilise le scroll natif du navigateur au lieu de Lenis
 * Pas d'animations complexes de scroll
 */
export class SmoothScrollManagerLite {
  constructor() {
    this.isInitialized = false;
    this.scrollListeners = new Set();
    
    this.init();
  }

  /**
   * Initialise le gestionnaire de scroll simplifié
   */
  init() {
    if (this.isInitialized) return;
    
    logger.scroll(' SmoothScrollManagerLite - Initialisation (mode mobile)...');
    
    // Force le reset de scroll au démarrage
    this.forceScrollReset();
    
    // Setup des écouteurs basiques si nécessaire
    this.setupBasicScrollHandling();
    
    this.isInitialized = true;
    logger.success(' SmoothScrollManagerLite initialisé');
  }

  /**
   * Configuration basique du scroll natif
   */
  setupBasicScrollHandling() {
    // Améliorer le scroll tactile sur iOS
    document.body.style.webkitOverflowScrolling = 'touch';
    
    // S'assurer que le scroll fonctionne correctement
    document.documentElement.style.scrollBehavior = 'smooth';
  }

  /**
   * Force le reset de la position de scroll
   */
  forceScrollReset() {
    // Utilise WindowUtils si disponible
    if (window.WindowUtils && window.WindowUtils.resetScroll) {
      window.WindowUtils.resetScroll();
    } else {
      // Fallback simple
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
    
    logger.debug('🔄 SmoothScrollManagerLite: Reset de scroll');
  }

  /**
   * Méthode pour scroller vers un élément (compatibilité)
   * @param {string|Element} target - Sélecteur ou élément
   * @param {Object} options - Options de scroll
   */
  scrollTo(target, options = {}) {
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    
    if (!element) {
      logger.warn(' Élément de scroll non trouvé:', target);
      return;
    }

    const { offset = 0, duration = 'auto' } = options;
    
    // Utilise le scroll natif
    const targetPosition = element.offsetTop + offset;
    
    if (duration === 'auto' || !duration) {
      // Scroll instantané
      window.scrollTo(0, targetPosition);
    } else {
      // Scroll animé avec behavior smooth
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    }
  }

  /**
   * Ajouter un écouteur de scroll
   * @param {Function} callback - Fonction à exécuter
   * @param {Object} options - Options d'écoute
   */
  addScrollListener(callback, options = {}) {
    const { passive = true } = options;
    
    window.addEventListener('scroll', callback, { passive });
    this.scrollListeners.add(callback);
    
    return () => {
      window.removeEventListener('scroll', callback);
      this.scrollListeners.delete(callback);
    };
  }

  /**
   * Obtenir la position de scroll actuelle
   * @returns {number} Position Y du scroll
   */
  getScrollY() {
    return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }

  /**
   * Obtenir la hauteur totale scrollable
   * @returns {number} Hauteur totale
   */
  getScrollHeight() {
    return Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );
  }

  /**
   * Méthode start() pour compatibilité avec Lenis
   */
  start() {
    // Pas besoin d'action spéciale en mode natif
    logger.debug(' SmoothScrollManagerLite: start() appelé');
  }

  /**
   * Méthode stop() pour compatibilité avec Lenis
   */
  stop() {
    // Pas besoin d'action spéciale en mode natif
    logger.debug(' SmoothScrollManagerLite: stop() appelé');
  }

  /**
   * Désactive le scroll (pour compatibilité avec MenuManager)
   */
  disableScroll() {
    // Sauvegarder la position actuelle
    this.savedScrollPosition = this.getScrollY();
    
    // Bloquer le scroll avec CSS
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${this.savedScrollPosition}px`;
    document.body.style.width = '100%';
    
    logger.debug(' SmoothScrollManagerLite: Scroll désactivé');
  }

  /**
   * Réactive le scroll (pour compatibilité avec MenuManager)
   */
  enableScroll() {
    // Restaurer les styles
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    
    // Restaurer la position de scroll
    if (typeof this.savedScrollPosition === 'number') {
      window.scrollTo(0, this.savedScrollPosition);
      this.savedScrollPosition = null;
    }
    
    logger.debug(' SmoothScrollManagerLite: Scroll réactivé');
  }

  /**
   * Détruit le gestionnaire
   */
  destroy() {
    // Réactiver le scroll si il était désactivé
    this.enableScroll();
    
    // Nettoyer les écouteurs
    this.scrollListeners.forEach(callback => {
      window.removeEventListener('scroll', callback);
    });
    this.scrollListeners.clear();
    
    // Réinitialiser les styles
    document.body.style.webkitOverflowScrolling = '';
    document.documentElement.style.scrollBehavior = '';
    
    this.isInitialized = false;
    logger.debug(' SmoothScrollManagerLite détruit');
  }

  /**
   * Getter pour compatibilité avec le code existant
   * Retourne une interface similaire à Lenis
   */
  get lenis() {
    return {
      scrollTo: (target, options) => this.scrollTo(target, options),
      start: () => this.start(),
      stop: () => this.stop(),
      destroy: () => this.destroy()
    };
  }
}
