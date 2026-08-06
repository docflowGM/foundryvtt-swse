#!/usr/bin/env node

/**
 * build-poisons-pack.mjs — generate packs/poisons.db from the canonical
 * poison definitions.
 *
 * system.json declares a `poisons` Item compendium and template.json declares
 * a `poison` Item type whose schema matches POISON_DEFINITIONS field for field,
 * but the pack was never generated, so it shipped as a zero-byte file. The
 * definitions in scripts/engine/poison/poison-definitions.js are the authority
 * — this script only reshapes them into compendium documents. It invents no
 * poison, no rules text, and no source attribution.
 *
 * Document ids are deterministic: sha1("swse.poison.<key>") truncated to
 * Foundry's 16-hex id shape, so regenerating the pack is stable.
 *
 *   node tools/build-poisons-pack.mjs           # write packs/poisons.db
 *   node tools/build-poisons-pack.mjs --check   # fail if the pack is stale
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { POISON_DEFINITIONS } from '../scripts/engine/poison/poison-definitions.js';

const ROOT = new URL('..', import.meta.url);
const PACK = fileURLToPath(new URL('packs/poisons.db', ROOT));

const stableId = (key) => createHash('sha1').update(`swse.poison.${key}`).digest('hex').slice(0, 16);

/** Reshape one definition into a `poison` Item document. */
function toDocument(key, definition) {
  const attack = definition.attack ?? {};
  const damage = definition.damage ?? {};
  const conditionTrack = damage.conditionTrack ?? {};
  const treatment = definition.treatment ?? {};
  const recurrence = definition.recurrence ?? {};

  return {
    _id: stableId(key),
    name: definition.name,
    type: 'poison',
    img: 'icons/svg/poison.svg',
    system: {
      key: definition.key ?? key,
      description: definition.description ?? '',
      source: definition.source ?? '',
      challengeLevel: definition.challengeLevel ?? 0,
      keywords: definition.keywords ?? [],
      delivery: definition.delivery ?? [],
      trigger: definition.trigger ?? '',
      attack: {
        bonus: attack.bonus ?? 0,
        formula: attack.formula ?? '',
        defense: attack.defense ?? 'fortitude',
        recurrenceDefense: attack.recurrenceDefense ?? '',
        ignores: attack.ignores ?? [],
      },
      damage: {
        formula: damage.formula ?? '',
        halfOnMiss: damage.halfOnMiss ?? false,
        conditionTrack: {
          steps: conditionTrack.steps ?? 0,
          persistent: conditionTrack.persistent ?? false,
          onMissSteps: conditionTrack.onMissSteps ?? 0,
        },
        skillPenalty: damage.skillPenalty ?? 0,
        darkSideScore: damage.darkSideScore ?? 0,
      },
      recurrence: {
        type: recurrence.type ?? 'none',
        until: recurrence.until ?? [],
      },
      treatment: {
        skill: treatment.skill ?? 'treatInjury',
        dc: treatment.dc ?? 0,
        dcFormula: treatment.dcFormula ?? '',
        requiresMedicalKit: treatment.requiresMedicalKit ?? false,
        dcAdjustment: treatment.dcAdjustment ?? 0,
      },
      special: definition.special ?? {},
      talentHooks: definition.talentHooks ?? [],
    },
    effects: [],
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: {},
  };
}

export function buildPoisonDocuments() {
  return Object.entries(POISON_DEFINITIONS)
    .map(([key, definition]) => toDocument(key, definition))
    .sort((a, b) => a._id.localeCompare(b._id));
}

export function renderPack() {
  return buildPoisonDocuments().map((doc) => JSON.stringify(doc)).join('\n') + '\n';
}

function main() {
  const next = renderPack();
  const check = process.argv.includes('--check');
  let current = '';
  try {
    current = readFileSync(PACK, 'utf8');
  } catch (_err) {
    current = '';
  }

  if (check) {
    if (current === next) {
      console.log(`packs/poisons.db is up to date (${Object.keys(POISON_DEFINITIONS).length} poisons).`);
      process.exit(0);
    }
    console.error('packs/poisons.db is stale — run: node tools/build-poisons-pack.mjs');
    process.exit(1);
  }

  writeFileSync(PACK, next);
  console.log(`Wrote packs/poisons.db (${Object.keys(POISON_DEFINITIONS).length} poisons).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
