// Module: Image modal léger
// Ajoute une modal centrée pour afficher une image cliquée

export class ImageModal {
  constructor(options = {}) {
    this.excludeAttribute = options.excludeAttribute || 'data-image-no-modal';
    this.selector = options.selector || 'img';
    // Attribute to mark a video as modal-triggerable (e.g. <video data-video-modal>)
    this.videoAttribute = options.videoAttribute || 'data-video-modal';
    // If true, videos opened in the modal will autoplay (muted) when possible
    this.autoplayVideos = !!options.autoplayVideos;
    this._boundClick = this._onDocumentClick.bind(this);
    this._boundKeydown = this._onKeyDown.bind(this);
    this._overlay = null;
  }

  init() {
    // Attacher délégation d'événement au document
    document.addEventListener('click', this._boundClick, true);
    document.addEventListener('keydown', this._boundKeydown, true);
    this._injectStyles();
    // Transfer possible exclusion flags from <figcaption> to contained images
    // Wait for Finsweet CMS to finish loading if it's present
    this._waitForFinsweet().then(() => {
      try { 
        this._transferFigcaptionExclusions();
        // Watch for DOM changes to reapply exclusions (for dynamic content like menus)
        this._observeDOM();
      } catch (e) {}
    });
  }

  _waitForFinsweet(timeout = 5000) {
    // Check if Finsweet CMS library is present
    return new Promise((resolve) => {
      let resolved = false;
      const doResolve = () => {
        if (resolved) return;
        resolved = true;
        resolve();
      };

      // If no Finsweet detected, resolve immediately
      if (!document.querySelector('[fs-cmsload-element]') && !document.querySelector('[fs-cmsnest-element]')) {
        return doResolve();
      }

      // Check if already loaded
      const list = document.querySelector('[fs-cmsload-element="list"]');
      if (list && list.dataset.fsCmsloadLoaded === 'true') {
        return doResolve();
      }
      
      // Listen for Finsweet's load event if available
      if (window.fsAttributes && Array.isArray(window.fsAttributes)) {
        window.fsAttributes.push(() => doResolve());
      }
      
      // Polling fallback with timeout
      const startTime = Date.now();
      const poll = setInterval(() => {
        if (Date.now() - startTime > timeout) {
          clearInterval(poll);
          doResolve(); // Timeout - proceed anyway
          return;
        }
        const list = document.querySelector('[fs-cmsload-element="list"]');
        if (list && list.dataset.fsCmsloadLoaded === 'true') {
          clearInterval(poll);
          doResolve();
        }
      }, 100);

      // Fallback timeout safety
      setTimeout(() => doResolve(), timeout);
    });
  }

  _observeDOM() {
    // Create a MutationObserver to watch for new content being added (menus, CMS items, etc.)
    if (this._observer) return; // Already observing
    
    try {
      this._observer = new MutationObserver((mutations) => {
        let shouldReapply = false;
        for (const mutation of mutations) {
          if (mutation.addedNodes.length > 0) {
            // Check if any added nodes contain figures or figcaptions
            for (const node of mutation.addedNodes) {
              if (node.nodeType === 1) { // Element node
                if (node.matches && (node.matches('figure') || node.querySelector('figure'))) {
                  shouldReapply = true;
                  break;
                }
              }
            }
          }
          if (shouldReapply) break;
        }
        if (shouldReapply) {
          // Debounce: wait a bit for multiple mutations to settle
          clearTimeout(this._reapplyTimeout);
          this._reapplyTimeout = setTimeout(() => {
            try { this._transferFigcaptionExclusions(); } catch (e) {}
          }, 200);
        }
      });

      this._observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    } catch (e) {}
  }

  _transferFigcaptionExclusions() {
    try {
      const figures = document.querySelectorAll('figure');
      figures.forEach((fig) => {
        try {
          const figcap = fig.querySelector('figcaption');
          if (!figcap) return;
          // Look for the literal marker string in the figcaption content
          const marker = '[data-image-no-modal]';
          if (!(figcap.innerHTML && figcap.innerHTML.indexOf(marker) !== -1)) return;

          const imgs = fig.querySelectorAll('img');
          imgs.forEach((img) => {
            try { img.setAttribute(this.excludeAttribute, 'true'); } catch (e) {}
          });

          // Remove only the marker text from the figcaption's HTML, keep the rest intact
          try {
            figcap.innerHTML = figcap.innerHTML.replace(/\[data-image-no-modal\]/g, '').trim();
          } catch (e) {
            // fallback: if innerHTML replace fails, try textContent
            try { figcap.textContent = (figcap.textContent || '').replace(/\[data-image-no-modal\]/g, '').trim(); } catch (e) {}
          }
        } catch (e) {}
      });
    } catch (e) {}
  }

