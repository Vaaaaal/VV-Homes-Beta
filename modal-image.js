// Module: Image modal léger
// Ajoute une modal centrée pour afficher une image cliquée

export class ImageModal {
  constructor(options = {}) {
    this.excludeAttribute = options.excludeAttribute || 'data-image-no-modal';
    this.selector = options.selector || 'img';
    // Attribute to mark a video as modal-triggerable (e.g. <video data-video-modal>)
    this.videoExcludeAttribute = options.videoExcludeAttribute || 'data-video-no-modal';
    // If true, videos opened in the modal will autoplay (muted) when possible
    this.autoplayVideos = !!options.autoplayVideos;
    this.disableOnMobile = options.disableOnMobile !== false;
    this._boundClick = this._onDocumentClick.bind(this);
    this._boundKeydown = this._onKeyDown.bind(this);
    this._overlay = null;
    this._swiperInstance = null;
    this._slideMediaRefs = [];
    this._recentlyClosed = false;
    this._indicatorTemplateSelector = '.indicators_wrap.is-clonable';
    this._modalIndicatorClass = 'vv-image-modal-indicators';
    this._modalIndicator = null;
    this._indicatorSource = null;
    this._modalIndicatorTrack = null;
    this._modalIndicatorBall = null;
    this._navLogoSelector = '.nav_logo, .nav_btn_logo_link';
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
    if (this._recentlyClosed) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (this.disableOnMobile && this._isMobileViewport()) {
      return;
    }
    const target = e.target;
    if (!target) return;

     if (this._overlay && this._overlay.contains(target)) {
       return;
     }

    // Si clic sur image éligible
    if (target.tagName === 'IMG' && this._isMediaEligible(target)) {
      e.preventDefault();
      e.stopPropagation();
      this.open(target);
      return;
    }

    // Si clic sur vidéo éligible (élément <video> portant l'attribut videoExcludeAttribute)
    if (target.tagName === 'VIDEO' && this._isMediaEligible(target)) {
      e.preventDefault();
      e.stopPropagation();
      this.open(target);
      return;
    }

    // Si clic sur un wrapper portant l'attribut videoExcludeAttribute, chercher une <video> enfant
    if (target.hasAttribute && !target.hasAttribute(this.videoExcludeAttribute) && !target.hasAttribute(this.excludeAttribute)) {
      const vid = target.tagName === 'VIDEO' ? target : (target.querySelector ? target.querySelector('video') : null);
      if (vid && this._isMediaEligible(vid)) {
        e.preventDefault();
        e.stopPropagation();
        this.open(vid);
        return;
      }
    }

  }

  _onKeyDown(e) {
    if (!this._overlay) return;
    if (e.key === 'Escape') {
      this.close();
    }
  }

