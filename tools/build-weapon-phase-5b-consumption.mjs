#!/usr/bin/env node
// Phase 5B: canonical weapon consumption architecture -- schema field census, consumption map, special-mechanic consumption
// and the zero-orphan verifier. Read-only over the frozen authorities. Deterministic.
// Usage: node tools/build-weapon-phase-5b-consumption.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { RULES_3B, RULES_4H, STATES, CLASSES, classifyOperationKey } from './lib/weapon-phase-5b-rules.mjs';
import { buildRegistry } from './build-weapon-runtime-registry.mjs';
import { WeaponAuthorityRegistry, WeaponRuntimeResolver } from '../scripts/items/weapon-runtime/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P3B = 'data/audits/item-weapons-phase-3b-canonical-authority.json';
const P4H = 'data/audits/item-weapons-phase-4h-global-semantic-authority.json';
export const OUT_CENSUS = 'data/audits/weapon-phase-5b-schema-field-census.json';
export const OUT_MAP = 'data/audits/weapon-phase-5b-consumption-map.json';
export const OUT_MECH = 'data/audits/weapon-phase-5b-special-mechanic-consumption.json';
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const sortedSet = (s) => [...s].sort(cmp);

function census(records, ns) {
  const m = new Map();
  const walk = (v, p, id) => {
    const t = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
    let e = m.get(p);
    if (!e) { e = { n: 0, ids: new Set(), types: new Set(), samples: new Set() }; m.set(p, e); }
    e.n++; e.ids.add(id); e.types.add(t);
    if (t !== 'array' && t !== 'object' && t !== 'null' && e.samples.size < 40) e.samples.add(JSON.stringify(v).slice(0, 60));
    if (Array.isArray(v)) v.forEach((x) => walk(x, `${p}[]`, id));
    else if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], p ? `${p}.${k}` : k, id);
  };
  for (const r of records) walk(r, '', r.identityKey);
  m.delete('');
  return [...m.entries()].sort((a, b) => cmp(a[0], b[0])).map(([p, e]) => ({
    fieldPath: p, namespace: ns, sourceAuthority: ns === '3B' ? 'Phase 3B canonical mechanics' : 'Phase 4H semantic/selector/proficiency',
    occurrenceCount: e.n, identityCount: e.ids.size, valueTypes: sortedSet(e.types),
    sampleValues: sortedSet(e.samples).slice(0, 3), nullable: e.types.has('null'), conditional: e.ids.size < records.length,
  }));
}

