// ==========================================
// GESTIONNAIRE DES CARTES DE REVIEW
// ==========================================

export class ReviewCardManager {
  async init() {
    await this._waitForCards();
    await this._randomize();
    this._attachClickHandlers();
  }

  async _randomize() {
    const reviewCards = document.querySelectorAll('.review-card_wrap');
    if (reviewCards.length === 0) return;

    // Supprimer d'abord toutes les classes "is-reverse" existantes
    reviewCards.forEach(card => card.classList.remove('is-reverse'));

    // Calculer un nombre aléatoire inférieur à la moitié du total
    const maxCards = Math.floor(reviewCards.length / 2);
    const randomCount = Math.floor(Math.random() * maxCards) + 1;

    // Mélanger les indices (Fisher-Yates)
    const indices = Array.from({ length: reviewCards.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    for (let i = 0; i < randomCount; i++) {
      reviewCards[indices[i]].classList.add('is-reverse');
    }
  }

  _attachClickHandlers() {
    const reviewCards = document.querySelectorAll('.review-card_wrap');
    reviewCards.forEach(card => {
      card.addEventListener('click', () => {
        const isDesktop = window.WindowUtils
          ? window.WindowUtils.isDesktop()
          : window.innerWidth >= 992;
        if (isDesktop) return;
        card.classList.toggle('is-reverse');
      });
    });
  }

  async _waitForCards() {
    const maxAttempts = 15;
    const delayMs = 300;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      if (document.querySelectorAll('.review-card_wrap').length > 0) return;
    }
  }
}
