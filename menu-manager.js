// ==========================================
// GESTIONNAIRE DU MENU DE NAVIGATION
// ==========================================
import { CONFIG } from './config.js';
import { RichTextManager } from './rich-text-manager.js';
import logger from './logger.js';

/**
 * MenuManager - Gestionnaire de navigation dynamique pour CMS
 * Gère la navigation hiérarchique avec historique et logique de frères/ancêtres
 */
export class MenuManager {
  constructor(smoothScrollManager = null) {
    this.smoothScrollManager = smoothScrollManager;
    
    // Gestionnaire de texte riche
    this.richTextManager = new RichTextManager();
    
    // Éléments principaux du menu
    this.menu = document.querySelector(CONFIG.SELECTORS.MENU_WRAP);
    this.menuFirstPanel = this.menu?.querySelector(CONFIG.SELECTORS.MENU_FIRST_PANEL);
    this.menuFirstPanelItem = this.menu?.querySelector(CONFIG.SELECTORS.MENU_FIRST_PANEL_ITEM);
    this.menuPanelItems = this.menu?.querySelectorAll(CONFIG.SELECTORS.MENU_PANEL_ITEMS);
    this.menuButton = document.querySelector(CONFIG.SELECTORS.MENU_BUTTON);
    this.menuExit = document.querySelectorAll(CONFIG.SELECTORS.MENU_EXIT);
    this.menuExitAll = document.querySelectorAll(CONFIG.SELECTORS.MENU_EXIT_ALL);
    this.menuOverlay = this.menu?.querySelector('.menu_overlay');
    
    // Boutons CMS dynamiques
    this.cmsButtons = [];
    
    // Historique de navigation
    this.navigationHistory = [];
    
    // Statuts actifs
    this.activeElements = new Set(); // Ensemble des éléments actuellement actifs
    this.currentActivePath = [];     // Chemin actuel des éléments actifs (hiérarchie)
  }

  // ==========================================
  // MÉTHODES D'INITIALISATION
  // ==========================================

  /**
   * Initialise le système de menu avec approche incrémentale
   */
  async init() {
    logger.menu(' MenuManager - Début de l\'initialisation incrémentale');
    
    if (!this.menu || !this.menuButton) {
      logger.error(' MenuManager - Éléments essentiels manquants:', {
        menu: !!this.menu,
        menuButton: !!this.menuButton
      });
      throw new Error('Éléments essentiels du menu manquants');
    }
    
    try {
      logger.log('⏳ Attente de Finsweet Attributes...');
      await this.waitForFinsweetAttributes();
      logger.success(' Finsweet Attributes chargé');

      logger.info(' Initialisation incrémentale des éléments CMS...');
      await this.initIncrementalCMS();
      
      logger.success(' MenuManager - Initialisation terminée avec succès');
      
    } catch (error) {
      logger.error(' MenuManager - Erreur lors de l\'initialisation:', error);
      throw error;
    }
  }

