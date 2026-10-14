#!/usr/bin/env node
/**
 * Hydrate every source-verified, once-published species from the reviewed Phase 4-B bundle as its sole canonical
 * complete-snapshot profile, and sync that species' base display fields from it.
 *
 *   node tools/hydrate-species-profiles.mjs <bundle.json> [--write] [--only ID,ID] [--also ID,ID]
 *
 * Skips Core Rulebook species (reconciled directly on their base records), species published in several profiles
 * (hydrated one profile at a time with add-species-snapshot-variant.mjs), and anything HoldProfile reports.
 * The bundle is local research material and is NOT committed. The committed output is the pack, plus the derived
 * regression fixture tests/fixtures/species-profile-expectations.json (ids, numbers and skill names only).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hydrateProfile, HoldProfile, slug } from './lib/species-profile-hydrator.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACK = path.join(ROOT, 'packs/species.db');
const FIXTURE = path.join(ROOT, 'tests/fixtures/species-profile-expectations.json');
const args = process.argv.slice(2);
const bundlePath = args.find(a => !a.startsWith('--'));
const write = args.includes('--write');
// Profiles of multi-publication species hydrated by this tool (each appended as one more verified version).
const also = new Set(args.includes('--also') ? args[args.indexOf('--also') + 1].split(',') : []);
const only = args.includes('--only') ? new Set(args[args.indexOf('--only') + 1].split(',')) : null;
if (!bundlePath) { console.error('usage: hydrate-species-profiles.mjs <bundle.json> [--write] [--only ID,ID]'); process.exit(2); }

const PROVENANCE = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/data/species-legacy-variant-provenance.json'), 'utf8'));
const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
const perIdentity = new Map();
for (const p of bundle.sourceProfiles) perIdentity.set(p.speciesAuditIdentityKey, (perIdentity.get(p.speciesAuditIdentityKey) ?? 0) + 1);

const lines = fs.readFileSync(PACK, 'utf8').split('\n');
const recs = lines.map(l => (l ? JSON.parse(l) : null));
const byId = new Map(recs.map((r, i) => [r?._id, i]));

const fixture = fs.existsSync(FIXTURE) ? JSON.parse(fs.readFileSync(FIXTURE, 'utf8')) : {};
const REGISTER = { 'UR-2B-13': 'SPECIES-RD-015', 'GAW-2I-02': 'SPECIES-RD-016', 'CW-2H-10': 'SPECIES-RD-017', 'JATM-2J-02': 'SPECIES-RD-018', 'UR-2B-12': 'SPECIES-RD-019' };
const done = [], held = [], heldMeta = [];
for (const profile of bundle.sourceProfiles) {
  if (only && !only.has(profile.sourceProfileId)) continue;
  const tag = `${profile.sourceProfileId} ${profile.speciesDisplayName}`;
  if (perIdentity.get(profile.speciesAuditIdentityKey) > 1 && !also.has(profile.sourceProfileId)) { held.push([tag, 'published in several profiles (separate path)', 'multi']); continue; }
  if (/^CORE-/.test(profile.sourceProfileId)) { held.push([tag, 'Core Rulebook species: reconciled on the base record', 'core']); continue; }
  const idx = byId.get(`species-${slug(profile.speciesDisplayName)}`);
  if (idx === undefined) { held.push([tag, 'no species record', 'technical']); continue; }
  const rec = recs[idx];
  let out;
  try { out = hydrateProfile(profile, rec, { provenance: PROVENANCE }); } catch (err) {
    if (err instanceof HoldProfile) { held.push([tag, REGISTER[profile.sourceProfileId] ? `${err.reason} — rules review: ${REGISTER[profile.sourceProfileId]}` : err.reason, 'technical']); continue; }
    throw err;
  }
  const { variant, expectation } = out;
  const multi = perIdentity.get(profile.speciesAuditIdentityKey) > 1;
  const legacyKept = (rec.system.variants ?? []).filter(v => v.completeSnapshot !== true);
  rec.system.variants = multi ? [...(rec.system.variants ?? []).filter(v => v.id !== variant.id), variant] : [...legacyKept, variant];
  if (!multi) {
    // Base display fields mirror the sole canonical profile (so lists/cards never show unprinted legacy data).
    Object.assign(rec.system, {
      abilityMods: variant.abilityMods, abilities: variant.abilities, size: variant.size, speed: variant.speed,
      movement: variant.movement, languages: variant.languages, special: variant.special,
      canonicalTraits: variant.traits.map(t => ({ ...t })), naturalWeapons: variant.naturalWeapons.map(w => ({ ...w })),
      abilityChoice: variant.abilityChoice ?? null,
    });
  }
  fixture[variant.id] = expectation;
  done.push([tag, variant.id, out.automation]);
}
if (write) {
  fs.writeFileSync(PACK, recs.map((r, i) => (r ? JSON.stringify(r) : lines[i])).join('\n'));
  fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
  fs.writeFileSync(FIXTURE, JSON.stringify(Object.fromEntries(Object.entries(fixture).sort(([a], [b]) => a.localeCompare(b))), null, 1) + '\n');
}
const STATUS = path.join(ROOT, 'docs/audits/swse-species-implementation-status.md');
const tally = (list, kind) => list.filter(h => h[2] === kind);
const allFeatures = done.flatMap(([, , auto]) => auto);
const featureCount = kind => allFeatures.filter(a => a.automation === kind).length;
const naturalAttacks = done.reduce((n, [, id]) => n + (fixture[id]?.naturalWeapons?.length ?? 0), 0);
if (write) {
  const rows = done.map(([tag, id, auto]) => {
    const cell = kinds => auto.filter(a => kinds.includes(a.automation)).map(a => a.feature).join(', ') || '—';
    const display = auto.filter(a => a.automation === 'display-only').map(a => `${a.feature} (${a.classification})`).join('; ') || '—';
    const natural = (fixture[id]?.naturalWeapons ?? []).map(w => `${w.name} ${w.damage} ${w.type}`).join(', ') || '—';
    return `| ${tag} | \`${id}\` | ${cell(['structured-rule', 'structured-field'])} | ${cell(['named-activation'])} | ${natural} | ${cell(['engine-suppressed'])} | ${display} |`;
  });
  const text = [
    '# Species implementation status (generated)',
    '',
    'Generated by `tools/hydrate-species-profiles.mjs` from the reviewed Phase 4-B audit (derived metadata only; no rules text).',
    'Every hydrated row is `SOURCE_VERIFIED` against the audit, `DATA_RECONCILED` in `packs/species.db` and `OFFLINE_TESTED`',
    '(`tests/species-profile-invariants.test.mjs`, a fixture generated by this same tool, plus the independently specified',
    '`tests/species-source-pinned.test.mjs`). None is `FOUNDRY_TESTED`.',
    '',
    '## Processing summary of the 129 audited profiles',
    '',
    '| Category | Profiles |',
    '|---|---|',
    `| Hydrated by the bulk tool | ${done.length} |`,
    `| Core Rulebook profiles reconciled earlier on their base records | ${tally(held, 'core').length} |`,
    `| Multi-publication profiles handled separately (Bith, Chadra-Fan, Chagrian, Chiss, Krevaaki, Neimoidian, Yuuzhan Vong) | ${tally(held, 'multi').length} |`,
    `| Technical holds | ${tally(held, 'technical').length} |`,
    '',
    '## Features of the hydrated profiles',
    '',
    '| Category | Features |',
    '|---|---|',
    `| Automated by a structured rule or field | ${featureCount('structured-rule') + featureCount('structured-field')} |`,
    `| Automated by a verified existing activated-ability entry | ${featureCount('named-activation')} |`,
    `| Natural attacks granted as species natural-weapon items (counted in attacks, not features) | ${naturalAttacks} |`,
    `| Existing engine automation known to be inaccurate — suppressed, text only | ${featureCount('engine-suppressed')} |`,
    `| Display-only (no automation) | ${featureCount('display-only')} |`,
    '',
    'Display-only includes natural-attack features whose secondary effects are not implemented; the attacks themselves are in the',
    'natural-attack column below.',
    '',
    '## Technical gaps (engineering, not rules questions)',
    '',
    '- Printed language choices (Nikto: "Nikto and either Basic or Huttese") are not modelled; only the fixed language is granted.',
    '- Conditional bonus feats are automated for the requirement types the existing resolver evaluates (skill trained, ability score minimum, base attack bonus minimum, feat owned). A printed "may take" option (Tof: Mighty Swing) is not an automatic grant and stays text; restricted pools and choices stay text. Feat-owned grants are re-checked when an actor update touches skills, attributes or level (adding only a feat item does not trigger a re-check).',
    '- Pacifism (Caamasi), Confusion (Yarkora), Force Blast (Felucian), Shapeshift (Clawdite), Natural Telepath (Draethos) and the other unverified engine entries are suppressed for published profiles because the engine behaviour differs from, or goes beyond, the audited text.',
    '- Darkvision / Low-light Vision, conditional skill bonuses and defenses, and activated abilities without a verified engine entry are display-only.',
    '- Small-size Stealth (+5) is a general size rule and is not applied by species data (see register RD-007).',
    '',
    `## Hydrated profiles (${done.length})`,
    '',
    '| Profile | Variant id | Structured (automated) | Verified activation | Natural attacks granted | Engine automation suppressed | Display-only |',
    '|---|---|---|---|---|---|---|',
    ...rows,
    '',
    `## Held and separately handled (${held.length})`,
    '',
    '| Profile | Category | Reason |',
    '|---|---|---|',
    ...held.map(([t, r, k]) => `| ${t} | ${k} | ${r} |`),
    '',
  ].join('\n');
  fs.writeFileSync(STATUS, text);
}
// Legacy variant provenance: annotate (never delete or rename) every legacy variant that has audited evidence.
let annotated = 0;
for (const entry of PROVENANCE) {
  const idx = byId.get(`species-${slug(entry.species)}`);
  const v = idx === undefined ? null : recs[idx].system.variants?.find(x => x.id === entry.variantId);
  if (!v) continue;
  if (entry.supersededBy) v.supersededBy = entry.supersededBy; else delete v.supersededBy;
  v.legacyProvenance = { classification: entry.classification, hideFromNewSelection: entry.hideFromNewSelection, matchedProfiles: entry.evidence.map(e => e.sourceProfileId) };
  annotated++;
}
if (write) fs.writeFileSync(PACK, recs.map((r, i) => (r ? JSON.stringify(r) : lines[i])).join('\n'));
console.log(`legacy variants annotated: ${annotated}`);
// Audit numbers for the profiles this tool does NOT hydrate (Core base records and the separately handled
// multi-publication snapshots) so they meet the same invariant standard (tests/species-audit-numbers.test.mjs).
if (write) {
  const NUMBERS = path.join(ROOT, 'tests/fixtures/species-audit-numbers.json');
  const out = {};
  for (const profile of bundle.sourceProfiles) {
    const kind = held.find(h => h[0].startsWith(profile.sourceProfileId + ' '))?.[2];
    if (kind !== 'core' && kind !== 'multi') continue;
    const snap = profile.sourceRuleSnapshot;
    const A = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
    out[profile.sourceProfileId] = {
      species: profile.speciesDisplayName,
      variantId: kind === 'multi' || ['CORE-2A-20', 'CORE-2A-21'].includes(profile.sourceProfileId) ? `${slug(profile.speciesDisplayName)}-${profile.sourceProfileId.toLowerCase()}` : null,
      abilityMods: Object.fromEntries(A.map(k => [k.toLowerCase(), snap.abilityModifiers?.[k] ?? 0])),
      size: snap.size, speed: snap.movementSquares?.land ?? null,
      languages: (snap.automaticLanguages ?? []).map(l => l.name),
      naturalAttacks: (snap.naturalAttackProfiles ?? []).length,
    };
  }
  fs.writeFileSync(NUMBERS, JSON.stringify(out, null, 1) + '\n');
}
const counts = {};
for (const [, , auto] of done) for (const a of auto) counts[a.automation] = (counts[a.automation] ?? 0) + 1;
console.log(`${write ? 'WROTE' : 'dry run:'} ${done.length} hydrated, ${held.length} held; feature automation`, counts);
const heldReasons = {};
for (const [, r] of held) heldReasons[r.replace(/legacy variant.*/, 'legacy variant(s) pending provenance reconciliation')] = (heldReasons[r.replace(/legacy variant.*/, 'legacy variant(s) pending provenance reconciliation')] ?? 0) + 1;
console.log(heldReasons);
if (args.includes('--list')) { for (const [t, r] of held) console.log('HELD', t, '-', r); }
