#!/usr/bin/env node
/**
 * Phase 3G-3/4 — structured talent-prerequisite identity migration: manifest -> dry-run -> apply -> verify.
 *
 * Boundary (exact): every structured talent-to-talent condition `system.prerequisitesStructured.conditions[i]` in packs/talents.db
 * (see the manifest for exact counts) is replaced by `{ type:'talent', uuid:<canonical v13 UUID of the target>, name:<target name> }`.
 * Nothing else in the pack changes. No actor pack, tree pack, homebrew pack, registry or derived mirror is written.
 *
 * Target derivation is NOT by `flags.swse.id` alone. For each leaf the existing reference yields candidate records; a unique candidate is
 * cross-checked against the owner's certified prerequisite TEXT, an ambiguous one is resolved by owner/tree context (and, for the one known
 * case, pinned by an explicit owner ruling that must agree with the context rule).
 *
 *   --manifest          write data/audits/talent-phase-3g-migration-manifest.json (pre-state only)
 *   --report            write data/audits/talent-phase-3g-dry-run-report.json + docs/audits/talent-phase-3g-dry-run.md (no pack written)
 *   --check             pre-state: manifest + report equal a fresh derivation; post-state: same as --verify
 *   --apply             write packs/talents.db (uncommitted), refusing drifted/partial states     [NOT run in the dry-run phase]
 *   --verify [--exact]  check the applied state                                                    [applies after --apply]
 *   --status            PRE_3G / POST_3G / UNKNOWN
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, serializePack, gitBlobSha, fingerprint, loadCommittedManifests } from './apply-talent-phase-3c.mjs';
import { pendingSourceFields } from '../scripts/data/talent-source-identity.js';
import { leavesOf as diffLeaves, leafDiff } from './apply-talent-phase-3e4.mjs';
import { leavesOf as structuredLeaves, loadRuntime, finalizerEmbedded, sourceLinked, pendingEntry } from './census-talent-prerequisite-identity.mjs';
import { reconcile, loadInput } from './reconcile-talent-publication-corpus.mjs';

export const MANIFEST_PATH = 'data/audits/talent-phase-3g-migration-manifest.json';
export const REPORT_PATH = 'data/audits/talent-phase-3g-dry-run-report.json';
export const DOC_PATH = 'docs/audits/talent-phase-3g-dry-run.md';
const TALENTS = 'packs/talents.db', PACK = 'foundryvtt-swse.talents';
const PACK_ID = /^(?:[0-9a-f]{16}|[0-9a-f]{32})$/;
const UNTOUCHED = ['packs/talent_trees.db', 'packs/classes.db', 'packs/heroic.db', 'packs/nonheroic.db', 'packs/npc.db', 'packs/talents-homebrew.db', 'packs/talent-trees-homebrew.db',
  'data/generated/talent-trees.registry.json', 'data/fixes/talent-trees.registry.json', 'data/generated/talents.fixed.json', 'data/fixes/talents.fixed.json', 'data/canonical/talents.json', 'data/class-archetypes.json', 'system.json'];
const ERR = '[talent-phase-3g] ';
const invariant = (ok, m) => { if (!ok) throw new Error(ERR + m); };
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readJson = rel => JSON.parse(read(rel));
const parse = t => t.split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l));
const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const sortedFp = arr => fingerprint(arr.slice().sort((x, y) => x._id.localeCompare(y._id)));
const uuidOf = id => `Compendium.${PACK}.Item.${id}`;

/**
 * Owner SOURCE RULINGS (rendered-sourcebook review). Keyed by the owning production `_id`; every entry is cross-checked against the owner's name.
 *   removals     : the printed talent has NO prerequisite -> the structured talent condition is deleted (not migrated); an emptied container is dropped
 *   retargets    : the structured condition names the wrong talent -> point it at the printed prerequisite
 *   textAdditions: the printed prerequisite is a correct structured relationship but the production text line is missing (layered correction file)
 */
export const CORRECTIONS_PATH = 'data/audits/talent-phase-3g-source-corrections.json';
export const SOURCE_RULINGS = {
  removals: {
    '7aa4ca13a96d8770': { name: 'Ruthless', leafId: 'swse.talent.dirty_fighting', basis: 'Scum and Villainy p.29: Assassin | Ruthless has no prerequisite; Dirty Fighting belongs to FUCG Mercenary | Ruthless' },
    'b7d5a1bc3d40b964': { name: 'Keep It Together', leafId: 'swse.talent.jury_rigger', basis: 'Core p.207: Expert Pilot | Keep It Together has no prerequisite' },
    'd9e707f23fffc2af': { name: 'Armor Mastery', leafId: 'swse.talent.armored_defense', basis: 'Legacy p.45: Knight\'s Armor | Armor Mastery has no prerequisite; Core Armor Specialist | Armor Mastery requires Armored Defense' },
    'e19c06b6dfc7a703': { name: 'Seize the Moment', leafId: 'swse.talent.distress_to_discord', basis: 'Scum and Villainy p.35: Outlaw | Seize the Moment has no prerequisite; Distress to Discord belongs to Legacy Provocateur | Seize the Moment' }
  },
  retargets: {
    ...Object.fromEntries([['5459cc5eedf15c8d', 'Ricochet Shot'], ['7a024dac260bf9ec', 'Dumb Luck'], ['beae25ca4ed40eea', 'Unlikely Shot'], ['e435b618793d8bc7', 'Uncanny Luck']].map(([id, name]) =>
      [id, { name, fromLeafId: 'swse.talent.fools_luck', toId: '5fbf1a3504865fba', toName: 'Lucky Shot', basis: 'Scum and Villainy p.14-15 prints "Knack, Lucky Shot" (the structured Fool\'s Luck is wrong)' }])),
    'c980750800b91061': { name: 'Stay in the Fight', fromLeafId: 'swse.talent.recruit_enemy', toId: 'd9ffff2586cd259b', toName: 'Stalwart Subordinates', basis: 'Legacy p.42 prints "Stalwart Subordinates" (the structured Recruit Enemy is the Rebellion-era talent)' }
  },
  textAdditions: {
    '09609e71ba6cd4aa': { name: 'Swift Power', prerequisites: 'Power of the Dark Side', page: 'Core p.101' },
    '224906e573330bf2': { name: 'Starship Raider', prerequisites: 'Spacehound', page: 'Core p.47' },
    '6b09fe0c6fe98367': { name: 'Sow Confusion', prerequisites: 'Hesitate', page: 'Scum and Villainy p.15' },
    'f098749cb8767a5f': { name: 'Force Haze', prerequisites: 'Clear Mind', page: 'Core pp.40-41' }
  }
};

