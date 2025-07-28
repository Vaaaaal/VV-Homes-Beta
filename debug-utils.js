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
    console.log('User Agent:', navigator.userAgent);
    console.log('URL actuelle:', window.location.href);
    console.log('DOM Ready:', document.readyState);
    console.log('Timestamp:', new Date().toISOString());
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
    
    console.groupEnd();
  }
  
  /**
   * Vérifie l'état des scripts externes
   */
  static checkExternalScripts() {
    // GSAP
    console.log('GSAP disponible:', typeof gsap !== 'undefined', typeof gsap);
    
    // Finsweet
    console.log('Finsweet Attributes:', {
      available: typeof window.FinsweetAttributes !== 'undefined',
      array: Array.isArray(window.FinsweetAttributes),
      length: window.FinsweetAttributes?.length || 0
    });
    
    // Webflow
    console.log('Webflow disponible:', typeof Webflow !== 'undefined');
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
    
    console.log('Menu wrap:', !!menuWrap);
    console.log('Menu button:', !!menuButton);
    console.log('Menu panels:', menuPanels.length);
    console.log('CMS buttons (.is-btn):', cmsButtons.length);
    console.log('All CMS items:', allCmsItems.length);
    
    if (allCmsItems.length > 0 && cmsButtons.length === 0) {
      console.warn('⚠️ Des éléments CMS existent mais aucun n\'a la classe .is-btn');
      console.log('Classes disponibles sur les éléments CMS:');
      allCmsItems.forEach((item, index) => {
        console.log(`  ${index + 1}:`, item.className);
      });
    }
    
    // Diagnostic détaillé des ratios
    const ratio = allCmsItems.length > 0 ? (cmsButtons.length / allCmsItems.length * 100).toFixed(1) : 0;
    console.log(`📊 Ratio de boutons CMS: ${ratio}% (${cmsButtons.length}/${allCmsItems.length})`);
    
    // Analyser la distribution des éléments par panel
    const panelDistribution = {};
    allCmsItems.forEach(item => {
      const panel = item.closest('.menu_panel_item');
      const panelName = panel?.dataset?.name || 'unknown';
      panelDistribution[panelName] = (panelDistribution[panelName] || 0) + 1;
    });
    
    console.log('🗂️ Distribution par panel:', panelDistribution);
    
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
    
    console.log('Conteneurs Finsweet:', finsweetContainers.length);
    console.log('Loaders Finsweet:', finsweetLoaders.length);
    
    finsweetContainers.forEach((container, index) => {
      const items = container.querySelectorAll('.menu_panel_collection_item');
      console.log(`  Conteneur ${index + 1}: ${items.length} éléments`);
    });
  }
  
  /**
   * Vérifie les autres éléments
   */
  static checkOtherElements() {
    const sliderItems = document.querySelectorAll('.slider-panel_item');
    const modalTriggers = document.querySelectorAll('[data-modal-trigger]');
    const richTextElements = document.querySelectorAll('.text-rich-text');
    
    console.log('Slider items:', sliderItems.length);
    console.log('Modal triggers:', modalTriggers.length);
    console.log('Rich text elements:', richTextElements.length);
  }
  
  /**
   * Surveille en temps réel l'apparition des éléments CMS
   */
  static watchCMSElements() {
    let lastCount = 0;
    
    const checkAndLog = () => {
      const currentCount = document.querySelectorAll('.menu_panel_collection_item.is-btn').length;
      if (currentCount !== lastCount) {
        console.log(`🎯 Éléments CMS détectés: ${currentCount} (était ${lastCount})`);
        lastCount = currentCount;
        
        if (currentCount >= 50) {
          console.log('🎉 Seuil de 50 éléments CMS atteint !');
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
    
    console.log('👁️ Surveillance des éléments CMS activée');
    
    // Arrêter après 30 secondes
    setTimeout(() => {
      clearInterval(interval);
      observer.disconnect();
      console.log('👁️ Surveillance des éléments CMS arrêtée');
    }, 30000);
    
    return { interval, observer };
  }

  /**
   * Surveille spécifiquement l'initialisation incrémentale
   */
  static watchIncrementalInit() {
    console.log('🔍 Surveillance de l\'initialisation incrémentale...');
    
    let initialCount = 0;
    let checkCount = 0;
    
    const logProgress = () => {
      checkCount++;
      const currentCount = document.querySelectorAll('.menu_panel_collection_item.is-btn').length;
      
      if (checkCount === 1) {
        initialCount = currentCount;
        console.log(`📊 État initial : ${currentCount} éléments CMS`);
      } else if (currentCount !== initialCount) {
        const diff = currentCount - initialCount;
        console.log(`📈 Progression : ${currentCount} éléments (+${diff} depuis le début)`);
        initialCount = currentCount;
      }
      
      // Vérifier si le seuil de 20 est atteint
      if (currentCount >= 20 && checkCount <= 5) {
        console.log('🎯 Seuil de 20 éléments atteint rapidement !');
      }
    };
    
    // Vérification immédiate puis toutes les 200ms pendant 10 secondes
    logProgress();
    const interval = setInterval(logProgress, 200);
    
    setTimeout(() => {
      clearInterval(interval);
      const finalCount = document.querySelectorAll('.menu_panel_collection_item.is-btn').length;
      console.log(`📊 Résultat final : ${finalCount} éléments CMS après 10 secondes`);
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
        console.log(`🔄 ${changeCount} changements DOM détectés`);
      }
      
      // Vérifier si des éléments CMS apparaissent
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              const cmsItems = node.querySelectorAll?.('.menu_panel_collection_item.is-btn');
              if (cmsItems?.length > 0) {
                console.log('🎯 Nouveaux éléments CMS détectés:', cmsItems.length);
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
    
    console.log('👁️ Surveillance DOM activée');
    
    // Arrêter la surveillance après 30 secondes
    setTimeout(() => {
      observer.disconnect();
      console.log('👁️ Surveillance DOM arrêtée');
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
        console.log(`✅ ${test.name}:`, response.ok ? 'OK' : `Erreur ${response.status}`);
      } catch (error) {
        console.log(`❌ ${test.name}: Erreur de réseau`, error.message);
      }
    }
    
    console.groupEnd();
  }
}

// Fonction globale pour faciliter l'usage en console
window.debugVV = DebugUtils;
