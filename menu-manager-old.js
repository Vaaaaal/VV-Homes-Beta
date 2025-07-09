// ==========================================
// GESTIONNAIRE DU MENU DE NAVIGATION
// ==========================================
import { CONFIG } from './config.js';

/**
 * Gère le système de menu multi-niveaux avec les fonctionnalités suivantes :
 * - Ouverture/fermeture du menu principal et overlay
 * - Navigation hiérarchique entre les panneaux
 * - Génération dynamique des éléments de menu
 * - Gestion des dossiers, articles et boutons de fermeture
 * - Navigation automatique vers des éléments spécifiques
 * 
 * INTÉGRATION FINSWEET LIST NEST :
 * Ce système dépend de Finsweet List Nest v2 pour générer les collections imbriquées.
 * L'initialisation attend automatiquement que Finsweet ait terminé son travail avant
 * de construire les panels du menu. Les collections imbriquées sont identifiées par :
 * - .enfants-dossiers → contient les sous-dossiers d'un dossier parent
 * - .enfants-articles → contient les articles d'un dossier parent
 */
export class MenuManager {
  constructor(smoothScrollManager = null) {
    // Référence au gestionnaire de scroll fluide
    this.smoothScrollManager = smoothScrollManager;
    
    // Éléments principaux du menu
    this.menu = document.querySelector(CONFIG.SELECTORS.MENU_WRAP);
    this.menuFirstPanel = this.menu?.querySelector(CONFIG.SELECTORS.MENU_FIRST_PANEL);
    this.menuFirstPanelItem = this.menu?.querySelector(CONFIG.SELECTORS.MENU_FIRST_PANEL_ITEM);
    this.menuButton = document.querySelector(CONFIG.SELECTORS.MENU_BUTTON);
    this.menuOverlay = this.menu?.querySelector('.menu_overlay');
    
    // Historique des dossiers cliqués pour la navigation hiérarchique
    this.clickedFoldersLineage = [];
  }

  // ==========================================
  // MÉTHODES D'INITIALISATION
  // ==========================================

  /**
   * Initialise le système de menu complet
   * Attend que Finsweet List Nest ait terminé avant d'initialiser
   */
  async init() {
    console.log('[MenuManager] Démarrage de l\'initialisation...');
    
    if (!this.menu || !this.menuButton) {
      console.error('[MenuManager] Éléments de menu manquants:', { menu: !!this.menu, menuButton: !!this.menuButton });
      return;
    }
    
    console.log('[MenuManager] Attente de Finsweet List Nest...');
    // Attend que Finsweet List Nest soit chargé et ait terminé son travail
    await this.waitForFinsweetListNest();
    
    console.log('[MenuManager] Initialisation des panels...');
    this.initPanels();
    
    console.log('[MenuManager] Initialisation des événements...');
    this.initEventListeners();
    
    console.log('[MenuManager] Initialisation des liens slider...');
    this.initSliderMenuLinks();
    
    console.log('[MenuManager] Initialisation terminée avec succès !');
  }

  /**
   * Initialise tous les gestionnaires d'événements
   */
  initEventListeners() {
    // Bouton principal du menu
    this.menuButton.addEventListener("click", () => this.openMenu());
    
    // Boutons de fermeture (menu_exit)
    this.initMenuExitButtons();
    
    // Clic sur l'overlay pour fermer le menu
    this.initOverlayClick();
  }

  /**
   * Initialise les boutons de fermeture du menu
   */
  initMenuExitButtons() {
    // Délègue les événements pour les boutons de fermeture dynamiques
    document.addEventListener('click', (e) => {
      if (e.target.closest('.menu_exit')) {
        e.preventDefault();
        e.stopPropagation();
        const exitButton = e.target.closest('.menu_exit');
        this.closePanelFromExitButton(exitButton);
      }
    });
  }

  /**
   * Initialise le clic sur l'overlay pour fermer le menu
   */
  initOverlayClick() {
    if (this.menuOverlay) {
      this.menuOverlay.addEventListener('click', (e) => {
        // Ferme seulement si on clique directement sur l'overlay
        if (e.target === this.menuOverlay) {
          this.closeEntireMenu();
        }
      });
    }
  }

  /**
   * Désactive temporairement tous les clics sur les dossiers
   */
  disableFoldersInteraction() {
    const allFolders = document.querySelectorAll('.menu_panel_collection_item.is-folder');
    allFolders.forEach(folder => {
      folder.style.pointerEvents = 'none';
    });
  }

  /**
   * Réactive tous les clics sur les dossiers
   */
  enableFoldersInteraction() {
    const allFolders = document.querySelectorAll('.menu_panel_collection_item.is-folder');
    allFolders.forEach(folder => {
      folder.style.pointerEvents = 'auto';
    });
  }

  // ==========================================
  // MÉTHODES D'OUVERTURE DU MENU
  // ==========================================

  /**
   * Ouvre le menu principal avec animation
   */
  openMenu() {
    if (!this.menu.classList.contains("is-active")) {
      // Désactive le scroll du main-wrapper quand le menu s'ouvre
      if (this.smoothScrollManager) {
        this.smoothScrollManager.disableScroll();
        
        // Active le scroll pour le premier panel de menu
        this.smoothScrollManager.enableMenuScroll(this.menuFirstPanelItem);
      }
      
      // Active le menu, le premier panneau et l'overlay
      this.menu.classList.add("is-active");
      this.menuFirstPanel.classList.add("is-active");
      if (this.menuOverlay) {
        this.menuOverlay.classList.add("is-active");
      }
      
      // Récupère tous les boutons du premier panneau
      const menuFirstPanelItemButtons = gsap.utils.toArray(
        this.menuFirstPanelItem.querySelectorAll(".menu_panel_collection_item")
      );

      // Anime l'entrée du premier panneau
      gsap.to(this.menuFirstPanelItem, {
        duration: CONFIG.ANIMATION.DURATION,
        ease: CONFIG.ANIMATION.EASE.POWER2.OUT,
        xPercent: 0,
        pointerEvents: "auto"
      });

      // Attache les événements aux boutons (évite les doublons)
      this.attachFirstPanelEvents(menuFirstPanelItemButtons);
    }
  }

