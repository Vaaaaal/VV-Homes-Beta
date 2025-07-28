# 🚨 GUIDE D'URGENCE - CRASH D'ORIENTATION

## ⚡ **SOLUTION IMMÉDIATE**

Si votre site "plante" (écran noir, tentative de refresh) lors du changement d'orientation :

### 🚑 **Action immédiate :**
```javascript
// À taper dans la console AVANT de tourner le mobile :
emergencyMode.activate()
```

### 🔧 **Pour diagnostiquer le problème :**
```javascript
// Activer la surveillance avancée :
debugVV.logFullDiagnostic()
crashDetector.generateCrashReport()
```

---

## 🔍 **DIAGNOSTIC ÉTAPE PAR ÉTAPE**

### 1. **Ouvrir les DevTools sur mobile**
- Chrome mobile : Menu > Plus d'outils > Outils de développement
- Safari mobile : Réglages > Safari > Avancé > Inspecteur web

### 2. **Vérifier les erreurs AVANT changement d'orientation**
```javascript
// Vérifier l'état initial
debugVV.checkCriticalIssues()
```

### 3. **Activer la surveillance en temps réel**
```javascript
// Surveiller les crashs pendant l'orientation
crashDetector.generateCrashReport()
```

### 4. **Changer d'orientation ET observer les logs**
- Tournez doucement votre mobile
- Regardez les messages dans la console

---

## 🚨 **SIGNAUX D'ALERTE CRITIQUES**

### ❌ **Messages qui indiquent un crash imminent :**
- `🚨 RISQUE DE CRASH DÉTECTÉ: ORIENTATION_TOO_RAPID`
- `🚨 ALERTE CRITIQUE: ScrollTrigger.refresh() appelé trop souvent!`
- `⚠️ ALERTE: Trop d'event listeners resize (>3)`
- `💓 Heartbeat retardé de XXXms (possible freeze)`

### 🛡️ **Actions automatiques déclenchées :**
- `🛡️ Prévention du spam d'orientation - Désactivation temporaire`
- `🛡️ Prévention de boucle ScrollTrigger - Nettoyage forcé`
- `🛡️ Libération de mémoire...`

---

## 🚑 **MODES D'URGENCE DISPONIBLES**

### 1. **Mode d'urgence standard**
```javascript
emergencyMode.activate()
```
**Ce qu'il fait :**
- Désactive les event listeners d'orientation
- Stoppe ScrollTrigger
- Désactive les animations GSAP
- Utilise un menu simplifié

### 2. **Mode lecture seule (extrême)**
```javascript
emergencyMode.activateReadOnlyMode()
```
**Ce qu'il fait :**
- Tout du mode standard
- Désactive TOUTES les interactions
- Site complètement statique

### 3. **Désactivation ciblée**
```javascript
// Désactiver seulement l'orientation
window.orientationManager.isProcessing = true

// Désactiver seulement ScrollTrigger
ScrollTrigger.disable()

// Tuer toutes les animations
gsap.killTweensOf('*')
```

---

## 🔬 **TESTS DE SIMULATION**

### Tester la robustesse :
```javascript
// Simuler un crash d'orientation
crashDetector.simulateCrash('orientation')

// Simuler une fuite mémoire
crashDetector.simulateCrash('memory')

// Test de stress complet
orientationTester.runOrientationStressTest()
```

---

## 📊 **MÉTRIQUES À SURVEILLER**

### **Seuils critiques :**
- **Event listeners resize :** > 3 = 🚨
- **ScrollTrigger.refresh :** > 15 en 2sec = 🚨
- **Mémoire utilisée :** > 85% = 🚨
- **Freeze UI :** > 2 secondes = 🚨

### **Commandes de monitoring :**
```javascript
// État de la mémoire
console.log(performance.memory)

// Nombre de ScrollTriggers
console.log(ScrollTrigger.getAll().length)

// État du système
orientationTester.checkSystemStatus()
```

---

## 🔄 **RÉCUPÉRATION APRÈS CRASH**

### Si le site a planté :

1. **Recharger la page**
2. **Activer immédiatement le mode d'urgence :**
   ```javascript
   emergencyMode.activate()
   ```
3. **Tester doucement l'orientation**
4. **Si OK, désactiver progressivement :**
   ```javascript
   emergencyMode.deactivate()
   ```

### Si le problème persiste :
```javascript
// Mode extrême
emergencyMode.activateReadOnlyMode()
```

---

## 📱 **PROCÉDURE DE TEST SÉCURISÉE**

1. **Avant de tourner le mobile :**
   ```javascript
   emergencyMode.activate()
   ```

2. **Tourner LENTEMENT le mobile**

3. **Si ça marche, désactiver :**
   ```javascript
   emergencyMode.deactivate()
   ```

4. **Tourner à nouveau pour confirmer**

5. **Si ça plante, recommencer avec mode lecture seule**

---

## 🆘 **EN CAS D'URGENCE ABSOLUE**

Si RIEN ne fonctionne :

```javascript
// Destruction complète et reload
if (window.app) {
    window.app.destroy();
}
location.reload();
```

---

**🔄 Rappel :** Ce guide est automatiquement mis à jour avec les dernières solutions. Les outils de diagnostic sont intégrés dans votre code.
