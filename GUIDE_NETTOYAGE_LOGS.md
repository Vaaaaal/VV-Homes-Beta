# Guide de nettoyage des logs pour la production

## 🎯 Objectif

Nettoyer tous les `console.log`, `console.warn` et `console.error` de votre code pour la production en les remplaçant par un système de logging centralisé et configurable.

## 🚀 Utilisation rapide

### 1. Exécuter le script de nettoyage automatique

```bash
node cleanup-console.js
```

Ce script va :
- ✅ Remplacer tous les `console.*` par des appels au `logger`
- ✅ Ajouter automatiquement `import logger from './logger.js'` dans chaque fichier
- ✅ Préserver les emojis et catégoriser intelligemment les logs

### 2. Activer le mode production

**Option A : Variable globale (recommandé)**
```javascript
// En haut de votre script.js ou dans une balise script
window.VV_PRODUCTION = true;
```

**Option B : API du logger**
```javascript
logger.setProductionMode(true);
```

**Option C : Inclure le fichier de configuration**
```html
<script src="production-config.js"></script>
```

## 📊 Types de logs et leur comportement

### En développement (tous les logs affichés)
- `logger.log()` - Logs généraux 📝
- `logger.info()` - Informations ℹ️
- `logger.debug()` - Debug 🔍
- `logger.success()` - Succès ✅
- `logger.loading()` - Chargement ⏳
- `logger.orientation()` - Orientation 🧭
- `logger.menu()` - Menu 🍔
- `logger.scroll()` - Scroll 📜
- `logger.slider()` - Slider 🎚️
- `logger.modal()` - Modal 🪟
- `logger.animation()` - Animation 🎭

### En production (seuls les logs critiques)
- `logger.warn()` - Avertissements ⚠️
- `logger.error()` - Erreurs ❌
- `logger.emergency()` - Urgences 🚨

## 🔧 Configuration avancée

### Personnaliser les niveaux autorisés en production

```javascript
// Modifier logger.js ligne ~15
this.productionLevels = ['error', 'warn', 'emergency'];
```

### Détecter automatiquement la production

Le logger détecte automatiquement la production selon :
- `window.VV_PRODUCTION === true`
- `hostname !== 'localhost'`
- Absence de `?debug=1` dans l'URL

### Forcer le mode développement

```javascript
// Même en production, afficher tous les logs
logger.setProductionMode(false);
```

## 📝 Exemples de transformation

### Avant
```javascript
console.log('🚀 VVPlaceApp - Début de l\'initialisation');
console.warn('⚠️ OrientationManager non disponible');
console.error('❌ Erreur lors de l\'initialisation:', error);
```

### Après
```javascript
import logger from './logger.js';

logger.loading('VVPlaceApp - Début de l\'initialisation');
logger.warn('OrientationManager non disponible');
logger.error('Erreur lors de l\'initialisation:', error);
```

## 🛠️ Debugging

### Vérifier l'état du logger
```javascript
console.log(logger.getStatus());
// { isProduction: true, allowedLevels: ['error', 'warn'] }
```

### Activer temporairement tous les logs
```javascript
// Dans la console du navigateur
logger.setProductionMode(false);
```

### Logs de démarrage
```javascript
// Ajouter ?debug=1 à l'URL pour forcer le mode développement
// Exemple: https://monsite.com?debug=1
```

## 🎯 Avantages

✅ **Performance** : Pas de pollution de console en production  
✅ **Maintenance** : Centralisation de tous les logs  
✅ **Flexibilité** : Activation/désactivation facile par catégorie  
✅ **Conservation** : Logs critiques (erreurs/warnings) toujours visibles  
✅ **Développement** : Expérience de développement préservée  

## 🔄 Fichiers modifiés

Le script automatique va traiter tous les fichiers `.js` sauf :
- `cleanup-console.js` (le script lui-même)
- `logger.js` (le système de logging)
- `validation-test.js` (fichier de test)

## ⚡ Commandes utiles

```javascript
// Status du logger
logger.getStatus()

// Forcer le mode développement
logger.setProductionMode(false)

// Forcer le mode production  
logger.setProductionMode(true)

// Log de test pour vérifier la configuration
logger.error('Test visible en production')
logger.debug('Test visible seulement en développement')
```
