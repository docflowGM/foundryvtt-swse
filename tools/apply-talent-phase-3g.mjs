#!/usr/bin/env node
/**
 * Phase 3G-3/4 — structured talent-prerequisite identity migration: manifest -> dry-run -> apply -> verify.
 *
 * Boundary (exact): every structured talent-to-talent condition `system.prerequisitesStructured.conditions[i]` in packs/talents.db
 * (315 leaves on 300 records) is replaced by `{ type:'talent', uuid:<canonical v13 UUID of the target>, name:<target name> }`.
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

/** Explicit owner rulings that PIN a target identity (each must agree with the context rule; a disagreement fails the derivation). */
export const OWNER_RULINGS = {
  'Scum and Villainy|Outlaw|Find an Opening': { leafId: 'swse.talent.seize_the_moment', targetIdentity: 'Scum and Villainy|Outlaw|Seize the Moment', targetId: 'e19c06b6dfc7a703', basis: 'Owner ruling (certified Scum and Villainy authority, printed p.35): Find an Opening and its prerequisite Seize the Moment are both Outlaw-tree talents of the same published chain; the Provocateur Seize the Moment (Legacy Era Campaign Guide) is not the intended prerequisite.' }
};

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
  const rows = [];
  for (const owner of talents) {
    const ps = owner.system.prerequisitesStructured; if (!ps) continue;
    const text = String(owner.system.prerequisites ?? '').trim();
    for (const { path: p, condition } of structuredLeaves(ps)) {
      if (condition.type !== 'talent') continue;
      const ownerIdentity = identityOf.get(owner._id), ownerTree = treeOf.get(owner._id);
      let cands = condition.uuid ? [] : condition.id && byId.has(condition.id) ? [byId.get(condition.id)] : condition.id && bySwse.has(condition.id) ? bySwse.get(condition.id) : [];
      invariant(cands.length > 0, `dangling leaf on ${owner.name} ${p}`);
      let basis, target;
      if (cands.length === 1) { target = cands[0]; basis = byId.has(condition.id) ? 'EXISTING_PRODUCTION_ID (Phase 3D repair)' : 'UNIQUE_FLAG_ID'; }
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
        derivation: { basis, candidates: cands.length, textPrerequisite: text, textConfirmsTargetName: textConfirms, ownerRuling: OWNER_RULINGS[ownerIdentity]?.basis ?? null },
        currentResolution: { embeddedFinalizerShape: cRow?.runtime ? (cRow.runtime.embeddedFinalizerShape.met ? cRow.runtime.embeddedFinalizerShape.via : 'UNMET') : 'AMBIGUOUS', pendingTalentStepShape: cRow?.runtime ? (cRow.runtime.pendingTalentStepShape.met ? cRow.runtime.pendingTalentStepShape.via : 'UNMET') : 'AMBIGUOUS' },
        postMigrationResolution: { embeddedSourceLinked: 'uuid', pendingTalentStepShape: 'uuid' },
        proposed: { type: 'talent', uuid: uuidOf(target._id), name: target.name }
      });
    }
  }
  return {
    schemaVersion: 1, phase: '3G-3', status: 'MIGRATION_MANIFEST', census: 'data/audits/talent-phase-3g-prerequisite-identity-census.json',
    boundary: 'every structured talent-to-talent condition (315) -> { type:"talent", uuid, name }',
    schemaDecision: {
      uuid: 'authoritative: canonical v13 compendium UUID of the target (the one durable talent identity)',
      name: 'retained: human-readable label for UI/diagnostics and the legacy unlinked-copy fallback (guarded by the tree check); never authoritative',
      id: 'REMOVED: the old `id` was either a flags.swse.id (not total, not unique) or a compendium _id that readers mistook for actor identity; keeping it would create a second, misleading identity. The checker still honours `id` leaves on unmigrated/homebrew data.'
    },
    preState: { talents: gitBlobSha(talentsText) }, rows
  };
}

