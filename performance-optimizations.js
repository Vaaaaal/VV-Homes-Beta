// ==========================================
// OPTIMISATIONS DE PERFORMANCE
// ==========================================

/**
 * Gestionnaire centralisé des optimisations de performance
 * Évite les fuites mémoire et améliore les performances globales
 */
export class PerformanceOptimizer {
  
  /**
   * Pool d'objets réutilisables pour éviter les allocations fréquentes
   */
  static createObjectPool(createFn, resetFn, initialSize = 10) {
    const pool = [];
    const inUse = new Set();
    
    // Pré-remplir le pool
    for (let i = 0; i < initialSize; i++) {
      pool.push(createFn());
    }
    
    return {
      acquire() {
        let obj = pool.pop();
        if (!obj) {
          obj = createFn();
        }
        inUse.add(obj);
        return obj;
      },
      
      release(obj) {
        if (inUse.has(obj)) {
          inUse.delete(obj);
          resetFn(obj);
          pool.push(obj);
        }
      },
      
      clear() {
        pool.length = 0;
        inUse.clear();
      },
      
      stats() {
        return {
          available: pool.length,
          inUse: inUse.size,
          total: pool.length + inUse.size
        };
      }
    };
  }
  
  /**
   * Throttle plus efficace que debounce pour les événements fréquents
   */
  static throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
  
  /**
   * Nettoyage intelligent des event listeners
   */
  static createEventManager() {
    const listeners = new Map();
    
    return {
      add(element, type, handler, options = {}) {
        const key = `${element}_${type}`;
        if (!listeners.has(key)) {
          listeners.set(key, []);
        }
        
        listeners.get(key).push({ handler, options });
        element.addEventListener(type, handler, options);
      },
      
      remove(element, type, handler) {
        const key = `${element}_${type}`;
        if (listeners.has(key)) {
          const list = listeners.get(key);
          const index = list.findIndex(l => l.handler === handler);
          if (index !== -1) {
            list.splice(index, 1);
            element.removeEventListener(type, handler);
          }
        }
      },
      
      removeAll(element, type = null) {
        if (type) {
          const key = `${element}_${type}`;
          if (listeners.has(key)) {
            listeners.get(key).forEach(l => {
              element.removeEventListener(type, l.handler);
            });
            listeners.delete(key);
          }
        } else {
          // Supprimer tous les listeners pour cet élément
          for (const [key, list] of listeners) {
            if (key.startsWith(`${element}_`)) {
              const eventType = key.split('_')[1];
              list.forEach(l => {
                element.removeEventListener(eventType, l.handler);
              });
              listeners.delete(key);
            }
          }
        }
      },
      
      clear() {
        listeners.clear();
      },
      
      stats() {
        let total = 0;
        for (const list of listeners.values()) {
          total += list.length;
        }
        return { total, types: listeners.size };
      }
    };
  }
  
  /**
   * Surveille et limite l'utilisation mémoire
   */
  static createMemoryMonitor(warningThreshold = 80, criticalThreshold = 90) {
    let lastCheck = 0;
    const CHECK_INTERVAL = 5000; // 5 secondes
    
    return {
      check(force = false) {
        const now = Date.now();
        if (!force && now - lastCheck < CHECK_INTERVAL) {
          return null;
        }
        
        lastCheck = now;
        
        if (!performance.memory) {
          return { status: 'unavailable' };
        }
        
        const memory = performance.memory;
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        
        const status = {
          usagePercent: Math.round(usagePercent * 100) / 100,
          usedMB: Math.round(memory.usedJSHeapSize / 1024 / 1024),
          totalMB: Math.round(memory.totalJSHeapSize / 1024 / 1024),
          limitMB: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
        };
        
        if (usagePercent > criticalThreshold) {
          status.level = 'critical';
        } else if (usagePercent > warningThreshold) {
          status.level = 'warning';
        } else {
          status.level = 'ok';
        }
        
        return status;
      },
      
      forceCleanup() {
        // Forcer le garbage collection si possible
        if (window.gc) {
          window.gc();
        }
        
        // Nettoyer les caches
        if (window.caches) {
          caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
          });
        }
        
        return this.check(true);
      }
    };
  }
  
  /**
   * Optimise les animations GSAP
   */
  static optimizeGSAP() {
    if (!window.gsap) return;
    
    // Optimiser le ticker
    gsap.ticker.lagSmoothing(500, 33); // Plus agressif que le défaut
    
    // Pool de timelines réutilisables
    const timelinePool = this.createObjectPool(
      () => gsap.timeline({ paused: true }),
      (tl) => {
        tl.clear();
        tl.pause();
        tl.progress(0);
      },
      5
    );
    
    return {
      getTimeline() {
        return timelinePool.acquire();
      },
      
      releaseTimeline(tl) {
        timelinePool.release(tl);
      },
      
      stats: () => timelinePool.stats()
    };
  }
  
  /**
   * Gestionnaire de ressources avec auto-nettoyage
   */
  static createResourceManager() {
    const resources = new Map();
    const cleanupTasks = new Set();
    
    return {
      register(id, resource, cleanupFn) {
        if (resources.has(id)) {
          this.cleanup(id);
        }
        
        resources.set(id, { resource, cleanupFn, createdAt: Date.now() });
      },
      
      get(id) {
        const entry = resources.get(id);
        return entry ? entry.resource : null;
      },
      
      cleanup(id) {
        const entry = resources.get(id);
        if (entry) {
          try {
            entry.cleanupFn(entry.resource);
          } catch (error) {
            console.warn('Erreur lors du nettoyage de la ressource:', id, error);
          }
          resources.delete(id);
        }
      },
      
      cleanupAll() {
        for (const id of resources.keys()) {
          this.cleanup(id);
        }
      },
      
      cleanupOlderThan(maxAge = 300000) { // 5 minutes par défaut
        const now = Date.now();
        for (const [id, entry] of resources) {
          if (now - entry.createdAt > maxAge) {
            this.cleanup(id);
          }
        }
      },
      
      stats() {
        return {
          total: resources.size,
          oldest: resources.size > 0 ? Math.min(...Array.from(resources.values()).map(r => r.createdAt)) : null
        };
      }
    };
  }
}
