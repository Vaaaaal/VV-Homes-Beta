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
  createLenisInstance() {
    // Détruit l'instance existante si elle existe
    if (this.lenis) {
      this.lenis.destroy();
    }

    const orientation = this.getCurrentOrientation();
    
    // Crée la nouvelle instance avec l'orientation appropriée
    this.lenis = new Lenis({ 
      orientation: orientation,
      ...this.config.lenisOptions // Permet d'ajouter d'autres options Lenis
    });
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
      console.warn('⚠️ OrientationManager non disponible, utilisation du fallback');
      
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
      console.log(`📜 SmoothScrollManager: ${currentOrientation} → ${targetOrientation}`);
      
      // Sauvegarde l'état du scroll actuel
      const wasStarted = !this.lenis.isStopped;
      
      // Recrée l'instance Lenis avec la nouvelle orientation
      this.createLenisInstance();
      
      // Restaure l'état du scroll
      if (!wasStarted) {
        this.lenis.stop();
      }
      
      // Pas de ScrollTrigger.refresh() ici - sera fait de manière centralisée
      console.log('✅ SmoothScrollManager mis à jour');
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
}
