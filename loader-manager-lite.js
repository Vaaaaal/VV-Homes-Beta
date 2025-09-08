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

      // Ajout de l'évènement de chargement
      this.addLoadEvent();
      
      return true;
    } catch (error) {
      logger.error('❌ Erreur lors de l\'initialisation du LoaderManagerLite:', error);
      return false;
    }
  }

  /**
   * Ajoute l'évènement de chargement
   */
  addLoadEvent() {
    if (document.readyState === 'complete') {
      this.startLoader();
    } else {
      window.addEventListener('load', () => this.startLoader());
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
   * Méthode pour relancer l'animation (compatibilité avec LoaderManager)
   */
  initLogoClickListener() {
    const logo = document.querySelector('.nav_logo_link');
    if (!logo) return;

    logo.addEventListener('click', (e) => {
      if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        e.preventDefault();
        this.startLoader();
      }
    });
  }

  /**
   * Détruit le gestionnaire
   */
  destroy() {
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
