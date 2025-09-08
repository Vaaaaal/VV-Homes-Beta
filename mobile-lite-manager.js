// ==========================================
// GESTIONNAIRE DE MODE MOBILE LITE
// ==========================================
import logger from './logger.js';

/**
 * Gestionnaire qui surveille les changements de taille d'écran
 * et bascule automatiquement entre mode normal et mobile lite
 */
export class MobileLiteManager {
  constructor(app) {
    this.app = app;
    this.currentMode = null;
    this.breakpoint = 768;
    this.debounceTimer = null;
    this.debounceDelay = 300;
    
    this.init();
  }

  /**
   * Initialise le gestionnaire
   */
  init() {
    this.detectCurrentMode();
    this.setupResizeListener();
    
    logger.debug(' MobileLiteManager initialisé');
  }

  /**
   * Détecte le mode actuel
   */
  detectCurrentMode() {
    const isMobileLite = window.innerWidth < this.breakpoint;
    this.currentMode = isMobileLite ? 'lite' : 'full';
    
    logger.debug(` Mode détecté: ${this.currentMode} (${window.innerWidth}px)`);
  }

  /**
   * Configure l'écoute des changements de taille
   */
  setupResizeListener() {
    const handleResize = () => {
      clearTimeout(this.debounceTimer);
      
      this.debounceTimer = setTimeout(() => {
        this.checkModeChange();
      }, this.debounceDelay);
    };

    const handleOrientationChange = () => {
      // Délai plus long pour les changements d'orientation (iOS)
      clearTimeout(this.debounceTimer);
      
      this.debounceTimer = setTimeout(() => {
        this.checkModeChange();
      }, 600); // Plus long pour laisser iOS finir sa transition
    };

    // Écouter les resize et les changements d'orientation
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleOrientationChange, { passive: true });
    
    // Sauvegarder pour pouvoir nettoyer
    this.removeResizeListener = () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }

  /**
   * Vérifie si un changement de mode est nécessaire
   */
  checkModeChange() {
    const currentWidth = window.innerWidth;
    const isMobileLite = currentWidth < this.breakpoint;
    const newMode = isMobileLite ? 'lite' : 'full';
    
    // Seulement recharger si on change vraiment de catégorie (mobile ↔ desktop)
    if (newMode !== this.currentMode) {
      const wasInLiteRange = this.currentMode === 'lite';
      const nowInLiteRange = newMode === 'lite';
      
      // Si on était en lite et qu'on reste en lite (rotation mobile), pas de rechargement
      if (wasInLiteRange && nowInLiteRange) {
        logger.debug(` Rotation mobile détectée (${currentWidth}px) - pas de rechargement`);
        return;
      }
      
      // Si on était en full et qu'on reste en full (resize desktop), pas de rechargement
      if (!wasInLiteRange && !nowInLiteRange) {
        logger.debug(` Resize desktop détecté (${currentWidth}px) - pas de rechargement`);
        return;
      }
      
      // Changement réel mobile ↔ desktop
      logger.info(` Changement de mode: ${this.currentMode} → ${newMode} (${currentWidth}px)`);
      this.currentMode = newMode;
      this.handleModeChange(newMode);
    }
  }

  /**
   * Gère le changement de mode
   * @param {string} newMode - 'lite' ou 'full'
   */
  handleModeChange(newMode) {
    // Avertir l'utilisateur
    logger.info('🔄 Rechargement de la page pour appliquer le nouveau mode...');
    
    // Pour une transition fluide, on peut recharger la page
    // Dans une version plus avancée, on pourrait reconfigurer l'app à la volée
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }

  /**
   * Obtient le mode actuel
   * @returns {string} 'lite' ou 'full'
   */
  getCurrentMode() {
    return this.currentMode;
  }

  /**
   * Force un mode spécifique (pour debug)
   * @param {string} mode - 'lite' ou 'full'
   */
  forceMode(mode) {
    if (mode !== 'lite' && mode !== 'full') {
      logger.error(' Mode invalide, utilisez "lite" ou "full"');
      return;
    }
    
    logger.info(` Mode forcé: ${mode}`);
    this.currentMode = mode;
    this.handleModeChange(mode);
  }

  /**
   * Détruit le gestionnaire
   */
  destroy() {
    if (this.removeResizeListener) {
      this.removeResizeListener();
    }
    
    clearTimeout(this.debounceTimer);
    
    logger.debug(' MobileLiteManager détruit');
  }
}
