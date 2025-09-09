// ==========================================
// CONTRÔLEUR PRINCIPAL DE L'APPLICATION
// ==========================================
import { LoaderManager } from './loader-manager.js';
import { LoaderManagerLite } from './loader-manager-lite.js';
import { OrientationManager } from './orientation-manager.js';
import { SmoothScrollManager } from './smooth-scroll-manager.js';
import { SmoothScrollManagerLite } from './smooth-scroll-manager-lite.js';
import { SliderManager } from './slider-manager.js';
import { SwiperManager } from './swiper-manager.js';
import { MenuManager } from './menu-manager.js';
import { ModalManager } from './modal-manager.js';
import { DebugUtils } from './debug-utils.js';
import { MenuFallback } from './menu-fallback.js';
import { MobileLiteManager } from './mobile-lite-manager.js';
import './utils.js'; // Import des WindowUtils
import logger from './logger.js';


// ↓↓↓ Ajout anti-flood de refresh sur resize (GSAP)
if (window.ScrollTrigger && ScrollTrigger.config) {
  ScrollTrigger.config({
    autoRefreshEvents: "DOMContentLoaded,load,visibilitychange" // pas 'resize'
  });
}


/**
 * Classe principale qui orchestre toute l'application VV Place
 * Initialise et coordonne tous les gestionnaires :
 * - Scroll fluide (normal ou lite selon la taille d'écran)
 * - Slider horizontal (désactivé en mobile lite)
 * - Menu de navigation
 * - Modales
 * - Texte riche
 * - Interactions souris
 */
export class VVPlaceApp {
  constructor() {
    // Détection du mode mobile lite
    this.isMobileLite = window.WindowUtils ? window.WindowUtils.isMobileLite() : window.innerWidth < 768;
    
    // Gestionnaire de loader (initialisé en premier)
    this.loaderManager = null;
    
    // Gestionnaire centralisé d'orientation (initialisé en premier)
    this.orientationManager = null;
    
    // Gestionnaire du mode mobile lite
    this.mobileLiteManager = null;
    
    // Références aux différents gestionnaires
    this.smoothScrollManager = null;      // Gestion du scroll fluide
    this.sliderManager = null;           // Gestion du slider principal (desktop seulement)
    this.swiperManager = null;           // Gestion des swipers (desktop seulement en mode lite)
    this.menuManager = null;             // Gestion du menu
    this.menuFallback = null;            // Menu de fallback
    this.modalManager = null;            // Gestion des modales
  }

