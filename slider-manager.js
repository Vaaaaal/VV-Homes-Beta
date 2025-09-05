// ==========================================
// GESTIONNAIRE DU SLIDER PRINCIPAL
// ==========================================
import { CONFIG } from './config.js';
import logger from './logger.js';

/**
 * Gère toute la logique du slider horizontal :
 * - Tri et organisation des slides
 * - Animations de scroll
 * - Indicateur de progression
 * - Gestion des catégories
 */
export class SliderManager {
  constructor() {
    // Récupère tous les éléments du slider (sauf le dernier marqué "is-last")
    this.sliderItems = gsap.utils
      .toArray(CONFIG.SELECTORS.SLIDER_ITEM)
      .filter((el) => !el.classList.contains("is-last"));
    
    // Récupère tous les éléments de catégories
    this.categoriesItems = gsap.utils.toArray(CONFIG.SELECTORS.CATEGORIES);
    
    // Récupère la dernière slide (slide de fin)
    this.lastSlide = document.querySelector(".slider-panel_item.is-last");
    this.firstSlide = document.querySelector(".slider-panel_item.is-first");
    
    // Éléments de l'indicateur de progression
    this.indicatorBall = document.querySelector(CONFIG.SELECTORS.INDICATOR_BALL);
    this.indicatorTrack = document.querySelector(CONFIG.SELECTORS.INDICATOR_TRACK);
    
  // Reset différé dans init pour laisser d'éventuels styles critiques se poser
  // (anciennement exécuté dans le constructeur)
    
    // Détection de l'orientation actuelle
    this.currentOrientation = this.getCurrentOrientation();
    
    // Event listener pour les changements d'orientation
    this.setupOrientationListener();
  }

  /**
   * Initialise tous les composants du slider
   */
  init() {
  this.immediateReset();            // Reset global centralisé
  this.setupSliderOrder();          // Organise l'ordre des slides
  this.resetSliderToStart();        // Positionne après ordre établi
  this.handleDynamicTagInsertion(); // Gère insertion CMS
  this.rebuildScrollSystem();       // Crée triggers + animations + indicateur
  }

  /**
   * Détermine l'orientation actuelle basée sur la taille d'écran
   * @returns {string} "horizontal" ou "vertical"
   */
  getCurrentOrientation() {
    if (window.WindowUtils && WindowUtils.getOrientation) return WindowUtils.getOrientation();
    return window.innerWidth >= 992 ? 'horizontal' : 'vertical';
  }