  /**
   * Attache les événements aux boutons du premier panel (prévient les doublons)
   * @param {Array} buttons - Liste des boutons du premier panel
   */
  attachFirstPanelEvents(buttons) {
    buttons.forEach((button) => {
      if (!button.hasAttribute('data-click-attached')) {
        button.addEventListener("click", () => this.handleFolderClick(button));
        
        // Ajoute les événements de hover pour les dossiers
        if (button.classList.contains('is-folder')) {
          button.addEventListener("mouseenter", () => this.animateFolderHover(button, true));
          button.addEventListener("mouseleave", () => this.animateFolderHover(button, false));
        }
        
        button.setAttribute('data-click-attached', 'true');
      }
    });
  }

  // ==========================================
  // MÉTHODES DE GESTION DES CLICS SUR DOSSIERS
  // ==========================================

  /**
   * Gère le clic sur un dossier pour ouvrir un sous-menu
   * @param {HTMLElement} button - Le bouton de dossier cliqué
   */
  async handleFolderClick(button) {
    if (button.classList.contains("is-active")) {
      return; // Dossier déjà actif
    }
    await this._openFolderPanel(button);
  }

  /**
   * Version forcée pour la navigation automatique (ignore l'état is-active)
   * @param {HTMLElement} button - Le bouton de dossier cliqué
   */
  async handleFolderClickForced(button) {
    await this._openFolderPanel(button);
  }

  /**
   * Méthode privée : logique principale d'ouverture d'un panel de dossier
   * @param {HTMLElement} button - Le bouton de dossier
   */
  async _openFolderPanel(button) {
    const clickedFolderName = button.dataset.name;
    const existingIndex = this.clickedFoldersLineage.indexOf(clickedFolderName);
    
    // Désactive temporairement tous les clics sur les folders
    this.disableFoldersInteraction();
    
    // Calcule quels panels fermer et met à jour la lignée
    const panelsToClose = this.calculatePanelsToClose(clickedFolderName, existingIndex);
    
    // Ferme les panels nécessaires avec animation
    await this.closePanels(panelsToClose);
    
    // Active tous les boutons ayant le même nom
    const folderSelector = `.menu_panel_collection_item.is-folder[data-name="${clickedFolderName}"]`;
    const allMatchingButtons = document.querySelectorAll(folderSelector);
    allMatchingButtons.forEach(btn => {
      btn.classList.add("is-active");
      this.animateFolderIcon(btn, true);
    });
    
    // Ouvre le nouveau panel
    this.openPanel(button, clickedFolderName);
    
    // Réactive les clics sur les folders après l'animation
    setTimeout(() => {
      this.enableFoldersInteraction();
    }, CONFIG.ANIMATION.DURATION * 1000);
  }

  // ==========================================
  // MÉTHODES UTILITAIRES
  // ==========================================

  /**
   * Anime l'icône d'un bouton de dossier (chevron ↔ circle)
   * @param {HTMLElement} button - Le bouton de dossier
   * @param {boolean} isActivating - true pour chevron→circle, false pour circle→chevron
   */
  animateFolderIcon(button, isActivating = true) {
    const firstIcon = button.querySelector('.menu_panel_collection_item_icon.is-first');
    const secondIcon = button.querySelector('.menu_panel_collection_item_icon.is-last');
    
    // Détecte si on était en état hover (première icône visible)
    const wasHovering = firstIcon && firstIcon.style.display !== 'none' && 
                       window.getComputedStyle(firstIcon).opacity !== '0';
    
    if (isActivating && wasHovering) {
      // Si on était en hover, part de l'état hover pour aller vers l'état actif
      gsap.killTweensOf([firstIcon, secondIcon]);
      
      // Animation de transition hover → actif
      gsap.fromTo(firstIcon, 
        { x: 0, opacity: 1, display: 'block' }, // État hover actuel
        {
          x: -15,
          opacity: 0,
          duration: CONFIG.ANIMATION.DURATION,
          ease: CONFIG.ANIMATION.EASE.POWER2.IN,
          onComplete: () => {
            gsap.set(firstIcon, { display: 'none' });
          }
        }
      );
      
      gsap.fromTo(secondIcon,
        { x: 15, opacity: 0, display: 'none' }, // État hover (cachée)
        {
          x: 0,
          opacity: 1,
          display: 'block',
          duration: CONFIG.ANIMATION.DURATION,
          ease: CONFIG.ANIMATION.EASE.POWER2.OUT
        }
      );
    } else {
      // Comportement normal (pas de hover avant le clic)
      this.resetHoverState(button);
    }
    
    const secondIconElement = button.querySelector('.menu_panel_collection_item_icon.is-last');
    if (!secondIconElement) return;

    const tl = gsap.timeline({ delay: wasHovering ? CONFIG.ANIMATION.DURATION : 0 });
    
    if (isActivating) {
      // Activation : chevron → circle
      tl.to(secondIconElement.querySelector('.folder_item_icon-chevron'), {
        opacity: 0,
        duration: CONFIG.ANIMATION.DURATION,
        ease: CONFIG.ANIMATION.EASE.POWER2.IN
      }).to(secondIconElement.querySelector('.folder_item_icon-circle'), {
        opacity: 1,
        duration: CONFIG.ANIMATION.DURATION,
        ease: CONFIG.ANIMATION.EASE.POWER2.OUT,
      });
    } else {
      // Désactivation : circle → chevron
      tl.to(secondIconElement.querySelector('.folder_item_icon-circle'), {
        opacity: 0,
        duration: CONFIG.ANIMATION.DURATION,
        ease: CONFIG.ANIMATION.EASE.POWER2.IN
      }).to(secondIconElement.querySelector('.folder_item_icon-chevron'), {
        opacity: 1,
        duration: CONFIG.ANIMATION.DURATION,
        ease: CONFIG.ANIMATION.EASE.POWER2.OUT,
      });
    }
  }