  /**
   * Initialise toute l'application dans le bon ordre
   * Cette méthode est appelée une fois que le DOM est chargé
   * Vérifie la présence des éléments requis avant l'initialisation
   */
  init() {
    logger.loading('VVPlaceApp - Début de l\'initialisation');
    
    // Log du mode détecté
    if (this.isMobileLite) {
      logger.info('📱 Mode MOBILE LITE activé (< 768px) - Fonctionnalités simplifiées');
    } else {
      logger.info('🖥️ Mode DESKTOP activé - Toutes les fonctionnalités');
    }
    
    // Reset préventif immédiat dès le début
    this.emergencyScrollReset();
    
    // Diagnostic initial
    DebugUtils.logFullDiagnostic();
    DebugUtils.watchIncrementalInit();
    
    // 0. Initialise le gestionnaire d'orientation centralisé EN PREMIER
    try {
      logger.orientation(' Initialisation de l\'OrientationManager...');
      this.orientationManager = new OrientationManager();
      this.orientationManager.init();
      
      // Rendre disponible globalement pour les autres gestionnaires
      window.orientationManager = this.orientationManager;
      logger.success(' OrientationManager initialisé avec succès');
    } catch (error) {
      logger.error(' Erreur lors de l\'initialisation de l\'OrientationManager:', error);
      this.orientationManager = null;
    }
    
    // 1. Initialise le scroll fluide (version lite ou normale selon le mode)
    try {
      if (this.isMobileLite) {
        logger.scroll(' Initialisation du SmoothScrollManagerLite...');
        this.smoothScrollManager = new SmoothScrollManagerLite();
      } else {
        logger.scroll(' Initialisation du SmoothScrollManager...');
        this.smoothScrollManager = new SmoothScrollManager();
      }
      logger.success(' SmoothScrollManager initialisé avec succès');
    } catch (error) {
      logger.error(' Erreur lors de l\'initialisation du SmoothScrollManager:', error);
      this.smoothScrollManager = null;
    }
    
    // 2. Initialise le gestionnaire de swipers (seulement en mode desktop)
    if (!this.isMobileLite) {
      try {
        logger.debug(' Initialisation du SwiperManager...');
        this.swiperManager = new SwiperManager();
        this.swiperManager.init();
        logger.success(' SwiperManager initialisé avec succès');
      } catch (error) {
        logger.error(' Erreur lors de l\'initialisation du SwiperManager:', error);
        this.swiperManager = null;
      }
    } else {
      logger.debug(' SwiperManager ignoré en mode mobile lite');
    }
    
    // 3 & 4. Init Slider + Loader (seulement en mode desktop)
    if (!this.isMobileLite) {
      const sliderRoot = document.querySelector('.slider-panel_wrap') || document.querySelector('.slider-panel_list');
      if (sliderRoot) {
        const io = new IntersectionObserver(([e]) => {
          if (!e.isIntersecting) return;
          io.disconnect();

          try {
            logger.slider(' Initialisation du SliderManager (on-demand)...');
            this.sliderManager = new SliderManager();
            this.sliderManager.init();
            logger.success(' SliderManager initialisé (on-demand)');
          } catch (error) {
            logger.error(' Erreur SliderManager (on-demand):', error);
            this.sliderManager = null;
          }

          try {
            logger.loading('🎬 Initialisation du LoaderManager (après slider)...');
            this.loaderManager = new LoaderManager(this.sliderManager, this.smoothScrollManager);
            this.loaderManager.init();
            logger.success('✅ LoaderManager initialisé (on-demand)');
          } catch (error) {
            logger.error('❌ Erreur LoaderManager (on-demand):', error);
            this.loaderManager = null;
          }
        }, { rootMargin: '200px 0px' });
        io.observe(sliderRoot);
      } else {
        logger.debug(' SliderManager/LoaderManager ignorés - éléments non trouvés');
      }
    } else {
      // Mode mobile lite : utiliser le loader simplifié
      try {
        logger.loading('🎬 Initialisation du LoaderManagerLite...');
        this.loaderManager = new LoaderManagerLite();
        this.loaderManager.init();
        logger.success('✅ LoaderManagerLite initialisé');
      } catch (error) {
        logger.error('❌ Erreur LoaderManagerLite:', error);
        this.loaderManager = null;
      }
    }

    
    // 5. Initialise le gestionnaire de menu si les éléments requis existent
    if (this.checkMenuElements()) {
      try {
        logger.menu(' Initialisation du MenuManager...');
        this.menuManager = new MenuManager(this.smoothScrollManager);
        this.menuManager.init().then(() => {
          logger.success(' MenuManager initialisé avec succès');
          
          // Initialiser l'écouteur du logo pour relancer l'animation loader
          if (this.loaderManager) {
            this.loaderManager.initLogoClickListener();
          }
        }).catch((error) => {
          logger.error(' Erreur lors de l\'initialisation du MenuManager:', error);
          this.menuManager = null;
          this.initMenuFallback();
        });
      } catch (error) {
        logger.error(' Erreur lors de la création du MenuManager:', error);
        this.menuManager = null;
        this.initMenuFallback();
      }
    } else {
      logger.debug(' MenuManager ignoré - éléments requis non trouvés');
    }
    
    // 6. Initialise le gestionnaire de modales si les éléments requis existent
    // En mode mobile lite, on désactive les modales (pas de swipers)
    if (!this.isMobileLite && this.checkModalElements()) {
      try {
        logger.modal(' Initialisation du ModalManager...');
        this.modalManager = new ModalManager(this.swiperManager);
        this.modalManager.init();
        logger.success(' ModalManager initialisé avec succès');
      } catch (error) {
        logger.error(' Erreur lors de l\'initialisation du ModalManager:', error);
        this.modalManager = null;
      }
    } else {
      if (this.isMobileLite) {
        logger.debug(' ModalManager ignoré en mode mobile lite');
      } else {
        logger.debug(' ModalManager ignoré - éléments requis non trouvés');
      }
    }
    
    // 7. Traitement léger du texte riche (inline utilitaire)
    try {
      if (window.WindowUtils) {
        const count = WindowUtils.enhanceRichTextFigures();
        if (count) logger.success(` Traitement texte riche: ${count} figure(s) enrichie(s)`);
      }
    } catch(e) {
      logger.warn(' Enhancement texte riche ignoré');
    }

    // 8. Organisation des slides (même en mode mobile lite pour l'ordre correct)
    try {
      if (window.WindowUtils) {
        const success = WindowUtils.setupSliderOrder();
        if (success) {
          logger.success(' Organisation des slides effectuée');
        } else {
          logger.debug(' Pas d\'éléments slider à organiser');
        }
      }
    } catch(e) {
      logger.warn(' Organisation des slides ignorée');
    }

    // 8b. Insertion dynamique des tags CMS (même en mode mobile lite)
    try {
      if (window.WindowUtils) {
        const inserted = WindowUtils.handleDynamicTagInsertion();
        if (inserted > 0) {
          logger.success(` Insertion dynamique: ${inserted} tag(s) inséré(s)`);
        } else {
          logger.debug(' Pas d\'éléments à insérer dynamiquement');
        }
      }
    } catch(e) {
      logger.warn(' Insertion dynamique des tags ignorée');
    }

    // 9. Désactiver les déclencheurs de modales en mode mobile lite
    if (this.isMobileLite) {
      try {
        this.disableModalTriggers();
        logger.debug(' Déclencheurs de modales désactivés en mode mobile lite');
      } catch(e) {
        logger.warn(' Impossible de désactiver les déclencheurs de modales');
      }
    }

    // ↓↓↓ Gel des systèmes lourds pendant la rotation iOS
    let _rotateTimer;
    const _onRotateStart = () => {
      try { window.lenis?.stop?.(); } catch {}
      try { ScrollTrigger?.getAll().forEach(t => t.disable()); } catch {}
      try { gsap.ticker?.lagSmoothing?.(false); } catch {}
    };
    const _onRotateEnd = () => {
      clearTimeout(_rotateTimer);
      _rotateTimer = setTimeout(() => {
        try { ScrollTrigger?.refresh(true); ScrollTrigger?.getAll().forEach(t => t.enable()); } catch {}
        try { window.lenis?.start?.(); } catch {}
        try { gsap.ticker?.lagSmoothing?.(500, 33); } catch {}
      }, 600); // laisse iOS finir sa transition
    };
    window.addEventListener('orientationchange', () => { _onRotateStart(); _onRotateEnd(); }, { passive:true });
    window.addEventListener('resize', () => { /* si resize en rafale pendant pivot */ _onRotateEnd(); }, { passive:true });

    // Initialiser le gestionnaire de mode mobile lite
    try {
      this.mobileLiteManager = new MobileLiteManager(this);
      logger.success(' MobileLiteManager initialisé');
    } catch (error) {
      logger.error(' Erreur lors de l\'initialisation du MobileLiteManager:', error);
    }
    
    logger.success(' VVPlaceApp - Initialisation terminée');
  }

