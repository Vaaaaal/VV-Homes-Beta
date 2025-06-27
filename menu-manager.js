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
   */
  init() {
    if (!this.menu || !this.menuButton) return;
    
    this.initPanels();
    this.initEventListeners();
    this.initSliderMenuLinks();
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
    const targetParent = document.querySelector(`.menu_panel_collection_item.is-folder[data-name="${targetPanel.dataset.parent}"]`);
    
    for (let i = 0; i < this.clickedFoldersLineage.length; i++) {
      const lineageFolder = this.clickedFoldersLineage[i];
      
      // Parent direct trouvé
      if (lineageFolder === targetParent.dataset.parent) {
        return i;
      }
      
      // Frère détecté (même parent)
      const lineagePanel = document.querySelector(`.menu_panel_item[data-parent="${lineageFolder}"]`);
      if (lineagePanel && lineagePanel.dataset.parent === targetParent) {
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
   * Initialise tous les panneaux de menu de manière dynamique
   * Génère la structure HTML des sous-menus à partir des données existantes
   */
  initPanels() {
    // Récupère tous les panneaux sauf le premier (qui existe déjà)
    const menuPanels = gsap.utils.toArray(".menu_panel:not(.is-col-1)");

    menuPanels.forEach((panel) => {
      // Construit un tableau organisé des éléments de ce panneau
      const panelArray = this.buildPanelArray(panel);
      // Crée les éléments HTML pour ce panneau
      this.createPanelItems(panel, panelArray);
    });

    // Place tous les éléments de menu hors écran initialement
    gsap.set(".menu_panel_item", {
      xPercent: -101,           // Décale complètement à gauche
      pointerEvents: "none",    // Désactive les interactions
    });
  }

  /**
   * Construit un tableau organisé des éléments d'un panneau
   * Regroupe les dossiers et articles par parent
   * @param {HTMLElement} panel - Le panneau à analyser
   * @return {Array} - Tableau organisé des éléments
   */
  buildPanelArray(panel) {
    const folderWrap = panel.querySelector(".menu_panel_folders");
    const articleWrap = panel.querySelector(".menu_panel_articles");
    const panelArray = [];

    // Traite les dossiers s'ils existent
    if (folderWrap) {
      this.processItems(folderWrap, ".menu_panel_collection_item", panelArray, "folders");
    }

    // Traite les articles s'ils existent
    if (articleWrap) {
      this.processItems(articleWrap, ".menu_panel_collection_item", panelArray, "articles");
    }

    return panelArray;
  }

  /**
   * Traite une liste d'éléments et les organise par parent
   * Clone directement les éléments HTML pour réutilisation
   * @param {HTMLElement} wrapper - Container des éléments
   * @param {string} selector - Sélecteur CSS des éléments à traiter
   * @param {Array} panelArray - Tableau où stocker les résultats
   * @param {string} type - Type d'éléments ("folders" ou "articles")
   */
  processItems(wrapper, selector, panelArray, type) {
    const itemList = gsap.utils.toArray(wrapper.querySelectorAll(selector));
    
    itemList.forEach((item) => {
      const parent = item.dataset.parent;
      const name = item.dataset.name;
      const title = item.dataset.title;
      const parentTitle = document.querySelector(`.menu_panel_collection_item[data-name=${parent}]`);

      // Clone l'élément HTML pour réutilisation
      const clonedItem = item.cloneNode(true);
      
      // Nettoie les IDs pour éviter les doublons
      this.clearElementIds(clonedItem);

      // Cherche si un objet parent existe déjà
      let parentObj = panelArray.find(el => el.parent === parent);
      
      if (parentObj) {
        // Ajoute l'élément cloné au parent existant
        if (!parentObj.items[type]) {
          parentObj.items[type] = [];
        }
        parentObj.items[type].push(clonedItem);
      } else {
        // Crée un nouveau parent avec l'élément cloné
        const newParentObj = {
          parent: parent,
          name: name,
          title: parentTitle ? parentTitle.dataset.title : title,
          items: { [type]: [clonedItem] }
        };
        panelArray.push(newParentObj);
      }
    });
  }

  /**
   * Crée les éléments HTML pour tous les items d'un panneau
   * @param {HTMLElement} panel - Le panneau de destination
   * @param {Array} panelArray - Tableau des éléments à créer
   */
  createPanelItems(panel, panelArray) {
    panelArray.forEach((item) => {
      const element = this.createPanelElement(item);
      panel.appendChild(element);
    });
  }

  /**
   * Crée un élément HTML complet pour un item de menu
   * Utilise les éléments HTML clonés pour optimiser les performances
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
    
    // Ajoute les dossiers clonés s'ils existent
    if (item.items.folders) {
			list.classList.add("menu_panel_collection_list", "is-folder");
      this.addClonedFoldersToList(list, item.items.folders);
    }
    
    // Ajoute les articles clonés s'ils existent
    if (item.items.articles) {
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
   */
  async navigateToMenuItem(targetName) {
    // Ouvre le menu si nécessaire
    if (!this.menu.classList.contains("is-active")) {
      this.openMenu();
      await new Promise(resolve => setTimeout(resolve, CONFIG.ANIMATION.DURATION * 1000));
    }

    // Détermine et ouvre le chemin hiérarchique
    const ancestorPath = this.buildAncestorPath(targetName);
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
   * @param {string} targetName - Le nom de l'élément ciblé
   * @return {Array} - Tableau des noms des ancêtres dans l'ordre hiérarchique
   */
  buildAncestorPath(targetName) {
    const path = [];
    let currentElement = this.findMenuElement(targetName);
    
    if (!currentElement) return path;

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
   */
  initSliderMenuLinks() {
    const menuLinks = document.querySelectorAll('[data-menu-link]');
    
    menuLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const targetName = link.dataset.menuLink;
        this.navigateToMenuItem(targetName);
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

  // ==========================================
  // MÉTHODES DE GESTION DES ÉVÉNEMENTS
  // ==========================================

  /**
   * Initialise les boutons de fermeture du menu (classe menu_exit)
   * Utilise la délégation d'événements pour les éléments générés dynamiquement
   */
  initMenuExitButtons() {
    this.menu.addEventListener('click', (e) => {
      const exitButton = e.target.closest('.menu_exit');
      if (exitButton) {
        e.preventDefault();
        e.stopPropagation();
        this.closePanelFromExitButton(exitButton);
      }
    });
  }

  /**
   * Initialise le clic sur l'overlay pour fermer complètement le menu
   */
  initOverlayClick() {
    if (this.menuOverlay) {
      this.menuOverlay.addEventListener('click', () => {
        this.closeEntireMenu();
      });
    }
  }

  // ==========================================
  // MÉTHODES DE GESTION DE L'INTERACTION DES FOLDERS
  // ==========================================

  /**
   * Désactive temporairement l'interaction avec tous les folders
   * pour éviter les clics simultanés pendant les animations
   */
  disableFoldersInteraction() {
    const allFolders = document.querySelectorAll('.menu_panel_collection_item.is-folder');
    allFolders.forEach(folder => {
      folder.style.pointerEvents = 'none';
    });
  }

  /**
   * Réactive l'interaction avec tous les folders
   * après la fin des animations
   */
  enableFoldersInteraction() {
    const allFolders = document.querySelectorAll('.menu_panel_collection_item.is-folder');
    allFolders.forEach(folder => {
      folder.style.pointerEvents = 'auto';
    });
  }
}
