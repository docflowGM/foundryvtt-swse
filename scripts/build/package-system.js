#!/usr/bin/env node
/**
 * Package SWSE System for Distribution
 * Creates a properly-structured ZIP file with system files at root level
 * Prevents double-nesting issues when distributing the system
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const systemJson = JSON.parse(fs.readFileSync('./system.json', 'utf8'));
const version = systemJson.version;
const systemId = systemJson.id;

const outputFileName = `${systemId}-${version}.zip`;

console.log(`📦 Packaging ${systemId} v${version}...`);

// Files and directories to include
const filesToInclude = [
  'system.json',
  'template.json',
  'templates/',
  'scripts/',
  'helpers/',
  'styles/',
  'assets/',
  'lang/',
  'index.js',
  'LICENSE',
  // Modification V2 runtime artifacts read by the workbench install service (exact files only; their SHA-256 is pinned in
  // scripts/engine/customization/modification-v2-runtime/modification-data-pins.js and checked by CI). Research data under data/audits is not shipped.
  'data/modifications/runtime-definitions-v1.5.json',
  'data/modifications/specification-records-v1.json'
];

try {
  // Remove existing zip if present
  if (fs.existsSync(outputFileName)) {
    fs.unlinkSync(outputFileName);
    console.log(`  🗑️  Removed old package: ${outputFileName}`);
  }

  // Create ZIP with files at root level (no wrapper folder)
  const command = `zip -r "${outputFileName}" ${filesToInclude.join(' ')} -x "*.git*" "node_modules/*" "*.bak" ".DS_Store" "__MACOSX/*"`;

  console.log(`  Running: zip -r ${outputFileName} [files...]`);
  execSync(command, { stdio: 'inherit' });

  const stats = fs.statSync(outputFileName);
  const sizeKB = (stats.size / 1024).toFixed(2);

  console.log(`\n✅ Package created successfully!`);
  console.log(`📄 File: ${outputFileName}`);
  console.log(`📊 Size: ${sizeKB} KB`);
  console.log(`\n📋 Installation:`);
  console.log(`1. In Foundry VTT, go to Setup > System & Modules`);
  console.log(`2. Click "Install System"`);
  console.log(`3. Upload or paste URL to ${outputFileName}`);
  console.log(`\n✨ Distribution ready!`);
} catch (err) {
  console.error('❌ Error creating package:', err.message);
  console.error('\n⚠️  Make sure you have the "zip" command installed (usually pre-installed on Linux/Mac)');
  process.exit(1);
}