  /**
   * Anime les icônes au hover (effet de glissement horizontal)
   * @param {HTMLElement} button - Le bouton de dossier
   * @param {boolean} isHovering - true pour hover in, false pour hover out
   */
  animateFolderHover(button, isHovering = true) {
    // Ne pas animer si le dossier est déjà actif
    if (button.classList.contains('is-active')) return;
    
    const firstIcon = button.querySelector('.menu_panel_collection_item_icon.is-first');
    const secondIcon = button.querySelector('.menu_panel_collection_item_icon.is-last');
    
    if (!firstIcon || !secondIcon) return;

    // Tue toutes les animations en cours sur ces icônes
    gsap.killTweensOf([firstIcon, secondIcon]);

    if (isHovering) {
      // Hover in : affiche la première icône, cache la seconde
      gsap.set(firstIcon, { display: 'block' });
      
      gsap.to(secondIcon, {
        x: 15,
        opacity: 0,
        duration: 0.25,
        ease: CONFIG.ANIMATION.EASE.POWER2.OUT,
        onComplete: () => {
          gsap.set(secondIcon, { display: 'none' });
        }
      });
      
      gsap.fromTo(firstIcon, 
        { x: -15, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.25,
          ease: CONFIG.ANIMATION.EASE.POWER2.OUT
        }
      );
      
    } else {
      // Hover out : TOUJOURS revenir à l'état initial (seconde icône visible)
      gsap.set(secondIcon, { display: 'block' });
      
      gsap.to(firstIcon, {
        x: -15,
        opacity: 0,
        duration: 0.25,
        ease: CONFIG.ANIMATION.EASE.POWER2.IN,
        onComplete: () => {
          gsap.set(firstIcon, { display: 'none' });
        }
      });
      
      // Force toujours le retour à l'état initial pour la seconde icône
      gsap.to(secondIcon, {
        x: 0,
        opacity: 1,
        duration: 0.25,
        ease: CONFIG.ANIMATION.EASE.POWER2.IN,
        onComplete: () => {
          // S'assure que l'état final est cohérent
          gsap.set(firstIcon, { display: 'none', x: 0, opacity: 0 });
          gsap.set(secondIcon, { display: 'block', x: 0, opacity: 1 });
        }
      });
    }
  }

  /**
   * Annule l'animation hover et remet les icônes dans l'état par défaut
   * @param {HTMLElement} button - Le bouton de dossier
   */
  resetHoverState(button) {
    const firstIcon = button.querySelector('.menu_panel_collection_item_icon.is-first');
    const secondIcon = button.querySelector('.menu_panel_collection_item_icon.is-last');
    
    if (!firstIcon || !secondIcon) return;

    // Tue toutes les animations en cours sur ces éléments
    gsap.killTweensOf([firstIcon, secondIcon]);
    
    // Remet les icônes dans l'état par défaut (seconde icône visible)
    gsap.set(firstIcon, { 
      display: 'none', 
      x: 0, 
      opacity: 0
    });
    
    gsap.set(secondIcon, { 
      display: 'block', 
      x: 0, 
      opacity: 1
    });
  }

  // ==========================================
  // MÉTHODES DE CALCUL ET GESTION DE LA HIÉRARCHIE
  // ==========================================

  /**
   * Calcule quels panels doivent être fermés et met à jour la lignée hiérarchique
   * @param {string} clickedFolderName - Nom du dossier cliqué
   * @param {number} existingIndex - Index du dossier dans la lignée (-1 si absent)
   * @return {Array} - Liste des dossiers dont les panels doivent être fermés
   */
  calculatePanelsToClose(clickedFolderName, existingIndex) {
    if (existingIndex !== -1) {
      // Dossier déjà dans la lignée : fermer ses descendants
      const panelsToClose = this.clickedFoldersLineage.slice(existingIndex + 1);
      this.clickedFoldersLineage = this.clickedFoldersLineage.slice(0, existingIndex + 1);
      return panelsToClose;
    }

    // Nouveau dossier : analyser sa position hiérarchique
    const targetPanel = document.querySelector(`.menu_panel_item[data-parent="${clickedFolderName}"]`);
    if (!targetPanel) {
      // Dossier racine : fermer tout et réinitialiser
      const panelsToClose = [...this.clickedFoldersLineage];
      this.clickedFoldersLineage = [clickedFolderName];
      return panelsToClose;
    }

    // Insertion dans la hiérarchie
    const insertLevel = this.findInsertionLevel(targetPanel);
    const panelsToClose = this.clickedFoldersLineage.slice(insertLevel + 1);
    
    this.clickedFoldersLineage = this.clickedFoldersLineage.slice(0, insertLevel + 1);
    this.clickedFoldersLineage.push(clickedFolderName);
    
    return panelsToClose;
  }

  /**
   * Trouve le niveau d'insertion optimal pour un nouveau dossier dans la hiérarchie
   * @param {HTMLElement} targetPanel - Panel du dossier cliqué
   * @return {number} - Niveau d'insertion (-1 si racine)
   */
  findInsertionLevel(targetPanel) {
    const targetParentName = targetPanel.dataset.parent;
    const targetParent = document.querySelector(`.menu_panel_collection_item.is-folder[data-name="${targetParentName}"]`);
    
    if (!targetParent) return -1;
    
    for (let i = 0; i < this.clickedFoldersLineage.length; i++) {
      const lineageFolder = this.clickedFoldersLineage[i];
      
      // Parent direct trouvé
      if (lineageFolder === targetParentName) {
        return i;
      }
      
      // Frère détecté (même parent) - on cherche le parent du dossier de la lignée
      const lineagePanel = document.querySelector(`.menu_panel_item[data-parent="${lineageFolder}"]`);
      if (lineagePanel && lineagePanel.dataset.parent === targetParentName) {
        return i - 1;
      }
    }
    
    return -1; // Nouveau niveau racine
  }

  // ==========================================
  // MÉTHODES DE FERMETURE DES PANELS
  // ==========================================