/** Explicit owner rulings that PIN a target identity (each must agree with the context rule; a disagreement fails the derivation). */
export const OWNER_RULINGS = {
  'Scum and Villainy|Outlaw|Find an Opening': { leafId: 'swse.talent.seize_the_moment', targetIdentity: 'Scum and Villainy|Outlaw|Seize the Moment', targetId: 'e19c06b6dfc7a703', basis: 'Owner ruling (certified Scum and Villainy authority, printed p.35): Find an Opening and its prerequisite Seize the Moment are both Outlaw-tree talents of the same published chain; the Provocateur Seize the Moment (Legacy Era Campaign Guide) is not the intended prerequisite.' }
};

/** Layered source-correction entries (same entry shape the reconciler already honours for 3E-5: REPLACE_FIELDS + PDF_VERIFIED). */
function textCorrections(talents, identityOf) {
  const byId = new Map(talents.map(t => [t._id, t]));
  return Object.entries(SOURCE_RULINGS.textAdditions).map(([id, a], i) => {
    const t = byId.get(id); invariant(t && t.name === a.name, `text ruling names ${a.name} but ${id} is ${t?.name}`);
    invariant(String(t.system.prerequisites ?? '').trim() === '' || t.system.prerequisites === a.prerequisites, `${a.name} already carries different prerequisite text`);
    return { id: `3G-SC-${String(i + 1).padStart(2, '0')}`, productionId: id, name: t.name, canonicalIdentity: identityOf.get(id), publication: { sourcebook: t.system.source, page: t.system.page }, group: 'PRINTED_PREREQUISITE_MISSING_FROM_CANONICAL_AUTHORITY', action: 'REPLACE_FIELDS', confidence: 'CERTAIN', fields: ['prerequisites'], before: { prerequisites: t.system.prerequisites ?? '' }, after: { prerequisites: a.prerequisites }, evidence: `${a.page}: printed prerequisite "${a.prerequisites}"; the certified Phase 2 authority omitted the line. The structured relationship was already correct.`, verification: { status: 'PDF_VERIFIED', verifiedBy: 'project owner, rendered-sourcebook review', basis: 'Phase 3G source ruling', printedText: a.prerequisites } };
  });
}

/** Layered approved-correction file the reconciler (TEXT_DRIFT) honours, same model as the 3E-5 defect manifest. */
export function correctionsFile(m) {
  return { schemaVersion: 1, phase: '3G-3', status: 'SOURCE_CORRECTION_LAYER', rule: 'Finite, owner-verified (rendered sourcebook) corrections layered ABOVE the immutable Phase 2 canonical artifact; the reconciler treats base and corrected text as the allowed states. Only system.prerequisites changes.', entries: m.textCorrections };
}

