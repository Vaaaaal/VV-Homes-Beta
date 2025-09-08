// ==========================================
// GESTIONNAIRE DU LOADER DE PAGE
// ==========================================
import { CONFIG } from './config.js';
import logger from './logger.js';

/**
 * Gère l'animation du loader de page :
 * - Animations d'entrée et de sortie
 * - Coordination avec le chargement des ressources
 */
export class LoaderManager {
  constructor(sliderManager = null, smoothScrollManager = null) {
    // Référence au SliderManager pour accéder aux sliderItems
    this.sliderManager = sliderManager;
    
    // Référence au SmoothScrollManager pour accéder à Lenis
    this.smoothScrollManager = smoothScrollManager;
    
    // Références aux éléments DOM du loader
    this.loaderElement = document.querySelector('.loader_wrap');
    this.loaderContentOne = this.loaderElement.querySelector('.loader_content_wrap .loader_one');
    this.loaderContentThree = this.loaderElement.querySelector('.loader_content_wrap .loader_images');
    this.sliderItems = [];
    this.navbar = document.querySelector('.nav_wrap');
    this.mainList = document.querySelector('.main-wrapper .slider-panel_wrap');

    // État du loader
    this.isLoading = false;
    this.isInitialized = false;
  }

  /**
   * Initialise le gestionnaire de loader
   * Configure les éléments DOM et prépare les animations
   */
  init() {
    logger.loading('🎬 LoaderManager - Initialisation...');

	// Guard anti-double init
	if (this.isInitialized) {
		logger.debug(' LoaderManager déjà initialisé — skip');
		return;
	}
	this.isInitialized = true;

    
    try {
		// this.isInitialized = true;
		
		// Force un reset robuste avant tout
		this.forceCompleteReset();
		
		if (!this.sliderManager) {
			logger.error('❌ SliderManager non disponible');
			return;
		}

		if(!this.navbar) {
		// if(!this.navbar || !this.mainList) {
			logger.error('❌ Navbar ou liste principale non trouvée');
			return;
		}

		gsap.set(this.navbar, {
			opacity: 0,
			y: -32,
		});

		// Détection de l'orientation pour adapter l'animation
		const currentOrientation = this.getCurrentOrientation();
		const isHorizontal = currentOrientation === "horizontal";
		
		logger.debug(`📱 Orientation détectée: ${currentOrientation}`);

		if (isHorizontal) {
			gsap.set(this.mainList, {
				xPercent: 100,
				// position: 'relative', // Utilise relative au lieu d'absolute
			});
		}
		
		// Bloquer le scroll Lenis sur mainList dès l'initialisation
		this.mainList.setAttribute('data-lenis-prevent', 'true');
		
		gsap.set(this.mainList.querySelectorAll('.slider-panel_infos'), {
			opacity: 0,
			y: -32,
		});

		const lenis = this.getLenis();

		if (lenis) {
			// Bloquer le scroll
			lenis.stop();
		}

		document.body.style.overflow = 'hidden';
		document.body.style.height = '100vh';
		
		// Récupération des premiers items du slider
		this.sliderItems = this.getSliderItems(8);

		// Copie des premiers items du slider dans loader_images et changement de nom de classe
		this.sliderItems = this.sliderItems.map(item => {
			const newItem = item.cloneNode(true);
			newItem.classList.remove('slider-panel_item');
			if(newItem.classList.contains('is-active-panel')) {
				newItem.classList.remove('is-active-panel');
			}
			newItem.classList.add('slider_copy_item');
			newItem.querySelector('.slider-panel_infos').remove();
			newItem.querySelectorAll('.media_source').forEach(el => el.remove());
			newItem.querySelectorAll('[data-menu-link]').forEach(el => el.removeAttribute('data-menu-link'));
			const spacer = document.createElement('div');
			spacer.classList.add('slider-panel_spacer');
			newItem.querySelector('.slider-panel_inner').appendChild(spacer);
			return newItem;
		});

		this.sliderItems.forEach(item => {
			this.loaderContentThree.querySelector('.slider_copy').appendChild(item);
		});

		logger.success('✅ LoaderManager initialisé avec succès');

		// Ajout de l'évènement de chargement
		this.addLoadEvent();
      
      return true;
    } catch (error) {
      logger.error('❌ Erreur lors de l\'initialisation du LoaderManager:', error);
      return false;
    }
  }

