# VV Homes Beta - Interface Interactive

![VV Place Logo](https://via.placeholder.com/150x50/2563eb/white?text=VV+Place)

> Interface web interactive pour présenter les projets de densification douce de Villes Vivantes

🔗 **Demo Live**: [vv-homes-beta.webflow.io](https://vv-homes-beta.webflow.io/)

## 📋 Table des matières

- [Vue d'ensemble](#-vue-densemble)
- [Architecture](#-architecture)
- [Fonctionnalités principales](#-fonctionnalités-principales)
- [Technologies utilisées](#-technologies-utilisées)
- [Installation](#-installation)
- [Structure du projet](#-structure-du-projet)
- [Modules principaux](#-modules-principaux)
- [Configuration responsive](#-configuration-responsive)
- [Système de logging](#-système-de-logging)
- [Gestion des erreurs](#-gestion-des-erreurs)
- [Optimisations](#-optimisations)
- [Développement](#-développement)

## 🏗️ Vue d'ensemble

VV Homes Beta est une interface web interactive développée pour **Villes Vivantes**, spécialisée dans la densification douce urbaine à travers les projets BIMBY, BUNTI et BAMBA. Le site présente de manière immersive les différents territoires et projets d'aménagement urbain.

### Concepts clés présentés :
- **BIMBY** (Beauty In My Back Yard) : Densification douce dans les jardins privés
- **BUNTI** : Transformation du patrimoine bâti existant
- **BAMBA** : Nouveaux modèles d'habitat harmonieux

## 🏛️ Architecture

L'application suit une architecture modulaire avec un contrôleur principal orchestrant plusieurs gestionnaires spécialisés :

```
VVPlaceApp (Contrôleur principal)
├── OrientationManager (Gestionnaire centralisé d'orientation)
├── LoaderManager (Animations de chargement)
├── SmoothScrollManager (Scroll fluide avec Lenis)
├── SliderManager (Slider horizontal principal)
├── SwiperManager (Galeries d'images)
├── MenuManager (Navigation hiérarchique)
├── ModalManager (Fenêtres modales)
└── RichTextManager (Contenu texte enrichi)
```

## ✨ Fonctionnalités principales

### 🎬 Animation de chargement sophistiquée
- **Mode horizontal** (desktop) : Animation de stacking d'images avec transition fluide
- **Mode vertical** (mobile) : Fade progressif avec reset de position
- Reset robuste du scroll pour éviter la restauration automatique du navigateur
- Logo cliquable pour relancer l'animation

### 🧭 Gestion d'orientation adaptative
- **Détection automatique** : Desktop → horizontal, Mobile → vertical
- **Gestionnaire centralisé** évitant les conflits entre modules
- **Debounce adaptatif** : Délais variables selon le contexte (150ms desktop, 400ms mobile, 600ms si changements rapides)
- **Priorités d'exécution** pour coordonner les mises à jour

### 📜 Scroll fluide intelligent
- **Librairie Lenis** avec orientation dynamique
- **Synchronisation GSAP** via ticker pour animations fluides
- **Instances multiples** pour les panels de menu
- **Reset robuste** avec surveillance continue (watchdog)

### 🍔 Navigation hiérarchique avancée
- **CMS dynamique** avec chargement incrémental via Finsweet
- **Historique de navigation** avec logique ancêtre/descendant
- **Gestion des frères** : fermeture automatique des panels du même niveau
- **Navigation directe** via liens `data-menu-link`
- **États actifs** : breadcrumb, panel courant, ancêtres

### 🎚️ Slider horizontal immersif
- **Scroll horizontal** avec snap automatique sur desktop
- **Indicateurs visuels** : progression avec boule animée
- **Sync parfaite** avec le contenu affiché
- **Reset de position** coordonné avec autres gestionnaires

### 🪟 Système modal intégré
- **Data attributes** pour configuration (`data-modal-trigger`, `data-modal-item`)
- **Intégration Swiper** pour galeries dans les modales
- **Fermeture intelligente** : overlay, boutons, échappement

## 🔧 Technologies utilisées

### Librairies principales
- **[GSAP](https://greensock.com/gsap/)** - Animations avancées
- **[Lenis](https://lenis.studiofreight.com/)** - Scroll fluide
- **[Swiper](https://swiperjs.com/)** - Galeries tactiles
- **[Finsweet Attributes](https://finsweet.com/attributes)** - CMS dynamique Webflow

### Outils de développement
- **ES6 Modules** - Architecture modulaire
- **Vanilla JavaScript** - Performance optimale
- **Webflow CMS** - Gestion de contenu

## 🚀 Installation

### Prérequis
- Serveur web local ou CDN pour les modules ES6
- Accès aux CDN des librairies externes

### Intégration
1. **Inclure les dépendances** dans Webflow :
```html
<!-- GSAP -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"></script>

<!-- Lenis -->
<script src="https://cdn.jsdelivr.net/gh/studio-freight/lenis@latest/dist/lenis.min.js"></script>

<!-- Swiper -->
<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>

<!-- Finsweet Attributes -->
<script src="https://cdn.jsdelivr.net/npm/@finsweet/attributes-cmsload@1/cmsload.js"></script>
```

2. **Charger le script principal** :
```html
<script type="module" src="/script.js"></script>
```

## 📁 Structure du projet

```
/
├── script.js                 # Point d'entrée
├── app.js                   # Contrôleur principal
├── config.js                # Configuration globale
├── logger.js                # Système de logging
├── utils.js                 # Utilitaires responsive
│
├── Gestionnaires principaux/
│   ├── orientation-manager.js  # Orientation centralisée
│   ├── loader-manager.js       # Animations de chargement
│   ├── smooth-scroll-manager.js # Scroll fluide
│   ├── slider-manager.js       # Slider horizontal
│   ├── menu-manager.js         # Navigation hiérarchique
│   ├── modal-manager.js        # Système modal
│   ├── swiper-manager.js       # Galeries d'images
│   └── rich-text-manager.js    # Contenu enrichi
│
└── Sécurité et debugging/
    ├── crash-detector.js       # Détection d'erreurs
    ├── emergency-mode.js       # Mode de secours
    ├── debug-utils.js          # Outils de diagnostic
    └── menu-fallback.js        # Menu de secours
```

## 🔧 Modules principaux

### VVPlaceApp
**Contrôleur central** orchestrant l'initialisation séquentielle :
1. Reset de scroll d'urgence
2. OrientationManager (priorité 1)
3. SmoothScrollManager (base)
4. SwiperManager (indépendant)
5. SliderManager (si éléments présents)
6. LoaderManager (après slider)
7. MenuManager (navigation)
8. ModalManager (si éléments présents)
9. RichTextManager (contenu)

### OrientationManager
**Gestionnaire centralisé** évitant les conflits :
- Système d'abonnement avec priorités
- Debounce adaptatif intelligent
- Détection de changements rapides
- Coordination des mises à jour

### LoaderManager  
**Animations de chargement** sophistiquées :
- Mode horizontal : stacking d'images + translation
- Mode vertical : fade simple
- Reset robuste du scroll
- Logo interactif pour replay

### SmoothScrollManager
**Scroll fluide** avec Lenis :
- Orientation dynamique (horizontal/vertical)
- Instances multiples pour menus
- Synchronisation GSAP
- Watchdog de position

### MenuManager
**Navigation CMS** avancée :
- Chargement incrémental Finsweet
- Historique avec logique ancestrale
- États actifs (breadcrumb, courant)
- Navigation directe par liens

## 📱 Configuration responsive

### Breakpoints
```javascript
const BREAKPOINTS = {
    mobile: 480,
    mobileLandscape: 768,
    tablet: 992,           // Seuil desktop
    desktop: 1200,
    largeDesktop: 1440
}
```

### Comportements adaptatifs
- **< 992px** : Mode vertical (scroll vertical, fade simple)
- **≥ 992px** : Mode horizontal (scroll horizontal, stacking)

### Utilitaires
```javascript
WindowUtils.isDesktop()      // ≥ 992px
WindowUtils.isMobile()       // < 992px
WindowUtils.getCurrentBreakpoint()
WindowUtils.onBreakpointChange(callback)
```

## 📝 Système de logging

### Configuration automatique
```javascript
// Mode production détecté automatiquement
logger.isProduction = (
  window.VV_PRODUCTION === true ||
  hostname !== 'vv-homes-beta.webflow.io' ||
  !url.includes('debug=1')
)
```

### Catégories spécialisées
```javascript
logger.orientation('🧭 Changement détecté')
logger.menu('🍔 Panel ouvert')
logger.scroll('📜 Position mise à jour')
logger.slider('🎚️ Slide actif')
logger.loading('⏳ Animation en cours')
logger.emergency('🚨 Problème détecté')
```

## 🛡️ Gestion des erreurs

### Système multi-niveaux
1. **CrashDetector** : Surveillance automatique
2. **EmergencyMode** : Mode de secours
3. **MenuFallback** : Navigation de secours
4. **Vérifications préventives** : Éléments DOM requis

### Outils de diagnostic
```javascript
// Console développeur
window.app                    // Instance principale
window.debugVV.checkCriticalIssues()
window.crashDetector.generateCrashReport()
window.orientationTester.runStressTest()
```

## ⚡ Optimisations

### Performance
- **Debounce adaptatif** : Délais variables selon contexte
- **Chargement incrémental** : CMS par petits lots
- **Reset watchdog** : Surveillance ciblée 3 secondes
- **Initialisation conditionnelle** : Modules selon besoins

### Robustesse
- **Triple reset scroll** : Window + Lenis + containers
- **Gestion d'erreur** : Try/catch + fallbacks
- **États de synchronisation** : Évite les boucles infinies
- **Détection production** : Logs filtrés automatiquement

### UX
- **Animations fluides** : 60fps garantis via GSAP ticker
- **Transitions coordonnées** : OrientationManager centralisé
- **Navigation intuitive** : Breadcrumb + historique
- **Indicateurs visuels** : Progression slider + états actifs

## 🔨 Développement

### Mode debug
```javascript
// URL avec debug
https://vv-homes-beta.webflow.io/?debug=1

// Outils disponibles
window.logger.setProductionMode(false)
window.app.init()                    // Réinitialiser
window.debugVV.logFullDiagnostic()   // État complet
```

### Variables utiles
```javascript
// Configuration
CONFIG.ANIMATION.DURATION         // 0.4s par défaut
CONFIG.SELECTORS.SLIDER_ITEM      // '.slider-panel_item'
CONFIG.SELECTORS.MENU_WRAP        // '.menu_wrap'

// État orientation
window.orientationManager?.currentOrientation
window.orientationManager?.subscribers

// Navigation
window.app.menuManager?.navigationHistory
window.app.menuManager?.getNavigationState()
```

### Tests recommandés
1. **Resize rapide** : Détecter boucles infinies
2. **Reload page** : Vérifier reset scroll
3. **Navigation deep-linking** : Tester data-menu-link
4. **Changements orientation** : Mobile ↔ Desktop
5. **Loader replay** : Clic logo menu

---

## 📄 Licence

Projet développé pour **Villes Vivantes** - Tous droits réservés.

## 🤝 Contact

Pour toute question technique concernant cette interface :
- **Repository** : VV-Homes-Beta
- **Owner** : Vaaaaal  
- **Branch** : main

---

*Interface développée avec ❤️ pour présenter les innovations urbaines de Villes Vivantes*
