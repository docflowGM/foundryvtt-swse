#!/usr/bin/env node
/**
 * Add (or replace) ONE complete-snapshot variant on a species record in
 * packs/species.db from a reviewed source-profile JSON (Phase 4-B bundle).
 * Additive: base record fields and other variants are never modified.
 *
 *   node tools/add-species-snapshot-variant.mjs <bundle.json> <sourceProfileId> [--write]
 *
 * Dry-run by default. The bundle is local research material and is NOT
 * committed to the repo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACK = path.join(ROOT, 'packs/species.db');
const [bundlePath, profileId, flag] = process.argv.slice(2);
if (!bundlePath || !profileId) { console.error('usage: add-species-snapshot-variant.mjs <bundle.json> <sourceProfileId> [--write]'); process.exit(2); }

const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
const profile = bundle.sourceProfiles.find(p => p.sourceProfileId === profileId);
if (!profile) throw new Error(`unknown sourceProfileId ${profileId}`);
if (profile.disposition === 'DEFERRED_DROID_INTEGRATION') throw new Error('droid profiles are deferred');
const snap = profile.sourceRuleSnapshot;
if (snap.abilityModifierVariants?.length || snap.abilityScoreGeneration || snap.sizeVariation || snap.naturalAttackProfiles.length)
  throw new Error(`${profileId} needs choice/natural-weapon support; not handled by this tool yet`);

const lines = fs.readFileSync(PACK, 'utf8').split('\n');
const idx = lines.findIndex(l => l && JSON.parse(l)._id === `species-${slug(profile.speciesDisplayName)}`);
if (idx < 0) throw new Error(`no species record for ${profile.speciesDisplayName}`);
const rec = JSON.parse(lines[idx]);

const A = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
const abilityMods = Object.fromEntries(A.map(k => [k.toLowerCase(), snap.abilityModifiers[k]]));
const abilityText = A.filter(k => snap.abilityModifiers[k]).sort((a, b) => snap.abilityModifiers[b] - snap.abilityModifiers[a])
  .map(k => `${snap.abilityModifiers[k] > 0 ? '+' : ''}${snap.abilityModifiers[k]} ${k[0] + k.slice(1).toLowerCase()}`).join(', ');
const m = snap.movementSquares;
// An unprinted/unresolved speed is held for review, never defaulted to 0.
if (!Number.isFinite(m?.land)) throw new Error(`${profileId}: land speed is not printed/resolved (${JSON.stringify(m)}); hold for review`);
if (A.some(k => !Number.isFinite(snap.abilityModifiers?.[k]))) throw new Error(`${profileId}: incomplete ability modifiers; hold for review`);
const movement = { walk: m.land ?? null, swim: m.swim ?? null, fly: m.fly ?? null, climb: null, hover: null, glide: null, burrow: null, bySize: {} };
const traits = snap.features.map(f => ({ id: slug(f.name), name: f.name, description: f.publishedRule }));

const shortPublication = String(profile.publication).replace(/^Star Wars Roleplaying Game: Saga Edition\s+/i, '').replace(/\s*\(\d{4}\)\s*$/, '');

// Starting-proficiency suppression (printed as "Primitive" / a Technophobic variant): carry it as the same
// primitive + suppressedClassProficiencies rule fields the base records use.
const SUPPRESSION = new Set(['STARTING_PROFICIENCY_SUPPRESSION', 'STARTING_CLASS_FEAT_OVERRIDE']);
const titleCase = text => String(text).replace(/\b([a-z])/g, c => c.toUpperCase());
const suppressionFeature = snap.features.find(f => SUPPRESSION.has(f.classification));
const suppressed = suppressionFeature
  ? (suppressionFeature.mechanics?.suppressedStartingClassFeats || suppressionFeature.mechanics?.suppressStartingClassBonusFeats || [])
      .map(name => titleCase(name))
  : [];
if (suppressionFeature && !suppressed.length) throw new Error(`${profileId}: suppression feature without a feat list; hold for review`);

const variant = {
  id: `${slug(profile.speciesDisplayName)}-${profileId.toLowerCase()}`,
  label: profile.publication,
  source: shortPublication,
  completeSnapshot: true,
  sourceProfileId: profileId,
  size: snap.size,
  speed: m.land,
  movement,
  abilities: abilityText,
  abilityMods,
  abilityChoice: null,
  skillBonuses: [],
  special: traits.map(t => t.name),
  languages: snap.automaticLanguages.map(l => l.name),
  naturalWeapons: [],
  ...(suppressed.length ? { primitive: true, suppressedClassProficiencies: suppressed } : {}),
  description: `${profile.speciesDisplayName} as printed in ${profile.publication}. Complete publication snapshot; no traits are inherited from other publications.`,
  traits,
  runtimeStatus: 'NOT_RUNTIME_CERTIFIED',
};

const variants = (rec.system.variants || []).filter(v => v.id !== variant.id);
rec.system.variants = [...variants, variant];
console.log(JSON.stringify(variant, null, 2));
if (flag === '--write') {
  lines[idx] = JSON.stringify(rec);
  fs.writeFileSync(PACK, lines.join('\n'));
  console.log(`WROTE ${variant.id} onto ${rec._id}`);
} else console.log('(dry run; pass --write)');
