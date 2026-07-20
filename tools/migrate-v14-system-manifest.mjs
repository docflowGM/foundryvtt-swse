#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const manifestPath = resolve(root, 'system.json');
const defaultsPath = resolve(root, 'data/document-type-defaults.json');

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const defaults = JSON.parse(await readFile(defaultsPath, 'utf8'));

const actorTypes = Object.fromEntries((defaults.Actor?.types || []).map(type => [type, {}]));
const itemTypes = Object.fromEntries((defaults.Item?.types || []).map(type => [type, {}]));

manifest.documentTypes = {
  Actor: actorTypes,
  Item: itemTypes,
};

// Normalize legacy/custom manifest keys that Foundry V14 rejects at the top level.
if (manifest.documents && typeof manifest.documents === 'object') {
  for (const [documentName, types] of Object.entries(manifest.documents)) {
    manifest.documentTypes[documentName] ??= {};
    if (Array.isArray(types)) {
      for (const type of types) manifest.documentTypes[documentName][type] ??= {};
    } else if (types && typeof types === 'object') {
      Object.assign(manifest.documentTypes[documentName], types);
    }
  }
  delete manifest.documents;
}

manifest.flags ??= {};
manifest.flags['foundryvtt-swse'] ??= {};
const swseFlags = manifest.flags['foundryvtt-swse'];

for (const key of ['schemaVersion', 'flagScopes']) {
  if (!(key in manifest)) continue;
  swseFlags[key] = manifest[key];
  delete manifest[key];
}

// Settings belong in game.settings.register(), not the package manifest. Preserve
// old metadata for migration/audit without presenting it as a manifest field.
if ('settings' in manifest) {
  swseFlags.legacySettingsManifest = manifest.settings;
  delete manifest.settings;
}

// A historical manifest placed discord at the package root. V14 accepts it on
// an author entry, so retain the value there if no author already declares one.
if ('discord' in manifest) {
  manifest.authors ??= [{}];
  const author = manifest.authors.find(entry => entry && typeof entry === 'object') || manifest.authors[0];
  author.discord ??= manifest.discord;
  delete manifest.discord;
}

if (!Object.keys(swseFlags).length) delete manifest.flags['foundryvtt-swse'];
if (!Object.keys(manifest.flags).length) delete manifest.flags;

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`Updated ${manifestPath}`);
console.log(`Actor types: ${Object.keys(actorTypes).join(', ')}`);
console.log(`Item types: ${Object.keys(itemTypes).join(', ')}`);
