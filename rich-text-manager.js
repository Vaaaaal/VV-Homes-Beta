/**
 * Gestionnaire pour les éléments de texte riche
 * Vérifie et modifie les éléments .text-rich-text selon leur contenu
 */
export class RichTextManager {
  constructor() {
    this.richTextElements = [];
  }

  /**
   * Initialise le gestionnaire de texte riche
   * Vérifie la présence des éléments et applique les modifications nécessaires
   */
  init() {
    
    if (!this.checkRichTextElements()) {
      return false;
    }

    this.processRichTextElements();
    return true;
  }

  /**
   * Vérifie la présence des éléments .text-rich-text
   * @returns {boolean} true si des éléments sont trouvés
   */
  checkRichTextElements() {
    this.richTextElements = document.querySelectorAll('.text-rich-text');
    
    if (this.richTextElements.length === 0) {
      return false;
    }
    
    return true;
  }

  /**
   * Traite chaque élément de texte riche et applique les modifications
   */
  processRichTextElements() {
    this.richTextElements.forEach((element, index) => {
      
      this.formatFigureSource(element);
    });
  }

  /**
   * Améliore les liens dans l'élément
   * @param {HTMLElement} element - L'élément à traiter
   */
  formatFigureSource(element) {
    const allFigures = element.querySelectorAll('figure');
    allFigures.forEach(figure => {
      if (figure.querySelector('figcaption')) {
        const caption = figure.querySelector('figcaption');

        if(!caption.textContent.includes('///')) {
        } else {
          // Si le caption contient '///', on le divise en deux parties
          // La première partie est la source, la seconde est le texte du caption
          // On ajoute un <span> pour la source et on garde le texte du caption dans la div existante
          // Exemple : "Source de l'image /// Description de l'image"
          // devient <span class="media_source">Source de l'image</span> Description de l'image
          const source = caption.textContent.split('///')[0].trim(); // Prend la première partie avant '///'
  
          if(source) {
            // Ajoute un élément <span> pour la source et un classe "media_source"
            const sourceSpan = document.createElement('span');
            sourceSpan.className = 'media_source';
            sourceSpan.textContent = source;
            caption.textContent = caption.textContent.split('///')[1].trim(); // Prend la seconde partie après '///'
            figure.querySelector('div').appendChild(sourceSpan); // Ajoute le span à la div présente dans le caption
          }
        }
      }
    });
  }

  /**
   * Réinitialise le gestionnaire pour traiter de nouveaux éléments
   * Utile quand de nouveaux éléments sont ajoutés dynamiquement
   */
  reinit() {
    this.richTextElements = [];
    return this.init();
  }

  /**
   * Nettoie et supprime les event listeners
   */
  destroy() {
    this.richTextElements = [];
  }
}