  _blockScroll() {
    // Prefer the Lenis instance owned by the SmoothScrollManager (window.app.smoothScrollManager.lenis)
    try {
      const ss = window.app && window.app.smoothScrollManager;
      const instance = ss && ss.lenis ? ss.lenis : (window.lenis || null);
      if (instance && typeof instance.stop === 'function') {
        instance.stop();
        return;
      }
    } catch (e) {}
    // fallback to blocking the document overflow only if no Lenis instance found
    try { document.documentElement.style.overflow = 'hidden'; } catch (e) {}
  }

  _unblockScroll() {
    // Prefer the Lenis instance owned by the SmoothScrollManager (window.app.smoothScrollManager.lenis)
    try {
      const ss = window.app && window.app.smoothScrollManager;
      const instance = ss && ss.lenis ? ss.lenis : (window.lenis || null);
      if (instance && typeof instance.start === 'function') {
        instance.start();
        return;
      }
    } catch (e) {}
    // fallback to unblocking the document overflow only if no Lenis instance found
    try { document.documentElement.style.overflow = ''; } catch (e) {}
  }

  destroy() {
    document.removeEventListener('click', this._boundClick, true);
    document.removeEventListener('keydown', this._boundKeydown, true);
    this._removeOverlay();
    // Stop observing DOM changes
    if (this._observer) {
      try { this._observer.disconnect(); } catch (e) {}
      this._observer = null;
    }
    if (this._reapplyTimeout) {
      clearTimeout(this._reapplyTimeout);
    }
  }

  _onDocumentClick(e) {
    const target = e.target;
    if (!target) return;

    // Si clic sur image éligible
    if (target.tagName === 'IMG' && !target.hasAttribute(this.excludeAttribute)) {
      e.preventDefault();
      e.stopPropagation();
      this.open(target);
      return;
    }

    // Si clic sur vidéo éligible (élément <video> portant l'attribut videoAttribute)
    if (target.tagName === 'VIDEO' && target.hasAttribute(this.videoAttribute) && !target.hasAttribute(this.excludeAttribute)) {
      e.preventDefault();
      e.stopPropagation();
      this.open(target);
      return;
    }

    // Si clic sur un wrapper portant l'attribut videoAttribute, chercher une <video> enfant
    if (target.hasAttribute && target.hasAttribute(this.videoAttribute) && !target.hasAttribute(this.excludeAttribute)) {
      const vid = target.tagName === 'VIDEO' ? target : (target.querySelector ? target.querySelector('video') : null);
      if (vid) {
        e.preventDefault();
        e.stopPropagation();
        this.open(vid);
        return;
      }
    }

    // Si clic sur overlay ou close
    if (this._overlay && (target.closest('.vv-image-modal-overlay') || target.classList.contains('vv-image-modal-close'))) {
      // if clicked inside image container, ignore
      const insideCenter = target.closest('.vv-image-modal-center');
      if (insideCenter) return;
      this.close();
    }
  }

  _onKeyDown(e) {
    if (!this._overlay) return;
    if (e.key === 'Escape') {
      this.close();
    }
  }

