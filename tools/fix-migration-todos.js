#!/usr/bin/env node

/**
 * Fix Migration TODOs
 *
 * This script removes "TODO: manual migration required" comments from the codebase
 * since ActorEngine has been updated to use atomic updates properly.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

// Patterns to match and remove
const PATTERNS_TO_REMOVE = [
  /^\/\/ TODO: manual migration required\. Original:.*\n/gm,
  /^\/\/ AUTO-CONVERT actor\.update -> ProgressionEngine \(confidence=[\d.]+\)\n/gm,
  /^\/\*\s*ORIGINAL:.*\*\/\s*\n/gm,
];

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let originalContent = content;

  // Remove TODO comments
  for (const pattern of PATTERNS_TO_REMOVE) {
    const newContent = content.replace(pattern, '');
    if (newContent !== content) {
      modified = true;
      content = newContent;
    }
  }

  // Fix the specific pattern where await is on a separate line
  content = content.replace(
    /await \/\/ AUTO-CONVERT.*\n\/\/ TODO:.*\n(globalThis\.SWSE\.ActorEngine\.updateActor)/gm,
    'await $1'
  );

  // Check if modified
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }

  return false;
}

function findJSFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules, .git, and other non-source directories
      if (!['node_modules', '.git', 'packs', 'assets', 'lang'].includes(file)) {
        findJSFiles(filePath, fileList);
      }
    } else if (file.endsWith('.js') && !file.endsWith('.bak')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function main() {
  console.log('Finding JavaScript files...');
  const jsFiles = findJSFiles(ROOT_DIR);

  console.log(`Found ${jsFiles.length} JavaScript files`);
  console.log('Fixing migration TODOs...');

  let fixedCount = 0;

  jsFiles.forEach(file => {
    if (fixFile(file)) {
      fixedCount++;
      console.log(`✓ Fixed: ${path.relative(ROOT_DIR, file)}`);
    }
  });

  console.log(`\nDone! Fixed ${fixedCount} files.`);
}

main();
