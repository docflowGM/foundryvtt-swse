#!/usr/bin/env node
/**
 * Weapon three-gate audit -- Gate A: canonical registry -> production Item projection crosswalk.
 *
 *   node tools/audit-weapon-v2-gate-a-crosswalk.mjs            write data/audits/weapon-v2-3gate-gate-a-crosswalk.json
 *   node tools/audit-weapon-v2-gate-a-crosswalk.mjs --check    committed crosswalk is current
 *
 * For every production weapon Item (packs/weapons*.db) it records the canonical identity it binds to and compares the projected fields that
 * combat reads or displays (melee/ranged category, damage dice, damage type, weight, proficiency) against the canonical record. Each comparison
 * is one of: MATCH, KNOWN_CONVENTION (a documented, intentional projection difference), CANONICAL_NOT_COMPARABLE (the canonical side states no
 * ordinary value to compare), SOURCE_SILENT (the canonical side carries no value), or DIFFERENT (unexplained, itemized). Audit artifact only:
 * the registry stays the authority and nothing here edits a pack or a record. Input fingerprints are recorded so a changed input shows up.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from '../tests/helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from '../tests/helpers/foundry-shim/globals.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT_JSON = 'data/audits/weapon-v2-3gate-gate-a-crosswalk.json';
const sha = (rel) => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex').slice(0, 16);
const DICE = /^\d+d\d+([+-]\d+)?$/;
const PHYSICAL = new Set(['slashing', 'piercing', 'bludgeoning']);
const norm = (v) => String(v ?? '').replace(/\s/g, '').toLowerCase();
const typeSet = (v) => String(v ?? '').toLowerCase().split(/\s*(?:,|\/|\band\b|\bor\b)\s*/).map((x) => x.trim()).filter(Boolean).sort();