  /**
   * Détruit proprement l'application et tous ses gestionnaires
   * Utile pour éviter les fuites mémoire lors du reload de page
   */
  destroy() {
    logger.debug(' VVPlaceApp - Début de la destruction');
    
    // Détruire dans l'ordre inverse de l'initialisation
  // plus de gestionnaire rich text dédié (inline utilitaire)
    
    if (this.modalManager) {
      this.modalManager.destroy();
    }
    
    if (this.menuManager) {
      // Le MenuManager n'a pas de méthode destroy pour l'instant
      this.menuManager = null;
    }
    
    // Détruire le loader avant le slider (ordre inverse de l'initialisation)
    if (this.loaderManager) {
      this.loaderManager.destroy();
    }
    
    if (this.sliderManager) {
      this.sliderManager.destroy();
    }
    
    if (this.swiperManager) {
      this.swiperManager.destroyAll();
    }
    
    if (this.smoothScrollManager) {
      this.smoothScrollManager.destroy();
    }
    
    // Détruire le gestionnaire d'orientation
    if (this.orientationManager) {
      this.orientationManager.destroy();
      window.orientationManager = null;
    }
    
    // Détruire le gestionnaire de mode mobile lite
    if (this.mobileLiteManager) {
      this.mobileLiteManager.destroy();
    }
    
    logger.success(' VVPlaceApp - Destruction terminée');
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

  // checkRichTextElements supprimé (traitement toujours safe en utilitaire)
  
  /**
   * Initialise le menu de fallback en cas d'échec du MenuManager principal
   */
  initMenuFallback() {
    logger.info(' Initialisation du menu de fallback...');
    try {
      this.menuFallback = new MenuFallback();
      const success = this.menuFallback.init();
      if (success) {
        logger.success(' Menu de fallback initialisé avec succès');
      } else {
        logger.error(' Échec de l\'initialisation du menu de fallback');
      }
    } catch (error) {
      logger.error(' Erreur lors de l\'initialisation du menu de fallback:', error);
    }
  }

  /**
   * Reset d'urgence du scroll avant toute initialisation
   * Contourne la restauration automatique du navigateur
   */
  emergencyScrollReset() {
    logger.debug('🚨 VVPlaceApp: Reset d\'urgence (centralisé)');
    if (window.WindowUtils && window.WindowUtils.resetScroll) {
      window.WindowUtils.resetScroll();
    } else {
      // Fallback minimal
      window.scrollTo(0,0);
    }
    logger.debug('🚨 Reset d\'urgence terminé');
  }

  /**
   * Désactive les déclencheurs de modales en mode mobile lite
   */
  disableModalTriggers() {
    const modalTriggers = document.querySelectorAll('[data-modal-trigger]');
    
    modalTriggers.forEach(trigger => {
      // Sauvegarder l'événement original si pas déjà fait
      if (!trigger.dataset.originalClick) {
        trigger.dataset.originalClick = 'saved';
        
        // Remplacer par un handler qui ne fait rien
        trigger.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          logger.debug(' Clic sur déclencheur modal ignoré en mode mobile lite');
        }, { capture: true });
      }
    });
    
    return modalTriggers.length;
  }
}