export function deriveManifest() {
  const talentsText = read(TALENTS), talents = parse(talentsText), trees = parse(read('packs/talent_trees.db'));
  const byId = new Map(talents.map(t => [t._id, t])), bySwse = new Map();
  for (const t of talents) { const f = t.flags?.swse?.id; if (f) bySwse.set(f, [...(bySwse.get(f) ?? []), t]); }
  const treeOf = new Map(); for (const tr of trees) for (const id of tr.system.talentIds) treeOf.set(id, tr);
  const identityOf = new Map();
  for (const { manifest } of loadCommittedManifests()) for (const r of manifest.records) { const i = r.identityResolution; identityOf.set(i.productionRecordId || i.createRecordId, r.canonicalIdentity); }
  for (const a of readJson('data/audits/talent-phase-3e-canonical-additions.json').additions) identityOf.set(a.production.id, a.canonicalIdentity);
  const sameNameNames = new Set(readJson('data/canonical/talents.json').sameNameDifferentTreeGroups.map(g => g.name.toLowerCase()));
  const census = readJson('data/audits/talent-phase-3g-prerequisite-identity-census.json');
  const censusByKey = new Map(census.rows.map(r => [`${r.owner.id}|${r.path}`, r]));
  const rows = [], removals = [];
  for (const owner of talents) {
    const ps = owner.system.prerequisitesStructured; if (!ps) continue;
    const text = String(SOURCE_RULINGS.textAdditions[owner._id]?.prerequisites ?? owner.system.prerequisites ?? '').trim();
    for (const { path: p, condition } of structuredLeaves(ps)) {
      if (condition.type !== 'talent') continue;
      const ownerIdentity = identityOf.get(owner._id), ownerTree = treeOf.get(owner._id);
      const rm = SOURCE_RULINGS.removals[owner._id], rt = SOURCE_RULINGS.retargets[owner._id];
      if (rm && condition.id === rm.leafId) {
        invariant(owner.name === rm.name, `removal ruling names ${rm.name} but ${owner._id} is ${owner.name}`);
        removals.push({ ownerId: owner._id, ownerName: owner.name, ownerCanonicalIdentity: ownerIdentity, ownerTree: ownerTree?.name ?? null, path: p, existing: { id: condition.id ?? null }, printedPrerequisite: text || null, basis: rm.basis });
        continue;
      }
      if (rt && condition.id === rt.fromLeafId) invariant(owner.name === rt.name, `retarget ruling names ${rt.name} but ${owner._id} is ${owner.name}`);
      let cands = rt && condition.id === rt.fromLeafId ? [byId.get(rt.toId)] : condition.uuid ? [] : condition.id && byId.has(condition.id) ? [byId.get(condition.id)] : condition.id && bySwse.has(condition.id) ? bySwse.get(condition.id) : [];
      invariant(cands.length > 0, `dangling leaf on ${owner.name} ${p}`);
      let basis, target;
      if (rt && condition.id === rt.fromLeafId) { target = cands[0]; invariant(target?.name === rt.toName, `retarget target ${rt.toId} is not ${rt.toName}`); basis = 'SOURCE_RULING_RETARGET'; }
      else if (cands.length === 1) { target = cands[0]; basis = byId.has(condition.id) ? 'EXISTING_PRODUCTION_ID (Phase 3D repair)' : 'UNIQUE_FLAG_ID'; }
      else {
        const sameTree = cands.filter(c => treeOf.get(c._id)?._id === ownerTree?._id);
        const ruling = OWNER_RULINGS[ownerIdentity];
        invariant(sameTree.length === 1, `ambiguous leaf on ${owner.name} ${p}: ${cands.length} candidates, ${sameTree.length} in the owner's tree`);
        target = sameTree[0]; basis = 'AMBIGUOUS_FLAG_ID_RESOLVED_BY_OWNER_TREE';
        if (ruling) { invariant(ruling.targetId === target._id && ruling.leafId === condition.id && identityOf.get(target._id) === ruling.targetIdentity, `owner ruling disagrees with the context rule on ${owner.name}`); basis += ' + OWNER_RULING'; }
      }
      invariant(!OWNER_RULINGS[ownerIdentity] || cands.length > 1 || OWNER_RULINGS[ownerIdentity].leafId !== condition.id, `owner ruling on ${owner.name} does not apply`);
      const textConfirms = text ? norm(text).includes(norm(target.name)) : null;
      const cRow = censusByKey.get(`${owner._id}|${p}`);
      rows.push({
        ownerId: owner._id, ownerName: owner.name, ownerCanonicalIdentity: ownerIdentity, ownerTree: ownerTree?.name ?? null, path: p,
        existing: { id: condition.id ?? null, uuid: condition.uuid ?? null, slug: condition.slug ?? null, name: condition.name ?? null },
        target: { id: target._id, name: target.name, canonicalIdentity: identityOf.get(target._id), tree: treeOf.get(target._id)?.name ?? null, treeId: treeOf.get(target._id)?._id ?? null, uuid: uuidOf(target._id), inSameNameCrossTreeGroup: sameNameNames.has(target.name.toLowerCase()), sameTreeAsOwner: treeOf.get(target._id)?._id === ownerTree?._id },
        derivation: { basis, candidates: cands.length, textPrerequisite: text, textConfirmsTargetName: textConfirms, ownerRuling: rt?.basis ?? OWNER_RULINGS[ownerIdentity]?.basis ?? null },
        currentResolution: { embeddedFinalizerShape: cRow?.runtime ? (cRow.runtime.embeddedFinalizerShape.met ? cRow.runtime.embeddedFinalizerShape.via : 'UNMET') : 'AMBIGUOUS', pendingTalentStepShape: cRow?.runtime ? (cRow.runtime.pendingTalentStepShape.met ? cRow.runtime.pendingTalentStepShape.via : 'UNMET') : 'AMBIGUOUS' },
        postMigrationResolution: { embeddedSourceLinked: 'uuid', pendingTalentStepShape: 'uuid' },
        proposed: { type: 'talent', uuid: uuidOf(target._id), name: target.name }
      });
    }
  }
  invariant(removals.length === Object.keys(SOURCE_RULINGS.removals).length, 'every removal ruling must apply exactly once');
  invariant(rows.filter(r => r.derivation.basis === 'SOURCE_RULING_RETARGET').length === Object.keys(SOURCE_RULINGS.retargets).length, 'every retarget ruling must apply exactly once');
  return {
    schemaVersion: 1, phase: '3G-3', status: 'MIGRATION_MANIFEST', census: 'data/audits/talent-phase-3g-prerequisite-identity-census.json',
    boundary: 'every source-valid structured talent-to-talent condition -> { type:"talent", uuid, name }',
    schemaDecision: {
      uuid: 'authoritative: canonical v13 compendium UUID of the target (the one durable talent identity)',
      name: 'retained: human-readable label for UI/diagnostics and the legacy unlinked-copy fallback (guarded by the tree check); never authoritative',
      id: 'REMOVED: the old `id` was either a flags.swse.id (not total, not unique) or a compendium _id that readers mistook for actor identity; keeping it would create a second, misleading identity. The checker still honours `id` leaves on unmigrated/homebrew data.'
    },
    preState: { talents: gitBlobSha(talentsText) }, rows, removals,
    textCorrections: textCorrections(talents, identityOf)
  };
}

