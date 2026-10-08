#!/usr/bin/env node
/**
 * Phase 5D-E -- deterministic special-mechanic census of every canonical weapon form (all 203 identities).
 *
 *   node tools/census-weapon-special-mechanics.mjs           write data/audits/weapon-phase-5d-e-special-mechanic-census.json
 *   node tools/census-weapon-special-mechanics.mjs --check   committed census is current
 *
 * Executed against the REAL runtime (buildAttackForms -> resolveCanonicalDamage -> extractSpecialMechanics) under the repo's Foundry
 * shim, so the census says exactly what the live attack pipeline would classify -- by structure, never by weapon name.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from '../tests/helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from '../tests/helpers/foundry-shim/globals.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT_JSON = 'data/audits/weapon-phase-5d-e-special-mechanic-census.json';

export async function buildCensus() {
  globalThis.window = globalThis.window || globalThis;
  registerFoundryPathLoader();
  installFoundryShimGlobals();
  globalThis.ui = globalThis.ui ?? { notifications: { warn() {}, info() {}, error() {} } };
  const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
  const { registry, registryData } = await import('../tests/helpers/weapon-runtime-fixture.mjs');
  rt.setSharedWeaponAuthorityRegistry(registry);
  const { FAMILIES } = rt;

  const byFamily = {}, byPolicy = {}, identities = {}, unclassified = [], completeness = [], refusedForms = [];
  let forms = 0, formsWithMechanics = 0, resolveErrors = [];
  for (const rec of registryData.identities) {
    const key = rec.identityKey;
    const weapon = { id: `w-${key}`, name: 'x', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: key } } }, system: {} };
    const offered = rt.buildAttackForms(weapon);
    const perWeapon = {};
    for (const f of offered.forms) {
      const payloadIds = offered.payloads.length ? offered.payloads.map((p) => p.payloadId) : [null];
      for (const payloadId of payloadIds) {
        forms += 1;
        const formRec = { identityKey: key, profileId: f.profileId, ...(f.configurationId ? { configurationId: f.configurationId } : {}), ...(f.modeId ? { modeId: f.modeId } : {}), ...(payloadId ? { payloadId } : {}) };
        let cd;
        try { cd = rt.resolveCanonicalDamage(weapon, { weaponForm: formRec }); }
        catch (e) { resolveErrors.push({ form: formRec, code: e.code ?? String(e.message) }); continue; }
        if (cd.status === 'no-damage' || cd.status === 'special') refusedForms.push({ ...formRec, status: cd.status, reason: cd.reason });
        if (cd.mechanics.length) formsWithMechanics += 1;
        if ((cd.status === 'no-damage' || cd.status === 'special') && !cd.specialEffects.length && !cd.mechanics.some((m) => m.family !== 'display-note' && m.family !== 'firing-constraint')) {
          completeness.push({ identityKey: key, form: [f.profileId, f.configurationId, f.modeId, payloadId].filter(Boolean).join('/'), id: 'form-without-damage-or-effect', issue: 'form has no ordinary damage and no structured effect; refused, nothing is invented' });
        }
        const label = [f.profileId, f.configurationId, f.modeId, payloadId].filter(Boolean).join('/');
        for (const m of cd.mechanics) {
          byFamily[m.family] = (byFamily[m.family] ?? 0) + 1;
          byPolicy[m.policy] = (byPolicy[m.policy] ?? 0) + 1;
          (perWeapon[label] ??= []).push(`${m.family}:${m.id}:${m.policy}`);
          if (m.family === 'unclassified') unclassified.push({ identityKey: key, form: label, id: m.id, source: m.source });
          if (m.completeness) completeness.push({ identityKey: key, form: label, id: m.id, issue: m.completeness });
        }
      }
    }
    if (Object.keys(perWeapon).length) identities[key] = Object.fromEntries(Object.entries(perWeapon).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, [...new Set(v)].sort()]));
  }
  const sort = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
  return {
    schemaVersion: 1,
    phase: '5D-E',
    purpose: 'Deterministic classification of every structured special mechanic of every offered canonical attack form (by structure, not name).',
    taxonomy: sort(Object.fromEntries(Object.entries(FAMILIES).map(([k, v]) => [k, { policy: v.policy, timing: v.timing, note: v.note }]))),
    totals: { identities: registryData.identities.length, identitiesWithMechanics: Object.keys(identities).length, forms, formsWithMechanics, resolveErrors: resolveErrors.length },
    mechanicsByFamily: sort(byFamily),
    mechanicsByPolicy: sort(byPolicy),
    refusedForms: refusedForms.sort((a, b) => (a.identityKey + a.profileId).localeCompare(b.identityKey + b.profileId)),
    unclassified: unclassified.sort((a, b) => (a.identityKey + a.id).localeCompare(b.identityKey + b.id)),
    completenessIssues: completeness.sort((a, b) => (a.identityKey + a.id).localeCompare(b.identityKey + b.id)),
    resolveErrors,
    identities: sort(identities),
  };
}

const serialize = (c) => `${JSON.stringify(c, null, 2)}\n`;
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const census = await buildCensus();
  const out = path.join(ROOT, OUT_JSON);
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(out) || fs.readFileSync(out, 'utf8') !== serialize(census)) { console.error(`${OUT_JSON} is stale; run node tools/census-weapon-special-mechanics.mjs`); process.exit(1); }
    console.log('weapon special-mechanic census: current');
  } else {
    fs.writeFileSync(out, serialize(census));
    console.log(`wrote ${OUT_JSON}`, census.totals, census.mechanicsByPolicy);
  }
}
