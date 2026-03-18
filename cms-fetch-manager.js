export class CmsFetchManager {
  constructor() {
    this._cache = new Map();   // url → DOMParser document
    this._pending = new Map(); // url → Promise<void>
  }

  // Pre-fetch (fire-and-forget)
  prefetch(url) {
    if (this._cache.has(url) || this._pending.has(url)) return;
    const p = fetch(url)
      .then(r => r.ok ? r.text() : Promise.reject())
      .then(html => this._cache.set(url, new DOMParser().parseFromString(html, 'text/html')))
      .catch(() => {})
      .finally(() => this._pending.delete(url));
    this._pending.set(url, p);
  }

  // Attend la fin du fetch, puis injecte dans le slot du panel
  async inject(url, panelEl) {
    if (this._pending.has(url)) await this._pending.get(url);
    const doc = this._cache.get(url);
    if (!doc) return false;

    const slot = panelEl.querySelector('.menu_panel_item_middle');
    if (!slot || slot.dataset.fetched) return false;

    const source = doc.querySelector('[data-panel-target]');
    if (!source) return false;

    slot.innerHTML = source.innerHTML;
    slot.dataset.fetched = url;
    return true;
  }

  async fetchAndInject(url, panelEl) {
    this.prefetch(url);
    return this.inject(url, panelEl);
  }

  // Récupère le document fetchée sans l'injecter dans le DOM
  async fetchDoc(url) {
    this.prefetch(url);
    if (this._pending.has(url)) await this._pending.get(url);
    return this._cache.get(url) || null;
  }
}
