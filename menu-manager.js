// ==========================================
// GESTIONNAIRE DU MENU DE NAVIGATION
// ==========================================
import { CONFIG } from './config.js';

/**
 * MenuManager - Gestionnaire de navigation dynamique pour CMS
 * Gère la navigation hiérarchique avec historique et logique de frères/ancêtres
 */
export class MenuManager {
  constructor(smoothScrollManager = null) {
    this.smoothScrollManager = smoothScrollManager;
    
    // Éléments principaux du menu
    this.menu = document.querySelector(CONFIG.SELECTORS.MENU_WRAP);
    this.menuFirstPanel = this.menu?.querySelector(CONFIG.SELECTORS.MENU_FIRST_PANEL);
    this.menuFirstPanelItem = this.menu?.querySelector(CONFIG.SELECTORS.MENU_FIRST_PANEL_ITEM);
    this.menuPanelItems = this.menu?.querySelectorAll(CONFIG.SELECTORS.MENU_PANEL_ITEMS);
    this.menuButton = document.querySelector(CONFIG.SELECTORS.MENU_BUTTON);
    this.menuExit = document.querySelectorAll(CONFIG.SELECTORS.MENU_EXIT);
    this.menuOverlay = this.menu?.querySelector('.menu_overlay');
    
    // Boutons CMS dynamiques
    this.cmsButtons = [];
    
    // Historique de navigation
    this.navigationHistory = [];
  }

  // ==========================================
  // MÉTHODES D'INITIALISATION
  // ==========================================

  /**
   * Initialise le système de menu
   */
  async init() {
    if (!this.menu || !this.menuButton) {
      console.warn('Menu ou bouton de menu introuvable');
      return;
    }
    
    try {
      // Attendre que Finsweet Attributes List Nest soit chargé
      await this.waitForFinsweetAttributes();

      // Attendre que les boutons CMS soient chargés
      await this.waitForCMSElements();
      
      // Initialiser les positions et événements
      this.initPanelPositions();
      this.initBasicEvents();
      
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du menu:', error);
    }
  }

