#!/usr/bin/env node
/**
 * Character-scale armor/equipment compendium SSOT.
 *
 * Edit ONLY data/canonical/{armor,equipment}.json.
 * Generate BOTH aggregate and subtype .db packs from those JSON records.
 * The store loads the subtype packs; chargen and other consumers load aggregates.
 * --check fails if any production pack diverges from the canonical JSON.
 * Weapons remain owned by tools/build-weapon-production.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const FAMILIES = Object.freeze({
  armor: ['armor-light', 'armor-medium', 'armor-heavy', 'armor-shields'],
  equipment: ['equipment-comlinks', 'equipment-medical', 'equipment-other', 'equipment-security', 'equipment-survival', 'equipment-tech', 'equipment-tools']
});

export function buildFamily(family, corpus) {
  const packs = FAMILIES[family];
  if (!packs || corpus?.schema !== 'swse.canonical-item-compendium/1' || corpus.family !== family) {
    throw new Error('Incorrect canonical item corpus family/schema: ' + family);
  }
  if (JSON.stringify(corpus.subtypePacks) !== JSON.stringify(packs)) {
    throw new Error('Subtype pack membership manifest changed for ' + family);
  }
  if (!Array.isArray(corpus.records) || !corpus.records.length) {
    throw new Error('Empty canonical item corpus: ' + family);
  }

  const seen = new Set(), grouped = Object.fromEntries(packs.map(pack => [pack, []]));
  const aggregate = [];
  for (const {pack, document} of corpus.records) {
    if (!Object.hasOwn(grouped, pack)) throw new Error('Unknown ' + family + ' pack: ' + pack);
    if (!document || document.type !== family || typeof document._id !== 'string' || !document._id) {
      throw new Error('Invalid canonical ' + family + ' Item');
    }
    if (seen.has(document._id)) throw new Error('Duplicate ' + family + ' id ' + document._id);
    seen.add(document._id);
    if (!document.system || typeof document.system !== 'object' || Array.isArray(document.system)) {
      throw new Error('Missing Item.system ' + document._id);
    }
    // Cost is the actual published/proven source field. Do not invent a price
    // and do not let generated subtype packs diverge from the aggregate.
    const a = document.system.cost;
    const b = document.system.costNumeric;
    if (a !== undefined && b !== undefined && a !== b) {
      throw new Error('Conflicting Item prices: ' + document._id);
    }
    aggregate.push(document);
    grouped[pack].push(document);
  }
  const encode = list => list.map(d => JSON.stringify(d)).join('\n') + '\n';
  const files = {[`packs/${family}.db`]: encode(aggregate)};
  for (const pack of packs) files[`packs/${pack}.db`] = encode(grouped[pack]);
  return files;
}

export function buildItemProduction(root = ROOT) {
  const files = {};
  for (const family of Object.keys(FAMILIES)) {
    const corpus = JSON.parse(fs.readFileSync(path.join(root, 'data/canonical', family + '.json'), 'utf8'));
    Object.assign(files, buildFamily(family, corpus));
  }
  return files;
}

const direct = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct) {
  const expected = buildItemProduction();
  const check = process.argv.includes('--check');
  for (const [name, content] of Object.entries(expected)) {
    const target = path.join(ROOT, name);
    if (check) {
      if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== content) {
        console.error('STALE GENERATED ITEM PACK: ' + name);
        process.exitCode = 1;
      }
    } else {
      fs.writeFileSync(target, content);
    }
  }
  if (!process.exitCode) console.log((check ? 'Verified' : 'Generated') + ' ' + Object.keys(expected).length + ' canonical armor/equipment packs');
}
