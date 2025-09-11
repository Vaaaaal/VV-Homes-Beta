// ==========================================
// GESTIONNAIRE D'ORIENTATION CENTRALISÉ
// ==========================================
import logger from './logger.js';
import { PerformanceOptimizer } from './performance-optimizations.js';

/**
 * OrientationManager - Coordonne les changements d'orientation pour éviter les conflits
 * Gère un seul event listener avec debounce adaptatif
 * Coordonne tous les gestionnaires pour éviter les boucles infinies
 * OPTIMISÉ: Utilise throttling + debounce hybride pour de meilleures performances
 */

/**
 * OrientationManager - Coordonne les changements d'orientation pour éviter les conflits
 * Gère un seul event listener avec debounce adaptatif
 * Coordonne tous les gestionnaires pour éviter les boucles infinies
 */
export class OrientationManager {
  constructor() {
    this.subscribers = new Map(); // Gestionnaires qui s'abonnent aux changements
    this.currentOrientation = this.detectOrientation();
    this.isProcessing = false; // Évite les boucles infinies
    this.debounceTimer = null;
    
    // NOUVEAU : Debounce adaptatif intelligent
    this.DEBOUNCE_DELAYS = {
      mobile: 400,        // Plus long sur mobile (changements d'orientation physiques)
      desktop: 150,       // Plus court sur desktop (resize de fenêtre)
      rapid: 600          // Encore plus long si changements rapides détectés
    };
    
    // NOUVEAU : Compteur de changements rapides pour debounce dynamique
    this.recentChanges = [];
    this.lastChangeTime = 0;
    this.MAX_CHANGES_PER_SECOND = 3; // Seuil pour considérer comme "rapide"
  }

  /**
   * Initialise le gestionnaire d'orientation
   */
  init() {
    this.setupOrientationListener();
    logger.orientation(' OrientationManager initialisé');
  }

  /**
   * Détecte l'orientation actuelle
   * @returns {string} "horizontal" ou "vertical"
   */
  detectOrientation() {
    const isDesktop = window.WindowUtils ? 
      window.WindowUtils.isDesktop() : 
      window.innerWidth >= 992;
    
    return isDesktop ? "horizontal" : "vertical";
  }

  /**
   * Abonne un gestionnaire aux changements d'orientation
   * @param {string} name - Nom du gestionnaire
   * @param {Function} callback - Fonction à appeler lors du changement
   * @param {number} priority - Priorité d'exécution (0 = premier)
   */
  subscribe(name, callback, priority = 10) {
    this.subscribers.set(name, {
      callback,
      priority,
      lastExecution: 0
    });
    
    // Trier par priorité
    this.subscribers = new Map([...this.subscribers.entries()]
      .sort((a, b) => a[1].priority - b[1].priority));
    
    logger.log(`📡 ${name} abonné aux changements d'orientation (priorité: ${priority})`);
  }

  /**
   * Désabonne un gestionnaire
   * @param {string} name - Nom du gestionnaire
   */
  unsubscribe(name) {
    this.subscribers.delete(name);
    logger.log(`📡 ${name} désabonné des changements d'orientation`);
  }