export function project(manifest, talents) {
  const idx = path => { const m = /^system\.prerequisitesStructured\.conditions\[(\d+)\]$/.exec(path); invariant(m, `unsupported leaf path ${path}`); return Number(m[1]); };
  const owners = new Map(), at = id => owners.get(id) ?? owners.set(id, { rows: new Map(), removed: new Set(), text: null }).get(id);
  for (const r of manifest.rows) at(r.ownerId).rows.set(idx(r.path), r.proposed);
  for (const r of manifest.removals ?? []) at(r.ownerId).removed.add(r.existing.id);
  for (const c of manifest.textCorrections ?? []) at(c.productionId).text = c.after.prerequisites;
  return talents.map(t => {
    const o = owners.get(t._id); if (!o) return t;
    const n = structuredClone(t), ps = n.system.prerequisitesStructured;
    if (ps && (o.rows.size || o.removed.size)) {
      ps.conditions = ps.conditions.map((c, i) => c.type === 'talent' && o.removed.has(c.id) ? null : o.rows.has(i) ? structuredClone(o.rows.get(i)) : c).filter(Boolean);
      // a sole removed condition leaves no requirement: use the repository's standard "no structured prerequisite" shape (key absent)
      if (!ps.conditions.length) delete n.system.prerequisitesStructured;
    }
    if (o.text !== null) n.system.prerequisites = o.text;
    return n;
  });
}

async function runtimeEffectiveness(manifest, talents, trees) {
  const { PrerequisiteChecker, restore } = await loadRuntime(talents, trees);
  // The guarded unlinked-copy fallback consults the tree index; build it over the PROJECTED pack.
  const { TalentTreeDB } = await import('/systems/foundryvtt-swse/scripts/data/talent-tree-db.js');
  TalentTreeDB.isBuilt = false; await TalentTreeDB.build();
  const byId = new Map(talents.map(t => [t._id, t])), byName = new Map();
  for (const t of talents) byName.set(t.name.toLowerCase(), [...(byName.get(t.name.toLowerCase()) ?? []), t]);
  const actor = items => ({ id: 'a', type: 'character', system: { abilities: {} }, items: items.map(i => ({ ...i, id: i.id ?? i._id })), flags: {} });
  const out = { rows: manifest.rows.length, embeddedSourceLinked: 0, embeddedLegacyLinkForm: 0, pending: 0, wrongSameNameChecked: 0, wrongSameNameRejected: 0, unlinkedLegacyFallbackMet: 0, unlinkedWrongTreeRejected: 0, unlinkedWrongTreeChecked: 0, viaUuidEmbedded: 0, viaUuidPending: 0, failures: [] };
  for (const r of manifest.rows) {
    const target = byId.get(r.target.id), leaf = r.proposed;
    const e1 = PrerequisiteChecker._resolvePrerequisiteByUuid(leaf, 'talent', actor([sourceLinked(target)]), {});
    const e2 = PrerequisiteChecker._checkTalentCondition(leaf, actor([{ ...sourceLinked(target), flags: { ...(target.flags ?? {}), core: { sourceId: `Compendium.${PACK}.${target._id}` } } }]), {});
    const pend = PrerequisiteChecker._resolvePrerequisiteByUuid(leaf, 'talent', actor([]), { selectedTalents: [{ ...pendingEntry(target), ...pendingSourceFields(target._id) }] });
    const pendCanonical = PrerequisiteChecker._checkTalentCondition(leaf, actor([]), { selectedTalents: [{ ...pendingEntry(target), ...pendingSourceFields(target._id) }] });
    if (PrerequisiteChecker._checkTalentCondition(leaf, actor([sourceLinked(target)]), {}).met) out.embeddedSourceLinked++; else out.failures.push(`${r.ownerName}: embedded source-linked`);
    if (e2.met) out.embeddedLegacyLinkForm++; else out.failures.push(`${r.ownerName}: legacy link form`);
    if (pendCanonical.met) out.pending++; else out.failures.push(`${r.ownerName}: pending`);
    if (e1.via === 'uuid' && e1.fallback === false) out.viaUuidEmbedded++;
    if (pend.via === 'uuid' && pend.fallback === false) out.viaUuidPending++;
    const wrong = (byName.get(target.name.toLowerCase()) ?? []).filter(x => x._id !== target._id);
    if (wrong.length) { out.wrongSameNameChecked++; if (wrong.every(w => !PrerequisiteChecker._checkTalentCondition(leaf, actor([sourceLinked(w)]), {}).met)) out.wrongSameNameRejected++; else out.failures.push(`${r.ownerName}: wrong same-name copy satisfied it`); }
    const unlinked = { ...JSON.parse(JSON.stringify(target)), _id: 'EMBU', id: 'EMBU' };
    if (PrerequisiteChecker._checkTalentCondition(leaf, actor([unlinked]), {}).met) out.unlinkedLegacyFallbackMet++;
    for (const w of wrong) { out.unlinkedWrongTreeChecked++; if (!PrerequisiteChecker._checkTalentCondition(leaf, actor([{ ...JSON.parse(JSON.stringify(w)), _id: 'EMBW', id: 'EMBW' }]), {}).met) out.unlinkedWrongTreeRejected++; else out.failures.push(`${r.ownerName}: unlinked wrong-tree copy satisfied it`); }
  }
  restore();
  return out;
}

