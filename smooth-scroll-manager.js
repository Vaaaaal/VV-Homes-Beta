// ==========================================
// GESTIONNAIRE DE SCROLL FLUIDE
// ==========================================
/**
 * Gère le scroll horizontal fluide avec la librairie Lenis
 * Synchronise le scroll avec les animations GSAP
 */
export class SmoothScrollManager {
  constructor() {
    // Initialise Lenis pour un scroll horizontal fluide
    this.lenis = new Lenis({ orientation: "horizontal" });
    // Instances Lenis pour les éléments de menu
    this.menuScrollInstances = new Map();
    this.init();
  }

  /**
   * Configure la synchronisation entre Lenis et GSAP
   */
  init() {
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
}
