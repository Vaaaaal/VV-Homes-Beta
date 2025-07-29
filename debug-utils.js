import logger from './logger.js';
// ==========================================
// UTILITAIRES DE DÉBOGAGE
// ==========================================

/**
 * Utilitaires pour diagnostiquer les problèmes de chargement
 */
export class DebugUtils {
  
  /**
   * Affiche un rapport complet sur l'état du DOM et des scripts
   */
  static logFullDiagnostic() {
    console.group('🔧 DIAGNOSTIC COMPLET DE L\'APPLICATION');
    
    // 1. État général de l'application
    console.group('📊 État général');
    logger.log('User Agent:', navigator.userAgent);
    logger.log('URL actuelle:', window.location.href);
    logger.log('DOM Ready:', document.readyState);
    logger.log('Timestamp:', new Date().toISOString());
    console.groupEnd();
    
    // 2. Scripts externes
    console.group('📦 Scripts externes');
    this.checkExternalScripts();
    console.groupEnd();
    
    // 3. Éléments du menu
    console.group('🍔 Éléments du menu');
    this.checkMenuElements();
    console.groupEnd();
    
    // 4. Éléments Finsweet
    console.group('🔧 Finsweet Attributes');
    this.checkFinsweetElements();
    console.groupEnd();
    
    // 5. Autres gestionnaires
    console.group('🎛️ Autres gestionnaires');
    this.checkOtherElements();
    console.groupEnd();
    
    // 6. NOUVEAU : Diagnostic des problèmes critiques
    console.group('🚨 Diagnostic de performance/crashes');
    this.checkCriticalIssues();
    console.groupEnd();
    
    console.groupEnd();
  }
  
  /**
   * Vérifie l'état des scripts externes
   */
  static checkExternalScripts() {
    // GSAP
    logger.log('GSAP disponible:', typeof gsap !== 'undefined', typeof gsap);
    
    // Finsweet
    logger.log('Finsweet Attributes:', {
      available: typeof window.FinsweetAttributes !== 'undefined',
      array: Array.isArray(window.FinsweetAttributes),
      length: window.FinsweetAttributes?.length || 0
    });
    
    // Webflow
    logger.log('Webflow disponible:', typeof Webflow !== 'undefined');
  }
  
  /**
   * Vérifie les éléments du menu
   */
  static checkMenuElements() {
    const menuWrap = document.querySelector('.menu_wrap');
    const menuButton = document.querySelector('#menu-btn');
    const menuPanels = document.querySelectorAll('.menu_panel_item');
    const cmsButtons = document.querySelectorAll('.menu_panel_collection_item.is-btn');
    const allCmsItems = document.querySelectorAll('.menu_panel_collection_item');
    
    logger.log('Menu wrap:', !!menuWrap);
    logger.log('Menu button:', !!menuButton);
    logger.log('Menu panels:', menuPanels.length);
    logger.log('CMS buttons (.is-btn):', cmsButtons.length);
    logger.log('All CMS items:', allCmsItems.length);
    
    if (allCmsItems.length > 0 && cmsButtons.length === 0) {
      logger.warn(' Des éléments CMS existent mais aucun n\'a la classe .is-btn');
      logger.log('Classes disponibles sur les éléments CMS:');
      allCmsItems.forEach((item, index) => {
        logger.log(`  ${index + 1}:`, item.className);
      });
    }
    
    // Diagnostic détaillé des ratios
    const ratio = allCmsItems.length > 0 ? (cmsButtons.length / allCmsItems.length * 100).toFixed(1) : 0;
    logger.log(`📊 Ratio de boutons CMS: ${ratio}% (${cmsButtons.length}/${allCmsItems.length})`);
    
    // Analyser la distribution des éléments par panel
    const panelDistribution = {};
    allCmsItems.forEach(item => {
      const panel = item.closest('.menu_panel_item');
      const panelName = panel?.dataset?.name || 'unknown';
      panelDistribution[panelName] = (panelDistribution[panelName] || 0) + 1;
    });
    
    logger.log('🗂️ Distribution par panel:', panelDistribution);
    
    return {
      menuWrap: !!menuWrap,
      menuButton: !!menuButton,
      menuPanels: menuPanels.length,
      cmsButtons: cmsButtons.length,
      allCmsItems: allCmsItems.length,
      ratio: parseFloat(ratio),
      panelDistribution
    };
  }
  
