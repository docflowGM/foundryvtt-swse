#!/usr/bin/env node
/**
 * Damage Profile Compendium Auditor (Phase 1 — Canonical Damage Profile Registry).
 *
 * Scans the DB packs and classifies every damage-producing source family
 * against the swse.damage.packet.v2 contract
 * (docs/systems/CANONICAL_DAMAGE_PACKET.md):
 *
 *   - character weapons (packs/weapons*.db, deduped by _id)
 *   - vehicle/starship weapons (packs/vehicle-weapons.db) via
 *     parseVehicleWeaponDamageSpec()
 *   - Force powers (packs/forcepowers.db)
 *   - unarmed + natural/racial attacks (packs/species.db, unarmed helper policy)
 *   - area/autofire/grenade/splash shapes (combat actions, weapon properties,
 *     grenade pack, Force power tags, vehicle ordnance)
 *   - poison packs: boundary notes only (rider pass is a later phase)
 *
 * Outputs (regenerate any time; committed for review):
 *   docs/audits/generated/damage-profile-audit.json
 *   docs/audits/generated/damage-profile-audit.md
 *
 * Optional:
 *   --emit-seeds   regenerate data/combat/damage-profiles.vehicle-weapon.json
 *                  from the parser (compact, per-weapon, nothing verified)
 *
 * READ-ONLY over packs: this tool never rewrites compendium data.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseVehicleWeaponDamageSpec } from '../scripts/engine/combat/vehicle-weapon-damage-parser.js';
import { DamageProfileRegistry, DAMAGE_PROFILE_DATA_FILES, slugify } from '../scripts/engine/combat/damage-profile-registry.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'docs', 'audits', 'generated');
const EMIT_SEEDS = process.argv.includes('--emit-seeds');

function loadPack(rel) {
  const path = join(ROOT, 'packs', rel);
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => JSON.parse(l));
}

function tally(items, classify) {
  const buckets = {};
  for (const item of items) {
    const key = classify(item);
    (buckets[key] ??= []).push(item);
  }
  return buckets;
}

function names(entries, limit = Infinity) {
  return entries.slice(0, limit).map(e => e.name ?? e);
}

const DICE_RE = /\d+d\d+/i;

// ---------------------------------------------------------------------------
// Registry (seed data) — used for coverage cross-checks
// ---------------------------------------------------------------------------
const registry = new DamageProfileRegistry();
for (const file of DAMAGE_PROFILE_DATA_FILES) {
  const path = join(ROOT, file);
  if (existsSync(path)) registry.registerProfileData(JSON.parse(readFileSync(path, 'utf8')));
}

// ---------------------------------------------------------------------------
// Part 4 — Character weapons
// ---------------------------------------------------------------------------
const WEAPON_PACKS = [
  'weapons.db', 'weapons-exotic.db', 'weapons-grenades.db', 'weapons-heavy.db',
  'weapons-lightsabers.db', 'weapons-pistols.db', 'weapons-rifles.db', 'weapons-simple.db'
];

const weaponById = new Map();
const weaponPackOf = new Map();
for (const pack of WEAPON_PACKS) {
  for (const doc of loadPack(pack)) {
    if (doc.type !== 'weapon') continue; // skip weaponUpgrade etc.
    if (!weaponById.has(doc._id)) {
      weaponById.set(doc._id, doc);
      weaponPackOf.set(doc._id, pack);
    }
  }
}
const weapons = [...weaponById.values()];

function weaponProps(doc) {
  return (doc.system?.properties ?? []).map(p => String(p).toLowerCase());
}
function isLightsaberWeapon(doc) {
  const s = doc.system ?? {};
  return weaponProps(doc).includes('lightsaber')
    || String(s.subtype ?? '').toLowerCase() === 'lightsaber'
    || weaponPackOf.get(doc._id) === 'weapons-lightsabers.db'
    || /light\s*saber|lightfoil|light\s*foil/i.test(doc.name ?? '');
}
function isGrenadeWeapon(doc) {
  const s = doc.system ?? {};
  const props = weaponProps(doc);
  return String(s.category ?? '').toLowerCase() === 'grenade'
    || String(s.subcategory ?? '').toLowerCase() === 'grenade'
    || weaponPackOf.get(doc._id) === 'weapons-grenades.db'
    || props.includes('grenade') || props.includes('explosive')
    || /grenade|detonator|charge\b/i.test(doc.name ?? '');
}

function weaponTags(doc) {
  const props = weaponProps(doc);
  const tags = ['weapon'];
  if (isLightsaberWeapon(doc)) tags.push('lightsaber');
  if (props.includes('autofire')) tags.push('autofire-capable');
  if (isGrenadeWeapon(doc)) tags.push('grenade', 'explosive');
  if (props.includes('area effect') || props.includes('area attack')) tags.push('area');
  if (props.includes('launcher')) tags.push('launcher');
  if (props.includes('stun') || doc.system?.damageType === 'stun') tags.push('stun');
  if (props.includes('ion') || doc.system?.damageType === 'ion') tags.push('ion');
  if (props.includes('projectile')) tags.push('slugthrower');
  return tags;
}

function classifyWeapon(doc) {
  const s = doc.system ?? {};
  const damage = String(s.damage ?? '').trim();
  const type = String(s.damageType ?? '').trim();
  const tags = weaponTags(doc);
  const hasDice = DICE_RE.test(damage) || /^\d+$/.test(damage);
  if (!damage || damage === '-' || /special/i.test(damage)) return 'manualRequired';
  if (!hasDice) return 'manualRequired';
  if (!type) return 'manualRequired';
  // Launchers: listed damage usually belongs to the ammunition, review needed.
  if (tags.includes('launcher')) return 'inferredButNeedsReview';
  return 'safeToWire';
}

const weaponBuckets = tally(weapons, classifyWeapon);
const weaponFieldUse = {};
for (const doc of weapons) {
  for (const key of Object.keys(doc.system ?? {})) weaponFieldUse[key] = (weaponFieldUse[key] ?? 0) + 1;
}

const weaponReport = {
  packs: WEAPON_PACKS,
  note: 'packs/weapons.db is an aggregate duplicate of the category packs; entries are deduped by _id.',
  scanned: weapons.length,
  withExplicitDamage: weapons.filter(w => DICE_RE.test(String(w.system?.damage ?? ''))).length,
  withExplicitDamageType: weapons.filter(w => String(w.system?.damageType ?? '').trim()).length,
  damageTypeDistribution: Object.fromEntries(
    Object.entries(weapons.reduce((acc, w) => {
      const t = String(w.system?.damageType ?? '(none)');
      acc[t] = (acc[t] ?? 0) + 1;
      return acc;
    }, {})).sort((a, b) => b[1] - a[1])
  ),
  traits: {
    lightsaber: weapons.filter(isLightsaberWeapon).length,
    autofireCapable: weapons.filter(w => weaponProps(w).includes('autofire')).length,
    grenadeOrExplosive: weapons.filter(isGrenadeWeapon).length,
    areaEffectProperty: weapons.filter(w => weaponProps(w).includes('area effect') || weaponProps(w).includes('area attack')).length,
    launcher: weapons.filter(w => weaponProps(w).includes('launcher')).length,
    stun: weapons.filter(w => weaponProps(w).includes('stun') || w.system?.damageType === 'stun').length,
    ion: weapons.filter(w => weaponProps(w).includes('ion') || w.system?.damageType === 'ion').length
  },
  classification: {
    safeToWire: (weaponBuckets.safeToWire ?? []).length,
    inferredButNeedsReview: (weaponBuckets.inferredButNeedsReview ?? []).length,
    manualRequired: (weaponBuckets.manualRequired ?? []).length
  },
  manualRequired: names(weaponBuckets.manualRequired ?? []),
  inferredButNeedsReview: names(weaponBuckets.inferredButNeedsReview ?? []),
  fieldUse: weaponFieldUse,
  profileOwner: 'weapon builder (buildWeaponDamagePacket) + family profiles in data/combat/damage-profiles.weapon.json; grenades overlay the areaProfile grenade-burst shape.'
};

// ---------------------------------------------------------------------------
// Part 5 — Vehicle/starship weapons
// ---------------------------------------------------------------------------
const vehicleWeapons = loadPack('vehicle-weapons.db');
const vehicleParsed = vehicleWeapons.map(doc => ({
  id: doc._id,
  name: doc.name,
  raw: doc.system?.damage ?? null,
  parsed: parseVehicleWeaponDamageSpec(doc.system?.damage, doc.name)
}));

const vehicleBuckets = tally(vehicleParsed, e => e.parsed.classification);
const vehicleReport = {
  pack: 'vehicle-weapons.db',
  scanned: vehicleWeapons.length,
  withDamageString: vehicleParsed.filter(e => e.raw).length,
  withParseableFormula: vehicleParsed.filter(e => e.parsed.formula).length,
  withExplicitType: vehicleParsed.filter(e => e.parsed.typeSource === 'explicit').length,
  withNameInferredType: vehicleParsed.filter(e => e.parsed.typeSource === 'name').length,
  classification: Object.fromEntries(
    ['safeToWire', 'inferredButNeedsReview', 'manualRequired', 'modifier', 'noDirectDamage']
      .map(k => [k, (vehicleBuckets[k] ?? []).length])
  ),
  byBucket: Object.fromEntries(
    Object.entries(vehicleBuckets).map(([k, v]) => [k, v.map(e => `${e.name} [${e.raw ?? 'null'}]`)])
  ),
  profileOwner: 'vehicle-weapon builder (later slice) + generated per-weapon profiles in data/combat/damage-profiles.vehicle-weapon.json; parser: scripts/engine/combat/vehicle-weapon-damage-parser.js.'
};

// Optional seed regeneration — compact per-weapon profiles, nothing verified.
if (EMIT_SEEDS) {
  const seed = {
    $schemaRef: 'data/combat/damage-profiles.schema.json',
    sourceType: 'vehicleWeapon',
    notes: [
      `GENERATED by tools/audit-damage-profiles.mjs --emit-seeds from packs/vehicle-weapons.db (${vehicleWeapons.length} entries). Do not hand-edit counts; re-run the tool.`,
      'Nothing here is confidence "verified": vehicle-weapon runtime is not wired this phase. Explicit (Ion) entries are the first promotion candidates in the vehicle slice.',
      'Missiles/torpedoes/mines/ordnance stay manualRequired even with parseable dice — type and area behavior vary per printed source.'
    ],
    profiles: vehicleParsed.map(({ id, name, parsed }, _i, arr) => {
      // Pack has duplicate names (two "Harpoon Gun" entries); fall back to the
      // document _id to keep profile slugs unique.
      const nameCollides = arr.filter(e => e.name === name).length > 1;
      const p = {
        slug: slugify(nameCollides ? id : name),
        name,
        delivery: 'vehicle-weapon',
        attackShape: parsed.manualFamily ? null : 'single-target',
        scale: 'vehicle',
        primaryType: parsed.type ?? parsed.inferredType ?? null,
        tags: [...new Set([...parsed.tags,
          ...(parsed.modifierOnly ? ['damage-modifier'] : []),
          ...(parsed.launcherLike && parsed.noDamage ? ['launcher'] : [])])],
        components: parsed.formula
          ? [{ key: 'base', label: name, formula: parsed.formula + (parsed.multiplier ? `x${parsed.multiplier}` : ''), type: parsed.type ?? parsed.inferredType ?? null }]
          : [],
        confidence: parsed.classification === 'safeToWire' || parsed.classification === 'inferredButNeedsReview'
          ? 'inferred'
          : 'manualRequired',
        notes: parsed.notes
      };
      if (!p.attackShape) delete p.attackShape;
      if (!p.primaryType) delete p.primaryType;
      if (!p.components.length) delete p.components;
      if (!p.notes.length) delete p.notes;
      return p;
    })
  };
  writeFileSync(join(ROOT, 'data', 'combat', 'damage-profiles.vehicle-weapon.json'), JSON.stringify(seed, null, 2) + '\n');
  console.log('wrote data/combat/damage-profiles.vehicle-weapon.json');
}

// ---------------------------------------------------------------------------
// Part 6 — Force powers
// ---------------------------------------------------------------------------
const forcePowers = loadPack('forcepowers.db');

function powerTags(doc) {
  return (doc.system?.tags ?? []).map(t => String(t).toLowerCase());
}
function powerText(doc) {
  const s = doc.system ?? {};
  const chart = (s.dcChart ?? []).map(r => `${r.effect ?? ''} ${r.description ?? ''}`).join(' ');
  return `${s.effect ?? ''} ${s.special ?? ''} ${s.damage ?? ''} ${chart}`.toLowerCase();
}
function isDamagePower(doc) {
  const tags = powerTags(doc);
  if (tags.includes('damage') || tags.includes('lightning')) return true;
  const text = powerText(doc);
  // dice that are damage, not healing
  return /\d+d\d+/.test(text) && /damage/.test(text) && !/only|no damage/.test(text);
}
function powerBuckets(doc) {
  const tags = powerTags(doc);
  const text = powerText(doc);
  const buckets = [];
  if (isDamagePower(doc)) buckets.push('damage');
  if (tags.includes('healing') || /heals?\b/.test(text)) buckets.push('healing');
  if (tags.includes('defense') || tags.includes('energy_defense') || tags.includes('survivability')) buckets.push('defensive/mitigation');
  if (tags.includes('mobility') || tags.includes('control') || tags.includes('forced_movement') || tags.includes('push')) buckets.push('movement/control');
  if (tags.includes('mind_affecting') || tags.includes('telepathic')) buckets.push('mental/mind-affecting');
  if (tags.includes('area') || tags.includes('burst')) buckets.push('area');
  if (!buckets.length) buckets.push('no-runtime-damage');
  return buckets;
}

const forceClassified = forcePowers.map(doc => ({
  name: doc.name,
  slug: slugify(doc.name),
  buckets: powerBuckets(doc),
  tags: powerTags(doc)
}));
const forceBucketCounts = {};
for (const p of forceClassified) {
  for (const b of p.buckets) (forceBucketCounts[b] ??= []).push(p.name);
}
const damagePowers = forceClassified.filter(p => p.buckets.includes('damage'));
const curatedForce = new Set(registry.all('forcePower').map(p => p.slug));
const damagePowersWithProfile = damagePowers.filter(p => curatedForce.has(p.slug));
const damagePowersWithoutProfile = damagePowers.filter(p => !curatedForce.has(p.slug));

const forceReport = {
  pack: 'forcepowers.db',
  scanned: forcePowers.length,
  buckets: Object.fromEntries(Object.entries(forceBucketCounts).map(([k, v]) => [k, { count: v.length, powers: v }])),
  damageCapable: damagePowers.length,
  curatedProfiles: curatedForce.size,
  damageCapableWithProfile: damagePowersWithProfile.map(p => p.name),
  damageCapableWithoutProfile: damagePowersWithoutProfile.map(p => p.name),
  classification: {
    safeToWire: 0,
    inferredButNeedsReview: registry.all('forcePower').filter(p => p.confidence === 'inferred').length,
    manualRequired: damagePowersWithoutProfile.length
      + registry.all('forcePower').filter(p => p.confidence === 'manualRequired').length
  },
  policy: 'No Force power damage is wired this phase; nothing is safeToWire by design. Never default Force damage to type "force"; dark side is a tag, not a type. Force Shield / Energy Resistance / Negate Energy remain effect/mitigation flows.',
  profileOwner: 'curated data/combat/damage-profiles.force-power.json + future buildForcePowerDamagePacket().'
};

// ---------------------------------------------------------------------------
// Part 7 — Unarmed + natural/racial attacks
// ---------------------------------------------------------------------------
const species = loadPack('species.db');
const naturalEntries = [];
for (const doc of species) {
  for (const nw of doc.system?.naturalWeapons ?? []) {
    naturalEntries.push({ species: doc.name, ...nw });
  }
}
const naturalReport = {
  packs: ['species.db', 'special-abilities.db (no naturalWeaponRiders present)', 'beasts.db (no naturalWeapons present)'],
  speciesScanned: species.length,
  speciesWithNaturalWeapons: species.filter(d => (d.system?.naturalWeapons ?? []).length).length,
  naturalWeaponEntries: naturalEntries.length,
  withFormula: naturalEntries.filter(e => DICE_RE.test(String(e.damage ?? ''))).length,
  withExplicitType: naturalEntries.filter(e => String(e.type ?? '').trim()).length,
  entries: naturalEntries,
  unarmedPolicy: "unarmed-attack-helper.js is the unarmed authority: size-stepped dice, damageType 'bludgeoning' (aliases to kinetic), tags ['unarmed','natural-body'].",
  classification: {
    safeToWire: naturalEntries.filter(e => DICE_RE.test(String(e.damage ?? '')) && String(e.type ?? '').trim()).length,
    inferredButNeedsReview: 0,
    manualRequired: naturalEntries.filter(e => !DICE_RE.test(String(e.damage ?? '')) || !String(e.type ?? '').trim()).length
  },
  profileOwner: 'data/combat/damage-profiles.natural.json + future buildUnarmedDamagePacket()/buildNaturalWeaponDamagePacket(). Natural weapons keep explicit slashing/piercing/energy types; never collapsed into generic unarmed.'
};

// ---------------------------------------------------------------------------
// Part 8 — Area / autofire / grenade shapes
// ---------------------------------------------------------------------------
const combatActions = loadPack('combat-actions.db');
const shipActions = loadPack('ship-combat-actions.db');
function actionShapeInfo(doc) {
  const ctx = (doc.system?.contextTags ?? []).map(t => String(t));
  const rule = doc.system?.ruleData ?? {};
  return {
    name: doc.name,
    contextTags: ctx,
    areaAttack: rule.areaAttack === true || ctx.includes('areaAttack'),
    autofire: ctx.includes('autofire'),
    burstFire: ctx.includes('burstFire'),
    halfDamageOnMiss: rule.halfDamageOnMiss === true,
    evasionApplies: rule.evasionApplies === true
  };
}
const shapeActions = [...combatActions, ...shipActions].map(actionShapeInfo)
  .filter(a => a.areaAttack || a.autofire || a.burstFire);

const areaWeapons = weapons.filter(w => weaponProps(w).includes('area effect') || weaponProps(w).includes('area attack') || isGrenadeWeapon(w));
const areaForcePowers = forceClassified.filter(p => p.buckets.includes('area'));
const areaVehicleOrdnance = vehicleParsed.filter(e => e.parsed.manualFamily && !e.parsed.noDamage);

const areaReport = {
  currentAuthorities: [
    'combat-actions.db ruleData (areaAttack/halfDamageOnMiss/evasionApplies) + contextTags (autofire/burstFire/areaAttack)',
    'damage-packet-builder.js resolveDamageDisposition() (area/autofire/burstFire flags, half-on-miss, cover negation via SkillFeatRuntime)',
    'scripts/engine/feats/area-explosives-feat-normalization-hooks.js + weapon-autofire-feat-normalization-hooks.js (feat runtime patches)',
    'weapon properties (Autofire, Area Effect, Grenade, Launcher) on weapon packs',
    'Force power tags (area/burst) on forcepowers.db',
    'vehicle ordnance families (missiles/torpedoes/mines/bombs) in vehicle-weapons.db'
  ],
  shapeProfiles: registry.all('areaProfile').map(p => p.slug),
  combatActionsWithShapeSemantics: shapeActions,
  weaponsWithAreaTraits: names(areaWeapons),
  forcePowersWithAreaTags: areaForcePowers.map(p => p.name),
  vehicleOrdnanceNeedingAreaMapping: areaVehicleOrdnance.map(e => e.name),
  policy: 'Shape profiles are resolution-policy metadata; per-target packets are produced after hit/miss/cover resolution. No token geometry this phase.'
};

// ---------------------------------------------------------------------------
// Poison boundary (notes only)
// ---------------------------------------------------------------------------
const poisons = loadPack('poisons.db');
const poisonReport = {
  pack: 'poisons.db',
  scanned: poisons.length,
  packNote: poisons.length ? undefined : 'packs/poisons.db is currently empty (0 bytes); the poison item type exists in template.json and the poison engine remains the schema authority.',
  boundary: 'Poison keeps its own engine/schema and becomes a packet RIDER in a later pass. It is not a damage component and never enters SR/immunity/DR/resistance math. Only type "poison" HP damage with explicit printed-source support may ever become a component.',
  poisonsWithHpDamageFields: poisons.filter(p => DICE_RE.test(JSON.stringify(p.system?.damage ?? ''))).length
};

// ---------------------------------------------------------------------------
// Part 9 — Validators
// ---------------------------------------------------------------------------
const validators = [];
function validate(id, description, failures) {
  validators.push({ id, description, failures: failures.length, examples: failures.slice(0, 15) });
}

validate('weapon-damage-without-type',
  'Weapon with dice damage but no damageType',
  weapons.filter(w => DICE_RE.test(String(w.system?.damage ?? '')) && !String(w.system?.damageType ?? '').trim()).map(w => w.name));

validate('lightsaber-without-tag',
  'Lightsaber-ish weapon not detectable as lightsaber by property/subtype/pack (would miss the DR-bypass tag)',
  weapons.filter(w => /light\s*saber|lightfoil/i.test(w.name ?? '') && !(weaponProps(w).includes('lightsaber') || String(w.system?.subtype ?? '').toLowerCase() === 'lightsaber')).map(w => w.name));

validate('vehicle-weapon-parseable-without-type',
  'Vehicle weapon with parseable damage formula but no explicit or name-inferable type',
  vehicleParsed.filter(e => e.parsed.formula && !e.parsed.type && !e.parsed.inferredType && !e.parsed.modifierOnly).map(e => `${e.name} [${e.raw}]`));

validate('force-damage-power-without-profile',
  'Damage-capable Force power with no curated profile entry',
  damagePowersWithoutProfile.map(p => p.name));

validate('area-attack-without-shape',
  'Combat action with area semantics but no matching registry shape profile',
  shapeActions.filter(a => a.areaAttack && !registry.get('areaProfile', a.autofire ? 'autofire' : 'grenade-burst') && !registry.get('areaProfile', 'cone')).map(a => a.name));

validate('autofire-weapon-without-profile',
  'Autofire-capable weapon while the registry lacks the autofire shape profile',
  registry.get('areaProfile', 'autofire') ? [] : weapons.filter(w => weaponProps(w).includes('autofire')).map(w => w.name));

validate('natural-weapon-without-formula-or-type',
  'Species natural weapon missing dice formula or explicit type',
  naturalEntries.filter(e => !DICE_RE.test(String(e.damage ?? '')) || !String(e.type ?? '').trim()).map(e => `${e.species}: ${e.name}`));

validate('poison-as-plain-hp-damage',
  'Poison-named weapon/power modeled as plain HP damage without explicit source support (boundary check)',
  weapons.filter(w => /poison/i.test(w.name ?? '') && DICE_RE.test(String(w.system?.damage ?? ''))).map(w => w.name));

// ---------------------------------------------------------------------------
// Recommendation + report assembly
// ---------------------------------------------------------------------------
const recommendation = {
  nextRuntimeSlice: 'character weapons first',
  rationale: [
    `Character weapons are in excellent shape: ${weaponReport.classification.safeToWire}/${weaponReport.scanned} safeToWire with explicit damage + damageType — a weapon packet builder (buildWeaponDamagePacket) can wire immediately, gated on confidence "verified" family profiles.`,
    'Area/autofire/grenade shape overlays come second: the shape profiles are rules-verified and combat-actions already carry matching ruleData, so the overlay is mostly plumbing.',
    `Vehicle weapons are worse but tractable: the parser already types ${vehicleReport.withExplicitType} explicit-ion + ${vehicleReport.withNameInferredType} name-inferred entries; the ordnance families (${vehicleReport.classification.manualRequired} manualRequired) need printed-source review before any wiring.`,
    `Force powers stay curated-only: ${forceReport.damageCapable} damage-capable powers, ${forceReport.damageCapableWithProfile.length} with curated profiles, none wired by design this phase.`
  ],
  order: [
    '1. Character weapon packet builder (safeToWire set)',
    '2. Area/autofire/grenade shape overlays (per-target packets after hit/miss)',
    '3. Vehicle weapon normalization + builder (explicit-ion first, then name-inferred energy/kinetic)',
    '4. Force power curated profiles → builder (verified entries only)',
    '5. Unarmed/natural builders (small, data already clean)',
    '6. Riders pass (poison, burning, ion/stun CT)'
  ]
};

const report = {
  generatedBy: 'tools/audit-damage-profiles.mjs',
  generatedAt: new Date().toISOString(),
  contract: 'docs/systems/CANONICAL_DAMAGE_PACKET.md (swse.damage.packet.v2)',
  registrySeedCounts: registry.counts(),
  weapons: weaponReport,
  vehicleWeapons: vehicleReport,
  forcePowers: forceReport,
  unarmedAndNatural: naturalReport,
  areaShapes: areaReport,
  poisonBoundary: poisonReport,
  validators,
  recommendation
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'damage-profile-audit.json'), JSON.stringify(report, null, 2) + '\n');

// ---------------------------------------------------------------------------
// Markdown summary
// ---------------------------------------------------------------------------
function mdList(arr) {
  return arr.length ? arr.map(x => `- ${x}`).join('\n') : '- (none)';
}
const md = `# Damage Profile Audit (generated)

Generated by \`node tools/audit-damage-profiles.mjs\` — do not hand-edit.
Contract: \`docs/systems/CANONICAL_DAMAGE_PACKET.md\` (swse.damage.packet.v2).
Full detail: \`damage-profile-audit.json\` next to this file.

## Registry seed coverage

| sourceType | total | verified | inferred | manualRequired |
|---|---|---|---|---|
${Object.entries(report.registrySeedCounts).map(([k, v]) => `| ${k} | ${v.total} | ${v.verified} | ${v.inferred} | ${v.manualRequired} |`).join('\n')}

## Character weapons (${weaponReport.scanned} unique)

- explicit dice damage: ${weaponReport.withExplicitDamage} — explicit damageType: ${weaponReport.withExplicitDamageType}
- classification: **${weaponReport.classification.safeToWire} safeToWire**, ${weaponReport.classification.inferredButNeedsReview} inferredButNeedsReview, ${weaponReport.classification.manualRequired} manualRequired
- traits: ${weaponReport.traits.lightsaber} lightsaber, ${weaponReport.traits.autofireCapable} autofire-capable, ${weaponReport.traits.grenadeOrExplosive} grenade/explosive, ${weaponReport.traits.areaEffectProperty} area-effect property, ${weaponReport.traits.launcher} launcher, ${weaponReport.traits.stun} stun, ${weaponReport.traits.ion} ion
- damage types: ${Object.entries(weaponReport.damageTypeDistribution).map(([k, v]) => `${k} ${v}`).join(', ')}

manualRequired:
${mdList(weaponReport.manualRequired)}

inferredButNeedsReview:
${mdList(weaponReport.inferredButNeedsReview)}

## Vehicle/starship weapons (${vehicleReport.scanned})

- with damage string: ${vehicleReport.withDamageString} — parseable formula: ${vehicleReport.withParseableFormula}
- explicit type (Ion): ${vehicleReport.withExplicitType} — name-inferred type: ${vehicleReport.withNameInferredType}
- classification: ${Object.entries(vehicleReport.classification).map(([k, v]) => `${k} ${v}`).join(', ')}

manualRequired:
${mdList(vehicleReport.byBucket.manualRequired ?? [])}

noDirectDamage (launchers/racks/etc.):
${mdList(vehicleReport.byBucket.noDirectDamage ?? [])}

modifier entries:
${mdList(vehicleReport.byBucket.modifier ?? [])}

## Force powers (${forceReport.scanned})

Buckets: ${Object.entries(forceReport.buckets).map(([k, v]) => `${k} ${v.count}`).join(', ')}

- damage-capable: ${forceReport.damageCapable} — with curated profile: ${forceReport.damageCapableWithProfile.length} — without: ${forceReport.damageCapableWithoutProfile.length}
- policy: ${forceReport.policy}

damage-capable without curated profile (manualRequired):
${mdList(forceReport.damageCapableWithoutProfile)}

## Unarmed + natural attacks

- species scanned: ${naturalReport.speciesScanned}; with natural weapons: ${naturalReport.speciesWithNaturalWeapons} (${naturalReport.naturalWeaponEntries} entries; ${naturalReport.classification.safeToWire} safeToWire, ${naturalReport.classification.manualRequired} manualRequired)
- ${naturalReport.unarmedPolicy}

Entries:
${mdList(naturalEntries.map(e => `${e.species}: ${e.name} ${e.damage} ${e.type}`))}

## Area / autofire / grenade shapes

Shape profiles: ${areaReport.shapeProfiles.join(', ')}

Combat actions with shape semantics:
${mdList(shapeActions.map(a => `${a.name} (${[a.areaAttack && 'area', a.autofire && 'autofire', a.burstFire && 'burstFire', a.halfDamageOnMiss && 'half-on-miss'].filter(Boolean).join(', ')})`))}

Weapons with area traits: ${areaReport.weaponsWithAreaTraits.length} — Force powers with area tags: ${areaReport.forcePowersWithAreaTags.length} — vehicle ordnance needing area mapping: ${areaReport.vehicleOrdnanceNeedingAreaMapping.length}

## Poison boundary

${poisonReport.boundary}
(${poisonReport.scanned} poisons scanned; boundary notes only, no implementation this phase.)

## Validators

| id | failures |
|---|---|
${validators.map(v => `| ${v.id} | ${v.failures} |`).join('\n')}

${validators.filter(v => v.failures).map(v => `### ${v.id} (${v.failures})\n${mdList(v.examples)}`).join('\n\n') || 'All validators pass.'}

## Recommendation

**Next runtime slice: ${recommendation.nextRuntimeSlice}.**

${recommendation.rationale.map(r => `- ${r}`).join('\n')}

Order:
${recommendation.order.map(o => `${o}`).join('\n')}
`;

writeFileSync(join(OUT_DIR, 'damage-profile-audit.md'), md);
console.log('wrote docs/audits/generated/damage-profile-audit.{json,md}');
console.log('validators:', validators.map(v => `${v.id}=${v.failures}`).join(' '));