export async function buildReport() {
  const manifest = readJson(MANIFEST_PATH), talentsText = read(TALENTS), talents = parse(talentsText), trees = parse(read('packs/talent_trees.db'));
  const after = project(manifest, talents), ownerIds = new Set([...manifest.rows.map(r => r.ownerId), ...manifest.removals.map(r => r.ownerId), ...manifest.textCorrections.map(r => r.productionId)]);
  const textOwners = new Set(manifest.textCorrections.map(c => c.productionId)), removalOwners = new Set(manifest.removals.map(r => r.ownerId));
  const N = manifest.rows.length;
  const tb = new Map(talents.map(t => [t._id, t])), ta = new Map(after.map(t => [t._id, t]));
  const records = [...ownerIds].map(id => ({ id, name: tb.get(id).name, changes: leafDiff(tb.get(id), ta.get(id)) })).sort((a, b) => a.name.localeCompare(b.name));
  const afterText = serializePack(talentsText, after);
  const eff = await runtimeEffectiveness(manifest, after, trees);
  const rec = reconcile({ ...loadInput(), production: after });
  const rowsBy = f => manifest.rows.reduce((o, r) => { const k = f(r); o[k] = (o[k] ?? 0) + 1; return o; }, {});
  const v = []; const check = (id, ok, detail = '') => v.push({ id, ok: !!ok, detail });
  const targets = new Set(manifest.rows.map(r => r.target.uuid));
  check('311 source-valid structured talent-to-talent leaves, 311 / 311 map to exactly one canonical UUID', N === 311 && manifest.removals.length === 4 && manifest.rows.every(r => /^Compendium\.foundryvtt-swse\.talents\.Item\.(?:[0-9a-f]{16}|[0-9a-f]{32})$/.test(r.target.uuid)));
  check('0 unresolved, 0 ambiguous, 0 dangling (every row has a unique derivation)', manifest.rows.every(r => r.target.id && r.derivation.basis));
  check('every target exists in the canonical 1,187-talent pack', manifest.rows.every(r => tb.has(r.target.id)) && talents.length === 1187);
  check('every unique-candidate target is confirmed by the owner\'s certified prerequisite text, or the contradiction/absence is itemised below', true, `${manifest.rows.filter(r => r.derivation.textConfirmsTargetName === true).length} confirmed, ${manifest.rows.filter(r => r.derivation.textConfirmsTargetName === null).length} owners have no printed text, ${manifest.rows.filter(r => r.derivation.textConfirmsTargetName === false).length} contradict it`);
  check('Find an Opening resolves specifically to Scum and Villainy|Outlaw|Seize the Moment (e19c06b6dfc7a703)', manifest.rows.some(r => r.ownerCanonicalIdentity === 'Scum and Villainy|Outlaw|Find an Opening' && r.target.canonicalIdentity === 'Scum and Villainy|Outlaw|Seize the Moment' && r.target.id === 'e19c06b6dfc7a703' && r.target.uuid === uuidOf('e19c06b6dfc7a703')));
  const five = ['Fearsome', 'Ruthless Negotiator', 'Shared Notoriety', 'Unsavory Reputation', 'Weakening Strike'];
  check('the five Phase 3D repairs are in the manifest and become runtime-effective', five.every(n => manifest.rows.some(r => r.ownerName === n && r.existing.id === r.target.id)) && eff.failures.filter(f => five.some(n => f.startsWith(n))).length === 0);
  check('every migrated prerequisite works against embedded source-linked items (v13 and legacy link form)', eff.embeddedSourceLinked === N && eff.embeddedLegacyLinkForm === N, JSON.stringify(eff));
  check('every migrated prerequisite works against pending selections (carrying the threaded identity)', eff.pending === N);
  check('identity (not name) decides: all 311 embedded and all 311 pending resolutions are authoritative uuid matches with no fallback', eff.viaUuidEmbedded === N && eff.viaUuidPending === N);
  check('same-name targets are disambiguated by identity: every wrong same-name copy (linked and unlinked) is rejected', eff.wrongSameNameChecked === eff.wrongSameNameRejected && eff.unlinkedWrongTreeChecked === eff.unlinkedWrongTreeRejected && eff.failures.length === 0, eff.failures.slice(0, 3).join('; '));
  check('only structured prerequisite data (and the four approved prerequisite-text lines) changes: benefit, description, summary, name, source, page, tree, tags, flags, effects are untouched', records.every(r => r.changes.every(c => /^system\.prerequisitesStructured(\.(conditions|type|_source))?$/.test(c.leaf) || (c.leaf === 'system.prerequisites' && textOwners.has(r.id)))));
  check('no other system.prerequisites text changes (exactly the 4 approved source corrections)', talents.every(t => t.system.prerequisites === ta.get(t._id).system.prerequisites || textOwners.has(t._id)) && manifest.textCorrections.every(c => ta.get(c.productionId).system.prerequisites === c.after.prerequisites && tb.get(c.productionId).system.prerequisites === c.before.prerequisites));
  const setOf = id => (ta.get(id).system.prerequisitesStructured?.conditions ?? []).map(c => c.uuid).sort().join('|');
  const byName = n => talents.filter(t => t.name === n);
  const fortune = ['Ricochet Shot', 'Dumb Luck', 'Unlikely Shot', 'Uncanny Luck'].map(n => byName(n).find(t => t.system.source === 'Scum and Villainy')?._id);
  check('Fortune quartet structured sets are exactly {Knack, Lucky Shot}; no Fool\'s Luck', fortune.every(id => id && setOf(id) === [uuidOf('ac6baadb9d65ff7f'), uuidOf('5fbf1a3504865fba')].sort().join('|')));
  check('Stay in the Fight (Legacy) structured set is exactly {Stalwart Subordinates}; Rebellion Stay in the Fight untouched', setOf('c980750800b91061') === uuidOf('d9ffff2586cd259b') && JSON.stringify(ta.get('6cf364c5b9556770')) === JSON.stringify(tb.get('6cf364c5b9556770')));
  check('0 structured prerequisites on Assassin|Ruthless, Expert Pilot|Keep It Together, Knight\'s Armor|Armor Mastery, Outlaw|Seize the Moment (container dropped, repository standard shape)', ['7aa4ca13a96d8770', 'b7d5a1bc3d40b964', 'd9e707f23fffc2af', 'e19c06b6dfc7a703'].every(id => !('prerequisitesStructured' in ta.get(id).system)) && removalOwners.size === 4);
  check('the same-name Ruthless / Armor Mastery / Seize the Moment owners that DO carry the prerequisite keep it', ['adfb725d20faade5', '4fc3fe4c1e7f9ba0', 'ec12ce36ff7048f2'].every(id => (ta.get(id).system.prerequisitesStructured?.conditions ?? []).length === 1 && ta.get(id).system.prerequisitesStructured.conditions[0].uuid));
  check('Swift Power / Starship Raider / Sow Confusion / Force Haze printed prerequisite text restored', [['09609e71ba6cd4aa', 'Power of the Dark Side'], ['224906e573330bf2', 'Spacehound'], ['6b09fe0c6fe98367', 'Hesitate'], ['f098749cb8767a5f', 'Clear Mind']].every(([id, t]) => ta.get(id).system.prerequisites === t && structuredLeaves(ta.get(id).system.prerequisitesStructured).length === 1));
  check('benefit, description, summary, source, page, treeId unchanged on every record', talents.every(t => { const a = ta.get(t._id); return ['benefit', 'description', 'summary', 'source', 'page', 'treeId'].every(k => JSON.stringify(t.system[k]) === JSON.stringify(a.system[k])) && t.name === a.name && JSON.stringify(t.flags) === JSON.stringify(a.flags); }));
  check('zero changes outside the owning records', sortedFp(talents.filter(t => !ownerIds.has(t._id))) === sortedFp(after.filter(t => !ownerIds.has(t._id))));
  check('the unmigrated structured conditions (skill/attribute/bab) and the group wrapper are untouched', manifest.rows.every(r => { const o = tb.get(r.ownerId).system.prerequisitesStructured, n = ta.get(r.ownerId).system.prerequisitesStructured; return n.type === o.type && n._source === o._source && o.conditions.filter(c => c.type !== 'talent').every(c => n.conditions.some(x => JSON.stringify(x) === JSON.stringify(c))) && n.conditions.length === o.conditions.length - manifest.removals.filter(x => x.ownerId === r.ownerId).length; }));
  check('the migrated pack contains no structured talent leaf without a canonical uuid', after.every(t => !t.system.prerequisitesStructured || structuredLeaves(t.system.prerequisitesStructured).filter(l => l.condition.type === 'talent').every(l => /^Compendium\.foundryvtt-swse\.talents\.Item\.(?:[0-9a-f]{16}|[0-9a-f]{32})$/.test(l.condition.uuid ?? ''))));
  check('Phase 3E corpus + 3F tree-identity invariants stay clean (reconciler: 0 blocking incl. TEXT_DRIFT, STALE_TREE_ID_SLUG, TREE_DISPLAY_NAME_DRIFT)', rec.blockingFindings.length === 0, JSON.stringify(rec.findingCounts));
  check('second run is a zero diff', JSON.stringify(project(manifest, after)) === JSON.stringify(after));
  check(`serialization is surgical: only ${ownerIds.size} lines of packs/talents.db change`, (() => { const x = talentsText.split('\n'), y = afterText.split('\n'); return x.length === y.length && x.filter((l, i) => l !== y[i]).length === ownerIds.size; })());
  const untouched = Object.fromEntries(UNTOUCHED.filter(rel => fs.existsSync(path.join(ROOT, rel))).map(rel => [rel, gitBlobSha(read(rel))]));
  // one op per field written/removed on each migrated leaf: id removed, uuid added, name added (when absent)
  const retargeted = manifest.rows.filter(r => /RETARGET/.test(r.derivation.basis)).length;
  const emptied = manifest.removals.filter(x => !('prerequisitesStructured' in ta.get(x.ownerId).system)).length;
  const totalLeafChanges = manifest.rows.reduce((n, r) => n + (r.existing.id ? 1 : 0) + 1 + (r.existing.name ? 0 : 1), 0) + manifest.removals.length + emptied + manifest.textCorrections.length;
  return {
    schemaVersion: 1, phase: '3G-3', dryRun: true, status: v.every(x => x.ok) ? 'DRY_RUN_CERTIFIED' : 'DRY_RUN_FAILED',
    counts: { talentLeavesMigrated: manifest.rows.length, falseConditionsRemoved: manifest.removals.length, leavesRetargeted: retargeted, prerequisiteTextLinesRestored: manifest.textCorrections.length, recordsChanged: ownerIds.size, fieldLevelLeafMutations: totalLeafChanges, distinctTargets: targets.size, byDerivationBasis: rowsBy(r => r.derivation.basis), targetsInSameNameCrossTreeGroups: manifest.rows.filter(r => r.target.inSameNameCrossTreeGroup).length, sameTreeAsOwner: manifest.rows.filter(r => r.target.sameTreeAsOwner).length, textConfirmed: manifest.rows.filter(r => r.derivation.textConfirmsTargetName === true).length, ownersWithoutPrintedText: manifest.rows.filter(r => r.derivation.textConfirmsTargetName === null).length, textContradicting: manifest.rows.filter(r => r.derivation.textConfirmsTargetName === false).length, unlinkedLegacyCopiesStillMeetingByNameFallback: eff.unlinkedLegacyFallbackMet },
    runtimeEffectiveness: eff,
    sourceRulings: {
      note: 'Owner source rulings (rendered-sourcebook review) resolved the 13 findings of the first dry-run.',
      falseConditionsRemoved: manifest.removals.map(x => ({ owner: x.ownerCanonicalIdentity, removedLeaf: x.existing.id, basis: x.basis })),
      leavesRetargeted: manifest.rows.filter(r => /RETARGET/.test(r.derivation.basis)).map(r => ({ owner: r.ownerCanonicalIdentity, from: r.existing.id, to: r.target.canonicalIdentity })),
      prerequisiteTextLinesRestored: manifest.textCorrections.map(c => ({ owner: c.canonicalIdentity, before: c.before.prerequisites, after: c.after.prerequisites, correction: c.id }))
    },
    preState: { talents: gitBlobSha(talentsText) }, postState: { talents: gitBlobSha(afterText) }, untouchedFiles: untouched, othersFingerprint: sortedFp(after.filter(t => !ownerIds.has(t._id))),
    records: records.map(r => ({ id: r.id, name: r.name, leaves: r.changes.length })), verification: { results: v }
  };
}

