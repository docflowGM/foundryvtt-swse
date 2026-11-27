#!/usr/bin/env node
// PRQ.1B (Phase 3N-PRQ supplement): build the GENERATED, UUID-keyed canonical prerequisite index from the production feat and talent packs.
//   Output: data/generated/canonical-prerequisite-index.json (deterministic: sorted keys, no timestamps; same input -> byte-identical output).
// The index is DERIVATIVE: it has no editing workflow and is never an authority apart from its sources. It does not invent, repair or "closest-name" anything.
//   - Identity is the canonical compendium UUID (talents via scripts/data/talent-source-identity.js; feats Compendium.foundryvtt-swse.feats.Item.<_id>).
//   - States: PREREQUISITE_FREE_UNVERIFIED (production text says None, no structure; source verification still pending PRQ.0C), COMPILED (structure present,
//     every condition supported, every referenced UUID resolves in its own pack, no unresolved reasons), PARTIALLY_COMPILED (structure present but with a
//     reason it cannot be trusted as complete), UNRESOLVED (prerequisite text but no structure), SOURCE_MISSING (no prerequisite field at all).
//     An empty condition list never means eligible.
//   - The build FAILS (exit 1) on: duplicate owners (UUID collisions), unknown condition types, malformed UUIDs, unsupported group types.
// Usage: node tools/build-canonical-prerequisite-index.mjs [--out data/generated/canonical-prerequisite-index.json] [--stdout]
import fs from 'node:fs';
import { canonicalTalentUuid } from '../scripts/data/talent-source-identity.js';
import { textStructureDisagreements, clauseBag } from './lib/prq-facts.mjs';
import { normalizeAuthorityKey } from '../scripts/data/authority/authority-key-normalizer.js';
import { FEAT_PREREQUISITE_AUTHORITY } from '../scripts/data/authority/feat-prerequisite-authority.js';
import { TALENT_PREREQUISITE_AUTHORITY } from '../scripts/data/authority/talent-prerequisite-authority.js';

export const SCHEMA = 'swse.canonical-prerequisite-index.v1';
const FEAT_PACK = 'foundryvtt-swse.feats';
const TALENT_PACK = 'foundryvtt-swse.talents';
// Grammar supported by production data today (PRQ.0A). New types must be added deliberately, with an evaluator handler, before they can compile.
const GROUP_TYPES = new Set(['all']);
const LEAF_TYPES = new Set(['skillTrained', 'attribute', 'bab', 'species', 'feat', 'talent']);
const NONE = (s) => ['', 'none', '—', '-', 'n/a'].includes(String(s ?? '').trim().toLowerCase());
const load = (p) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

const featUuid = (id) => `Compendium.${FEAT_PACK}.Item.${id}`;
const parseUuid = (u) => { const m = /^Compendium\.([^.]+\.[^.]+)\.Item\.([0-9a-zA-Z]{16}|[0-9a-f]{32})$/.exec(String(u ?? '')); return m ? { pack: m[1], id: m[2] } : null; };

