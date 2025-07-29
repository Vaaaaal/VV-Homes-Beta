#!/usr/bin/env node

// ==========================================
// SCRIPT DE NETTOYAGE DES CONSOLE.LOG
// ==========================================

const fs = require('fs');
const path = require('path');

// Configuration du script
const CONFIG = {
  // Répertoire de travail
  workingDir: __dirname,
  
  // Extensions de fichiers à traiter
  extensions: ['.js'],
  
  // Fichiers à ignorer
  ignoredFiles: [
    'cleanup-console.js',
    'logger.js',
    'validation-test.js', // Fichier de test
  ],
  
  // Patterns de remplacement
  replacements: [
    // console.log avec emojis -> logger avec catégorie appropriée
    { 
      pattern: /console\.log\s*\(\s*['"`]🚀([^'"`]+)['"`]([^)]*)\)/g, 
      replacement: "logger.loading('$1'$2)" 
    },
    { 
      pattern: /console\.log\s*\(\s*['"`]✅([^'"`]+)['"`]([^)]*)\)/g, 
      replacement: "logger.success('$1'$2)" 
    },
    { 
      pattern: /console\.log\s*\(\s*['"`]🧭([^'"`]+)['"`]([^)]*)\)/g, 
      replacement: "logger.orientation('$1'$2)" 
    },
    { 
      pattern: /console\.log\s*\(\s*['"`]📜([^'"`]+)['"`]([^)]*)\)/g, 
      replacement: "logger.scroll('$1'$2)" 
    },
    { 
      pattern: /console\.log\s*\(\s*['"`]🎚️([^'"`]+)['"`]([^)]*)\)/g, 
      replacement: "logger.slider('$1'$2)" 
    },
    { 
      pattern: /console\.log\s*\(\s*['"`]🍔([^'"`]+)['"`]([^)]*)\)/g, 
      replacement: "logger.menu('$1'$2)" 
    },
    { 
      pattern: /console\.log\s*\(\s*['"`]🪟([^'"`]+)['"`]([^)]*)\)/g, 
      replacement: "logger.modal('$1'$2)" 
    },
    { 
      pattern: /console\.log\s*\(\s*['"`]🎭([^'"`]+)['"`]([^)]*)\)/g, 
      replacement: "logger.animation('$1'$2)" 
    },
    { 
      pattern: /console\.log\s*\(\s*['"`]🔄([^'"`]+)['"`]([^)]*)\)/g, 
      replacement: "logger.info('$1'$2)" 
    },
    { 
      pattern: /console\.log\s*\(\s*['"`]⏭️([^'"`]+)['"`]([^)]*)\)/g, 
      replacement: "logger.debug('$1'$2)" 
    },
    { 
      pattern: /console\.log\s*\(\s*['"`]🧹([^'"`]+)['"`]([^)]*)\)/g, 
      replacement: "logger.debug('$1'$2)" 
    },
    { 
      pattern: /console\.log\s*\(\s*['"`]📝([^'"`]+)['"`]([^)]*)\)/g, 
      replacement: "logger.debug('$1'$2)" 
    },
    { 
      pattern: /console\.log\s*\(\s*['"`]🎠([^'"`]+)['"`]([^)]*)\)/g, 
      replacement: "logger.debug('$1'$2)" 
    },
    { 
      pattern: /console\.log\s*\(\s*['"`]🎉([^'"`]+)['"`]([^)]*)\)/g, 
      replacement: "logger.success('$1'$2)" 
    },
    
    // console.warn avec emojis
    { 
      pattern: /console\.warn\s*\(\s*['"`]⚠️([^'"`]+)['"`]([^)]*)\)/g, 
      replacement: "logger.warn('$1'$2)" 
    },
    { 
      pattern: /console\.warn\s*\(\s*['"`]🚨([^'"`]+)['"`]([^)]*)\)/g, 
      replacement: "logger.emergency('$1'$2)" 
    },
    { 
      pattern: /console\.warn\s*\(\s*['"`]📖([^'"`]+)['"`]([^)]*)\)/g, 
      replacement: "logger.emergency('$1'$2)" 
    },
    
    // console.error avec emojis
    { 
      pattern: /console\.error\s*\(\s*['"`]❌([^'"`]+)['"`]([^)]*)\)/g, 
      replacement: "logger.error('$1'$2)" 
    },
    
    // console.log/warn/error génériques (sans emojis)
    { 
      pattern: /console\.log\(/g, 
      replacement: "logger.log(" 
    },
    { 
      pattern: /console\.warn\(/g, 
      replacement: "logger.warn(" 
    },
    { 
      pattern: /console\.error\(/g, 
      replacement: "logger.error(" 
    },
    { 
      pattern: /console\.info\(/g, 
      replacement: "logger.info(" 
    },
    { 
      pattern: /console\.debug\(/g, 
      replacement: "logger.debug(" 
    }
  ]
};

/**
 * Récupère tous les fichiers JavaScript du répertoire
 */
function getJavaScriptFiles(dir) {
  const files = [];
  
  function scanDirectory(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Ignorer node_modules et autres dossiers système
        if (!item.startsWith('.') && item !== 'node_modules') {
          scanDirectory(fullPath);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        const fileName = path.basename(item);
        
        if (CONFIG.extensions.includes(ext) && !CONFIG.ignoredFiles.includes(fileName)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  scanDirectory(dir);
  return files;
}

/**
 * Vérifie si un fichier contient déjà l'import du logger
 */
function hasLoggerImport(content) {
  return content.includes("import logger from './logger.js'") || 
         content.includes("import logger from './logger'");
}

/**
 * Ajoute l'import du logger en haut du fichier
 */
function addLoggerImport(content) {
  if (hasLoggerImport(content)) {
    return content;
  }
  
  // Trouver la position après les autres imports
  const lines = content.split('\n');
  let importEndIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('import ') && !line.includes('logger')) {
      importEndIndex = i + 1;
    } else if (line === '' && importEndIndex > 0) {
      // Ligne vide après les imports
      break;
    } else if (!line.startsWith('//') && !line.startsWith('/*') && line !== '' && importEndIndex > 0) {
      // Première ligne de code après les imports
      break;
    }
  }
  
  // Insérer l'import du logger
  lines.splice(importEndIndex, 0, "import logger from './logger.js';");
  
  return lines.join('\n');
}

/**
 * Applique les remplacements sur un fichier
 */
function processFile(filePath) {
  console.log(`📝 Traitement de: ${path.basename(filePath)}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let hasChanges = false;
  
  // Vérifier s'il y a des console.* à remplacer
  const hasConsole = /console\.(log|warn|error|info|debug)/.test(content);
  
  if (!hasConsole) {
    console.log(`  ⏭️  Aucun console.* trouvé`);
    return;
  }
  
  // Ajouter l'import du logger si nécessaire
  if (!hasLoggerImport(content)) {
    content = addLoggerImport(content);
    hasChanges = true;
    console.log(`  ➕ Import du logger ajouté`);
  }
  
  // Appliquer les remplacements
  let replacementCount = 0;
  
  for (const { pattern, replacement } of CONFIG.replacements) {
    const before = content;
    content = content.replace(pattern, replacement);
    
    if (content !== before) {
      hasChanges = true;
      // Compter le nombre de remplacements
      const matches = before.match(pattern);
      if (matches) {
        replacementCount += matches.length;
      }
    }
  }
  
  if (hasChanges) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ ${replacementCount} remplacements effectués`);
  } else {
    console.log(`  ℹ️  Aucun changement nécessaire`);
  }
}

/**
 * Script principal
 */
function main() {
  console.log('🧹 NETTOYAGE DES CONSOLE.LOG');
  console.log('============================');
  
  const files = getJavaScriptFiles(CONFIG.workingDir);
  
  console.log(`📁 ${files.length} fichiers JavaScript trouvés`);
  console.log('');
  
  for (const file of files) {
    processFile(file);
  }
  
  console.log('');
  console.log('✅ Nettoyage terminé !');
  console.log('');
  console.log('📋 Prochaines étapes:');
  console.log('  1. Vérifiez que le fichier logger.js est bien importé dans script.js');
  console.log('  2. Testez votre application en mode développement');
  console.log('  3. Activez le mode production avec: logger.setProductionMode(true)');
  console.log('  4. Ou définissez window.VV_PRODUCTION = true en production');
}

// Exécuter le script
main();