  /**
   * Ferme une liste de panels avec animation séquentielle
   * @param {Array} panelsToClose - Liste des noms de dossiers dont fermer les panels
   */
  async closePanels(panelsToClose) {
    for (let i = panelsToClose.length - 1; i >= 0; i--) {
      const folderToClose = panelsToClose[i];
      const panelToClose = document.querySelector(`.menu_panel_item[data-parent="${folderToClose}"]`);
      
      if (panelToClose && panelToClose.classList.contains('is-active')) {
        // Désactive le scroll pour ce panel
        if (this.smoothScrollManager) {
          this.smoothScrollManager.disableMenuScroll(folderToClose);
        }
        
        panelToClose.classList.remove('is-active');
        
        // Désactive les boutons de dossier associés
        const folderBtns = document.querySelectorAll(`.menu_panel_collection_item.is-folder[data-name="${folderToClose}"]`);
        folderBtns.forEach(btn => {
          btn.classList.remove('is-active');
          this.animateFolderIcon(btn, false);
        });
        
        // Animation de fermeture avec nettoyage des classes
        await new Promise(resolve => {
          gsap.to(panelToClose, {
            xPercent: -101,
            duration: 0.3,
            ease: CONFIG.ANIMATION.EASE.POWER2.IN,
            pointerEvents: "none",
            onComplete: () => {
              // Retire la classe is-big si présente
              const parentPanel = panelToClose.closest(".menu_panel");
              if (parentPanel?.classList.contains("is-big")) {
                parentPanel.classList.remove("is-big");
              }
              resolve();
            }
          });
        });
      }
    }
  }

  /**
   * Ouvre un panel de dossier avec animation et gestion des colonnes
   * @param {HTMLElement} button - Bouton du dossier
   * @param {string} folderName - Nom du dossier
   */
  openPanel(button, folderName) {
    button.classList.add("is-active");
    this.animateFolderIcon(button, true);
    const subMenu = document.querySelector(`.menu_panel_item[data-parent="${folderName}"]`);

    // Gestion des panels à 2 colonnes
    if (button.dataset.type === "2 colonnes") {
      const parentPanel = document.querySelector(`.menu_panel_item[data-parent="${button.dataset.name}"]`)?.closest(".menu_panel");
      if (parentPanel) {
        parentPanel.classList.add("is-big");
      }
    }
    
    // Animation d'ouverture du sous-menu
    if (subMenu) {
      subMenu.classList.add('is-active');
      
      // Active le scroll pour ce panel de menu
      if (this.smoothScrollManager) {
        this.smoothScrollManager.enableMenuScroll(subMenu);
      }
      
      gsap.to(subMenu, {
        xPercent: 0,
        duration: CONFIG.ANIMATION.DURATION,
        ease: CONFIG.ANIMATION.EASE.POWER2.OUT,
        pointerEvents: "auto"
      });
    }
  }

  // ==========================================
  // MÉTHODES D'INITIALISATION DES PANELS
  // ==========================================

  /**
   * Initialise tous les panneaux de menu avec la nouvelle logique Parents → Enfants
   * Génère les panels dynamiquement basés sur la hiérarchie des dossiers parents
   */
  initPanels() {
    console.log('[MenuManager] Début de l\'initialisation des panels...');
    
    // Étape 1 : Crée les panels manquants basés sur le template
    this.createMissingPanels();
    
    // Étape 2 : NOUVELLE LOGIQUE - Construction depuis les dossiers racines
    this.buildPanelsFromRoots();

    // Vérification : si aucun panel n'a été créé, on peut essayer un fallback
    const createdPanels = document.querySelectorAll('.menu_panel_item[data-parent]');
    console.log(`[MenuManager] ${createdPanels.length} panels créés au total`);
    
    if (createdPanels.length === 0) {
      console.warn('[MenuManager] Aucun panel créé ! Finsweet List Nest pourrait ne pas être configuré sur cette page.');
      console.log('[MenuManager] Le menu fonctionnera uniquement avec le premier niveau.');
    }

    // Place tous les éléments de menu hors écran initialement
    gsap.set(".menu_panel_item", {
      xPercent: -101,           // Décale complètement à gauche
      pointerEvents: "none",    // Désactive les interactions
    });
    
    console.log('[MenuManager] Initialisation des panels terminée');
  }

  /**
   * Crée les panels manquants en dupliquant le panel template
   * Webflow n'aura besoin que du panel 1 et d'un panel template
   */
  createMissingPanels() {
    const menuWrap = this.menu;
    if (!menuWrap) return;

    // Trouve le panel template (le premier panel après is-col-1)
    const templatePanel = menuWrap.querySelector('.menu_panel:not(.is-col-1)');
    if (!templatePanel) return;

    // Détermine combien de panels sont nécessaires (maximum 4)
    const maxPanels = this.calculateMaxPanelsNeeded();
    
    // Crée les panels manquants
    for (let i = 2; i <= maxPanels; i++) {
      // Vérifie si le panel existe déjà
      const existingPanel = menuWrap.querySelector(`.menu_panel.is-col-${i}`);
      if (!existingPanel) {
        // Clone le panel template
        const newPanel = templatePanel.cloneNode(true);
        
        // Met à jour les classes
        newPanel.className = newPanel.className.replace(/is-col-\d+/, `is-col-${i}`);
        
        // Nettoie le contenu pour éviter les doublons
        this.clearPanelContent(newPanel);
        
        // Nettoie les IDs pour éviter les conflits
        this.clearElementIds(newPanel);
        
        // Ajoute le nouveau panel au menu
        menuWrap.appendChild(newPanel);
      }
    }
  }

  /**
   * Calcule le nombre maximum de panels nécessaires
   * NOUVELLE LOGIQUE : basé sur la hiérarchie des enfants Finsweet
   * @return {number} - Nombre maximum de panels nécessaires
   */
  calculateMaxPanelsNeeded() {
    let maxDepth = 1;
    
    // Parcourt tous les dossiers racines pour calculer la profondeur
    const rootFolders = document.querySelectorAll('.menu_panel.is-col-1 .menu_panel_collection_item.is-folder');
    rootFolders.forEach(rootFolder => {
      const depth = this.calculateFolderDepthFromChildren(rootFolder);
      maxDepth = Math.max(maxDepth, depth);
    });
    
    return Math.min(maxDepth, 4); // Maximum 4 panels
  }

