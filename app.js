// ==========================================
// CONTRÔLEUR PRINCIPAL DE L'APPLICATION
// ==========================================
import { SmoothScrollManager } from './smooth-scroll-manager.js';
import { SliderManager } from './slider-manager.js';
import { MenuManager } from './menu-manager.js';
import { ModalManager } from './modal-manager.js';
import { RichTextManager } from './rich-text-manager.js';

/**
 * Classe principale qui orchestre toute l'application VV Place
 * Initialise et coordonne tous les gestionnaires :
 * - Scroll fluide
 * - Slider horizontal
 * - Menu de navigation
 * - Modales
 * - Texte riche
 * - Interactions souris
 */
export class VVPlaceApp {
  constructor() {
    // Références aux différents gestionnaires
    this.smoothScrollManager = null;      // Gestion du scroll fluide
    this.sliderManager = null;           // Gestion du slider principal
    this.menuManager = null;             // Gestion du menu
    this.modalManager = null;            // Gestion des modales
    this.richTextManager = null;         // Gestion du texte riche
  }

  /**
   * Initialise toute l'application dans le bon ordre
   * Cette méthode est appelée une fois que le DOM est chargé
   * Vérifie la présence des éléments requis avant l'initialisation
   */
  init() {
    
    // 1. Initialise le scroll fluide en premier (base pour tout le reste)
    // Le scroll fluide est toujours initialisé car il ne dépend pas d'éléments spécifiques
    try {
      this.smoothScrollManager = new SmoothScrollManager();
    } catch (error) {
      this.smoothScrollManager = null;
    }
    
    // 2. Initialise le gestionnaire de slider si les éléments requis existent
    if (this.checkSliderElements()) {
      try {
        this.sliderManager = new SliderManager();
        this.sliderManager.init();
      } catch (error) {
        this.sliderManager = null;
      }
    } else {
    }
    
    // 3. Initialise le gestionnaire de menu si les éléments requis existent
    if (this.checkMenuElements()) {
      try {
        this.menuManager = new MenuManager(this.smoothScrollManager);
        this.menuManager.init();
      } catch (error) {
        this.menuManager = null;
      }
    } else {
    }
    
    // 4. Initialise le gestionnaire de modales si les éléments requis existent
    if (this.checkModalElements()) {
      try {
        this.modalManager = new ModalManager();
        this.modalManager.init();
      } catch (error) {
        this.modalManager = null;
      }
    } else {
    }
    
    // 5. Initialise le gestionnaire de texte riche si les éléments requis existent
    if (this.checkRichTextElements()) {
      try {
        this.richTextManager = new RichTextManager();
        this.richTextManager.init();
      } catch (error) {
        this.richTextManager = null;
      }
    } else {
    }
    
  }

  /**
   * Vérifie la présence des éléments DOM requis pour le slider
   * @returns {boolean} true si tous les éléments requis sont présents
   */
  checkSliderElements() {
    const sliderItems = document.querySelectorAll('.slider-panel_item');
    const sliderList = document.querySelector('.slider-panel_list');
    
    if (sliderItems.length === 0) {
      return false;
    }
    
    if (!sliderList) {
      return false;
    }
    
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
      return false;
    }
    
    if (!menuButton) {
      return false;
    }
    
    return true;
  }

  /**
   * Vérifie la présence des éléments DOM requis pour les modales
   * @returns {boolean} true si des éléments modales sont présents
   */
  checkModalElements() {
    const modalTriggers = document.querySelectorAll('[data-modal-trigger]');
    const modalItems = document.querySelectorAll('[data-modal-item]');
    const modalCloseButtons = document.querySelectorAll('[data-modal-close]');
    
    if (modalTriggers.length === 0) {
      return false;
    }
    
    if (modalItems.length === 0) {
      return false;
    }
    
    return true;
  }

  /**
   * Vérifie la présence des éléments DOM requis pour le texte riche
   * @returns {boolean} true si des éléments text-rich-text sont présents
   */
  checkRichTextElements() {
    const richTextElements = document.querySelectorAll('.text-rich-text');
    
    if (richTextElements.length === 0) {
      return false;
    }
    
    return true;
  }
}
