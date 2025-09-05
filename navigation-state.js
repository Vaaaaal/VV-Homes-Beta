// NavigationState - état centralisé pour la navigation des panels du menu
// Simplifie la gestion de l'historique et des opérations associées.

export class NavigationState {
  constructor() {
    this.history = []; // tableau ordonné des panels ouverts
  }

  // Ajoute un panel si différent du dernier
  push(panelName) {
    if (!panelName) return;
    if (this.history[this.history.length - 1] !== panelName) {
      this.history.push(panelName);
    }
  }

  // Supprime le panel et tous ses descendants à partir de son nom
  removeFrom(panelName) {
    const idx = this.history.indexOf(panelName);
    if (idx !== -1) {
      this.history = this.history.slice(0, idx);
    }
  }

  // Coupe l'historique pour ne garder que jusqu'à (inclus) ancestorName
  trimTo(ancestorName) {
    if (!ancestorName) { this.clear(); return; }
    const idx = this.history.indexOf(ancestorName);
    if (idx !== -1) {
      this.history = this.history.slice(0, idx + 1);
    }
  }

  // Remplace totalement l'historique (usage limité)
  replace(newArray) {
    this.history = Array.isArray(newArray) ? [...newArray] : [];
  }

  // Vide l'historique
  clear() { this.history = []; }

  // Nom du panel courant (dernier)
  current() { return this.history.length ? this.history[this.history.length - 1] : null; }

  // Copie défensive
  snapshot() { return [...this.history]; }

  includes(name) { return this.history.includes(name); }
}