  /**
   * Ajoute l'évènement qui déclenche l'animation de chargement
   */
  	addLoadEvent() {
		if (!this.isInitialized) {
			logger.error('❌ LoaderManager n\'est pas initialisé');
			return;
		}
		// this.loaderElement.classList.add('is-active');

		if(!this.loaderContentOne || !this.loaderContentThree) {
			logger.error('❌ Contenu de loader non trouvé');
			return;
		}

		// if(window.localStorage.getItem('homepageAnimationCompleted') === 'true') {
		// 	logger.debug('✅ Animation de chargement déjà complétée, animation de stacking d\'image seulement');
		// 	this.isLoading = true;
		// 	this.loaderElement.classList.add('is-active');
		// 	this.loaderContentOne.classList.remove('is-active');
		// 	this.loaderContentOne.style.opacity = 0;
		// 	this.loaderContentTwo.classList.remove('is-active');
		// 	this.loaderContentThree.classList.add('is-active');
		// 	// Force un reset robuste avant l'animation
		// 	this.forceCompleteReset();
		// 	// Active le watchdog pour surveiller le reset pendant l'animation
		// 	if (this.smoothScrollManager) {
		// 		this.smoothScrollManager.enableResetWatchdog();
		// 	}
		// 	// Restaure le scroll de façon centralisée
		// 	this.restoreScrollCapability();
		// 	this.animateLoaderImages();
		// 	logger.debug('🔄 Animation de chargement de stacking d\'image lancée');
		// 	return;
		// }

		this._onLoaderClick = () => {
			if (this.isLoading) return;
			logger.debug('🔄 LoaderManager - déclenchement via click');
			this.startLoading();
		};
		this._onLoaderWheel = () => {
			if (this.isLoading) return;
			logger.debug('🔄 LoaderManager - déclenchement via wheel');
			this.startLoading();
		};
		this._onLoaderTouchStart = () => {
			if (this.isLoading) return;
			logger.debug('🔄 LoaderManager - déclenchement via touchstart');
			this.startLoading();
		};

		this.loaderElement.addEventListener('click', this._onLoaderClick, { passive: true });
		this.loaderElement.addEventListener('wheel', this._onLoaderWheel, { passive: true });
		this.loaderElement.addEventListener('touchstart', this._onLoaderTouchStart, { passive: true });

	}

	/**
	 * Démarre l'animation de chargement
	 */
	startLoading() {
		logger.debug('🔄 LoaderManager - Démarrage de l\'animation de chargement');
		this.isLoading = true;
		
		// Reset robuste avant l'animation
		this.forceCompleteReset();
		
		// Active le watchdog pour surveiller le reset pendant l'animation
		if (this.smoothScrollManager) {
			this.smoothScrollManager.enableResetWatchdog();
		}
		
		// Détection de l'orientation pour adapter l'animation
		const currentOrientation = this.getCurrentOrientation();
		const isHorizontal = currentOrientation === "horizontal";
		
		logger.debug(`📱 Orientation détectée: ${currentOrientation}`);

		if (isHorizontal) {
			gsap.set(this.loaderElement, {
				zIndex: -1, // Assure que le loader est au-dessous de tout
			});
			this.createHorizontalAnimation();
		} else {
			this.createVerticalAnimation();
		}
	}
	
	/**
	 * Récupère les 6 premiers items du slider
	 * @returns {Array} Tableau des 6 premiers items (par défaut)
	 */
	getSliderItems(count = 8) {
		const sliderElements = this.sliderManager.getFirstItems(count);
		const firstElement = sliderElements[0];
		const secondElement = sliderElements[1];
		sliderElements.splice(0, 2);
		sliderElements.push(firstElement, secondElement);

		logger.debug(`📋 ${sliderElements.length} sliderItems disponibles`);
		return sliderElements;
	}

	/**
	 * Récupère l'instance Lenis depuis le SmoothScrollManager
	 * @returns {Object|null} L'instance Lenis ou null si non disponible
	 */
	getLenis() {
		if (!this.smoothScrollManager || !this.smoothScrollManager.lenis) {
			logger.warn('⚠️ SmoothScrollManager ou Lenis non disponible');
			return null;
		}
		
		return this.smoothScrollManager.lenis;
	}