export function buildIndex({ feats = load('packs/feats.db'), talents = load('packs/talents.db') } = {}) {
  const errors = [];
  const entries = {};
  const owners = new Map();
  const featIds = new Set(feats.map((r) => r._id)); const talentIds = new Set(talents.map((r) => r._id));
  const counts = { feat: {}, talent: {} };
  const add = (domain, rec, uuid) => {
    if (!uuid) { errors.push(`${domain} ${rec._id} (${rec.name}): cannot form a canonical UUID`); return; }
    if (owners.has(uuid)) { errors.push(`duplicate owner for ${uuid}: ${owners.get(uuid)} and ${rec.name}`); return; }
    owners.set(uuid, rec.name);
    const s = rec.system ?? {};
    const text = s.prerequisites ?? s.prerequisite;
    const st = s.prerequisitesStructured;
    const entry = { domain, name: rec.name, recordId: rec._id, text: typeof text === 'string' ? text : null, structure: null, state: null, reasons: [] };
    if (st && typeof st === 'object') {
      if (!GROUP_TYPES.has(st.type)) errors.push(`${uuid} (${rec.name}): unsupported group type "${st.type}"`);
      const leaves = [];
      for (const c of Array.isArray(st.conditions) ? st.conditions : []) {
        if (!c || !LEAF_TYPES.has(c.type)) { errors.push(`${uuid} (${rec.name}): unsupported condition type "${c?.type}"`); continue; }
        const leaf = { ...c, provenance: { source: st._source ?? null } };
        if (c.type === 'feat' || c.type === 'talent') {
          const ref = parseUuid(c.uuid);
          if (!ref) { entry.reasons.push(`${c.type} condition without a canonical UUID (${c.name ?? '?'})`); }
          else {
            const expectPack = c.type === 'talent' ? TALENT_PACK : FEAT_PACK;
            const ids = c.type === 'talent' ? talentIds : featIds;
            if (ref.pack !== expectPack) entry.reasons.push(`${c.type} condition points at pack ${ref.pack}`);
            else if (!ids.has(ref.id)) entry.reasons.push(`${c.type} condition targets a missing record (${c.uuid})`);
          }
        }
        leaves.push(leaf);
      }
      if (leaves.length === 0) entry.reasons.push('structure has no conditions');
      entry.structure = { type: st.type, conditions: leaves, provenance: { source: st._source ?? null } };
      entry.state = entry.reasons.length ? 'PARTIALLY_COMPILED' : 'COMPILED';
      // A structure that mechanically disagrees with its own text (ability minimum / BAB), or whose text differs in substance from the name-keyed authority
      // table, is NOT trusted as compiled: which representation is the published prerequisite is an owner source ruling (rules register PRQ-SRC-001..005).
      // Demotion never makes anything eligible; the runtime keeps its previous behavior for these records.
      if (entry.state === 'COMPILED') {
        const conflicts = textStructureDisagreements(text, st);
        const auth = (domain === 'feat' ? FEAT_PREREQUISITE_AUTHORITY : TALENT_PREREQUISITE_AUTHORITY)[normalizeAuthorityKey(rec.name)];
        const authDiffers = auth && clauseBag(text) !== clauseBag(auth.prerequisite);
        if (conflicts.length) { entry.state = 'TEXT_STRUCTURE_CONFLICT'; entry.reasons.push(...conflicts.map((c) => `text/structure disagreement (${c}); source ruling pending (PRQ-SRC-001..004)`)); }
        else if (authDiffers) { entry.state = 'SOURCE_REVIEW_REQUIRED'; entry.reasons.push('production text differs in substance from the name-keyed authority table; source ruling pending (PRQ-SRC-005)'); }
      }
    } else if (text === undefined || text === null) {
      entry.state = 'SOURCE_MISSING';
    } else if (NONE(text)) {
      entry.state = 'PREREQUISITE_FREE_UNVERIFIED';
      entry.reasons.push('production text says None; certified-source verification pending (PRQ.0C)');
    } else {
      entry.state = 'UNRESOLVED';
      entry.reasons.push('prerequisite text has no structured form');
    }
    counts[domain][entry.state] = (counts[domain][entry.state] ?? 0) + 1;
    entries[uuid] = entry;
  };
  for (const r of feats) add('feat', r, r._id ? featUuid(r._id) : null);
  for (const r of talents) add('talent', r, canonicalTalentUuid(r._id));
  const sorted = Object.fromEntries(Object.keys(entries).sort().map((k) => [k, entries[k]]));
  const sortedCounts = Object.fromEntries(['feat', 'talent'].map((d) => [d, Object.fromEntries(Object.keys(counts[d]).sort().map((k) => [k, counts[d][k]]))]));
  return { index: { schema: SCHEMA, note: 'GENERATED by tools/build-canonical-prerequisite-index.mjs; not an authority apart from its sources; an empty condition list never means eligible.', counts: sortedCounts, entries: sorted }, errors };
}

export const serialize = (index) => JSON.stringify(index, null, 1) + '\n';

if (import.meta.url === `file://${process.argv[1]}`) {
  const outIdx = process.argv.indexOf('--out');
  const out = outIdx >= 0 ? process.argv[outIdx + 1] : 'data/generated/canonical-prerequisite-index.json';
  const { index, errors } = buildIndex();
  if (errors.length) { console.error(`index build REJECTED (${errors.length}):\n  ` + errors.slice(0, 30).join('\n  ')); process.exit(1); }
  if (process.argv.includes('--stdout')) process.stdout.write(serialize(index)); else { fs.writeFileSync(out, serialize(index)); console.log(`wrote ${out}: ${Object.keys(index.entries).length} entries`, JSON.stringify(index.counts)); }
}
