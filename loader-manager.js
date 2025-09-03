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
    this.loaderContentTwo = this.loaderElement.querySelector('.loader_content_wrap .loader_two');
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
    
    try {
		this.isInitialized = true;
		
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

		if(!this.loaderContentOne || !this.loaderContentTwo || !this.loaderContentThree) {
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

		this.loaderElement.addEventListener('click', () => {
			logger.debug('🔄 LoaderManager - Ajout de l\'évènement de chargement');
			this.startLoading();
		});

		this.loaderElement.addEventListener('wheel', () => {
			if (this.isLoading) {
				logger.debug('🔄 LoaderManager - Chargement déjà en cours, ignore l\'évènement');
				return;
			}

			logger.debug('🔄 LoaderManager - Ajout de l\'évènement de chargement');
			this.startLoading();
		});
		this.loaderElement.addEventListener('touch', () => {
			if (this.isLoading) {
				logger.debug('🔄 LoaderManager - Chargement déjà en cours, ignore l\'évènement');
				return;
			}

			logger.debug('🔄 LoaderManager - Ajout de l\'évènement de chargement');
			this.startLoading();
		});
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
				zIndex: -1, // Assure que le loader est au-dessus de tout
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

		tl.to(this.loaderContentOne, {
			opacity: 0,
			duration: 1,
			onComplete: () => {
				logger.debug('✅ Animation de chargement 1 terminée');
				this.loaderContentOne.classList.remove('is-active');
				this.loaderContentTwo.classList.add('is-active');
			}
		}).to(this.loaderContentTwo, {
			opacity: 1,
			duration: 1,
			onComplete: () => {
				logger.debug('✅ Animation de chargement 2 terminée');
				this.loaderContentThree.classList.add('is-active');
			}
		})
		/*
		.to(this.loaderContentTwo, {
			opacity: 0,
			delay: 1,
			duration: 1,
			onComplete: () => {
				logger.debug('✅ Animation de chargement 2 terminée');
				this.loaderContentTwo.classList.remove('is-active');
				this.loaderContentThree.classList.add('is-active');
			}
		})
		*/
		.set(this.loaderContentThree, {
			opacity: 1,
		}).set(this.loaderContentThree.querySelectorAll('.slider_copy_item'), {
			left: '100%',
		}).to(this.loaderContentThree.querySelectorAll('.slider_copy_item'), {
			left: 0,
			delay: 1.5,
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
				this.loaderElement.remove();
			}
		}, "-=0.3").to(this.mainList.querySelectorAll('.slider-panel_infos'), {
			opacity: 1,
			y: 0,
			duration: 0.6,
			stagger: 0.15,
			ease: CONFIG.ANIMATION.EASE.POWER2.OUT,
			onComplete: () => {
				logger.debug('✅ Animation de chargement 4 terminée');
				gsap.set(this.mainList, { clearProps: "all" });
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
				this.loaderContentTwo.classList.add('is-active');
			}
		}).to(this.loaderContentTwo, {
			opacity: 1,
			duration: 1,
		}).to(this.loaderContentTwo, {
			opacity: 0,
			delay: 1,
			duration: 1,
			onComplete: () => {
				logger.debug('✅ Animation de chargement 2 terminée');
				this.loaderContentTwo.classList.remove('is-active');
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
			stagger: 0.15,
			ease: CONFIG.ANIMATION.EASE.POWER2.OUT,
			onComplete: () => {
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
   * Nettoie les animations et event listeners
   */
  destroy() {
    logger.debug('🧹 LoaderManager - Destruction');
    
    // Ici vous pourrez ajouter le nettoyage des animations GSAP
    // et des event listeners si nécessaire
    
    this.isInitialized = false;
    this.isLoading = false;
  }
}
