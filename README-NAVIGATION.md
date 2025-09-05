# Navigation Internes du Menu

Ce document complète le README principal et décrit la nouvelle architecture de navigation après refactor.

## Objectifs du Refactor
- Externaliser la gestion d'historique (NavigationState)
- Externaliser les états actifs + breadcrumb (NavigationActiveState)
- Réduire la taille de `menu-manager.js`
- Clarifier le cycle d'ouverture / fermeture
- Faciliter l'ajout futur de tests unitaires

## Modules

### NavigationState (`navigation-state.js`)
Responsable uniquement de la pile historique des panels ouverts.
Fonctions clés:
- `push(name)` ajoute si absent et coupe les divergences
- `current()` renvoie le panel courant
- `clear()` reset total
- `snapshot()` lecture immuable
- `includes(name)` / `trimTo(index)` / `removeFrom(name)`

### NavigationActiveState (`navigation-active-state.js`)
Gère les classes DOM reflétant l'état visuel (actifs, courant, breadcrumb).
Entrées : fonction `findButtonByPanelName` injectée par `MenuManager`.
Données internes:
- `currentActivePath` (chemin séquentiel des panels ouverts)
- `activeElements` (Set pour O(1) sur `isActive`)
Méthodes :
- `onOpen(name)` / `onClose(name)`
- `refreshStates()` applique toutes les classes
- `clearAll()` nettoyage global
- `current()` panel courant (synchro avec `currentActivePath`)

### MenuManager (extraits pertinents)
- Historique logique : `navigationState`
- États visuels : `activeState`
- Helpers panels : `getPanel`, `closePanels`, `animatePanelsSequentially`
- Routage : `handleSiblingLogic`, `closeSiblingsAndOpenNew`, `navigateToNewPanel`
- Fermeture globale : `closeMenu(true|false)` + `closeMenuFinal`

## Flux d'Ouverture d'un Panel
1. `navigateToNewPanel(panelName)`
2. `navigationState.push(panelName)`
3. `showPanel(panelName)` (animation GSAP)
4. `activeState.onOpen(panelName)` → met à jour chemin + rafraîchit classes
5. `updateExitAllButtonsVisibility()`

## Flux de Fermeture Partielle
`closePanel(panelName)` :
1. Cherche l'index dans `navigationState.history`
2. Coupe history après cet index
3. `activeState.onClose(panelName)`
4. `closePanels([...])` animations séquentielles
5. `updateExitAllButtonsVisibility()`

## Flux de Navigation via Ancêtres
`openAncestorPath(path)` :
- Ferme panels divergents: `closeNonMatchingPanels(newPath)`
- Ouvre chaque panel manquant (push + show + activeState.onOpen)

## Breadcrumb
Géré implicitement par `NavigationActiveState.refreshStates()` :
- Tous les éléments sauf le dernier du chemin reçoivent `is-breadcrumb`
- Le dernier reçoit `is-current` (panel) et `is-active` (bouton + panel)

## Sortie "Exit All"
`updateExitAllButtonsVisibility()` masque tous les boutons puis n'affiche que celui du dernier panel (`navigationState.current()`).

## Tests Unitaires (suggestions futures)
- `NavigationState` : push idempotent, trim divergence, clear
- `NavigationActiveState` : onOpen chainé, onClose partiel, refresh idempotent
- Simulation DOM légère avec jsdom pour vérifier classes.

## Points Restants Potentiels
- Externationaliser la logique d'observation incrémentale
- Paramétrer la durée des animations via options MenuManager
- Ajouter un hook évènementiel (beforeOpen, afterClose, etc.)

## Migration
Anciennes méthodes remplacées :
- `updateActiveStatesOnOpen/Close` → `activeState.onOpen/onClose`
- `clearAllActiveStates` → `activeState.clearAll`
- `navigationHistory` → `navigationState.history` (accès lecture via `snapshot()` recommandé)

## Sécurité & Robustesse
- Aucune mutation directe des classes en dehors de `NavigationActiveState` (centralisation)
- Historique isolé évite états incohérents (plus de mélange logique/visuel)
- Facilite instrumentation (logs ciblés dans chaque couche)

---
Pour toute extension, maintenir la séparation : logique (NavigationState), présentation (NavigationActiveState), orchestration (MenuManager).
