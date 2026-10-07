#!/usr/bin/env node
// Phase 3C: deterministic production disposition ledger for the certified 203-identity weapon authority.
// Authority-only: compares the Phase 3B canonical identities with the CURRENT packs/weapons.db and records what
// would eventually have to change. It mutates nothing.
// Usage: node tools/build-item-weapons-phase-3c-production-disposition-ledger.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { scanReferences } from './lib/item-weapons-reference-scan.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT_JSON = 'data/audits/item-weapons-phase-3c-production-disposition-ledger.json';
export const OUT_MD = 'docs/audits/item-weapons-phase-3c-production-disposition-ledger.md';
const P3B = 'data/audits/item-weapons-phase-3b-canonical-authority.json';
const AUTH = 'data/audits/item-canonicalization-rolling-authority.json';
const readText = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const readJson = (f) => JSON.parse(readText(f));
const sortKeys = (x) => (Array.isArray(x) ? x.map(sortKeys) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, sortKeys(x[k])])) : x);
const sha = (x) => crypto.createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(sortKeys(x))).digest('hex');
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const txt = (h) => String(h ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export const PRIMARY = ['KEEP', 'CREATE', 'RENAME', 'UPDATE', 'MERGE', 'REVIEW_PRECEDENCE'];
export const REPRESENTABILITY = ['MATCH', 'DIFFERS', 'MISSING_IN_PRODUCTION', 'UNREPRESENTABLE_CURRENT_SCHEMA', 'SOURCE_UNRESOLVED_NO_MUTATION'];

/** Canonical capabilities the current production weapon schema cannot hold. */
export const CAPABILITIES = {
  'summary-field': ['No production slot for the derived short player summary.', 'Add a summary field (or flag) to the weapon item schema.'],
  'weapon-size-field': ['Production weapons carry no weapon size.', 'Add a weapon size field.'],
  'multiple-attack-profiles': ['Production has one attack (one damage/range/quality set); canonical identities may carry several profiles or modes.', 'Add attack/mode profile structures.'],
  'payload-profiles': ['Production has no delivery-system/payload separation.', 'Add payload profiles and a loaded-ammo reference model.'],
  'payload-derived-damage': ['Production stores a launcher damage string; canonical launcher damage is owned by the loaded payload.', 'Resolve damage through payload profiles.'],
  'non-dice-damage-model': ['Production damage is a single dice string.', 'Support none/special/modifier/inherited/alternate damage modes.'],
  'multi-type-damage': ['Production damageType is one string.', 'Support AND/OR/qualified/unspecified damage types.'],
  'stun-model': ['Production has no stun setting / native stun model.', 'Add stun setting and native-stun structures.'],
  'range-band-restrictions': ['Production has a range profile only; no allowed bands, fixed maximum or cone/area range rules.', 'Add range restriction structures.'],
  'area-geometry': ['Production has no structured area geometry.', 'Add area geometry per attack profile.'],
  'ammo-profiles': ['Production ammunition is one type/max pair.', 'Support multiple independent ammunition profiles.'],
  'operating-resource-model': ['Production has no operating-resource (energy cell etc.) model for non-ammunition power.', 'Add operating resource structures.'],
  'conditional-modifiers': ['Production has no conditional attack/damage modifier structures.', 'Add conditional modifier structures.'],
  'triggered-effects': ['Production has no triggered-effect structures.', 'Add triggered effect structures.'],
  'defensive-interactions': ['Production has no defensive-interaction structures.', 'Add defensive interaction structures.'],
  'wielding-rules': ['Production has no wielding/handedness rule structures.', 'Add wielding rule structures.'],
  'configuration-and-state': ['Production has no configuration/state-machine structures.', 'Add configuration/state structures.'],
  'critical-effects': ['Production has no critical-effect structures.', 'Add critical effect structures.'],
  'conditional-damage-and-qualities': ['Production has no conditional damage profile or conditional quality structures.', 'Add conditional damage/quality structures.'],
  'proficiency-rules': ['Production has one proficiency value.', 'Add conditional proficiency rule structures.'],
  'quality-parameters': ['Production traits are labels without parameters.', 'Add quality parameter structures (allowed bands, overrides).'],
  'construction-and-technology': ['Production has no construction/technology/delivery/durability/accessory structures.', 'Add those structures.'],
  'firing-constraints': ['Production has no firing-constraint or prepared-attack structures.', 'Add firing constraint structures.'],
  'damage-multiplier-and-range-rules': ['Production has no damage multiplier or conditional range rule structures.', 'Add those structures.'],
  'structured-special-rules': ['Canonical operation rules (free-form source mechanics) have no production structure.', 'Add structured special-rule storage.'],
  'size-variant-pricing': ['Production has one cost/weight; canonical identity varies by size.', 'Add size-variant pricing structures.'],
};

const QUALITY_LABELS = ['Accurate', 'Inaccurate', 'Area Effect', 'Double Weapon', 'Reach', 'Throwable', 'Autofire'];
const AVAIL_LABELS = ['Licensed', 'Restricted', 'Military', 'Illegal'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function expectedQualityLabels(i) {
  const q = i.qualities; const rof = i.canonicalStats.rateOfFire || [];
  const out = [];
  if (q.accurate) out.push('Accurate');
  if (q.inaccurate) out.push('Inaccurate');
  if (q.areaEffect) out.push('Area Effect');
  if (q.doubleWeapon) out.push('Double Weapon');
  if (q.reach) out.push('Reach');
  if (q.thrown) out.push('Throwable');
  if (q.autofireOnly || (Array.isArray(rof) && rof.includes('A'))) out.push('Autofire');
  return out.sort();
}
function repoQualityLabels(r) {
  const all = [...(r.system.traits || []), ...(r.system.properties || [])].map((t) => (t === 'Area Attack' ? 'Area Effect' : t));
  return [...new Set(all.filter((t) => QUALITY_LABELS.includes(t)))].sort();
}
function expectedAvailability(i) { const a = i.canonicalStats.availability; return { restriction: a.restriction, rare: !!a.rare }; }
function repoAvailability(r) {
  const all = [...(r.system.traits || []), ...(r.system.properties || [])];
  const rs = all.find((t) => AVAIL_LABELS.includes(t));
  return { restriction: rs ? rs.toLowerCase() : 'common', rare: all.includes('Rare') };
}

/** Which canonical mechanics the current production schema cannot represent. Returns { capability: [canonicalPaths] }. */
function unrepresentable(i) {
  const cs = i.canonicalStats; const out = {};
  const add = (c, p) => { (out[c] ||= []).push(p); };
  add('summary-field', 'summary');
  if (cs.size !== null && cs.size !== undefined) add('weapon-size-field', 'canonicalStats.size');
  if (cs.attackProfiles.length > 1 || cs.modeProfiles.length) add('multiple-attack-profiles', 'canonicalStats.attackProfiles/modeProfiles');
  if (cs.payloadProfiles.length || cs.ammo?.payloadDerived) add('payload-profiles', 'canonicalStats.payloadProfiles');
  if (['ammunition', 'special', 'varies-by-payload', 'varies'].includes(cs.baseDamage.mode)) add('payload-derived-damage', 'canonicalStats.baseDamage');
  else if (!['dice', 'fixed', 'double'].includes(cs.baseDamage.mode)) add('non-dice-damage-model', 'canonicalStats.baseDamage');
  const dt = cs.damageType;
  if (dt.mode !== 'single' || dt.qualifiers.length) add('multi-type-damage', 'canonicalStats.damageType');
  if (cs.stun.capability !== 'none') add('stun-model', 'canonicalStats.stun');
  const rg = cs.range;
  if (rg.mode === 'fixed-maximum' || rg.hardMaxSquares != null || (rg.allowedBands && rg.allowedBands.length !== 4) || cs.attackProfiles.some((p) => p.range.hardMaxSquares != null || (p.range.allowedBands && p.range.allowedBands.length !== 4))) add('range-band-restrictions', 'canonicalStats.range');
  if (cs.attackProfiles.some((p) => p.area.enabled)) add('area-geometry', 'canonicalStats.attackProfiles[].area');
  if (cs.ammo && (cs.ammo.mode === 'multiple' || cs.ammo.profiles)) add('ammo-profiles', 'canonicalStats.ammo.profiles');
  if (cs.resourceProfiles.length || (cs.ammo === null && !['none', 'unspecified', 'self-contained-weapon'].includes(cs.resource.kind))) add('operating-resource-model', 'canonicalStats.resource');
  if (cs.attackProfiles.some((p) => p.conditionalModifiers.length)) add('conditional-modifiers', 'canonicalStats.attackProfiles[].conditionalModifiers');
  if (cs.triggeredEffects.length || cs.attackProfiles.some((p) => p.triggeredEffects.length)) add('triggered-effects', 'canonicalStats.triggeredEffects');
  if (cs.defensiveInteractions.length) add('defensive-interactions', 'canonicalStats.defensiveInteractions');
  if (cs.wieldingRules.length) add('wielding-rules', 'canonicalStats.wieldingRules');
  if (cs.configurationStates.length || cs.stateMachine) add('configuration-and-state', 'canonicalStats.configurationStates/stateMachine');
  if (cs.attackProfiles.some((p) => p.criticalEffects.length)) add('critical-effects', 'canonicalStats.attackProfiles[].criticalEffects');
  if (i.conditionalDamageProfiles.length || i.conditionalQualities.length) add('conditional-damage-and-qualities', 'conditionalDamageProfiles/conditionalQualities');
  if (i.proficiencyRules.length) add('proficiency-rules', 'proficiencyRules');
  const qp = i.qualityParameters; if (qp && (qp.accurate || qp.inaccurate || qp.arc)) add('quality-parameters', 'qualityParameters');
  if (cs.constructionRules || cs.technologyClassification.tags.length || cs.technologyClassification.rules.length || cs.deliveryMethod || cs.objectDurability || cs.integratedAccessories.length) add('construction-and-technology', 'canonicalStats.constructionRules/technologyClassification/deliveryMethod/objectDurability/integratedAccessories');
  if (cs.attackProfiles.some((p) => p.firingConstraints || p.preparedAttack || p.activationRequirements.length)) add('firing-constraints', 'canonicalStats.attackProfiles[].firingConstraints/preparedAttack/activationRequirements');
  if (cs.attackProfiles.some((p) => p.damageMultiplier !== 1 || p.conditionalRangeRules.length)) add('damage-multiplier-and-range-rules', 'canonicalStats.attackProfiles[].damageMultiplier/conditionalRangeRules');
  if (Object.keys(i.operation || {}).length) add('structured-special-rules', 'operation');
  if (cs.variantsByWearerSize || cs.variantsByWeaponSize) add('size-variant-pricing', 'canonicalStats.variantsByWearerSize/variantsByWeaponSize');
  return out;
}

function compareIdentity(i, r) {
  const cs = i.canonicalStats; const fc = []; const actions = []; const blocked = [];
  const claims = i.sourceClaims.map((c) => `${c.book} p.${c.descriptionPage}`);
  const act = (type, canonicalPaths, repoPaths, reason, repr = 'DIFFERS', blockReason = null) => actions.push({ type, canonicalPaths, repoPaths, reason, sourceAuthority: claims, representability: repr, blocked: blockReason !== null, blockReason });
  const entry = (field, canonicalPath, repoPath, canonicalValue, repoValue, status, note = null) => fc.push({ field, canonicalPath, repoPath, canonicalValue, repoValue, status, ...(note ? { note } : {}) });
  const unrep = unrepresentable(i);

  // identity
  entry('name', 'canonicalName', 'name', i.canonicalName, r.name, i.canonicalName === r.name ? 'MATCH' : 'DIFFERS');
  if (i.canonicalName !== r.name) act('RENAME', ['canonicalName'], ['name'], `Production name "${r.name}" must become the canonical name "${i.canonicalName}" (id preserved).`);
  // texts
  const rt = txt(r.system.description);
  entry('playerText', 'canonicalPlayerText', 'system.description', i.canonicalPlayerText, rt, txt(i.canonicalPlayerText) === rt ? 'MATCH' : 'DIFFERS');
  if (txt(i.canonicalPlayerText) !== rt) act('UPDATE_PLAYER_TEXT', ['canonicalPlayerText'], ['system.description'], 'Production description differs from the certified canonical player text.');
  entry('summary', 'summary', null, i.summary, null, 'UNREPRESENTABLE_CURRENT_SCHEMA', 'No production summary slot.');
  act('UPDATE_SUMMARY', ['summary'], [], 'The certified short summary has no production field.', 'UNREPRESENTABLE_CURRENT_SCHEMA', 'summary-field');
  // cost / weight
  for (const [f, cp, rp, val, rv, sizeKey] of [['cost', 'canonicalStats.costCredits', 'system.cost', cs.costCredits, r.system.cost, 'cost'], ['weight', 'canonicalStats.weightKg', 'system.weight', cs.weightKg, r.system.weight, 'weight']]) {
    if (val === null) {
      if (cs.variantsByWearerSize || cs.variantsByWeaponSize) { entry(f, cp, rp, null, rv, 'UNREPRESENTABLE_CURRENT_SCHEMA', 'Size-variant pricing.'); act('UPDATE_STATS', [cp], [rp], `Canonical ${f} varies by size.`, 'UNREPRESENTABLE_CURRENT_SCHEMA', 'size-variant-pricing'); }
      else { entry(f, cp, rp, null, rv, 'SOURCE_UNRESOLVED_NO_MUTATION', 'The source publishes no value; the production value may not become canonical.'); blocked.push({ canonicalPath: cp, status: 'SOURCE_UNRESOLVED_NO_MUTATION', productionValueMayNotBecomeCanonical: true, repoValue: rv, reason: `The certified sources publish no ${f}.` }); }
    } else {
      const ok = Number(rv) === val; entry(f, cp, rp, val, rv, ok ? 'MATCH' : 'DIFFERS');
      if (!ok) act('UPDATE_STATS', [cp], [rp], `Production ${f} ${rv} differs from the certified ${val}.`);
    }
  }
  // damage
  const bd = cs.baseDamage;
  if (['dice', 'fixed', 'double'].includes(bd.mode)) {
    const ok = String(r.system.damage).replace(/\s/g, '').toLowerCase() === bd.formula.toLowerCase();
    entry('damage', 'canonicalStats.baseDamage.formula', 'system.damage', bd.formula, r.system.damage, ok ? 'MATCH' : 'DIFFERS');
    if (!ok) act('UPDATE_DAMAGE', ['canonicalStats.baseDamage'], ['system.damage', 'system.combat.damage.dice'], `Production damage "${r.system.damage}" differs from the certified ${bd.formula}.`);
  } else {
    entry('damage', 'canonicalStats.baseDamage', 'system.damage', bd.formula, r.system.damage, 'UNREPRESENTABLE_CURRENT_SCHEMA', `Canonical base damage mode "${bd.mode}".`);
    act('UPDATE_DAMAGE', ['canonicalStats.baseDamage'], ['system.damage'], `Canonical base damage mode "${bd.mode}" has no production representation.`, 'UNREPRESENTABLE_CURRENT_SCHEMA', unrep['payload-derived-damage'] ? 'payload-derived-damage' : 'non-dice-damage-model');
  }
  // damage type
  const dt = cs.damageType;
  if (dt.mode === 'single' && !dt.qualifiers.length) {
    const ok = r.system.damageType === dt.types[0]; entry('damageType', 'canonicalStats.damageType', 'system.damageType', dt.types[0], r.system.damageType, ok ? 'MATCH' : 'DIFFERS');
    if (!ok) act('UPDATE_DAMAGE_TYPE', ['canonicalStats.damageType'], ['system.damageType', 'system.combat.damage.type'], `Production damage type "${r.system.damageType}" differs from the certified "${dt.types[0]}".`);
  } else {
    entry('damageType', 'canonicalStats.damageType', 'system.damageType', dt, r.system.damageType, 'UNREPRESENTABLE_CURRENT_SCHEMA', 'AND/OR/qualified/unspecified damage types.');
    act('UPDATE_DAMAGE_TYPE', ['canonicalStats.damageType'], ['system.damageType'], 'Canonical damage type is not a single type.', 'UNREPRESENTABLE_CURRENT_SCHEMA', 'multi-type-damage');
  }
  // proficiency / category / range profile
  const sf = i.schemaFamily;
  const catOk = r.system.weaponCategory === sf.branch; entry('weaponCategory', 'schemaFamily.branch', 'system.weaponCategory', sf.branch, r.system.weaponCategory, catOk ? 'MATCH' : 'DIFFERS');
  if (!catOk) act('UPDATE_STATS', ['schemaFamily.branch'], ['system.weaponCategory'], `Production category "${r.system.weaponCategory}" differs from the certified "${sf.branch}".`);
  const profOk = r.system.proficiency === sf.proficiency; entry('proficiency', 'schemaFamily.proficiency', 'system.proficiency', sf.proficiency, r.system.proficiency, profOk ? 'MATCH' : 'DIFFERS');
  if (!profOk) act('UPDATE_STATS', ['schemaFamily.proficiency'], ['system.proficiency'], `Production proficiency "${r.system.proficiency}" differs from the certified "${sf.proficiency}".`);
  const rg = cs.range;
  if (rg.mode === 'unresolved' || (rg.mode === 'ranged' && rg.profileId === null)) {
    entry('rangeProfile', 'canonicalStats.range.profileId', 'system.rangeProfile', null, r.system.rangeProfile, 'SOURCE_UNRESOLVED_NO_MUTATION', 'The source assigns no range profile; the production value may not become canonical.');
    blocked.push({ canonicalPath: 'canonicalStats.range.profileId', status: 'SOURCE_UNRESOLVED_NO_MUTATION', productionValueMayNotBecomeCanonical: true, repoValue: r.system.rangeProfile, reason: i.ambiguities.find((a) => a.field === 'canonicalStats.range.profileId')?.detail || 'Source does not assign a range profile.' });
  } else if (rg.mode === 'fixed-maximum') {
    entry('rangeProfile', 'canonicalStats.range', 'system.rangeProfile', rg, r.system.rangeProfile, 'UNREPRESENTABLE_CURRENT_SCHEMA', 'Fixed-maximum / cone range.');
    act('UPDATE_RANGE', ['canonicalStats.range'], ['system.rangeProfile'], 'Fixed-maximum range has no production representation.', 'UNREPRESENTABLE_CURRENT_SCHEMA', 'range-band-restrictions');
  } else {
    const expected = rg.mode === 'melee' ? (sf.proficiency === 'advanced-melee' ? 'advanced-melee' : 'melee') : rg.profileId;
    const ok = r.system.rangeProfile === expected; entry('rangeProfile', 'canonicalStats.range.profileId', 'system.rangeProfile', expected, r.system.rangeProfile, ok ? 'MATCH' : 'DIFFERS');
    if (!ok) act('UPDATE_RANGE', ['canonicalStats.range.profileId'], ['system.rangeProfile', 'system.weaponType'], `Production range profile "${r.system.rangeProfile}" differs from the certified "${expected}".`);
    if (unrep['range-band-restrictions']) act('UPDATE_RANGE', ['canonicalStats.range'], ['system.rangeProfile'], 'Canonical allowed bands / hard maximum have no production representation.', 'UNREPRESENTABLE_CURRENT_SCHEMA', 'range-band-restrictions');
  }
  // qualities and availability
  const eq = expectedQualityLabels(i), rq = repoQualityLabels(r);
  entry('qualities', 'qualities', 'system.traits/properties', eq, rq, same(eq, rq) ? 'MATCH' : 'DIFFERS');
  if (!same(eq, rq)) act('UPDATE_QUALITIES', ['qualities'], ['system.traits', 'system.properties'], `Production quality labels ${JSON.stringify(rq)} differ from the certified ${JSON.stringify(eq)}.`);
  if (cs.availability.restriction === null) { entry('availability', 'canonicalStats.availability', 'system.traits', null, repoAvailability(r), 'SOURCE_UNRESOLVED_NO_MUTATION', 'The source publishes no availability.'); blocked.push({ canonicalPath: 'canonicalStats.availability', status: 'SOURCE_UNRESOLVED_NO_MUTATION', productionValueMayNotBecomeCanonical: true, repoValue: repoAvailability(r), reason: 'The certified sources publish no availability.' }); }
  else {
    const ea = expectedAvailability(i), ra = repoAvailability(r), ok = same(ea, ra); entry('availability', 'canonicalStats.availability', 'system.traits', ea, ra, ok ? 'MATCH' : 'DIFFERS');
    if (!ok) act('UPDATE_AVAILABILITY', ['canonicalStats.availability'], ['system.traits'], `Production availability ${JSON.stringify(ra)} differs from the certified ${JSON.stringify(ea)}.`);
  }
  // ammo
  const am = cs.ammo, pa = r.system.ammunition || {};
  if (am === null) {
    const ok = (pa.type === 'none' || pa.type === '' || pa.type === undefined) && !pa.max; entry('ammo', 'canonicalStats.ammo', 'system.ammunition', null, pa, ok ? 'MATCH' : 'DIFFERS');
    if (!ok) act('UPDATE_AMMO', ['canonicalStats.ammo'], ['system.ammunition'], 'A canonically ammo-free weapon carries production ammunition.');
  } else if (am.mode === 'multiple') {
    entry('ammo', 'canonicalStats.ammo', 'system.ammunition', am.profiles, pa, 'UNREPRESENTABLE_CURRENT_SCHEMA', 'Multiple independent ammunition systems.');
    act('UPDATE_AMMO', ['canonicalStats.ammo.profiles'], ['system.ammunition'], 'Multiple ammunition systems have no production representation.', 'UNREPRESENTABLE_CURRENT_SCHEMA', 'ammo-profiles');
  } else if (am.status === 'not-stated' || am.capacityShots === null) {
    entry('ammo', 'canonicalStats.ammo.capacityShots', 'system.ammunition.max', null, pa.max ?? null, 'SOURCE_UNRESOLVED_NO_MUTATION', am.status === 'self-contained' ? 'Self-contained; no loaded capacity.' : 'The source does not state ammunition type/capacity; the production value may not become canonical.');
    if (am.status !== 'self-contained') blocked.push({ canonicalPath: 'canonicalStats.ammo', status: 'SOURCE_UNRESOLVED_NO_MUTATION', productionValueMayNotBecomeCanonical: true, repoValue: pa, reason: am.sourceStatus || 'Ammunition type/capacity not stated by the source.' });
  } else {
    const ok = pa.max === am.capacityShots && pa.type && pa.type !== 'none'; entry('ammo', 'canonicalStats.ammo', 'system.ammunition', { type: am.type, capacityShots: am.capacityShots }, pa, ok ? 'MATCH' : (pa.max ? 'DIFFERS' : 'MISSING_IN_PRODUCTION'));
    if (!ok) act('UPDATE_AMMO', ['canonicalStats.ammo'], ['system.ammunition'], `Production ammunition ${JSON.stringify(pa)} does not carry the certified ${am.type} x ${am.capacityShots}.`);
  }
  // representability-blocked structural facets
  const mapAct = { 'multiple-attack-profiles': 'UPDATE_ATTACK_PROFILES', 'payload-profiles': 'UPDATE_PAYLOAD_PROFILES', 'operating-resource-model': 'UPDATE_RESOURCE_MODEL' };
  for (const [capId, paths] of Object.entries(unrep)) {
    if (mapAct[capId]) act(mapAct[capId], paths, [], CAPABILITIES[capId][0], 'UNREPRESENTABLE_CURRENT_SCHEMA', capId);
    else if (['conditional-modifiers', 'triggered-effects', 'defensive-interactions', 'wielding-rules', 'configuration-and-state', 'critical-effects', 'conditional-damage-and-qualities', 'proficiency-rules', 'quality-parameters', 'construction-and-technology', 'firing-constraints', 'damage-multiplier-and-range-rules', 'structured-special-rules', 'area-geometry', 'stun-model', 'size-variant-pricing', 'weapon-size-field'].includes(capId) && capId !== 'weapon-size-field') act('UPDATE_SPECIAL_MECHANICS', paths, [], CAPABILITIES[capId][0], 'UNREPRESENTABLE_CURRENT_SCHEMA', capId);
  }
  return { fc, actions, blocked, unrep };
}

export function buildPhase3C() {
  const p3bText = readText(P3B); const p3b = JSON.parse(p3bText);
  const auth = readJson(AUTH); const p01 = auth.phases['0-1-weapons'];
  const dbText = readText('data/audits/frozen/pre-cutover-weapons.db');
  const prod = dbText.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
  const weapons = prod.filter((r) => r.type === 'weapon'); const nonWeapons = prod.filter((r) => r.type !== 'weapon');
  const byId = new Map(weapons.map((r) => [r._id, r]));
  if (byId.size !== weapons.length) throw new Error('duplicate production ids');

  const ids = p3b.identities;
  const mappedIds = new Set(ids.filter((i) => i.repo.present).map((i) => i.repo.id));
  if (mappedIds.size !== ids.filter((i) => i.repo.present).length) throw new Error('one repo record claimed by two identities');
  for (const id of mappedIds) if (!byId.has(id)) throw new Error(`mapped repo id ${id} missing from packs/weapons.db`);

  // repo-only records (Phase 0 authority decides the intent; the scan supplies dependency evidence)
  const repoOnlyRaw = weapons.filter((r) => !mappedIds.has(r._id)).sort((a, b) => cmp(a._id, b._id));
  const p0 = new Map(p01.repoWeaponRecords.map((r) => [r.id, r]));
  const scanTargets = weapons.map((r) => ({ id: r._id, name: r.name }));
  const scan = scanReferences(ROOT, scanTargets);
  const refSummary = (id) => { const refs = scan.references.get(id) || []; return { referenceFileCount: new Set(refs.map((x) => x.file)).size, referenceTotal: refs.reduce((m, x) => m + x.count, 0), references: refs }; };
  const gate = (id) => { const s = refSummary(id); return { status: s.referenceTotal ? 'BLOCKED_PENDING_MIGRATION' : 'NO_REFERENCES_FOUND', ...s }; };

  const mergeBySurvivor = new Map();
  const repoOnlyRecords = repoOnlyRaw.map((r) => {
    const e = p0.get(r._id); if (!e || e.phase0Disposition !== 'REMOVE') throw new Error(`repo-only record ${r._id} lacks a Phase 0 REMOVE ruling`);
    const rec = { repoId: r._id, repoName: r.name, phase0: { disposition: e.phase0Disposition, executionAction: e.executionAction, reason: e.reason, referencedOutsideWeaponPacks: e.referencedOutsideWeaponPacks ?? null, executionBlockedBy: e.executionBlockedBy ?? null } };
    if (e.executionAction === 'CONSOLIDATE_DUPLICATE_AFTER_RUNTIME_MIGRATION') {
      const survivor = /survivor candidate is ([a-z0-9-]+)/.exec(e.reason)?.[1];
      const target = ids.find((i) => i.repo.present && i.repo.id === survivor);
      if (!target) throw new Error(`merge survivor ${survivor} for ${r._id} is not a canonical mapped record`);
      if (target.canonicalName !== e.canonicalMatch) throw new Error(`merge target mismatch for ${r._id}`);
      Object.assign(rec, { disposition: 'MERGE_INTO_CANONICAL', targetCanonicalIdentity: target.canonicalName, targetRepoId: survivor, reason: e.reason });
      if (!mergeBySurvivor.has(survivor)) mergeBySurvivor.set(survivor, []); mergeBySurvivor.get(survivor).push(r._id);
    } else if (e.executionAction === 'REMOVE_UNSUPPORTED_CHARACTER_WEAPON_RECORD' || e.executionAction === 'REMOVE_FROM_CHARACTER_WEAPON_CORPUS_ONLY') {
      Object.assign(rec, { disposition: 'REMOVE_UNSUPPORTED', reason: e.reason, removalScope: e.executionAction === 'REMOVE_FROM_CHARACTER_WEAPON_CORPUS_ONLY' ? 'character-weapon-corpus-only' : 'character-weapon-record' });
    } else throw new Error(`unclassified repo-only action ${e.executionAction}`);
    rec.dependencyGate = gate(r._id); rec.productionMutationAuthorized = false;
    return rec;
  });

  // canonical ledger
  const canonical = ids.map((i) => {
    const base = { identityKey: i.identityKey, canonicalName: i.canonicalName, sourceAuthority: { sourceClaims: i.sourceClaims.map((c) => ({ phase2: c.phase2, book: c.book, descriptionPage: c.descriptionPage, relationship: c.relationship })), phase3bRef: { file: P3B, identityKey: i.identityKey, sha256: sha(i) } }, repo: { present: i.repo.present, id: i.repo.id, currentName: i.repo.present ? byId.get(i.repo.id).name : null } };
    const unrepAll = unrepresentable(i);
    if (!i.repo.present) {
      const schemaRequirements = Object.entries(unrepAll).map(([c, paths]) => ({ canonicalPath: paths, requiredSchemaCapability: c, currentProductionLimitation: CAPABILITIES[c][0], futureMigrationRequirement: CAPABILITIES[c][1] }));
      return { ...base, primaryDisposition: 'CREATE', actions: [{ type: 'CREATE_RECORD', canonicalPaths: ['*'], repoPaths: [], reason: 'No certified production record exists for this canonical identity.', sourceAuthority: i.sourceClaims.map((c) => `${c.book} p.${c.descriptionPage}`), representability: 'MISSING_IN_PRODUCTION', blocked: false, blockReason: null }], fieldComparison: [{ field: 'record', canonicalPath: '*', repoPath: null, canonicalValue: i.canonicalName, repoValue: null, status: 'MISSING_IN_PRODUCTION' }], blockedFields: i.ambiguities.map((a) => ({ canonicalPath: a.field, status: 'SOURCE_UNRESOLVED_NO_MUTATION', productionValueMayNotBecomeCanonical: true, repoValue: null, reason: a.detail })), schemaRequirements, referenceDependencies: [], productionMutationAuthorized: false };
    }
    const r = byId.get(i.repo.id);
    const { fc, actions, blocked, unrep } = compareIdentity(i, r);
    const refs = scan.references.get(i.repo.id) || [];
    const renamed = actions.some((a) => a.type === 'RENAME');
    const nameRefs = refs.filter((x) => x.kind === 'name');
    const merged = mergeBySurvivor.get(i.repo.id) || null;
    if (renamed && nameRefs.length) actions.push({ type: 'REFERENCE_MIGRATION_REQUIRED', canonicalPaths: ['canonicalName'], repoPaths: ['name'], reason: `Name-based references to "${r.name}" exist outside the weapon pack and must be migrated with the rename.`, sourceAuthority: [], representability: 'DIFFERS', blocked: true, blockReason: 'BLOCKED_PENDING_MIGRATION' });
    if (merged) {
      for (const m of merged) {
        const mr = repoOnlyRecords.find((x) => x.repoId === m);
        actions.push({ type: 'MERGE_RECORDS', canonicalPaths: ['identityKey'], repoPaths: [`record:${m}`], reason: `Production record ${m} collapses into survivor ${i.repo.id}.`, sourceAuthority: [], representability: 'DIFFERS', blocked: mr.dependencyGate.status !== 'NO_REFERENCES_FOUND', blockReason: mr.dependencyGate.status === 'NO_REFERENCES_FOUND' ? null : mr.dependencyGate.status });
      }
    }
    const capIds = Object.keys(unrep);
    if (capIds.length) actions.push({ type: 'SCHEMA_MIGRATION_REQUIRED', canonicalPaths: Object.values(unrep).flat(), repoPaths: [], reason: `Production schema needs: ${capIds.join(', ')}.`, sourceAuthority: [], representability: 'UNREPRESENTABLE_CURRENT_SCHEMA', blocked: true, blockReason: 'schema-capabilities-missing' });
    // primary disposition
    const unresolvedConflict = (i.crossPublication.conflictHistory || []).some((h) => h.disposition !== 'RESOLVED_LATER_PUBLICATION_PRECEDENCE') || i.ambiguities.some((a) => /^CROSS_PUBLICATION/.test(a.status));
    const substantive = actions.filter((a) => !['RENAME', 'NO_CHANGE', 'REFERENCE_MIGRATION_REQUIRED'].includes(a.type));
    let primary;
    if (unresolvedConflict) primary = 'REVIEW_PRECEDENCE';
    else if (merged) primary = 'MERGE';
    else if (substantive.length) primary = 'UPDATE';
    else if (renamed) primary = 'RENAME';
    else primary = 'KEEP';
    if (primary === 'KEEP') actions.push({ type: 'NO_CHANGE', canonicalPaths: [], repoPaths: [], reason: 'Production already matches every production-representable canonical requirement.', sourceAuthority: [], representability: 'MATCH', blocked: false, blockReason: null });
    actions.sort((a, b) => cmp(a.type, b.type) || cmp(a.canonicalPaths.join(), b.canonicalPaths.join()));
    const ref = refSummary(i.repo.id);
    return {
      ...base, primaryDisposition: primary,
      ...(merged ? { mergeDetail: { survivorRepoId: i.repo.id, mergedRepoIds: [...merged].sort(), dependencyGate: { status: merged.some((m) => repoOnlyRecords.find((x) => x.repoId === m).dependencyGate.status === 'BLOCKED_PENDING_MIGRATION') ? 'BLOCKED_PENDING_MIGRATION' : 'NO_REFERENCES_FOUND' } } } : {}),
      actions, fieldComparison: fc, blockedFields: blocked,
      schemaRequirements: Object.entries(unrep).map(([c, paths]) => ({ canonicalPath: paths, requiredSchemaCapability: c, currentProductionLimitation: CAPABILITIES[c][0], futureMigrationRequirement: CAPABILITIES[c][1] })),
      referenceDependencies: ref.references, referenceSummary: { referenceFileCount: ref.referenceFileCount, referenceTotal: ref.referenceTotal },
      productionMutationAuthorized: false,
    };
  }).sort((a, b) => cmp(a.canonicalName, b.canonicalName) || cmp(a.identityKey, b.identityKey));

  const tally = (arr, f) => Object.fromEntries([...arr.reduce((m, x) => m.set(f(x), (m.get(f(x)) || 0) + 1), new Map())].sort((a, b) => cmp(a[0], b[0])));
  const capCounts = {}; for (const c of canonical) for (const s of c.schemaRequirements) capCounts[s.requiredSchemaCapability] = (capCounts[s.requiredSchemaCapability] || 0) + 1;
  const doc = {
    schemaVersion: 'weapon-phase-3c-production-disposition-ledger-v1', phase: '3C', family: 'weapons',
    status: 'WEAPON_PHASE_3C_PRODUCTION_DISPOSITION_LEDGER_CERTIFIED', authorityOnly: true, productionMutationAuthorized: false,
    inputs: { phase3b: { file: P3B, sha256: sha(p3bText) }, phase01Weapons: { sha256: sha(p01) }, production: { 'packs/weapons.db': sha(dbText), 'template.json': sha(readText('template.json')), weaponRecords: weapons.length, nonWeaponRecords: nonWeapons.length }, referenceScan: { trackedFilesScanned: scan.files, excluded: ['data/audits/', 'docs/', 'assets/', 'styles/', 'design-docs/', '.github/', 'the weapon audit builders/verifiers'], idMatch: 'exact id token', nameMatch: 'exact quoted name' } },
    counts: {
      canonicalIdentities: canonical.length, sourceClaims: p3b.counts.certifiedSourceClaims, repoPresent: canonical.filter((c) => c.repo.present).length, repoMissing: canonical.filter((c) => !c.repo.present).length,
      byPrimaryDisposition: Object.fromEntries(PRIMARY.map((p) => [p, canonical.filter((c) => c.primaryDisposition === p).length])),
      repoOnlyRecords: repoOnlyRecords.length, repoOnlyByDisposition: tally(repoOnlyRecords, (r) => r.disposition),
      identitiesWithSchemaRequirements: canonical.filter((c) => c.schemaRequirements.length).length, schemaRequirementsByCapability: Object.fromEntries(Object.entries(capCounts).sort((a, b) => cmp(a[0], b[0]))),
      identitiesWithBlockedFields: canonical.filter((c) => c.blockedFields.length).length, blockedFieldTotal: canonical.reduce((m, c) => m + c.blockedFields.length, 0),
      recordsWithDependencyGates: repoOnlyRecords.filter((r) => r.dependencyGate.status === 'BLOCKED_PENDING_MIGRATION').length,
      productionWeaponRecordsCovered: mappedIds.size + repoOnlyRecords.length,
    },
    schemaCapabilities: Object.fromEntries(Object.entries(CAPABILITIES).map(([k, v]) => [k, { identities: capCounts[k] || 0, currentProductionLimitation: v[0], futureMigrationRequirement: v[1] }])),
    outOfScopePackRecords: nonWeapons.map((r) => ({ repoId: r._id, repoName: r.name, type: r.type, owner: 'Phase 0-3G lightsaber components authority' })).sort((a, b) => cmp(a.repoId, b.repoId)),
    canonical,
    repoOnlyRecords,
  };
  const json = JSON.stringify(doc, null, 2) + '\n';

  // markdown
  const list = (arr, f) => (arr.length ? arr.map(f).join('\n') : '_none_');
  const cats = (c) => [...new Set(c.actions.filter((a) => a.type !== 'SCHEMA_MIGRATION_REQUIRED').map((a) => a.type))].join(', ');
  const md = `# Weapons Phase 3C — Production Disposition Ledger

**Status:** \`${doc.status}\` — authority-only; **productionMutationAuthorized = false**. Nothing in this ledger has been executed.

Generated deterministically by \`tools/build-item-weapons-phase-3c-production-disposition-ledger.mjs\` from the Phase 3B canonical authority and the current \`packs/weapons.db\`. Data: \`${OUT_JSON}\`.

## Summary

- Canonical identities: **${doc.counts.canonicalIdentities}** (${doc.counts.sourceClaims} source claims); repo-present ${doc.counts.repoPresent}, repo-missing ${doc.counts.repoMissing}
- Primary disposition: ${PRIMARY.map((p) => `${p} ${doc.counts.byPrimaryDisposition[p]}`).join(' · ')}
- Repo-only production weapon records: **${doc.counts.repoOnlyRecords}** (${Object.entries(doc.counts.repoOnlyByDisposition).map(([k, v]) => `${k} ${v}`).join(' · ')})
- Production weapon records covered: ${doc.counts.productionWeaponRecordsCovered} of ${doc.inputs.production.weaponRecords}; out-of-scope pack records: ${doc.outOfScopePackRecords.length}
- Identities with schema requirements: ${doc.counts.identitiesWithSchemaRequirements}; with blocked (source-unresolved) fields: ${doc.counts.identitiesWithBlockedFields} (${doc.counts.blockedFieldTotal} fields)
- Dependency-gated cleanup records: ${doc.counts.recordsWithDependencyGates}

## CREATE (${doc.counts.byPrimaryDisposition.CREATE})

${list(canonical.filter((c) => c.primaryDisposition === 'CREATE'), (c) => `- ${c.canonicalName}`)}

## MERGE

${list(canonical.filter((c) => c.primaryDisposition === 'MERGE'), (c) => `- **${c.canonicalName}** — survivor \`${c.mergeDetail.survivorRepoId}\`; merged ${c.mergeDetail.mergedRepoIds.map((m) => `\`${m}\``).join(', ')}; gate ${c.mergeDetail.dependencyGate.status}`)}

## RENAME-only

${list(canonical.filter((c) => c.primaryDisposition === 'RENAME'), (c) => `- ${c.repo.currentName} -> ${c.canonicalName}`)}

## KEEP

${list(canonical.filter((c) => c.primaryDisposition === 'KEEP'), (c) => `- ${c.canonicalName}`)}

## REVIEW_PRECEDENCE

${list(canonical.filter((c) => c.primaryDisposition === 'REVIEW_PRECEDENCE'), (c) => `- ${c.canonicalName}`)}

## UPDATE (${doc.counts.byPrimaryDisposition.UPDATE}) — action categories

${list(canonical.filter((c) => c.primaryDisposition === 'UPDATE'), (c) => `- ${c.canonicalName}: ${cats(c)}`)}

## Repo-only production records (reverse ledger)

${['MERGE_INTO_CANONICAL', 'REMOVE_UNSUPPORTED', 'RETAIN_SPECIAL_NONCANONICAL_ROLE', 'REVIEW_MAPPING'].map((d) => `### ${d} (${repoOnlyRecords.filter((r) => r.disposition === d).length})\n\n${list(repoOnlyRecords.filter((r) => r.disposition === d), (r) => `- \`${r.repoId}\` (${r.repoName})${r.targetCanonicalIdentity ? ` -> ${r.targetCanonicalIdentity} (\`${r.targetRepoId}\`)` : ''} — gate ${r.dependencyGate.status}, ${r.dependencyGate.referenceTotal} reference(s) in ${r.dependencyGate.referenceFileCount} file(s)`)}`).join('\n\n')}

## Blocked canonical fields (source-unresolved; production values may not become canonical)

${list(canonical.filter((c) => c.blockedFields.length), (c) => `- **${c.canonicalName}**: ${c.blockedFields.map((b) => b.canonicalPath).join(', ')}`)}

## Schema migration requirements (grouped)

${Object.entries(doc.schemaCapabilities).map(([k, v]) => `- \`${k}\` — ${v.identities} identities. ${v.currentProductionLimitation} Needed: ${v.futureMigrationRequirement}`).join('\n')}

## Dependency gates

Every repo-only cleanup record that is referenced outside the weapon pack stays \`BLOCKED_PENDING_MIGRATION\`; nothing is rewritten in Phase 3C.

${list(repoOnlyRecords, (r) => `- \`${r.repoId}\` — ${r.dependencyGate.status} (${r.dependencyGate.referenceTotal} reference(s), ${r.dependencyGate.referenceFileCount} file(s))`)}
`;
  return { doc, json, md };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = buildPhase3C(); const b = buildPhase3C();
  if (a.json !== b.json || a.md !== b.md) { console.error('FAIL: builder output is not deterministic'); process.exit(1); }
  if (process.argv.includes('--check')) {
    if (readText(OUT_JSON) !== a.json || readText(OUT_MD) !== a.md) { console.error('FAIL: committed Phase 3C files differ from the builder output; rebuild'); process.exit(1); }
    console.log(`Phase 3C ledger is current and byte-stable: ${a.doc.counts.canonicalIdentities} identities, ${a.doc.counts.repoOnlyRecords} repo-only records`);
  } else {
    fs.writeFileSync(path.join(ROOT, OUT_JSON), a.json); fs.writeFileSync(path.join(ROOT, OUT_MD), a.md);
    console.log(`Wrote ${OUT_JSON} and ${OUT_MD}\n${JSON.stringify(a.doc.counts, null, 1)}`);
  }
}
