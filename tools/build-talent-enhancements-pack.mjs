#!/usr/bin/env node

/**
 * build-talent-enhancements-pack.mjs — generate packs/talent-enhancements.db
 * from data/talent-enhancements.json.
 *
 * system.json declares a `talent-enhancements` Item compendium and
 * CombatActionsMapper.init() loads it at runtime, but the pack shipped as a
 * zero-byte file while the actual data sat in data/talent-enhancements.json.
 * Unlike the sibling combat-actions / extraskilluses loads, that one had no
 * JSON fallback, so every enhancement silently disappeared.
 *
 * data/talent-enhancements.json is the authority; this script only reshapes it
 * into the documents CombatActionsMapper._indexEnhancements() reads
 * (system.actionKey, name, system.requiredTalent, system.effect). It invents no
 * enhancement, talent, or effect.
 *
 * Document ids are deterministic: sha1("swse.talent-enhancement.<actionKey>.
 * <name>") truncated to Foundry's 16-hex id shape, so regeneration is stable.
 *
 *   node tools/build-talent-enhancements-pack.mjs           # write the pack
 *   node tools/build-talent-enhancements-pack.mjs --check   # fail if stale
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('..', import.meta.url);
const SOURCE = fileURLToPath(new URL('data/talent-enhancements.json', ROOT));
const PACK = fileURLToPath(new URL('packs/talent-enhancements.db', ROOT));

const slug = (value) =>
  String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const stableId = (actionKey, name) =>
  createHash('sha1')
    .update(`swse.talent-enhancement.${slug(actionKey)}.${slug(name)}`)
    .digest('hex')
    .slice(0, 16);

export function buildEnhancementDocuments(source = JSON.parse(readFileSync(SOURCE, 'utf8'))) {
  const documents = [];

  for (const [actionKey, group] of Object.entries(source)) {
    for (const enhancement of group.enhancements ?? []) {
      documents.push({
        _id: stableId(actionKey, enhancement.name),
        name: enhancement.name,
        type: 'combat-action',
        img: 'icons/svg/upgrade.svg',
        system: {
          key: `${slug(actionKey)}-${slug(enhancement.name)}`,
          actionKey,
          baseAction: group.baseAction ?? '',
          actionFilter: group.actionFilter ?? null,
          requiredTalent: enhancement.requiredTalent ?? '',
          talentTree: enhancement.talentTree ?? '',
          prerequisites: enhancement.prerequisites ?? '',
          description: enhancement.description ?? '',
          trigger: enhancement.trigger ?? '',
          effect: enhancement.effect ?? {},
          notes: enhancement.notes ?? '',
          optional: enhancement.optional ?? false,
          mutuallyExclusive: enhancement.mutuallyExclusive ?? [],
        },
        effects: [],
        folder: null,
        sort: 0,
        ownership: { default: 0 },
        flags: {},
      });
    }
  }

  return documents.sort((a, b) => a._id.localeCompare(b._id));
}

export function renderPack() {
  return buildEnhancementDocuments().map((doc) => JSON.stringify(doc)).join('\n') + '\n';
}

function main() {
  const next = renderPack();
  const count = next.trim().split('\n').length;
  const check = process.argv.includes('--check');
  let current = '';
  try {
    current = readFileSync(PACK, 'utf8');
  } catch (_err) {
    current = '';
  }

  if (check) {
    if (current === next) {
      console.log(`packs/talent-enhancements.db is up to date (${count} enhancements).`);
      process.exit(0);
    }
    console.error('packs/talent-enhancements.db is stale — run: node tools/build-talent-enhancements-pack.mjs');
    process.exit(1);
  }

  writeFileSync(PACK, next);
  console.log(`Wrote packs/talent-enhancements.db (${count} enhancements).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
