# Configuration Webflow — Système de navigation par fetch

Ce document décrit la configuration à faire dans Webflow pour que le système de navigation sans Finsweet fonctionne correctement.

---

## 1. Supprimer Finsweet

Retirer **tous** les scripts et attributs Finsweet du projet :

- Supprimer le script `cdn.finsweet.com/...` dans les paramètres du projet (Head code ou Before `</body>`)
- Retirer tous les attributs `fs-*` des éléments Webflow (`fs-cmsload-element`, `fs-list-nest-*`, etc.)

---

## 2. Page Home — Structure du menu

### 2a. Boutons Dossiers (premier panel)

La **Collection List des Dossiers** dans le premier panel doit avoir chaque item configuré comme suit :

**Classe obligatoire :**
```
menu_panel_collection_item is-btn
```

**Attribut personnalisé à ajouter sur chaque bouton :**

| Attribut | Valeur | Comment configurer dans Webflow |
|---|---|---|
| `data-name` | slug du Dossier | Lier au champ **Slug** de la collection |

> **Pas de `data-fetch-url`** — l'URL est construite automatiquement par le JS à partir du slug : `/dossiers/[slug]`. Si le chemin de tes pages Dossier est différent (ex. `/projets/[slug]`), il suffit de changer `FETCH_BASE_PATH` dans `config.js`.

**Comment lier `data-name` au slug dans Webflow :**
1. Sélectionner le bouton dans le Designer
2. Ouvrir l'onglet **Element Settings** (engrenage)
3. Dans **Custom Attributes**, ajouter un attribut `data-name`
4. Cliquer sur la valeur → **Add a field** → choisir le champ **Slug** de la collection

**Exemple de résultat HTML attendu :**
```html
<div class="menu_panel_collection_item is-btn" data-name="urbanisme">
  Urbanisme
</div>
```

---

### 2b. Panels Dossiers (structure statique vide)

Pour chaque Dossier top-level, il faut un **panel vide** dans le menu — rendu nativement par Webflow via une Collection List ou des éléments statiques.

**Structure HTML attendue :**
```html
<div class="menu_panel_item" data-name="urbanisme">
  <div class="menu_panel_item_middle">
    <!-- vide — tout le contenu est injecté par fetch -->
  </div>
</div>
```

**Attribut à configurer sur le wrapper `.menu_panel_item` :**

| Attribut | Valeur | Comment configurer dans Webflow |
|---|---|---|
| `data-name` | slug du Dossier | Lier au champ **Slug** de la collection (même valeur que le bouton) |

> `.menu_panel_item_middle` est à la fois le container scrollable et le slot d'injection. Il doit être **vide** au chargement — tout le contenu (sous-dossiers + contenu direct) arrive via le fetch.

---

### 2c. Panels à supprimer

Les panels suivants n'ont plus lieu d'être — supprimer ces éléments du DOM Webflow :

- Panel Articles
- Panel Presse
- Panel Preview
- Panel Wall of Love
- Panel Emplois
- Panel Adresses

Ce contenu sera désormais **rendu directement dans le panel du Dossier parent** via le fetch.

---

## 3. Page template Dossier

C'est la page Webflow de type **template Collection** pour les Dossiers (`/dossiers/[slug]`).

### 3a. Container `[data-panel-target]`

**Tout** le contenu du Dossier — sous-dossiers ET contenu direct — doit être **enveloppé dans un unique container** portant l'attribut :

| Attribut | Valeur |
|---|---|
| `data-panel-target` | *(présent, sans valeur)* |

Le JS récupère `innerHTML` de ce container et l'injecte dans `.menu_panel_item_middle` du panel correspondant.