  /**
   * NOUVELLE MÉTHODE : Calcule la profondeur hiérarchique d'un dossier via ses enfants
   * @param {HTMLElement} folder - Le dossier à analyser
   * @param {number} currentDepth - Profondeur actuelle (pour récursion)
   * @return {number} - Profondeur maximale
   */
  calculateFolderDepthFromChildren(folder, currentDepth = 1) {
    // Récupère les dossiers enfants via Finsweet
    const childFolders = folder.querySelectorAll('.enfants-dossiers .w-dyn-items .w-dyn-item');
    
    if (childFolders.length === 0) {
      // Pas d'enfants : retourne la profondeur actuelle + 1 (pour les articles)
      return currentDepth + 1;
    }
    
    let maxChildDepth = currentDepth + 1;
    
    // Calcule récursivement la profondeur de chaque enfant
    childFolders.forEach(childFolder => {
      const childDepth = this.calculateFolderDepthFromChildren(childFolder, currentDepth + 1);
      maxChildDepth = Math.max(maxChildDepth, childDepth);
    });
    
    return maxChildDepth;
  }

  /**
   * ANCIENNE MÉTHODE CONSERVÉE pour la compatibilité - sera supprimée après migration
   * Calcule la profondeur hiérarchique d'un dossier
   * @param {string} folderName - Nom du dossier
   * @return {number} - Profondeur du dossier
   */
  calculateFolderDepth(folderName) {
    // Cette méthode est conservée pour les cas de fallback
    // mais ne devrait plus être utilisée avec la nouvelle logique
    console.warn(`[MenuManager] Utilisation de l'ancienne méthode calculateFolderDepth pour ${folderName}`);
    
    let depth = 1;
    let currentFolder = document.querySelector(`.menu_panel_collection_item[data-name="${folderName}"]`);
    
    while (currentFolder && currentFolder.dataset.parent) {
      depth++;
      const parentName = currentFolder.dataset.parent;
      currentFolder = document.querySelector(`.menu_panel_collection_item[data-name="${parentName}"]`);
      
      // Évite les boucles infinies
      if (depth > 10) break;
    }
    
    return depth;
  }

  /**
   * Nettoie le contenu d'un panel cloné pour éviter les doublons
   * @param {HTMLElement} panel - Le panel à nettoyer
   */
  clearPanelContent(panel) {
    // Vide les containers de dossiers et articles
    const foldersContainer = panel.querySelector('.menu_panel_folders');
    const articlesContainer = panel.querySelector('.menu_panel_articles');
    
    if (foldersContainer) {
      // Garde la structure mais vide le contenu
      const items = foldersContainer.querySelectorAll('.menu_panel_collection_item');
      items.forEach(item => item.remove());
    }
    
    if (articlesContainer) {
      // Garde la structure mais vide le contenu
      const items = articlesContainer.querySelectorAll('.menu_panel_collection_item');
      items.forEach(item => item.remove());
    }
  }

  /**
   * ANCIENNE MÉTHODE - Plus utilisée avec la nouvelle logique Parents → Enfants
   * Conservée temporairement pour éviter les erreurs
   */
  buildPanelArray(panel) {
    console.warn('[MenuManager] buildPanelArray() est obsolète avec la nouvelle logique Parents → Enfants');
    return [];
  }

  /**
   * ANCIENNE MÉTHODE - Plus utilisée avec la nouvelle logique Parents → Enfants  
   * Conservée temporairement pour éviter les erreurs
   */
  processItems(wrapper, selector, panelArray, type) {
    console.warn('[MenuManager] processItems() est obsolète avec la nouvelle logique Parents → Enfants');
    return;
  }

  /**
   * ANCIENNE MÉTHODE - Plus utilisée avec la nouvelle logique Parents → Enfants
   * Conservée temporairement pour éviter les erreurs
   */
  createPanelItems(panel, panelArray) {
    console.warn('[MenuManager] createPanelItems() est obsolète avec la nouvelle logique Parents → Enfants');
    return;
  }

  /**
   * Crée un élément HTML complet pour un item de menu
   * MISE À JOUR pour la nouvelle logique Parents → Enfants
   * @param {Object} item - L'objet contenant les éléments clonés
   * @return {HTMLElement} - L'élément HTML créé
   */
  createPanelElement(item) {
    // Crée le container principal
    const element = document.createElement("div");
    element.classList.add("menu_panel_item");
    element.dataset.parent = item.parent;
    element.dataset.name = item.name;
    element.dataset.title = item.title;
    
    // Crée le titre
    const titleWrap = document.createElement("div");
    titleWrap.classList.add("menu_panel_item_top");
    titleWrap.innerHTML = `<div class="menu_panel_item_top-inner"><p class="menu_panel_item_title">${item.title}</p><svg class="menu_exit" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 8L12 12M12 12L16 16M12 12L16 8M12 12L8 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>`;
    element.appendChild(titleWrap);
    
    // Crée la liste des éléments
    const listWrapper = document.createElement("div");
    listWrapper.classList.add("menu_panel_item_middle");
    const list = document.createElement("div");
    listWrapper.appendChild(list);
    
    // NOUVELLE LOGIQUE : Ajoute directement les éléments clonés
    if (item.items.folders && item.items.folders.length > 0) {
      list.classList.add("menu_panel_collection_list", "is-folder");
      this.addClonedFoldersToList(list, item.items.folders);
    }
    
    if (item.items.articles && item.items.articles.length > 0) {
      list.classList.add("menu_panel_collection_list", "is-articles");
      this.addClonedArticlesToList(list, item.items.articles);
    }
    
    element.appendChild(listWrapper);
    return element;
  }

  /**
   * Ajoute les dossiers clonés à la liste avec leurs événements
   * @param {HTMLElement} list - La liste de destination
   * @param {Array} clonedFolders - Les dossiers clonés à ajouter
   */
  addClonedFoldersToList(list, clonedFolders) {
    clonedFolders.forEach((clonedFolder) => {
      // Utilise directement l'élément cloné
      const folderElement = clonedFolder.cloneNode(true);
      
      // Ajoute les événements nécessaires
      folderElement.addEventListener("click", () => this.handleFolderClick(folderElement));
      folderElement.addEventListener("mouseenter", () => this.animateFolderHover(folderElement, true));
      folderElement.addEventListener("mouseleave", () => this.animateFolderHover(folderElement, false));
      
      list.appendChild(folderElement);
    });
  }