function classify(entry) {
  const rules = entry.namespace === '3B' ? RULES_3B : RULES_4H;
  const p = entry.fieldPath;
  const op = /^operation\.([^.[]+)/.exec(p);
  if (entry.namespace === '3B' && (p === 'operation' || op)) {
    if (p === 'operation') return { ruleId: '3b.operation.container', classes: ['EXECUTION', 'DISPLAY'], consumers: ['special-mechanic families (see weapon-phase-5b-special-mechanic-consumption.json)'], state: 'NEW_CONSUMER_REQUIRED', phase: '5E/5F', resolvedAt: 'operation' };
    const f = classifyOperationKey(op[1]);
    if (!f) return null;
    return { ruleId: `3b.operation.${f.family}`, classes: f.classes, consumers: f.consumers, state: f.state, phase: f.phase, resolvedAt: 'operation', mechanicFamily: f.family };
  }
  for (const r of rules) if (r.re.test(p)) return { ruleId: r.id, classes: r.classes, consumers: r.consumers, state: r.state, phase: r.phase, resolvedAt: r.resolvedAt ?? null, runtimeCarried: r.runtimeCarried, note: r.note };
  return null;
}

// registry key that carries each root, and the ResolvedWeapon property that exposes it (challenge to the adapter design)
const REG_ROOT_3B = { identityKey: 'identityKey', canonicalName: 'canonicalName', repo: 'repo', sourceClaims: 'sourceClaims', firstPublication: 'firstPublication', canonicalPlayerText: 'canonicalPlayerText', summary: 'summary', weaponGroup: 'weaponGroup', schemaFamily: 'schemaFamily', canonicalStats: 'canonicalStats', qualities: 'qualities', conditionalQualities: 'conditionalQualities', conditionalDamageProfiles: 'conditionalDamageProfiles', proficiencyRules: 'proficiencyRules', operation: 'operation', sourceFootnotes: 'sourceFootnotes', qualityParameters: 'qualityParameters', qualityAuthority: 'qualityAuthority', ambiguities: 'ambiguities' };
const REG_ROOT_4H = { identityKey: 'identityKey', canonicalName: 'canonicalName', repo: 'repo', phase3B: 'provenance', categories: 'semantic', semantic: 'semantic', selectors: 'selectors', proficiency: 'proficiency', abilityInteractions: 'abilityInteractions', ontologyGapsAndUnrepresentedMechanics: 'ontologyGapsAndUnrepresentedMechanics', authorityDiscrepancies: 'authorityDiscrepancies', authorities: 'authorities' };
const RESOLVED_FOR_REG = { identityKey: 'identity', canonicalName: 'display', repo: 'provenance', sourceClaims: 'provenance', firstPublication: 'provenance', canonicalPlayerText: 'display', summary: 'display', weaponGroup: 'weaponGroup', schemaFamily: 'schemaFamily', canonicalStats: 'canonicalStats', qualities: 'qualities', conditionalQualities: 'conditionalQualities', conditionalDamageProfiles: 'conditionalDamageProfiles', proficiencyRules: 'proficiencyRules', operation: 'operation', sourceFootnotes: 'display', qualityParameters: 'qualityParameters', qualityAuthority: 'provenance', ambiguities: 'provenance', provenance: 'provenance', semantic: 'recommendation', selectors: 'selectors', proficiency: 'proficiency', abilityInteractions: 'abilityInteractions', ontologyGapsAndUnrepresentedMechanics: 'ontologyGaps', authorityDiscrepancies: 'authorityDiscrepancies', authorities: 'recommendation' };

export function buildAll() {
  const b = readJson(P3B), h = readJson(P4H);
  const c3 = census(b.identities, '3B'), c4 = census(h.records, '4H');
  const entries = [];
  const unclassified = [];
  for (const e of [...c3, ...c4]) {
    const k = classify(e);
    if (!k) { unclassified.push(`${e.namespace}:${e.fieldPath}`); continue; }
    entries.push({ ...e, ruleId: k.ruleId, classification: k.classes, consumers: k.consumers, implementationState: k.state, migrationPhase: k.phase, resolvedAt: k.resolvedAt, mechanicFamily: k.mechanicFamily ?? null, runtimeCarried: k.runtimeCarried === false ? false : true, note: k.note ?? null });
  }

  // adapter challenge: registry + ResolvedWeapon must carry/expose every runtime-consumed root
  const reg = new WeaponAuthorityRegistry(JSON.parse(JSON.stringify(buildRegistry())));
  const sample = new WeaponRuntimeResolver(reg).resolveIdentity('weapon-massassi-lanvarok');
  const regKeys = new Set(Object.keys(reg.getAll()[0]));
  const exposure = [];
  for (const e of entries) {
    const root = e.fieldPath.split(/[.[]/)[0];
    const regKey = e.namespace === '3B' ? REG_ROOT_3B[root] : REG_ROOT_4H[root];
    const resolvedKey = regKey ? RESOLVED_FOR_REG[regKey] : null;
    e.registryField = e.runtimeCarried ? (regKey ?? null) : null;
    e.resolvedProperty = e.runtimeCarried ? (resolvedKey ?? null) : null;
    if (e.runtimeCarried) {
      if (!regKey || !regKeys.has(regKey)) exposure.push(`${e.namespace}:${e.fieldPath} not carried by registry (${regKey})`);
      else if (!resolvedKey || !(resolvedKey in sample)) exposure.push(`${e.namespace}:${e.fieldPath} not exposed by ResolvedWeapon (${resolvedKey})`);
    } else if (!['VALIDATION_ONLY'].includes(e.implementationState)) exposure.push(`${e.namespace}:${e.fieldPath} deliberately not carried but not VALIDATION_ONLY`);
  }
  const invariants = {
    unclassifiedCertifiedFields: unclassified.length,
    unmappedCertifiedFields: entries.filter((e) => !e.consumers?.length).length,
    unexplainedCertifiedFields: entries.filter((e) => !STATES.includes(e.implementationState) || !e.classification.every((c) => CLASSES.includes(c)) || (e.implementationState === 'VALIDATION_ONLY' && !e.consumers.length)).length,
    adapterExposureGaps: exposure.length,
  };
  const failures = [...unclassified.map((x) => `unclassified ${x}`), ...exposure];

  const count = (f) => entries.reduce((m, e) => { for (const v of [].concat(f(e))) m[v] = (m[v] ?? 0) + 1; return m; }, {});
  const sortObj = (o) => Object.fromEntries(Object.entries(o).sort((a, b) => cmp(a[0], b[0])));
  const census3 = { schemaVersion: '5B.1', phase: '5B', family: 'weapons', purpose: 'Programmatic census of every field path present in the frozen Phase 3B and Phase 4H authorities. Paths normalise array indices to [].', identities: b.identities.length, inputs: { [P3B]: sha(fs.readFileSync(path.join(ROOT, P3B), 'utf8')), [P4H]: sha(fs.readFileSync(path.join(ROOT, P4H), 'utf8')) }, counts: { phase3BFieldPaths: c3.length, phase4HFieldPaths: c4.length, totalFieldPaths: c3.length + c4.length }, fields: [...c3, ...c4] };
  const map = {
    schemaVersion: '5B.1', phase: '5B', family: 'weapons',
    purpose: 'Every certified field path -> classification, concrete consumers, implementation state, migration phase, registry carrier and ResolvedWeapon exposure. EVERY FIELD IS USED (not: every field affects damage).',
    states: STATES, classes: CLASSES, invariants,
    summary: { fieldPaths: entries.length, byImplementationState: sortObj(count((e) => e.implementationState)), byClassification: sortObj(count((e) => e.classification)), byMigrationPhase: sortObj(count((e) => e.migrationPhase)), alreadyConsumedCorrectly: entries.filter((e) => e.implementationState === 'ALREADY_CONSUMED_CORRECTLY').length, existingConsumerWrongInput: entries.filter((e) => e.implementationState === 'EXISTING_CONSUMER_WRONG_INPUT').length, adapterRequired: entries.filter((e) => e.implementationState === 'ADAPTER_REQUIRED').length, newConsumerRequired: entries.filter((e) => e.implementationState === 'NEW_CONSUMER_REQUIRED').length, nonRuntimeDisposition: entries.filter((e) => ['DISPLAY_ONLY', 'STORE_ONLY', 'RECOMMENDATION_ONLY', 'VALIDATION_ONLY'].includes(e.implementationState)).length },
    entries: entries.map((e) => ({ path: `${e.namespace}:${e.fieldPath}`, classification: e.classification, consumers: e.consumers, implementationState: e.implementationState, migrationPhase: e.migrationPhase, ruleId: e.ruleId, mechanicFamily: e.mechanicFamily, registryField: e.registryField, resolvedProperty: e.resolvedProperty, runtimeCarried: e.runtimeCarried, note: e.note })),
  };

  // special mechanics: operation.* families + structured profile mechanics
  const fam = new Map();
  for (const e of entries) {
    if (!e.mechanicFamily) continue;
    const key = /^operation\.([^.[]+)/.exec(e.fieldPath)?.[1];
    if (!key) continue;
    const f = fam.get(e.mechanicFamily) ?? { keys: new Set(), ids: new Set() };
    f.keys.add(key);
    const ids = new Set(); for (const i of b.identities) if (i.operation && Object.prototype.hasOwnProperty.call(i.operation, key)) ids.add(i.identityKey);
    ids.forEach((x) => f.ids.add(x)); fam.set(e.mechanicFamily, f);
  }
  const opFamilies = [...fam.entries()].sort((a, c) => cmp(a[0], c[0])).map(([family, f]) => {
    const rule = classifyOperationKey([...f.keys][0]);
    return { mechanic: family, source: 'canonicalStats-adjacent operation.* (Phase 3B)', operationKeys: sortedSet(f.keys), identityCount: f.ids.size, identities: sortedSet(f.ids), currentRuntimeSupport: rule.support, futureConsumer: rule.consumers, implementationState: rule.state, migrationPhase: rule.phase };
  });
  const profileMech = (name, test, consumers, phase, support) => {
    const ids = new Set(); for (const i of b.identities) if (i.canonicalStats.attackProfiles.some(test) || test(i.canonicalStats)) ids.add(i.identityKey);
    return { mechanic: name, source: 'structured attack-profile / canonicalStats field', identityCount: ids.size, identities: sortedSet(ids), currentRuntimeSupport: support, futureConsumer: consumers, implementationState: 'NEW_CONSUMER_REQUIRED', migrationPhase: phase };
  };
  const has = (v) => Array.isArray(v) ? v.length > 0 : !!v && typeof v === 'object' && Object.keys(v).length > 0;
  const profileFamilies = [
    profileMech('alternate-defense-attack-resolution', (p) => p?.attackResolution?.defense && p.attackResolution.defense !== 'reflex', ['attack target-defense selection'], '5E', 'attack path always targets Reflex'),
    profileMech('attack-resolution-on-miss', (p) => p?.attackResolution?.onMiss && p.attackResolution.onMiss !== 'none', ['attack outcome resolver'], '5E', 'no weapon-driven onMiss'),
    profileMech('ignored-defense-components', (p) => has(p?.attackResolution?.ignoredDefenseComponents), ['defense calculation'], '5E', 'none'),
    profileMech('profile-area-geometry', (p) => p?.area?.enabled === true, ['area targeting'], '5E', 'area only via grenade/heavy heuristics'),
    profileMech('critical-effects', (p) => has(p?.criticalEffects), ['critical damage composition'], '5E', 'critRange ignored; no weapon critical effects'),
    profileMech('triggered-effects', (p) => has(p?.triggeredEffects), ['post-hit effect executor'], '5E', 'none'),
    profileMech('conditional-modifiers', (p) => has(p?.conditionalModifiers), ['condition evaluator'], '5E', 'none'),
    profileMech('activation-requirements', (p) => has(p?.activationRequirements), ['attack legality'], '5E', 'none'),
    profileMech('profile-prepared-attacks', (p) => !!p?.preparedAttack, ['prepared-attack workflow'], '5E', 'none'),
    profileMech('firing-constraints', (p) => !!p?.firingConstraints, ['attack legality'], '5E', 'none'),
    profileMech('profile-owned-damage-components', (p) => has(p?.damageComponents), ['damage packet components'], '5D', 'single damage component only'),
    profileMech('conditional-range-rules', (p) => has(p?.conditionalRangeRules), ['range resolver conditions'], '5E', 'none'),
    profileMech('modifier-policy', (p) => !!p?.modifierPolicy, ['attack modifier policy'], '5E', 'none'),
    profileMech('payload-profiles', (s) => has(s?.payloadProfiles), ['payload selection + resolveDamageProfile'], '5D/5E', 'none'),
    profileMech('configuration-states-and-state-machines', (s) => has(s?.configurationStates) || has(s?.stateMachine?.states), ['configuration engine'], '5E', 'none'),
    profileMech('wielding-rules', (s) => has(s?.wieldingRules), ['wield validation'], '5E', 'wieldedTwoHanded flag only'),
    profileMech('defensive-interactions', (s) => has(s?.defensiveInteractions), ['reaction eligibility'], '5E', 'name/text based'),
    profileMech('construction-rules', (s) => has(s?.constructionRules), ['crafting engine'], '5F', 'none'),
    profileMech('integrated-accessories', (s) => has(s?.integratedAccessories), ['customization workbench'], '5F', 'none'),
    profileMech('object-durability', (s) => has(s?.objectDurability), ['object damage rules'], '5F', 'none'),
    profileMech('damage-reduction-interaction', (s) => s?.damageReductionInteraction && s.damageReductionInteraction.mode !== 'normal', ['damage-reduction-resolver'], '5E', 'ignoresDR text/name heuristics'),
  ];
  const mech = { schemaVersion: '5B.1', phase: '5B', family: 'weapons', purpose: 'Every distinct structured mechanic family in the frozen authority that needs runtime capability beyond ordinary attack/damage, with the identities that use it, current runtime support, future consumer and migration phase. Drives Phase 5E/5F.', counts: { operationFamilies: opFamilies.length, profileMechanicFamilies: profileFamilies.length }, families: [...opFamilies, ...profileFamilies] };
  return { census: census3, map, mech, failures };
}

const ser = (o) => `${JSON.stringify(o, null, 1)}\n`;
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { census: c, map, mech, failures } = buildAll();
  const outs = [[OUT_CENSUS, ser(c)], [OUT_MAP, ser(map)], [OUT_MECH, ser(mech)]];
  if (failures.length) { console.error(`Phase 5B consumption verifier FAILED (${failures.length}):\n${failures.slice(0, 40).join('\n')}`); process.exit(1); }
  if (process.argv.includes('--check')) {
    for (const [f, t] of outs) if (!fs.existsSync(path.join(ROOT, f)) || fs.readFileSync(path.join(ROOT, f), 'utf8') !== t) { console.error(`${f} is stale`); process.exit(1); }
    console.log('Phase 5B consumption artifacts current; invariants', JSON.stringify(map.invariants));
  } else {
    for (const [f, t] of outs) fs.writeFileSync(path.join(ROOT, f), t);
    console.log('wrote 5B artifacts;', JSON.stringify(map.invariants), JSON.stringify(map.summary.byImplementationState));
  }
}