**Comment ajouter `data-panel-target` dans Webflow :**
1. Sélectionner le div container dans le Designer
2. Ouvrir l'onglet **Element Settings** (engrenage)
3. Dans **Custom Attributes**, ajouter `data-panel-target` avec une valeur vide (ou `true` — la valeur n'est pas lue par le JS)

---

### 3b. Sous-Dossiers dans `[data-panel-target]`

Les boutons sous-Dossiers sont une **Collection List** dans `[data-panel-target]`, liée via le champ multi-ref du Dossier parent.

**Classe :**
```
menu_panel_collection_item is-btn
```

**Attribut :**

| Attribut | Valeur | Comment configurer dans Webflow |
|---|---|---|
| `data-name` | slug du sous-Dossier | Lier au champ **Slug** de la collection liée |

> **Pas de `data-parent`** — le JS définit automatiquement la relation parent/enfant au moment où il injecte le contenu dans un panel. Il n'y a rien à configurer dans Webflow pour la navigation retour.

**Exemple de résultat HTML attendu :**
```html
<div data-panel-target>

  <!-- Collection List sous-Dossiers (via multi-ref) -->
  <div class="menu_panel_collection_item is-btn" data-name="quartiers">Quartiers</div>
  <div class="menu_panel_collection_item is-btn" data-name="espaces-verts">Espaces verts</div>

  <!-- Contenu direct -->
  <div class="article-card">...</div>
  <div class="presse-card">...</div>

</div>
```

---

### 3c. Contenu direct (Articles, Presse, etc.)

Le contenu non-Dossier (Articles, Presse, Preview, Wall of Love, Emplois, Adresses) est rendu **directement dans `[data-panel-target]`** via les Collection Lists natives de Webflow. Aucune classe ou attribut spécifique n'est requis — le HTML est injecté tel quel dans le panel.

---

## 4. Récapitulatif des attributs

| Attribut | Où | Valeur | Comment configurer |
|---|---|---|---|
| `data-name` | Bouton Dossier (`.is-btn`) dans Home | slug | Lier au champ **Slug** CMS |
| `data-name` | Panel `.menu_panel_item` dans Home | slug | Lier au champ **Slug** CMS |
| `data-name` | Bouton sous-Dossier dans page template | slug | Lier au champ **Slug** CMS de la collection liée |
| `data-panel-target` | Container dans page template Dossier | *(vide)* | Attribut statique |

> **À ne plus configurer :** `data-fetch-url`, `data-parent`, et la Collection List de sous-dossiers dans les panels statiques de la Home — tout vient du fetch.

---

## 5. Changer le chemin de base des Dossiers

Si tes pages Dossier ne sont pas sous `/dossiers/[slug]`, modifier la valeur dans `config.js` :

```js
FETCH_BASE_PATH: '/dossiers',  // ← changer ici si nécessaire
```

---

## 6. Flux complet (vérification)

1. **Page chargée** → JS lit tous les `.menu_panel_collection_item.is-btn` présents dans le DOM (boutons top-level uniquement)
2. **Clic sur "Urbanisme"** → `showPanel("urbanisme")` → panel `.menu_panel_item[data-name="urbanisme"]` s'anime
3. **Fetch** → `/dossiers/urbanisme` est fetchée → `[data-panel-target]` extrait → injecté dans `.menu_panel_item_middle`
4. **Boutons sous-Dossiers + contenu injectés** → JS attache automatiquement les events + définit `data-parent="urbanisme"` sur chaque bouton `.is-btn`
5. **Clic sur "Quartiers"** → panel dynamique créé + fetch `/dossiers/quartiers` → idem récursivement
6. **Fermeture du menu** → panels dynamiques supprimés, cache fetch conservé

---

## 7. Ce que le JS gère automatiquement

- Construction des URLs de fetch (`/dossiers/[slug]`) — aucun attribut `data-fetch-url` nécessaire
- Relation parent/enfant (`data-parent`) — définie au moment de l'injection, pas besoin de la configurer dans Webflow
- Création des panels dynamiques pour les sous-Dossiers
- Cache des fetches (re-visiter un Dossier ne re-fetche pas)
- Attachment des events sur les boutons injectés
- Suppression des panels dynamiques à la fermeture du menu
