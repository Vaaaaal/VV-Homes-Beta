// ==========================================
// GESTIONNAIRE DES CARTES DE REVIEW
// ==========================================

export class ReviewCardManager {
  async init() {
    await this._waitForCards();
    this._attachClickHandlers();
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
