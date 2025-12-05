// ==========================================
// GESTIONNAIRE DES MODALES
// ==========================================
import { CONFIG } from './config.js';

/**
 * Gère toute la logique des modales :
 * - Ouverture/fermeture des modales
 * - Animations d'entrée et de sortie
 * - Gestion des événements de clic
 * - Association entre triggers et modales via data-attributes
 */
export class ModalManager {
  constructor() {
  // constructor(swiperManager = null) {
    // Récupère tous les éléments déclencheurs de modales
    this.modalTriggers = gsap.utils.toArray(CONFIG.SELECTORS.MODAL_TRIGGERS);
    
    // Récupère tous les éléments modales
    this.modalItems = gsap.utils.toArray(CONFIG.SELECTORS.MODAL_ITEMS);
    
    // Récupère tous les boutons de fermeture de modales
    this.modalCloseButtons = gsap.utils.toArray(CONFIG.SELECTORS.MODAL_CLOSE);
    
    // Stocke la modale actuellement ouverte
    this.currentModal = null;
    
    // Stocke l'état d'initialisation
    this.isInitialized = false;

    // Référence au gestionnaire de swipers
    // this.swiperManager = swiperManager;
  }

  /**
   * Initialise le gestionnaire de modales
   */
  async init() {
    if (this.isInitialized) return;
    
    try {
      // Attendre que Finsweet Attributes List Nest soit chargé
      await this.waitForFinsweetAttributes();
      
      this.setupEventListeners();
      this.setupInitialState();
      this.isInitialized = true;
      
    } catch (error) {
      return;
    }
  }

  /**
   * Attend que Finsweet Attributes List Nest soit chargé
   * @returns {Promise<void>}
   */
  async waitForFinsweetAttributes() {
    return new Promise((resolve) => {
      // Initialise le système global Finsweet Attributes
      window.FinsweetAttributes ||= [];
      
      // Attendre que List Nest soit chargé
      window.FinsweetAttributes.push([
        'list',
        async (listInstances) => {
          // Attendre que toutes les instances soient chargées
          const loadingPromises = listInstances.map(async (instance) => {
            if (instance.loadingPaginatedItems) {
              await instance.loadingPaginatedItems;
            }
          });
          
          await Promise.all(loadingPromises);
          resolve();
        }
      ]);
    });
  }

  /**
   * Configure l'état initial des modales
   */
  setupInitialState() {
    this.modalItems.forEach(modal => {
      const modalContent = modal.querySelector('.slider-panel_modal_content');

      // S'assure que toutes les modales sont cachées au départ
      gsap.set(modal, {
        display: 'none',
        opacity: 0,
      });

      gsap.set(modalContent, {
        opacity: 0,
        scale: 0.8, // Optionnel : ajoute un effet de zoom
      });
    });
  }