export async function buildCrosswalk() {
  globalThis.window = globalThis.window || {};
  registerFoundryPathLoader(); installFoundryShimGlobals();
  globalThis.ui = globalThis.ui ?? { notifications: { warn() {}, info() {}, error() {} } };
  const { registryData } = await import('../tests/helpers/weapon-runtime-fixture.mjs');
  const index = registryData.productionIdIndex ?? {};
  const byKey = Object.fromEntries(registryData.identities.map((r) => [r.identityKey, r]));
  const packFiles = fs.readdirSync(path.join(ROOT, 'packs')).filter((n) => n.endsWith('.db') && /^weapons/.test(n)).sort();
  const prod = new Map();
  for (const f of packFiles) for (const l of fs.readFileSync(path.join(ROOT, 'packs', f), 'utf8').split('\n').filter(Boolean)) { const d = JSON.parse(l); if (!prod.has(d._id)) prod.set(d._id, d); }

  const rows = []; const unbound = [];
  for (const [id, d] of [...prod].sort((a, b) => String(a[1].name).localeCompare(String(b[1].name)))) {
    const key = index[id];
    if (!key || !byKey[key]) { unbound.push({ productionId: id, name: d.name, type: d.type, category: d.system?.category ?? null }); continue; }
    const r = byKey[key]; const cs = r.canonicalStats ?? {};
    const profiles = cs.attackProfiles ?? [];
    const def = profiles.find((p) => p.id === (cs.defaultProfileId ?? profiles[0]?.id)) ?? profiles[0] ?? null;
    const sys = d.system ?? {};

    // melee / ranged category vs the default profile's range mode
    const cb = def?.range?.mode ?? null; const pb = sys.weaponCategory ?? null;
    const branch = !cb || !pb ? { result: 'SOURCE_SILENT' } : ((cb === 'melee') === (pb === 'melee') ? { result: 'MATCH' } : { result: 'DIFFERENT', item: pb, canonical: cb });

    // damage dice vs the default profile's ordinary dice
    const cf = String(def?.damage?.formula ?? '').replace(/\s/g, ''); const pf = String(sys.damage ?? '').replace(/\s/g, '');
    let dice;
    if (!DICE.test(cf)) dice = { result: 'CANONICAL_NOT_COMPARABLE', canonicalMode: def?.damage?.mode ?? null, item: pf || null };
    else if (cf === pf) dice = { result: 'MATCH' };
    else if (/^\d+d\d+(?:or\d+d\d+)+$/i.test(pf) && pf.toLowerCase().startsWith(cf.toLowerCase())) dice = { result: 'KNOWN_CONVENTION', why: 'the Item text encodes the alternative profiles ("A or B"); the canonical default profile states the first', item: pf, canonical: cf };
    else dice = { result: 'DIFFERENT', item: pf, canonical: cf };

    // damage type: the Item stores one display type; the canonical record states structured types
    const ct = (cs.damageType?.types ?? []).map((x) => String(x).toLowerCase()).sort(); const pt = typeSet(sys.damageType);
    let type;
    if (!ct.length || !pt.length) type = { result: 'SOURCE_SILENT' };
    else if (JSON.stringify(ct) === JSON.stringify(pt)) type = { result: 'MATCH' };
    else if (pt.every((t) => t === 'kinetic') && ct.some((t) => PHYSICAL.has(t))) type = { result: 'KNOWN_CONVENTION', why: 'D-016: the Item folds the physical subtypes (slashing / piercing / bludgeoning) into kinetic; the canonical record keeps the subtype', item: pt, canonical: ct };
    else if (pt.every((t) => ct.includes(t)) && ct.filter((t) => !pt.includes(t)).every((t) => PHYSICAL.has(t))) type = { result: 'KNOWN_CONVENTION', why: 'D-016: the Item lists a subset of the canonical types; the canonical record additionally keeps the physical subtype (e.g. a lightsaber is energy AND slashing)', item: pt, canonical: ct };
    else if (pt.every((t) => ct.includes(t) || (cs.damageType?.qualifiers ?? []).map((q) => String(q).toLowerCase()).includes(t))) type = { result: 'KNOWN_CONVENTION', why: 'the canonical record states a qualifier (e.g. sonic) on an energy type; the Item shows the qualifier as its type (damage-type-rules expands sonic into energy)', item: pt, canonical: ct, qualifiers: cs.damageType.qualifiers };
    else if (pt.includes('stun') && cs.stun) type = { result: 'KNOWN_CONVENTION', why: 'the Item shows stun as its type; the canonical record states the damage type and a stun capability / profile', item: pt, canonical: ct };
    else type = { result: 'DIFFERENT', item: pt, canonical: ct };

    // weight
    const cw = cs.weightKg; const pw = Number(sys.weight);
    const weight = cw === undefined || cw === null ? { result: 'SOURCE_SILENT' } : (Math.abs(Number(cw) - pw) < 0.01 ? { result: 'MATCH' } : { result: 'DIFFERENT', item: pw, canonical: Number(cw) });

    rows.push({ identityKey: key, productionId: id, name: d.name, defaultProfileId: def?.id ?? null, profileCount: profiles.length, branch, dice, damageType: type, weight });
  }

  const tally = (field) => Object.fromEntries(Object.entries(rows.reduce((a, r) => ((a[r[field].result] = (a[r[field].result] ?? 0) + 1), a), {})).sort());
  const different = Object.fromEntries(['branch', 'dice', 'damageType', 'weight'].map((f) => [f, rows.filter((r) => r[f].result === 'DIFFERENT').map((r) => ({ identityKey: r.identityKey, name: r.name, ...r[f] }))]));
  const boundKeys = new Set(rows.map((r) => r.identityKey));
  return {
    schemaVersion: 1, tool: 'tools/audit-weapon-v2-gate-a-crosswalk.mjs',
    inputs: { canonicalRegistry: { file: 'data/canonical/weapons.json', sha256_16: sha('data/canonical/weapons.json'), identities: registryData.identities.length }, productionPacks: packFiles.map((f) => ({ file: `packs/${f}`, sha256_16: sha(`packs/${f}`) })) },
    summary: {
      productionDocuments: prod.size, boundToCanonicalIdentity: rows.length, unbound: unbound.length,
      canonicalIdentities: registryData.identities.length, canonicalIdentitiesWithAProductionItem: boundKeys.size,
      identitiesWithoutAProductionItem: registryData.identities.filter((r) => !boundKeys.has(r.identityKey)).map((r) => r.identityKey),
      multiProfileIdentities: rows.filter((r) => r.profileCount > 1).length,
      branch: tally('branch'), dice: tally('dice'), damageType: tally('damageType'), weight: tally('weight'),
      unexplainedDifferences: Object.fromEntries(Object.entries(different).map(([k, v]) => [k, v.length])),
    },
    unbound, different, rows,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = JSON.stringify(await buildCrosswalk(), null, 2) + '\n';
  const file = path.join(ROOT, OUT_JSON);
  if (process.argv.includes('--check')) {
    if ((fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '') !== out) { console.error('Gate A crosswalk is STALE: run node tools/audit-weapon-v2-gate-a-crosswalk.mjs'); process.exit(1); }
    console.log('Gate A crosswalk: current');
  } else { fs.writeFileSync(file, out); console.log(`wrote ${OUT_JSON}`); }
}
