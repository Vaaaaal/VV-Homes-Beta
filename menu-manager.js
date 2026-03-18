// ==========================================
// GESTIONNAIRE DU MENU DE NAVIGATION
// ==========================================
import { CONFIG } from './config.js';
import logger from './logger.js';
import { NavigationState } from './navigation-state.js';
import { NavigationActiveState } from './navigation-active-state.js';

// (pas de constantes CMS — le DOM Webflow est déjà rendu nativement)

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
   * Initialise le menu — le DOM Webflow est déjà rendu nativement, pas d'attente requise
   */
  async init() {
    if (!this.menu || !this.menuButton) {
      throw new Error('Éléments essentiels du menu manquants');
    }
    this.cmsButtons = Array.from(document.querySelectorAll(CONFIG.SELECTORS.MENU_FOLDERS));
    this.initPanelPositions();
    this.initBasicEvents();
    this.attachCMSButtonEvents();
    logger.success('MenuManager initialisé');
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
   * Initialise les positions des panels
   */
  initPanelPositions() {
    if (this.menuPanelItems) {
      gsap.set(this.menuPanelItems, { xPercent: -101, opacity: 1, pointerEvents: "none" });
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
    let ancestorPath = this.buildAncestorPath(targetPanelName);

    // Si le bouton cible n'est pas encore connu (panel profond pas encore fetché),
    // on découvre le chemin en fetchant les panels niveau par niveau
    if (ancestorPath.length === 0 && this.cmsFetchManager) {
      ancestorPath = await this._discoverPathByFetch(targetPanelName);
    }

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
   * Découvre le chemin vers un panel en fetchant le contenu niveau par niveau (BFS)
   * Utilisé quand le bouton cible n'est pas encore dans cmsButtons
   * @param {string} targetPanelName
   * @param {number} maxDepth
   * @returns {string[]}
   */
  async _discoverPathByFetch(targetPanelName, maxDepth = 3) {
    // Si un préchauffage est en cours, l'attendre d'abord
    if (this._warmupPromise) await this._warmupPromise;
    // Tenter le chemin direct après le préchauffage
    const earlyPath = this.buildAncestorPath(targetPanelName);
    if (earlyPath.length > 0) return earlyPath;

    // Fallback : BFS avec fetches parallèles par niveau
    let toExplore = this.cmsButtons
      .filter(btn => !btn.dataset.parent)
      .map(btn => btn.dataset.name)
      .filter(Boolean);

    for (let depth = 0; depth < maxDepth; depth++) {
      // Tous les panels du niveau courant en parallèle
      await Promise.all(toExplore.map(name => this._registerButtonsFromFetch(name)));
      const path = this.buildAncestorPath(targetPanelName);
      if (path.length > 0) return path;
      // Préparer le niveau suivant
      const nextLevel = [];
      toExplore.forEach(panelName => {
        this.cmsButtons
          .filter(btn => btn.dataset.parent === panelName && btn.dataset.name)
          .forEach(btn => nextLevel.push(btn.dataset.name));
      });
      toExplore = [...new Set(nextLevel)];
      if (!toExplore.length) break;
    }
    return [];
  }

  /**
   * Fetche le contenu d'un panel et enregistre ses boutons enfants dans cmsButtons
   * sans rien rendre dans le DOM
   * @param {string} panelName
   */
  async _registerButtonsFromFetch(panelName) {
    if (!this.cmsFetchManager) return;
    const doc = await this.cmsFetchManager.fetchDoc(this._buildFetchUrl(panelName));
    if (!doc) return;
    const source = doc.querySelector('[data-panel-target]');
    if (!source) return;
    source.querySelectorAll(CONFIG.SELECTORS.MENU_FOLDERS).forEach(btn => {
      const name = btn.dataset.name;
      if (!name || this.cmsButtons.some(b => b.dataset.name === name)) return;
      // Créer un bouton fantôme pour que buildAncestorPath puisse remonter la hiérarchie
      const ghost = document.createElement('div');
      ghost.dataset.name = name;
      ghost.dataset.parent = btn.dataset.parent || panelName;
      this.cmsButtons.push(ghost);
    });
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
    this.menuFirstPanelItem.removeAttribute('aria-hidden');
    gsap.set(this.menuFirstPanelItem, { pointerEvents: "auto" });
    gsap.to(this.menuFirstPanelItem, {
      duration: CONFIG.ANIMATION.DURATION,
      ease: CONFIG.ANIMATION.EASE.POWER2.OUT,
      xPercent: 0
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
            panel.setAttribute('aria-hidden', 'true');
            gsap.set(panel, { xPercent: -101, pointerEvents: "none" });
            const m = panel.querySelector('.menu_panel_item_middle');
            if (m) m.scrollTop = 0;
          });
          this.closeMenuFinal(true);
          // Ré-initialiser les classes et le scroll du menu
          this.resetPanelStates();
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
      this.menuFirstPanelItem.setAttribute('aria-hidden', 'true');
      gsap.set(this.menuFirstPanelItem, { xPercent: -101, pointerEvents: "none" });
      const panelMiddle = this.menuFirstPanelItem.querySelector('.menu_panel_item_middle');
      if (panelMiddle) panelMiddle.scrollTop = 0;
    } else {
      // Animation de sortie du premier panel
      gsap.to(this.menuFirstPanelItem, {
        duration: CONFIG.ANIMATION.DURATION,
        ease: CONFIG.ANIMATION.EASE.POWER2.IN,
        xPercent: -101,
        onComplete: () => {
          this.menuFirstPanelItem.setAttribute('aria-hidden', 'true');
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
      elements.forEach(p => { p.setAttribute('aria-hidden', 'true'); gsap.set(p, { xPercent: -101, pointerEvents: "none" }); const m = p.querySelector('.menu_panel_item_middle'); if (m) m.scrollTop = 0; });
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
  findButtonByPanelName(panelName) {
    // Préférer un bouton réellement dans le DOM (plutôt qu'un fantôme de warmup)
    return this.cmsButtons.find(btn => btn.dataset.name === panelName && document.contains(btn))
      || this.cmsButtons.find(btn => btn.dataset.name === panelName)
      || null;
  }

  /**
   * Navigue vers un nouveau panel — pre-fetch au clic
   * @param {string} panelName - Le data-name du panel
   */
  navigateToNewPanel(panelName) {
    this.addToNavigationHistory(panelName);

    if (this.cmsFetchManager) {
      this.cmsFetchManager.prefetch(this._buildFetchUrl(panelName));
    }

    this.showPanel(panelName);
    this.activeState.onOpen(panelName);
    this.updateExitAllButtonsVisibility();
  }

  /**
   * Affiche un panel — le crée dynamiquement si inexistant, injecte le contenu fetché
   * @param {string} panelName - Le data-name du panel
   */
  showPanel(panelName, { skipAnimation = false } = {}) {
    let panel = document.querySelector(`.menu_panel_item[data-name="${panelName}"]`);

    if (!panel) {
      panel = this._createDynamicPanel(panelName);
    }
    if (!panel) return;

    if (this.cmsFetchManager) {
      const slot = panel.querySelector('.menu_panel_item_middle');
      if (!slot?.dataset.fetched) {
        slot?.classList.add('is-loading');
        this.cmsFetchManager.fetchAndInject(this._buildFetchUrl(panelName), panel).then(injected => {
          slot?.classList.remove('is-loading');
          if (injected) this._attachEventsInPanel(panel);
        });
      }
    }

    panel.removeAttribute('aria-hidden');
    gsap.set(panel, { pointerEvents: "auto" });
    if (skipAnimation) { gsap.set(panel, { xPercent: 0 }); return; }
    gsap.to(panel, { duration: CONFIG.ANIMATION.DURATION, ease: CONFIG.ANIMATION.EASE.POWER2.OUT, xPercent: 0 });
  }

  // Crée un panel vide à la volée pour les Dossiers imbriqués découverts via fetch
  _createDynamicPanel(panelName) {
    const panel = document.createElement('div');
    panel.className = 'menu_panel_item is-dynamic';
    panel.dataset.name = panelName;
    panel.innerHTML = '<div class="menu_panel_item_middle"></div>';
    gsap.set(panel, { xPercent: -101, pointerEvents: "none" });
    this.menu.appendChild(panel);
    return panel;
  }

  // Attache les events aux boutons Dossiers dans le contenu injecté
  // et définit data-parent automatiquement (pas besoin de le configurer dans Webflow)
  _attachEventsInPanel(container) {
    const parentName = container.dataset.name;
    container.querySelectorAll(CONFIG.SELECTORS.MENU_FOLDERS).forEach(btn => {
      if (!btn.hasAttribute('data-vv-initialized')) {
        if (!btn.dataset.parent) btn.dataset.parent = parentName;
        this.attachButtonEvents(btn);
        btn.setAttribute('data-vv-initialized', 'true');
        // Remplacer le bouton fantôme (warmup) par le vrai bouton DOM s'il existe
        const ghostIdx = this.cmsButtons.findIndex(b => b.dataset.name === btn.dataset.name && !document.contains(b));
        if (ghostIdx !== -1) {
          this.cmsButtons[ghostIdx] = btn;
        } else {
          this.cmsButtons.push(btn);
        }
      }
    });
    if (window.WindowUtils?.loadDeferredMedia) {
      window.WindowUtils.loadDeferredMedia();
    }
  }

  // Construit l'URL de fetch à partir du slug du panel
  _buildFetchUrl(panelName) { return `${CONFIG.FETCH_BASE_PATH}/${panelName}`; }

  // Injecte le CmsFetchManager après init et lance le préchauffage en arrière-plan
  setCmsFetchManager(manager) {
    this.cmsFetchManager = manager;
    this._warmupPromise = this._warmupButtonRegistry();
  }

  /**
   * Préchauffage silencieux : fetche tous les panels niveau par niveau en parallèle
   * pour peupler cmsButtons avant la première navigation
   */
  async _warmupButtonRegistry(maxDepth = 3) {
    let toExplore = this.cmsButtons
      .filter(btn => !btn.dataset.parent)
      .map(btn => btn.dataset.name)
      .filter(Boolean);

    for (let depth = 0; depth < maxDepth; depth++) {
      await Promise.all(toExplore.map(name => this._registerButtonsFromFetch(name)));
      const nextLevel = [];
      toExplore.forEach(panelName => {
        this.cmsButtons
          .filter(btn => btn.dataset.parent === panelName && btn.dataset.name)
          .forEach(btn => nextLevel.push(btn.dataset.name));
      });
      toExplore = [...new Set(nextLevel)];
      if (!toExplore.length) break;
    }
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
        pointerEvents: "none",
        onComplete: () => {
          panel.setAttribute('aria-hidden', 'true');
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
   * Remet le menu à son état initial (classes et scroll)
   * Les états GSAP des panels sont déjà réinitialisés avant l'appel
   */
  resetPanelStates() {
    if (this.menuOverlay) {
      this.menuOverlay.classList.remove("is-active");
    }
    this.menu.classList.remove("is-active");
    this.menuFirstPanel.classList.remove("is-active");
    if (this.smoothScrollManager) {
      this.smoothScrollManager.enableScroll();
    }
    this.menu.querySelectorAll('.menu_panel_item.is-dynamic').forEach(p => p.remove());
  }

  // ==========================================
  // CYCLE DE VIE
  // ==========================================
  destroy() {
    document.removeEventListener('click', this._onDocumentClick);
  }

}