  /**
   * Vérifie les éléments Finsweet
   */
  static checkFinsweetElements() {
    const finsweetContainers = document.querySelectorAll('[fs-cmsload-element="list"]');
    const finsweetLoaders = document.querySelectorAll('[fs-cmsload-element="loader"]');
    
    logger.log('Conteneurs Finsweet:', finsweetContainers.length);
    logger.log('Loaders Finsweet:', finsweetLoaders.length);
    
    finsweetContainers.forEach((container, index) => {
      const items = container.querySelectorAll('.menu_panel_collection_item');
      logger.log(`  Conteneur ${index + 1}: ${items.length} éléments`);
    });
  }
  
  /**
   * Vérifie les autres éléments
   */
  static checkOtherElements() {
    const sliderItems = document.querySelectorAll('.slider-panel_item');
    const modalTriggers = document.querySelectorAll('[data-modal-trigger]');
    const richTextElements = document.querySelectorAll('.text-rich-text');
    
    logger.log('Slider items:', sliderItems.length);
    logger.log('Modal triggers:', modalTriggers.length);
    logger.log('Rich text elements:', richTextElements.length);
  }
  
  /**
   * NOUVEAU : Diagnostic approfondi des problèmes critiques qui causent des crashes
   */
  static checkCriticalIssues() {
    logger.log('🔍 Recherche de problèmes critiques...');
    
    // 1. Vérifier les event listeners multiples
    this.checkEventListenerLeaks();
    
    // 2. Vérifier les timers/intervals actifs
    this.checkActiveTimers();
    
    // 3. Vérifier la mémoire et les ScrollTriggers
    this.checkMemoryIssues();
    
    // 4. Vérifier les boucles infinies potentielles
    this.checkPotentialInfiniteLoops();
    
    // 5. Vérifier les erreurs silencieuses
    this.setupErrorCatching();
  }
  
  /**
   * Détecte les event listeners qui pourraient causer des fuites
   */
  static checkEventListenerLeaks() {
    logger.log('👂 Vérification des event listeners...');
    
    // Compter les event listeners sur window
    const listeners = {
      resize: 0,
      scroll: 0,
      orientationchange: 0,
      load: 0,
      beforeunload: 0
    };
    
    // Méthode pour intercepter addEventListener temporairement
    const originalAddEventListener = window.addEventListener;
    let listenerCount = 0;
    
    // Override temporaire pour compter
    window.addEventListener = function(type, listener, options) {
      if (listeners.hasOwnProperty(type)) {
        listeners[type]++;
      }
      listenerCount++;
      return originalAddEventListener.call(this, type, listener, options);
    };
    
    // Restaurer après 1 seconde
    setTimeout(() => {
      window.addEventListener = originalAddEventListener;
    }, 1000);
    
    logger.log('📊 Event listeners détectés:', listeners);
    logger.log('📈 Total listeners sur window:', listenerCount);
    
    // Vérifications critiques
    if (listeners.resize > 3) {
      logger.warn(' ALERTE: Trop d\'event listeners resize (>3)');
    }
    if (listeners.orientationchange > 2) {
      logger.warn(' ALERTE: Trop d\'event listeners orientationchange (>2)');
    }
  }
  
  /**
   * Vérifie les timers et intervals actifs
   */
  static checkActiveTimers() {
    logger.log('⏰ Vérification des timers actifs...');
    
    // Intercepter setTimeout et setInterval pour les compter
    let timeoutCount = 0;
    let intervalCount = 0;
    
    const originalSetTimeout = window.setTimeout;
    const originalSetInterval = window.setInterval;
    const originalClearTimeout = window.clearTimeout;
    const originalClearInterval = window.clearInterval;
    
    window.setTimeout = function(...args) {
      timeoutCount++;
      logger.log(`⏱️ Nouveau setTimeout créé (total: ${timeoutCount})`);
      return originalSetTimeout.apply(this, args);
    };
    
    window.setInterval = function(...args) {
      intervalCount++;
      logger.info(' Nouveau setInterval créé (total: ${intervalCount})');
      return originalSetInterval.apply(this, args);
    };
    
    window.clearTimeout = function(...args) {
      timeoutCount = Math.max(0, timeoutCount - 1);
      return originalClearTimeout.apply(this, args);
    };
    
    window.clearInterval = function(...args) {
      intervalCount = Math.max(0, intervalCount - 1);
      return originalClearInterval.apply(this, args);
    };
    
    // Restaurer après surveillance
    setTimeout(() => {
      window.setTimeout = originalSetTimeout;
      window.setInterval = originalSetInterval;
      window.clearTimeout = originalClearTimeout;
      window.clearInterval = originalClearInterval;
      
      logger.log(`📊 Timers finaux - Timeouts: ${timeoutCount}, Intervals: ${intervalCount}`);
      
      if (intervalCount > 5) {
        logger.warn(' ALERTE: Trop d\'intervals actifs (>5)');
      }
    }, 5000);
  }
  