	/**
	 * Détermine l'orientation actuelle basée sur la taille d'écran
	 * @returns {string} "horizontal" ou "vertical"
	 */
	getCurrentOrientation() {
		// Utilise WindowUtils si disponible, sinon fallback sur window.innerWidth
		const isDesktop = window.WindowUtils ? 
		window.WindowUtils.isDesktop() : 
		window.innerWidth >= 992; // 992px comme seuil pour desktop
		
		return isDesktop ? "horizontal" : "vertical";
	}

  /**
   * Force un reset complet et robuste de tous les éléments de scroll
   * Combine les resets du SliderManager et SmoothScrollManager
   */
  forceCompleteReset() {
    logger.debug('🔄 LoaderManager: Force reset complet...');
    
    // Reset via SliderManager
    if (this.sliderManager && this.sliderManager.forceWindowScrollReset) {
      this.sliderManager.forceWindowScrollReset();
    }
    
    // Reset via SmoothScrollManager
    if (this.smoothScrollManager) {
      this.smoothScrollManager.resetToZero();
    }
    
    // Reset supplémentaire direct
    this.directScrollReset();
    
    logger.debug('✅ LoaderManager: Reset complet effectué');
  }

  /**
   * Reset direct du scroll sans dépendances
   */
  directScrollReset() {
    // Reset immédiat multiple
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.documentElement.scrollLeft = 0;
    document.body.scrollTop = 0;
    document.body.scrollLeft = 0;
    
    // Reset des containers potentiels
    const containers = [
      '.main-wrapper',
      '.slider-panel_wrap',
      '.slider-panel_list'
    ];
    
    containers.forEach(selector => {
      const container = document.querySelector(selector);
      if (container) {
        container.scrollLeft = 0;
        container.scrollTop = 0;
      }
    });
  }

  /**
   * Restaure la capacité de scroll de façon centralisée
   * Appelée uniquement à la fin complète de l'animation
   */
  restoreScrollCapability() {
    logger.debug('🔓 LoaderManager: Restauration du scroll...');
    
    // Restaure les styles du body
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';
    
    // Réactive Lenis
    const lenis = this.getLenis();
    if (lenis) {
      lenis.start();
      logger.debug('🔓 Lenis redémarré');
    }
    
    // Rafraîchit ScrollTrigger après les modifications
    if (window.ScrollTrigger) {
      ScrollTrigger.refresh();
      logger.debug('🔄 ScrollTrigger rafraîchi après le loader');
    }
    
    logger.success('🔓 Scroll restauré avec succès');
  }	
  
	/**
	 * Crée l'animation pour le mode horizontal (desktop)
	 */
	createHorizontalAnimation() {
		const tl = gsap.timeline();

		tl.set(this.loaderContentThree, {
			opacity: 1,
      onComplete: () => {
        this.loaderContentThree.classList.add('is-active');
			}
		}).set(this.loaderContentThree.querySelectorAll('.slider_copy_item'), {
			left: '100%',
		}).to(this.loaderContentThree.querySelectorAll('.slider_copy_item'), {
			left: 0,
			// delay: 1.5,
			// duration: 1,
			duration: function (index, target, list) {
				console.log((index + 1) / list.length + 1);
				return (index + 1) / list.length + 1; // Stagger basé sur l'index
			},
			// stagger: 0.2,
			stagger: function (index, target, list) {
				return ((index + 1) / list.length) * 1 + 0.5; // Stagger basé sur l'index
			},
			ease: "power4.out",
		})
		.to(this.mainList, {
			xPercent: 0,
			duration: 2.125,
			ease: "power4.out",
			onComplete: () => {
				document.body.style.overflow = 'auto';
				document.body.style.height = 'auto';
				const lenis = this.getLenis();

				if (lenis) {
					// Débloquer le scroll
					lenis.start();
				}
				
				// Rafraîchit ScrollTrigger après les modifications de layout
				if (window.ScrollTrigger) {
					ScrollTrigger.refresh();
					logger.debug('🔄 ScrollTrigger rafraîchi après le loader');
				}

        this.resetLoaderImagePositions();
			}
		}, "-=1.8")
		.to(this.navbar, {
			opacity: 1,
			y: 0,
			duration: 0.8,
			ease: CONFIG.ANIMATION.EASE.POWER2.OUT,
			onComplete: () => {
				logger.debug('✅ Animation de chargement 3 terminée');
				gsap.set(this.mainList, { clearProps: "all" });
				this.loaderContentThree.classList.add('is-active');
				this.loaderElement.classList.remove('is-active');
				this.isLoading = false;
				// this.loaderElement.remove();
			}
		}, "-=0.3").to(this.mainList.querySelectorAll('.slider-panel_infos'), {
			opacity: 1,
			y: 0,
			duration: 0.6,
			ease: CONFIG.ANIMATION.EASE.POWER2.OUT,
			onComplete: () => {
				logger.debug('✅ Animation de chargement 4 terminée');
				gsap.set(this.mainList, { clearProps: "all" });
				
				// Débloquer le scroll Lenis sur mainList
				this.unlockMainListScroll();
				
				logger.success('✅ Chargement terminé');
			}
		}, "<=0.2);");;
	}

