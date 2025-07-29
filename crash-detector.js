// ==========================================
// DÉTECTEUR DE CRASHES D'ORIENTATION
// ==========================================

/**
 * CrashDetector - Détecte et prévient les crashes lors des changements d'orientation
 * Cet outil surveille les patterns qui mènent aux écrans noirs et aux refreshs forcés
 */
export class CrashDetector {
  constructor() {
    this.isMonitoring = false;
    this.crashEvents = [];
    this.performanceMarkers = [];
    this.orientationChangeCount = 0;
    this.lastOrientationChange = 0;
    
    // Seuils critiques
    this.THRESHOLDS = {
      MAX_ORIENTATION_CHANGES_PER_SECOND: 5,
      MAX_SCROLL_TRIGGER_REFRESHES: 15,
      MAX_MEMORY_USAGE_PERCENT: 85,
      MAX_FREEZE_DURATION: 2000, // 2 secondes
      MAX_EVENT_LISTENERS: 50
    };
    
    this.init();
  }
  
  /**
   * Initialise le détecteur de crash
   */
  init() {
    console.log('🚨 CrashDetector - Surveillance des crashes d\'orientation activée');
    this.setupOrientationMonitoring();
    this.setupPerformanceMonitoring();
    this.setupMemoryMonitoring();
    this.setupFreezeDetection();
    this.isMonitoring = true;
  }
  
  /**
   * Surveille spécifiquement les changements d'orientation rapides
   */
  setupOrientationMonitoring() {
    let orientationTimeout;
    
    const detectOrientationChange = () => {
      const now = Date.now();
      this.orientationChangeCount++;
      
      // Vérifier si trop de changements rapides
      const timeSinceLastChange = now - this.lastOrientationChange;
      if (timeSinceLastChange < 200) { // Moins de 200ms entre changements
        this.reportCrashRisk('ORIENTATION_TOO_RAPID', {
          interval: timeSinceLastChange,
          count: this.orientationChangeCount,
          timestamp: now
        });
      }
      
      this.lastOrientationChange = now;
      
      // Reset counter après 1 seconde
      clearTimeout(orientationTimeout);
      orientationTimeout = setTimeout(() => {
        if (this.orientationChangeCount > this.THRESHOLDS.MAX_ORIENTATION_CHANGES_PER_SECOND) {
          this.reportCrashRisk('ORIENTATION_SPAM', {
            count: this.orientationChangeCount,
            threshold: this.THRESHOLDS.MAX_ORIENTATION_CHANGES_PER_SECOND
          });
        }
        this.orientationChangeCount = 0;
      }, 1000);
    };
    
    // Écouter les changements d'orientation
    window.addEventListener('orientationchange', detectOrientationChange);
    window.addEventListener('resize', detectOrientationChange);
    
    // Surveiller aussi les changements programmatiques
    if (window.screen && window.screen.orientation) {
      window.screen.orientation.addEventListener('change', detectOrientationChange);
    }
  }
  
  /**
   * Surveille les performances pendant les changements
   */
  setupPerformanceMonitoring() {
    let refreshCount = 0;
    let refreshTimeout;
    
    // Intercepter ScrollTrigger.refresh pour détecter les boucles
    if (window.ScrollTrigger) {
      const originalRefresh = ScrollTrigger.refresh;
      ScrollTrigger.refresh = (...args) => {
        refreshCount++;
        
        // Reset counter après 2 secondes
        clearTimeout(refreshTimeout);
        refreshTimeout = setTimeout(() => {
          if (refreshCount > this.THRESHOLDS.MAX_SCROLL_TRIGGER_REFRESHES) {
            this.reportCrashRisk('SCROLLTRIGGER_LOOP', {
              count: refreshCount,
              threshold: this.THRESHOLDS.MAX_SCROLL_TRIGGER_REFRESHES
            });
          }
          refreshCount = 0;
        }, 2000);
        
        // Marquer la performance
        this.markPerformance('ScrollTrigger.refresh');
        
        return originalRefresh.apply(this, args);
      };
    }
  }
  
