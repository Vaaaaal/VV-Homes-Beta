/**
 * Utilities for window dimensions and responsive breakpoints
 */

// Breakpoints configuration
const BREAKPOINTS = {
    mobile: 480,
    mobileLandscape: 768,
    tablet: 992,
    desktop: 1200,
    largeDesktop: 1440
};

/**
 * Get current window dimensions
 * @returns {Object} Object containing width and height
 */
function getWindowDimensions() {
    return {
        width: window.innerWidth,
        height: window.innerHeight
    };
}

/**
 * Check if window is below a certain breakpoint
 * @param {string} breakpoint - The breakpoint name (mobile, tablet, etc.)
 * @returns {boolean}
 */
function isBelowBreakpoint(breakpoint) {
    const breakpointValue = BREAKPOINTS[breakpoint];
    if (!breakpointValue) {
        return false;
    }
    return window.innerWidth < breakpointValue;
}

/**
 * Check if window is above a certain breakpoint
 * @param {string} breakpoint - The breakpoint name (mobile, tablet, etc.)
 * @returns {boolean}
 */
function isAboveBreakpoint(breakpoint) {
    const breakpointValue = BREAKPOINTS[breakpoint];
    if (!breakpointValue) {
        return false;
    }
    return window.innerWidth >= breakpointValue;
}

/**
 * Check if window is between two breakpoints
 * @param {string} minBreakpoint - The minimum breakpoint
 * @param {string} maxBreakpoint - The maximum breakpoint
 * @returns {boolean}
 */
function isBetweenBreakpoints(minBreakpoint, maxBreakpoint) {
    const minValue = BREAKPOINTS[minBreakpoint];
    const maxValue = BREAKPOINTS[maxBreakpoint];
    
    if (!minValue || !maxValue) {
        return false;
    }
    
    return window.innerWidth >= minValue && window.innerWidth < maxValue;
}

/**
 * Check if device is mobile (below tablet breakpoint)
 * @returns {boolean}
 */
function isMobile() {
    return window.innerWidth < BREAKPOINTS.tablet;
}

/**
 * Check if device is mobile portrait
 * @returns {boolean}
 */
function isMobilePortrait() {
    return window.innerWidth < BREAKPOINTS.mobile;
}

/**
 * Check if device is mobile landscape
 * @returns {boolean}
 */
function isMobileLandscape() {
    return isBetweenBreakpoints('mobile', 'mobileLandscape');
}

/**
 * Check if device is tablet
 * @returns {boolean}
 */
function isTablet() {
    return isBetweenBreakpoints('mobileLandscape', 'desktop');
}

/**
 * Check if device is desktop
 * @returns {boolean}
 */
function isDesktop() {
    return window.innerWidth >= BREAKPOINTS.desktop;
}

/**
 * Check if device is in mobile lite mode (performance optimization)
 * Disables heavy features below 768px
 * @returns {boolean}
 */
function isMobileLite() {
    return window.innerWidth < 768;
}

/**
 * Get current breakpoint name
 * @returns {string} The current breakpoint name
 */
function getCurrentBreakpoint() {
    const width = window.innerWidth;
    
    if (width < BREAKPOINTS.mobile) return 'mobile';
    if (width < BREAKPOINTS.mobileLandscape) return 'mobileLandscape';
    if (width < BREAKPOINTS.tablet) return 'tablet';
    if (width < BREAKPOINTS.desktop) return 'desktop';
    if (width < BREAKPOINTS.largeDesktop) return 'largeDesktop';
    return 'xlDesktop';
}

/**
 * Debounce function for resize events
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Window resize listener with debouncing
 * @param {Function} callback - Callback function to execute on resize
 * @param {number} delay - Debounce delay in milliseconds (default: 250)
 * @returns {Function} Function to remove the event listener
 */
function onWindowResize(callback, delay = 250) {
    const debouncedCallback = debounce(callback, delay);
    
    window.addEventListener('resize', debouncedCallback);
    
    // Return function to remove event listener
    return () => {
        window.removeEventListener('resize', debouncedCallback);
    };
}