  /**
   * Configure les écouteurs d'événements
   */
  setupEventListeners() {
    // Ajoute un écouteur de clic sur chaque trigger
    this.modalTriggers.forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const modalId = trigger.dataset.modalTrigger;
        // const modalContent = trigger.dataset.modalFolder || null;
        let modalContent;

        if(trigger.dataset.modalFolder) {
          modalContent = trigger.closest('.menu_panel_item')?.dataset.name || null;
        }

        this.openModal(modalId, modalContent);
      });
    });

    // Ajoute un écouteur de clic sur chaque bouton de fermeture
    this.modalCloseButtons.forEach(closeButton => {
      closeButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const modalId = closeButton.dataset.modalClose;
        this.closeModal(modalId);
      });
    });

    // Ajoute un écouteur pour fermer les modales en cliquant à l'extérieur
    document.addEventListener('click', (e) => {
      if (this.currentModal && !this.currentModal.contains(e.target)) {
        // Vérifie aussi que le clic n'est pas sur un trigger ou un bouton de fermeture
        const isClickOnTrigger = this.modalTriggers.some(trigger => trigger.contains(e.target));
        const isClickOnCloseButton = this.modalCloseButtons.some(closeBtn => closeBtn.contains(e.target));
        
        if (!isClickOnTrigger && !isClickOnCloseButton) {
          this.closeCurrentModal();
        }
      }
    });

    // Ferme la modale avec la touche Échap
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.currentModal) {
        this.closeCurrentModal();
      }
    });
  }

  /**
   * Trouve une modale par son identifiant
   * @param {string} modalId - L'identifiant de la modale à trouver
   * @return {HTMLElement|null} - L'élément modale ou null si non trouvé
   */
  findModalById(modalId) {
    return this.modalItems.find(modal => modal.dataset.modalItem === modalId) || null;
  }

  /**
   * Ouvre une modale avec animation
   * @param {string} modalId - L'identifiant de la modale à ouvrir
   */
  openModal(modalId, modalContent = null) {
    // Ferme la modale actuelle s'il y en a une
    if (this.currentModal) {
      this.closeCurrentModal();
    }

    // Trouve la modale à ouvrir
    const modalToOpen = this.findModalById(modalId);
    
    if (!modalToOpen) {
      return;
    }

    if(modalContent && window.innerWidth <= 480) {
      return; // Ne pas ouvrir la modale si le contenu est spécifique et que la largeur de l'écran est <= 480px
    }

    if(modalContent) {
      // Si un contenu spécifique est fourni, on cherche le contenu des previews qu'il faut lui créer grâce à data-modal-folder et au dossier
      const folder = document.querySelector(`.menu_panel .menu_panel_item[data-name="${modalContent}"]`);
      
      if (folder) {
        const title = folder.querySelector('.menu_panel_item_title:not(.w-condition-invisible)').innerHTML;
        const content = folder.querySelector('.menu_panel_collection_list.is-preview');

        // Met à jour le titre de la modale
        modalToOpen.querySelector('.slider-panel_modal_title').innerHTML = title;

        if (content) {
          // Met à jour le contenu de la modale avec le contenu du dossier
          const folderContentElement = gsap.utils.toArray(content.querySelectorAll('.menu-preview_wrap'));
          // Récupération des swipers initié dans swiper-manager
          // const swiperMain = this.swiperManager?.get('modal-previews-1');

          // if (this.swiperManager.has('modal-previews-1')) {
          //   // Prépare les slides
          //   const slides = folderContentElement.map(item => item);
            
          //   // Met à jour les swipers avec le nouveau contenu
          //   // Détruit d'abord les slides existants
          //   swiperMain.removeAllSlides();
            
          //   // Ajoute les nouveaux slides
          //   slides.forEach((slideContent, index) => {
          //     const slideContentCopy = slideContent.cloneNode(true);
          //     const content = document.createElement('div');
          //     content.classList.add('modal-preview-content');

          //     const title = slideContentCopy.querySelector(".menu-preview_title");
          //     title.classList.add("modal-preview_title");
          //     title.classList.remove("menu-preview_title");
          //     title.classList.remove("text-size-xsmall");
          //     content.append(title);

          //     const mediaSource = slideContentCopy.querySelector(".media_source");
          //     const mediaSourceCopy = mediaSource.cloneNode(true);
          //     mediaSourceCopy.classList.add("is-preview-modal");
          //     content.append(mediaSourceCopy);
          //     mediaSource.remove();


          //     // slideContentCopy.querySelector(".menu-preview_cover_wrap").classList.add("modal-preview_cover_wrap");
          //     const image = slideContentCopy.querySelector(".menu-preview_cover_wrap").cloneNode(true);
          //     image.querySelector("img").classList.add("modal-preview_cover");
          //     image.classList.add("modal-preview_cover_wrap");
          //     image.classList.remove("menu-preview_cover_wrap");
          //     slideContentCopy.querySelector(".menu-preview_cover_wrap").remove();
          //     slideContentCopy.prepend(image);
              
          //     // slideContentCopy.querySelector(".menu-preview_cover").classList.add("modal-preview_cover");
          //     // slideContentCopy.querySelector(".menu-preview_cover").classList.remove("menu-preview_cover");

          //     // Traite le contenu pour retirer media_source pour le deuxième swiper
          //     // const mediaSource = slideContentCopy.querySelector(".media_source");
          //     // const mediaSourceCopy = mediaSource.cloneNode(true);
          //     // mediaSourceCopy.classList.add("is-preview-modal");
          //     // slideContentCopy.prepend(mediaSourceCopy);
          //     // mediaSource.remove();

          //     swiperMain.appendSlide(`<div class="swiper-slide is-preview is-${index + 1}">
          //       <div class="modal-preview-background"></div>
          //       <div class="modal-preview-element">
          //         <div></div>
          //         ${slideContentCopy.innerHTML}
          //         <div class="modal-preview-content">${content.innerHTML}</div>
          //       </div>
          //     </div>`);
          //   });
            
          //   // Met à jour les swipers
          //   swiperMain.update();
          // }
        }
      }
    }

    // Marque cette modale comme active
    this.currentModal = modalToOpen;

    // Animation d'ouverture
    const timeline = gsap.timeline();
    
    timeline
      .set(modalToOpen, { display: 'flex' })  // Affiche la modale
      .to(modalToOpen, {
        opacity: 1,
        duration: CONFIG.ANIMATION.DURATION,
        ease: CONFIG.ANIMATION.EASE.POWER2.OUT
      })
      .to(modalToOpen.querySelector('.slider-panel_modal_content'), {
        opacity: 1,
        scale: 1,
        duration: CONFIG.ANIMATION.DURATION,
        ease: CONFIG.ANIMATION.EASE.POWER2.OUT,
      }, "<"); // En même temps que l'opacité

  }

  /**
   * Ferme la modale actuellement ouverte
   */
  closeCurrentModal() {
    if (!this.currentModal) return;

    const modalToClose = this.currentModal;

    const timeline = gsap.timeline();
    
    // Animation de fermeture
    timeline.to(modalToClose.querySelector('.slider-panel_modal_content'), {
      opacity: 0,
      scale: 0.8,
      duration: CONFIG.ANIMATION.DURATION,
      ease: CONFIG.ANIMATION.EASE.POWER2.IN,
      onComplete: () => {
        // Cache complètement la modale à la fin de l'animation
        gsap.set(modalToClose, { display: 'none' });

        // Récupération des swipers initié dans swiper-manager
        // const swiperMain = this.swiperManager?.get('modal-previews-1');

        // if (this.swiperManager.has('modal-previews-1')) {
        //   // Met à jour les swipers avec un contenu loader
        //   // Détruit d'abord les slides existants
        //   swiperMain.removeAllSlides();
          
        //   // Ajoute les nouveaux slides
        //   for (let i = 0; i < 5; i++) {
        //     swiperMain.appendSlide(`<div class="swiper-slide is-preview"><div class="loader"></div></div>`);
        //   };
          
        //   // Met à jour les swipers
        //   swiperMain.update();
        // }
      }
    });

    this.currentModal = null;
  }

  /**
   * Ferme une modale spécifique par son ID
   * @param {string} modalId - L'identifiant de la modale à fermer
   */
  closeModal(modalId) {
    const modal = this.findModalById(modalId);
    if (modal && modal === this.currentModal) {
      this.closeCurrentModal();
    }
  }

  /**
   * Vérifie si une modale est actuellement ouverte
   * @return {boolean} - True si une modale est ouverte
   */
  isModalOpen() {
    return this.currentModal !== null;
  }

  /**
   * Retourne l'ID de la modale actuellement ouverte
   * @return {string|null} - L'ID de la modale ouverte ou null
   */
  getCurrentModalId() {
    return this.currentModal ? this.currentModal.dataset.modalItem : null;
  }

  /**
   * Nettoie les événements (utile pour la destruction de l'instance)
   */
  destroy() {
    // Ferme la modale actuelle
    if (this.currentModal) {
      this.closeCurrentModal();
    }

    // Supprime les écouteurs d'événements
    this.modalTriggers.forEach(trigger => {
      trigger.removeEventListener('click', this.handleTriggerClick);
    });

    // Remet les modales à leur état initial
    this.modalItems.forEach(modal => {
      gsap.set(modal, { display: 'none', opacity: 0, scale: 1 });
    });

    this.isInitialized = false;
  }
}
