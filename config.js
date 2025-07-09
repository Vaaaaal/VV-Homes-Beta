// ==========================================
// CONFIGURATION GLOBALE DE L'APPLICATION
// ==========================================
// Centralise toutes les constantes pour faciliter la maintenance

export const CONFIG = {
  // Paramètres d'animation GSAP
  ANIMATION: {
    DURATION: 0.4,                              // Durée standard des animations (en secondes)
    SNAP_DURATION: { min: 0.1, max: 0.6 },      // Durée du snap lors du scroll
    EASE: {                                     // Courbes d'accélération pour les animations
        LINEAR: "linear",
        POWER2: {
            IN: "power2.in",
            OUT: "power2.out",
        },
    },
    SNAP_EASE: "circ.inOut"
  },
  // Sélecteurs CSS utilisés dans l'application
  SELECTORS: {
    SLIDER_ITEM: ".slider-panel_item",                                  // Chaque slide du slider
    SLIDER_LIST: ".slider-panel_list",                                  // Container principal du slider
    CATEGORIES: ".indicators_item",                                     // Éléments de catégories dans les indicateurs
    INDICATOR_BALL: ".indicators_scroller_line_ball",                   // Boule de progression sur la ligne d'indicateur
    INDICATOR_TRACK: ".indicators_scroller_line_wrap",                  // Ligne de progression de l'indicateur
    MENU_WRAP: ".menu_wrap",                                            // Container principal du menu
    MENU_EXIT: ".menu_exit",                                            // Bouton de fermeture des panels
    MENU_BUTTON: "#menu-btn",                                           // Bouton d'ouverture du menu
    MENU_FIRST_PANEL: ".menu_panel.is-col-1",                           // Premier panneau du menu
    MENU_FIRST_PANEL_ITEM: ".menu_panel.is-col-1 .menu_panel_item",     // Items du premier panneau
    MENU_PANEL_ITEMS: ".menu_panel .menu_panel_item",                   // Items de tous les panneaux
    MENU_FOLDERS: ".menu_panel_collection_item.is-btn",                 // Items de type dossier dans le menu
  }
};