  /**
   * Vérifie les problèmes de mémoire et ScrollTriggers
   */
  static checkMemoryIssues() {
    logger.log('🧠 Vérification de la mémoire...');
    
    // Vérifier les ScrollTriggers
    if (window.ScrollTrigger) {
      const triggers = ScrollTrigger.getAll();
      logger.scroll(' ScrollTriggers actifs:', triggers.length);
      
      if (triggers.length > 20) {
        logger.warn(' ALERTE: Trop de ScrollTriggers (>20)');
        logger.log('📋 Détail des triggers:');
        triggers.forEach((trigger, index) => {
          logger.log(`  ${index + 1}:`, trigger.vars.trigger?.className || 'Unknown');
        });
      }
    }
    
    // Vérifier la performance
    if (performance.memory) {
      const memory = performance.memory;
      logger.log('💾 Mémoire:', {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + ' MB',
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + ' MB',
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + ' MB'
      });
      
      const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      if (usagePercent > 80) {
        logger.warn(' ALERTE: Utilisation mémoire élevée (>80%)');
      }
    }
  }
  
  /**
   * Détecte les boucles infinies potentielles
   */
  static checkPotentialInfiniteLoops() {
    logger.info(' Recherche de boucles infinies...');
    
    // Surveiller les appels répétés à certaines fonctions
    let scrollTriggerRefreshCount = 0;
    let resizeEventCount = 0;
    
    if (window.ScrollTrigger) {
      const originalRefresh = ScrollTrigger.refresh;
      ScrollTrigger.refresh = function(...args) {
        scrollTriggerRefreshCount++;
        logger.info(' ScrollTrigger.refresh() appelé (${scrollTriggerRefreshCount} fois)');
        
        if (scrollTriggerRefreshCount > 10) {
          logger.error('🚨 ALERTE CRITIQUE: ScrollTrigger.refresh() appelé trop souvent!');
          console.trace('Stack trace de l\'appel:');
        }
        
        return originalRefresh.apply(this, args);
      };
    }
    
    // Surveiller les événements resize
    window.addEventListener('resize', () => {
      resizeEventCount++;
      if (resizeEventCount > 20) {
        logger.error('🚨 ALERTE CRITIQUE: Trop d\'événements resize!');
        console.trace('Stack trace de l\'événement resize:');
      }
    });
    
    // Reset après 10 secondes
    setTimeout(() => {
      scrollTriggerRefreshCount = 0;
      resizeEventCount = 0;
    }, 10000);
  }
  
