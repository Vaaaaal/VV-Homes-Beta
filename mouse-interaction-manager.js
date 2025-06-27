// ==========================================
// GESTIONNAIRE DES INTERACTIONS SOURIS
// ==========================================
import { CONFIG } from './config.js';

/**
 * Gère tous les effets de survol (hover) sur les slides :
 * - Animations des overlays et informations
 * - Effets de transition avec GSAP Flip
 * - Animations des icônes
 * - Gestion des états actifs/inactifs
 */
export class MouseInteractionManager {
  constructor(sliderItems) {
    this.sliderItems = sliderItems;
  }

  /**
   * Initialise les événements de survol pour toutes les slides
   */
  init() {
    this.sliderItems.forEach((item) => {
      // Écoute l'entrée de la souris sur chaque slide
      item.addEventListener("mouseenter", () => this.handleMouseEnter(item));
      // Écoute la sortie de la souris de chaque slide
      item.addEventListener("mouseleave", () => this.handleMouseLeave(item));
    });
  }

  /**
   * Gère l'effet de survol quand la souris entre sur une slide
   * @param {HTMLElement} item - La slide survolée
   */
  handleMouseEnter(item) {
    const elements = this.getItemElements(item);
    const allOverlays = gsap.utils.toArray(".slider-panel_overlay");
    const allInfos = gsap.utils
      .toArray(".slider-panel_infos")
      .filter((el) => !el.classList.contains("is-last"));

    // Sauvegarde l'état actuel des tags pour l'animation Flip
    const tagState = Flip.getState(elements.tags);

    // Active tous les overlays (assombrit les autres slides)
    allOverlays.forEach((overlay) => overlay.classList.add("is-active"));
    // Rend inactives toutes les infos (masque les infos des autres slides)
    allInfos.forEach((info) => info.classList.add("is-inactive"));

    // Désactive l'overlay de la slide courante (la rend visible)
    elements.overlay.classList.remove("is-active");
    // Active les infos de la slide courante
    elements.infos.classList.remove("is-inactive");
    // Active les tags de la slide courante
    elements.tags.classList.add("is-active");

    // Anime les icônes vers le haut avec un délai
    this.animateIcons(elements.topIcon, elements.bottomIcon, -100);

    // Lance l'animation Flip pour les tags (transition fluide)
    Flip.from(tagState, { 
      duration: 0.3, 
      delay: 0.15, 
      ease: CONFIG.ANIMATION.EASE 
    });
  }

  /**
   * Gère l'effet quand la souris quitte une slide
   * @param {HTMLElement} item - La slide quittée
   */
  handleMouseLeave(item) {
    const elements = this.getItemElements(item);
    const allOverlays = gsap.utils.toArray(".slider-panel_overlay");
    const allInfos = gsap.utils
      .toArray(".slider-panel_infos")
      .filter((el) => !el.classList.contains("is-last"));

    // Sauvegarde l'état des tags pour l'animation de retour
    const tagState = Flip.getState(elements.tags);

    // Remet tout à l'état normal
    allOverlays.forEach((overlay) => overlay.classList.remove("is-active"));
    allInfos.forEach((info) => info.classList.remove("is-inactive"));
    elements.tags.classList.remove("is-active");

    // Remet les icônes à leur position originale
    this.animateIcons(elements.topIcon, elements.bottomIcon, 0);

    // Animation de retour plus rapide
    Flip.from(tagState, { 
      duration: 0.2, 
      ease: "power2.in" 
    });
  }

  /**
   * Récupère tous les éléments importants d'une slide
   * @param {HTMLElement} item - La slide à analyser
   * @return {Object} - Objet contenant tous les éléments
   */
  getItemElements(item) {
    return {
      tags: item.querySelector(".slider-panel_infos_tags"),        // Tags/étiquettes
      overlay: item.querySelector(".slider-panel_overlay"),       // Overlay sombre
      infos: item.querySelector(".slider-panel_infos"),          // Informations de la slide
      topIcon: item.querySelector(".slider-panel_icon_inner.is-top"),    // Icône du haut
      bottomIcon: item.querySelector(".slider-panel_icon_inner.is-bottom") // Icône du bas
    };
  }

  /**
   * Anime les icônes d'une slide (haut et bas)
   * @param {HTMLElement} topIcon - Icône du haut
   * @param {HTMLElement} bottomIcon - Icône du bas
   * @param {number} yPercent - Position Y en pourcentage (-100 = vers le haut, 0 = position normale)
   */
  animateIcons(topIcon, bottomIcon, yPercent) {
    // Ajoute un délai uniquement quand les icônes montent
    const delay = yPercent === -100 ? 0.15 : 0;
    
    // Anime l'icône du haut
    gsap.to(topIcon, {
      yPercent,
      duration: CONFIG.ANIMATION.DURATION,
      delay,
      ease: CONFIG.ANIMATION.EASE,
    });
    
    // Anime l'icône du bas avec les mêmes paramètres
    gsap.to(bottomIcon, {
      yPercent,
      duration: CONFIG.ANIMATION.DURATION,
      delay,
      ease: CONFIG.ANIMATION.EASE,
    });
  }
}
