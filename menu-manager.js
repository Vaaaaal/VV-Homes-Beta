// ==========================================
// GESTIONNAIRE DU MENU DE NAVIGATION
// ==========================================
import { CONFIG } from './config.js';
import { getSimplifiedConfig, isMobileLiteActive } from './mobile-lite-config.js';
import logger from './logger.js';
import { NavigationState } from './navigation-state.js';
import { NavigationActiveState } from './navigation-active-state.js';

// ==========================================
// CONSTANTES & HELPERS INTERNES
// ==========================================
const CMS_MINIMUM_ELEMENTS = 20;   // Seuil minimum pour initialisation fonctionnelle
const CMS_INITIAL_WAIT = 1000;     // Attente initiale avant premier comptage
const CMS_MAX_WAIT = 6000;         // Temps max pour atteindre le seuil
const FINDSWEET_MAX_WAIT = 8000;   // Timeout Finsweet
const FINDSWEET_CHECK_INTERVAL = 200; // Intervalle de polling

// Promesse de délai
const delay = (ms) => new Promise(res => setTimeout(res, ms));
// Normalisation en tableau
const toArray = (list) => Array.isArray(list) ? list : Array.from(list || []);

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
    this.menuExitAll = document.querySelectorAll(CONFIG.SELECTORS.MENU_EXIT_ALL);
    this.menuOverlay = this.menu?.querySelector('.menu_overlay');
    
    // Boutons CMS dynamiques
    this.cmsButtons = [];
    
  // Historique & états actifs
  this.navigationState = new NavigationState();
  this.activeState = new NavigationActiveState(this.findButtonByPanelName.bind(this));

  // Bind handlers réutilisés
  this._onDocumentClick = this._onDocumentClick.bind(this);
  }

  // ==========================================
  // MÉTHODES D'INITIALISATION
  // ==========================================

  /**
   * Initialise le système de menu avec approche incrémentale
   */
  async init() {
  logger.menu(' MenuManager - Début initialisation');
    
    if (!this.menu || !this.menuButton) {
      logger.error(' MenuManager - Éléments essentiels manquants:', {
        menu: !!this.menu,
        menuButton: !!this.menuButton
      });
      throw new Error('Éléments essentiels du menu manquants');
    }
    
    try {
  logger.log('⏳ Attente Finsweet Attributes');
  await this.waitForFinsweetAttributes();
  logger.success(' Finsweet Attributes prêt');

  logger.info(' Initialisation incrémentale CMS');
  await this.initIncrementalCMS();
      
  logger.success(' MenuManager - Initialisation OK');
      
    } catch (error) {
      logger.error(' MenuManager - Erreur lors de l\'initialisation:', error);
      throw error;
    }
  }

  /**
   * Initialisation incrémentale des éléments CMS
   */
  async initIncrementalCMS() {
  logger.log(`🎯 Objectif initial : ≥ ${CMS_MINIMUM_ELEMENTS} boutons CMS`);
  await delay(CMS_INITIAL_WAIT);
    
    // Obtenir les éléments actuels
    this.updateCMSButtons();
    const initialCount = this.cmsButtons.length;
    
  logger.log(`📌 ${initialCount} boutons CMS détectés initialement`);
    
    if (initialCount >= CMS_MINIMUM_ELEMENTS) {
      logger.success(` Seuil minimum atteint (${initialCount}/${CMS_MINIMUM_ELEMENTS})`);
      this.initializeMenuWithCurrentElements();
      
      // Surveiller les nouveaux éléments en arrière-plan
      this.startIncrementalWatcher();
      
    } else {
      logger.log(`⏳ En attente (actuel ${initialCount}/${CMS_MINIMUM_ELEMENTS})...`);
      const startTime = Date.now();
      while (Date.now() - startTime < CMS_MAX_WAIT) {
        await delay(500);
        this.updateCMSButtons();
        const currentCount = this.cmsButtons.length;
        if (currentCount !== initialCount) {
          logger.log(`➕ ${currentCount} boutons CMS (Δ ${currentCount - initialCount})`);
        }
        if (currentCount >= CMS_MINIMUM_ELEMENTS) {
          logger.success(` Seuil minimum atteint (${currentCount}/${CMS_MINIMUM_ELEMENTS})`);
          this.initializeMenuWithCurrentElements();
          this.startIncrementalWatcher();
          return;
        }
      }
      logger.log(`⏰ Timeout atteint, initialisation avec ${this.cmsButtons.length} boutons`);
      this.initializeMenuWithCurrentElements();
      this.startIncrementalWatcher();
    }
  }

  /**
   * Met à jour la liste des boutons CMS
   */
  updateCMSButtons() {
    const newButtons = toArray(document.querySelectorAll('.menu_panel_collection_item.is-btn'));
    const previousCount = this.cmsButtons.length;
    this.cmsButtons = newButtons;
    
    if (newButtons.length !== previousCount && previousCount > 0) {
      logger.info(` Boutons CMS mis à jour : ${previousCount} → ${newButtons.length}`);
    }
    
    return newButtons;
  }

  /**
   * Initialise le menu avec les éléments actuellement disponibles
   */
  initializeMenuWithCurrentElements() {
  logger.log(`🎨 Initialisation du menu (${this.cmsButtons.length} boutons)`);
    
    // Initialiser les positions et événements
    this.initPanelPositions();
    this.initBasicEvents();
    
    // Ajouter les événements pour les boutons actuels
    this.attachCMSButtonEvents();
    
    // Charger les images différées
    this.loadDeferredMedia();
    
    // Randomiser les cartes de review
    this.randomizeReviewCards().then(() => {
      logger.success(' Cartes de review randomisées');
    });
    
    // Traitement texte riche léger (utilitaire central)
    try {
      if (window.WindowUtils) {
        logger.debug(' MenuManager: Début du traitement richtext...');
        const c = WindowUtils.enhanceRichTextFigures();
        if (c > 0) {
          logger.success(` MenuManager: Rich text enrichi (${c} figures traitées)`);
        } else {
          logger.debug(' MenuManager: Aucune figure richtext trouvée à traiter');
          
          // Réessayer après un court délai au cas où le contenu se charge de manière asynchrone
          setTimeout(() => {
            logger.debug(' MenuManager: Nouveau tentative de traitement richtext...');
            const c2 = WindowUtils.enhanceRichTextFigures();
            if (c2 > 0) {
              logger.success(` MenuManager: Rich text enrichi en différé (${c2} figures traitées)`);
            }
          }, 500);
        }
      }
    } catch(e) {
      logger.warn(' MenuManager: Erreur lors du traitement richtext:', e);
    }
    
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
    
  logger.log(`🔗 Événements attachés (${this.cmsButtons.length})`);
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
      
      // Charger les nouvelles images différées
      this.loadDeferredMedia();
      
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
  const maxWaitTime = FINDSWEET_MAX_WAIT; // 8 secondes max
  const checkInterval = FINDSWEET_CHECK_INTERVAL; // Vérifier toutes les 200ms
  const startTime = Date.now();

  // Vérification immédiate
  if (this.checkFinsweetLoaded()) {
    logger.success(' Finsweet Attributes déjà disponible');
    return true;
  }

  logger.log('⏳ Attente de Finsweet Attributes...');

  return new Promise((resolve) => {
    let resolved = false;
    // Ajout : écoute de l'événement fs-cmsload avec afterRender
    const listContainers = document.querySelectorAll('[fs-cmsload-element="list"]');
    listContainers.forEach(container => {
      container.addEventListener('fs-cmsload', (event) => {
        if (event.detail?.type === 'afterRender' && !resolved) {
          resolved = true;
          logger.success(' Finsweet Attributes afterRender détecté');
          resolve(true);
        }
      }, { once: true });
    });

    // Fallback polling
    const checkLoad = () => {
      if (resolved) return;
      if (this.checkFinsweetLoaded()) {
        logger.success(' Finsweet Attributes détecté (polling)');
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
          this.closeAllPanels();
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
    document.addEventListener('click', this._onDocumentClick);
  }

  _onDocumentClick(e) {
    const menuLinkElement = e.target.closest('[data-menu-link]');
    if (!menuLinkElement) return;
    e.preventDefault();
    e.stopPropagation();
    const targetPanelName = menuLinkElement.dataset.menuLink;
    if (targetPanelName) {
      this.navigateToPanel(targetPanelName);
    }
  }

  /**
   * Navigue directement vers un panel en ouvrant tous ses ancêtres
   * @param {string} targetPanelName - Le data-name du panel cible
   */
  async navigateToPanel(targetPanelName, { skipAnimation = false } = {}) {
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
    await this.openAncestorPath(ancestorPath, { skipAnimation });
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
  async openAncestorPath(ancestorPath, { skipAnimation = false } = {}) {
    // Fermer tous les panels actuellement ouverts qui ne sont pas dans le nouveau chemin
    await this.closeNonMatchingPanels(ancestorPath);

    // Ouvrir séquentiellement chaque panel du chemin
    for (let i = 0; i < ancestorPath.length; i++) {
      const panelName = ancestorPath[i];
      if (!this.navigationState.includes(panelName)) {
        this.navigationState.push(panelName);
        this.showPanel(panelName, { skipAnimation });
  this.activeState.onOpen(panelName);
        if (!skipAnimation && i < ancestorPath.length - 1) {
          await new Promise(res => setTimeout(res, CONFIG.ANIMATION.DURATION * 1000));
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
    
    for (let i = 0; i < Math.min(this.navigationState.history.length, newPath.length); i++) {
      if (this.navigationState.history[i] !== newPath[i]) {
        divergenceIndex = i;
        break;
      }
    }

    if (divergenceIndex === -1 && this.navigationState.history.length > newPath.length) {
      divergenceIndex = newPath.length;
    }

    if (divergenceIndex !== -1 && divergenceIndex < this.navigationState.history.length) {
      const panelsToClose = this.navigationState.history.slice(divergenceIndex);
      this.navigationState.history = this.navigationState.history.slice(0, divergenceIndex);

      // Mettre à jour les états actifs
      if (panelsToClose.length > 0) {
  this.activeState.onClose(panelsToClose[0]);
      }

  await new Promise(resolve => this.closePanels(panelsToClose, { animate: true, onComplete: resolve }));
    }
  }

  /**
   * Ouvre un panel via un lien de menu
   * @param {string} panelName - Le data-name du panel à ouvrir
   */
  openPanelByLink(panelName) {
    // Vérifier si le panel est déjà dans l'historique (ancêtre)
  const existingIndex = this.navigationState.history.indexOf(panelName);
    
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
  closeMenu(closeAll = false) {
    if (!this.menu.classList.contains("is-active")) {
      return;
    }

    // Si il y a des panels ouverts dans l'historique, les fermer d'abord
  if (this.navigationState.history.length > 0) {
      // Récupérer tous les panels ouverts
  const allOpenPanels = this.navigationState.history
        .map(panelName => document.querySelector(`.menu_panel_item[data-name="${panelName}"]`))
        .filter(panel => panel !== null);

      if (allOpenPanels.length > 0) {
        // Inverser l'ordre pour commencer par le dernier panel (le plus profond)
        const reversedPanels = [...allOpenPanels].reverse();

        // Si closeall est true, tout fermer tout d'un coup, sans animation (même le premier panel) et l'overlay
        if (closeAll) {
          reversedPanels.forEach(panel => {
            panel.style.display = "none";
          });
          this.closeMenuFinal(true);
          if (this.menuOverlay) {
            this.menuOverlay.style.display = "none";
          }
          // Ré-initialiser tous les éléments modifiés au dessus (overlay, panels) à leur état de départ
          this.resetPanelStates(reversedPanels);
        } else {
          this.animatePanelsSequentially(reversedPanels, () => {
            // Callback exécuté après que tous les panels soient fermés
            this.closeMenuFinal();
          }, 0.2);
        }

  // Réinitialiser l'historique et les états actifs immédiatement
  this.navigationState.clear();
  this.activeState.clearAll();
        return;
      }
    }

    // Si pas de panels ouverts, fermer directement le menu
    this.closeMenuFinal();
  }

  /**
   * Ferme définitivement le menu après fermeture des panels
   */
  closeMenuFinal(closeAll = false) {
    if (closeAll) {
      // Fermer le premier panel sans animation
      this.menuFirstPanelItem.style.display = "none";
    } else {
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
  }

  /**
   * Ouvre un panel et gère la navigation hiérarchique
   * @param {HTMLElement} btn - Le bouton cliqué
   */
  openPanel(btn) {
    if (!btn?.dataset?.name) return;
    const panelName = btn.dataset.name;
  if (this.navigationState.includes(panelName)) return;
    this.handleSiblingLogic(panelName);
  }

  // ==========================================
  // HELPERS PANELS / HISTORIQUE
  // ==========================================
  getPanel(name) { return document.querySelector(`.menu_panel_item[data-name="${name}"]`); }
  closePanels(panelNames = [], { animate = true, onComplete } = {}) {
    const elements = panelNames.map(n => this.getPanel(n)).filter(Boolean).reverse();
    if (!elements.length) { onComplete && onComplete(); return; }
    if (!animate) {
      elements.forEach(p => { gsap.set(p, { xPercent: -101 }); const m = p.querySelector('.menu_panel_item_middle'); if (m) m.scrollTop = 0; });
      onComplete && onComplete(); return;
    }
    this.animatePanelsSequentially(elements, onComplete);
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
  if (this.navigationState.history.length > 0) {
        return {
          ancestorName: null,
      siblingsToClose: [...this.navigationState.history]
        };
      }
      return null;
    }
    
    // Vérifier si le parent est dans l'historique
    if (this.navigationState.includes(parentName)) {
  const parentIndex = this.navigationState.history.indexOf(parentName);
  const siblingsToClose = this.navigationState.history.slice(parentIndex + 1);
      
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
    if (!siblingsToClose.length) { this.navigateToNewPanel(newPanelName); return; }
    if (ancestorName) {
  const ancestorIndex = this.navigationState.history.indexOf(ancestorName);
  if (ancestorIndex !== -1) this.navigationState.history = this.navigationState.history.slice(0, ancestorIndex + 1);
    } else {
  this.navigationState.clear();
    }
  this.activeState.onClose(siblingsToClose[0]);
    this.closePanels(siblingsToClose, { animate: true, onComplete: () => this.navigateToNewPanel(newPanelName) });
  }

  /**
   * Trouve un bouton par son data-name
   * @param {string} panelName - Le data-name du panel
   * @returns {HTMLElement|null} - Le bouton trouvé ou null
   */
  findButtonByPanelName(panelName) { return this.cmsButtons.find(btn => btn.dataset.name === panelName) || null; }

  /**
   * Navigue vers un nouveau panel
   * @param {string} panelName - Le data-name du panel
   */
  navigateToNewPanel(panelName) {
    this.addToNavigationHistory(panelName);
    this.showPanel(panelName);
    this.activeState.onOpen(panelName);
    this.updateExitAllButtonsVisibility();
  }

  /**
   * Affiche un panel avec animation
   * @param {string} panelName - Le data-name du panel
   */
  showPanel(panelName, { skipAnimation = false } = {}) {
    const panel = document.querySelector(`.menu_panel_item[data-name="${panelName}"]`);
    if (!panel) return;
    if (skipAnimation) {
      gsap.set(panel, { xPercent: 0 });
      return;
    }
    gsap.to(panel, { duration: CONFIG.ANIMATION.DURATION, ease: CONFIG.ANIMATION.EASE.POWER2.OUT, xPercent: 0 });
  }

  /**
   * Ajoute un panel à l'historique
   * @param {string} panelName - Le data-name du panel
   */
  addToNavigationHistory(panelName) { this.navigationState.push(panelName); }

  /**
   * Ferme tous les panels ouverts et ferme complètement le menu
   * Utilise la méthode closeMenu() qui gère déjà tout proprement
   */
  closeAllPanels() {
    // Utiliser la méthode existante qui ferme tout le menu proprement
    this.closeMenu(true);
  }

  /**
   * Met à jour la visibilité des boutons "exit all" 
   * Seul le dernier panel ouvert doit afficher son bouton "exit all"
   */
  updateExitAllButtonsVisibility() {
    // Déterminer le panel cible (dernier de l'historique)
    const lastPanelName = this.navigationState.current();
    let targetExitAll = null;
    if (lastPanelName) {
      const lastPanel = document.querySelector(`.menu_panel_item[data-name="${lastPanelName}"]`);
      if (lastPanel) targetExitAll = lastPanel.querySelector(CONFIG.SELECTORS.MENU_EXIT_ALL);
    }

    // Masquer tous les autres boutons sans toucher au ciblé (évite race condition)
    this.menuExitAll.forEach(btn => {
      if (btn === targetExitAll) return; // ne pas lancer un fade-out sur le ciblé
      gsap.killTweensOf(btn);
      gsap.to(btn, {
        opacity: 0,
        duration: 0.2,
        ease: CONFIG.ANIMATION.EASE.POWER2.OUT,
        onComplete: () => { btn.style.display = 'none'; }
      });
    });

    // Si aucun panel (au niveau racine) on pourrait afficher le bouton du premier panel si désiré
    if (!targetExitAll) return; // rien à afficher

    // Afficher / réanimer le bouton ciblé
    gsap.killTweensOf(targetExitAll);
    targetExitAll.style.display = 'block';
    gsap.to(targetExitAll, { opacity: 1, duration: 0.25, ease: CONFIG.ANIMATION.EASE.POWER2.OUT });
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
  const panelIndex = this.navigationState.history.indexOf(panelName);
    
    if (panelIndex === -1) {
      return false;
    }

    // Récupérer tous les panels à fermer (le panel et ses descendants)
  const panelsToClose = this.navigationState.history.slice(panelIndex);
    
    // Mettre à jour l'historique en supprimant le panel et ses descendants
  this.navigationState.history = this.navigationState.history.slice(0, panelIndex);

    // Mettre à jour les états actifs
    this.activeState.onClose(panelName);

  this.closePanels(panelsToClose, { animate: true, onComplete: () => this.updateExitAllButtonsVisibility() });
  this.updateExitAllButtonsVisibility();
  return true;
  }

  /**
   * Anime les panels séquentiellement
   * @param {HTMLElement[]} panels - Panels à animer
   * @param {Function} onComplete - Callback optionnel
   */
  animatePanelsSequentially(panels, onComplete = null, duration) {
    if (!panels.length) { onComplete && onComplete(); return; }
    const baseDur = duration || CONFIG.ANIMATION.DURATION;
    panels.reduce((p, panel) => p.then(() => new Promise(res => {
      gsap.to(panel, {
        duration: baseDur,
        ease: CONFIG.ANIMATION.EASE.POWER2.IN,
        xPercent: -101,
        onComplete: () => {
          const panelMiddle = panel.querySelector('.menu_panel_item_middle');
          if (panelMiddle) panelMiddle.scrollTop = 0;
          res();
        }
      });
    })), Promise.resolve()).then(() => onComplete && onComplete());
  }

  /**
   * Réinitialise l'historique
   */
  // (méthode legacy clearNavigationHistory retirée; utiliser navigationState.clear())

  /**
   * Remet tous les panels et l'overlay à leur état initial
   * @param {HTMLElement[]} panels - Les panels à réinitialiser
   */
  resetPanelStates(panels) {
    // Réinitialiser l'overlay
    if (this.menuOverlay) {
      this.menuOverlay.style.display = '';
      this.menuOverlay.classList.remove("is-active");
    }

    // Réinitialiser le premier panel
    if (this.menuFirstPanelItem) {
      this.menuFirstPanelItem.style.display = '';
      gsap.set(this.menuFirstPanelItem, {
        xPercent: -101,
        opacity: 1,
        pointerEvents: "auto"
      });
    }

    // Réinitialiser tous les panels passés en paramètre
    panels.forEach(panel => {
      if (panel) {
        panel.style.display = '';
        gsap.set(panel, {
          xPercent: -101,
          opacity: 1,
          pointerEvents: "auto"
        });
        
        // Réinitialiser le scroll du panel
        const panelMiddle = panel.querySelector('.menu_panel_item_middle');
        if (panelMiddle) {
          panelMiddle.scrollTop = 0;
        }
      }
    });

    // Désactiver le menu et ses éléments
    this.menu.classList.remove("is-active");
    this.menuFirstPanel.classList.remove("is-active");
    
    // Réactiver le scroll principal
    if (this.smoothScrollManager) {
      this.smoothScrollManager.enableScroll();
    }
  }

  // ==========================================
  // MÉTHODES DE GESTION DES STATUTS ACTIFS
  // ==========================================

  /**
   * Met à jour les statuts actifs de tous les éléments de navigation
   * en fonction de l'historique de navigation actuel
   */
  updateActiveStates() { this.activeState.refreshStates(); }

  /**
   * Définit l'état actif d'un élément de navigation
   * @param {string} panelName - Le data-name du panel
   * @param {boolean} isActive - Si l'élément doit être actif
   */
  // (setElementActiveState géré par NavigationActiveState)

  /**
   * Définit l'état actif d'un bouton de navigation
   * @param {HTMLElement} button - Le bouton à modifier
   * @param {boolean} isActive - Si le bouton doit être actif
   */
  // (setButtonActiveState géré par NavigationActiveState)

  /**
   * Met à jour l'état du panel actuellement visible
   * @param {string} panelName - Le data-name du panel actuel
   */
  // (setCurrentPanelState géré par NavigationActiveState)

  /**
   * Efface tous les états actifs
   */
  clearAllActiveStates() { this.activeState.clearAll(); }

  /**
   * Vérifie si un élément est dans le chemin actif
   * @param {string} panelName - Le data-name du panel
   * @returns {boolean} - True si l'élément est actif
   */
  isElementActive(panelName) {
  return this.activeState.isActive(panelName);
  }

  /**
   * Vérifie si un élément est le panel actuellement visible
   * @param {string} panelName - Le data-name du panel
   * @returns {boolean} - True si c'est le panel actuel
   */
  isCurrentPanel(panelName) {
  return this.navigationState.current() === panelName;
  }

  /**
   * Obtient le chemin d'ancêtres actifs d'un panel donné
   * @param {string} panelName - Le data-name du panel
   * @returns {string[]} - Array des ancêtres actifs
   */
  getActiveAncestors(panelName) { const idx = this.activeState.currentActivePath.indexOf(panelName); return idx === -1 ? [] : this.activeState.currentActivePath.slice(0, idx); }

  /**
   * Met à jour les états actifs lors de l'ouverture d'un panel
   * @param {string} panelName - Le data-name du panel ouvert
   */
  // (updateActiveStatesOnOpen/Close retirés au profit de NavigationActiveState)

  // ==========================================
  // CYCLE DE VIE
  // ==========================================
  destroy() {
    document.removeEventListener('click', this._onDocumentClick);
    if (this.incrementalObserver) {
      try { this.incrementalObserver.disconnect(); } catch { /* noop */ }
      this.incrementalObserver = null;
    }
    clearTimeout(this.updateTimeout);
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
      navigationHistory: this.navigationState.snapshot(),
      currentActivePath: this.activeState.snapshotPath(),
      activeElements: Array.from(this.activeState.activeElements),
      currentPanel: this.activeState.current(),
      isMenuOpen: this.menu?.classList.contains("is-active") || false
    };
  }

  /**
   * Marque un élément comme étant dans le fil d'Ariane (breadcrumb)
   * @param {string} panelName - Le data-name du panel
   * @param {boolean} isInBreadcrumb - Si l'élément fait partie du fil d'Ariane
   */
  setBreadcrumbState() { /* géré par NavigationActiveState */ }

  /**
   * Met à jour les états de fil d'Ariane pour tous les éléments
   */
  updateBreadcrumbStates() { /* géré par NavigationActiveState */ }

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

  // ==========================================
  // GESTION DES IMAGES DIFFÉRÉES
  // ==========================================

  /**
   * Charge toutes les images avec data-fetch-img après le rendu Nest
   */
  loadDeferredMedia() {
    const mediaElements = document.querySelectorAll('[data-fetch-media]');
    
    if (mediaElements.length === 0) {
      return;
    }
    
    logger.log(`🖼️ Chargement de ${mediaElements.length} images différées...`);
    
    mediaElements.forEach((element) => {
      const mediaUrl = element.dataset.fetchMedia;
      
      if (!mediaUrl) {
        return;
      }
      
      // Appliquer directement l'URL comme src
      element.src = mediaUrl;
      
      // Supprimer l'attribut pour éviter de recharger
      element.removeAttribute('data-fetch-media');
    });
    
    logger.success(`✅ ${mediaElements.length} médias chargés`);
  }

  // Méthodes RichTextManager supprimées (intégrées à WindowUtils)
}