  /**
   * Ajoute les articles clonés à la liste
   * @param {HTMLElement} list - La liste de destination
   * @param {Array} clonedArticles - Les articles clonés à ajouter
   */
  addClonedArticlesToList(list, clonedArticles) {
    clonedArticles.forEach((clonedArticle) => {
      // Utilise directement l'élément cloné
      const articleElement = clonedArticle.cloneNode(true);
      list.appendChild(articleElement);
    });
  }

  /**
   * Nettoie récursivement tous les IDs d'un élément et de ses enfants
   * pour éviter les doublons lors du clonage
   * @param {HTMLElement} element - L'élément à nettoyer
   */
  clearElementIds(element) {
    // Supprime l'ID de l'élément principal
    if (element.id) {
      element.removeAttribute('id');
    }
    
    // Supprime les IDs de tous les enfants
    const elementsWithIds = element.querySelectorAll('[id]');
    elementsWithIds.forEach(el => el.removeAttribute('id'));
  }

  // ==========================================
  // MÉTHODES DE NAVIGATION AUTOMATIQUE
  // ==========================================

  /**
   * Navigue automatiquement vers un élément spécifique du menu
   * Ouvre tous les panels ancêtres nécessaires pour atteindre l'élément cible
   * @param {string} targetName - Le nom de l'élément ciblé (data-name)
   * @param {string} preferredPath - Chemin préféré pour les articles multi-référence (optionnel)
   */
  async navigateToMenuItem(targetName, preferredPath = null) {
    // Ouvre le menu si nécessaire
    if (!this.menu.classList.contains("is-active")) {
      this.openMenu();
      await new Promise(resolve => setTimeout(resolve, CONFIG.ANIMATION.DURATION * 1000));
    }

    // Détermine et ouvre le chemin hiérarchique
    const ancestorPath = this.buildAncestorPath(targetName, preferredPath);
    await this.openAncestorPanels(ancestorPath);
  }

  /**
   * Trouve un élément de menu par son nom dans tous les panels
   * @param {string} elementName - Le nom de l'élément à trouver
   * @return {HTMLElement|null} - L'élément trouvé ou null
   */
  findMenuElement(elementName) {
    // Cherche d'abord dans les éléments de dossiers
    let element = document.querySelector(`.menu_panel_collection_item[data-name="${elementName}"]`);
    
    // Si pas trouvé, cherche dans les articles générés dynamiquement
    if (!element) {
      element = document.querySelector(`.menu_panel_item_list_item[data-name="${elementName}"]`);
    }

    return element;
  }

  /**
   * Construit le chemin complet des ancêtres pour atteindre un élément
   * Gère le nouveau système multi-référence pour les articles
   * @param {string} targetName - Le nom de l'élément ciblé
   * @param {string} preferredPath - Chemin préféré si l'élément a plusieurs parents (optionnel)
   * @return {Array} - Tableau des ancêtres dans l'ordre hiérarchique
   */
  buildAncestorPath(targetName, preferredPath = null) {
    const path = [];
    let currentElement = this.findMenuElement(targetName);
    
    if (!currentElement) return path;

    // Cas spécial pour les articles avec le nouveau système d'éléments cachés via Finsweet
    const dossiersRefs = currentElement.querySelectorAll('.enfants-dossiers .w-dyn-items .dossier-enfant, .enfants-dossiers .w-dyn-items .w-dyn-item');
    if (dossiersRefs.length > 0) {
      // Article avec plusieurs dossiers possibles
      const dossiers = Array.from(dossiersRefs).map(ref => ref.dataset.slug || ref.dataset.name);
      
      // Si un chemin préféré est spécifié, l'utiliser
      if (preferredPath && dossiers.includes(preferredPath)) {
        const preferredDossier = this.findMenuElement(preferredPath);
        if (preferredDossier) {
          return this.buildAncestorPathFromElement(preferredDossier);
        }
      }
      
      // Sinon, prendre le premier dossier disponible
      if (dossiers.length > 0) {
        const firstDossier = this.findMenuElement(dossiers[0]);
        if (firstDossier) {
          return this.buildAncestorPathFromElement(firstDossier);
        }
      }
      
      return path;
    }

    // Cas normal pour les dossiers (ancien système avec parent unique)
    return this.buildAncestorPathFromElement(currentElement);
  }

  /**
   * Construit le chemin des ancêtres à partir d'un élément donné
   * @param {HTMLElement} element - L'élément de départ
   * @return {Array} - Tableau des ancêtres dans l'ordre hiérarchique
   */
  buildAncestorPathFromElement(element) {
    const path = [];
    let currentElement = element;

    // Remonte la hiérarchie via les data-parent
    while (currentElement && currentElement.dataset.parent) {
      const parentName = currentElement.dataset.parent;
      path.unshift(parentName); // Ajoute au début pour avoir l'ordre hiérarchique
      
      // Trouve l'élément parent
      currentElement = this.findMenuElement(parentName);
    }

    return path;
  }

  /**
   * Ouvre séquentiellement tous les panels ancêtres
   * @param {Array} ancestorPath - Chemin des ancêtres à ouvrir
   */
  async openAncestorPanels(ancestorPath) {
    for (const ancestorName of ancestorPath) {
      const folderSelector = `.menu_panel_collection_item.is-folder[data-name="${ancestorName}"]`;
      const ancestorButton = document.querySelector(folderSelector);
      
      if (ancestorButton && !ancestorButton.classList.contains("is-active")) {
        // Utilise la méthode spécifique pour la navigation automatique
        await this.handleFolderClickForced(ancestorButton);
        // Petite pause pour laisser l'animation se terminer
        await new Promise(resolve => setTimeout(resolve, CONFIG.ANIMATION.DURATION * 1000 + 100));
      }
    }
  }