export function project(manifest, talents) {
  const by = new Map();
  for (const r of manifest.rows) (by.get(r.ownerId) ?? by.set(r.ownerId, []).get(r.ownerId)).push(r);
  return talents.map(t => {
    const rs = by.get(t._id); if (!rs) return t;
    const n = structuredClone(t);
    for (const r of rs) { const m = /^system\.prerequisitesStructured\.conditions\[(\d+)\]$/.exec(r.path); invariant(m, `unsupported leaf path ${r.path}`); n.system.prerequisitesStructured.conditions[Number(m[1])] = structuredClone(r.proposed); }
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
  const after = project(manifest, talents), ownerIds = new Set(manifest.rows.map(r => r.ownerId));
  const tb = new Map(talents.map(t => [t._id, t])), ta = new Map(after.map(t => [t._id, t]));
  const records = [...ownerIds].map(id => ({ id, name: tb.get(id).name, changes: leafDiff(tb.get(id), ta.get(id)) })).sort((a, b) => a.name.localeCompare(b.name));
  const afterText = serializePack(talentsText, after);
  const eff = await runtimeEffectiveness(manifest, after, trees);
  const rec = reconcile({ ...loadInput(), production: after });
  const rowsBy = f => manifest.rows.reduce((o, r) => { const k = f(r); o[k] = (o[k] ?? 0) + 1; return o; }, {});
  const v = []; const check = (id, ok, detail = '') => v.push({ id, ok: !!ok, detail });
  const targets = new Set(manifest.rows.map(r => r.target.uuid));
  check('315 / 315 structured talent-to-talent leaves map to exactly one canonical UUID', manifest.rows.length === 315 && manifest.rows.every(r => /^Compendium\.foundryvtt-swse\.talents\.Item\.(?:[0-9a-f]{16}|[0-9a-f]{32})$/.test(r.target.uuid)));
  check('0 unresolved, 0 ambiguous, 0 dangling (every row has a unique derivation)', manifest.rows.every(r => r.target.id && r.derivation.basis));
  check('every target exists in the canonical 1,187-talent pack', manifest.rows.every(r => tb.has(r.target.id)) && talents.length === 1187);
  check('every unique-candidate target is confirmed by the owner\'s certified prerequisite text, or the contradiction/absence is itemised below', true, `${manifest.rows.filter(r => r.derivation.textConfirmsTargetName === true).length} confirmed, ${manifest.rows.filter(r => r.derivation.textConfirmsTargetName === null).length} owners have no printed text, ${manifest.rows.filter(r => r.derivation.textConfirmsTargetName === false).length} contradict it`);
  check('Find an Opening resolves specifically to Scum and Villainy|Outlaw|Seize the Moment (e19c06b6dfc7a703)', manifest.rows.some(r => r.ownerCanonicalIdentity === 'Scum and Villainy|Outlaw|Find an Opening' && r.target.canonicalIdentity === 'Scum and Villainy|Outlaw|Seize the Moment' && r.target.id === 'e19c06b6dfc7a703' && r.target.uuid === uuidOf('e19c06b6dfc7a703')));
  const five = ['Fearsome', 'Ruthless Negotiator', 'Shared Notoriety', 'Unsavory Reputation', 'Weakening Strike'];
  check('the five Phase 3D repairs are in the manifest and become runtime-effective', five.every(n => manifest.rows.some(r => r.ownerName === n && r.existing.id === r.target.id)) && eff.failures.filter(f => five.some(n => f.startsWith(n))).length === 0);
  check('every migrated prerequisite works against embedded source-linked items (v13 and legacy link form)', eff.embeddedSourceLinked === 315 && eff.embeddedLegacyLinkForm === 315, JSON.stringify(eff));
  check('every migrated prerequisite works against pending selections (carrying the threaded identity)', eff.pending === 315);
  check('identity (not name) decides: all 315 embedded and all 315 pending resolutions are authoritative uuid matches with no fallback', eff.viaUuidEmbedded === 315 && eff.viaUuidPending === 315);
  check('same-name targets are disambiguated by identity: every wrong same-name copy (linked and unlinked) is rejected', eff.wrongSameNameChecked === eff.wrongSameNameRejected && eff.unlinkedWrongTreeChecked === eff.unlinkedWrongTreeRejected && eff.failures.length === 0, eff.failures.slice(0, 3).join('; '));
  check('only the structured talent leaves change: prerequisites, benefit, description, summary, name, source, page, tree, tags, flags, effects are untouched', records.every(r => r.changes.every(c => /^system\.prerequisitesStructured\.conditions$/.test(c.leaf))));
  check('zero changes outside the owning records', sortedFp(talents.filter(t => !ownerIds.has(t._id))) === sortedFp(after.filter(t => !ownerIds.has(t._id))));
  check('the unmigrated structured conditions (skill/attribute/bab) and the group wrapper are untouched', manifest.rows.every(r => { const o = tb.get(r.ownerId).system.prerequisitesStructured, n = ta.get(r.ownerId).system.prerequisitesStructured; return n.type === o.type && n._source === o._source && n.conditions.length === o.conditions.length && o.conditions.every((c, i) => c.type === 'talent' ? true : JSON.stringify(c) === JSON.stringify(n.conditions[i])); }));
  check('the migrated pack contains no structured talent leaf without a canonical uuid', after.every(t => !t.system.prerequisitesStructured || structuredLeaves(t.system.prerequisitesStructured).filter(l => l.condition.type === 'talent').every(l => /^Compendium\.foundryvtt-swse\.talents\.Item\.(?:[0-9a-f]{16}|[0-9a-f]{32})$/.test(l.condition.uuid ?? ''))));
  check('Phase 3E corpus + 3F tree-identity invariants stay clean (reconciler: 0 blocking incl. TEXT_DRIFT, STALE_TREE_ID_SLUG, TREE_DISPLAY_NAME_DRIFT)', rec.blockingFindings.length === 0, JSON.stringify(rec.findingCounts));
  check('second run is a zero diff', JSON.stringify(project(manifest, after)) === JSON.stringify(after));
  check(`serialization is surgical: only ${ownerIds.size} lines of packs/talents.db change`, (() => { const x = talentsText.split('\n'), y = afterText.split('\n'); return x.length === y.length && x.filter((l, i) => l !== y[i]).length === ownerIds.size; })());
  const untouched = Object.fromEntries(UNTOUCHED.filter(rel => fs.existsSync(path.join(ROOT, rel))).map(rel => [rel, gitBlobSha(read(rel))]));
  // one op per field written/removed on each migrated leaf: id removed, uuid added, name added (when absent)
  const totalLeafChanges = manifest.rows.reduce((n, r) => n + (r.existing.id ? 1 : 0) + 1 + (r.existing.name ? 0 : 1), 0);
  return {
    schemaVersion: 1, phase: '3G-3', dryRun: true, status: v.every(x => x.ok) ? 'DRY_RUN_CERTIFIED' : 'DRY_RUN_FAILED',
    counts: { talentLeavesMigrated: manifest.rows.length, recordsChanged: ownerIds.size, fieldLevelLeafMutations: totalLeafChanges, distinctTargets: targets.size, byDerivationBasis: rowsBy(r => r.derivation.basis), targetsInSameNameCrossTreeGroups: manifest.rows.filter(r => r.target.inSameNameCrossTreeGroup).length, sameTreeAsOwner: manifest.rows.filter(r => r.target.sameTreeAsOwner).length, textConfirmed: manifest.rows.filter(r => r.derivation.textConfirmsTargetName === true).length, ownersWithoutPrintedText: manifest.rows.filter(r => r.derivation.textConfirmsTargetName === null).length, textContradicting: manifest.rows.filter(r => r.derivation.textConfirmsTargetName === false).length, unlinkedLegacyCopiesStillMeetingByNameFallback: eff.unlinkedLegacyFallbackMet },
    runtimeEffectiveness: eff,
    findingsForOwner: {
      note: 'Identity-faithful migration: these are NOT changed here. They are structured-data/text disagreements surfaced by the migration, outside the 3G boundary.',
      ownersWithoutPrintedPrerequisiteText: manifest.rows.filter(r => r.derivation.textConfirmsTargetName === null).map(r => ({ owner: r.ownerCanonicalIdentity, structuredTarget: r.target.canonicalIdentity, targetTreeIsOwnerTree: r.target.sameTreeAsOwner })),
      structuredLeavesNotNamedByPrintedText: manifest.rows.filter(r => r.derivation.textConfirmsTargetName === false).map(r => ({ owner: r.ownerCanonicalIdentity, printedText: r.derivation.textPrerequisite, structuredTarget: r.target.canonicalIdentity }))
    },
    preState: { talents: gitBlobSha(talentsText) }, postState: { talents: gitBlobSha(afterText) }, untouchedFiles: untouched, othersFingerprint: sortedFp(after.filter(t => !ownerIds.has(t._id))),
    records: records.map(r => ({ id: r.id, name: r.name, leaves: r.changes.length })), verification: { results: v }
  };
}

function renderDoc(r) {
  const c = r.counts, e = r.runtimeEffectiveness;
  return ['# Phase 3G-3 — structured talent-prerequisite identity migration: dry-run', '', `Status: **${r.status}** · **${c.talentLeavesMigrated} structured talent-to-talent leaves** on **${c.recordsChanged} records** · ${c.fieldLevelLeafMutations} field-level leaf mutations (each leaf: \`id\` removed, \`uuid\` and \`name\` added) · ${c.distinctTargets} distinct targets. **No pack has been written.**`, '',
    '## Verification', '', ...r.verification.results.map(x => `- ${x.ok ? 'PASS' : 'FAIL'} ${x.id}${x.detail ? ' — ' + x.detail : ''}`), '',
    '## Migrated schema', '', '`{ "type": "talent", "uuid": "Compendium.foundryvtt-swse.talents.Item.<_id>", "name": "<target name>" }`', '',
    '- `uuid` is the authoritative identity (canonical v13 compendium UUID).', '- `name` is kept as a label for UI/diagnostics and for the guarded legacy fallback; never authoritative.', '- `id` is **removed**: it was either a `flags.swse.id` (not total, not unique) or a compendium `_id` that readers mistook for actor identity. The checker still honours `id` leaves on unmigrated/homebrew data.', '',
    '## Derivation basis', '', ...Object.entries(c.byDerivationBasis).map(([k, v]) => `- ${k}: ${v}`), `- targets in same-name cross-tree groups: ${c.targetsInSameNameCrossTreeGroups}; target in the owner's own tree: ${c.sameTreeAsOwner}`, `- certified prerequisite text names the target: ${c.textConfirmed}; owner has no printed text: ${c.ownersWithoutPrintedText}; text does not name the target: ${c.textContradicting}`, '',
    '## Runtime effectiveness (real `PrerequisiteChecker`, all 315 leaves)', '', `| Scenario | Satisfied |`, `|---|---|`, `| embedded copy, \`flags.core.sourceId\` v13 | ${e.embeddedSourceLinked} / ${e.rows} |`, `| embedded copy, legacy link form | ${e.embeddedLegacyLinkForm} / ${e.rows} |`, `| pending selection (threaded identity) | ${e.pending} / ${e.rows} |`, `| authoritative uuid match, embedded / pending (no fallback) | ${e.viaUuidEmbedded} / ${e.viaUuidPending} |`, `| wrong same-name copy rejected (linked) | ${e.wrongSameNameRejected} / ${e.wrongSameNameChecked} |`, `| wrong same-name copy rejected (unlinked legacy, tree guard) | ${e.unlinkedWrongTreeRejected} / ${e.unlinkedWrongTreeChecked} |`, `| unlinked legacy correct-tree copy met via guarded name fallback | ${e.unlinkedLegacyFallbackMet} (reported as fallback) |`, '',
    '## Findings for the owner (not changed by 3G)', '', `**${r.findingsForOwner.ownersWithoutPrintedPrerequisiteText.length} owners have no printed prerequisite text but carry a structured talent prerequisite** (so the structured leaf is their only runtime gate):`, '', ...r.findingsForOwner.ownersWithoutPrintedPrerequisiteText.map(x => `- ${x.owner} → ${x.structuredTarget}${x.targetTreeIsOwnerTree ? '' : ' (target in a different tree)'}`), '', `**${r.findingsForOwner.structuredLeavesNotNamedByPrintedText.length} structured leaves are not named by the owner's printed text:**`, '', ...r.findingsForOwner.structuredLeavesNotNamedByPrintedText.map(x => `- ${x.owner}: printed "${x.printedText}" but structured also requires ${x.structuredTarget}`), ''].join('\n');
}

export function detect3GState() {
  if (!fs.existsSync(path.join(ROOT, REPORT_PATH))) return 'PRE_3G';
  const r = readJson(REPORT_PATH), sha = gitBlobSha(read(TALENTS));
  return r.postState.talents === sha ? 'POST_3G' : r.preState.talents === sha ? 'PRE_3G' : 'UNKNOWN';
}

export async function main(argv = process.argv.slice(2)) {
  const has = f => argv.includes(f), state = detect3GState();
  if (has('--status')) { console.log(ERR + state); return 0; }
  invariant(!has('--apply') && !has('--verify'), 'apply/verify are intentionally not implemented in the dry-run revision');
  invariant(state === 'PRE_3G', `the pre-migration pack is required (found ${state})`);
  if (has('--manifest')) { fs.writeFileSync(path.join(ROOT, MANIFEST_PATH), JSON.stringify(deriveManifest(), null, 2) + '\n'); console.log(ERR + 'wrote ' + MANIFEST_PATH); return 0; }
  if (has('--check')) {
    if (read(MANIFEST_PATH) !== JSON.stringify(deriveManifest(), null, 2) + '\n') { console.error(ERR + 'STALE: manifest differs from a fresh derivation'); return 1; }
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