  /**
   * Configure l'écoute des changements avec debounce adaptatif intelligent
   */
  setupOrientationListener() {
    const handleChange = () => {
      if (this.isProcessing) {
        logger.info(' Changement d\'orientation ignoré (traitement en cours)');
        return;
      }

      // NOUVEAU : Détection intelligente des changements rapides
      const now = Date.now();
      
      // Nettoie les anciens changements (garde seulement la dernière seconde)
      this.recentChanges = this.recentChanges.filter(time => now - time < 1000);
      
      // Ajoute le changement actuel
      this.recentChanges.push(now);
      
      // Détermine le délai selon le contexte ET la fréquence
      const isMobile = window.innerWidth < 992;
      const isRapidChanges = this.recentChanges.length > this.MAX_CHANGES_PER_SECOND;
      const timeSinceLastChange = now - this.lastChangeTime;
      
      let delay;
      if (isRapidChanges) {
        delay = this.DEBOUNCE_DELAYS.rapid;
        logger.emergency(' Changements rapides détectés (${this.recentChanges.length}/s) - Debounce ${delay}ms');
      } else if (timeSinceLastChange < 200) {
        // Si le changement précédent était très récent, utilise un délai plus long
        delay = this.DEBOUNCE_DELAYS.rapid;
        logger.warn(`⚡ Changement très rapide (${timeSinceLastChange}ms) - Debounce ${delay}ms`);
      } else {
        delay = this.DEBOUNCE_DELAYS[isMobile ? 'mobile' : 'desktop'];
      }
      
      this.lastChangeTime = now;
      
      // Efface le timer précédent
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      // Programme le traitement avec le délai approprié
      logger.log(`⏱️ Debounce orientation: ${delay}ms (${isRapidChanges ? 'rapide' : isMobile ? 'mobile' : 'desktop'})`);
      this.debounceTimer = setTimeout(() => {
        this.processOrientationChange();
      }, delay);
    };

    // Utilise différents événements selon la disponibilité
    if (window.WindowUtils) {
      this.removeListener = window.WindowUtils.onBreakpointChange(handleChange);
    } else {
      window.addEventListener('resize', handleChange);
      window.addEventListener('orientationchange', handleChange);
      
      this.removeListener = () => {
        window.removeEventListener('resize', handleChange);
        window.removeEventListener('orientationchange', handleChange);
      };
    }
  }

  /**
   * Traite un changement d'orientation de manière coordonnée
   */
  async processOrientationChange() {
    const newOrientation = this.detectOrientation();
    
    // Vérifie s'il y a vraiment un changement
    if (newOrientation === this.currentOrientation) {
      return;
    }

    logger.orientation(`Changement d'orientation détecté: ${this.currentOrientation} → ${newOrientation}`);
    
    // Marque comme en cours de traitement
    this.isProcessing = true;
    this.currentOrientation = newOrientation;

    try {
      // Notifie tous les abonnés dans l'ordre de priorité
      await this.notifySubscribers(newOrientation);

      // Rafraîchissement final coordonné
      logger.info(' Rafraîchissement final des ScrollTriggers...');
      if (window.ScrollTrigger) {
        ScrollTrigger.refresh();
      }

    } finally {
      // Libère le verrou après un délai de sécurité
      setTimeout(() => {
        this.isProcessing = false;
        logger.log('🔓 Traitement d\'orientation terminé');
      }, 100);
    }
  }

  /**
   * Notifie tous les subscribers
   */
  async notifySubscribers(newOrientation, context = {}) {
    for (const [name, subscriber] of this.subscribers) {
      try {
        logger.log(`📡 Notification ${name}...`);
        const startTime = performance.now();
        
        await subscriber.callback(newOrientation, {
          fromOrientation: newOrientation === "horizontal" ? "vertical" : "horizontal",
          timestamp: Date.now(),
          windowDimensions: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          ...context
        });
        
        const duration = performance.now() - startTime;
        subscriber.lastExecution = duration;
        logger.success(' ${name} traité en ${duration.toFixed(2)}ms');
        
        // Pause entre les gestionnaires pour éviter la surcharge
        if (duration > 100) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
      } catch (error) {
        logger.error(' Erreur lors de la notification ${name}:', error);
      }
    }
  }

  /**
   * Force un rafraîchissement de tous les gestionnaires
   */
  forceRefresh() {
    logger.info(' Rafraîchissement forcé de l\'orientation');
    this.processOrientationChange();
  }

  /**
   * Retourne l'orientation actuelle
   * @returns {string}
   */
  getCurrentOrientation() {
    return this.currentOrientation;
  }

  /**
   * Retourne les statistiques des gestionnaires
   * @returns {Object}
   */
  getStats() {
    const stats = {};
    for (const [name, subscriber] of this.subscribers) {
      stats[name] = {
        priority: subscriber.priority,
        lastExecution: subscriber.lastExecution
      };
    }
    return stats;
  }

  /**
   * Nettoie le gestionnaire
   */
  destroy() {
    if (this.removeListener) {
      this.removeListener();
    }
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.subscribers.clear();
    this.isProcessing = false;
    
    logger.orientation(' OrientationManager détruit');
  }
}
