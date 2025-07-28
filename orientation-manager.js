// ==========================================
// GESTIONNAIRE CENTRALISÉ D'ORIENTATION
// ==========================================

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
    
    // Configuration du debounce adaptatif
    this.DEBOUNCE_DELAYS = {
      mobile: 500,    // Plus long sur mobile (changement d'orientation)
      desktop: 250    // Plus court sur desktop (resize normal)
    };
  }

  /**
   * Initialise le gestionnaire d'orientation
   */
  init() {
    this.setupOrientationListener();
    console.log('🧭 OrientationManager initialisé');
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
    
    console.log(`📡 ${name} abonné aux changements d'orientation (priorité: ${priority})`);
  }

  /**
   * Désabonne un gestionnaire
   * @param {string} name - Nom du gestionnaire
   */
  unsubscribe(name) {
    this.subscribers.delete(name);
    console.log(`📡 ${name} désabonné des changements d'orientation`);
  }

  /**
   * Configure l'écoute des changements avec debounce adaptatif
   */
  setupOrientationListener() {
    const handleChange = () => {
      if (this.isProcessing) {
        console.log('🔄 Changement d\'orientation ignoré (traitement en cours)');
        return;
      }

      // Détermine le délai selon le contexte
      const isMobile = window.innerWidth < 992;
      const delay = this.DEBOUNCE_DELAYS[isMobile ? 'mobile' : 'desktop'];
      
      // Efface le timer précédent
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      // Programme le traitement avec le délai approprié
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

    console.log(`🧭 Changement d'orientation détecté: ${this.currentOrientation} → ${newOrientation}`);
    
    // Marque comme en cours de traitement
    this.isProcessing = true;
    this.currentOrientation = newOrientation;

    try {
      // Notifie tous les abonnés dans l'ordre de priorité
      for (const [name, subscriber] of this.subscribers) {
        try {
          console.log(`📡 Notification ${name}...`);
          const startTime = performance.now();
          
          await subscriber.callback(newOrientation, {
            fromOrientation: newOrientation === "horizontal" ? "vertical" : "horizontal",
            timestamp: Date.now(),
            windowDimensions: {
              width: window.innerWidth,
              height: window.innerHeight
            }
          });
          
          const duration = performance.now() - startTime;
          subscriber.lastExecution = duration;
          console.log(`✅ ${name} traité en ${duration.toFixed(2)}ms`);
          
          // Pause entre les gestionnaires pour éviter la surcharge
          if (duration > 100) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          
        } catch (error) {
          console.error(`❌ Erreur lors de la notification ${name}:`, error);
        }
      }

      // Rafraîchissement final coordonné
      console.log('🔄 Rafraîchissement final des ScrollTriggers...');
      if (window.ScrollTrigger) {
        ScrollTrigger.refresh();
      }

    } finally {
      // Libère le verrou après un délai de sécurité
      setTimeout(() => {
        this.isProcessing = false;
        console.log('🔓 Traitement d\'orientation terminé');
      }, 100);
    }
  }

  /**
   * Force un rafraîchissement de tous les gestionnaires
   */
  forceRefresh() {
    console.log('🔄 Rafraîchissement forcé de l\'orientation');
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
    
    console.log('🧭 OrientationManager détruit');
  }
}