  /**
   * Initialise les liens de navigation depuis les éléments slider
   * Permet la navigation automatique vers des éléments spécifiques du menu
   * Supporte maintenant le système multi-référence avec un attribut de chemin préféré
   */
  initSliderMenuLinks() {
    const menuLinks = document.querySelectorAll('[data-menu-link]');
    
    menuLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const targetName = link.dataset.menuLink;
        const preferredPath = link.dataset.menuPath; // Nouveau: chemin préféré optionnel
        this.navigateToMenuItem(targetName, preferredPath);
      });
    });
  }

  // ==========================================
  // MÉTHODES DE FERMETURE SPÉCIALISÉES
  // ==========================================

  /**
   * Ferme un panel spécifique et ses descendants via bouton de fermeture
   * @param {HTMLElement} exitButton - Le bouton de fermeture cliqué
   */
  async closePanelFromExitButton(exitButton) {
    const panelItem = exitButton.closest('.menu_panel_item');
    
    // Vérifie si on est sur le premier panel
    if (panelItem.closest('.menu_panel').classList.contains('is-col-1')) {
      this.closeEntireMenu();
      return;
    }
    
    // Désactive temporairement tous les clics sur les folders
    this.disableFoldersInteraction();
    
    // Fermeture ciblée du panel et de ses descendants
    const panelParentName = panelItem.dataset.parent;
    const parentIndex = this.clickedFoldersLineage.indexOf(panelParentName);
    
    if (parentIndex !== -1) {
      // Ferme les descendants puis le panel actuel
      const descendantsToClose = this.clickedFoldersLineage.slice(parentIndex + 1);
      await this.closePanels(descendantsToClose);
      
      this.clickedFoldersLineage = this.clickedFoldersLineage.slice(0, parentIndex + 1);
      
      await this.closePanels([panelParentName]);
      this.clickedFoldersLineage = this.clickedFoldersLineage.slice(0, parentIndex);
    }
    
    // Réactive les clics sur les folders après l'animation
    setTimeout(() => {
      this.enableFoldersInteraction();
    }, CONFIG.ANIMATION.DURATION * 1000);
  }

  /**
   * Ferme complètement le menu (premier panel ou overlay)
   */
  async closeEntireMenu() {
    if (!this.menu.classList.contains("is-active")) return;
    
    // Désactive temporairement tous les clics sur les folders
    this.disableFoldersInteraction();
    
    // Ferme tous les panels ouverts de manière séquentielle
    const allOpenPanels = [...this.clickedFoldersLineage];
    await this.closePanels(allOpenPanels);
      
    // Anime la fermeture du premier panneau APRÈS avoir fermé les autres
    gsap.to(this.menuFirstPanelItem, {
      duration: CONFIG.ANIMATION.DURATION,
      ease: CONFIG.ANIMATION.EASE.POWER2.IN,
      xPercent: -101,
      pointerEvents: "none",
      onComplete: () => {
        // Désactive le menu et l'overlay
        this.menu.classList.remove("is-active");
        this.menuFirstPanel.classList.remove("is-active");
        if (this.menuOverlay) {
          this.menuOverlay.classList.remove("is-active");
        }
        
        // Nettoie toutes les instances de scroll des menus et réactive le scroll principal
        if (this.smoothScrollManager) {
          this.smoothScrollManager.cleanupMenuScrolls();
          this.smoothScrollManager.enableScroll();
        }
        
        // Réinitialise complètement l'état des panels
        this.resetAllPanels();
        this.clickedFoldersLineage = [];
        
        // Réactive les clics sur les folders
        this.enableFoldersInteraction();
      }
    });
  }

  /**
   * Remet tous les panels dans leur état initial après fermeture complète
   */
  resetAllPanels() {
    // Retire toutes les classes is-active des panels SAUF le premier panel
    const allPanelItems = document.querySelectorAll('.menu_panel_item');
    allPanelItems.forEach(panel => {
      // Ne pas affecter le premier panel qui est dans menu_panel.is-col-1
      if (!panel.closest('.menu_panel.is-col-1')) {
        panel.classList.remove('is-active');
      }
    });
    
    // Retire toutes les classes is-active des boutons de dossiers
    const allFolderButtons = document.querySelectorAll('.menu_panel_collection_item.is-folder');
    allFolderButtons.forEach(button => {
      button.classList.remove('is-active');
      this.animateFolderIcon(button, false);
      
      // Retire l'attribut de tracking SEULEMENT pour les boutons qui ne sont PAS dans le premier panel
      if (!button.closest('.menu_panel.is-col-1')) {
        button.removeAttribute('data-click-attached');
      }
    });
    
    // Retire toutes les classes is-big des menu_panel
    const allMenuPanels = document.querySelectorAll('.menu_panel.is-big');
    allMenuPanels.forEach(panel => {
      panel.classList.remove('is-big');
    });
    
    // Remet tous les panels à leur position initiale SAUF le premier panel
    const panelsToReset = document.querySelectorAll('.menu_panel_item');
    panelsToReset.forEach(panel => {
      if (!panel.closest('.menu_panel.is-col-1')) {
        gsap.set(panel, {
          xPercent: -101,
          pointerEvents: "none"
        });
      }
    });
  }

  /**
   * NOUVELLE MÉTHODE : Construit tous les panels en partant des dossiers racines
   * Utilise la logique Parents → Enfants avec Finsweet List Nest
   */
  buildPanelsFromRoots() {
    // Récupère tous les dossiers racines du premier panel
    const rootFolders = document.querySelectorAll('.menu_panel.is-col-1 .menu_panel_collection_item.is-folder');
    
    console.log(`[MenuManager] Construction des panels depuis ${rootFolders.length} dossiers racines`);
    
    if (rootFolders.length === 0) {
      console.warn('[MenuManager] Aucun dossier racine trouvé ! Vérification de la structure...');
      
      // Debug : affiche la structure réelle du premier panel
      const firstPanel = document.querySelector('.menu_panel.is-col-1');
      if (firstPanel) {
        console.log('[MenuManager] Structure du premier panel:', firstPanel);
        const allItems = firstPanel.querySelectorAll('.menu_panel_collection_item');
        console.log('[MenuManager] Items trouvés dans le premier panel:', allItems.length);
        allItems.forEach((item, index) => {
          console.log(`[MenuManager] Item ${index}:`, {
            element: item,
            classes: item.className,
            dataName: item.dataset.name,
            isFolder: item.classList.contains('is-folder')
          });
        });
      }
      return;
    }
    
    rootFolders.forEach((rootFolder, index) => {
      console.log(`[MenuManager] Traitement du dossier racine ${index + 1}: "${rootFolder.dataset.name}"`);
      // Pour chaque dossier racine, construit ses panels enfants
      this.buildPanelForFolder(rootFolder, 2); // Commence au panel 2
    });
  }

  /**
   * NOUVELLE MÉTHODE : Construit récursivement un panel pour un dossier donné
   * @param {HTMLElement} parentFolder - Le dossier parent
   * @param {number} targetPanelNumber - Numéro du panel cible (2, 3, 4)
   */
  buildPanelForFolder(parentFolder, targetPanelNumber) {
    if (targetPanelNumber > 4) return; // Maximum 4 panels
    
    const targetPanel = document.querySelector(`.menu_panel.is-col-${targetPanelNumber}`);
    if (!targetPanel) return;
    
    // Récupère les enfants de ce dossier via Finsweet
    const childrenData = this.getChildrenFromParent(parentFolder);
    
    // Crée un panel seulement s'il y a des enfants
    if (childrenData.items.folders.length > 0 || childrenData.items.articles.length > 0) {
      const panelElement = this.createPanelElement(childrenData);
      targetPanel.appendChild(panelElement);
      
      console.log(`[MenuManager] Panel ${targetPanelNumber} créé pour "${parentFolder.dataset.name}" avec ${childrenData.items.folders.length} dossiers et ${childrenData.items.articles.length} articles`);
      
      // Récursion pour les sous-dossiers
      childrenData.items.folders.forEach(childFolder => {
        this.buildPanelForFolder(childFolder, targetPanelNumber + 1);
      });
    }
  }

  /**
   * NOUVELLE MÉTHODE : Récupère tous les enfants d'un dossier parent via Finsweet
   * @param {HTMLElement} parentFolder - Le dossier parent
   * @return {Object} - Objet contenant les enfants organisés
   */
  getChildrenFromParent(parentFolder) {
    console.log(`[MenuManager] Récupération des enfants pour "${parentFolder.dataset.name}"`);
    console.log('[MenuManager] Structure du dossier parent:', parentFolder);
    
    // Récupère les enfants dossiers via Finsweet List Nest
    const enfantsDossiers = parentFolder.querySelectorAll('.enfants-dossiers .w-dyn-items .w-dyn-item');
    
    // Récupère les enfants articles via Finsweet List Nest
    const enfantsArticles = parentFolder.querySelectorAll('.enfants-articles .w-dyn-items .w-dyn-item');
    
    console.log(`[MenuManager] Trouvé ${enfantsDossiers.length} dossiers enfants et ${enfantsArticles.length} articles enfants`);
    
    // Debug : vérifie si les containers existent mais sont vides
    const enfantsDossiersContainer = parentFolder.querySelector('.enfants-dossiers');
    const enfantsArticlesContainer = parentFolder.querySelector('.enfants-articles');
    
    console.log('[MenuManager] Containers trouvés:', {
      dossiersContainer: !!enfantsDossiersContainer,
      articlesContainer: !!enfantsArticlesContainer
    });
    
    if (enfantsDossiersContainer) {
      console.log('[MenuManager] Contenu du container dossiers:', enfantsDossiersContainer);
    }
    if (enfantsArticlesContainer) {
      console.log('[MenuManager] Contenu du container articles:', enfantsArticlesContainer);
    }
    
    // Clone les éléments pour éviter les conflits DOM
    const clonedFolders = Array.from(enfantsDossiers).map(item => {
      const cloned = item.cloneNode(true);
      this.clearElementIds(cloned);
      return cloned;
    });
    
    const clonedArticles = Array.from(enfantsArticles).map(item => {
      const cloned = item.cloneNode(true);
      this.clearElementIds(cloned);
      return cloned;
    });
    
    return {
      parent: parentFolder.dataset.name,
      name: parentFolder.dataset.name,
      title: parentFolder.dataset.title || parentFolder.dataset.name,
      items: {
        folders: clonedFolders,
        articles: clonedArticles
      }
    };
  }

  /**
   * Attend que Finsweet List Nest ait terminé de traiter toutes les nested collections
   * Utilise l'API officielle de Finsweet pour détecter la fin du processus
   */
  async waitForFinsweetListNest() {
    return new Promise((resolve) => {
      console.log('[MenuManager] Attente de Finsweet List Nest via l\'API officielle...');
      
      // Méthode officielle recommandée par Finsweet
      window.FinsweetAttributes = window.FinsweetAttributes || [];
      window.FinsweetAttributes.push([
        'list',
        (listInstances) => {
          console.log('[MenuManager] Finsweet List Nest initialisé avec', listInstances.length, 'instances');
          
          // Vérifie s'il y a des instances de nesting
          const nestingPromises = [];
          listInstances.forEach(instance => {
            if (instance.items && instance.items.value) {
              instance.items.value.forEach(item => {
                if (item.nesting) {
                  nestingPromises.push(item.nesting);
                }
              });
            }
          });
          
          if (nestingPromises.length > 0) {
            console.log('[MenuManager] Attente de', nestingPromises.length, 'processus de nesting...');
            Promise.all(nestingPromises).then(() => {
              console.log('[MenuManager] Tous les processus de nesting terminés, initialisation du menu...');
              resolve();
            }).catch(error => {
              console.warn('[MenuManager] Erreur lors du nesting:', error, '- Initialisation forcée');
              resolve();
            });
          } else {
            console.log('[MenuManager] Aucun processus de nesting détecté, initialisation du menu...');
            resolve();
          }
        },
      ]);
      
      // Timeout de sécurité après 10 secondes
      setTimeout(() => {
        console.warn('[MenuManager] Timeout: Finsweet List Nest non initialisé, initialisation forcée');
        resolve();
      }, 10000);
    });
  }
}
