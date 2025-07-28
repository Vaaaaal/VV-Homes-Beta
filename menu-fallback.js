// ==========================================
// GESTIONNAIRE DE FALLBACK POUR LE MENU
// ==========================================

/**
 * MenuFallback - Gère le menu de base si le MenuManager complet échoue
 * Fournit les fonctionnalités essentielles d'ouverture/fermeture
 */
export class MenuFallback {
  constructor() {
    this.menu = document.querySelector('.menu_wrap');
    this.menuButton = document.querySelector('#menu-btn');
    this.menuExit = document.querySelectorAll('.menu_exit');
    this.menuOverlay = this.menu?.querySelector('.menu_overlay');
    this.isInitialized = false;
  }
  
  /**
   * Initialise le menu de fallback avec les fonctionnalités de base
   */
  init() {
    if (!this.menu || !this.menuButton) {
      console.warn('⚠️ MenuFallback - Éléments essentiels manquants');
      return false;
    }
    
    console.log('🔄 MenuFallback - Initialisation du menu de base');
    
    // Ouverture du menu
    this.menuButton.addEventListener('click', () => {
      console.log('🍔 MenuFallback - Ouverture du menu');
      this.openMenu();
    });
    
    // Fermeture par overlay
    if (this.menuOverlay) {
      this.menuOverlay.addEventListener('click', (e) => {
        if (e.target === this.menuOverlay) {
          console.log('🍔 MenuFallback - Fermeture par overlay');
          this.closeMenu();
        }
      });
    }
    
    // Fermeture par boutons exit
    this.menuExit.forEach(exitBtn => {
      exitBtn.addEventListener('click', () => {
        console.log('🍔 MenuFallback - Fermeture par bouton exit');
        this.closeMenu();
      });
    });
    
    // Fermeture par Échap
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.menu.classList.contains('is-active')) {
        console.log('🍔 MenuFallback - Fermeture par Échap');
        this.closeMenu();
      }
    });
    
    this.isInitialized = true;
    console.log('✅ MenuFallback - Menu de base initialisé');
    return true;
  }
  
  /**
   * Ouvre le menu de manière simple
   */
  openMenu() {
    if (!this.menu) return;
    
    this.menu.classList.add('is-active');
    if (this.menuOverlay) {
      this.menuOverlay.classList.add('is-active');
    }
    
    // Animation simple avec CSS si GSAP n'est pas disponible
    if (typeof gsap === 'undefined') {
      const firstPanel = this.menu.querySelector('.menu_panel.is-col-1 .menu_panel_item');
      if (firstPanel) {
        firstPanel.style.transform = 'translateX(0%)';
        firstPanel.style.transition = 'transform 0.4s ease-out';
      }
    }
    
    // Désactiver le scroll de la page
    document.body.style.overflow = 'hidden';
  }
  
  /**
   * Ferme le menu de manière simple
   */
  closeMenu() {
    if (!this.menu) return;
    
    this.menu.classList.remove('is-active');
    if (this.menuOverlay) {
      this.menuOverlay.classList.remove('is-active');
    }
    
    // Animation simple avec CSS si GSAP n'est pas disponible
    if (typeof gsap === 'undefined') {
      const firstPanel = this.menu.querySelector('.menu_panel.is-col-1 .menu_panel_item');
      if (firstPanel) {
        firstPanel.style.transform = 'translateX(-101%)';
        firstPanel.style.transition = 'transform 0.4s ease-in';
      }
    }
    
    // Réactiver le scroll de la page
    document.body.style.overflow = '';
  }
  
  /**
   * Vérifie si le fallback est prêt
   */
  isReady() {
    return this.isInitialized;
  }
}