  /**
   * Surveille l'utilisation mémoire
   */
  setupMemoryMonitoring() {
    if (!performance.memory) return;
    
    setInterval(() => {
      const memory = performance.memory;
      const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      
      if (usagePercent > this.THRESHOLDS.MAX_MEMORY_USAGE_PERCENT) {
        this.reportCrashRisk('HIGH_MEMORY_USAGE', {
          usagePercent: usagePercent.toFixed(2),
          usedMB: Math.round(memory.usedJSHeapSize / 1024 / 1024),
          limitMB: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
        });
      }
    }, 2000);
  }
  
  /**
   * Détecte les freezes de l'interface
   */
  setupFreezeDetection() {
    let lastBeat = Date.now();
    let missedBeats = 0;
    
    const heartbeat = () => {
      const now = Date.now();
      const delay = now - lastBeat - 100; // 100ms attendu
      
      if (delay > this.THRESHOLDS.MAX_FREEZE_DURATION) {
        missedBeats++;
        this.reportCrashRisk('UI_FREEZE', {
          freezeDuration: delay,
          missedBeats: missedBeats,
          timestamp: now
        });
      } else {
        missedBeats = 0; // Reset si pas de freeze
      }
      
      lastBeat = now;
      
      if (this.isMonitoring) {
        setTimeout(heartbeat, 100);
      }
    };
    
    heartbeat();
  }
  
  /**
   * Marque un événement de performance
   */
  markPerformance(eventName) {
    const mark = {
      name: eventName,
      timestamp: Date.now(),
      memory: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : null
    };
    
    this.performanceMarkers.push(mark);
    
    // Garder seulement les 50 derniers
    if (this.performanceMarkers.length > 50) {
      this.performanceMarkers.shift();
    }
  }
  
  /**
   * Signale un risque de crash
   */
  reportCrashRisk(type, data) {
    const crashEvent = {
      type,
      data,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
      }
    };
    
    this.crashEvents.push(crashEvent);
    
    // Log immédiat
    console.error(`🚨 RISQUE DE CRASH DÉTECTÉ: ${type}`, crashEvent);
    
    // Déclencher des mesures préventives
    this.takePreventiveMeasures(type, data);
    