  /**
   * Initialisation incrémentale des éléments CMS
   */
  async initIncrementalCMS() {
    const MINIMUM_ELEMENTS = 20; // Seuil minimum pour démarrer
    const INITIAL_WAIT = 1000;   // Attente initiale
    const MAX_WAIT = 6000;       // Attente maximum
    
    logger.log(`🎯 Objectif initial : au moins ${MINIMUM_ELEMENTS} boutons CMS`);
    
    // Attendre un délai initial pour que les premiers éléments se chargent
    await new Promise(resolve => setTimeout(resolve, INITIAL_WAIT));
    
    // Obtenir les éléments actuels
    this.updateCMSButtons();
    const initialCount = this.cmsButtons.length;
    
    logger.log(`� ${initialCount} boutons CMS détectés initialement`);
    
    if (initialCount >= MINIMUM_ELEMENTS) {
      // On a assez d'éléments pour commencer
      logger.success(' Seuil minimum atteint (${initialCount}/${MINIMUM_ELEMENTS})');
      this.initializeMenuWithCurrentElements();
      
      // Surveiller les nouveaux éléments en arrière-plan
      this.startIncrementalWatcher();
      
    } else {
      // Pas assez d'éléments, attendre un peu plus
      logger.log(`⏳ Pas assez d'éléments (${initialCount}/${MINIMUM_ELEMENTS}), attente supplémentaire...`);
      
      const startTime = Date.now();
      while (Date.now() - startTime < MAX_WAIT) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        this.updateCMSButtons();
        const currentCount = this.cmsButtons.length;
        
        if (currentCount !== initialCount) {
          logger.log(`� ${currentCount} boutons CMS détectés (+${currentCount - initialCount})`);
        }
        
        if (currentCount >= MINIMUM_ELEMENTS) {
          logger.success(' Seuil minimum atteint (${currentCount}/${MINIMUM_ELEMENTS})');
          this.initializeMenuWithCurrentElements();
          this.startIncrementalWatcher();
          return;
        }
      }
      
      // Timeout atteint, initialiser avec ce qu'on a
      logger.log(`⏰ Timeout atteint, initialisation avec ${this.cmsButtons.length} boutons`);
      this.initializeMenuWithCurrentElements();
      this.startIncrementalWatcher();
    }
  }

  /**
   * Met à jour la liste des boutons CMS
   */
  updateCMSButtons() {
    const newButtons = Array.from(document.querySelectorAll('.menu_panel_collection_item.is-btn'));
    const previousCount = this.cmsButtons.length;
    this.cmsButtons = newButtons;
    
    if (newButtons.length !== previousCount && previousCount > 0) {
      logger.info(' Boutons CMS mis à jour : ${previousCount} → ${newButtons.length}');
    }
    
    return newButtons;
  }

  /**
   * Initialise le menu avec les éléments actuellement disponibles
   */
  initializeMenuWithCurrentElements() {
    logger.log(`🎨 Initialisation du menu avec ${this.cmsButtons.length} boutons`);
    
    // Initialiser les positions et événements
    this.initPanelPositions();
    this.initBasicEvents();
    
    // Ajouter les événements pour les boutons actuels
    this.attachCMSButtonEvents();
    
    // Randomiser les cartes de review
    this.randomizeReviewCards().then(() => {
      logger.success(' Cartes de review randomisées');
    });
    
    // Initialiser le Rich Text Manager
    this.initRichTextManager().then(() => {
      logger.success(' Rich Text Manager initialisé');
    });
    
    logger.success(' Menu initialisé avec les éléments actuels');
  }

  /**
   * Attache les événements aux boutons CMS actuels
   */
  attachCMSButtonEvents() {
    this.cmsButtons.forEach((button) => {
      if (!button.hasAttribute('data-vv-initialized')) {
        this.attachButtonEvents(button);
        button.setAttribute('data-vv-initialized', 'true');
      }
    });
    
    logger.log(`� Événements attachés à ${this.cmsButtons.length} boutons`);
  }

  /**
   * Attache les événements à un bouton spécifique
   */
  attachButtonEvents(button) {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openPanel(button);
    });
  }

  /**
   * Démarre la surveillance incrémentale des nouveaux éléments
   */
  startIncrementalWatcher() {
    logger.log('👁️ Démarrage de la surveillance incrémentale...');
    
    const observer = new MutationObserver((mutations) => {
      let hasNewElements = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Vérifier si le nouveau nœud contient des boutons CMS
              const newButtons = node.matches?.('.menu_panel_collection_item.is-btn') 
                ? [node] 
                : Array.from(node.querySelectorAll?.('.menu_panel_collection_item.is-btn') || []);
              
              if (newButtons.length > 0) {
                hasNewElements = true;
              }
            }
          });
        }
      });
      
      if (hasNewElements) {
        // Debounce les mises à jour
        clearTimeout(this.updateTimeout);
        this.updateTimeout = setTimeout(() => {
          this.handleNewCMSElements();
        }, 200);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Stocker l'observer pour pouvoir l'arrêter plus tard
    this.incrementalObserver = observer;
    
    logger.success(' Surveillance incrémentale active');
  }

  /**
   * Traite les nouveaux éléments CMS détectés
   */
  handleNewCMSElements() {
    const previousCount = this.cmsButtons.length;
    this.updateCMSButtons();
    const newCount = this.cmsButtons.length;
    
    if (newCount > previousCount) {
      const addedCount = newCount - previousCount;
      logger.log(`🆕 ${addedCount} nouveaux boutons CMS détectés (total: ${newCount})`);
      
      // Attacher les événements aux nouveaux boutons uniquement
      this.attachCMSButtonEvents();
      
      // Mettre à jour les positions si nécessaire
      this.updatePanelPositions();
      
      // Randomiser à nouveau les cartes de review si de nouveaux éléments
      this.randomizeReviewCards();
    }
  }

  /**
   * Met à jour les positions des panels après ajout d'éléments
   */
  updatePanelPositions() {
    logger.info(' Mise à jour des positions des panels...');
    this.initPanelPositions();
  }

  /**
   * Attend que Finsweet Attributes soit chargé avec optimisation
   */
  async waitForFinsweetAttributes() {
    const maxWaitTime = 8000; // 8 secondes max
    const checkInterval = 200; // Vérifier toutes les 200ms
    const startTime = Date.now();
    
    // Vérification immédiate
    if (this.checkFinsweetLoaded()) {
      logger.success(' Finsweet Attributes déjà disponible');
      return true;
    }
    
    logger.log('⏳ Attente de Finsweet Attributes...');
    
    return new Promise((resolve) => {
      const checkLoad = () => {
        if (this.checkFinsweetLoaded()) {
          logger.success(' Finsweet Attributes détecté');
          resolve(true);
          return;
        }
        
        if (Date.now() - startTime > maxWaitTime) {
          logger.warn(' Timeout Finsweet Attributes - Continuation sans attendre');
          resolve(false); // Ne pas rejeter, juste continuer
          return;
        }
        
        setTimeout(checkLoad, checkInterval);
      };
      
      checkLoad();
    });
  }

  /**
   * Vérifie si Finsweet est chargé de manière optimisée
   */
  checkFinsweetLoaded() {
    // Vérifier si les listes CMS sont présentes
    const cmsElements = document.querySelectorAll('.menu_panel_collection_item');
    if (cmsElements.length < 10) {
      return false; // Pas assez d'éléments CMS
    }
    
    // Vérifier si les conteneurs Finsweet sont présents
    const listContainers = document.querySelectorAll('[fs-cmsload-element="list"]');
    if (listContainers.length === 0) {
      // Pas de conteneurs Finsweet, mais si on a des éléments CMS, c'est bon
      return cmsElements.length > 20;
    }
    
    // Vérifier si au moins une liste a du contenu
    let hasContent = false;
    listContainers.forEach(container => {
      const items = container.querySelectorAll('.menu_panel_collection_item');
      if (items.length > 5) {
        hasContent = true;
      }
    });
    
    return hasContent;
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

    // Fermeture par bouton exit all (ferme tous les panels)
    this.menuExitAll.forEach(exitAllBtn => {
      exitAllBtn.addEventListener('click', () => {
        this.closeAllPanels();
      });
    });

    // Événements pour les liens de menu avec data-menu-link
    this.initMenuLinkEvents();
    
    logger.log('🎯 Événements de base initialisés');
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
        
        // Mettre à jour les états actifs pour ce panel
        this.updateActiveStatesOnOpen(panelName);
        
        // Attendre que l'animation soit terminée avant de passer au suivant
        if (i < ancestorPath.length - 1) { // Pas d'attente pour le dernier
          await new Promise(resolve => setTimeout(resolve, CONFIG.ANIMATION.DURATION * 1000));
        }
      }
    }
    
    // Mettre à jour la visibilité des boutons "exit all" après navigation
    this.updateExitAllButtonsVisibility();
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

      // Mettre à jour les états actifs
      if (panelsToClose.length > 0) {
        this.updateActiveStatesOnClose(panelsToClose[0]);
      }

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
        }, 0.2);

        // Réinitialiser l'historique et les états actifs immédiatement
        this.clearNavigationHistory();
        this.clearAllActiveStates();
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

    // Mettre à jour les états actifs après modification de l'historique
    if (siblingsToClose.length > 0) {
      this.updateActiveStatesOnClose(siblingsToClose[0]);
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
    
    // Mettre à jour les états actifs
    this.updateActiveStatesOnOpen(panelName);
    
    // Mettre à jour la visibilité des boutons "exit all"
    this.updateExitAllButtonsVisibility();
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
   * Ferme tous les panels ouverts et ferme complètement le menu
   * Utilise la méthode closeMenu() qui gère déjà tout proprement
   */
  closeAllPanels() {
    // Utiliser la méthode existante qui ferme tout le menu proprement
    this.closeMenu();
  }

  /**
   * Met à jour la visibilité des boutons "exit all" 
   * Seul le dernier panel ouvert doit afficher son bouton "exit all"
   */
  updateExitAllButtonsVisibility() {
    // Cacher tous les boutons "exit all" d'abord
    this.menuExitAll.forEach(exitAllBtn => {
      gsap.set(exitAllBtn, {
        opacity: 0,
        duration: 0.6,
        ease: CONFIG.ANIMATION.EASE.POWER2.OUT,
        onComplete: () => {
          exitAllBtn.style.display = 'none';
        }
      });
    });

    // Si aucun panel n'est ouvert, ne pas afficher de bouton
    if (this.navigationHistory.length === 0) {
      return;
    }

    // Afficher le bouton "exit all" uniquement sur le dernier panel ouvert
    const lastPanelName = this.navigationHistory[this.navigationHistory.length - 1];
    const lastPanel = document.querySelector(`.menu_panel_item[data-name="${lastPanelName}"]`);
    
    if (lastPanel) {
      const exitAllBtn = lastPanel.querySelector(CONFIG.SELECTORS.MENU_EXIT_ALL);
      if (exitAllBtn) {
        exitAllBtn.style.display = 'block';
        gsap.set(exitAllBtn, {
          opacity: 1,
          duration: 0.6,
          ease: CONFIG.ANIMATION.EASE.POWER2.OUT
        });
      }
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

    // Mettre à jour les états actifs
    this.updateActiveStatesOnClose(panelName);

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
    this.animatePanelsSequentially(reversedPanels, () => {
      // Mettre à jour la visibilité des boutons après fermeture
      this.updateExitAllButtonsVisibility();
    });

    // Mettre à jour immédiatement la visibilité des boutons
    this.updateExitAllButtonsVisibility();

    return true;
  }

  /**
   * Anime les panels séquentiellement
   * @param {HTMLElement[]} panels - Panels à animer
   * @param {Function} onComplete - Callback optionnel
   */
  animatePanelsSequentially(panels, onComplete = null, duration) {
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
        duration: duration || CONFIG.ANIMATION.DURATION,
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

  // ==========================================
  // MÉTHODES DE GESTION DES STATUTS ACTIFS
  // ==========================================

  /**
   * Met à jour les statuts actifs de tous les éléments de navigation
   * en fonction de l'historique de navigation actuel
   */
  updateActiveStates() {
    // Effacer tous les états actifs précédents
    this.clearAllActiveStates();
    
    // Construire le nouveau chemin actif basé sur l'historique
    this.currentActivePath = [...this.navigationHistory];
    
    // Appliquer les états actifs pour chaque élément du chemin
    this.currentActivePath.forEach((panelName, index) => {
      this.setElementActiveState(panelName, true);
      
      // Marquer aussi le bouton qui mène à ce panel comme actif
      const button = this.findButtonByPanelName(panelName);
      if (button) {
        this.setButtonActiveState(button, true);
      }
    });
    
    // Mettre à jour l'état du panel actuellement visible (le dernier dans l'historique)
    if (this.navigationHistory.length > 0) {
      const currentPanel = this.navigationHistory[this.navigationHistory.length - 1];
      this.setCurrentPanelState(currentPanel);
    }
    
    // Mettre à jour les états de fil d'Ariane
    this.updateBreadcrumbStates();
  }

  /**
   * Définit l'état actif d'un élément de navigation
   * @param {string} panelName - Le data-name du panel
   * @param {boolean} isActive - Si l'élément doit être actif
   */
  setElementActiveState(panelName, isActive) {
    const panel = document.querySelector(`.menu_panel_item[data-name="${panelName}"]`);
    
    if (!panel) return;
    
    if (isActive) {
      panel.classList.add('is-active');
      this.activeElements.add(panelName);
    } else {
      panel.classList.remove('is-active');
      this.activeElements.delete(panelName);
    }
  }

  /**
   * Définit l'état actif d'un bouton de navigation
   * @param {HTMLElement} button - Le bouton à modifier
   * @param {boolean} isActive - Si le bouton doit être actif
   */
  setButtonActiveState(button, isActive) {
    if (!button) return;
    
    if (isActive) {
      button.classList.add('is-active');
    } else {
      button.classList.remove('is-active');
    }
  }

  /**
   * Met à jour l'état du panel actuellement visible
   * @param {string} panelName - Le data-name du panel actuel
   */
  setCurrentPanelState(panelName) {
    // Supprimer la classe 'is-current' de tous les panels
    document.querySelectorAll('.menu_panel_item.is-current').forEach(panel => {
      panel.classList.remove('is-current');
    });
    
    // Ajouter la classe 'is-current' au panel actuel
    const currentPanel = document.querySelector(`.menu_panel_item[data-name="${panelName}"]`);
    if (currentPanel) {
      currentPanel.classList.add('is-current');
    }
  }

  /**
   * Efface tous les états actifs
   */
  clearAllActiveStates() {
    // Effacer les classes des panels
    document.querySelectorAll('.menu_panel_item.is-active').forEach(panel => {
      panel.classList.remove('is-active');
    });
    
    // Effacer les classes des boutons
    this.cmsButtons.forEach(button => {
      button.classList.remove('is-active', 'is-breadcrumb');
    });
    
    // Effacer la classe current
    document.querySelectorAll('.menu_panel_item.is-current').forEach(panel => {
      panel.classList.remove('is-current');
    });
    
    // Vider les ensembles de tracking
    this.activeElements.clear();
    this.currentActivePath = [];
  }

  /**
   * Vérifie si un élément est dans le chemin actif
   * @param {string} panelName - Le data-name du panel
   * @returns {boolean} - True si l'élément est actif
   */
  isElementActive(panelName) {
    return this.activeElements.has(panelName);
  }

  /**
   * Vérifie si un élément est le panel actuellement visible
   * @param {string} panelName - Le data-name du panel
   * @returns {boolean} - True si c'est le panel actuel
   */
  isCurrentPanel(panelName) {
    return this.navigationHistory.length > 0 && 
           this.navigationHistory[this.navigationHistory.length - 1] === panelName;
  }

  /**
   * Obtient le chemin d'ancêtres actifs d'un panel donné
   * @param {string} panelName - Le data-name du panel
   * @returns {string[]} - Array des ancêtres actifs
   */
  getActiveAncestors(panelName) {
    const panelIndex = this.currentActivePath.indexOf(panelName);
    if (panelIndex === -1) return [];
    
    return this.currentActivePath.slice(0, panelIndex);
  }

  /**
   * Met à jour les états actifs lors de l'ouverture d'un panel
   * @param {string} panelName - Le data-name du panel ouvert
   */
  updateActiveStatesOnOpen(panelName) {
    // Ajouter le nouveau panel au chemin actif s'il n'y est pas déjà
    if (!this.currentActivePath.includes(panelName)) {
      this.currentActivePath.push(panelName);
    }
    
    // Mettre à jour tous les états
    this.updateActiveStates();
  }

  /**
   * Met à jour les états actifs lors de la fermeture d'un panel
   * @param {string} panelName - Le data-name du panel fermé
   */
  updateActiveStatesOnClose(panelName) {
    // Supprimer le panel et ses descendants du chemin actif
    const panelIndex = this.currentActivePath.indexOf(panelName);
    if (panelIndex !== -1) {
      this.currentActivePath = this.currentActivePath.slice(0, panelIndex);
    }
    
    // Mettre à jour tous les états
    this.updateActiveStates();
  }

  // ==========================================
  // MÉTHODES UTILITAIRES POUR LES STATUTS ACTIFS
  // ==========================================

  /**
   * Retourne des informations sur l'état de navigation actuel
   * Utile pour le debugging ou l'affichage d'informations
   * @returns {Object} - Informations sur l'état actuel
   */
  getNavigationState() {
    return {
      navigationHistory: [...this.navigationHistory],
      currentActivePath: [...this.currentActivePath],
      activeElements: Array.from(this.activeElements),
      currentPanel: this.navigationHistory.length > 0 ? 
        this.navigationHistory[this.navigationHistory.length - 1] : null,
      isMenuOpen: this.menu?.classList.contains("is-active") || false
    };
  }

  /**
   * Marque un élément comme étant dans le fil d'Ariane (breadcrumb)
   * @param {string} panelName - Le data-name du panel
   * @param {boolean} isInBreadcrumb - Si l'élément fait partie du fil d'Ariane
   */
  setBreadcrumbState(panelName, isInBreadcrumb) {
    const button = this.findButtonByPanelName(panelName);
    if (button) {
      if (isInBreadcrumb) {
        button.classList.add('is-breadcrumb');
      } else {
        button.classList.remove('is-breadcrumb');
      }
    }
  }

  /**
   * Met à jour les états de fil d'Ariane pour tous les éléments
   */
  updateBreadcrumbStates() {
    // Effacer tous les états de breadcrumb existants
    this.cmsButtons.forEach(button => {
      button.classList.remove('is-breadcrumb');
    });

    // Marquer tous les éléments du chemin actuel sauf le dernier comme breadcrumb
    for (let i = 0; i < this.currentActivePath.length - 1; i++) {
      this.setBreadcrumbState(this.currentActivePath[i], true);
    }
  }

  /**
   * Attribue aléatoirement la classe "is-reverse" à un nombre aléatoire de cartes
   */
  async randomizeReviewCards() {
    // Attendre que les cartes de review soient chargées
    await this.waitForReviewCards();
    
    const reviewCards = document.querySelectorAll('.review-card_wrap');
    
    if (reviewCards.length === 0) {
      return;
    }


    // Supprimer d'abord toutes les classes "is-reverse" existantes
    reviewCards.forEach(card => {
      card.classList.remove('is-reverse');
    });

    // Calculer un nombre aléatoire inférieur à la moitié du total
    const maxCards = Math.floor(reviewCards.length / 2);
    const randomCount = Math.floor(Math.random() * maxCards) + 1; // Au moins 1 carte


    // Créer un array avec tous les indices et le mélanger
    const indices = Array.from({ length: reviewCards.length }, (_, i) => i);
    
    // Mélanger l'array (algorithme Fisher-Yates)
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // Prendre les premiers éléments mélangés et leur ajouter la classe
    for (let i = 0; i < randomCount; i++) {
      reviewCards[indices[i]].classList.add('is-reverse');
    }

    // Appliquer les modifications aux cartes de review
    this.applyReviewCardChanges();
  }

  /**
   * Permet d'appliquer des modifications aux cartes de review au clics sur celles-ci
   * @return {Promise<void>}
   */
  applyReviewCardChanges() {
    const reviewCards = document.querySelectorAll('.review-card_wrap');

    // Appliquer les modifications à chaque carte
    reviewCards.forEach(card => {
      card.addEventListener('click', () => {
        const isDesktop = window.WindowUtils ? 
          window.WindowUtils.isDesktop() : 
          window.innerWidth >= 992;

        if(isDesktop) {
          return; // Ne pas appliquer les modifications sur desktop
        }

        // Vérifier si la carte a déjà la classe "is-reverse"
        if (card.classList.contains('is-reverse')) {
          // Si oui, retirer la classe
          card.classList.remove('is-reverse');
        } else {
          // Sinon, ajouter la classe
          card.classList.add('is-reverse');
        }
      });
    });
  }

  /**
   * Attend que les cartes de review soient chargées dans le DOM
   * @returns {Promise<void>}
   */
  async waitForReviewCards() {
    const maxAttempts = 15;
    const delayBetweenAttempts = 300;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      // Attendre que le DOM se stabilise
      await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));
      
      // Chercher les cartes de review
      const reviewCards = document.querySelectorAll('.review-card_wrap');
      
      if (reviewCards.length > 0) {
        return;
      }
    }
    
  }

  /**
   * Initialise le Rich Text Manager après que tous les éléments Finsweet soient chargés
   */
  async initRichTextManager() {
    try {
      await this.richTextManager.init();
    } catch (error) {
    }
  }

  /**
   * Réinitialise le Rich Text Manager (utile après ajout dynamique de contenu)
   */
  async reinitRichTextManager() {
    try {
      await this.richTextManager.reinit();
    } catch (error) {
    }
  }
}