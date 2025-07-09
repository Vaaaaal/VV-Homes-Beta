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
   * Vérifie la présence des éléments requis avant l'initialisation
   */
  init() {
    console.log('🚀 Initialisation de VV Place App...');
    
    // 1. Initialise le scroll fluide en premier (base pour tout le reste)
    // Le scroll fluide est toujours initialisé car il ne dépend pas d'éléments spécifiques
    try {
      this.smoothScrollManager = new SmoothScrollManager();
      console.log('✅ Smooth Scroll Manager initialisé');
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation du Smooth Scroll Manager:', error);
      this.smoothScrollManager = null;
    }
    
    // 2. Initialise le gestionnaire de slider si les éléments requis existent
    if (this.checkSliderElements()) {
      try {
        this.sliderManager = new SliderManager();
        this.sliderManager.init();
        console.log('✅ Slider Manager initialisé');
      } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation du Slider Manager:', error);
        this.sliderManager = null;
      }
    } else {
      console.warn('⚠️ Slider Manager non initialisé : éléments requis manquants');
    }
    
    // 3. Initialise le gestionnaire de menu si les éléments requis existent
    if (this.checkMenuElements()) {
      try {
        this.menuManager = new MenuManager(this.smoothScrollManager);
        this.menuManager.init();
        console.log('✅ Menu Manager initialisé');
      } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation du Menu Manager:', error);
        this.menuManager = null;
      }
    } else {
      console.warn('⚠️ Menu Manager non initialisé : éléments requis manquants');
    }
    
    console.log('🎉 Initialisation de VV Place App terminée');
  }

  /**
   * Vérifie la présence des éléments DOM requis pour le slider
   * @returns {boolean} true si tous les éléments requis sont présents
   */
  checkSliderElements() {
    const sliderItems = document.querySelectorAll('.slider-panel_item');
    const sliderList = document.querySelector('.slider-panel_list');
    
    if (sliderItems.length === 0) {
      console.warn('⚠️ Aucun élément slider trouvé (.slider-panel_item)');
      return false;
    }
    
    if (!sliderList) {
      console.warn('⚠️ Container slider non trouvé (.slider-panel_list)');
      return false;
    }
    
    console.log(`✅ Éléments slider détectés : ${sliderItems.length} slides`);
    return true;
  }

  /**
   * Vérifie la présence des éléments DOM requis pour le menu
   * @returns {boolean} true si tous les éléments requis sont présents
   */
  checkMenuElements() {
    const menuWrap = document.querySelector('.menu_wrap');
    const menuButton = document.querySelector('#menu-btn');
    
    if (!menuWrap) {
      console.warn('⚠️ Container menu non trouvé (.menu_wrap)');
      return false;
    }
    
    if (!menuButton) {
      console.warn('⚠️ Bouton menu non trouvé (#menu-btn)');
      return false;
    }
    
    console.log('✅ Éléments menu détectés');
    return true;
  }
}
