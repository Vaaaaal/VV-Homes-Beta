// ==========================================
// NavigationActiveState - Gestion des états actifs & breadcrumb
// Externalisation depuis MenuManager pour alléger le fichier principal
// ==========================================
export class NavigationActiveState {
  constructor(findButtonByPanelName) {
    this.activeElements = new Set();
    this.currentActivePath = [];
    this._findButton = findButtonByPanelName; // fonction fournie par MenuManager
  }

  // Réinitialise tous les états actifs
  clearAll() {
    document.querySelectorAll('.menu_panel_item.is-active').forEach(p => p.classList.remove('is-active'));
    document.querySelectorAll('.menu_panel_item.is-current').forEach(p => p.classList.remove('is-current'));
    document.querySelectorAll('.menu_panel_collection_item.is-btn.is-active, .menu_panel_collection_item.is-btn.is-breadcrumb')
      .forEach(b => b.classList.remove('is-active','is-breadcrumb'));
    this.activeElements.clear();
    this.currentActivePath = [];
  }

  // Met à jour après ouverture d'un panel
  onOpen(panelName) {
    if (!this.currentActivePath.includes(panelName)) this.currentActivePath.push(panelName);
    this.refreshStates();
  }

  // Met à jour après fermeture d'un panel (et descendants)
  onClose(panelName) {
    const idx = this.currentActivePath.indexOf(panelName);
    if (idx !== -1) this.currentActivePath = this.currentActivePath.slice(0, idx);
    this.refreshStates();
  }

  // Applique les classes selon currentActivePath
  refreshStates() {
    // Nettoyage d'abord
    this.clearVisualOnly();

    // Panels & boutons actifs
    this.currentActivePath.forEach(name => {
      const panel = document.querySelector(`.menu_panel_item[data-name="${name}"]`);
      if (panel) { panel.classList.add('is-active'); this.activeElements.add(name); }
      const btn = this._findButton(name);
      if (btn) btn.classList.add('is-active');
    });

    // Panel courant
    const current = this.current();
    if (current) {
      const panel = document.querySelector(`.menu_panel_item[data-name="${current}"]`);
      if (panel) panel.classList.add('is-current');
    }

    // Breadcrumb (tous sauf le dernier)
    for (let i = 0; i < this.currentActivePath.length - 1; i++) {
      const btn = this._findButton(this.currentActivePath[i]);
      if (btn) btn.classList.add('is-breadcrumb');
    }
  }

  clearVisualOnly() {
    document.querySelectorAll('.menu_panel_item.is-active').forEach(p => p.classList.remove('is-active'));
    document.querySelectorAll('.menu_panel_item.is-current').forEach(p => p.classList.remove('is-current'));
    document.querySelectorAll('.menu_panel_collection_item.is-btn.is-active').forEach(b => b.classList.remove('is-active'));
    document.querySelectorAll('.menu_panel_collection_item.is-btn.is-breadcrumb').forEach(b => b.classList.remove('is-breadcrumb'));
    this.activeElements.clear();
  }

  isActive(name) { return this.activeElements.has(name); }
  current() { return this.currentActivePath[this.currentActivePath.length - 1] || null; }
  snapshotPath() { return [...this.currentActivePath]; }
}
