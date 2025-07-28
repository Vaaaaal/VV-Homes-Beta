// ==========================================
// GESTIONNAIRE DU MENU DE NAVIGATION
// ==========================================
import { CONFIG } from './config.js';
import { RichTextManager } from './rich-text-manager.js';

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
   * Initialise le système de menu
   */
  async init() {
    console.log('🍔 MenuManager - Début de l\'initialisation');
    
    if (!this.menu || !this.menuButton) {
      console.error('❌ MenuManager - Éléments essentiels manquants:', {
        menu: !!this.menu,
        menuButton: !!this.menuButton
      });
      throw new Error('Éléments essentiels du menu manquants');
    }
    
    try {
      console.log('⏳ Attente de Finsweet Attributes...');
      // Attendre que Finsweet Attributes List Nest soit chargé
      await this.waitForFinsweetAttributes();
      console.log('✅ Finsweet Attributes chargé');

      console.log('⏳ Attente des éléments CMS...');
      // Attendre que les boutons CMS soient chargés
      await this.waitForCMSElements();
      console.log('✅ Éléments CMS chargés:', this.cmsButtons.length, 'boutons trouvés');
      
      // Initialiser les positions et événements
      console.log('🎨 Initialisation des positions des panels...');
      this.initPanelPositions();
      
      console.log('🎯 Initialisation des événements...');
      this.initBasicEvents();
      
      // Randomiser les cartes de review
      console.log('🎲 Randomisation des cartes de review...');
      await this.randomizeReviewCards();
      console.log('✅ Cartes de review randomisées');
      
      // Initialiser le Rich Text Manager après que tout soit chargé
      console.log('📝 Initialisation du Rich Text Manager...');
      await this.initRichTextManager();
      console.log('✅ Rich Text Manager initialisé');
      
      console.log('🎉 MenuManager - Initialisation terminée avec succès');
      
    } catch (error) {
      console.error('❌ MenuManager - Erreur lors de l\'initialisation:', error);
      throw error; // Relancer l'erreur pour que l'app.js puisse la gérer
    }
  }

  /**
   * Attend que les boutons CMS soient chargés dans le DOM
   * @returns {Promise<void>}
   */
  async waitForCMSElements() {
    const maxAttempts = 20; // Augmenté encore plus
    const delayBetweenAttempts = 400; // Augmenté pour laisser plus de temps
    const minimumExpectedButtons = 50; // Nombre minimum attendu basé sur les logs (82 au total)
    let attempts = 0;
    let lastCount = 0;
    let stabilityCount = 0;
    
    console.log('🔍 Recherche des éléments CMS...');
    console.log(`🎯 Objectif : au moins ${minimumExpectedButtons} boutons CMS`);
    
    while (attempts < maxAttempts) {
      attempts++;
      console.log(`⏳ Tentative ${attempts}/${maxAttempts} de recherche des éléments CMS...`);
      
      // Attendre que le DOM se stabilise
      await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));
      
      // Chercher tous les boutons CMS
      const allBtnItems = document.querySelectorAll('.menu_panel_collection_item.is-btn');
      const currentCount = allBtnItems.length;
      
      console.log(`📊 ${currentCount} boutons CMS trouvés actuellement`);
      
      // Vérifier si le nombre a changé depuis la dernière tentative
      if (currentCount === lastCount && currentCount > 0) {
        stabilityCount++;
        console.log(`⏱️ Stabilité ${stabilityCount}/3 - même nombre qu'avant`);
      } else {
        stabilityCount = 0; // Reset si le nombre change
      }
      
      lastCount = currentCount;
      
      // Conditions de succès améliorées
      const hasMinimumButtons = currentCount >= minimumExpectedButtons;
      const isStable = stabilityCount >= 3; // 3 tentatives avec le même nombre
      const hasReasonableAmount = currentCount >= 20 && isStable; // Au moins 20 et stable
      
      if (hasMinimumButtons || hasReasonableAmount) {
        this.cmsButtons = Array.from(allBtnItems);
        console.log(`✅ ${currentCount} boutons CMS trouvés et stabilisés après ${attempts} tentatives`);
        
        // Vérification supplémentaire des attributs requis
        const buttonsWithDataName = this.cmsButtons.filter(btn => btn.dataset.name);
        console.log(`🏷️ ${buttonsWithDataName.length} boutons ont un data-name`);
        
        return;
      }
      
      // Log de debug périodique
      if (attempts % 3 === 0) {
        const allMenuItems = document.querySelectorAll('.menu_panel_collection_item');
        console.log(`🔍 Debug - ${allMenuItems.length} éléments .menu_panel_collection_item total`);
        
        // Vérifier les conteneurs Finsweet
        const finsweetContainers = document.querySelectorAll('[fs-cmsload-element="list"]');
        console.log(`🔍 Debug - ${finsweetContainers.length} conteneurs Finsweet trouvés`);
        
        // Vérifier si des éléments sont en cours de chargement
        const loadingElements = document.querySelectorAll('[fs-cmsload-element="loader"]');
        console.log(`⏳ ${loadingElements.length} loaders Finsweet actifs`);
      }
    }
    
    console.error(`❌ Impossible de charger suffisamment de boutons CMS après ${maxAttempts} tentatives`);
    console.error(`📊 Dernier décompte : ${lastCount} boutons (objectif: ${minimumExpectedButtons})`);
    throw new Error(`Impossible de charger les boutons CMS dans le délai imparti (${maxAttempts * delayBetweenAttempts}ms)`);
  }

  /**
   * Attend que Finsweet Attributes List Nest soit chargé
   * @returns {Promise<void>}
   */
  async waitForFinsweetAttributes() {
    const timeout = 15000; // Augmenté à 15 secondes
    
    return new Promise((resolve, reject) => {
      // Timer de sécurité
      const timeoutId = setTimeout(() => {
        console.warn('⚠️ Timeout - Finsweet Attributes n\'a pas répondu dans les temps, on continue quand même');
        resolve(); // On résout quand même pour ne pas bloquer
      }, timeout);
      
      // Initialise le système global Finsweet Attributes
      window.FinsweetAttributes ||= [];
      
      console.log('⏳ Configuration de Finsweet Attributes...');
      
      // Vérifier si Finsweet est déjà chargé
      if (window.FinsweetAttributes.length > 0) {
        console.log('🔄 Finsweet Attributes déjà initialisé, on continue...');
        clearTimeout(timeoutId);
        resolve();
        return;
      }
      
      // Surveillance supplémentaire des changements DOM
      let changeCounter = 0;
      const domObserver = new MutationObserver((mutations) => {
        changeCounter++;
        const cmsElements = document.querySelectorAll('.menu_panel_collection_item.is-btn');
        if (cmsElements.length > 10 && changeCounter > 5) {
          console.log(`🎯 Détection de ${cmsElements.length} éléments CMS via MutationObserver`);
          domObserver.disconnect();
          clearTimeout(timeoutId);
          resolve();
        }
      });
      
      domObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Attendre que List Nest soit chargé
      window.FinsweetAttributes.push([
        'list',
        async (listInstances) => {
          try {
            console.log(`📋 ${listInstances.length} instances de liste Finsweet trouvées`);
            
            // Attendre que toutes les instances soient chargées
            const loadingPromises = listInstances.map(async (instance, index) => {
              console.log(`⏳ Chargement de l'instance ${index + 1}...`);
              if (instance.loadingPaginatedItems) {
                await instance.loadingPaginatedItems;
              }
              
              // Vérification supplémentaire que l'instance a bien chargé du contenu
              await new Promise(resolve => setTimeout(resolve, 200));
            });
            
            await Promise.all(loadingPromises);
            console.log('✅ Toutes les instances Finsweet sont chargées');
            
            // Attendre un peu plus pour que le DOM se stabilise
            await new Promise(resolve => setTimeout(resolve, 500));
            
            domObserver.disconnect();
            clearTimeout(timeoutId);
            resolve();
          } catch (error) {
            console.error('❌ Erreur lors du chargement des instances Finsweet:', error);
            domObserver.disconnect();
            clearTimeout(timeoutId);
            reject(error);
          }
        }
      ]);
      
      // Fallback : si après 3 secondes on a déjà des éléments, on peut continuer
      setTimeout(() => {
        const existingElements = document.querySelectorAll('.menu_panel_collection_item.is-btn');
        if (existingElements.length > 30) {
          console.log(`🚀 Fallback - ${existingElements.length} éléments déjà présents, on continue`);
          domObserver.disconnect();
          clearTimeout(timeoutId);
          resolve();
        }
      }, 3000);
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
        });
        
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