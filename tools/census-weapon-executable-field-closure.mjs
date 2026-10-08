#!/usr/bin/env node
/**
 * Phase 5D-H -- deterministic executable-field CLOSURE census of the canonical weapon system.
 *
 *   node tools/census-weapon-executable-field-closure.mjs           write data/audits/weapon-phase-5d-h-closure-census.json
 *   node tools/census-weapon-executable-field-closure.mjs --check   committed census is current AND has no unclassified residual
 *
 * Answers: which certified canonical weapon fields / relations / conditions / name-text sites still have no canonical runtime
 * consumer, and exactly why. Every nonzero residual is named with a reason and an owner; nothing is reclassified to "display"
 * to manufacture a zero. Audit / verification artifact ONLY: no runtime module reads it and it is not a gameplay authority.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { registerFoundryPathLoader } from '../tests/helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from '../tests/helpers/foundry-shim/globals.mjs';
import { HEURISTIC_RULES, HEURISTIC_CLASSES, FIELD_CONSUMERS, OPERATION_OWNERS, OPERATION_NON_EXECUTABLE, OPERATION_DUPLICATES, MANIFEST_OVERRIDES } from './lib/weapon-phase-5d-h-ledgers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT_JSON = 'data/audits/weapon-phase-5d-h-closure-census.json';
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));
const ndjson = (rel) => read(rel).split('\n').filter(Boolean).map((l) => JSON.parse(l));
const inc = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };
const sorted = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
const tok = (v) => String(v ?? '').trim().replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const isCommentLine = (t) => !t || t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');

/** The canonical-weapon combat execution files: weapon-runtime itself plus every approved runtime consumer. */
function consumerFiles() {
  const approved = [...read('tests/weapon-runtime-builder-negative.test.mjs').matchAll(/'(scripts\/[^']+\.js)'/g)].map((m) => m[1]);
  const runtime = execFileSync('git', ['ls-files', 'scripts/items/weapon-runtime'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter((f) => f.endsWith('.js'));
  return [...new Set([...approved, ...runtime])].filter((f) => fs.existsSync(path.join(ROOT, f))).sort();
}

// ---- section: name/text heuristic scan ------------------------------------------------------------------------------------------
const SCAN_PATTERNS = [
  ['name', /\b(weapon|item|feat|talent|ability|owned|i|f|t|w|entry)\??\.name\b/], ['weaponText', /\b(weaponText|weaponDamageText)\(/], ['description', /\.description\b/],
  ['system.proficient', /system\??\.proficient\b/], ['category', /\b(weaponCategory|\.subcategory)\b/], ['textMatchesAny', /\btextMatchesAny\(/],
];
function heuristicCensus(files) {
  const byClass = {}, residual = [], unclassified = [], sites = [];
  for (const f of files) {
    const lines = read(f).split('\n');
    lines.forEach((l, i) => {
      const t = l.trim();
      if (isCommentLine(t)) return;
      const hit = SCAN_PATTERNS.find(([, re]) => re.test(l));
      if (!hit) return;
      const rule = HEURISTIC_RULES.find(([fre, lre]) => fre.test(f) && lre.test(l));
      const label = `${f}:${i + 1}`;
      if (!rule) { unclassified.push({ site: label, pattern: hit[0], text: t.slice(0, 160) }); return; }
      const [, , cls, reason, owner] = rule;
      inc(byClass, cls);
      sites.push(cls);
      if (cls === 'CANONICAL_RESIDUAL') residual.push({ site: label, pattern: hit[0], reason, owner });
    });
  }
  return { totalSites: sites.length, byClass: sorted(byClass), canonicalResidualSites: residual, unclassified };
}

// ---- section: operation-key consumer census -------------------------------------------------------------------------------------
function operationCensus(files) {
  const fam = json('data/audits/weapon-phase-5b-special-mechanic-consumption.json').families.filter((f) => f.source.includes('operation.*'));
  const code = Object.fromEntries(files.map((f) => [f, read(f).split('\n').filter((l) => !isCommentLine(l.trim())).join('\n')]));
  const families = {};
  const unconsumedKeys = [], problems = [];
  for (const f of fam) {
    const row = { keys: f.operationKeys.length, identities: f.identityCount, consumed: [], duplicates: {}, nonExecutable: {}, executableUnconsumed: [], owner: OPERATION_OWNERS[f.mechanic] ?? null };
    for (const key of f.operationKeys) {
      const re = new RegExp(`\\b${key}\\b`);
      const evidence = files.filter((file) => re.test(code[file]));
      if (evidence.length) { row.consumed.push(key); continue; }
      const ne = OPERATION_NON_EXECUTABLE.find(([r]) => r.test(key));
      if (ne) { (row.nonExecutable[ne[1]] ??= []).push(key); continue; }
      const dup = OPERATION_DUPLICATES.find(([r]) => r.test(key));
      if (dup) {
        if (!read(dup[2]).includes(dup[3])) problems.push(`operation.${key}: duplicate carrier probe "${dup[3]}" not found in ${dup[2]}`);
        row.duplicates[key] = dup[1]; continue;
      }
      row.executableUnconsumed.push(key);
      unconsumedKeys.push(`${f.mechanic}.${key}`);
    }
    row.status = row.executableUnconsumed.length === 0 ? 'CONSUMED' : (row.consumed.length || Object.keys(row.duplicates).length) ? 'PARTIAL' : 'DEFERRED';
    families[f.mechanic] = row;
  }
  return { families, executableKeysUnconsumed: unconsumedKeys.sort(), problems };
}

// ---- section: field-family consumer map -----------------------------------------------------------------------------------------
function fieldConsumerMap(opCensus) {
  const map = json('data/audits/weapon-phase-5b-consumption-map.json');
  const rules = {};
  for (const e of map.entries) {
    const r = (rules[e.ruleId] ??= { classes: new Set(), paths: 0 });
    e.classification.forEach((c) => r.classes.add(c)); r.paths += 1;
  }
  const exec = Object.entries(rules).filter(([, r]) => r.classes.has('EXECUTION')).map(([id, r]) => ({ id, paths: r.paths })).sort((a, b) => a.id.localeCompare(b.id));
  const rows = [], problems = [];
  const withConsumer = [], partial = [], without = [];
  for (const { id, paths } of exec) {
    let led = FIELD_CONSUMERS[id];
    if (!led && id.startsWith('3b.operation.')) led = { status: 'OPERATION_FAMILY' };
    if (!led) { problems.push(`no consumer ledger entry for execution rule family ${id}`); continue; }
    let status = led.status, detail = {};
    if (status === 'OPERATION_FAMILY') {
      const fam = opCensus.families[id.replace('3b.operation.', '')];
      if (!fam) { status = 'CONSUMED'; detail = { note: 'operation container' }; }
      else { status = fam.status; detail = { consumedKeys: fam.consumed.length, nonExecutable: sorted(Object.fromEntries(Object.entries(fam.nonExecutable).map(([k, v]) => [k, v.length]))), executableUnconsumed: fam.executableUnconsumed, owner: fam.owner }; }
    } else if (led.file) {
      const src = read(led.file);
      if (!src.includes(led.probe)) problems.push(`${id}: probe "${led.probe}" not found in ${led.file}`);
      detail = { consumer: led.file, probe: led.probe, note: led.note ?? null, ...(led.consumed ? { consumed: led.consumed, deferred: led.deferred, owner: led.owner } : {}) };
    } else detail = { reason: led.reason, owner: led.owner, populatedIdentities: led.populatedIdentities ?? null };
    const bucket = status === 'CONSUMED' || status === 'CONSUMED_VIA_DUPLICATE' ? withConsumer : status === 'PARTIAL' ? partial : without;
    bucket.push(id);
    rows.push({ id, fieldPaths: paths, status, ...detail });
  }
  const certifiedFamilies = new Set(map.entries.map((e) => e.ruleId)).size;
  return {
    counters: {
      TOTAL_CERTIFIED_WEAPON_FIELD_FAMILIES: certifiedFamilies,
      EXECUTION_FIELD_FAMILIES: exec.length,
      EXECUTION_FIELD_FAMILIES_WITH_CONSUMER: withConsumer.length,
      EXECUTION_FIELD_FAMILIES_PARTIAL: partial.length,
      EXECUTION_FIELD_FAMILIES_WITHOUT_CONSUMER: without.length,
    },
    familiesWithoutConsumer: without, familiesPartial: partial, rows, problems,
  };
}

// ---- section: weapon <-> ability relations ---------------------------------------------------------------------------------------
async function relationCensus(registryData, RELATION_POLICY) {
  const counts = {};
  for (const rec of registryData.identities) for (const a of rec.abilityInteractions ?? []) inc(counts, a.relation ?? 'unspecified');
  const unclassified = Object.keys(counts).filter((r) => !RELATION_POLICY[r]).sort();
  const byClass = {}, deferred = [], consumed = [];
  for (const [rel, n] of Object.entries(counts)) {
    const p = RELATION_POLICY[rel]; if (!p) continue;
    inc(byClass, p.class);
    if (p.deferred) deferred.push({ relation: rel, instances: n, policy: p.policy, reason: p.deferred.reason, owner: p.deferred.owner });
    else if (p.class !== 'DISPLAY_ONLY') consumed.push({ relation: rel, instances: n, class: p.class, policy: p.policy, consumer: p.consumer });
  }
  return {
    distinctRelations: Object.keys(counts).length, instances: Object.values(counts).reduce((a, b) => a + b, 0), counts: sorted(counts), unclassified,
    byClass: sorted(byClass), executableConsumed: consumed.sort((a, b) => a.relation.localeCompare(b.relation)), executableDeferred: deferred.sort((a, b) => a.relation.localeCompare(b.relation)),
  };
}

// ---- section: legacy text-rule manifest ------------------------------------------------------------------------------------------
const NON_CANONICAL_DOMAIN = new Set(['unarmed', 'tool-appendage', 'appendage', 'weapon-emplacement', 'weapon-system', 'vehicle-weapon', 'vehicle', 'improvised']);
async function legacyManifest(rt, registry, registryData, descriptorMod) {
  const docs = new Map(ndjson('packs/weapons.db').map((d) => [d._id, d]));
  const cls = await import('/systems/foundryvtt-swse/scripts/engine/combat/weapon-target-gate-classifiers.js');
  const { descriptorMatchesAny, identitySlugSet, groupVocabSet } = descriptorMod;
  const opts = { wielderSize: 'medium', identitySlugs: identitySlugSet(registry), groupVocab: groupVocabSet(registry) };
  const records = [];
  for (const pack of ['packs/feats.db', 'packs/talents.db']) {
    for (const d of ndjson(pack)) {
      const m = d.system?.abilityMeta ?? {};
      for (const r of [...(m.rules ?? []), ...(m.modifiers ?? [])]) {
        for (const field of ['weaponGroups', 'groups', 'requiresWeaponGroups', 'excludesWeaponGroups', 'requiresWeaponText', 'weaponText']) {
          if (!r[field]) continue;
          records.push({ pack, doc: d, rule: r, field, kind: /Text$/.test(field) ? 'text' : 'group' });
        }
      }
    }
  }
  const rows = [];
  for (const { doc, rule, field, kind } of records) {
    const values = [].concat(rule[field]);
    const abilityKey = doc.flags?.swse?.id ?? doc.flags?.swse?.canonicalFeat?.identityKey ?? null;
    const lose = [], gain = []; let oldN = 0, newN = 0;
    for (const rec of registryData.identities) {
      const pd = docs.get(rec.repo?.id ?? rec.identityKey); if (!pd) continue;
      const item = { ...pd, type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: rec.identityKey } } } };
      const shape = rt.shapeOfWeapon(item, {});
      if (shape.source !== 'canonical') continue;
      const old = kind === 'group' ? cls.weaponMatchesGroup(pd, values, {}) : cls.textMatchesAny(cls.weaponText(pd), values);
      const nu = descriptorMatchesAny(shape.descriptor, values, { ...opts, forAbility: tok(doc.name) });
      if (old) oldN += 1; if (nu) newN += 1;
      if (old && !nu) lose.push(rec.identityKey); if (!old && nu) gain.push(rec.identityKey);
    }
    const tokens = values.map(tok);
    let group, why;
    if (tokens.every((t) => NON_CANONICAL_DOMAIN.has(t))) { group = 'C'; why = 'scope names a non-weapon / vehicle / improvised domain: no canonical weapon can match; text compatibility for homebrew only'; }
    else if (!abilityKey) { group = 'B'; why = 'ability record has no canonical identity (no flags.swse.id / canonicalFeat) -> DATA_COMPLETENESS; display-name fallback stays until the ability corpus stamps one'; }
    else if (oldN > 0 && newN === 0) { group = 'B'; why = 'scope vocabulary has no structured canonical equivalent -> DATA_COMPLETENESS'; }
    else if (lose.length >= 3 && newN < oldN / 2 && !tokens.some((t) => opts.identitySlugs.has(t) || opts.identitySlugs.has(t.replace(/s$/, '')))) { group = 'B'; why = `scope vocabulary is only partly structured: ${lose.length} previously text-matched canonical weapons have no structured selector for it -> DATA_COMPLETENESS (named in canonicalWeapons.lost)`; }
    else { group = 'A'; why = 'canonical ability identity + structured weapon descriptor/relations'; }
    if (MANIFEST_OVERRIDES[doc.name]) ({ group, why } = MANIFEST_OVERRIDES[doc.name]);
    rows.push({
      abilityType: doc.type, ability: doc.name, abilityIdentity: abilityKey, canonicalIdentityAvailable: !!abilityKey, ruleType: rule.type, field, scope: values,
      mechanic: rule.type, group, why, canonicalWeapons: { before: oldN, after: newN, lost: lose.sort(), gained: gain.sort() },
    });
  }
  rows.sort((a, b) => (a.ability + a.field).localeCompare(b.ability + b.field));
  const byGroup = {}; rows.forEach((r) => inc(byGroup, r.group));
  return { records: rows.length, byGroup: sorted({ A: 0, B: 0, C: 0, D: 0, ...byGroup }), rows };
}

export async function buildClosureCensus() {
  globalThis.window = globalThis.window || globalThis;
  registerFoundryPathLoader(); installFoundryShimGlobals();
  globalThis.ui = globalThis.ui ?? { notifications: { warn() {}, info() {}, error() {} } };
  const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
  const { RELATION_POLICY } = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/ability-relations.js');
  const descriptorMod = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/weapon-descriptor.js');
  const { registry, registryData } = await import('../tests/helpers/weapon-runtime-fixture.mjs');
  rt.setSharedWeaponAuthorityRegistry(registry);

  const files = consumerFiles();
  const heuristics = heuristicCensus(files);
  const operation = operationCensus(files);
  const fields = fieldConsumerMap(operation);
  const relations = await relationCensus(registryData, RELATION_POLICY);
  const manifest = await legacyManifest(rt, registry, registryData, descriptorMod);
  const cond = json('data/audits/weapon-phase-5b-r-condition-policy-census.json');
  const special = json('data/audits/weapon-phase-5d-e-special-mechanic-census.json');
  const g = json('data/audits/weapon-phase-5d-g-attack-form-census.json');

  const deferredMechanics = special.mechanicsByPolicy?.DEFER ?? 0;
  const counters = {
    ...fields.counters,
    EXECUTABLE_OPERATION_KEYS_UNCONSUMED: operation.executableKeysUnconsumed.length,
    EXECUTABLE_FORM_MECHANICS_DEFERRED: deferredMechanics,
    EXECUTABLE_RELATION_FAMILIES_DEFERRED: relations.executableDeferred.length,
    EXECUTABLE_RELATION_FAMILIES_UNCLASSIFIED: relations.unclassified.length,
    EXECUTABLE_CONDITIONS_AUTO: cond.counts?.AUTO ?? null,
    EXECUTABLE_CONDITIONS_PROMPT: cond.counts?.PROMPT ?? null,
    EXECUTABLE_CONDITIONS_DEFERRED: 0,
    EXECUTABLE_CONDITIONS_UNCLASSIFIED: heuristics.unclassified.length === 0 ? 0 : heuristics.unclassified.length,
    EXECUTABLE_CANONICAL_CONDITIONS_WITH_POLICY_UNSUPPORTED: cond.counts?.UNSUPPORTED ?? null,
    CANONICAL_NAME_TEXT_HEURISTIC_SITES: heuristics.canonicalResidualSites.length,
    LEGACY_ONLY_HEURISTIC_SITES: (heuristics.byClass.LEGACY_GATED ?? 0) + (heuristics.byClass.IDENTITY_FALLBACK ?? 0),
    AREA_ENABLED_FORMS_WITHOUT_GEOMETRY: g.attackShape.areaEnabledWithoutGeometry.length,
  };
  return {
    schemaVersion: 1, phase: '5D-H',
    purpose: 'Audit/verification artifact only: executable-field closure of the canonical weapon runtime. Every residual is named with a reason and an owner. Not a gameplay authority.',
    counters,
    fieldFamilies: fields,
    operationKeys: operation,
    relations,
    legacyRuleManifest: manifest,
    heuristics,
    areaGeometry: { formsWithoutGeometry: g.attackShape.areaEnabledWithoutGeometry, note: 'source-silent: published text gives no radius/shape (adhesive, CryoBan, remote grenades); the repeating carbine area is fire-mode derived (autofire 2x2), not intrinsic' },
    conditions: { policyCensus: { AUTO: cond.counts?.AUTO ?? null, PROMPT: cond.counts?.PROMPT ?? null, UNSUPPORTED: cond.counts?.UNSUPPORTED ?? null } },
    problems: [...fields.problems, ...operation.problems, ...heuristics.unclassified.map((u) => `unclassified heuristic site ${u.site}: ${u.text}`), ...relations.unclassified.map((r) => `unclassified relation ${r}`)],
  };
}

const serialize = (c) => `${JSON.stringify(c, null, 2)}\n`;
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const census = await buildClosureCensus();
  const out = path.join(ROOT, OUT_JSON);
  if (census.problems.length) { console.error(`closure census has unclassified residual:\n  ${census.problems.join('\n  ')}`); process.exit(2); }
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(out) || fs.readFileSync(out, 'utf8') !== serialize(census)) { console.error(`${OUT_JSON} is stale; run node tools/census-weapon-executable-field-closure.mjs`); process.exit(1); }
    console.log('weapon executable-field closure census: current');
  } else {
    fs.writeFileSync(out, serialize(census));
    console.log(`wrote ${OUT_JSON}`, JSON.stringify(census.counters));
  }
}
void HEURISTIC_CLASSES;