  open(mediaEl) {
    if (!mediaEl) return;
    if (this.disableOnMobile && this._isMobileViewport()) {
      return;
    }

    const clickedMedia = mediaEl;
    this._removeOverlay();
    this._releaseIndicatorReferences();

    const contextFolder = this._getMediaContextElement(clickedMedia);
    let mediaCollection = this._collectFolderMedia(contextFolder);

    if (this._isMediaEligible(clickedMedia)) {
      const clickedKey = this._getMediaComparisonKey(clickedMedia);
      const existsAlready = mediaCollection.some((node) => node === clickedMedia || this._getMediaComparisonKey(node) === clickedKey);
      if (!existsAlready) {
        mediaCollection.unshift(clickedMedia);
      }
    }

    if (!mediaCollection.length) {
      mediaCollection = this._isMediaEligible(clickedMedia) ? [clickedMedia] : [];
    }

    const initialIndex = this._findInitialMediaIndex(mediaCollection, clickedMedia);

    const { overlay, center } = this._createOverlaySkeleton();
    const headerStructure = this._createHeaderBar();
    const closeBtn = this._createCloseButton();
    const logoClone = this._cloneNavLogo();
    if (logoClone) {
      headerStructure.logoSlot.appendChild(logoClone);
    }
    headerStructure.closeSlot.appendChild(closeBtn);
    center.appendChild(headerStructure.header);
    let swiperStructure = null;

    if (this._canUseSwiper() && mediaCollection.length) {
      swiperStructure = this._buildSwiperStructure(mediaCollection);
    }

    if (swiperStructure) {
      center.appendChild(swiperStructure.container);
      this._slideMediaRefs = swiperStructure.mediaRefs;
      if (mediaCollection.length > 1) {
        this._attachModalIndicators(headerStructure.indicatorSlot, contextFolder, clickedMedia);
      }
    } else {
      const singleWrapper = document.createElement('div');
      singleWrapper.className = 'vv-image-modal-single';
      const safeMedia = mediaCollection[initialIndex] || clickedMedia;
      singleWrapper.appendChild(this._cloneMediaForModal(safeMedia));
      center.appendChild(singleWrapper);
      this._slideMediaRefs = [];
    }
    overlay.appendChild(center);
    document.body.appendChild(overlay);

    // eslint-disable-next-line no-unused-expressions
    overlay.offsetHeight;
    overlay.classList.add('vv-image-modal-open');
    this._blockScroll();

    this._overlay = overlay;

    if (swiperStructure) {
      this._initSwiper(swiperStructure.container, initialIndex);
    }

    overlay.addEventListener('click', (ev) => {
      if (ev.defaultPrevented) return;
      const clickedClose = ev.target.closest('.vv-image-modal-close');
      if (clickedClose) return; // already handled by button listener
      const insideMedia = ev.target.closest('.vv-image-modal-media');
      if (!insideMedia) {
        ev.preventDefault();
        ev.stopPropagation();
        this.close();
      }
    });
  }

  close() {
    if (!this._overlay) return;
    this._overlay.classList.remove('vv-image-modal-open');
    // allow animation before removing
    const node = this._overlay;
    this._unblockScroll();
    this._destroySwiper();
    this._releaseIndicatorReferences();
    this._armRecentlyClosedFlag();
    setTimeout(() => {
      if (node && node.parentNode) node.parentNode.removeChild(node);
    }, 180);
    this._overlay = null;
  }

  _removeOverlay() {
    if (this._overlay && this._overlay.parentNode) {
      this._destroySwiper();
      this._releaseIndicatorReferences();
      this._overlay.parentNode.removeChild(this._overlay);
      this._overlay = null;
      this._unblockScroll();
      this._armRecentlyClosedFlag();
    }
  }

  _armRecentlyClosedFlag() {
    this._recentlyClosed = true;
    clearTimeout(this._recentlyClosedTimer);
    this._recentlyClosedTimer = setTimeout(() => {
      this._recentlyClosed = false;
    }, 250);
  }

  _createOverlaySkeleton() {
    const overlay = document.createElement('div');
    overlay.className = 'vv-image-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const center = document.createElement('div');
    center.className = 'vv-image-modal-center';

    return { overlay, center };
  }