	/**
	 * Crée l'animation pour le mode vertical (mobile)
	 */
	createVerticalAnimation() {
		const tl = gsap.timeline();

		tl.to(this.loaderContentOne, {
			opacity: 0,
			duration: 1,
			onComplete: () => {
				logger.debug('✅ Animation de chargement 1 terminée');
				this.loaderContentOne.classList.remove('is-active');
				this.loaderContentThree.classList.add('is-active');
			}
		})
		.to(this.loaderElement, {
			opacity: 0,
			duration: 1,
			onComplete: () => {
				logger.debug('✅ Animation de chargement 3 terminée');
				
				// Restaure le scroll de façon centralisée
				this.restoreScrollCapability();

				this.loaderContentThree.classList.add('is-active');
				this.loaderElement.classList.remove('is-active');
				this.isLoading = false;
				this.loaderElement.remove();
				
				// Rafraîchit ScrollTrigger après les modifications de layout
				if (window.ScrollTrigger) {
					ScrollTrigger.refresh();

					// Désactive le watchdog maintenant que l'animation est terminée
					if (this.smoothScrollManager) {
						this.smoothScrollManager.disableResetWatchdog();
					}
					
					// Reset final pour être certain
					this.forceCompleteReset();
					
					// Restaure le scroll de façon centralisée
					this.restoreScrollCapability();
					
					logger.debug('🔄 ScrollTrigger rafraîchi après le loader');

          this.resetLoaderImagePositions();
				}
			}
		}, "<=0.5")
		.to(this.navbar, {
			opacity: 1,
			y: 0,
			duration: 0.8,
			ease: CONFIG.ANIMATION.EASE.POWER2.OUT,
		}, "+=0.3").to(this.mainList.querySelectorAll('.slider-panel_infos'), {
			opacity: 1,
			y: 0,
			duration: 0.6,
			ease: CONFIG.ANIMATION.EASE.POWER2.OUT,
			onComplete: () => {
				// Débloquer le scroll Lenis sur mainList
				this.unlockMainListScroll();
				
				logger.success('✅ Chargement terminé');
			}
		}, "<=0.2);");
	}
	
	/**
	 * Lance l'animation de chargement avec stacking des images
	 * Utilise GSAP pour animer les images du loader
	 */
	// animateLoaderImages() {
	// 	if (!this.isInitialized || !this.isLoading) {
	// 		logger.warn('⚠️ LoaderManager non initialisé ou pas en cours de chargement');
	// 		return;
	// 	}

	// 	logger.debug('🔄 Animation des images du loader en cours...');
		
	// 	this.loaderContentThree.classList.add('is-active');
		
	// 	const tl = gsap.timeline();
	// 	tl.set(this.loaderContentThree, {
	// 		opacity: 1,
	// 	}).set(this.loaderContentThree.querySelectorAll('.slider_copy_item'), {
	// 		left: '100%',
	// 	}).to(this.loaderContentThree.querySelectorAll('.slider_copy_item'), {
	// 		left: 0,
	// 		duration: 1,
	// 		stagger: 0.2,
	// 		ease: "power4.out",
	// 	})
	// 	.to(this.mainList, {
	// 		xPercent: 0,
	// 		duration: 1,
	// 		ease: "power2.out",
	// 		onComplete: () => {
	// 			document.body.style.overflow = 'auto';
	// 			document.body.style.height = 'auto';
	// 			const lenis = this.getLenis();