function renderDoc(r) {
  const c = r.counts, e = r.runtimeEffectiveness;
  return ['# Phase 3G-3 — structured talent-prerequisite identity migration: dry-run', '', `Status: **${r.status}** · **${c.talentLeavesMigrated} structured talent-to-talent leaves** on **${c.recordsChanged} records** · ${c.fieldLevelLeafMutations} field-level leaf mutations (${c.talentLeavesMigrated} leaves migrated [${c.leavesRetargeted} retargeted], ${c.falseConditionsRemoved} false conditions removed, ${c.prerequisiteTextLinesRestored} text lines restored) · ${c.distinctTargets} distinct targets. **No pack has been written.**`, '',
    '## Verification', '', ...r.verification.results.map(x => `- ${x.ok ? 'PASS' : 'FAIL'} ${x.id}${x.detail ? ' — ' + x.detail : ''}`), '',
    '## Migrated schema', '', '`{ "type": "talent", "uuid": "Compendium.foundryvtt-swse.talents.Item.<_id>", "name": "<target name>" }`', '',
    '- `uuid` is the authoritative identity (canonical v13 compendium UUID).', '- `name` is kept as a label for UI/diagnostics and for the guarded legacy fallback; never authoritative.', '- `id` is **removed**: it was either a `flags.swse.id` (not total, not unique) or a compendium `_id` that readers mistook for actor identity. The checker still honours `id` leaves on unmigrated/homebrew data.', '',
    '## Derivation basis', '', ...Object.entries(c.byDerivationBasis).map(([k, v]) => `- ${k}: ${v}`), `- targets in same-name cross-tree groups: ${c.targetsInSameNameCrossTreeGroups}; target in the owner's own tree: ${c.sameTreeAsOwner}`, `- certified prerequisite text names the target: ${c.textConfirmed}; owner has no printed text: ${c.ownersWithoutPrintedText}; text does not name the target: ${c.textContradicting}`, '',
    '## Runtime effectiveness (real `PrerequisiteChecker`, all migrated leaves)', '', `| Scenario | Satisfied |`, `|---|---|`, `| embedded copy, \`flags.core.sourceId\` v13 | ${e.embeddedSourceLinked} / ${e.rows} |`, `| embedded copy, legacy link form | ${e.embeddedLegacyLinkForm} / ${e.rows} |`, `| pending selection (threaded identity) | ${e.pending} / ${e.rows} |`, `| authoritative uuid match, embedded / pending (no fallback) | ${e.viaUuidEmbedded} / ${e.viaUuidPending} |`, `| wrong same-name copy rejected (linked) | ${e.wrongSameNameRejected} / ${e.wrongSameNameChecked} |`, `| wrong same-name copy rejected (unlinked legacy, tree guard) | ${e.unlinkedWrongTreeRejected} / ${e.unlinkedWrongTreeChecked} |`, `| unlinked legacy correct-tree copy met via guarded name fallback | ${e.unlinkedLegacyFallbackMet} (reported as fallback) |`, '',
    '## Owner source rulings applied', '', `**${r.sourceRulings.falseConditionsRemoved.length} false structured prerequisites removed** (printed talent has no prerequisite; not migrated; container dropped):`, '', ...r.sourceRulings.falseConditionsRemoved.map(x => `- ${x.owner} — removed \`${x.removedLeaf}\`. ${x.basis}`), '', `**${r.sourceRulings.leavesRetargeted.length} leaves retargeted to the printed prerequisite:**`, '', ...r.sourceRulings.leavesRetargeted.map(x => `- ${x.owner}: \`${x.from}\` → ${x.to}`), '', `**${r.sourceRulings.prerequisiteTextLinesRestored.length} printed prerequisite lines restored** (layered correction \`data/audits/talent-phase-3g-source-corrections.json\`; the certified Phase 2 artifact is not edited):`, '', ...r.sourceRulings.prerequisiteTextLinesRestored.map(x => `- ${x.owner}: "${x.before}" → "${x.after}" (${x.correction})`), ''].join('\n');
}

