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
  }

  /**
   * Initialise le gestionnaire de modales
   */
  init() {
    if (this.isInitialized) return;
    
    this.setupEventListeners();
    this.setupInitialState();
    this.isInitialized = true;
    
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
        this.openModal(modalId);
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
  openModal(modalId) {
    // Ferme la modale actuelle s'il y en a une
    if (this.currentModal) {
      this.closeCurrentModal();
    }

    // Trouve la modale à ouvrir
    const modalToOpen = this.findModalById(modalId);
    
    if (!modalToOpen) {
      return;
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
      }, "-=0.05"); // Légèrement en même temps que l'opacité

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
    }).to(modalToClose, {
      opacity: 0,
      duration: CONFIG.ANIMATION.DURATION,
      ease: CONFIG.ANIMATION.EASE.POWER2.IN,
      onComplete: () => {
        // Cache complètement la modale à la fin de l'animation
        gsap.set(modalToClose, { display: 'none' });
      }
    }, "-=0.05"); // Légèrement en même temps que l'opacité

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