	// 			if (lenis) {
	// 				// Débloquer le scroll
	// 				lenis.start();
	// 			}
				
	// 			// Rafraîchit ScrollTrigger après les modifications de layout
	// 			if (window.ScrollTrigger) {
	// 				ScrollTrigger.refresh();
	// 				logger.debug('🔄 ScrollTrigger rafraîchi après le loader');
	// 			}
	// 		}
	// 	}, "-=0.8")
	// 	.to(this.navbar, {
	// 		opacity: 1,
	// 		y: 0,
	// 		duration: 0.8,
	// 		ease: CONFIG.ANIMATION.EASE.POWER2.OUT,
	// 		onComplete: () => {
	// 			logger.debug('✅ Animation de chargement 3 terminée');
	// 			gsap.set(this.mainList, { clearProps: "all" });
	// 			this.loaderContentThree.classList.add('is-active');
	// 			this.loaderElement.classList.remove('is-active');
	// 			this.isLoading = false;
	// 			this.loaderElement.remove();
	// 		}
	// 	}, "+=0.3").to(this.mainList.querySelectorAll('.slider-panel_infos'), {
	// 		opacity: 1,
	// 		y: 0,
	// 		duration: 0.6,
	// 		stagger: 0.15,
	// 		ease: CONFIG.ANIMATION.EASE.POWER2.OUT,
	// 		onComplete: () => {
	// 			logger.debug('✅ Animation de chargement 4 terminée');
	// 			gsap.set(this.mainList, { clearProps: "all" });
	// 			logger.success('✅ Chargement terminé');
	// 		}
	// 	}, "<=0.2);");
	// }

  /**
   * Relance l'animation du loaderContentThree (stacking des images)
   * Méthode publique appelable depuis le menu
   */
  replayLoaderAnimation() {
    logger.debug('🔄 LoaderManager - Relance de l\'animation loaderContentThree');
    if (!this.isInitialized) {
      logger.warn('⚠️ LoaderManager non initialisé, impossible de relancer l\'animation');
      return;
    }

    if (this.isLoading) {
      logger.warn('⚠️ Animation déjà en cours, ignore la demande');
      return;
    }

    // Détection de l'orientation pour adapter le comportement
    const currentOrientation = this.getCurrentOrientation();
    const isHorizontal = currentOrientation === "horizontal";
    
    if (isHorizontal) {
      // Mode horizontal (desktop) : lancer l'animation de replay
      logger.debug('📱 Mode horizontal détecté - Lancement de l\'animation de replay');
      
      // Marquer comme en cours pour éviter les conflits
      this.isLoading = true;
      
      // Faire apparaître le loader avec un fade in fluide avant l'animation
      this.showLoaderWithFadeIn().then(() => {
        // Reset des positions avant relance
        this.resetLoaderImagePositions();
        
        // Lancer l'animation de stacking
        this.animateLoaderImagesOnly();
      });
    } else {
      // Mode vertical (mobile) : fermer simplement le menu
      logger.debug('📱 Mode vertical détecté - Fermeture du menu uniquement');
      this.closeAllPanels();
    }
  }
  
  /**
   * Fait apparaître le loader avec un effet fade in fluide
   * @returns {Promise} Promise qui se résout quand le fade in est terminé
   */
  showLoaderWithFadeIn() {
    return new Promise((resolve) => {
      if (!this.loaderElement) {
        logger.warn('⚠️ loaderElement non trouvé pour le fade in');
        resolve();
        return;
      }

      logger.debug('✨ Fade in du loader...');

      document.body.style.overflow = 'hidden';
		  document.body.style.height = '100vh';

      // Préparer le loader pour le fade in (invisible mais positionné)
      gsap.set(this.loaderElement, {
        opacity: 0,
        zIndex: '10',
        display: 'block' // Au cas où il serait masqué
      });

      // Animation de fade in
      gsap.to(this.loaderElement, {
        opacity: 1,
        duration: 0.4,
        ease: "power2.out",
        onComplete: () => {
          // 1. Fermer le menu instantanément
          this.closeAllPanels();
          
          // 2. Cacher visuellement le menu pour éviter le flickering
          this.hideMenuVisually();
          
          // 3. Remettre le scroll horizontal de mainList à 0
          this.resetMainListScroll();
          
          // 4. Repositionner mainList dans le même état qu'au chargement initial
          this.resetMainListPosition();
          
          logger.debug('✅ Fade in du loader terminé avec reset complet et menu caché');
          resolve();
        }
      });
    });
  }
  