  /**
   * Attend que les boutons CMS soient chargés dans le DOM
   * @returns {Promise<void>}
   */
  async waitForCMSElements() {
    const maxAttempts = 10;
    const delayBetweenAttempts = 200;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      // Attendre que le DOM se stabilise
      await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));
      
      // Chercher tous les boutons CMS
      const allBtnItems = document.querySelectorAll('.menu_panel_collection_item.is-btn');
      
      if (allBtnItems.length > 0) {
        this.cmsButtons = Array.from(allBtnItems);
        return;
      }
    }
    
    throw new Error('Impossible de charger les boutons CMS dans le délai imparti');
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
   * Initialise les positions des panels
   */
  initPanelPositions() {
    if (this.menuPanelItems) {
      gsap.set(this.menuPanelItems, {
        xPercent: -101,
        opacity: 1,
        pointerEvents: "auto"
      });
    }
  }

  /**
   * Initialise les événements de base
   */
  initBasicEvents() {
    // Ouverture du menu
    this.menuButton.addEventListener('click', () => this.openMenu());
    
    // Fermeture par overlay
    if (this.menuOverlay) {
      this.menuOverlay.addEventListener('click', (e) => {
        if (e.target === this.menuOverlay) {
          this.closeMenu();
        }
      });
    }
    
    // Fermeture par bouton exit
    this.menuExit.forEach(exitBtn => {
      exitBtn.addEventListener('click', () => {
        const parentPanel = exitBtn.closest('.menu_panel_item');
        
        if (parentPanel?.dataset.name) {
          this.closePanel(parentPanel.dataset.name);
        } else {
          this.closeMenu();
        }
      });
    });

    // Événements pour les boutons CMS
    this.cmsButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openPanel(btn);
      });
    });

    // Événements pour les liens de menu avec data-menu-link
    this.initMenuLinkEvents();
  }

  // ==========================================
  // MÉTHODES DE NAVIGATION DIRECTE
  // ==========================================

  /**
   * Initialise les événements pour les liens avec data-menu-link
   */
  initMenuLinkEvents() {
    // Écouter les clics sur tous les éléments avec data-menu-link
    document.addEventListener('click', (e) => {
      const menuLinkElement = e.target.closest('[data-menu-link]');
      
      if (menuLinkElement) {
        e.preventDefault();
        e.stopPropagation();
        
        const targetPanelName = menuLinkElement.dataset.menuLink;
        if (targetPanelName) {
          this.navigateToPanel(targetPanelName);
        }
      }
    });
  }

  /**
   * Navigue directement vers un panel en ouvrant tous ses ancêtres
   * @param {string} targetPanelName - Le data-name du panel cible
   */
  async navigateToPanel(targetPanelName) {
    // Construire le chemin complet vers le panel cible
    const ancestorPath = this.buildAncestorPath(targetPanelName);
    
    if (ancestorPath.length === 0) {
      console.warn(`Panel "${targetPanelName}" introuvable`);
      return;
    }

    // Ouvrir le menu s'il n'est pas déjà ouvert
    if (!this.menu.classList.contains("is-active")) {
      this.openMenu();
      
      // Attendre que l'animation d'ouverture soit terminée
      await new Promise(resolve => setTimeout(resolve, CONFIG.ANIMATION.DURATION * 1000));
    }

    // Naviguer vers le panel cible en ouvrant tous les ancêtres
    await this.openAncestorPath(ancestorPath);
  }

  /**
   * Construit le chemin complet d'ancêtres vers un panel cible
   * @param {string} targetPanelName - Le data-name du panel cible
   * @returns {string[]} - Array des data-name des ancêtres (du plus proche à la racine vers le panel cible)
   */
  buildAncestorPath(targetPanelName) {
    const path = [];
    let currentPanelName = targetPanelName;

    // Remonter la hiérarchie jusqu'à la racine
    while (currentPanelName) {
      const button = this.findButtonByPanelName(currentPanelName);
      
      if (!button) {
        // Panel introuvable, abandonner
        return [];
      }

      path.unshift(currentPanelName); // Ajouter au début pour avoir l'ordre correct
      currentPanelName = button.dataset.parent; // Remonter au parent
    }

    return path;
  }

  /**
   * Ouvre séquentiellement tous les panels dans le chemin d'ancêtres
   * @param {string[]} ancestorPath - Array des panels à ouvrir dans l'ordre
   */
  async openAncestorPath(ancestorPath) {
    // Fermer tous les panels actuellement ouverts qui ne sont pas dans le nouveau chemin
    await this.closeNonMatchingPanels(ancestorPath);

    // Ouvrir séquentiellement chaque panel du chemin
    for (let i = 0; i < ancestorPath.length; i++) {
      const panelName = ancestorPath[i];
      
      // Vérifier si ce panel est déjà ouvert (présent dans l'historique)
      if (!this.navigationHistory.includes(panelName)) {
        // Ajouter à l'historique et ouvrir le panel
        this.addToNavigationHistory(panelName);
        this.showPanel(panelName);
        
        // Attendre que l'animation soit terminée avant de passer au suivant
        if (i < ancestorPath.length - 1) { // Pas d'attente pour le dernier
          await new Promise(resolve => setTimeout(resolve, CONFIG.ANIMATION.DURATION * 1000));
        }
      }
    }
  }

  /**
   * Ferme les panels qui ne correspondent pas au nouveau chemin
   * @param {string[]} newPath - Le nouveau chemin d'ancêtres
   */
  async closeNonMatchingPanels(newPath) {
    // Trouver le point de divergence entre l'historique actuel et le nouveau chemin
    let divergenceIndex = -1;
    
    for (let i = 0; i < Math.min(this.navigationHistory.length, newPath.length); i++) {
      if (this.navigationHistory[i] !== newPath[i]) {
        divergenceIndex = i;
        break;
      }
    }

    // Si pas de divergence mais l'historique est plus long, commencer la fermeture après le dernier élément commun
    if (divergenceIndex === -1 && this.navigationHistory.length > newPath.length) {
      divergenceIndex = newPath.length;
    }

    // S'il y a des panels à fermer
    if (divergenceIndex !== -1 && divergenceIndex < this.navigationHistory.length) {
      const panelsToClose = this.navigationHistory.slice(divergenceIndex);
      
      // Mettre à jour l'historique
      this.navigationHistory = this.navigationHistory.slice(0, divergenceIndex);

      // Récupérer les éléments DOM
      const panelElements = panelsToClose
        .map(panelName => document.querySelector(`.menu_panel_item[data-name="${panelName}"]`))
        .filter(panel => panel !== null);

      if (panelElements.length > 0) {
        // Fermer dans l'ordre inverse (du plus profond au moins profond)
        const reversedPanels = [...panelElements].reverse();
        
        // Attendre que toutes les fermetures soient terminées
        await new Promise(resolve => {
          this.animatePanelsSequentially(reversedPanels, resolve);
        });
      }
    }
  }

  /**
   * Ouvre un panel via un lien de menu
   * @param {string} panelName - Le data-name du panel à ouvrir
   */
  openPanelByLink(panelName) {
    // Vérifier si le panel est déjà dans l'historique (ancêtre)
    const existingIndex = this.navigationHistory.indexOf(panelName);
    
    if (existingIndex !== -1) {
      // Le panel est un ancêtre : ne rien faire
      return;
    }

    // Nouveau panel : vérifier s'il a des frères à fermer
    this.handleSiblingLogic(panelName);
  }

  // ==========================================
  // MÉTHODES D'OUVERTURE/FERMETURE
  // ==========================================

  /**
   * Ouvre le menu principal
   */
  openMenu() {
    if (this.menu.classList.contains("is-active")) {
      return;
    }

    // Désactive le scroll principal
    if (this.smoothScrollManager) {
      this.smoothScrollManager.disableScroll();
    }
    
    // Active le menu et ses éléments
    this.menu.classList.add("is-active");
    this.menuFirstPanel.classList.add("is-active");
    if (this.menuOverlay) {
      this.menuOverlay.classList.add("is-active");
    }
    
    // Animation d'entrée du premier panel
    gsap.to(this.menuFirstPanelItem, {
      duration: CONFIG.ANIMATION.DURATION,
      ease: CONFIG.ANIMATION.EASE.POWER2.OUT,
      xPercent: 0,
      pointerEvents: "auto"
    });
  }

  /**
   * Ferme le menu principal et réinitialise l'historique
   */
  closeMenu() {
    if (!this.menu.classList.contains("is-active")) {
      return;
    }

    // Si il y a des panels ouverts dans l'historique, les fermer d'abord
    if (this.navigationHistory.length > 0) {
      // Récupérer tous les panels ouverts
      const allOpenPanels = this.navigationHistory
        .map(panelName => document.querySelector(`.menu_panel_item[data-name="${panelName}"]`))
        .filter(panel => panel !== null);

      if (allOpenPanels.length > 0) {
        // Inverser l'ordre pour commencer par le dernier panel (le plus profond)
        const reversedPanels = [...allOpenPanels].reverse();

        // Animer séquentiellement tous les panels, puis fermer le menu
        this.animatePanelsSequentially(reversedPanels, () => {
          // Callback exécuté après que tous les panels soient fermés
          this.closeMenuFinal();
        });
        
        // Réinitialiser l'historique immédiatement
        this.clearNavigationHistory();
        return;
      }
    }

    // Si pas de panels ouverts, fermer directement le menu
    this.closeMenuFinal();
  }

  /**
   * Ferme définitivement le menu après fermeture des panels
   */
  closeMenuFinal() {
    // Animation de sortie du premier panel
    gsap.to(this.menuFirstPanelItem, {
      duration: CONFIG.ANIMATION.DURATION,
      ease: CONFIG.ANIMATION.EASE.POWER2.IN,
      xPercent: -101,
      onComplete: () => {
        // Désactive le menu et ses éléments
        this.menu.classList.remove("is-active");
        this.menuFirstPanel.classList.remove("is-active");
        if (this.menuOverlay) {
          this.menuOverlay.classList.remove("is-active");
        }
        
        // Réactive le scroll principal
        if (this.smoothScrollManager) {
          this.smoothScrollManager.enableScroll();
        }
        const panelMiddle = this.menuFirstPanelItem.querySelector('.menu_panel_item_middle');
          if (panelMiddle) {
            panelMiddle.scrollTop = 0; // Réinitialiser le scroll du panel
          }
      }
    });
  }

  /**
   * Ouvre un panel et gère la navigation hiérarchique
   * @param {HTMLElement} btn - Le bouton cliqué
   */
  openPanel(btn) {
    if (!btn.dataset.name) {
      return;
    }

    const panelName = btn.dataset.name;
    
    // Vérifier si le panel est déjà dans l'historique (ancêtre)
    const existingIndex = this.navigationHistory.indexOf(panelName);
    
    if (existingIndex !== -1) {
      // Le panel est un ancêtre : ne rien faire
      return;
    }

    // Nouveau panel : vérifier s'il a des frères à fermer
    this.handleSiblingLogic(panelName);
  }

  /**
   * Gère la logique de navigation entre frères
   * @param {string} newPanelName - Le data-name du nouveau panel
   */
  handleSiblingLogic(newPanelName) {
    // Trouver le bouton du nouveau panel
    const newPanelButton = this.findButtonByPanelName(newPanelName);
    if (!newPanelButton) {
      this.navigateToNewPanel(newPanelName);
      return;
    }

    // Chercher un ancêtre dans l'historique
    const ancestorInfo = this.findAncestorInHistory(newPanelButton);
    
    if (ancestorInfo) {
      // Ancêtre trouvé, fermer ses descendants et ouvrir le nouveau
      this.closeSiblingsAndOpenNew(ancestorInfo.siblingsToClose, ancestorInfo.ancestorName, newPanelName);
    } else {
      // Pas d'ancêtre, ouvrir directement
      this.navigateToNewPanel(newPanelName);
    }
  }

  /**
   * Trouve un ancêtre du nouveau panel dans l'historique de navigation
   * @param {HTMLElement} newPanelButton - Le bouton du nouveau panel
   * @returns {Object|null} - {ancestorName, siblingsToClose} ou null
   */
  findAncestorInHistory(newPanelButton) {
    // Utiliser l'attribut data-parent pour trouver le parent
    const parentName = newPanelButton.dataset.parent;
    
    if (!parentName) {
      // Niveau racine : fermer tout l'historique si nécessaire
      if (this.navigationHistory.length > 0) {
        return {
          ancestorName: null,
          siblingsToClose: [...this.navigationHistory]
        };
      }
      return null;
    }
    
    // Vérifier si le parent est dans l'historique
    if (this.navigationHistory.includes(parentName)) {
      const parentIndex = this.navigationHistory.indexOf(parentName);
      const siblingsToClose = this.navigationHistory.slice(parentIndex + 1);
      
      if (siblingsToClose.length > 0) {
        return {
          ancestorName: parentName,
          siblingsToClose: siblingsToClose
        };
      }
    }
    
    return null;
  }

  /**
   * Ferme les frères et descendants, puis ouvre le nouveau panel
   * @param {string[]} siblingsToClose - Panels à fermer
   * @param {string|null} ancestorName - Panel ancêtre ou null
   * @param {string} newPanelName - Nouveau panel à ouvrir
   */
  closeSiblingsAndOpenNew(siblingsToClose, ancestorName, newPanelName) {
    // Récupérer les éléments DOM à fermer
    const siblingElements = siblingsToClose
      .map(siblingName => document.querySelector(`.menu_panel_item[data-name="${siblingName}"]`))
      .filter(panel => panel !== null);

    if (siblingElements.length === 0) {
      this.navigateToNewPanel(newPanelName);
      return;
    }

    // Mettre à jour l'historique
    if (ancestorName) {
      const ancestorIndex = this.navigationHistory.indexOf(ancestorName);
      if (ancestorIndex !== -1) {
        this.navigationHistory = this.navigationHistory.slice(0, ancestorIndex + 1);
      }
    } else {
      this.navigationHistory = [];
    }

    // Fermer les panels puis ouvrir le nouveau
    const reversedSiblings = [...siblingElements].reverse();
    this.animatePanelsSequentially(reversedSiblings, () => {
      this.navigateToNewPanel(newPanelName);
    });
  }

  /**
   * Trouve un bouton par son data-name
   * @param {string} panelName - Le data-name du panel
   * @returns {HTMLElement|null} - Le bouton trouvé ou null
   */
  findButtonByPanelName(panelName) {
    return this.cmsButtons.find(btn => btn.dataset.name === panelName) || null;
  }

  /**
   * Navigue vers un nouveau panel
   * @param {string} panelName - Le data-name du panel
   */
  navigateToNewPanel(panelName) {
    // Ajouter à l'historique
    this.addToNavigationHistory(panelName);
    
    // Ouvrir le panel
    this.showPanel(panelName);
  }

  /**
   * Affiche un panel avec animation
   * @param {string} panelName - Le data-name du panel
   */
  showPanel(panelName) {
    const panel = document.querySelector(`.menu_panel_item[data-name="${panelName}"]`);
    
    if (!panel) {
      return;
    }

    // Animer l'ouverture du panel
    gsap.to(panel, {
      duration: CONFIG.ANIMATION.DURATION,
      ease: CONFIG.ANIMATION.EASE.POWER2.OUT,
      xPercent: 0,
    });
  }

  /**
   * Ajoute un panel à l'historique
   * @param {string} panelName - Le data-name du panel
   */
  addToNavigationHistory(panelName) {
    // Éviter les doublons consécutifs
    if (this.navigationHistory[this.navigationHistory.length - 1] !== panelName) {
      this.navigationHistory.push(panelName);
    }
  }

  /**
   * Ferme un panel et ses descendants
   * @param {string} panelName - Le data-name du panel à fermer
   * @returns {boolean} - True si la fermeture a été effectuée
   */
  closePanel(panelName) {
    if (!panelName) {
      return false;
    }

    // Trouver l'index du panel dans l'historique
    const panelIndex = this.navigationHistory.indexOf(panelName);
    
    if (panelIndex === -1) {
      return false;
    }

    // Récupérer tous les panels à fermer (le panel et ses descendants)
    const panelsToClose = this.navigationHistory.slice(panelIndex);
    
    // Mettre à jour l'historique en supprimant le panel et ses descendants
    this.navigationHistory = this.navigationHistory.slice(0, panelIndex);

    // Récupérer les éléments DOM pour les panels à fermer
    const panelElements = panelsToClose
      .map(closePanelName => document.querySelector(`.menu_panel_item[data-name="${closePanelName}"]`))
      .filter(panel => panel !== null);

    if (panelElements.length === 0) {
      return false;
    }

    // Inverser l'ordre pour commencer par le dernier panel (le plus profond)
    const reversedPanels = [...panelElements].reverse();

    // Animer séquentiellement - chaque panel attend que le précédent soit terminé
    this.animatePanelsSequentially(reversedPanels);

    return true;
  }

  /**
   * Anime les panels séquentiellement
   * @param {HTMLElement[]} panels - Panels à animer
   * @param {Function} onComplete - Callback optionnel
   */
  animatePanelsSequentially(panels, onComplete = null) {
    if (panels.length === 0) {
      if (onComplete) onComplete();
      return;
    }

    // Fonction récursive pour animer un panel puis passer au suivant
    const animateNextPanel = (index) => {
      if (index >= panels.length) {
        // Toutes les animations sont terminées
        if (onComplete) onComplete();
        return;
      }

      const panel = panels[index];
      
      gsap.to(panel, {
        duration: CONFIG.ANIMATION.DURATION,
        ease: CONFIG.ANIMATION.EASE.POWER2.IN,
        xPercent: -101,
        onComplete: () => {
          // Animation terminée, passer au suivant
          animateNextPanel(index + 1);
          const panelMiddle = panel.querySelector('.menu_panel_item_middle');
          if (panelMiddle) {
            panelMiddle.scrollTop = 0; // Réinitialiser le scroll du panel
          }
        }
      });
    };

    // Démarrer l'animation avec le premier panel
    animateNextPanel(0);
  }

  /**
   * Réinitialise l'historique
   */
  clearNavigationHistory() {
    this.navigationHistory = [];
  }
}