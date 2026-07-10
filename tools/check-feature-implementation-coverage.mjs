#!/usr/bin/env node

/**
 * check-feature-implementation-coverage.mjs — Feature implementation coverage audit
 *
 * Report-only static evidence generator for the feat / species / class-feature
 * implementation audit. It does NOT prove runtime behavior — it classifies each
 * item by the objective signals present in the compendium data and cross-checks a
 * few consistency conditions. Runtime automation and correctness still need
 * Foundry verification; this tool tells you WHERE to look and separates
 * "has a runtime path" from "data-only".
 *
 * Evidence model (layers, per the audit spec):
 *   data        — item exists in a pack
 *   application — an ActiveEffect (transfer:true) exists for it (feat-effects.json)
 *   runtime     — it declares abilityMeta.modifiers / grantsActions / UNLOCK, which
 *                 the canonical consumers (ModifierEngine → derived-calculator for
 *                 skills/defenses; combat-roll-math for attack/damage) read.
 *
 * Provisional buckets (A–F/P) are a STARTING POINT for human review, never a
 * verdict — the script cannot see predicate gating, context matching, or whether
 * a normalization hook actually names a given feat.
 *
 * Outputs (written under docs/audits/):
 *   feat-implementation-status.json
 *   species-feature-implementation-status.json
 *   class-feature-implementation-status.json
 * and prints a summary. Pass --json for the summary as JSON; --no-write to skip
 * writing the status files.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const argv = process.argv.slice(2);
const JSON_OUT = argv.includes('--json');
const NO_WRITE = argv.includes('--no-write');

function readDb(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8')
    .split(/\r?\n/)
    .filter(l => l.trim())
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}
function readJson(rel, fallback) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return fallback;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}
function nonEmpty(v) {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  if (typeof v === 'string') return v.trim().length > 0;
  return Boolean(v);
}
function walkFiles(dir, predicate, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      walkFiles(p, predicate, out);
    } else if (predicate(p)) {
      out.push(p);
    }
  }
  return out;
}
function scanSourceFor(patterns, { root = 'scripts', maxMatches = 12 } = {}) {
  const files = walkFiles(path.join(ROOT, root), p => /\.(mjs|js|json|hbs)$/i.test(p));
  const out = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const hits = patterns.filter(pattern => {
      if (pattern instanceof RegExp) return pattern.test(text);
      return text.includes(String(pattern));
    });
    if (hits.length) {
      out.push({
        path: path.relative(ROOT, file),
        matches: hits.map(hit => hit instanceof RegExp ? String(hit) : hit),
      });
      if (out.length >= maxMatches) break;
    }
  }
  return out;
}
function hasMeaningfulCombatTraits(value) {
  if (!value || typeof value !== 'object') return false;
  const naturalArmor = Number(value.naturalArmor || 0) || 0;
  const weaponProficiencies = Array.isArray(value.weaponProficiencies) ? value.weaponProficiencies.filter(Boolean) : [];
  const otherTraits = Array.isArray(value.otherTraits) ? value.otherTraits.filter(Boolean) : [];
  const rest = Object.entries(value).filter(([key]) => !['naturalArmor', 'weaponProficiencies', 'otherTraits'].includes(key));
  return naturalArmor !== 0 || weaponProficiencies.length > 0 || otherTraits.length > 0 || rest.some(([, v]) => nonEmpty(v));
}
function fieldIsMeaningful(system, field) {
  if (field === 'combatTraits') return hasMeaningfulCombatTraits(system?.combatTraits);
  return nonEmpty(system?.[field]);
}

// ---------------------------------------------------------------------------
// FEATS
// ---------------------------------------------------------------------------

function auditFeats() {
  const feats = readDb('packs/feats.db');
  const featEffects = readJson('data/feat-effects.json', { definitions: {} });
  const defs = featEffects.definitions || {};
  // transfer:true effects = the only ones historically applied to actors.
  const transferFeatIds = new Set();
  for (const def of Object.values(defs)) {
    const list = Array.isArray(def?.effects) ? def.effects : [];
    const anyTransfer = list.some(e => e?.transfer === true) || def?.transfer === true;
    if (anyTransfer && def?.featId) transferFeatIds.add(def.featId);
  }

  const items = feats.map(f => {
    const s = f.system || {};
    const am = s.abilityMeta || {};
    const modifiers = Array.isArray(am.modifiers) ? am.modifiers : [];
    const targets = [...new Set(modifiers.flatMap(m =>
      (Array.isArray(m.target) ? m.target : [m.target]).map(t => String(t || '')).filter(Boolean)
    ))];
    const hasTransferEffect = transferFeatIds.has(f._id);
    const grantsActions = nonEmpty(s.grantsActions);
    const em = s.executionModel || null;
    const sub = s.subType || null;

    // Provisional bucket (starting point only).
    let bucket, reason;
    if (em === 'UNLOCK') {
      bucket = 'B'; reason = 'UNLOCK: grants access/proficiency via progression — verify unlock applies';
    } else if (em === 'ACTIVE') {
      bucket = 'B'; reason = 'ACTIVE: activated ability — verify action wiring';
    } else if (modifiers.length > 0) {
      bucket = 'B'; reason = `PASSIVE modifiers declared (${modifiers.length}); consumed by ModifierEngine/combat-roll-math — verify per-feat`;
    } else if (hasTransferEffect) {
      bucket = 'B'; reason = 'ActiveEffect (transfer:true) applied — verify effect fires';
    } else if (grantsActions) {
      bucket = 'C'; reason = 'grantsActions only, no passive modifiers — verify action surface';
    } else {
      bucket = 'D'; reason = 'No modifiers / effects / actions — data & text only (rule may be manual/RULE-engine)';
    }

    return {
      name: f.name,
      slug: s.slug || null,
      source: s.sourcebook || s.source || null,
      executionModel: em,
      subType: sub,
      modifierCount: modifiers.length,
      modifierTargets: targets.slice(0, 8),
      hasTransferEffect,
      grantsActions,
      hasPrerequisite: nonEmpty(s.prerequisites) || nonEmpty(s.prerequisite) || nonEmpty(s.prerequisitesText),
      bucket,
      reason,
    };
  });

  return { items, transferCount: transferFeatIds.size, effectDefCount: Object.keys(defs).length };
}

// ---------------------------------------------------------------------------
// SPECIES
// ---------------------------------------------------------------------------

const SPECIES_FIELDS = [
  'size', 'speed', 'movement', 'abilities', 'abilityMods', 'skillBonuses',
  'bonusTrainedSkills', 'bonusFeats', 'languages', 'naturalWeapons', 'combatTraits',
  'visionTraits', 'movementTraits', 'forceTraits', 'socialTraits', 'environmentalTraits',
  'techTraits', 'suppressedClassProficiencies', 'speciesActsAsDroid', 'special',
];

function auditSpecies() {
  const species = readDb('packs/species.db');
  const fieldCoverage = Object.fromEntries(SPECIES_FIELDS.map(f => [f, 0]));
  const rawFieldCoverage = Object.fromEntries(SPECIES_FIELDS.map(f => [f, 0]));
  // The combat-math SSOT parity question: do species declare flat attack/damage bonuses?
  const combatBonusSpecies = [];

  const consumerEvidence = {
    combatTraits: scanSourceFor(['combatTraits']),
    bonusTrainedSkills: scanSourceFor(['bonusTrainedSkills']),
    structuredBonusTrainedSkill: scanSourceFor(['bonusTrainedSkill']),
    canonicalTraits: scanSourceFor(['canonicalTraits', 'speciesTraitIds', 'speciesTraits']),
  };

  const items = species.map(sp => {
    const s = sp.system || {};
    const present = {};
    const rawPresent = {};
    for (const field of SPECIES_FIELDS) {
      const rawHas = nonEmpty(s[field]);
      const has = fieldIsMeaningful(s, field);
      rawPresent[field] = rawHas;
      present[field] = has;
      if (rawHas) rawFieldCoverage[field]++;
      if (has) fieldCoverage[field]++;
    }
    // Look for meaningful attack/damage bonus declarations inside combatTraits.
    const ct = hasMeaningfulCombatTraits(s.combatTraits) ? s.combatTraits : null;
    const ctStr = JSON.stringify(ct || '');
    const declaresCombatAtkDmg = /attack|damage/i.test(ctStr) && nonEmpty(ct);
    if (declaresCombatAtkDmg) combatBonusSpecies.push(sp.name);

    return {
      name: sp.name,
      source: s.source || null,
      actsAsDroid: Boolean(s.speciesActsAsDroid),
      present,
      rawPresent,
      declaresCombatAtkDmg,
    };
  });

  return { items, fieldCoverage, rawFieldCoverage, combatBonusSpecies, consumerEvidence, count: species.length };
}

// ---------------------------------------------------------------------------
// CLASSES
// ---------------------------------------------------------------------------

const CLASS_FIELDS = [
  'hitDie', 'base_hp', 'babProgression', 'defenses', 'class_skills', 'trainedSkills',
  'talent_trees', 'talentTreeIds', 'starting_features', 'level_progression',
  'grants_force_points', 'starting_credits',
];

// SWSE class-type expectations (audit addendum). Base classes are the character's
// starter chassis and OWN the starting package; prestige classes are additive
// specialization layers that do NOT provide a starting package and should not be
// flagged for missing one. Coverage must therefore be measured per class type,
// not as a single n/37 that conflates the two roles.
//   base-start   — expected on BASE classes only. Empty on prestige is BY DESIGN.
//   additive     — expected on prestige AND base (progression identity).
//   universal    — expected on every class path.
const CLASS_FIELD_EXPECTATION = {
  hitDie: 'universal',
  base_hp: 'universal',
  level_progression: 'universal',
  babProgression: 'additive',
  defenses: 'additive',
  talent_trees: 'additive',
  talentTreeIds: 'additive',
  grants_force_points: 'additive',
  class_skills: 'base-start',
  trainedSkills: 'base-start',
  starting_features: 'base-start',
  starting_credits: 'base-start',
};

function auditClasses() {
  const classes = readDb('packs/classes.db');
  const nonheroic = readDb('packs/nonheroic.db');
  const classFeatures = readJson('data/class-features.json', { abilities: [] });
  // Overall coverage retained for backward compatibility, but the split coverage
  // below is the interpretable signal — see CLASS_FIELD_EXPECTATION.
  const fieldCoverage = Object.fromEntries(CLASS_FIELDS.map(f => [f, 0]));
  const baseFieldCoverage = Object.fromEntries(CLASS_FIELDS.map(f => [f, 0]));
  const prestigeFieldCoverage = Object.fromEntries(CLASS_FIELDS.map(f => [f, 0]));
  const classFeatureRegistry = {
    abilityCount: Array.isArray(classFeatures.abilities) ? classFeatures.abilities.length : 0,
    consumerEvidence: scanSourceFor(['class-features.json'], { root: 'scripts' }),
  };

  let baseCount = 0;
  let prestigeCount = 0;
  const items = classes.map(c => {
    const s = c.system || {};
    const isBase = s.base_class === true;
    if (isBase) baseCount++; else prestigeCount++;
    const present = {};
    for (const field of CLASS_FIELDS) {
      const has = nonEmpty(s[field]);
      present[field] = has;
      if (has) {
        fieldCoverage[field]++;
        if (isBase) baseFieldCoverage[field]++; else prestigeFieldCoverage[field]++;
      }
    }
    return {
      name: c.name,
      classType: isBase ? 'base' : 'prestige-or-other',
      talentTreeCount: Array.isArray(s.talent_trees) ? s.talent_trees.length
        : (Array.isArray(s.talentTreeIds) ? s.talentTreeIds.length : 0),
      startingFeatureCount: Array.isArray(s.starting_features) ? s.starting_features.length : 0,
      present,
    };
  });

  return {
    items, fieldCoverage, baseFieldCoverage, prestigeFieldCoverage,
    baseCount, prestigeCount, expectation: CLASS_FIELD_EXPECTATION,
    count: classes.length, nonheroicCount: nonheroic.length, classFeatureRegistry,
  };
}

// ---------------------------------------------------------------------------
// Run + report
// ---------------------------------------------------------------------------

const feats = auditFeats();
const species = auditSpecies();
const classes = auditClasses();

function tally(items, key) {
  const c = {};
  for (const it of items) c[it[key]] = (c[it[key]] || 0) + 1;
  return c;
}

const featBuckets = tally(feats.items, 'bucket');

if (!NO_WRITE) {
  const outDir = path.join(ROOT, 'docs/audits');
  fs.writeFileSync(path.join(outDir, 'feat-implementation-status.json'),
    JSON.stringify({ _meta: { generatedBy: 'check-feature-implementation-coverage.mjs', total: feats.items.length, transferEffects: feats.transferCount, bucketCounts: featBuckets, note: 'Buckets are provisional static signals, not runtime verdicts.' }, feats: feats.items }, null, 2));
  fs.writeFileSync(path.join(outDir, 'species-feature-implementation-status.json'),
    JSON.stringify({ _meta: { generatedBy: 'check-feature-implementation-coverage.mjs', total: species.count, fieldCoverage: species.fieldCoverage, rawFieldCoverage: species.rawFieldCoverage, speciesDeclaringCombatAtkDmg: species.combatBonusSpecies, consumerEvidence: species.consumerEvidence, note: 'fieldCoverage treats default/empty combatTraits as not meaningful; rawFieldCoverage preserves literal schema population.' }, species: species.items }, null, 2));
  fs.writeFileSync(path.join(outDir, 'class-feature-implementation-status.json'),
    JSON.stringify({ _meta: {
      generatedBy: 'check-feature-implementation-coverage.mjs',
      total: classes.count,
      baseCount: classes.baseCount,
      prestigeCount: classes.prestigeCount,
      nonheroicCount: classes.nonheroicCount,
      // Overall coverage is retained but conflates class roles — read the split
      // below. Start-package fields (class_skills/starting_features/starting_credits)
      // are expected on BASE classes only; prestige classes intentionally omit them.
      fieldCoverage: classes.fieldCoverage,
      baseFieldCoverage: classes.baseFieldCoverage,
      prestigeFieldCoverage: classes.prestigeFieldCoverage,
      fieldExpectation: classes.expectation,
      interpretation: 'Base classes own the starting package; prestige classes are additive and are NOT expected to provide starting feats/credits or replacement class skills unless the source explicitly grants them. Measure base start-package coverage and prestige additive coverage separately.',
      classFeatureRegistry: classes.classFeatureRegistry,
    }, classes: classes.items }, null, 2));
}

const summary = {
  feats: { total: feats.items.length, buckets: featBuckets, transferEffects: feats.transferCount, effectDefs: feats.effectDefCount },
  species: { total: species.count, fieldCoverage: species.fieldCoverage, rawFieldCoverage: species.rawFieldCoverage, declaringCombatAtkDmg: species.combatBonusSpecies.length, consumerEvidence: species.consumerEvidence },
  classes: {
    total: classes.count, base: classes.baseCount, prestige: classes.prestigeCount,
    nonheroic: classes.nonheroicCount,
    baseClasses: classes.items.filter(c => c.classType === 'base').map(c => c.name),
    baseFieldCoverage: classes.baseFieldCoverage,
    prestigeFieldCoverage: classes.prestigeFieldCoverage,
    expectation: classes.expectation,
    classFeatureRegistry: classes.classFeatureRegistry,
  },
};

if (JSON_OUT) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log('\n' + '='.repeat(72));
  console.log('  FEATURE IMPLEMENTATION COVERAGE (static signals — not runtime proof)');
  console.log('='.repeat(72));
  console.log(`\n  FEATS: ${summary.feats.total}  | ActiveEffect(transfer:true): ${summary.feats.transferEffects}  | effect defs: ${summary.feats.effectDefs}`);
  for (const [b, n] of Object.entries(featBuckets).sort()) console.log(`     provisional bucket ${b}: ${n}`);
  console.log(`\n  SPECIES: ${summary.species.total}  | declaring combat attack/damage traits: ${summary.species.declaringCombatAtkDmg}`);
  for (const [f, n] of Object.entries(species.fieldCoverage)) {
    const raw = species.rawFieldCoverage[f];
    const rawSuffix = raw !== n ? ` (raw schema: ${raw}/${summary.species.total})` : '';
    console.log(`     ${f.padEnd(28)} ${n}/${summary.species.total}${rawSuffix}`);
  }
  console.log('     consumer evidence:');
  for (const [field, hits] of Object.entries(species.consumerEvidence)) {
    console.log(`       ${field.padEnd(28)} ${hits.map(h => h.path).join(', ') || '(none in scripts/)'}`);
  }
  const B = classes.baseCount, P = classes.prestigeCount;
  console.log(`\n  CLASSES: ${summary.classes.total} = ${B} base + ${P} prestige/additive (+${summary.classes.nonheroic} nonheroic)`);
  console.log(`  base: ${summary.classes.baseClasses.join(', ')}`);
  console.log('  Coverage is split by class role (SWSE): base classes own the starting');
  console.log('  package; prestige classes are additive and do NOT provide one.');
  console.log(`\n    Base start-package (expected on ${B} base classes; prestige empty = by design):`);
  for (const [f, exp] of Object.entries(classes.expectation)) {
    if (exp !== 'base-start') continue;
    console.log(`       ${f.padEnd(26)} base ${classes.baseFieldCoverage[f]}/${B}    prestige ${classes.prestigeFieldCoverage[f]}/${P} (n/a)`);
  }
  console.log(`\n    Additive progression (expected on prestige + base):`);
  for (const [f, exp] of Object.entries(classes.expectation)) {
    if (exp !== 'additive') continue;
    console.log(`       ${f.padEnd(26)} base ${classes.baseFieldCoverage[f]}/${B}    prestige ${classes.prestigeFieldCoverage[f]}/${P}`);
  }
  console.log(`\n    Universal (expected on every class):`);
  for (const [f, exp] of Object.entries(classes.expectation)) {
    if (exp !== 'universal') continue;
    console.log(`       ${f.padEnd(26)} base ${classes.baseFieldCoverage[f]}/${B}    prestige ${classes.prestigeFieldCoverage[f]}/${P}`);
  }
  console.log(`\n     class-features.json abilities ${summary.classes.classFeatureRegistry.abilityCount}; consumers: ${summary.classes.classFeatureRegistry.consumerEvidence.map(h => h.path).join(', ') || '(none in scripts/)'}`);
  if (!NO_WRITE) console.log('\n  Wrote 3 status JSON files to docs/audits/.');
  console.log('='.repeat(72) + '\n');
}