  /**
   * Ferme tous les panels du menu (utilise la même fonction que exit_all)
   */
  closeAllPanels() {
    // Accéder au MenuManager via l'app globale si disponible
    if (window.app && window.app.menuManager) {
      logger.debug('🔒 Fermeture de tous les panels du menu (via closeAllPanels)...');
      window.app.menuManager.closeAllPanels();
    } else {
      // Fallback vers l'ancienne méthode si le MenuManager n'est pas disponible
      logger.warn('⚠️ MenuManager non disponible, utilisation de closeMenuInstantly en fallback');
      this.closeMenuInstantly();
    }
  }
  
  /**
   * Ferme le menu instantanément et le cache complètement
   */
  closeMenuInstantly() {
    // Accéder au MenuManager via l'app globale si disponible
    if (window.app && window.app.menuManager) {
      logger.debug('🔒 Fermeture instantanée du menu...');
      window.app.menuManager.closeMenu(true); // closeAll = true
    }
    
    // Fallback + masquage supplémentaire pour éviter le flickering
    const menuWrap = document.querySelector('.menu_wrap');
    if (menuWrap) {
      // Retirer les classes d'ouverture
      menuWrap.classList.remove('is-open');
      
      // Masquage robuste avec GSAP pour éviter tout flickering
      gsap.set(menuWrap, {
        opacity: 0,
        pointerEvents: 'none',
        visibility: 'hidden'
      });
      
      logger.debug('🔒 Menu fermé et caché complètement');
    }
  }
  
  /**
   * Cache visuellement le menu (sans le fermer) de manière robuste
   */
  hideMenuVisually() {
    const menuWrap = document.querySelector('.menu_wrap');
    if (menuWrap) {
      // Sauvegarder l'état actuel pour le restaurer plus tard
      this._menuOriginalOpacity = getComputedStyle(menuWrap).opacity;
      this._menuOriginalPointerEvents = getComputedStyle(menuWrap).pointerEvents;
      this._menuOriginalVisibility = getComputedStyle(menuWrap).visibility;
      
      logger.debug(`🔍 Sauvegarde menu - opacity: ${this._menuOriginalOpacity}, pointerEvents: ${this._menuOriginalPointerEvents}, visibility: ${this._menuOriginalVisibility}`);
      
      // Masquage complet et immédiat
      gsap.set(menuWrap, {
        opacity: 0,
        pointerEvents: 'none',
        visibility: 'hidden'
      });
      
      logger.debug('👻 Menu caché visuellement (complet)');
    }
  }
  
  /**
   * Réaffiche le menu visuellement avec restauration complète des propriétés
   */
  showMenuVisually() {
    const menuWrap = document.querySelector('.menu_wrap');
    if (menuWrap) {
      // Restaurer l'état d'origine ou forcer les valeurs par défaut correctes
      gsap.set(menuWrap, {
        opacity: this._menuOriginalOpacity || 1,
        pointerEvents: this._menuOriginalPointerEvents || 'auto',
        visibility: this._menuOriginalVisibility || 'visible'
      });
      
      // Sécurité supplémentaire : nettoyer toutes les propriétés inline si nécessaire
      if (!this._menuOriginalOpacity) {
        menuWrap.style.removeProperty('opacity');
      }
      if (!this._menuOriginalPointerEvents) {
        menuWrap.style.removeProperty('pointer-events');
      }
      if (!this._menuOriginalVisibility) {
        menuWrap.style.removeProperty('visibility');
      }
      
      logger.debug('👁️ Menu réaffiché visuellement avec restauration complète');
      logger.debug(`🔍 Propriétés restaurées - opacity: ${this._menuOriginalOpacity || 'default'}, pointerEvents: ${this._menuOriginalPointerEvents || 'default'}, visibility: ${this._menuOriginalVisibility || 'default'}`);
    }
  }
  
