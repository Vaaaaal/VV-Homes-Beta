// ==========================================
// GESTIONNAIRE D'IMAGES RESPONSIVES RICHTEXT
// ==========================================
import logger from './logger.js';

/**
 * RichtextResponsiveImages
 *
 * Transforme les paires d'images desktop/mobile dans les richtexts Webflow
 * en éléments <picture> natifs pour un rendu responsive optimal.
 *
 * CONVENTION DE NOMMAGE (champ "caption" dans Webflow) :
 *   "Ma légende [nom-image --desktop]"  → image affichée sur desktop
 *   "Ma légende [nom-image --mobile]"   → image affichée sur mobile
 *
 * - Le texte avant [...] devient la figcaption nettoyée (desktop uniquement)
 * - Le nom-image sert à associer les deux variantes
 * - L'attribut alt des images est conservé tel quel
 * - Le figure mobile est supprimé du DOM
 *
 * STRUCTURE DOM PRODUITE :
 *   <figure>
 *     <picture>
 *       <source media="(max-width: 767px)" srcset="image-mobile.jpg">
 *       <img src="image-desktop.jpg" alt="...">
 *     </picture>
 *     <figcaption>Ma légende</figcaption>
 *   </figure>
 *
 * USAGE :
 *   const rri = new RichtextResponsiveImages();
 *   rri.init();                  // traite le document entier au chargement
 *   rri.process(someElement);   // traite un sous-arbre (ex: contenu injecté dynamiquement)
 */
export class RichtextResponsiveImages {
  /**
   * Traite les paires d'images desktop/mobile dans tous les .w-richtext
   * contenus dans `root`.
   * @param {Document|Element} root - Racine dans laquelle chercher (défaut: document)
   * @returns {number} Nombre de paires converties en <picture>
   */
  process(root = document) {
    const richtexts = root.querySelectorAll('.w-richtext');
    if (!richtexts.length) return 0;

    let converted = 0;

    richtexts.forEach(rt => {
      const figures = [...rt.querySelectorAll('figure')];
      const pairs = {};

      figures.forEach(figure => {
        const img = figure.querySelector('img');
        if (!img) return;

        const figcaption = figure.querySelector('figcaption');
        const caption = figcaption?.textContent || '';
        const match = caption.match(/^(.*?)\s*\[(.+?)\s+--(desktop|mobile)\]\s*$/);
        if (!match) return;

        const [, cleanCaption, baseName, variant] = match;
        if (!pairs[baseName]) pairs[baseName] = {};
        pairs[baseName][variant] = { figure, img, figcaption, caption: cleanCaption.trim() };
      });

      Object.entries(pairs).forEach(([, { desktop, mobile }]) => {
        if (!desktop || !mobile) return;

        const picture = document.createElement('picture');

        const sourceMobile = document.createElement('source');
        sourceMobile.media = '(max-width: 767px)';
        sourceMobile.srcset = mobile.img.src;

        picture.appendChild(sourceMobile);
        picture.appendChild(desktop.img);
        desktop.figure.prepend(picture);

        // Nettoyer le marqueur dans la figcaption desktop
        if (desktop.figcaption) {
          desktop.figcaption.textContent = desktop.caption;
        }

        mobile.figure.remove();
        converted++;
      });
    });

    return converted;
  }

  /**
   * Initialise le gestionnaire : traite le document entier.
   * Appelé au chargement de la page pour le contenu statique.
   */
  init() {
    const count = this.process(document);
    if (count) {
      logger.success(` RichtextResponsiveImages: ${count} paire(s) convertie(s) en <picture>`);
    } else {
      logger.debug(' RichtextResponsiveImages: Aucune paire desktop/mobile trouvée');
    }
  }
}