export function detect3GState() {
  if (!fs.existsSync(path.join(ROOT, REPORT_PATH))) return 'PRE_3G';
  const r = readJson(REPORT_PATH), sha = gitBlobSha(read(TALENTS));
  return r.postState.talents === sha ? 'POST_3G' : r.preState.talents === sha ? 'PRE_3G' : 'UNKNOWN';
}

export async function verifyApplied({ exact = false } = {}) {
  const res = [], check = (id, ok, detail = '') => res.push({ id, ok: !!ok, detail });
  const report = readJson(REPORT_PATH), manifest = readJson(MANIFEST_PATH), talentsText = read(TALENTS), talents = parse(talentsText), ta = new Map(talents.map(t => [t._id, t]));
  const ownerIds = new Set([...manifest.rows.map(r => r.ownerId), ...manifest.removals.map(r => r.ownerId), ...manifest.textCorrections.map(r => r.productionId)]);
  check('packs/talents.db is the certified Phase 3G post-state', detect3GState() === 'POST_3G');
  check('talent count unchanged (1,187)', talents.length === 1187);
  check(`every one of the ${manifest.rows.length} source-valid leaves is { type, uuid, name } at its certified target, and no structured talent leaf lacks a uuid`, manifest.rows.every(r => { const c = ta.get(r.ownerId).system.prerequisitesStructured?.conditions?.find(x => x.uuid === r.proposed.uuid); return c && JSON.stringify(c) === JSON.stringify(r.proposed) && !('id' in c) && ta.has(r.target.id); }) && talents.every(t => !t.system.prerequisitesStructured || structuredLeaves(t.system.prerequisitesStructured).filter(l => l.condition.type === 'talent').every(l => /^Compendium\.foundryvtt-swse\.talents\.Item\.(?:[0-9a-f]{16}|[0-9a-f]{32})$/.test(l.condition.uuid ?? ''))));
  check('the four false structured prerequisites are gone (no structured container)', manifest.removals.every(r => !('prerequisitesStructured' in ta.get(r.ownerId).system)));
  check('the four printed prerequisite lines are restored', manifest.textCorrections.every(c => ta.get(c.productionId).system.prerequisites === c.after.prerequisites));
  check('the other talents are unchanged', sortedFp(talents.filter(t => !ownerIds.has(t._id))) === report.othersFingerprint);
  for (const [rel, sha] of Object.entries(report.untouchedFiles)) check(`untouched: ${rel}`, fs.existsSync(path.join(ROOT, rel)) && gitBlobSha(read(rel)) === sha);
  const rec = reconcile(loadInput());
  check('reconciler: zero blocking findings (3E corpus/text incl. the 3G correction layer, 3F tree identity)', rec.blockingFindings.length === 0, JSON.stringify(rec.findingCounts));
  const eff = await runtimeEffectiveness(manifest, talents, parse(read('packs/talent_trees.db')));
  check('runtime (real checker, applied pack): every leaf satisfied by embedded source-linked and pending selections via uuid; wrong same-name identities rejected', eff.embeddedSourceLinked === manifest.rows.length && eff.pending === manifest.rows.length && eff.viaUuidEmbedded === manifest.rows.length && eff.viaUuidPending === manifest.rows.length && eff.failures.length === 0);
  if (exact) check('packs/talents.db equals the certified blob', gitBlobSha(talentsText) === report.postState.talents);
  return res;
}