  /**
   * Configure l'écoute des changements d'orientation
   */
  setupOrientationListener() {
    // S'abonner au gestionnaire centralisé d'orientation
    if (window.orientationManager) {
      window.orientationManager.subscribe('SliderManager', (newOrientation, context) => {
        this.handleOrientationChange(newOrientation, context);
      }, 2); // Priorité 2 (après SmoothScrollManager)
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
      this.removeOrientationListener = () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }

  /**
   * Gère le changement d'orientation
   */
  handleOrientationChange(newOrientation = null, context = null) {
    const targetOrientation = newOrientation || this.getCurrentOrientation();
    if (targetOrientation === this.currentOrientation) return;
    logger.slider(` SliderManager orientation: ${this.currentOrientation} → ${targetOrientation}`);
    this.currentOrientation = targetOrientation;
    this.rebuildScrollSystem();
    logger.success(' SliderManager mis à jour');
  }

  /**
   * Reset immédiat et agressif du scroll dès la création de l'instance
   * Se déclenche avant toute autre initialisation
   */
  immediateReset() {
  logger.debug('🔄 SliderManager: Reset (centralisé)');
  if (window.WindowUtils) WindowUtils.resetScroll(); else window.scrollTo(0,0);
  if (window.ScrollTrigger) { try { ScrollTrigger.refresh(); ScrollTrigger.update(); } catch(_) {} }
  this.sliderItems.forEach(item => gsap.set(item,{xPercent:0,yPercent:0,x:0,y:0,clearProps:'transform'}));
  logger.debug('✅ SliderManager: Reset terminé');
  }

  /**
   * Force un reset agressif de la position de scroll window
   * Similaire à SmoothScrollManager mais pour le SliderManager
   */
  forceWindowScrollReset() {
  if (window.WindowUtils) return WindowUtils.resetScroll();
  window.scrollTo(0,0);
  }

  /**
   * Remet le slider à sa position initiale (première slide)
   * Utile lors du chargement de la page pour éviter que le slider soit déjà entamé
   * @param {boolean} forceFullReset - Si true, force le scroll à (0,0) pour tous les axes
   */
  resetSliderToStart(forceFullReset = false) {
    // Trouve le container principal du slider
    const sliderContainer = document.querySelector(CONFIG.SELECTORS.SLIDER_LIST);
    // Fallback vers slider-panel_wrap si slider-panel_list n'existe pas
    const sliderContainerFallback = document.querySelector('.main-wrapper .slider-panel_wrap');
    const containerToReset = sliderContainer || sliderContainerFallback;
    
    if (!containerToReset) {
      logger.warn('⚠️ Aucun container de slider trouvé pour le reset');
      return;
    }

    // Remet le scroll horizontal à 0 (début)
    containerToReset.scrollLeft = 0;

    if (forceFullReset) {
      // Force le scroll à (0,0) pour tous les axes et orientations
      window.scrollTo(0, 0);
      // Force aussi le scroll vertical du container si nécessaire
      containerToReset.scrollTop = 0;
      logger.debug('🔄 Reset complet du scroll à (0,0)');
    } else {
      // Remet seulement window.scrollX à 0 (comportement original)
      window.scrollTo(0, window.scrollY);
    }

    // Active la première slide (firstSlide) et désactive toutes les autres
    // Désactive d'abord toutes les slides
    this.sliderItems.forEach((item) => {
      item.classList.remove('is-active-panel');
    });
    
    // Active la firstSlide qui est maintenant la vraie première slide
    if (this.firstSlide) {
      this.firstSlide.classList.add('is-active-panel');
      
      // Active la catégorie de la première slide
      const firstSlideCategory = this.firstSlide.dataset.sliderCategory;
      
      // Désactive toutes les catégories
      this.categoriesItems.forEach(cat => {
        cat.classList.remove('is-active', 'is-activated', 'is-desactived');
      });

      // Active la première catégorie
      const firstCategory = this.categoriesItems.find(
        cat => cat.dataset.categorySlug === firstSlideCategory
      );
      
      if (firstCategory) {
        firstCategory.classList.add('is-active');
        // Remet la position Y de la catégorie
        gsap.set(firstCategory, { yPercent: -100 });
      }
    } else {
      // Fallback sur l'ancienne logique si firstSlide n'existe pas
      this.sliderItems.forEach((item, index) => {
        if (index === 0) {
          item.classList.add('is-active-panel');
        } else {
          item.classList.remove('is-active-panel');
        }
      });

      // Active la catégorie de la première slide
      if (this.sliderItems.length > 0) {
        const firstSlideCategory = this.sliderItems[0].dataset.sliderCategory;
        
        // Désactive toutes les catégories
        this.categoriesItems.forEach(cat => {
          cat.classList.remove('is-active', 'is-activated', 'is-desactived');
        });

        // Active la première catégorie
        const firstCategory = this.categoriesItems.find(
          cat => cat.dataset.categorySlug === firstSlideCategory
        );
        
        if (firstCategory) {
          firstCategory.classList.add('is-active');
          // Remet la position Y de la catégorie
          gsap.set(firstCategory, { yPercent: -100 });
        }
      }
    }

    // Remet l'indicateur au début
    if (this.indicatorBall) {
      gsap.set(this.indicatorBall, { left: '0%' });
    }

  }

  /**
   * Trie les éléments par leur attribut data-slider-order
   * @param {Array} items - Liste des éléments à trier
   * @return {Array} - Liste triée
   */
  sortItemsByOrder(items) {
    return items.sort((a, b) => {
      const orderA = parseInt(a.dataset.sliderOrder);
      const orderB = parseInt(b.dataset.sliderOrder);
      return orderA - orderB;
    });
  }

  /**
   * Récupère un nombre spécifique d'items triés par ordre
   * @param {number} count - Nombre d'items à récupérer
   * @return {Array} - Liste des premiers items triés
   */
  getFirstItems(count) {
    if (!count || count <= 0) {
      logger.warn('⚠️ Nombre d\'items invalide:', count);
      return [];
    }

    // S'assurer que les items sont triés avant de les retourner
    const sortedItems = this.sortItemsByOrder([...this.sliderItems]);
    
    // Limiter le nombre d'items au maximum disponible
    const maxItems = Math.min(count, sortedItems.length - 1);
    const selectedItems = sortedItems.slice(1, maxItems);
    
    logger.debug(`📋 Récupération de ${selectedItems.length}/${sortedItems.length} items triés`);
    
    return selectedItems;
  }

  /**
   * Met à jour la position de la boule indicatrice selon la slide active
   * Calcule la position proportionnelle dans la catégorie active
   */
  updateIndicatorBall() {
    // Trouve la slide actuellement active
    const activePanel = document.querySelector('.slider-panel_item.is-active-panel');
    if (!activePanel || !this.indicatorBall || !this.indicatorTrack) return;

    // Récupère la catégorie de la slide active
    const activeCategory = activePanel.dataset.sliderCategory;
    
    // Trouve toutes les slides de cette catégorie dans l'ordre DOM (incluant first, excluant last)
    const panelsInCategory = Array.from(document.querySelectorAll('.slider-panel_item'))
      .filter(item => item.dataset.sliderCategory === activeCategory && !item.classList.contains('is-last'));

    // Calcule la position de la slide active dans sa catégorie
    const activeIndex = panelsInCategory.indexOf(activePanel);
    const total = panelsInCategory.length;
    
    // Debug pour comprendre le problème
    logger.debug(`🎯 updateIndicatorBall: 
      - Active panel: ${activePanel.classList.contains('is-first') ? 'FIRST' : 'NORMAL'} 
      - Category: ${activeCategory}
      - Index in category: ${activeIndex}/${total-1}
      - Panels in category: ${panelsInCategory.length}`);
    
    if (total < 2 || activeIndex === -1) return; // Évite la division par zéro et les index invalides
    
    // Calcule le pourcentage de progression (0% = début, 100% = fin)
    const percent = activeIndex / (total - 1);

    logger.debug(`🎯 Indicator moving to: ${percent * 100}%`);

    // Anime la boule vers sa nouvelle position
    gsap.to(this.indicatorBall, {
      left: `${percent * 100}%`,
      duration: CONFIG.ANIMATION.DURATION,
      ease: CONFIG.ANIMATION.EASE
    });
  }

  /**
   * Organise les slides dans l'ordre défini par data-slider-order
   * Place la slide de fin à la fin
   */
  setupSliderOrder() {
    const sorted = this.sortItemsByOrder(this.sliderItems);
    const sliderList = document.querySelector(CONFIG.SELECTORS.SLIDER_LIST);
    
    // Ajoute chaque slide triée au container
    sorted.forEach((item) => sliderList.appendChild(item));
    // Ajoute la slide de fin en dernier
    sliderList.appendChild(this.lastSlide);
    // Ajoute la slide de début en premier et ajoute les data-attributes nécessaire
    this.firstSlide.dataset.sliderOrder = 0;
    this.firstSlide.dataset.sliderCategory = sorted[0].dataset.sliderCategory;
    sliderList.prepend(this.firstSlide);
  }

  /**
   * Configure les triggers ScrollTrigger pour chaque slide
   * Gère l'activation/désactivation des slides et l'indicateur
   * S'adapte à l'orientation (horizontal/vertical)
   */
  setupIndicatorBall() {
    const isHorizontal = this.currentOrientation === "horizontal";
    
    // Récupère toutes les slides interactives (incluant firstSlide, excluant lastSlide)
    const allInteractiveSlides = [...this.sliderItems];
    if (this.firstSlide) {
      allInteractiveSlides.unshift(this.firstSlide); // Ajoute la première slide au début
    }
    
    allInteractiveSlides.forEach((item) => {
      // Configuration adaptée selon l'orientation
      const triggerConfig = isHorizontal ? {
        trigger: item,
        start: "left 25%",               // Mode horizontal
        end: "right 25%",
        horizontal: true,
        toggleClass: {
          targets: item,
          className: "is-active-panel",
        },
        onEnter: () => {
          this.makeCategoryActive(item);
          this.updateIndicatorBall();
        },
        onEnterBack: () => {
          this.makeCategoryActive(item);
          this.updateIndicatorBall();
        },
      } : {
        trigger: item,
        start: "top 25%",                // Mode vertical
        end: "bottom 25%",
        horizontal: false,               // Mode vertical
        toggleClass: {
          targets: item,
          className: "is-active-panel",
        },
        onEnter: () => {
          this.makeCategoryActive(item);
          this.updateIndicatorBall();
        },
        onEnterBack: () => {
          this.makeCategoryActive(item);
          this.updateIndicatorBall();
        },
      };

      // Crée un trigger ScrollTrigger pour chaque slide
      ScrollTrigger.create(triggerConfig);
    });
  }

  /**
   * Crée toutes les animations liées au scroll pour chaque slide
   * S'adapte automatiquement à l'orientation (horizontal/vertical)
   */
  rebuildScrollSystem() {
    this.destroyScrollTriggers();
    const isHorizontal = this.currentOrientation === 'horizontal';
    this.getInteractiveSlides().forEach(item => this.createAnimationsForItem(item, isHorizontal));
    this.setupIndicatorBall();
  }

  /**
   * Crée les animations pour le mode horizontal
   * @param {HTMLElement} item - La slide à animer
   */
  createAnimationsForItem(item, isHorizontal) {
    if (!isHorizontal) {
      // Mode vertical : pas d'animation de translation (design original)
      return;
    }
    // Timeline de fond + snap
    gsap.timeline({
      scrollTrigger: {
        trigger: item,
        start: 'left right',
        end: 'left left',
        scrub: true,
        horizontal: true,
        snap: { snapTo: [0,0.5,1], duration: CONFIG.ANIMATION.SNAP_DURATION, ease: CONFIG.ANIMATION.SNAP_EASE }
      }
    });
    // Translation
    gsap.fromTo(item,{xPercent:0,yPercent:0},{
      xPercent:100,
      ease:'none',
      scrollTrigger:{
        trigger:item,
        start:'left left',
        end:'right left',
        scrub:true,
        horizontal:true
      }
    });
  }

  /**
   * NOUVEAU : Mode dégradé pour les changements d'orientation rapides
   */
  setupDegradedMode(orientation) {
    logger.info(' SliderManager: Activation du mode dégradé');
    
    // Détruit les animations existantes
    this.destroyScrollTriggers();
    
    // Récupère toutes les slides interactives (incluant firstSlide, excluant lastSlide)
    const allInteractiveSlides = [...this.sliderItems];
    if (this.firstSlide) {
      allInteractiveSlides.unshift(this.firstSlide);
    }
    
    // Crée seulement les animations essentielles (sans snap coûteux)
    allInteractiveSlides.forEach((item) => {
      if (orientation === "horizontal") {
        this.createLightweightHorizontalAnimations(item);
      } else {
        this.createLightweightVerticalAnimations(item);
      }
    });
    
    // Indicateur simplifié
    this.setupLightweightIndicator();
  }

  /**
   * NOUVEAU : Animations horizontales allégées (sans snap)
   */
  createLightweightHorizontalAnimations(item) {
    // Animation de déplacement simplifiée (sans snap coûteux)
    gsap.fromTo(
      item,
      { xPercent: 0, yPercent: 0 },
      {
        xPercent: 100,
        ease: "none",
        scrollTrigger: {
          trigger: item,
          start: "left left",
          end: "right left",
          scrub: true,
          horizontal: true,
          // PAS DE SNAP en mode dégradé
        },
      }
    );
  }

  /**
   * NOUVEAU : Animations verticales allégées
   */
  createLightweightVerticalAnimations(item) {
    // Pas d'animations en mode vertical dégradé pour éviter les conflits
    // Seul le système d'activation des slides est conservé
  }

  /**
   * NOUVEAU : Indicateur allégé
   */
  setupLightweightIndicator() {
    const isHorizontal = this.currentOrientation === "horizontal";
    
    // Récupère toutes les slides interactives (incluant firstSlide, excluant lastSlide)
    const allInteractiveSlides = [...this.sliderItems];
    if (this.firstSlide) {
      allInteractiveSlides.unshift(this.firstSlide);
    }
    
    allInteractiveSlides.forEach((item) => {
      ScrollTrigger.create({
        trigger: item,
        start: isHorizontal ? "left 25%" : "top 25%",
        end: isHorizontal ? "right 25%" : "bottom 25%",
        horizontal: isHorizontal,
        toggleClass: {
          targets: item,
          className: "is-active-panel",
        },
        // PAS d'animations coûteuses en mode dégradé
        onEnter: () => {
          this.makeCategoryActive(item);
          this.updateIndicatorBall();
        },
        onEnterBack: () => {
          this.makeCategoryActive(item);
          this.updateIndicatorBall();
        },
      });
    });
  }

  /**
   * Crée les animations pour le mode vertical
   * @param {HTMLElement} item - La slide à animer
   */
  // createVerticalAnimations supprimé (logique fusionnée dans createAnimationsForItem)

  /**
   * Gère l'activation des catégories selon la slide active
   * @param {HTMLElement} item - La slide qui vient d'être activée
   */
  makeCategoryActive(item) {
    // Trouve la catégorie actuellement active
    const activeCategory = this.categoriesItems.find(
      (cat) => cat.classList.contains("is-active") || cat.classList.contains("is-activated")
    );

    if (activeCategory) {
      // Si la catégorie active correspond à la slide, ne rien faire
      if (item.dataset.sliderCategory === activeCategory.dataset.categorySlug) {
        return;
      } else {
        // Sinon, changer de catégorie active
        this.deactivateCategory(activeCategory);
        this.activateCategory(item.dataset.sliderCategory);
      }
    } else {
      // Aucune catégorie active, en activer une
      this.activateCategory(item.dataset.sliderCategory);
    }
  }

  /**
   * Désactive une catégorie avec animation
   * @param {HTMLElement} category - La catégorie à désactiver
   */
  deactivateCategory(category) {
    category.classList.remove("is-active");
    category.classList.add("is-desactived");

    // Animation de sortie : déplace la catégorie vers le haut
    gsap.fromTo(
      category,
      { yPercent: -100 },              // Position actuelle
      {
        yPercent: -201,                // Sort complètement de l'écran
        duration: CONFIG.ANIMATION.DURATION,
        ease: CONFIG.ANIMATION.EASE,
        onComplete: () => {
          // Nettoie les classes à la fin de l'animation
          category.classList.remove("is-desactivated");
        },
      }
    );
  }

  /**
   * Active une catégorie avec animation
   * @param {string} categorySlug - L'identifiant de la catégorie à activer
   */
  activateCategory(categorySlug) {
    // Trouve la catégorie à activer
    const categoryToActivate = this.categoriesItems.find(
      (cat) => cat.dataset.categorySlug === categorySlug
    );

    if (!categoryToActivate) return;

    categoryToActivate.classList.add("is-activated");

    // Animation d'entrée : fait remonter la catégorie
    gsap.fromTo(
      categoryToActivate,
      { yPercent: 0 },                 // Position de départ (en bas)
      {
        yPercent: -100,                // Position finale (visible)
        duration: CONFIG.ANIMATION.DURATION,
        ease: CONFIG.ANIMATION.EASE,
        onComplete: () => {
          // Finalise l'activation à la fin de l'animation
          categoryToActivate.classList.remove("is-activated");
          categoryToActivate.classList.add("is-active");
        },
      }
    );
  }

  /**
   * Gère l'insertion automatique des éléments CMS avec data-insert-to-item
   * vers les listes correspondantes avec data-insert-to-list
   */
  handleDynamicTagInsertion() {
    // Récupère tous les éléments à insérer
    const itemsToInsert = document.querySelectorAll('[data-insert-to-item]');
    
    if (itemsToInsert.length === 0) {
      return;
    }

    itemsToInsert.forEach(item => {
      const targetListId = item.getAttribute('data-insert-to-item');
      
      if (!targetListId) {
        return;
      }

      // Trouve la liste de destination correspondante
      const targetList = document.querySelector(`[data-insert-to-list="${targetListId}"]`);
      
      if (!targetList) {
        return;
      }

      try {
        // Déplace l'élément vers la liste de destination
        targetList.appendChild(item);
      } catch (error) {
        return;
      }
    });
  }

  /**
   * Détruit seulement les ScrollTriggers liés à ce gestionnaire
   */
  destroyScrollTriggers() {
    const allInteractiveSlides = this.getInteractiveSlides();
    ScrollTrigger.getAll().forEach(trigger => {
      if (trigger.vars.trigger && allInteractiveSlides.includes(trigger.vars.trigger)) {
        trigger.kill();
      }
    });
  }

  getInteractiveSlides() {
    const arr = [...this.sliderItems];
    if (this.firstSlide && !arr.includes(this.firstSlide)) arr.unshift(this.firstSlide);
    return arr;
  }

  /**
   * Nettoie les event listeners et les animations
   */
  destroy() {
    // Se désabonner du gestionnaire centralisé d'orientation
    if (window.orientationManager) {
      window.orientationManager.unsubscribe('SliderManager');
    }
    
    // Nettoie l'event listener d'orientation (fallback)
    if (this.removeOrientationListener) {
      this.removeOrientationListener();
    }
    
    // Tue tous les ScrollTriggers liés aux slides
    this.destroyScrollTriggers();
  }
}
