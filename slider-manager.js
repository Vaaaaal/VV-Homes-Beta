// ==========================================
// GESTIONNAIRE DU SLIDER PRINCIPAL
// ==========================================
import { CONFIG } from './config.js';

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
    
    // Éléments de l'indicateur de progression
    this.indicatorBall = document.querySelector(CONFIG.SELECTORS.INDICATOR_BALL);
    this.indicatorTrack = document.querySelector(CONFIG.SELECTORS.INDICATOR_TRACK);
    
    // Détection de l'orientation actuelle
    this.currentOrientation = this.getCurrentOrientation();
    
    // Event listener pour les changements d'orientation
    this.setupOrientationListener();
  }

  /**
   * Initialise tous les composants du slider
   */
  init() {
    this.resetSliderToStart();    // Remet le slider au début
    this.setupSliderOrder();     // Organise l'ordre des slides
    this.handleDynamicTagInsertion(); // Gère l'insertion des tags dynamiques CMS
    this.createScrollAnimations(); // Crée les animations de scroll
    this.setupIndicatorBall();   // Configure l'indicateur de progression
  }

  /**
   * Détermine l'orientation actuelle basée sur la taille d'écran
   * @returns {string} "horizontal" ou "vertical"
   */
  getCurrentOrientation() {
    // Utilise WindowUtils si disponible, sinon fallback sur window.innerWidth
    const isDesktop = window.WindowUtils ? 
      window.WindowUtils.isDesktop() : 
      window.innerWidth >= 992; // 992px comme seuil pour desktop
    
    return isDesktop ? "horizontal" : "vertical";
  }

  /**
   * Configure l'écoute des changements d'orientation
   */
  setupOrientationListener() {
    if (window.WindowUtils) {
      this.removeOrientationListener = window.WindowUtils.onBreakpointChange(() => {
        this.handleOrientationChange();
      });
    } else {
      // Fallback basique avec debounce manuel
      let resizeTimeout;
      const handleResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          this.handleOrientationChange();
        }, 250);
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
  handleOrientationChange() {
    const newOrientation = this.getCurrentOrientation();
    
    if (newOrientation !== this.currentOrientation) {
      this.currentOrientation = newOrientation;
      
      // Tue tous les ScrollTriggers existants
      ScrollTrigger.getAll().forEach(trigger => {
        if (trigger.vars.trigger && this.sliderItems.includes(trigger.vars.trigger)) {
          trigger.kill();
        }
      });
      
      // Recrée les animations avec la nouvelle orientation
      this.createScrollAnimations();
      this.setupIndicatorBall();
      
      // Rafraîchit ScrollTrigger
      ScrollTrigger.refresh();
    }
  }

  /**
   * Remet le slider à sa position initiale (première slide)
   * Utile lors du chargement de la page pour éviter que le slider soit déjà entamé
   */
  resetSliderToStart() {
    // Trouve le container principal du slider
    const sliderContainer = document.querySelector(CONFIG.SELECTORS.SLIDER_LIST);
    if (!sliderContainer) return;

    // Remet le scroll horizontal à 0 (début)
    sliderContainer.scrollLeft = 0;

    // Remet également window.scrollX à 0 pour être sûr
    window.scrollTo(0, window.scrollY);

    // Active la première slide et désactive toutes les autres
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
   * Met à jour la position de la boule indicatrice selon la slide active
   * Calcule la position proportionnelle dans la catégorie active
   */
  updateIndicatorBall() {
    // Trouve la slide actuellement active
    const activePanel = document.querySelector('.slider-panel_item.is-active-panel');
    if (!activePanel || !this.indicatorBall || !this.indicatorTrack) return;

    // Récupère la catégorie de la slide active
    const activeCategory = activePanel.dataset.sliderCategory;
    
    // Trouve toutes les slides de cette catégorie (sauf la dernière)
    const panelsInCategory = Array.from(document.querySelectorAll('.slider-panel_item'))
      .filter(item => item.dataset.sliderCategory === activeCategory && !item.classList.contains('is-last'));

    // Calcule la position de la slide active dans sa catégorie
    const activeIndex = panelsInCategory.indexOf(activePanel);
    const total = panelsInCategory.length;
    
    if (total < 2) return; // Évite la division par zéro
    
    // Calcule le pourcentage de progression (0% = début, 100% = fin)
    const percent = activeIndex / (total - 1);

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
  }

  /**
   * Configure les triggers ScrollTrigger pour chaque slide
   * Gère l'activation/désactivation des slides et l'indicateur
   * S'adapte à l'orientation (horizontal/vertical)
   */
  setupIndicatorBall() {
    const isHorizontal = this.currentOrientation === "horizontal";
    
    this.sliderItems.forEach((item) => {
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
  createScrollAnimations() {
    const isHorizontal = this.currentOrientation === "horizontal";
    
    this.sliderItems.forEach((item) => {
      if (isHorizontal) {
        this.createHorizontalAnimations(item);
      } else {
        this.createVerticalAnimations(item);
      }
    });
  }

  /**
   * Crée les animations pour le mode horizontal
   * @param {HTMLElement} item - La slide à animer
   */
  createHorizontalAnimations(item) {
    // Animation de background pendant le scroll (avec effet de snap)
    gsap.timeline({
      scrollTrigger: {
        trigger: item,
        start: "left right",    // Début : côté gauche entre dans l'écran à droite
        end: "left left",       // Fin : côté gauche atteint le côté gauche de l'écran
        scrub: true,           // Synchronise l'animation avec la vitesse de scroll
        horizontal: true,      // Mode horizontal
        snap: {
          snapTo: [0, 0.5, 1],                    // Points de snap (début, milieu, fin)
          duration: CONFIG.ANIMATION.SNAP_DURATION, // Durée du snap
          ease: CONFIG.ANIMATION.SNAP_EASE,        // Courbe d'animation du snap
        },
      },
    });

    // Animation de déplacement de la slide pendant le scroll
    gsap.fromTo(
      item,
      { xPercent: 0, yPercent: 0 },    // Position initiale (pas de décalage)
      {
        xPercent: 100,                 // Position finale (complètement à droite)
        ease: "none",                  // Animation linéaire (suit exactement le scroll)
        scrollTrigger: {
          trigger: item,
          start: "left left",          // Début : côté gauche atteint le côté gauche
          end: "right left",           // Fin : côté droit atteint le côté gauche
          scrub: true,                 // Animation liée au scroll
          horizontal: true,
        },
      }
    );
  }

  /**
   * Crée les animations pour le mode vertical
   * @param {HTMLElement} item - La slide à animer
   */
  createVerticalAnimations(item) {
    // Animation de background pendant le scroll vertical (avec effet de snap)
    // Seul le snap est conservé, sans effet de parallaxe
    
    // SCROLL SNAP TEMPORAIREMENT DÉSACTIVÉ POUR LES TESTS
    /*
    gsap.timeline({
      scrollTrigger: {
        trigger: item,
        start: "top bottom",   // Début : haut de l'élément entre par le bas de l'écran
        end: "bottom top",     // Fin : bas de l'élément sort par le haut de l'écran
        scrub: true,          // Synchronise l'animation avec la vitesse de scroll
        horizontal: false,    // Mode vertical
        snap: {
          snapTo: [0, 0.5, 1],                      // Points de snap (début, milieu, fin)
          duration: CONFIG.ANIMATION.SNAP_DURATION, // Durée du snap
          ease: CONFIG.ANIMATION.SNAP_EASE,        // Courbe d'animation du snap
        },
      },
    });
    */

    // Pas d'animation de déplacement en mode vertical pour éviter l'effet parallaxe
    // Les slides restent dans leur position naturelle avec juste le snap
  }

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
   * Nettoie les event listeners et les animations
   */
  destroy() {
    // Nettoie l'event listener d'orientation
    if (this.removeOrientationListener) {
      this.removeOrientationListener();
    }
    
    // Tue tous les ScrollTriggers liés aux slides
    ScrollTrigger.getAll().forEach(trigger => {
      if (trigger.vars.trigger && this.sliderItems.includes(trigger.vars.trigger)) {
        trigger.kill();
      }
    });
  }
}
