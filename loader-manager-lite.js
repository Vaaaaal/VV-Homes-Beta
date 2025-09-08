// ==========================================
// GESTIONNAIRE DU LOADER SIMPLIFIÉ (MOBILE LITE)
// ==========================================
import logger from './logger.js';

/**
 * Version simplifiée du LoaderManager pour mobile < 768px
 * Utilise uniquement des transitions fade simples
 * Pas d'animations complexes, pas de clonage d'éléments
 */
export class LoaderManagerLite {
  constructor() {
    // Références aux éléments DOM essentiels
    this.loaderElement = document.querySelector('.loader_wrap');
    this.navbar = document.querySelector('.nav_wrap');
    
    // État du loader
    this.isLoading = false;
    this.isInitialized = false;
  }

  /**
   * Initialise le gestionnaire de loader simplifié
   */
  init() {
    logger.loading('🎬 LoaderManagerLite - Initialisation (mode mobile)...');

    if (this.isInitialized) {
      logger.debug(' LoaderManagerLite déjà initialisé — skip');
      return;
    }
    this.isInitialized = true;

    try {
      // Préparation visuelle simple
      if (this.navbar) {
        gsap.set(this.navbar, { opacity: 0 });
      }

      // Bloquer le scroll pendant le chargement
      document.body.style.overflow = 'hidden';

      logger.success('✅ LoaderManagerLite initialisé avec succès');

      // Configurer l'écoute du touch/clic sur le loader
      this.initLoaderTouchListener();
      
      // Ne pas configurer l'écoute du logo en mode mobile lite
      // Le logo doit garder son comportement normal (fermer le menu)
      
      return true;
    } catch (error) {
      logger.error('❌ Erreur lors de l\'initialisation du LoaderManagerLite:', error);
      return false;
    }
  }

  /**
   * Démarre l'animation du loader simplifié
   */
  startLoader() {
    if (this.isLoading) return;
    this.isLoading = true;

    logger.loading(' Démarrage du loader lite...');

    // Animation simple de fade out du loader
    const tl = gsap.timeline({
      onComplete: () => {
        this.onLoaderComplete();
      }
    });

    // Attendre un court instant puis faire disparaître le loader
    tl.to({}, { duration: 0.5 }) // Pause courte
      .to(this.loaderElement, {
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out'
      }, '-=0.2')
      .to(this.navbar, {
        opacity: 1,
        duration: 0.6,
        ease: 'power2.out'
      }, '-=0.4');
  }

  /**
   * Appelée lorsque l'animation du loader est terminée
   */
  onLoaderComplete() {
    logger.success(' LoaderManagerLite - Animation terminée');

    // Nettoyer et rétablir le scroll
    if (this.loaderElement) {
      this.loaderElement.style.display = 'none';
    }
    
    document.body.style.overflow = '';
    document.body.style.height = '';

    this.isLoading = false;
    
    // Déclencher l'événement de fin de loader
    window.dispatchEvent(new CustomEvent('loaderComplete'));
  }

  /**
   * Configure l'écoute du touch/clic sur le loader fullscreen
   */
  initLoaderTouchListener() {
    if (!this.loaderElement) {
      logger.debug(' Loader element non trouvé pour l\'écoute du touch');
      return;
    }

    const handleLoaderTouch = (e) => {
      e.preventDefault();
      logger.info(' Touch/clic sur loader détecté - lancement du fade out');
      this.startLoader();
      
      // Retirer l'écouteur après le premier touch pour éviter les doubles déclenchements
      this.removeLoaderTouchListener();
    };

    // Écouter à la fois touch et click pour compatibilité
    this.loaderElement.addEventListener('touchstart', handleLoaderTouch, { passive: false });
    this.loaderElement.addEventListener('click', handleLoaderTouch);
    
    // Style pour indiquer que c'est interactif
    this.loaderElement.style.cursor = 'pointer';
    
    // Sauvegarder pour pouvoir nettoyer
    this.removeLoaderTouchListener = () => {
      this.loaderElement.removeEventListener('touchstart', handleLoaderTouch);
      this.loaderElement.removeEventListener('click', handleLoaderTouch);
      this.loaderElement.style.cursor = '';
    };
    
    logger.debug(' Écoute du touch/clic sur loader configurée');
  }

  /**
   * Méthode de compatibilité pour le MenuManager
   * En mode mobile lite, configure le logo pour fermer le menu
   */
  initLogoClickListener() {
    logger.debug(' initLogoClickListener appelé en mode mobile lite - configuration fermeture menu');
    
    // Chercher le logo dans le menu avec le sélecteur fourni
    const logoElement = document.querySelector('.menu_panel_item_top-link');
    
    if (!logoElement) {
      logger.warn('⚠️ Logo du menu (.menu_panel_item_top-link) non trouvé');
      return;
    }
    
    // Ajouter l'écouteur d'événement pour fermer le menu
    logoElement.addEventListener('click', (e) => {
      e.preventDefault(); // Empêcher le comportement par défaut
      logger.debug('🖱️ Clic sur le logo détecté en mode mobile lite - fermeture du menu');
      
      // Accéder au MenuManager via l'app globale pour fermer le menu
      if (window.app && window.app.menuManager) {
        window.app.menuManager.closeMenu(true);
      } else {
        logger.warn('MenuManager non accessible pour fermer le menu');
      }
    });
    
    logger.success('✅ Écouteur d\'événement du logo initialisé (fermeture menu)');
  }

  /**
   * Détruit le gestionnaire
   */
  destroy() {
    // Nettoyer les écouteurs d'événements
    if (this.removeLoaderTouchListener) {
      this.removeLoaderTouchListener();
    }
    
    if (this.loaderElement) {
      this.loaderElement.style.display = '';
      this.loaderElement.style.opacity = '';
    }
    
    if (this.navbar) {
      this.navbar.style.opacity = '';
    }
    
    document.body.style.overflow = '';
    document.body.style.height = '';
    
    this.isInitialized = false;
    this.isLoading = false;
    
    logger.debug(' LoaderManagerLite détruit');
  }
}