  open(imgEl) {
    // generic media element (image or video)
    const mediaEl = imgEl;
    this._removeOverlay();

    const overlay = document.createElement('div');
    overlay.className = 'vv-image-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const center = document.createElement('div');
    center.className = 'vv-image-modal-center';

    // Clone the media to avoid moving it in the DOM
    const cloned = mediaEl.cloneNode(true);
    // add common class for styling
    cloned.classList.add('vv-image-modal-img');
    if (cloned.tagName === 'IMG') cloned.alt = mediaEl.alt || '';
    // Mark cloned media as excluded so it won't trigger another modal
    try {
      cloned.setAttribute(this.excludeAttribute, 'true');
      // Prevent clicks on the cloned media from propagating (avoid reopening)
      cloned.addEventListener('click', (ev) => { ev.stopPropagation(); ev.preventDefault(); }, { passive: false });
      // Make cursor neutral so it doesn't look clickable
      cloned.style.cursor = 'default';
    } catch (e) {}

    // Remove any explicit width/height attributes that could force scaling
    try { cloned.removeAttribute('width'); } catch (e) {}
    try { cloned.removeAttribute('height'); } catch (e) {}
    cloned.style.width = 'auto';
    cloned.style.height = 'auto';

    // Ensure we never upscale the media beyond its intrinsic size.
    const applyNaturalLimits = () => {
      let natW = Infinity;
      let natH = Infinity;
      if (cloned.tagName === 'IMG') {
        natW = mediaEl.naturalWidth || cloned.naturalWidth || mediaEl.width || mediaEl.clientWidth || Infinity;
        natH = mediaEl.naturalHeight || cloned.naturalHeight || mediaEl.height || mediaEl.clientHeight || Infinity;
      } else if (cloned.tagName === 'VIDEO') {
        natW = mediaEl.videoWidth || cloned.videoWidth || mediaEl.clientWidth || Infinity;
        natH = mediaEl.videoHeight || cloned.videoHeight || mediaEl.clientHeight || Infinity;
      }
      const vwLimit = Math.floor(window.innerWidth * 0.8);
      const vhLimit = Math.floor(window.innerHeight * 0.8);
      const maxWpx = Math.min(vwLimit, natW);
      const maxHpx = Math.min(vhLimit, natH);
      cloned.style.maxWidth = maxWpx === Infinity ? '80vw' : maxWpx + 'px';
      cloned.style.maxHeight = maxHpx === Infinity ? '80vh' : maxHpx + 'px';
      // For video ensure controls/play attributes
      if (cloned.tagName === 'VIDEO') {
        // try { cloned.setAttribute('controls', ''); } catch (e) {}
        try { cloned.setAttribute('playsinline', ''); } catch (e) {}
        cloned.style.display = 'block';
        if (this.autoplayVideos) {
          try { cloned.setAttribute('autoplay', ''); } catch (e) {}
          try { cloned.muted = true; } catch (e) {}
        }
      }
    };

    // If media hasn't finished loading, wait for load/loadedmetadata to know intrinsic sizes
    if (cloned.tagName === 'IMG') {
      if ((mediaEl.naturalWidth && mediaEl.naturalHeight) || (cloned.complete && cloned.naturalWidth)) {
        applyNaturalLimits();
      } else {
        cloned.addEventListener('load', applyNaturalLimits, { once: true });
        if (!cloned.src && mediaEl.src) cloned.src = mediaEl.src;
      }
    } else if (cloned.tagName === 'VIDEO') {
      if ((mediaEl.videoWidth && mediaEl.videoHeight) || (cloned.readyState >= 1)) {
        applyNaturalLimits();
      } else {
        cloned.addEventListener('loadedmetadata', applyNaturalLimits, { once: true });
        if (!cloned.src && (mediaEl.currentSrc || mediaEl.src)) cloned.src = mediaEl.currentSrc || mediaEl.src;
      }
    }

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'vv-image-modal-close';
    closeBtn.setAttribute('aria-label', 'Fermer');
    closeBtn.type = 'button';
    closeBtn.innerHTML = '✕';

    // Ensure the close button actually closes the modal
    try {
      closeBtn.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this.close();
      });
    } catch (e) {}

    center.appendChild(cloned);
    center.appendChild(closeBtn);
    overlay.appendChild(center);
    document.body.appendChild(overlay);

    // Force reflow then add visible class for animation
    // eslint-disable-next-line no-unused-expressions
    overlay.offsetHeight;
    overlay.classList.add('vv-image-modal-open');

    // Prevent page scroll while modal open (use lenis if available)
    this._blockScroll();

    this._overlay = overlay;

    

    // Click outside image closes modal
    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay) this.close();
    });
  }

  close() {
    if (!this._overlay) return;
    this._overlay.classList.remove('vv-image-modal-open');
    // allow animation before removing
    const node = this._overlay;
    this._unblockScroll();
    setTimeout(() => {
      if (node && node.parentNode) node.parentNode.removeChild(node);
    }, 180);
    this._overlay = null;
  }

  _removeOverlay() {
    if (this._overlay && this._overlay.parentNode) {
      this._overlay.parentNode.removeChild(this._overlay);
      this._overlay = null;
      this._unblockScroll();
    }
  }


  _injectStyles() {
    if (document.getElementById('vv-image-modal-styles')) return;
    const css = `
.vv-image-modal-overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.65);opacity:0;transition:opacity .18s ease;z-index:12000}
.vv-image-modal-open{opacity:1}
.vv-image-modal-center{position:relative;display:flex;align-items:center;justify-content:center;max-width:80vw;max-height:80vh;padding:10px;box-sizing:border-box}
.vv-image-modal-img{max-width:80vw;max-height:80vh;width:auto;height:auto;display:block;box-shadow:0 10px 30px rgba(0,0,0,0.2);transform:scale(.98);transition:transform .18s ease,opacity .18s ease;opacity:0}
.vv-image-modal-open .vv-image-modal-img{transform:scale(1);opacity:1}
.vv-image-modal-close{position:absolute;top:20px;right:20px;background:rgba(0,0,0,0.5);color:#fff;border:0;border-radius:4px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer}
@media (max-width:520px){.vv-image-modal-img{max-width:94vw;max-height:80vh}}
`;
    const style = document.createElement('style');
    style.id = 'vv-image-modal-styles';
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  }
}

export default ImageModal;
