// ==========================================
// MODE D'URGENCE POUR LES PROBLÈMES D'ORIENTATION
// ==========================================

/**
 * EmergencyMode - Désactive temporairement toutes les fonctionnalités problématiques
 * À utiliser quand le site plante lors des changements d'orientation
 */
export class EmergencyMode {
  constructor() {
    this.isActive = false;
    this.disabledFeatures = [];
    this.originalFunctions = new Map();
  }
  
  /**
   * Active le mode d'urgence
   */
  async activate() {
    if (this.isActive) {
      console.warn('⚠️ Mode d\'urgence déjà actif');
      return;
    }
    
    console.warn('🚨 ACTIVATION DU MODE D\'URGENCE');
    console.warn('🚨 Désactivation des fonctionnalités problématiques...');
    
    this.isActive = true;
    
    // 1. Désactiver les event listeners d'orientation
    this.disableOrientationListeners();
    
    // 2. Désactiver ScrollTrigger
    this.disableScrollTrigger();
    
    // 3. Désactiver les animations GSAP
    this.disableGSAPAnimations();
    
    // 4. Désactiver le smooth scroll
    this.disableSmoothScroll();
    
    // 5. Simplifier le menu
    await this.simplifyMenu();
    
    console.warn('✅ Mode d\'urgence activé - Site en mode simplifié');
    console.warn('📋 Pour réactiver: emergencyMode.deactivate()');
  }
  
  /**
   * Désactive tous les event listeners d'orientation
   */
  disableOrientationListeners() {
    console.log('🔇 Désactivation des event listeners d\'orientation...');
    
    // Sauvegarder et remplacer addEventListener pour bloquer resize/orientationchange
    if (!this.originalFunctions.has('addEventListener')) {
      this.originalFunctions.set('addEventListener', window.addEventListener);
    }
    
    window.addEventListener = (type, listener, options) => {
      if (type === 'resize' || type === 'orientationchange') {
        console.log(`🚫 Event listener ${type} bloqué par le mode d'urgence`);
        return;
      }
      return this.originalFunctions.get('addEventListener').call(window, type, listener, options);
    };
    
    // Désactiver aussi le gestionnaire d'orientation centralisé
    if (window.orientationManager) {
      window.orientationManager.isProcessing = true;
      this.disabledFeatures.push('orientationManager');
    }
    
    this.disabledFeatures.push('orientationListeners');
  }
  
  /**
   * Désactive ScrollTrigger
   */
  disableScrollTrigger() {
    if (!window.ScrollTrigger) return;
    
    console.log('📜 Désactivation de ScrollTrigger...');
    
    // Sauvegarder la fonction refresh
    if (!this.originalFunctions.has('ScrollTriggerRefresh')) {
      this.originalFunctions.set('ScrollTriggerRefresh', ScrollTrigger.refresh);
    }
    
    // Remplacer par une fonction vide
    ScrollTrigger.refresh = () => {
      console.log('🚫 ScrollTrigger.refresh() bloqué par le mode d\'urgence');
    };
    
    // Désactiver tous les triggers existants
    ScrollTrigger.getAll().forEach(trigger => trigger.disable());
    
    this.disabledFeatures.push('scrollTrigger');
  }
  
  /**
   * Désactive les animations GSAP
   */
  disableGSAPAnimations() {
    if (!window.gsap) return;
    
    console.log('🎭 Désactivation des animations GSAP...');
    
    // Tuer toutes les animations en cours
    gsap.killTweensOf('*');
    
    // Sauvegarder et remplacer les fonctions d'animation
    const gsapFunctions = ['to', 'from', 'fromTo', 'set', 'timeline'];
    
    gsapFunctions.forEach(funcName => {
      if (!this.originalFunctions.has(`gsap${funcName}`)) {
        this.originalFunctions.set(`gsap${funcName}`, gsap[funcName]);
      }
      
      gsap[funcName] = (...args) => {
        console.log(`🚫 gsap.${funcName}() bloqué par le mode d'urgence`);
        return { kill: () => {} }; // Retourner un objet factice
      };
    });
    
    this.disabledFeatures.push('gsapAnimations');
  }
  
  /**
   * Désactive le smooth scroll
   */
  disableSmoothScroll() {
    console.log('📜 Désactivation du smooth scroll...');
    
    // Désactiver Lenis si disponible
    if (window.app && window.app.smoothScrollManager && window.app.smoothScrollManager.lenis) {
      window.app.smoothScrollManager.lenis.destroy();
      this.disabledFeatures.push('lenis');
    }
    
    // S'assurer que le scroll natif fonctionne
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    
    this.disabledFeatures.push('smoothScroll');
  }
  
