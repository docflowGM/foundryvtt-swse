#!/usr/bin/env node
/**
 * Phase 5D-G -- deterministic census of canonical attack forms: attack shape (single/area kinds/autofire), temporal firing constraints,
 * and which feat/talent selector rules are canonical-capable vs legacy text/name-dependent.
 *
 *   node tools/census-weapon-fire-state-area-selectors.mjs           write data/audits/weapon-phase-5d-g-attack-form-census.json
 *   node tools/census-weapon-fire-state-area-selectors.mjs --check   committed census is current
 *
 * Audit / verification artifact ONLY: no runtime module reads it and it is not a second gameplay authority.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from '../tests/helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from '../tests/helpers/foundry-shim/globals.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT_JSON = 'data/audits/weapon-phase-5d-g-attack-form-census.json';
const ndjson = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const inc = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };
const sorted = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));

export async function buildCensus() {
  globalThis.window = globalThis.window || globalThis;
  registerFoundryPathLoader(); installFoundryShimGlobals();
  globalThis.ui = globalThis.ui ?? { notifications: { warn() {}, info() {}, error() {} } };
  const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
  const { registry, registryData } = await import('../tests/helpers/weapon-runtime-fixture.mjs');
  rt.setSharedWeaponAuthorityRegistry(registry);

  const areaKinds = {}, fireModes = {}, temporal = {}, temporalForms = {}, areaWithoutGeometry = [], unconsumed = [];
  let forms = 0;
  for (const rec of registryData.identities) {
    const key = rec.identityKey;
    const weapon = { id: `w-${key}`, name: 'x', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: key } } }, system: {} };
    const offered = rt.buildAttackForms(weapon);
    for (const f of offered.forms) {
      for (const payloadId of (offered.payloads.length ? offered.payloads.map((p) => p.payloadId) : [null])) {
        const sel = { profileId: f.profileId, ...(f.configurationId ? { configurationId: f.configurationId } : {}), ...(f.modeId ? { modeId: f.modeId } : {}), ...(payloadId ? { payloadId } : {}) };
        let cd, runtime;
        try { cd = rt.resolveCanonicalDamage(weapon, { weaponForm: { identityKey: key, ...sel } }); runtime = cd.runtime; } catch { continue; }
        forms += 1;
        const shape = rt.resolveAttackShapeFor(runtime, sel);
        const label = `${key}/${[f.profileId, f.configurationId, f.modeId, payloadId].filter(Boolean).join('/')}`;
        inc(areaKinds, cd.areaShape.kind);
        if (cd.areaShape.completeness) areaWithoutGeometry.push(label);
        inc(fireModes, shape.fireModes.autofireOnly ? 'autofire-only' : shape.fireModes.autofire ? 'single+autofire' : 'single');
        if (!shape.temporal.length) inc(temporal, 'none');
        for (const t of shape.temporal) { inc(temporal, t.family); (temporalForms[t.family] ??= []).push(label); }
        // executable structured fields the runtime still does not consume
        const def = runtime.profile.definition;
        // Phase 5D-H: optional preparedAttack (prepared-attack temporal family) and firingConstraints.braceRule (shape.brace) have consumers
        // Phase 5D-H: optional preparedAttack (prepared-attack temporal family) and firingConstraints.braceRule (shape.brace) have consumers
      }
    }
  }
  // selector census over the shipped ability packs (rule fields by consumer capability)
  const selectorRules = { 'canonical-capable: selectedChoice / weapon-matches-selected-choice predicate / requiresFeatSelectedChoiceMatch': new Set(), 'legacy text: weaponGroups / groups / requiresWeaponGroups / excludesWeaponGroups': new Set(), 'legacy text: requiresWeaponText / weaponText': new Set() };
  const [A, B, C] = Object.keys(selectorRules);
  for (const pack of ['packs/feats.db', 'packs/talents.db']) {
    for (const doc of ndjson(pack)) {
      const m = doc.system?.abilityMeta ?? {};
      const rules = [...(m.rules ?? []), ...(m.modifiers ?? [])];
      for (const r of rules) {
        if (r.selectedChoice === true || r.requiresFeatSelectedChoiceMatch || (r.predicates ?? []).includes('attack.weapon-matches-selected-choice')) selectorRules[A].add(`${doc.type}:${doc.name}`);
        if (r.weaponGroups || r.groups || r.requiresWeaponGroups || r.excludesWeaponGroups) selectorRules[B].add(`${doc.type}:${doc.name}`);
        if (r.requiresWeaponText || r.weaponText) selectorRules[C].add(`${doc.type}:${doc.name}`);
      }
    }
  }
  // weapon->ability links by relation (the weapon names the ability it modifies; the link is keyed by the canonical ability name)
  const relations = {};
  for (const rec of registryData.identities) for (const a of rec.abilityInteractions ?? []) inc(relations, a.relation ?? 'unspecified');
  // Phase 5D-H: every relation whose policy has a consumer (the 5D-H closure census owns the full classification)
  const { RELATION_POLICY } = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/ability-relations.js');
  const consumedRelations = Object.entries(RELATION_POLICY).filter(([, p]) => !p.deferred && p.class !== 'DISPLAY_ONLY').map(([k]) => k).sort();

  return {
    schemaVersion: 1, phase: '5D-G',
    purpose: 'Audit/verification artifact only: attack shape, temporal constraints and selector capability of every offered canonical attack form. Not a gameplay authority.',
    totals: { identities: registryData.identities.length, forms },
    attackShape: { areaKinds: sorted(areaKinds), fireModes: sorted(fireModes), areaEnabledWithoutGeometry: areaWithoutGeometry.sort() },
    temporalConstraints: { families: sorted(temporal), forms: Object.fromEntries(Object.entries(temporalForms).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, [...new Set(v)].sort()])) },
    abilitySelectors: Object.fromEntries(Object.entries(selectorRules).map(([k, set]) => [k, [...set].sort()])),
    weaponAbilityRelations: { counts: sorted(relations), consumed: consumedRelations, unconsumed: Object.keys(relations).filter((r) => !consumedRelations.includes(r)).sort() },
    executableFieldsWithoutConsumers: unconsumed.sort((a, b) => (a.form + a.field).localeCompare(b.form + b.field)),
  };
}

const serialize = (c) => `${JSON.stringify(c, null, 2)}\n`;
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const census = await buildCensus();
  const out = path.join(ROOT, OUT_JSON);
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(out) || fs.readFileSync(out, 'utf8') !== serialize(census)) { console.error(`${OUT_JSON} is stale; run node tools/census-weapon-fire-state-area-selectors.mjs`); process.exit(1); }
    console.log('weapon fire-state/area/selector census: current');
  } else {
    fs.writeFileSync(out, serialize(census));
    console.log(`wrote ${OUT_JSON}`, JSON.stringify({ totals: census.totals, areaKinds: census.attackShape.areaKinds, fireModes: census.attackShape.fireModes, temporal: census.temporalConstraints.families }));
  }
}
