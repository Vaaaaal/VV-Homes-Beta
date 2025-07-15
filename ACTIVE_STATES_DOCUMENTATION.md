# Documentation du Système de Statuts Actifs - MenuManager

## Vue d'ensemble

Le système de statuts actifs permet de visualiser l'état de navigation actuel dans votre menu hiérarchique. Il applique automatiquement des classes CSS aux éléments pour indiquer :

- Les éléments dans le chemin de navigation actuel
- Le panel actuellement visible
- Les éléments faisant partie du fil d'Ariane (breadcrumb)

## Classes CSS Appliquées

### Sur les boutons de navigation (`.menu_panel_collection_item.is-btn`)

- **`.is-active`** : Appliquée aux boutons qui mènent vers un panel dans le chemin de navigation actuel
- **`.is-breadcrumb`** : Appliquée aux boutons qui font partie du fil d'Ariane (ancêtres du panel actuel)

### Sur les panels (`.menu_panel_item`)

- **`.is-active`** : Appliquée aux panels qui sont dans le chemin de navigation actuel
- **`.is-current`** : Appliquée uniquement au panel actuellement visible (le dernier ouvert)

## Utilisation

### Récupérer l'état de navigation

```javascript
const navigationState = menuManager.getNavigationState();
console.log(navigationState);
// Retourne :
// {
//   navigationHistory: ["panel1", "panel2", "panel3"],
//   currentActivePath: ["panel1", "panel2", "panel3"],
//   activeElements: ["panel1", "panel2", "panel3"],
//   currentPanel: "panel3",
//   isMenuOpen: true
// }
```

### Vérifier si un élément est actif

```javascript
const isActive = menuManager.isElementActive("panel2");
const isCurrent = menuManager.isCurrentPanel("panel3");
```

### Obtenir les ancêtres actifs d'un panel

```javascript
const ancestors = menuManager.getActiveAncestors("panel3");
// Retourne : ["panel1", "panel2"]
```

## Fonctionnement Automatique

Le système se met à jour automatiquement lors de :

1. **Ouverture d'un panel** : Met à jour les états actifs pour refléter le nouveau chemin
2. **Fermeture d'un panel** : Supprime les états des panels fermés
3. **Navigation directe** : Calcule et applique le chemin complet vers la destination
4. **Fermeture du menu** : Efface tous les états actifs

## Styles CSS Suggérés

Ajoutez ces styles à votre CSS pour visualiser les états :

```css
/* Bouton actif dans le chemin de navigation */
.menu_panel_collection_item.is-btn.is-active {
  background-color: rgba(0, 0, 0, 0.1);
  font-weight: 600;
}

/* Bouton dans le fil d'Ariane */
.menu_panel_collection_item.is-btn.is-breadcrumb {
  opacity: 0.7;
  font-weight: 500;
}

/* Panel actuellement visible */
.menu_panel_item.is-current {
  /* Styles spécifiques au panel actuel */
}

/* Indicateur visuel pour les éléments actifs */
.menu_panel_collection_item.is-btn.is-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background-color: #your-brand-color;
  border-radius: 0 2px 2px 0;
}

/* Transitions fluides */
.menu_panel_collection_item.is-btn {
  transition: all 0.3s ease;
  position: relative;
}

/* État combiné : actif ET breadcrumb */
.menu_panel_collection_item.is-btn.is-active.is-breadcrumb {
  background-color: rgba(0, 0, 0, 0.05);
}
```

## Exemples de Cas d'Usage

### Cas 1 : Navigation profonde
Si l'utilisateur navigue : Accueil → Produits → Électronique → Smartphones

- **Boutons actifs** : "Produits", "Électronique", "Smartphones"
- **Boutons breadcrumb** : "Produits", "Électronique"
- **Panel actuel** : "Smartphones"

### Cas 2 : Navigation latérale
Si l'utilisateur va de "Smartphones" vers "Tablettes" (même niveau)

- Les états de "Smartphones" sont supprimés
- Les états de "Tablettes" sont appliqués
- Les ancêtres communs ("Produits", "Électronique") restent actifs

### Cas 3 : Retour en arrière
Si l'utilisateur ferme le panel "Smartphones"

- Les états de "Smartphones" sont supprimés
- "Électronique" devient le panel actuel
- "Produits" reste en breadcrumb

## Personnalisation

Vous pouvez étendre le système en :

1. **Ajoutant des états personnalisés** : Modifiez les méthodes `setElementActiveState` et `setButtonActiveState`
2. **Créant des indicateurs visuels** : Utilisez `getNavigationState()` pour afficher un fil d'Ariane
3. **Ajoutant des animations** : Interceptez les changements d'état pour animer les transitions

## Debugging

Pour déboguer les états actifs, utilisez :

```javascript
// Dans la console du navigateur
console.log(menuManager.getNavigationState());

// Vérifier les classes appliquées
document.querySelectorAll('.is-active').forEach(el => console.log(el));
document.querySelectorAll('.is-breadcrumb').forEach(el => console.log(el));
document.querySelectorAll('.is-current').forEach(el => console.log(el));
```
