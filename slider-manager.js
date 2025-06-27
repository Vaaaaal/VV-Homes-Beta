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
  }

  /**
   * Initialise tous les composants du slider
   */
  init() {
    this.setupSliderOrder();     // Organise l'ordre des slides
    this.createScrollAnimations(); // Crée les animations de scroll
    this.setupIndicatorBall();   // Configure l'indicateur de progression
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
   */
  setupIndicatorBall() {
    this.sliderItems.forEach((item) => {
      // Crée un trigger ScrollTrigger pour chaque slide
      ScrollTrigger.create({
        trigger: item,                    // Élément déclencheur
        start: "left 25%",               // Début : quand le côté gauche atteint 25% de l'écran
        end: "right 25%",                // Fin : quand le côté droit atteint 25% de l'écran
        horizontal: true,                // Mode horizontal
        toggleClass: {
          targets: item,
          className: "is-active-panel",  // Ajoute/retire la classe "is-active-panel"
        },
        onEnter: () => {
          this.makeCategoryActive(item); // Active la catégorie correspondante
          this.updateIndicatorBall();   // Met à jour l'indicateur
        },
        onEnterBack: () => {
          this.makeCategoryActive(item); // Active la catégorie (scroll inverse)
          this.updateIndicatorBall();   // Met à jour l'indicateur
        },
      });
    });
  }

  /**
   * Crée toutes les animations liées au scroll pour chaque slide
   */
  createScrollAnimations() {
    this.sliderItems.forEach((item) => {
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
    });
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
}