  /**
   * Remet le scroll horizontal de mainList à 0
   */
  resetMainListScroll() {
    logger.debug('🔄 Reset du scroll horizontal de mainList...');
    
    // Reset via Lenis si disponible
    const lenis = this.getLenis();
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
      logger.debug('🔄 Scroll reset via Lenis');
    }
    
    // Reset direct du mainList
    if (this.mainList) {
      this.mainList.scrollLeft = 0;
      logger.debug('🔄 Scroll horizontal de mainList reset à 0');
    }
    
    // Reset complet via les méthodes existantes
    this.forceCompleteReset();
  }
  
  /**
   * Repositionne mainList dans le même état qu'au chargement initial
   */
  resetMainListPosition() {
    if (!this.mainList) {
      logger.warn('⚠️ mainList non trouvé pour le repositionnement');
      return;
    }
    
    logger.debug('🎯 Repositionnement de mainList à l\'état initial...');
    
    // Bloquer le scroll Lenis pendant l'animation
    this.mainList.setAttribute('data-lenis-prevent', 'true');
    document.body.style.overflow = 'hidden';
		document.body.style.height = '100vh';

    logger.debug('🔒 Scroll Lenis bloqué sur mainList');
    
    // Détection de l'orientation pour adapter le repositionnement
    const currentOrientation = this.getCurrentOrientation();
    const isHorizontal = currentOrientation === "horizontal";
    
    // D'abord, nettoyer toutes les propriétés existantes
    gsap.set(this.mainList, { clearProps: "all" });
    
    if (isHorizontal) {
      // En mode horizontal, forcer le retour à xPercent: 100 comme à l'initialisation
      gsap.set(this.mainList, {
        xPercent: 100,
      });
      logger.debug('🎯 mainList repositionné à xPercent: 100 (mode horizontal)');
    } else {
      // En mode vertical, s'assurer que les transformations sont effacées
      gsap.set(this.mainList, {
        xPercent: 0,
        clearProps: "transform"
      });
      logger.debug('🎯 mainList repositionné à l\'état vertical');
    }
    
    // Reset des infos des panels (comme à l'initialisation)
    gsap.set(this.mainList.querySelectorAll('.slider-panel_infos'), {
      opacity: 0,
      y: -32,
    });
    
    // Reset de la navbar (comme à l'initialisation)
    if (this.navbar) {
      gsap.set(this.navbar, {
        opacity: 0,
        y: -32,
      });
    }
    
    logger.debug('✅ mainList repositionné avec succès - État initial restauré');
  }
  
  /**
   * Débloquer le scroll Lenis sur mainList
   */
  unlockMainListScroll() {
    if (this.mainList) {
      this.mainList.removeAttribute('data-lenis-prevent');
      logger.debug('🔓 Scroll Lenis débloqué sur mainList');
    }
  }
  
  /**
   * Remet les images du loader à leur position initiale
   */
  resetLoaderImagePositions() {
    if (!this.loaderContentThree) {
      logger.warn('⚠️ loaderContentThree non trouvé pour le reset');
      return;
    }

    gsap.set([".loader_content", ".loader_border"], { opacity: 0 });

    // Détection de l'orientation pour adapter le reset
    const currentOrientation = this.getCurrentOrientation();
    const isHorizontal = currentOrientation === "horizontal";

    if (isHorizontal) {
      // Reset immédiat des positions des images
      gsap.set(this.loaderContentThree.querySelectorAll('.slider_copy_item'), {
        left: '100%',
      });
    } else {
      // Reset immédiat des positions des images
      gsap.set(this.loaderContentThree.querySelectorAll('.slider_copy_item'), {
        left: '100%',
      });
    }
    
    logger.debug('✅ Positions des images du loader et z-index réinitialisés');
  }
  
  /**
   * Lance uniquement l'animation de stacking des images
   * Version simplifiée pour le replay depuis le menu (mode horizontal uniquement)
   */
  animateLoaderImagesOnly() {
    if (!this.loaderContentThree) {
      logger.error('❌ loaderContentThree non trouvé');
      this.isLoading = false;
      return;
    }

    logger.debug('🎬 Animation isolée du stacking d\'images (mode horizontal)...');
    
    // Remettre le z-index du loader à -1 pour l'horizontal
    gsap.set(this.loaderElement, {
      zIndex: -1,
    });
    
    // Lancer directement l'animation horizontale
    this.createHorizontalReplayAnimation();
  }
  
  /**
   * Crée l'animation de replay pour le mode horizontal
   */
  createHorizontalReplayAnimation() {
    const tl = gsap.timeline();
    
    tl.to(this.loaderContentThree.querySelectorAll('.slider_copy_item'), {
      left: 0,
      duration: function (index, target, list) {
        return (index + 1) / list.length + 1; // Durée dynamique basée sur l'index
      },
      stagger: function (index, target, list) {
        return ((index + 1) / list.length) * 1 + 0.5; // Stagger basé sur l'index
      },
      ease: "power4.out",
    }).to(this.mainList, {
			xPercent: 0,
			duration: 2.125,
			ease: "power4.out",
			onComplete: () => {
				document.body.style.overflow = 'auto';
				document.body.style.height = 'auto';
				const lenis = this.getLenis();

				if (lenis) {
					// Débloquer le scroll
					lenis.start();
				}
				
				// Rafraîchit ScrollTrigger après les modifications de layout
				if (window.ScrollTrigger) {
					ScrollTrigger.refresh();
					logger.debug('🔄 ScrollTrigger rafraîchi après le loader');
				}

        // Ne pas réafficher le menu ici - attendre la fin de l'animation
			}
		}, "-=1.8")
		.to(this.navbar, {
			opacity: 1,
			y: 0,
			duration: 0.8,
			ease: CONFIG.ANIMATION.EASE.POWER2.OUT,
		}, "-=0.3").to(this.mainList.querySelectorAll('.slider-panel_infos'), {
			opacity: 1,
			y: 0,
			duration: 0.6,
			ease: CONFIG.ANIMATION.EASE.POWER2.OUT,
			onComplete: () => {
				logger.debug('✅ Animation des infos panels terminée (horizontal replay)');
				gsap.set(this.mainList, { clearProps: "all" });
				
				// Réafficher le menu visuellement maintenant que l'animation est presque terminée
				this.showMenuVisually();
				
				// Ajouter un délai puis fade out fluide
				gsap.to(this.loaderElement, {
					opacity: 0,
					duration: 0.3,
					delay: 0.2, // Petit délai pour apprécier l'animation
					ease: "power2.out",
					onComplete: () => {
						// Remettre le z-index à -1 pour que le loader passe derrière
						gsap.set(this.loaderElement, {
							zIndex: -1,
						});

						this.resetLoaderImagePositions();
						
						// Débloquer le scroll Lenis sur mainList
						this.unlockMainListScroll();
						
						logger.success('✅ Animation de replay horizontale terminée avec fade out');
						this.isLoading = false;
					}
				});
			}
		}, "<=0.2");
  }
  
  /**
   * Initialise l'écouteur d'événement pour le logo du menu
   * À appeler après l'initialisation du MenuManager
   */
  initLogoClickListener() {
    // Chercher le logo dans le menu avec le sélecteur fourni
    const logoElement = document.querySelector('.menu_panel_item_top-link');
    
    if (!logoElement) {
      logger.warn('⚠️ Logo du menu (.menu_panel_item_top-link) non trouvé');
      return;
    }
    
    // Ajouter l'écouteur d'événement
    logoElement.addEventListener('click', (e) => {
      e.preventDefault(); // Empêcher le comportement par défaut
      logger.debug('🖱️ Clic sur le logo détecté, relance de l\'animation');
      this.replayLoaderAnimation();
    });
    
    logger.success('✅ Écouteur d\'événement du logo initialisé');
  }

  /**
   * Nettoie les animations et event listeners
   */
  destroy() {
    logger.debug('🧹 LoaderManager - Destruction');
    
    // Ici vous pourrez ajouter le nettoyage des animations GSAP
    // et des event listeners si nécessaire

	if (this.loaderElement) {
		if (this._onLoaderClick)      this.loaderElement.removeEventListener('click', this._onLoaderClick);
		if (this._onLoaderWheel)      this.loaderElement.removeEventListener('wheel', this._onLoaderWheel);
		if (this._onLoaderTouchStart) this.loaderElement.removeEventListener('touchstart', this._onLoaderTouchStart);
	}
    
    this.isInitialized = false;
    this.isLoading = false;
  }
}
