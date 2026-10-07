#!/usr/bin/env node
// Phase 5A (read-only): what the FROZEN canonical weapon schema (Phase 3B + 4H) can express, measured over the 203 identities,
// so the runtime adapter contract is designed against facts. Mutates nothing.
// Usage: node tools/audit-weapon-phase-5a-schema-census.mjs [--out <file>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const J = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const nonEmpty = (v) => v !== null && v !== undefined && !(Array.isArray(v) && !v.length);
const tally = (xs) => { const m = {}; for (const x of xs) m[x] = (m[x] || 0) + 1; return Object.fromEntries(Object.entries(m).sort((a, b) => cmp(a[0], b[0]))); };

export const PROBES = ['Atlatl', 'Cesta', 'Massassi Lanvarok', 'Siang Lance', 'Sith Lanvarok', 'Concealed Dart Launcher', 'Wrist Rocket Launcher', 'Amphistaff', 'Energy Lance', 'Vibrobayonet', 'Double Vibroblade', 'Zhaboka'];

export function census() {
  const b3 = J('data/audits/item-weapons-phase-3b-canonical-authority.json').identities;
  const g4 = J('data/audits/item-weapons-phase-4h-global-semantic-authority.json').records;
  const g = new Map(g4.map((r) => [r.identityKey, r]));
  const idents = b3.map((i) => ({ i, g: g.get(i.identityKey) }));
  const top = {}, prof = {};
  for (const { i } of idents) {
    for (const [k, v] of Object.entries(i.canonicalStats)) top[k] = (top[k] || 0) + (nonEmpty(v) ? 1 : 0);
    for (const p of i.canonicalStats.attackProfiles) for (const [k, v] of Object.entries(p)) prof[k] = (prof[k] || 0) + (nonEmpty(v) ? 1 : 0);
  }
  const multi = idents.filter(({ i }) => i.canonicalStats.attackProfiles.length > 1).map(({ i }) => i.identityKey).sort(cmp);
  const crossBranch = idents.filter(({ i }) => new Set(i.canonicalStats.attackProfiles.map((p) => p.schemaFamily.branch)).size > 1).map(({ i }) => i.identityKey).sort(cmp);
  const profileSpecificProficiency = idents.filter(({ i }) => new Set(i.canonicalStats.attackProfiles.map((p) => p.schemaFamily.proficiency)).size > 1).map(({ i }) => i.identityKey).sort(cmp);
  // 3B attack profiles vs 4H selector modes (profile-bearing selectors) — consistency evidence
  const modeCount = (r) => { const q = r.authorities.find((a) => a.primary)?.ruleSelectors || {}; return [q.modes, q.modeSelectors, q.profileSelectors].filter(Array.isArray).reduce((n, a) => n + a.length, 0); };
  const profileVsModes = idents.map(({ i, g: r }) => ({ identityKey: i.identityKey, canonicalName: i.canonicalName, profiles3B: i.canonicalStats.attackProfiles.map((p) => `${p.id}:${p.schemaFamily.branch}/${p.schemaFamily.proficiency}`), modes4H: modeCount(r) })).filter((x) => x.modes4H > 0 && x.modes4H !== x.profiles3B.length).sort((a, b) => cmp(a.identityKey, b.identityKey));
  const probe = PROBES.map((n) => {
    const x = idents.find(({ i }) => i.canonicalName === n); if (!x) return { canonicalName: n, missing: true };
    const { i, g: r } = x, q = r.authorities.find((a) => a.primary).ruleSelectors || {};
    return {
      canonicalName: n, identityKey: i.identityKey, weaponGroup: i.weaponGroup,
      attackProfiles3B: i.canonicalStats.attackProfiles.map((p) => ({ id: p.id, kind: p.kind, branch: p.schemaFamily.branch, proficiency: p.schemaFamily.proficiency, range: `${p.range.mode}${p.range.profileId ? '/' + p.range.profileId : ''}`, damage: `${p.damage.mode}:${p.damage.formula}`, qualities: Object.entries(p.qualities).filter(([, v]) => v).map(([k]) => k), resolution: `${p.attackResolution.mode}/${p.attackResolution.defense}` })),
      payloadProfiles3B: i.canonicalStats.payloadProfiles.map((p) => p.id), modes4H: (q.modes || q.modeSelectors || q.profileSelectors || []).map((m) => m.mode || m.profile), payloads4H: (q.payloads || []).concat((q.payloadProfiles || []).map((p) => `payload:${p.id}`)),
      alternateRoutes: { speciesOverrides: (q.speciesOverrides || []).map((o) => o.species), abilityOverrides: (q.abilityOverrides || []).map((o) => o.ability) },
    };
  });
  return {
    identities: b3.length,
    canonicalStatsFieldsNonEmpty: Object.fromEntries(Object.entries(top).sort((a, b) => cmp(a[0], b[0]))),
    attackProfileFieldsNonEmpty: Object.fromEntries(Object.entries(prof).sort((a, b) => cmp(a[0], b[0]))),
    profilesPerIdentity: tally(idents.map(({ i }) => i.canonicalStats.attackProfiles.length)),
    profileKinds: tally(idents.flatMap(({ i }) => i.canonicalStats.attackProfiles.map((p) => p.kind))),
    attackResolution: tally(idents.flatMap(({ i }) => i.canonicalStats.attackProfiles.map((p) => `${p.attackResolution.mode}/${p.attackResolution.defense}`))),
    rangeModes: tally(idents.map(({ i }) => `${i.canonicalStats.range.mode}/${i.canonicalStats.range.profileId ?? '-'}`)),
    baseDamageModes: tally(idents.map(({ i }) => i.canonicalStats.baseDamage.mode)),
    damageTypeModes: tally(idents.map(({ i }) => i.canonicalStats.damageType.mode)),
    ammoModes: tally(idents.map(({ i }) => (i.canonicalStats.ammo ? `${i.canonicalStats.ammo.mode}/${i.canonicalStats.ammo.status}` : 'none'))),
    stunCapabilities: tally(idents.map(({ i }) => i.canonicalStats.stun.capability)),
    multiProfileIdentities: multi,
    crossBranchIdentities: crossBranch,
    profileSpecificProficiencyIdentities: profileSpecificProficiency,
    profileCountDisagreementsBetween3BAndAuthored4HModes: profileVsModes,
    probes: probe,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const c = census(); const i = process.argv.indexOf('--out');
  if (i > 0) fs.writeFileSync(process.argv[i + 1], JSON.stringify(c, null, 1));
  console.log(JSON.stringify({ identities: c.identities, profilesPerIdentity: c.profilesPerIdentity, multi: c.multiProfileIdentities.length, crossBranch: c.crossBranchIdentities, profileSpecificProficiency: c.profileSpecificProficiencyIdentities, disagreements: c.profileCountDisagreementsBetween3BAndAuthored4HModes, ammoModes: c.ammoModes, stun: c.stunCapabilities, rangeModes: c.rangeModes }, null, 1));
}