/**
 * Breakpoint change listener
 * @param {Function} callback - Callback function that receives the new breakpoint
 * @param {number} delay - Debounce delay in milliseconds (default: 250)
 * @returns {Function} Function to remove the event listener
 */
function onBreakpointChange(callback, delay = 250) {
    let currentBreakpoint = getCurrentBreakpoint();
    
    const checkBreakpoint = () => {
        const newBreakpoint = getCurrentBreakpoint();
        if (newBreakpoint !== currentBreakpoint) {
            currentBreakpoint = newBreakpoint;
            callback(newBreakpoint, getWindowDimensions());
        }
    };
    
    return onWindowResize(checkBreakpoint, delay);
}

// Export all utilities
const WindowUtils = {
    // Constants
    BREAKPOINTS,
    
    // Core functions
    getWindowDimensions,
    isBelowBreakpoint,
    isAboveBreakpoint,
    isBetweenBreakpoints,
    getCurrentBreakpoint,
    
    // Device specific checks
    isMobile,
    isMobilePortrait,
    isMobileLandscape,
    isTablet,
    isDesktop,
    isMobileLite,
    
    // Event handling
    debounce,
    onWindowResize,
    onBreakpointChange
};

// ======================================================
// EXTENSIONS PARTAGÉES (Refactor centralisation helpers)
// ======================================================
// Orientation unifiée (évite la duplication getCurrentOrientation())
WindowUtils.getOrientation = function getOrientation() {
    return isDesktop() ? 'horizontal' : 'vertical';
};

// Reset agressif centralisé (remplace emergencyScrollReset, forceScrollReset, forceWindowScrollReset...)
// Options : { repeatDelays: number[], refreshScrollTrigger: boolean }
WindowUtils.resetScroll = function resetScroll(options = {}) {
    const {
        repeatDelays = [0, 10, 50, 100, 200, 500],
        refreshScrollTrigger = false
    } = options;

    const doReset = () => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.documentElement.scrollLeft = 0;
        document.body.scrollTop = 0;
        document.body.scrollLeft = 0;
        // Containers horizontaux potentiels
        ['.main-wrapper', '.slider-panel_wrap', '.slider-panel_list'].forEach(sel => {
            const el = document.querySelector(sel);
            if (el) { el.scrollLeft = 0; el.scrollTop = 0; }
        });
    };

    repeatDelays.forEach(d => setTimeout(doReset, d));

    if (refreshScrollTrigger && window.ScrollTrigger) {
        // Laisser le temps au DOM de se stabiliser
        setTimeout(() => { try { ScrollTrigger.refresh(); } catch(_) {} }, 550);
    }
};

// Helper pour réinitialiser Lenis si fourni
WindowUtils.resetLenis = function resetLenis(lenisInstance) {
    if (lenisInstance && typeof lenisInstance.scrollTo === 'function') {
        try { lenisInstance.scrollTo(0, { immediate: true }); } catch(_) {}
    }
};

