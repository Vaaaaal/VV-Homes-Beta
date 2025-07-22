// import Swiper from 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.mjs'

// ==========================================
// GESTIONNAIRE DES SWIPERS
// ==========================================

/**
 * Gestionnaire minimaliste pour stocker et gérer vos swipers :
 * - Vous créez les swipers vous-même
 * - Le manager les stocke et les retrouve
 * - Destruction propre
 */
export class SwiperManager {
  constructor() {
    // Map pour stocker les instances de Swiper avec leur ID
    this.swipers = new Map();
  }

  /**
   * Initialise le gestionnaire
   */
  init() {
    console.log('SwiperManager initialisé');

    // Initialisations spécifiques si nécessaire
    this.createModalPreviewsSwiper();
  }

  /**
   * Stocke un swiper que vous avez créé
   * @param {string} id - ID unique du swiper
   * @param {Object} swiperInstance - Instance Swiper que vous avez créée
   */
  store(id, swiperInstance) {
    // Détruit l'ancien swiper s'il existe
    if (this.swipers.has(id)) {
      this.destroy(id);
    }
    
    this.swipers.set(id, swiperInstance);
    console.log(`Swiper stocké: ${id}`);
  }

  /**
   * Récupère un swiper par son ID
   * @param {string} id - ID du swiper
   * @return {Object|null} - Instance Swiper
   */
  get(id) {
    return this.swipers.get(id) || null;
  }

  /**
   * Détruit un swiper spécifique
   * @param {string} id - ID du swiper à détruire
   * @return {boolean} - True si détruit avec succès
   */
  destroy(id) {
    const swiper = this.swipers.get(id);
    
    if (!swiper) {
      console.warn(`SwiperManager: Swiper ${id} non trouvé`);
      return false;
    }

    try {
      swiper.destroy(true, true);
      this.swipers.delete(id);
      console.log(`Swiper détruit: ${id}`);
      return true;
    } catch (error) {
      console.error(`Erreur destruction swiper ${id}:`, error);
      return false;
    }
  }

  /**
   * Détruit tous les swipers d'un conteneur
   * @param {HTMLElement} container - Conteneur parent
   * @return {number} - Nombre de swipers détruits
   */
  destroyInContainer(container) {
    let destroyedCount = 0;
    
    for (const [id, swiper] of this.swipers) {
      if (container.contains(swiper.el)) {
        if (this.destroy(id)) {
          destroyedCount++;
        }
      }
    }

    return destroyedCount;
  }

  /**
   * Vérifie si un swiper existe
   * @param {string} id - ID du swiper
   * @return {boolean}
   */
  has(id) {
    return this.swipers.has(id);
  }

  /**
   * Détruit tous les swipers
   */
  destroyAll() {
    for (const id of this.swipers.keys()) {
      this.destroy(id);
    }
    this.swipers.clear();
    console.log('Tous les swipers détruits');
  }

  /**
   * Retourne la liste des IDs de tous les swipers
   * @return {Array} - Tableau des IDs
   */
  getIds() {
    return Array.from(this.swipers.keys());
  }

  /**
   * Retourne le nombre de swipers actifs
   * @return {number}
   */
  count() {
    return this.swipers.size;
  }

  // ==========================================
  // CRÉATEURS DE SWIPERS SPÉCIFIQUES
  // ==========================================

  /**
   * Crée un swiper pour la modal des previews
   * @return {Object} - Instance Swiper créée
   */
  createModalPreviewsSwiper() {
    const swiperElementOne = document.querySelector('.swiper.is-previews-1');
    const swiperElementTwo = document.querySelector('.swiper.is-previews-2');

    if (!swiperElementOne || !swiperElementTwo) {
      console.warn('SwiperManager: Éléments de swiper pour les previews non trouvés');
      return null;
    }

    const idOne = 'modal-previews-1';
    const idTwo = 'modal-previews-2';

    // Crée le swiper secondaire pour les previews 2
    const swiperSecondary = new Swiper(swiperElementTwo, {
			direction: 'vertical',
      slidesPerView: 4,
      spaceBetween: 10,
      loop: true,
      watchSlidesProgress: true,
    });

    // Crée le swiper principal pour les previews 1
    const swiperMain = new Swiper(swiperElementOne, {
      slidesPerView: 1,
      spaceBetween: 10,
      loop: true,
			// autoHeight: true,
      navigation: {
        nextEl: swiperElementOne.querySelector('.swiper-button-next'),
        prevEl: swiperElementOne.querySelector('.swiper-button-prev'),
      },
      thumbs: {
        swiper: swiperSecondary,
      },
    });
    
    this.store(idTwo, swiperSecondary);
    this.store(idOne, swiperMain);

    return swiperElementOne && swiperElementTwo;
  }
}