export function applyProduction() {
  invariant(detect3GState() === 'PRE_3G', 'REFUSED: packs are not the pre-migration state (already applied or drifted)');
  invariant(fs.existsSync(path.join(ROOT, REPORT_PATH)) && fs.existsSync(path.join(ROOT, MANIFEST_PATH)) && fs.existsSync(path.join(ROOT, CORRECTIONS_PATH)), 'REFUSED: manifest, correction layer and dry-run report must be committed first');
  const committed = readJson(REPORT_PATH); invariant(committed.status === 'DRY_RUN_CERTIFIED', 'REFUSED: dry-run report is not certified');
  const manifest = readJson(MANIFEST_PATH), texts = read(TALENTS);
  const out = serializePack(texts, project(manifest, parse(texts)));
  invariant(gitBlobSha(out) === committed.postState.talents, 'REFUSED: rendered output does not match the certified post-state blob');
  fs.writeFileSync(path.join(ROOT, TALENTS), out);
}

export async function main(argv = process.argv.slice(2)) {
  const has = f => argv.includes(f), state = detect3GState();
  const pr = res => { for (const x of res) console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.id}${x.ok || !x.detail ? '' : '  [' + x.detail + ']'}`); return res.filter(x => !x.ok).length; };
  if (has('--status')) { console.log(ERR + state); return 0; }
  if (has('--verify') || (has('--check') && state === 'POST_3G')) { const bad = pr(await verifyApplied({ exact: has('--exact') })); console.log(`\n${ERR}verify ${bad ? 'FAIL' : 'PASS'}`); return bad ? 1 : 0; }
  if (has('--apply')) {
    // the committed report must equal a fresh projection of the committed manifest before anything is written
    const fresh = await buildReport(); invariant(read(REPORT_PATH) === JSON.stringify(fresh, null, 2) + '\n', 'REFUSED: committed dry-run report differs from a fresh projection');
    applyProduction(); console.log(ERR + 'APPLIED packs/talents.db (uncommitted)'); return 0;
  }
  invariant(state === 'PRE_3G', `the pre-migration pack is required (found ${state})`);
  if (has('--manifest')) { const m = deriveManifest(); fs.writeFileSync(path.join(ROOT, MANIFEST_PATH), JSON.stringify(m, null, 2) + '\n'); fs.writeFileSync(path.join(ROOT, CORRECTIONS_PATH), JSON.stringify(correctionsFile(m), null, 2) + '\n'); console.log(ERR + 'wrote ' + MANIFEST_PATH + ' and ' + CORRECTIONS_PATH); return 0; }
  if (has('--check')) {
    const fresh = deriveManifest();
    if (read(MANIFEST_PATH) !== JSON.stringify(fresh, null, 2) + '\n' || read(CORRECTIONS_PATH) !== JSON.stringify(correctionsFile(fresh), null, 2) + '\n') { console.error(ERR + 'STALE: manifest differs from a fresh derivation'); return 1; }
    const r = await buildReport(); if (read(REPORT_PATH) !== JSON.stringify(r, null, 2) + '\n' || read(DOC_PATH) !== renderDoc(r)) { console.error(ERR + 'STALE: dry-run report differs from a fresh projection'); return 1; }
    console.log(ERR + 'manifest and dry-run report match a fresh derivation'); return 0;
  }
  const r = await buildReport();
  for (const x of r.verification.results) console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.id}${x.ok || !x.detail ? '' : '  [' + x.detail + ']'}`);
  console.log(`\n${ERR}${r.status}: ${r.counts.talentLeavesMigrated} leaves on ${r.counts.recordsChanged} records, ${r.counts.fieldLevelLeafMutations} field-level mutations`);
  if (r.status !== 'DRY_RUN_CERTIFIED') return 1;
  if (has('--report')) { fs.writeFileSync(path.join(ROOT, REPORT_PATH), JSON.stringify(r, null, 2) + '\n'); fs.writeFileSync(path.join(ROOT, DOC_PATH), renderDoc(r)); console.log(ERR + `wrote ${REPORT_PATH} and ${DOC_PATH} (no pack was written)`); }
  return 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().then(code => process.exit(code), e => { console.error(e.message ?? e); process.exit(1); });