// Traitement léger du texte riche (ex-RichTextManager)
WindowUtils.enhanceRichTextFigures = function enhanceRichTextFigures() {
    const richTexts = document.querySelectorAll('.text-rich-text');
    if (!richTexts.length) {
        console.debug('enhanceRichTextFigures: Aucun .text-rich-text trouvé');
        return 0;
    }
    
    console.debug(`enhanceRichTextFigures: ${richTexts.length} conteneur(s) .text-rich-text trouvé(s)`);
    let processed = 0;
    
    richTexts.forEach((container, containerIndex) => {
        const figures = container.querySelectorAll('figure');
        console.debug(`enhanceRichTextFigures: Conteneur ${containerIndex + 1} - ${figures.length} figure(s) trouvée(s)`);
        
        figures.forEach((fig, figIndex) => {
            const caption = fig.querySelector('figcaption');
            if (!caption) {
                console.debug(`enhanceRichTextFigures: Figure ${figIndex + 1} - Pas de figcaption`);
                return;
            }
            
            if (!caption.textContent.includes('///')) {
                console.debug(`enhanceRichTextFigures: Figure ${figIndex + 1} - Pas de '///' dans: "${caption.textContent}"`);
                return;
            }
            
            const parts = caption.textContent.split('///');
            const source = parts[0].trim();
            const description = (parts[1] || '').trim();
            
            if (!source) {
                console.debug(`enhanceRichTextFigures: Figure ${figIndex + 1} - Source vide`);
                return;
            }
            
            const firstDiv = fig.querySelector('div');
            if (!firstDiv) {
                console.debug(`enhanceRichTextFigures: Figure ${figIndex + 1} - Pas de div`);
                return;
            }
            
            // Éviter double insertion
            if (firstDiv.querySelector('.media_source')) {
                console.debug(`enhanceRichTextFigures: Figure ${figIndex + 1} - Déjà traité`);
                return;
            }
            
            const span = document.createElement('span');
            span.className = 'media_source';
            span.textContent = source;
            caption.textContent = description;
            firstDiv.appendChild(span);
            processed++;
            
            console.debug(`enhanceRichTextFigures: Figure ${figIndex + 1} - Traité avec succès (source: "${source}")`);
        });
    });
    
    console.debug(`enhanceRichTextFigures: ${processed} figure(s) traitée(s) au total`);
    return processed;
};

// Helper pour l'insertion dynamique des tags CMS (utilisable même sans SliderManager)
WindowUtils.handleDynamicTagInsertion = function handleDynamicTagInsertion() {
    // Récupère tous les éléments à insérer
    const itemsToInsert = document.querySelectorAll('[data-insert-to-item]');
    
    if (itemsToInsert.length === 0) {
        return 0;
    }

    let inserted = 0;
    itemsToInsert.forEach(item => {
        const targetListId = item.getAttribute('data-insert-to-item');
        
        if (!targetListId) {
            return;
        }

        // Trouve la liste de destination correspondante
        const targetList = document.querySelector(`[data-insert-to-list="${targetListId}"]`);
        
        if (!targetList) {
            return;
        }

        try {
            // Déplace l'élément vers la liste de destination
            targetList.appendChild(item);
            inserted++;
        } catch (error) {
            // Ignore silencieusement les erreurs
            return;
        }
    });
    
    return inserted;
};

// Helper pour organiser les slides (utilisable même sans SliderManager)
WindowUtils.setupSliderOrder = function setupSliderOrder() {
    const sliderItems = Array.from(document.querySelectorAll('.slider-panel_item')).filter(el => !el.classList.contains('is-last'));
    const lastSlide = document.querySelector('.slider-panel_item.is-last');
    const firstSlide = document.querySelector('.slider-panel_item.is-first');
    const sliderList = document.querySelector('.slider-panel_list');
    
    if (!sliderList || sliderItems.length === 0) {
        return false;
    }
    
    // Trier par data-slider-order
    const sorted = sliderItems.sort((a, b) => {
        const orderA = parseInt(a.dataset.sliderOrder) || 0;
        const orderB = parseInt(b.dataset.sliderOrder) || 0;
        return orderA - orderB;
    });
    
    // Réorganiser dans le DOM
    sorted.forEach((item) => sliderList.appendChild(item));
    
    if (lastSlide) {
        sliderList.appendChild(lastSlide);
    }
    
    if (firstSlide && sorted.length > 0) {
        firstSlide.dataset.sliderOrder = 0;
        firstSlide.dataset.sliderCategory = sorted[0].dataset.sliderCategory;
        sliderList.prepend(firstSlide);
    }
    
    return true;
};

// Exposer les nouveaux helpers globalement (si déjà exporté, simplement étendu)
if (typeof window !== 'undefined') {
    if (typeof window.WindowUtils === 'undefined') {
        window.WindowUtils = WindowUtils;
    }
}

// Make it available globally and as module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WindowUtils;
} else if (typeof window !== 'undefined') {
    window.WindowUtils = WindowUtils;
}
