import logger from './logger.js';
// ==========================================
// GESTIONNAIRE DE SCROLL FLUIDE
// ==========================================
/**
 * Gère le scroll fluide avec la librairie Lenis
 * Supporte l'orientation horizontale/verticale selon le format d'écran
 * Synchronise le scroll avec les animations GSAP
 */
export class SmoothScrollManager {
  constructor(options = {}) {
    // Configuration par défaut
    this.config = {
      desktopOrientation: options.desktopOrientation || "horizontal",
      mobileOrientation: options.mobileOrientation || "vertical",
      ...options
    };
    
    // Instances Lenis pour les éléments de menu
    this.menuScrollInstances = new Map();
    // Fonction pour nettoyer l'event listener de resize
    this.removeResizeListener = null;
    
    this.init();
  }

  /**
   * Initialise le scroll manager
   */
  init() {
    this.createLenisInstance();
    this.setupGSAPSync();
    this.setupResponsiveHandler();
  }

  /**
   * Détermine l'orientation selon le format d'écran
   * @returns {string} "horizontal" ou "vertical"
   */
  getCurrentOrientation() {
    // Utilise WindowUtils si disponible, sinon fallback sur window.innerWidth
    const isDesktop = window.WindowUtils ? 
      window.WindowUtils.isDesktop() : 
      window.innerWidth >= 992; // 992px comme seuil pour desktop
    
    return isDesktop ? this.config.desktopOrientation : this.config.mobileOrientation;
  }

  /**
   * Crée une nouvelle instance Lenis avec l'orientation appropriée
   */
  createLenisInstance() {// Détruit l'instance existante si elle existe
    if (this.lenis) { try { this.lenis.destroy(); } catch {} }

    const isIOS = /iP(hone|od|ad)/.test(navigator.userAgent);
    const lowMem = (navigator.deviceMemory && navigator.deviceMemory <= 4) || false;
    const orientation = (window.WindowUtils && window.WindowUtils.getOrientation()) || this.getCurrentOrientation();

    if (isIOS && lowMem) {
      logger.warn('iOS low-mem détecté : Lenis désactivé');
      this.lenis = null;
      return;
    }

    try {
      this.lenis = new Lenis({
        orientation,
        ...this.config.lenisOptions
      });

      const _lenisRotatePause = () => { try { this.lenis?.stop?.(); } catch {} };
      const _lenisRotateResume = () => { setTimeout(() => { try { this.lenis?.start?.(); } catch {} }, 600); };
      window.addEventListener('orientationchange', _lenisRotatePause, { passive:true });
      window.addEventListener('orientationchange', _lenisRotateResume, { passive:true });
      // Sauvegarde pour cleanup:
      this._removeRotateHooks = () => {
        window.removeEventListener('orientationchange', _lenisRotatePause);
        window.removeEventListener('orientationchange', _lenisRotateResume);
      };

    } catch (e) {
      logger.error('Erreur Lenis, fallback natif:', e);
      this.lenis = null;
      return;
    }
  }

  /**
   * Force un reset agressif et persistant de la position de scroll
   * Gère la restauration automatique du navigateur lors des refresh
   */
  forceScrollReset() {
    // Reset immédiat multiple
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.documentElement.scrollLeft = 0;
    document.body.scrollTop = 0;
    document.body.scrollLeft = 0;
    
    // Reset de Lenis si disponible
    if (this.lenis) {
      this.lenis.scrollTo(0, { immediate: true });
    }
    
    // Surveillance continue pour contrer la restauration du navigateur
    // Le navigateur peut restaurer la position après quelques millisecondes
    const resetIntervals = [10, 50, 100, 200, 500, 1000];
    
    resetIntervals.forEach(delay => {
      setTimeout(() => {
        if (!this.isScrollResetComplete()) {
          window.scrollTo(0, 0);
          document.documentElement.scrollTop = 0;
          document.documentElement.scrollLeft = 0;
          document.body.scrollTop = 0;
          document.body.scrollLeft = 0;
          
          if (this.lenis) {
            this.lenis.scrollTo(0, { immediate: true });
          }
          
          logger.debug(`🔄 SmoothScrollManager: Reset forcé après ${delay}ms`);
        }
      }, delay);
    });
    
    console.log('🔄 SmoothScrollManager: Reset agressif initié');
  }

