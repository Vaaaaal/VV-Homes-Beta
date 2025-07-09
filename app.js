// ==========================================
// CONTRÔLEUR PRINCIPAL DE L'APPLICATION
// ==========================================
import { SmoothScrollManager } from './smooth-scroll-manager.js';
import { SliderManager } from './slider-manager.js';
import { MenuManager } from './menu-manager.js';

/**
 * Classe principale qui orchestre toute l'application VV Place
 * Initialise et coordonne tous les gestionnaires :
 * - Scroll fluide
 * - Slider horizontal
 * - Menu de navigation
 * - Interactions souris
 */
export class VVPlaceApp {
  constructor() {
    // Références aux différents gestionnaires
    this.smoothScrollManager = null;      // Gestion du scroll fluide
    this.sliderManager = null;           // Gestion du slider principal
    this.menuManager = null;             // Gestion du menu
  }

  /**
   * Initialise toute l'application dans le bon ordre
   * Cette méthode est appelée une fois que le DOM est chargé
   */
  init() {
    // 1. Initialise le scroll fluide en premier (base pour tout le reste)
    this.smoothScrollManager = new SmoothScrollManager();
    
    // 2. Initialise le gestionnaire de slider
    this.sliderManager = new SliderManager();
    
    // 3. Initialise le gestionnaire de menu avec référence au scroll manager
    this.menuManager = new MenuManager(this.smoothScrollManager);
    
    // 4. Lance l'initialisation du slider et du menu
    this.sliderManager.init();
    this.menuManager.init();
  }
}
