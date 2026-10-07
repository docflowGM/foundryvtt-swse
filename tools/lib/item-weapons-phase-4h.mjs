// Shared loaders / collectors for the Phase 4H weapon semantic freeze (authority-only).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const readText = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
export const readJson = (f) => JSON.parse(readText(f));
export const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');
export const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export const PHASE4 = [
  { id: '4A', category: 'Simple Weapon', file: 'data/audits/item-weapons-phase-4a-simple-semantic-rolling.json', groups: ['Simple Weapon'], key: (a) => a.identityKey },
  { id: '4B', category: 'Lightsaber', file: 'data/audits/item-weapons-phase-4b-lightsaber-semantic-rolling.json', groups: ['Lightsaber'], key: (a) => a.identityKey },
  { id: '4C', category: 'Pistol', file: 'data/audits/item-weapons-phase-4c-pistol-semantic-rolling.json', groups: ['Pistol'], key: (a) => a.identityKey },
  { id: '4D', category: 'Rifle', file: 'data/audits/item-weapons-phase-4d-rifle-semantic-rolling.json', groups: ['Rifle', 'Rifle (Special)'], key: (a) => a.identityKey },
  { id: '4E', category: 'Advanced Melee Weapon', file: 'data/audits/item-weapons-phase-4e-advanced-melee-semantic-rolling.json', groups: ['Advanced Melee Weapon'], key: (a) => a.phase3BIdentityKey },
  { id: '4F', category: 'Heavy Weapon', file: 'data/audits/item-weapons-phase-4f-heavy-semantic-rolling.json', groups: ['Heavy Weapon', 'Heavy Weapon (Ammunition)'], adjunct: ['weapon-interchangeable-weapon-system'], key: (a) => a.identityKey },
  { id: '4G', category: 'Exotic Weapon', file: 'data/audits/item-weapons-phase-4g-exotic-semantic-rolling.json', groups: ['Exotic Weapon'], key: (a) => a.identityKey },
];

// Weapon-only / runtime vocabulary that must never become a semantic tag (unless a future certified feat/talent authority uses it).
export const FORBIDDEN_PSEUDO_TAGS = ['accuracy', 'area_damage', 'condition_track', 'explosives', 'grenade', 'rifle', 'thrown', 'full_round_action', 'ion', 'sonic'];

// The legal weapon semantic vocabulary = union of finalTags used by the certified feat/talent authorities.
export function certifiedVocabulary() {
  const used = new Set();
  for (const a of readJson('data/audits/feat-tags-pass2-semantic-authority.json').assignments) for (const t of a.finalTags || []) used.add(t);
  const walk = (o) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (k === 'finalTags' && Array.isArray(v)) v.forEach((t) => used.add(t)); else walk(v); } };
  walk(readJson('data/audits/talent-phase-12-1-semantic-tag-authority.json').batches);
  for (const a of readJson('data/audits/talent-phase-12-final-ontology-adjudication.json').assignments) for (const t of a.finalTags || []) used.add(t);
  return used;
}

// Every semantic-bearing field of one assignment: <field>Tags string arrays and conditional {tag} objects. Returns [{field, tag}].
export function semanticTagFields(assignment) {
  const out = [];
  const w = (o, p) => {
    if (Array.isArray(o)) { if (/tags$/i.test(p) && o.every((x) => typeof x === 'string')) o.forEach((t) => out.push({ field: p, tag: t })); else o.forEach((x) => w(x, p)); }
    else if (o && typeof o === 'object') { if (typeof o.tag === 'string' && /conditional/i.test(p)) out.push({ field: `${p}.tag`, tag: o.tag }); for (const [k, v] of Object.entries(o)) w(v, k); }
  };
  w(assignment, '');
  return out;
}

// Exact named feat/talent interactions found anywhere in the selector layer. Direction: ability -> applicable weapon/profile.
export function abilityLinks(assignment) {
  const out = [];
  const w = (o) => {
    if (Array.isArray(o)) o.forEach(w);
    else if (o && typeof o === 'object') {
      if (typeof o.abilityName === 'string') out.push({ ability: o.abilityName, abilityType: o.abilityType || null, relation: o.relation || null, via: 'explicitAbilityLinks' });
      if (typeof o.ability === 'string') out.push({ ability: o.ability, abilityType: o.abilityType || null, relation: o.interaction || o.relation || null, via: o.interaction ? 'explicitAbilityInteractions' : 'abilityOverrides' });
      for (const v of Object.values(o)) w(v);
    }
  };
  w(assignment.ruleSelectors || {});
  return out;
}

export function loadAll() {
  const b3 = readJson('data/audits/item-weapons-phase-3b-canonical-authority.json');
  const byKey = new Map(b3.identities.map((i) => [i.identityKey, i]));
  const cats = PHASE4.map((c) => ({ ...c, data: readJson(c.file) }));
  return { b3, byKey, cats };
}

// Phase 5C: ability names the certified 4G/4H weapon authority links to that the certified feat authority does not contain.
// "Two-Weapon Fighting" was a certified-NONCANONICAL feat record (Phase 1B REMOVE_NONCANONICAL, removed in 5C); the 4H-A3 ruling
// named it "the exact canonical ability name". The two authorities disagree; the link stays (interaction unchanged) and the
// conflict is reported to the planner. Remove this exception once the planner rules on the correct ability name.
export const ABILITY_NAMES_PENDING_PLANNER_RULING = Object.freeze(['Two-Weapon Fighting']);
export const packNames = (f) => new Set(readText(f).split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l).name));