    // Garder seulement les 20 derniers événements
    if (this.crashEvents.length > 20) {
      this.crashEvents.shift();
    }
  }
  
  /**
   * Prend des mesures préventives selon le type de risque
   */
  takePreventiveMeasures(type, data) {
    console.warn(`🛡️ Mesures préventives pour ${type}...`);
    
    switch (type) {
      case 'ORIENTATION_TOO_RAPID':
      case 'ORIENTATION_SPAM':
        this.preventOrientationSpam();
        break;
        
      case 'SCROLLTRIGGER_LOOP':
        this.preventScrollTriggerLoop();
        break;
        
      case 'HIGH_MEMORY_USAGE':
        this.freeMemory();
        break;
        
      case 'UI_FREEZE':
        this.handleUIFreeze();
        break;
    }
  }
  
  /**
   * Prévient le spam d'orientation
   */
  preventOrientationSpam() {
    console.warn('🛡️ Prévention du spam d\'orientation - Désactivation temporaire');
    
    // Désactiver temporairement les event listeners d'orientation
    if (window.orientationManager) {
      window.orientationManager.isProcessing = true;
      
      setTimeout(() => {
        window.orientationManager.isProcessing = false;
        console.log('✅ Event listeners d\'orientation réactivés');
      }, 2000);
    }
  }
  
  /**
   * Prévient les boucles ScrollTrigger
   */
  preventScrollTriggerLoop() {
    console.warn('🛡️ Prévention de boucle ScrollTrigger - Nettoyage forcé');
    
    if (window.ScrollTrigger) {
      // Désactiver temporairement tous les ScrollTriggers
      ScrollTrigger.disable();
      
      setTimeout(() => {
        ScrollTrigger.enable();
        ScrollTrigger.refresh();
        console.log('✅ ScrollTriggers réactivés après nettoyage');
      }, 1000);
    }
  }
  
  /**
   * Libère de la mémoire
   */
  freeMemory() {
    console.warn('🛡️ Libération de mémoire...');
    
    // Forcer le garbage collection si possible
    if (window.gc) {
      window.gc();
    }
    
    // Nettoyer les caches si disponibles
    if (window.caches) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    console.log('✅ Tentative de libération mémoire effectuée');
  }
  
  /**
   * Gère les freezes d'interface
   */
  handleUIFreeze() {
    console.warn('🛡️ Gestion du freeze UI - Redémarrage des animations');
    
    // Redémarrer GSAP si disponible
    if (window.gsap) {
      gsap.killTweensOf('*');
      console.log('✅ Animations GSAP redémarrées');
    }
  }
  
  /**
   * Génère un rapport de crash
   */
  generateCrashReport() {
    const report = {
      summary: {
        totalCrashEvents: this.crashEvents.length,
        isMonitoring: this.isMonitoring,
        orientationChanges: this.orientationChangeCount,
        lastCheck: new Date().toISOString()
      },
      crashEvents: this.crashEvents,
      performanceMarkers: this.performanceMarkers.slice(-20), // 20 derniers
      systemInfo: {
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        memory: performance.memory ? {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + ' MB',
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + ' MB',
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + ' MB'
        } : 'Non disponible'
      }
    };
    
    console.group('📊 RAPPORT DE CRASH');
    console.log(report);
    console.groupEnd();
    
    return report;
  }
  
  /**
   * NOUVEAU : Vérifie si on est dans une période de spam d'orientation
   */
  isOrientationSpamming() {
    const now = Date.now();
    const timeSinceLastChange = now - this.lastOrientationChange;
    
    // Considérer comme spam si moins de 250ms depuis le dernier changement
    // OU si plus de 3 changements dans la dernière seconde
    return timeSinceLastChange < 250 || this.orientationChangeCount > 3;
  }
  
  /**
   * NOUVEAU : Configure le seuil de détection de spam d'orientation
   */
  setOrientationSpamThreshold(milliseconds = 250) {
    this.THRESHOLDS.ORIENTATION_SPAM_THRESHOLD = milliseconds;
    console.log(`🎯 Seuil de spam d'orientation défini à ${milliseconds}ms`);
  }
  
  /**
   * NOUVEAU : Force le mode dégradé pour tous les gestionnaires
   */
  forceDegradedMode() {
    console.warn('🔧 Activation forcée du mode dégradé');
    
    // Notifier tous les gestionnaires
    if (window.orientationManager) {
      window.orientationManager.notifySubscribers(null, { isRapidChange: true, forced: true });
    }
    
    // Activer le mode d'urgence si disponible
    if (window.emergencyMode) {
      window.emergencyMode.activate();
    }
  }

  /**
   * Arrête la surveillance
   */
  stop() {
    this.isMonitoring = false;
    console.log('🚨 CrashDetector - Surveillance arrêtée');
  }
  
  /**
   * Test de simulation de crash
   */
  simulateCrash(type = 'orientation') {
    console.warn(`🧪 Simulation de crash: ${type}`);
    
    switch (type) {
      case 'orientation':
        // Simuler des changements d'orientation rapides
        for (let i = 0; i < 10; i++) {
          setTimeout(() => {
            window.dispatchEvent(new Event('orientationchange'));
          }, i * 50);
        }
        break;
        
      case 'memory':
        // Simuler une fuite mémoire
        const leak = [];
        for (let i = 0; i < 100000; i++) {
          leak.push(new Array(1000).fill('memory leak test'));
        }
        break;
        
      case 'scrolltrigger':
        // Simuler une boucle ScrollTrigger
        if (window.ScrollTrigger) {
          for (let i = 0; i < 20; i++) {
            setTimeout(() => ScrollTrigger.refresh(), i * 100);
          }
        }
        break;
    }
  }
}

// Rendre disponible globalement
window.CrashDetector = CrashDetector;
window.crashDetector = new CrashDetector();

console.log('🚨 CrashDetector chargé !');
console.log('📋 Commandes disponibles:');
console.log('  - crashDetector.generateCrashReport() : Génère un rapport');
console.log('  - crashDetector.simulateCrash("orientation") : Simule un crash');
console.log('  - crashDetector.stop() : Arrête la surveillance');
