// ==========================================
// CONFIGURATION MOBILE LITE
// ==========================================

/**
 * Configuration spécifique pour le mode mobile lite
 * Définit quelles fonctionnalités sont activées/désactivées
 */
export const MOBILE_LITE_CONFIG = {
  // Seuil de largeur pour activer le mode lite
  BREAKPOINT: 768,
  
  // Fonctionnalités désactivées en mode lite
  DISABLED_FEATURES: {
    SLIDER_MANAGER: true,           // Slider horizontal complexe
    SWIPER_MANAGER: true,          // Swipers dans les modales
    MODAL_MANAGER: true,           // Modales avec swipers
    COMPLEX_LOADER: true,          // Animations loader complexes
    LENIS_SMOOTH_SCROLL: true,     // Scroll fluide Lenis
    SCROLL_TRIGGER_HEAVY: true,    // ScrollTrigger complexe
    GSAP_HEAVY_ANIMATIONS: true,   // Animations GSAP lourdes
  },
  
  // Fonctionnalités simplifiées en mode lite
  SIMPLIFIED_FEATURES: {
    LOADER: {
      USE_FADE_ONLY: true,         // Seulement fade in/out
      DURATION: 0.8,               // Durée réduite
      SKIP_CLONING: true,          // Pas de clonage d'éléments
    },
    
    SCROLL: {
      USE_NATIVE: true,            // Scroll natif navigateur
      SMOOTH_BEHAVIOR: true,       // CSS smooth scroll
      ENHANCED_TOUCH: true,        // Optimisations tactiles iOS
    },
    
    ANIMATIONS: {
      REDUCE_MOTION: true,         // Respecter prefers-reduced-motion
      SHORTER_DURATIONS: true,     // Durées d'animation réduites
      SKIP_COMPLEX_EASING: true,   // Easing simplifié
    },
    
    MENU: {
      USE_FALLBACK: false,         // MenuManager normal mais simplifié
      INSTANT_TRANSITIONS: true,   // Transitions instantanées
    }
  },
  
  // Messages de debug
  DEBUG: {
    LOG_MODE_CHANGES: true,
    SHOW_PERFORMANCE_HINTS: true,
    WARN_DISABLED_FEATURES: false, // Éviter le spam
  }
};

/**
 * Vérifie si une fonctionnalité est désactivée en mode lite
 * @param {string} feature - Nom de la fonctionnalité
 * @returns {boolean}
 */
export function isFeatureDisabled(feature) {
  const isMobileLite = window.WindowUtils ? 
    window.WindowUtils.isMobileLite() : 
    window.innerWidth < MOBILE_LITE_CONFIG.BREAKPOINT;
    
  return isMobileLite && MOBILE_LITE_CONFIG.DISABLED_FEATURES[feature];
}

/**
 * Obtient la configuration d'une fonctionnalité simplifiée
 * @param {string} feature - Nom de la fonctionnalité
 * @returns {Object|null}
 */
export function getSimplifiedConfig(feature) {
  const isMobileLite = window.WindowUtils ? 
    window.WindowUtils.isMobileLite() : 
    window.innerWidth < MOBILE_LITE_CONFIG.BREAKPOINT;
    
  if (!isMobileLite) return null;
  
  return MOBILE_LITE_CONFIG.SIMPLIFIED_FEATURES[feature] || null;
}

/**
 * Vérifie si le mode mobile lite est actif
 * @returns {boolean}
 */
export function isMobileLiteActive() {
  return window.WindowUtils ? 
    window.WindowUtils.isMobileLite() : 
    window.innerWidth < MOBILE_LITE_CONFIG.BREAKPOINT;
}