  _createCloseButton() {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'vv-image-modal-close';
    closeBtn.setAttribute('aria-label', 'Fermer');
    closeBtn.type = 'button';
    closeBtn.innerHTML = '✕';
    closeBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      this.close();
    });
    return closeBtn;
  }

  _createHeaderBar() {
    const header = document.createElement('div');
    header.className = 'vv-image-modal-header';

    const logoSlot = document.createElement('div');
    logoSlot.className = 'vv-image-modal-header-slot is-logo';

    const indicatorSlot = document.createElement('div');
    indicatorSlot.className = 'vv-image-modal-header-slot is-indicator';

    const closeSlot = document.createElement('div');
    closeSlot.className = 'vv-image-modal-header-slot is-close';

    header.appendChild(logoSlot);
    header.appendChild(indicatorSlot);
    header.appendChild(closeSlot);

    return { header, logoSlot, indicatorSlot, closeSlot };
  }

  _getMediaContextElement(mediaEl) {
    const folderFromNav = this._getLastOpenedFolderElement();
    if (folderFromNav) return folderFromNav;
    if (mediaEl && typeof mediaEl.closest === 'function') {
      const articleWrap = mediaEl.closest('.article_wrap');
      if (articleWrap) return articleWrap;
    }
    if (mediaEl && typeof mediaEl.closest === 'function') {
      const fallback = mediaEl.closest('.menu_panel_item');
      if (fallback) return fallback;
    }
    return null;
  }

  _getLastOpenedFolderElement() {
    try {
      const folderName = window.app?.menuManager?.navigationState?.current();
      if (!folderName) return null;
      return document.querySelector(`.menu_panel .menu_panel_item[data-name="${folderName}"]`);
    } catch (e) {
      return null;
    }
  }

  _collectFolderMedia(folderEl) {
    if (!folderEl) return [];
    try {
      const nodes = folderEl.querySelectorAll('img, video');
      return Array.from(nodes).filter((node) => this._isMediaEligible(node));
    } catch (e) {
      return [];
    }
  }

  _isHiddenByCondition(node) {
    if (!node || node.nodeType !== 1) return false;
    try {
      if (node.classList && node.classList.contains('w-condition-invisible')) {
        return true;
      }
      if (typeof node.closest === 'function') {
        const ancestor = node.closest('.w-condition-invisible');
        if (ancestor && ancestor !== node) {
          return true;
        }
      }
    } catch (e) {}
    return false;
  }

  _isMediaEligible(node) {
    if (!node || !node.tagName) return false;
    if (this._isHiddenByCondition(node)) return false;
    if (node.tagName === 'IMG') {
      return !node.hasAttribute(this.excludeAttribute);
    }
    if (node.tagName === 'VIDEO') {
      return !node.hasAttribute(this.videoExcludeAttribute) && !node.hasAttribute(this.excludeAttribute);
    }
    return false;
  }

  _getMediaComparisonKey(node) {
    if (!node || !node.tagName) return '';
    if (node.tagName === 'IMG') {
      return node.currentSrc || node.src || node.dataset?.src || node.getAttribute('data-src') || '';
    }
    if (node.tagName === 'VIDEO') {
      return node.currentSrc || node.src || node.getAttribute('data-src') || '';
    }
    return '';
  }

  _findInitialMediaIndex(mediaList, target) {
    if (!Array.isArray(mediaList) || !mediaList.length || !target) return 0;
    const directIndex = mediaList.indexOf(target);
    if (directIndex !== -1) return directIndex;
    const targetKey = this._getMediaComparisonKey(target);
    if (!targetKey) return 0;
    const match = mediaList.findIndex((node) => this._getMediaComparisonKey(node) === targetKey);
    return match === -1 ? 0 : match;
  }

  _cloneMediaForModal(source) {
    if (!source) return null;
    const cloned = source.cloneNode(true);
    cloned.classList.add('vv-image-modal-media', 'vv-image-modal-img');
    if (cloned.tagName === 'IMG') {
      cloned.alt = source.alt || '';
    }
    try { cloned.setAttribute(this.excludeAttribute, 'true'); } catch (e) {}
    try { cloned.removeAttribute('width'); } catch (e) {}
    try { cloned.removeAttribute('height'); } catch (e) {}
    cloned.style.width = 'auto';
    cloned.style.height = 'auto';
    cloned.style.cursor = 'default';
    if (cloned.tagName === 'VIDEO') {
      this._syncVideoAttributes(cloned, source);
    }
    this._applyNaturalLimits(cloned, source);
    return cloned;
  }

  _applyNaturalLimits(cloned, source) {
    if (!cloned || !source) return;

    const applyLimits = () => {
      let natW = Infinity;
      let natH = Infinity;
      if (cloned.tagName === 'IMG') {
        natW = source.naturalWidth || cloned.naturalWidth || source.width || source.clientWidth || Infinity;
        natH = source.naturalHeight || cloned.naturalHeight || source.height || source.clientHeight || Infinity;
      } else if (cloned.tagName === 'VIDEO') {
        natW = source.videoWidth || cloned.videoWidth || source.clientWidth || Infinity;
        natH = source.videoHeight || cloned.videoHeight || source.clientHeight || Infinity;
      }
      const vwLimit = Math.max(320, window.innerWidth || 0);
      const vhLimit = Math.max(320, window.innerHeight || 0);
      const maxWpx = Math.min(vwLimit, natW);
      const maxHpx = Math.min(vhLimit, natH);
      cloned.style.maxWidth = maxWpx === Infinity ? '100vw' : maxWpx + 'px';
      cloned.style.maxHeight = maxHpx === Infinity ? '100vh' : maxHpx + 'px';
      if (cloned.tagName === 'VIDEO') {
        cloned.style.display = 'block';
      }
    };

    if (cloned.tagName === 'IMG') {
      if ((source.naturalWidth && source.naturalHeight) || cloned.complete) {
        applyLimits();
      } else {
        cloned.addEventListener('load', applyLimits, { once: true });
        if (!cloned.src && source.src) cloned.src = source.src;
      }
    } else if (cloned.tagName === 'VIDEO') {
      if ((source.videoWidth && source.videoHeight) || cloned.readyState >= 1) {
        applyLimits();
      } else {
        cloned.addEventListener('loadedmetadata', applyLimits, { once: true });
        if (!cloned.src && (source.currentSrc || source.src)) cloned.src = source.currentSrc || source.src;
      }
    }
  }

  _buildSwiperStructure(mediaList = []) {
    if (!mediaList.length) return null;
    const sliderEl = document.createElement('div');
    sliderEl.className = 'vv-image-modal-swiper swiper';
    const wrapper = document.createElement('div');
    wrapper.className = 'swiper-wrapper';
    sliderEl.appendChild(wrapper);

    const mediaRefs = [];
    mediaList.forEach((media) => {
      const slide = document.createElement('div');
      slide.className = 'swiper-slide vv-image-modal-slide';
      const cloned = this._cloneMediaForModal(media);
      if (cloned) {
        slide.appendChild(cloned);
        mediaRefs.push(cloned);
      }
      wrapper.appendChild(slide);
    });

    return { container: sliderEl, mediaRefs };
  }

  _attachModalIndicators(container, contextFolder, mediaEl) {
    if (!container) return null;
    const source = this._findIndicatorTemplate(contextFolder, mediaEl);
    if (!source) return null;
    const clone = source.cloneNode(true);
    if (clone.classList && clone.classList.contains('is-clonable')) {
      clone.classList.remove('is-clonable');
    }
    if (clone.classList) {
      clone.classList.add(this._modalIndicatorClass);
    }
    try { clone.dataset.modalIndicator = 'true'; } catch (e) {}
    container.appendChild(clone);
    this._modalIndicator = clone;
    this._indicatorSource = source;
    this._modalIndicatorTrack = clone.querySelector('.indicators_scroller_line_wrap');
    this._modalIndicatorBall = clone.querySelector('.indicators_scroller_line_ball');
    this._setModalIndicatorBall(0);
    const indicatorLabel = this._resolveIndicatorLabel(contextFolder, mediaEl);
    this._updateIndicatorLabel(indicatorLabel);
    return clone;
  }

  _findIndicatorTemplate(contextFolder, mediaEl) {
    const selector = this._indicatorTemplateSelector;
    if (!selector || typeof document === 'undefined') {
      return null;
    }
    const sanitizedSelector = `${selector}:not(.${this._modalIndicatorClass})`;

    const trySelect = (root, useClosest = false) => {
      if (!root) return null;
      try {
        if (useClosest && typeof root.closest === 'function') {
          const closest = root.closest(sanitizedSelector);
          if (closest) return closest;
        }
        if (typeof root.matches === 'function' && root.matches(sanitizedSelector)) {
          return root;
        }
        if (typeof root.querySelector === 'function') {
          return root.querySelector(sanitizedSelector);
        }
      } catch (e) {}
      return null;
    };

    const direct = trySelect(mediaEl, true);
    if (direct) return direct;

    let ancestor = mediaEl?.parentElement || null;
    while (ancestor && ancestor !== document.body) {
      const candidate = trySelect(ancestor, false);
      if (candidate) return candidate;
      ancestor = ancestor.parentElement;
    }

    if (contextFolder) {
      const folderCandidate = trySelect(contextFolder, false);
      if (folderCandidate) return folderCandidate;
    }

    try {
      return document.querySelector(sanitizedSelector);
    } catch (e) {
      return null;
    }
  }

  _cloneNavLogo() {
    const selector = this._navLogoSelector;
    if (!selector || typeof document === 'undefined') return null;
    let source = null;
    try {
      const nodes = Array.from(document.querySelectorAll(selector));
      source = nodes.find((node) => !node.classList.contains('vv-image-modal-logo')) || null;
    } catch (e) {
      source = null;
    }
    if (!source) return null;
    let clone = source.cloneNode(true);

    if (clone.tagName === 'A') {
      const div = document.createElement('div');
      div.className = clone.className;
      div.innerHTML = clone.innerHTML;
      Array.from(clone.attributes).forEach((attr) => {
        if (attr.name === 'href' || attr.name === 'target' || attr.name === 'rel') return;
        if (attr.name === 'class') return;
        div.setAttribute(attr.name, attr.value);
      });
      clone = div;
    }

    clone.classList.add('vv-image-modal-logo');
    return clone;
  }

  _updateIndicatorLabel(label) {
    if (!this._modalIndicator) return;
    const textNode = this._modalIndicator.querySelector('.indicators_item_text');
    if (!textNode) return;
    const normalized = this._normalizeLabelText(label);
    if (!normalized) return;
    textNode.textContent = normalized;
  }

  _resolveIndicatorLabel(contextFolder, mediaEl) {
    const articleTitle = this._extractArticleTitle(mediaEl);
    if (articleTitle) return articleTitle;
    const folderTitle = this._getFolderTitle(contextFolder);
    if (folderTitle) return folderTitle;
    return '';
  }

  _getFolderTitle(contextFolder) {
    const folder = contextFolder || this._getLastOpenedFolderElement();
    if (!folder) return '';
    try {
      const titleEl = folder.querySelector('.menu_panel_item_title:not(.w-condition-invisible)');
      const rawText = titleEl ? (titleEl.textContent || titleEl.innerText || '') : (folder.dataset?.name || '');
      return this._normalizeLabelText(rawText);
    } catch (e) {
      return '';
    }
  }

  _extractArticleTitle(mediaEl) {
    const attributeSelectors = [
      '[data-article-title]',
      '[data-article-name]',
      '[data-article-label]',
      '[data-current-article-title]'
    ];

    for (const selector of attributeSelectors) {
      const node = mediaEl?.closest ? mediaEl.closest(selector) : null;
      const value = this._readArticleAttribute(node);
      if (value) return value;
    }

    const articleRoot = this._findArticleContext(mediaEl);
    if (articleRoot) {
      const attrValue = this._readArticleAttribute(articleRoot);
      if (attrValue) return attrValue;
      const titleNode = this._queryArticleTitleNode(articleRoot);
      if (titleNode) {
        return this._normalizeLabelText(titleNode.textContent || titleNode.innerText || '');
      }
    }

    for (const selector of attributeSelectors) {
      const node = document.querySelector(selector);
      const value = this._readArticleAttribute(node);
      if (value) return value;
    }

    return '';
  }

  _readArticleAttribute(node) {
    if (!node) return '';
    const datasetKeys = ['articleTitle', 'articleName', 'articleLabel', 'currentArticleTitle'];
    for (const key of datasetKeys) {
      const val = node.dataset?.[key];
      if (val && this._normalizeLabelText(val)) {
        return this._normalizeLabelText(val);
      }
    }
    const attributeKeys = ['data-article-title', 'data-article-name', 'data-article-label', 'data-current-article-title'];
    for (const attr of attributeKeys) {
      const attrVal = node.getAttribute ? node.getAttribute(attr) : null;
      if (attrVal && this._normalizeLabelText(attrVal)) {
        return this._normalizeLabelText(attrVal);
      }
    }
    if (this._nodeLooksLikeArticle(node)) {
      const fallbackAttr = node.getAttribute ? node.getAttribute('data-title') : null;
      if (fallbackAttr && this._normalizeLabelText(fallbackAttr)) {
        return this._normalizeLabelText(fallbackAttr);
      }
      const datasetTitle = node.dataset?.title;
      if (datasetTitle && this._normalizeLabelText(datasetTitle)) {
        return this._normalizeLabelText(datasetTitle);
      }
    }
    return '';
  }

  _findArticleContext(mediaEl) {
    const selectors = [
      '[data-article-root]',
      '[data-article-body]',
      '[data-article-wrapper]',
      '.article_template',
      '.article_detail',
      '.article-details',
      '.article_content',
      '.article_wrap',
      '.article_item',
      '.articles_item',
      '.article',
      'article'
    ];
    if (mediaEl && typeof mediaEl.closest === 'function') {
      for (const selector of selectors) {
        const candidate = mediaEl.closest(selector);
        if (candidate) return candidate;
      }
    }
    for (const selector of selectors) {
      try {
        const candidate = document.querySelector(selector);
        if (candidate) return candidate;
      } catch (e) {}
    }
    return null;
  }

  _queryArticleTitleNode(root) {
    if (!root || typeof root.querySelector !== 'function') return null;
    const selectors = [
      '[data-article-heading]',
      '.article_heading',
      '.article_header_title',
      '.article_title',
      '.menu-article_title',
      '.article-title',
      '.article_name',
      '.article_label',
      '.post_title',
      '.post-title',
      'h1',
      'h2'
    ];
    for (const selector of selectors) {
      let node = null;
      try {
        node = root.querySelector(selector);
      } catch (e) {
        node = null;
      }
      if (!node) continue;
      const text = this._normalizeLabelText(node.textContent || node.innerText || '');
      if (text) return node;
    }
    return null;
  }

  _nodeLooksLikeArticle(node) {
    if (!node) return false;
    if (node.tagName && node.tagName.toLowerCase() === 'article') return true;
    const className = typeof node.className === 'string' ? node.className.toLowerCase() : '';
    if (className && (className.includes('article') || className.includes('post'))) {
      return true;
    }
    return false;
  }

  _normalizeLabelText(text) {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/\s+/g, ' ').trim();
  }

  _syncVideoAttributes(cloned, source) {
    if (!cloned || !source) return;
    const booleanAttributes = [
      { attr: 'autoplay', prop: 'autoplay' },
      { attr: 'muted', prop: 'muted' },
      { attr: 'loop', prop: 'loop' },
      { attr: 'controls', prop: 'controls' },
      { attr: 'playsinline', prop: 'playsInline' }
    ];

    booleanAttributes.forEach(({ attr, prop }) => {
      const hasOriginalAttr = source.hasAttribute(attr);
      const hasOriginalProp = typeof source[prop] !== 'undefined' ? !!source[prop] : hasOriginalAttr;
      if (hasOriginalAttr || hasOriginalProp) {
        try { cloned[prop] = true; } catch (e) {}
        try { cloned.setAttribute(attr, attr === 'playsinline' ? '' : cloned.getAttribute(attr) || ''); } catch (e) {}
        if (!cloned.hasAttribute(attr)) {
          try { cloned.setAttribute(attr, ''); } catch (e) {}
        }
      } else {
        try { cloned[prop] = false; } catch (e) {}
        try { cloned.removeAttribute(attr); } catch (e) {}
      }
    });

    if (this.autoplayVideos) {
      try { cloned.autoplay = true; cloned.setAttribute('autoplay', ''); } catch (e) {}
      try { cloned.muted = true; cloned.setAttribute('muted', ''); } catch (e) {}
      try { cloned.playsInline = true; cloned.setAttribute('playsinline', ''); } catch (e) {}
    }

    const copyAttrs = ['poster', 'preload', 'crossorigin', 'controlslist'];
    copyAttrs.forEach((attr) => {
      if (source.hasAttribute(attr)) {
        try { cloned.setAttribute(attr, source.getAttribute(attr)); } catch (e) {}
      } else {
        try { cloned.removeAttribute(attr); } catch (e) {}
      }
    });

    if (source.controlsList && typeof source.controlsList.value === 'string') {
      try { cloned.setAttribute('controlslist', source.controlsList.value); } catch (e) {}
    }
  }

  _shouldAutoPlayMedia(media) {
    if (!media || media.tagName !== 'VIDEO') return false;
    if (this.autoplayVideos) return true;
    if (media.hasAttribute('autoplay')) return true;
    if (media.dataset && media.dataset.modalAutoplay === 'true') return true;
    return false;
  }

  _initSwiper(sliderEl, initialIndex = 0) {
    if (!this._canUseSwiper() || !sliderEl) return;
    try {
      this._swiperInstance = new window.Swiper(sliderEl, {
        direction: 'vertical',
        slidesPerView: 1,
        spaceBetween: 0,
        speed: 600,
        allowTouchMove: true,
        simulateTouch: true,
        resistanceRatio: 0.85,
        threshold: 10,
        roundLengths: true,
        observer: true,
        observeParents: true,
        mousewheel: {
          enabled: true,
          forceToAxis: true,
          releaseOnEdges: true,
          sensitivity: 1.1
        },
        initialSlide: Math.max(0, Math.min(initialIndex, Math.max(0, this._slideMediaRefs.length - 1))),
        touchStartPreventDefault: false
      });

      if (this._swiperInstance && typeof this._swiperInstance.on === 'function') {
        this._swiperInstance.on('slideChange', () => {
          const activeIdx = this._swiperInstance?.activeIndex || 0;
          this._handleSlideChange(activeIdx);
        });
      }

      const startIdx = this._swiperInstance?.activeIndex ?? initialIndex ?? 0;
      this._handleSlideChange(startIdx);
    } catch (e) {
      console.warn('[ImageModal] Swiper initialization failed', e);
      this._swiperInstance = null;
    }
  }

  _handleSlideChange(activeIdx = 0) {
    this._pauseAllVideos(activeIdx);
    this._updateModalIndicatorProgress(activeIdx);
    const activeMedia = this._slideMediaRefs[activeIdx];
    if (!activeMedia || activeMedia.tagName !== 'VIDEO') return;

    if (this._shouldAutoPlayMedia(activeMedia)) {
      try {
        const playPromise = activeMedia.play?.();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {});
        }
      } catch (e) {}
    }
  }

  _pauseAllVideos(exceptIndex = -1) {
    this._slideMediaRefs.forEach((media, idx) => {
      if (!media || media.tagName !== 'VIDEO') return;
      if (idx === exceptIndex) return;
      try { media.pause(); } catch (e) {}
      try { media.currentTime = 0; } catch (e) {}
    });
  }

  _destroySwiper() {
    this._pauseAllVideos(-1);
    if (this._swiperInstance && typeof this._swiperInstance.destroy === 'function') {
      try { this._swiperInstance.destroy(true, true); } catch (e) {}
    }
    this._swiperInstance = null;
    this._slideMediaRefs = [];
  }

  _releaseIndicatorReferences() {
    this._modalIndicator = null;
    this._indicatorSource = null;
    this._modalIndicatorTrack = null;
    this._modalIndicatorBall = null;
  }

  _updateModalIndicatorProgress(activeIdx = 0) {
    if (!this._modalIndicatorBall) return;
    const totalSlides = Array.isArray(this._slideMediaRefs) ? this._slideMediaRefs.length : 0;
    if (totalSlides <= 1) return;
    const clampedIdx = Math.max(0, Math.min(activeIdx, totalSlides - 1));
    const percent = totalSlides === 1 ? 0 : clampedIdx / (totalSlides - 1);
    this._setModalIndicatorBall(percent);
  }

  _setModalIndicatorBall(percent = 0) {
    if (!this._modalIndicatorBall) return;
    const safePercent = Math.max(0, Math.min(1, percent));
    const value = `${safePercent * 100}%`;
    if (typeof window !== 'undefined' && window.gsap) {
      window.gsap.to(this._modalIndicatorBall, { left: value, duration: 0.35, ease: 'power2.out' });
    } else {
      this._modalIndicatorBall.style.left = value;
    }
  }

  _canUseSwiper() {
    return typeof window !== 'undefined' && typeof window.Swiper !== 'undefined';
  }

  _isMobileViewport() {
    try {
      if (window.WindowUtils && typeof window.WindowUtils.isMobileLite === 'function') {
        return !!window.WindowUtils.isMobileLite();
      }
    } catch (e) {}
    try {
      return window.innerWidth <= 768;
    } catch (e) {
      return false;
    }
  }


  _injectStyles() {
    if (document.getElementById('vv-image-modal-styles')) return;
    const css = `
  .vv-image-modal-overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.8);backdrop-filter:blur(8px);opacity:0;transition:opacity .18s ease;z-index:12000}
  .vv-image-modal-open{opacity:1}
  .vv-image-modal-center{position:relative;pointer-events:auto;display:flex;align-items:center;justify-content:center;width:100vw;height:100vh;max-width:100vw;max-height:100vh;padding:0;box-sizing:border-box}
  .vv-image-modal-header{position:absolute;top:1.1rem;left:1.5rem;right:1.5rem;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));align-items:center;gap:0.75rem;pointer-events:none;z-index:2}
  .vv-image-modal-header-slot{min-width:0;display:flex;align-items:center;pointer-events:auto;justify-content:center}
  .vv-image-modal-header-slot.is-indicator{grid-column:2 / span 2;width:100%}
  .vv-image-modal-header-slot.is-close{justify-content:flex-end}
  .vv-image-modal-header-slot.is-logo{justify-self:left}
  .vv-image-modal-logo{display:inline-flex;align-items:center;justify-content:center;max-width:200px}
  .vv-image-modal-swiper{pointer-events:auto;width:100vw;height:100vh;max-width:100vw;max-height:100vh;padding:0;box-sizing:border-box;touch-action:none}
  .vv-image-modal-slide{display:flex;align-items:center;justify-content:center;width:100%;height:100%;overflow:hidden}
  .vv-image-modal-single{pointer-events:auto;display:flex;align-items:center;justify-content:center;width:100vw;height:100vh;max-width:100vw;max-height:100vh;padding:0;box-sizing:border-box}
  .vv-image-modal-media,.vv-image-modal-img{pointer-events:auto;width:auto;height:auto;max-width:100vw;max-height:100vh;display:block;object-fit:contain;box-shadow:0 20px 50px rgba(0,0,0,0.2);background:#fff;transform:scale(.98);opacity:0;transition:transform .2s ease,opacity .2s ease}
  .vv-image-modal-open .vv-image-modal-media,.vv-image-modal-open .vv-image-modal-img{transform:scale(1);opacity:1}
  .vv-image-modal-close{pointer-events:auto;position:static;z-index:1;background:rgba(0,0,0,1);color:#fff;border:0;border-radius:2px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer;transition:background .2s ease}
  `;
    const style = document.createElement('style');
    style.id = 'vv-image-modal-styles';
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  }
}

export default ImageModal;