  /**
   * Vérifie si le reset de scroll est complètement effectué
   * @returns {boolean} true si la position est à 0
   */
  isScrollResetComplete() {
    return window.scrollY === 0 && 
           window.scrollX === 0 && 
           document.documentElement.scrollTop === 0 && 
           document.documentElement.scrollLeft === 0 &&
           document.body.scrollTop === 0 &&
           document.body.scrollLeft === 0;
  }

  /**
   * Configure la synchronisation entre Lenis et GSAP
   */
  setupGSAPSync() {
    // Synchronise Lenis avec ScrollTrigger de GSAP
    this.lenis.on("scroll", ScrollTrigger.update);
    
    // Ajoute Lenis au ticker GSAP pour des animations fluides
    // Le ticker GSAP appelle cette fonction à chaque frame
    gsap.ticker.add((time) => {
      this.lenis.raf(time * 1000); // Conversion secondes → millisecondes
      
      // Met à jour aussi les instances de scroll des menus
      this.menuScrollInstances.forEach(instance => {
        instance.raf(time * 1000);
      });
    });
    
    // Désactive le lissage de lag pour éviter les délais dans les animations
    gsap.ticker.lagSmoothing(0);
  }

  /**
   * Configure la gestion responsive pour changer l'orientation
   */
  setupResponsiveHandler() {
    // S'abonner au gestionnaire centralisé d'orientation
    if (window.orientationManager) {
      window.orientationManager.subscribe('SmoothScrollManager', (newOrientation, context) => {
        this.handleOrientationChange(newOrientation, context);
      }, 1); // Priorité 1 (traité en premier)
    } else {
      // Fallback si le gestionnaire centralisé n'est pas disponible
      logger.warn(' OrientationManager non disponible, utilisation du fallback');
      
      let resizeTimeout;
      const handleResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          this.handleOrientationChange();
        }, 500); // Délai plus long pour éviter les conflits
      };
      
      window.addEventListener('resize', handleResize);
      this.removeResizeListener = () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }

  /**
   * Gère le changement d'orientation lors du resize
   */
  handleOrientationChange(newOrientation = null, context = null) {
    const targetOrientation = newOrientation || this.getCurrentOrientation();
    const currentOrientation = this.lenis.options.orientation;
    
    if (targetOrientation !== currentOrientation) {
      logger.scroll(' SmoothScrollManager: ${currentOrientation} → ${targetOrientation}');
      
      // Sauvegarde l'état du scroll actuel
      const wasStarted = !this.lenis.isStopped;
      
      // Recrée l'instance Lenis avec la nouvelle orientation
      this.createLenisInstance();
      
      // Restaure l'état du scroll
      if (!wasStarted) {
        this.lenis.stop();
      }
      
      // Pas de ScrollTrigger.refresh() ici - sera fait de manière centralisée
      logger.success(' SmoothScrollManager mis à jour');
    }
  }

  /**
   * Désactive le scroll fluide sur main-wrapper
   * Appelé quand le menu est ouvert
   */
  disableScroll() {
    if (this.lenis) {
      this.lenis.stop();
    }
  }

  /**
   * Réactive le scroll fluide sur main-wrapper
   * Appelé quand le menu est fermé
   */
  enableScroll() {
    if (this.lenis) {
      this.lenis.start();
    }
  }

  /**
   * Active le scroll pour un élément menu_panel_item spécifique
   * @param {HTMLElement} element - L'élément menu_panel_item
   */
  enableMenuScroll(element) {
    if (!element) return;
    
    const elementId = element.dataset.parent || element.dataset.name || 'default';
    
    // Trouve l'élément scrollable (menu_panel_item_middle)
    const scrollableContent = element.querySelector('.menu_panel_item_middle');
    if (!scrollableContent) return;
    
    // Crée une nouvelle instance Lenis pour cet élément
    const lenisInstance = new Lenis({
      wrapper: scrollableContent,
      content: scrollableContent.querySelector('.menu_panel_collection_list') || scrollableContent,
      orientation: "vertical"
    });
    
    // Stocke l'instance
    this.menuScrollInstances.set(elementId, lenisInstance);
  }

  /**
   * Désactive le scroll pour un élément menu_panel_item spécifique
   * @param {string} elementId - L'identifiant de l'élément (data-parent)
   */
  disableMenuScroll(elementId) {
    const instance = this.menuScrollInstances.get(elementId);
    if (instance) {
      instance.destroy();
      this.menuScrollInstances.delete(elementId);
    }
  }

  /**
   * Nettoie toutes les instances de scroll des menus
   */
  cleanupMenuScrolls() {
    this.menuScrollInstances.forEach(instance => {
      instance.destroy();
    });
    this.menuScrollInstances.clear();
  }

  /**
   * Détruit le gestionnaire de scroll et nettoie tous les event listeners
   */
  destroy() {
    // Désactive le watchdog de reset
    this.disableResetWatchdog();
    
    // Se désabonner du gestionnaire centralisé d'orientation
    if (window.orientationManager) {
      window.orientationManager.unsubscribe('SmoothScrollManager');
    }
    
    // Nettoie l'event listener de resize (fallback)
    if (this.removeResizeListener) {
      this.removeResizeListener();
    }
    
    // Détruit l'instance Lenis principale
    if (this.lenis) {
      this.lenis.destroy();
    }
    
    // Nettoie toutes les instances de menu
    this.cleanupMenuScrolls();

    if (this._removeRotateHooks) { this._removeRotateHooks(); }
  }

  /**
   * Change l'orientation manuellement
   * @param {string} orientation - "horizontal" ou "vertical"
   */
  setOrientation(orientation) {
    if (orientation !== "horizontal" && orientation !== "vertical") {
      return;
    }
    
    const currentOrientation = this.lenis.options.orientation;
    if (orientation !== currentOrientation) {
      // Sauvegarde l'état actuel
      const wasStarted = !this.lenis.isStopped;
      
      // Met à jour la configuration
      if (window.WindowUtils && window.WindowUtils.isDesktop()) {
        this.config.desktopOrientation = orientation;
      } else {
        this.config.mobileOrientation = orientation;
      }
      
      // Recrée l'instance
      this.createLenisInstance();
      
      // Restaure l'état
      if (!wasStarted) {
        this.lenis.stop();
      }
      
      // Rafraîchit ScrollTrigger
      if (window.ScrollTrigger) {
        ScrollTrigger.refresh();
      }
    }
  }

  /**
   * Retourne l'orientation actuelle
   * @returns {string} L'orientation actuelle ("horizontal" ou "vertical")
   */
  getOrientation() {
    return this.lenis ? this.lenis.options.orientation : null;
  }

  /**
   * Méthode publique pour forcer un reset complet
   * Peut être appelée par d'autres managers (ex: LoaderManager)
   */
  resetToZero() {
    this.forceScrollReset();
  }

  /**
   * Active la surveillance continue du reset
   * Utile pendant les animations de loader
   */
  enableResetWatchdog() {
    if (this.resetWatchdogId) {
      clearInterval(this.resetWatchdogId);
    }

    // Vérifie toutes les 100ms pendant 3 secondes
    let checkCount = 0;
    const maxChecks = 30; // 3 secondes / 100ms

    this.resetWatchdogId = setInterval(() => {
      checkCount++;
      
      if (!this.isScrollResetComplete()) {
        this.forceScrollReset();
        logger.debug('🔄 SmoothScrollManager: Watchdog - Position corrigée');
      }
      
      if (checkCount >= maxChecks) {
        this.disableResetWatchdog();
      }
    }, 100);
    
    logger.debug('🔄 SmoothScrollManager: Watchdog activé');
  }

  /**
   * Désactive la surveillance continue du reset
   */
  disableResetWatchdog() {
    if (this.resetWatchdogId) {
      clearInterval(this.resetWatchdogId);
      this.resetWatchdogId = null;
      logger.debug('🔄 SmoothScrollManager: Watchdog désactivé');
    }
  }
}
