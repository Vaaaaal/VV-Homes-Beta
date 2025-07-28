# Documentation de Diagnostic - VV Place

## 🔧 Outils de diagnostic disponibles

### En console développeur

Une fois le site chargé, vous pouvez utiliser ces commandes en console :

```javascript
// Diagnostic complet
debugVV.logFullDiagnostic();

// Test de connectivité CDN
debugVV.testCDNConnectivity();

// Vérifier les éléments du menu spécifiquement
debugVV.checkMenuElements();

// Vérifier Finsweet
debugVV.checkFinsweetElements();
```

## 📊 Logs d'initialisation

L'application produit maintenant des logs détaillés :

- 🚀 Début d'initialisation
- 📜 Smooth Scroll Manager
- 🎠 Swiper Manager  
- 🎚️ Slider Manager
- 🍔 Menu Manager (avec détails)
- 🪟 Modal Manager
- 📝 Rich Text Manager

## 🔄 Menu Fallback

Si le MenuManager principal échoue, un menu de fallback s'active automatiquement avec :
- Ouverture/fermeture de base
- Gestion des overlays
- Support clavier (Échap)
- Animations CSS de base

## 🎯 Points de surveillance

### Éléments CMS
- `.menu_panel_collection_item.is-btn` (boutons CMS)
- Conteneurs Finsweet `[fs-cmsload-element="list"]`

### Scripts externes
- GSAP (animations)
- Finsweet Attributes (CMS)
- Webflow (plateforme)

### Timeouts configurés
- Finsweet Attributes : 10 secondes
- Éléments CMS : 15 tentatives × 300ms = 4.5 secondes
- Surveillance DOM : 30 secondes

## 🚨 Signaux d'alarme

Ces messages indiquent des problèmes :

- `❌ MenuManager - Éléments essentiels manquants`
- `⚠️ Timeout - Finsweet Attributes n'a pas répondu`
- `❌ Impossible de charger les boutons CMS`
- `🔄 Initialisation du menu de fallback`

## 📱 Actions recommandées

### Si le menu ne fonctionne pas :

1. **Ouvrir la console développeur** (F12)
2. **Rechercher les logs d'erreur** (❌ rouge)
3. **Exécuter le diagnostic** : `debugVV.logFullDiagnostic()`
4. **Vérifier la connectivité** : `debugVV.testCDNConnectivity()`

### Solutions rapides :

- **Rechargement de page** (peut résoudre les race conditions)
- **Vider le cache** (Ctrl+F5)
- **Tester sur un autre navigateur**
- **Vérifier la connexion réseau**

## 🔍 Debugging avancé

### Surveiller les changements DOM en temps réel :
```javascript
// La surveillance est automatique pendant 30s au chargement
// Pour la relancer manuellement :
debugVV.watchDOMChanges();
```

### Vérifier l'état du MenuManager :
```javascript
// Si l'app est dans window.app
app.menuManager?.getNavigationState();
```

## 📞 Informations pour le support

Quand vous contactez le support, incluez :

1. **URL de la page problématique**
2. **Navigateur et version**
3. **Messages d'erreur de la console**
4. **Résultat de** `debugVV.logFullDiagnostic()`
5. **Étapes pour reproduire le problème**

## 🔗 URLs importantes

- **Production** : https://vv-homes-beta.webflow.io
- **Script principal** : https://cdn.jsdelivr.net/gh/Vaaaaal/VV-Homes-Beta@main/script.js
- **Repository** : https://github.com/Vaaaaal/VV-Homes-Beta