  /**
   * Simplifie le menu pour le rendre plus robuste
   */
  async simplifyMenu() {
    console.log('🍔 Simplification du menu...');
    
    // Désactiver le MenuManager complexe et utiliser le fallback
    if (window.app && window.app.menuManager) {
      window.app.menuManager = null;
      this.disabledFeatures.push('menuManager');
    }
    
    // Activer le menu de fallback
    if (window.app && !window.app.menuFallback) {
      try {
        const { MenuFallback } = await import('./menu-fallback.js');
        window.app.menuFallback = new MenuFallback();
        window.app.menuFallback.init();
        console.log('✅ Menu de fallback activé');
      } catch (error) {
        console.error('❌ Impossible d\'activer le menu de fallback:', error);
      }
    }
    
    this.disabledFeatures.push('complexMenu');
  }
  
  /**
   * Désactive le mode d'urgence et restaure les fonctionnalités
   */
  deactivate() {
    if (!this.isActive) {
      console.warn('⚠️ Mode d\'urgence déjà inactif');
      return;
    }
    
    console.log('🔄 DÉSACTIVATION DU MODE D\'URGENCE');
    console.log('🔄 Restauration des fonctionnalités...');
    
    // Restaurer les fonctions originales
    this.originalFunctions.forEach((originalFunc, key) => {
      switch (key) {
        case 'addEventListener':
          window.addEventListener = originalFunc;
          break;
        case 'ScrollTriggerRefresh':
          if (window.ScrollTrigger) {
            ScrollTrigger.refresh = originalFunc;
          }
          break;
        default:
          if (key.startsWith('gsap') && window.gsap) {
            const funcName = key.replace('gsap', '').toLowerCase();
            gsap[funcName] = originalFunc;
          }
      }
    });
    
    // Réactiver les fonctionnalités
    if (this.disabledFeatures.includes('orientationManager') && window.orientationManager) {
      window.orientationManager.isProcessing = false;
    }
    
    if (this.disabledFeatures.includes('scrollTrigger') && window.ScrollTrigger) {
      ScrollTrigger.getAll().forEach(trigger => trigger.enable());
      ScrollTrigger.refresh();
    }
    
    this.isActive = false;
    this.disabledFeatures = [];
    this.originalFunctions.clear();
    
    console.log('✅ Mode d\'urgence désactivé - Fonctionnalités restaurées');
    console.log('⚠️ Il est recommandé de recharger la page pour une restauration complète');
  }
  
  /**
   * Active un mode "lecture seule" encore plus restrictif
   */
  async activateReadOnlyMode() {
    console.warn('📖 ACTIVATION DU MODE LECTURE SEULE');
    
    await this.activate(); // Active d'abord le mode d'urgence
    
    // Désactiver encore plus de fonctionnalités
    this.disableAllInteractions();
    this.disableAllAnimations();
    
    console.warn('✅ Mode lecture seule activé - Site complètement statique');
  }
  
  /**
   * Désactive toutes les interactions
   */
  disableAllInteractions() {
    // Désactiver tous les event listeners de clic
    document.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('🚫 Interaction bloquée par le mode lecture seule');
    }, true);
    
    // Désactiver le menu
    const menuButton = document.querySelector('#menu-btn');
    if (menuButton) {
      menuButton.style.pointerEvents = 'none';
      menuButton.style.opacity = '0.5';
    }
  }
  
  /**
   * Désactive toutes les animations CSS aussi
   */
  disableAllAnimations() {
    const style = document.createElement('style');
    style.innerHTML = `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `;
    document.head.appendChild(style);
  }
  
  /**
   * Retourne l'état du mode d'urgence
   */
  getStatus() {
    return {
      isActive: this.isActive,
      disabledFeatures: [...this.disabledFeatures],
      originalFunctionsCount: this.originalFunctions.size
    };
  }
}

// Rendre disponible globalement
window.EmergencyMode = EmergencyMode;
window.emergencyMode = new EmergencyMode();

console.log('🚨 EmergencyMode chargé !');
console.log('📋 Commandes d\'urgence:');
console.log('  - emergencyMode.activate() : Active le mode d\'urgence');
console.log('  - emergencyMode.activateReadOnlyMode() : Mode encore plus restrictif');
console.log('  - emergencyMode.deactivate() : Désactive le mode d\'urgence');
console.log('  - emergencyMode.getStatus() : État du mode');
