// ==========================================
// CONTRÔLEUR PRINCIPAL DE L'APPLICATION
// ==========================================
import { SmoothScrollManager } from './smooth-scroll-manager.js';
import { SliderManager } from './slider-manager.js';
import { SwiperManager } from './swiper-manager.js';
import { MenuManager } from './menu-manager.js';
import { ModalManager } from './modal-manager.js';
import { RichTextManager } from './rich-text-manager.js';
import { DebugUtils } from './debug-utils.js';
import { MenuFallback } from './menu-fallback.js';

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
    this.swiperManager = null;           // Gestion des swipers
    this.menuManager = null;             // Gestion du menu
    this.menuFallback = null;            // Menu de fallback
    this.modalManager = null;            // Gestion des modales
    this.richTextManager = null;         // Gestion du texte riche
  }

  /**
   * Initialise toute l'application dans le bon ordre
   * Cette méthode est appelée une fois que le DOM est chargé
   * Vérifie la présence des éléments requis avant l'initialisation
   */
  init() {
    console.log('🚀 VVPlaceApp - Début de l\'initialisation');
    
    // Diagnostic initial
    DebugUtils.logFullDiagnostic();
    DebugUtils.watchIncrementalInit();
    
    // 1. Initialise le scroll fluide en premier (base pour tout le reste)
    // Le scroll fluide est toujours initialisé car il ne dépend pas d'éléments spécifiques
    try {
      console.log('📜 Initialisation du SmoothScrollManager...');
      this.smoothScrollManager = new SmoothScrollManager();
      console.log('✅ SmoothScrollManager initialisé avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation du SmoothScrollManager:', error);
      this.smoothScrollManager = null;
    }
    
    // 2. Initialise le gestionnaire de swipers (indépendant, peut être utilisé par d'autres gestionnaires)
    try {
      console.log('🎠 Initialisation du SwiperManager...');
      this.swiperManager = new SwiperManager();
      this.swiperManager.init();
      console.log('✅ SwiperManager initialisé avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation du SwiperManager:', error);
      this.swiperManager = null;
    }
    
    // 3. Initialise le gestionnaire de slider si les éléments requis existent
    if (this.checkSliderElements()) {
      try {
        console.log('🎚️ Initialisation du SliderManager...');
        this.sliderManager = new SliderManager();
        this.sliderManager.init();
        console.log('✅ SliderManager initialisé avec succès');
      } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation du SliderManager:', error);
        this.sliderManager = null;
      }
    } else {
      console.log('⏭️ SliderManager ignoré - éléments requis non trouvés');
    }
    
    // 4. Initialise le gestionnaire de menu si les éléments requis existent
    if (this.checkMenuElements()) {
      try {
        console.log('🍔 Initialisation du MenuManager...');
        this.menuManager = new MenuManager(this.smoothScrollManager);
        this.menuManager.init().then(() => {
          console.log('✅ MenuManager initialisé avec succès');
        }).catch((error) => {
          console.error('❌ Erreur lors de l\'initialisation du MenuManager:', error);
          this.menuManager = null;
          this.initMenuFallback();
        });
      } catch (error) {
        console.error('❌ Erreur lors de la création du MenuManager:', error);
        this.menuManager = null;
        this.initMenuFallback();
      }
    } else {
      console.log('⏭️ MenuManager ignoré - éléments requis non trouvés');
    }
    
    // 5. Initialise le gestionnaire de modales si les éléments requis existent
    if (this.checkModalElements()) {
      try {
        console.log('🪟 Initialisation du ModalManager...');
        this.modalManager = new ModalManager(this.swiperManager);
        this.modalManager.init();
        console.log('✅ ModalManager initialisé avec succès');
      } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation du ModalManager:', error);
        this.modalManager = null;
      }
    } else {
      console.log('⏭️ ModalManager ignoré - éléments requis non trouvés');
    }
    
    // 6. Initialise le gestionnaire de texte riche si les éléments requis existent
    if (this.checkRichTextElements()) {
      try {
        console.log('📝 Initialisation du RichTextManager...');
        this.richTextManager = new RichTextManager();
        this.richTextManager.init();
        console.log('✅ RichTextManager initialisé avec succès');
      } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation du RichTextManager:', error);
        this.richTextManager = null;
      }
    } else {
      console.log('⏭️ RichTextManager ignoré - éléments requis non trouvés');
    }
    
    console.log('🎉 VVPlaceApp - Initialisation terminée');
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
  
  /**
   * Initialise le menu de fallback en cas d'échec du MenuManager principal
   */
  initMenuFallback() {
    console.log('🔄 Initialisation du menu de fallback...');
    try {
      this.menuFallback = new MenuFallback();
      const success = this.menuFallback.init();
      if (success) {
        console.log('✅ Menu de fallback initialisé avec succès');
      } else {
        console.error('❌ Échec de l\'initialisation du menu de fallback');
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation du menu de fallback:', error);
    }
  }
}