  /**
   * Configure la capture d'erreurs silencieuses
   */
  static setupErrorCatching() {
    logger.log('🕷️ Configuration de la capture d\'erreurs...');
    
    // Capturer les erreurs globales
    window.addEventListener('error', (event) => {
      logger.error('🚨 ERREUR GLOBALE DÉTECTÉE:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    });
    
    // Capturer les promesses rejetées
    window.addEventListener('unhandledrejection', (event) => {
      logger.error('🚨 PROMESSE REJETÉE DÉTECTÉE:', {
        reason: event.reason,
        promise: event.promise
      });
    });
    
    // Surveiller les navigations/reloads
    window.addEventListener('beforeunload', (event) => {
      logger.warn(' Page sur le point de se décharger/recharger');
    });
    
    // Détecter les freezes
    let lastHeartbeat = Date.now();
    const heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const delay = now - lastHeartbeat - 1000; // 1000ms attendu
      
      if (delay > 500) {
        logger.warn(`💓 Heartbeat retardé de ${delay}ms (possible freeze)`);
      }
      
      lastHeartbeat = now;
    }, 1000);
    
    // Arrêter la surveillance après 30 secondes
    setTimeout(() => {
      clearInterval(heartbeatInterval);
    }, 30000);
  }
  
  /**
   * Surveille en temps réel l'apparition des éléments CMS
   */
  static watchCMSElements() {
    let lastCount = 0;
    
    const checkAndLog = () => {
      const currentCount = document.querySelectorAll('.menu_panel_collection_item.is-btn').length;
      if (currentCount !== lastCount) {
        logger.log(`🎯 Éléments CMS détectés: ${currentCount} (était ${lastCount})`);
        lastCount = currentCount;
        
        if (currentCount >= 50) {
          logger.success(' Seuil de 50 éléments CMS atteint !');
        }
      }
    };
    
    // Vérification périodique
    const interval = setInterval(checkAndLog, 500);
    
    // Observer les changements DOM
    const observer = new MutationObserver(() => {
      checkAndLog();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    logger.log('👁️ Surveillance des éléments CMS activée');
    
    // Arrêter après 30 secondes
    setTimeout(() => {
      clearInterval(interval);
      observer.disconnect();
      logger.log('👁️ Surveillance des éléments CMS arrêtée');
    }, 30000);
    
    return { interval, observer };
  }

  /**
   * Surveille spécifiquement l'initialisation incrémentale
   */
  static watchIncrementalInit() {
    logger.log('🔍 Surveillance de l\'initialisation incrémentale...');
    
    let initialCount = 0;
    let checkCount = 0;
    
    const logProgress = () => {
      checkCount++;
      const currentCount = document.querySelectorAll('.menu_panel_collection_item.is-btn').length;
      
      if (checkCount === 1) {
        initialCount = currentCount;
        logger.log(`📊 État initial : ${currentCount} éléments CMS`);
      } else if (currentCount !== initialCount) {
        const diff = currentCount - initialCount;
        logger.log(`📈 Progression : ${currentCount} éléments (+${diff} depuis le début)`);
        initialCount = currentCount;
      }
      
      // Vérifier si le seuil de 20 est atteint
      if (currentCount >= 20 && checkCount <= 5) {
        logger.log('🎯 Seuil de 20 éléments atteint rapidement !');
      }
    };
    
    // Vérification immédiate puis toutes les 200ms pendant 10 secondes
    logProgress();
    const interval = setInterval(logProgress, 200);
    
    setTimeout(() => {
      clearInterval(interval);
      const finalCount = document.querySelectorAll('.menu_panel_collection_item.is-btn').length;
      logger.log(`📊 Résultat final : ${finalCount} éléments CMS après 10 secondes`);
    }, 10000);
    
    return interval;
  }

  /**
   * Surveille les changements du DOM
   */
  static watchDOMChanges() {
    let changeCount = 0;
    const observer = new MutationObserver((mutations) => {
      changeCount++;
      if (changeCount % 10 === 0) { // Log tous les 10 changements
        logger.info(' ${changeCount} changements DOM détectés');
      }
      
      // Vérifier si des éléments CMS apparaissent
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              const cmsItems = node.querySelectorAll?.('.menu_panel_collection_item.is-btn');
              if (cmsItems?.length > 0) {
                logger.log('🎯 Nouveaux éléments CMS détectés:', cmsItems.length);
              }
            }
          });
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    logger.log('👁️ Surveillance DOM activée');
    
    // Arrêter la surveillance après 30 secondes
    setTimeout(() => {
      observer.disconnect();
      logger.log('👁️ Surveillance DOM arrêtée');
    }, 30000);
  }
  
  /**
   * Teste la connectivité aux CDNs
   */
  static async testCDNConnectivity() {
    console.group('🌐 Test de connectivité CDN');
    
    const cdnTests = [
      {
        name: 'JSDeliver (votre script)',
        url: 'https://cdn.jsdelivr.net/gh/Vaaaaal/VV-Homes-Beta@main/script.js'
      },
      {
        name: 'GSAP',
        url: 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js'
      }
    ];
    
    for (const test of cdnTests) {
      try {
        const response = await fetch(test.url, { method: 'HEAD' });
        logger.success(' ${test.name}:', response.ok ? 'OK' : `Erreur ${response.status}`);
      } catch (error) {
        logger.log(`❌ ${test.name}: Erreur de réseau`, error.message);
      }
    }
    
    console.groupEnd();
  }
}

// Fonction globale pour faciliter l'usage en console
window.debugVV = DebugUtils;
