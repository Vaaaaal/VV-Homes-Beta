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
    
    // Event handling
    debounce,
    onWindowResize,
    onBreakpointChange
};

// Make it available globally and as module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WindowUtils;
} else if (typeof window !== 'undefined') {
    window.WindowUtils = WindowUtils;
}
