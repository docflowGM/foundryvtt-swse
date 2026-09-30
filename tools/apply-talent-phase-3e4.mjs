#!/usr/bin/env node
/**
 * Phase 3E-4 — Seven-record canonical production repair (manifest -> dry-run -> apply -> verify).
 *
 * Boundary: exactly the seven Phase 3E addendum identities in packs/talents.db. Authority = the PDF-verified addendum
 * (data/audits/talent-phase-3e-canonical-additions.json). Nothing else is written: no tree, class, actor, homebrew,
 * registry or derived-mirror file, no id/name/tree change, and no `system.summary` (the seven have none; not invented here).
 *
 *   --manifest          write data/audits/talent-phase-3e4-repair-manifest.json (pre-state only; derived from the addendum)
 *   --report            write data/audits/talent-phase-3e4-dry-run-report.json (pre-state only; no pack is written)
 *   --check             pre-state: manifest + report equal a fresh projection; post-state: same as --verify
 *   --apply             write packs/talents.db (uncommitted), refusing drifted / partial / unexpected states
 *   --verify [--exact]  check the applied state; --exact also compares the certified blob
 *   --status            print PRE_3E4 / POST_3E4 / UNKNOWN
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, serializePack, gitBlobSha, fingerprint } from './apply-talent-phase-3c.mjs';

export const MANIFEST_PATH = 'data/audits/talent-phase-3e4-repair-manifest.json';
export const REPORT_PATH = 'data/audits/talent-phase-3e4-dry-run-report.json';
export const ADDENDUM_PATH = 'data/audits/talent-phase-3e-canonical-additions.json';
export const TALENTS = 'packs/talents.db';
const UNTOUCHED = ['packs/talent_trees.db', 'packs/classes.db', 'packs/heroic.db', 'packs/nonheroic.db', 'packs/npc.db', 'packs/talents-homebrew.db', 'packs/talent-trees-homebrew.db',
  'data/generated/talent-trees.registry.json', 'data/fixes/talent-trees.registry.json', 'data/generated/talents.fixed.json', 'data/fixes/talents.fixed.json', 'data/class-archetypes.json', 'system.json'];
const SET_LEAVES = ['system.source', 'system.page', 'system.prerequisites', 'system.benefit', 'system.description'];
const ERR = '[talent-phase-3e4] ';
export const invariant = (ok, m) => { if (!ok) throw new Error(ERR + m); };

const readText = (rel, root) => fs.readFileSync(path.join(root, rel), 'utf8');
const readJson = (rel, root) => JSON.parse(readText(rel, root));
const parse = t => t.split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l));
const clone = v => structuredClone(v);
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
export function leavesOf(o, pre = '', out = {}) {
  for (const [k, v] of Object.entries(o)) { const p = pre ? `${pre}.${k}` : k; if (isObj(v) && Object.keys(v).length) leavesOf(v, p, out); else out[p] = JSON.stringify(v); }
  return out;
}
function setPath(obj, dotted, value) { const ks = dotted.split('.'); let o = obj; for (const k of ks.slice(0, -1)) o = o[k]; o[ks.at(-1)] = value; }
const getPath = (obj, dotted) => dotted.split('.').reduce((v, k) => (v == null ? undefined : v[k]), obj);

/** The value each set-leaf must hold, derived from the addendum (authority) for one addition row. */
export function targetLeaves(a) {
  const text = a.rulesText;
  return { 'system.source': a.publication.sourcebook, 'system.page': a.publication.page, 'system.prerequisites': a.prerequisites, 'system.benefit': text, 'system.description': { value: text } };
}

export function deriveManifest({ addendum, talents }) {
  const byId = new Map(talents.map(t => [t._id, t]));
  const records = addendum.additions.map(a => {
    const t = byId.get(a.production.id);
    invariant(t, `production record ${a.production.id} (${a.name}) missing`);
    invariant(a.publication.pageStatus === 'PDF_VERIFIED' && typeof a.rulesText === 'string' && a.rulesText, `${a.name}: addendum row is not PDF-verified with exact wording`);
    const set = targetLeaves(a);
    const before = Object.fromEntries(SET_LEAVES.map(l => [l, getPath(t, l) ?? null]));
    const rest = clone(t); for (const l of SET_LEAVES) setPath(rest, l, undefined);
    return { id: t._id, canonicalIdentity: a.canonicalIdentity, name: t.name, publication: a.publication, set, before, restFingerprint: fingerprint(JSON.parse(JSON.stringify(rest))) };
  });
  return {
    schemaVersion: 1, phase: '3E-4', status: 'REPAIR_MANIFEST', authority: ADDENDUM_PATH,
    boundary: 'exactly the seven Phase 3E addendum identities; leaves limited to ' + SET_LEAVES.join(', '),
    summaryPolicy: 'system.summary is neither written nor invented (the seven records carry none).',
    preState: { talents: null },
    records
  };
}

/** Pure projection: apply the manifest to the talents array. */
export function project(manifest, talents) {
  const ids = new Set(manifest.records.map(r => r.id));
  const after = talents.map(t => {
    if (!ids.has(t._id)) return t;
    const r = manifest.records.find(x => x.id === t._id), n = clone(t);
    for (const l of SET_LEAVES) setPath(n, l, clone(r.set[l]));
    return n;
  });
  return after;
}

const sortedFp = arr => fingerprint(arr.slice().sort((a, b) => a._id.localeCompare(b._id)));

export function leafDiff(before, after) {
  const b = leavesOf(before), a = leavesOf(after), out = [];
  for (const k of new Set([...Object.keys(b), ...Object.keys(a)])) if (b[k] !== a[k]) out.push({ leaf: k, before: b[k] === undefined ? '(absent)' : JSON.parse(b[k]), after: a[k] === undefined ? '(absent)' : JSON.parse(a[k]) });
  return out.sort((x, y) => x.leaf.localeCompare(y.leaf));
}

function embeddedActorItems(root, manifest, before, after) {
  const byId = new Map(manifest.records.map(r => [r.id, r]));
  const rows = [];
  for (const pack of ['heroic', 'nonheroic', 'npc']) for (const a of parse(readText(`packs/${pack}.db`, root))) for (const it of a.items ?? []) {
    const m = /talents\.([0-9a-f]{16})$/.exec(it.flags?.core?.sourceId ?? '');
    if (!m || !byId.has(m[1])) continue;
    const prod = before.get(m[1]), next = after.get(m[1]);
    rows.push({ pack, actor: a.name, item: it.name, itemId: it._id, productionId: m[1], benefitEqualsProductionBefore: it.system?.benefit === prod.system.benefit, benefitEqualsProductionAfter: it.system?.benefit === next.system.benefit });
  }
  const summary = { total: rows.length, byProductionId: {} };
  for (const r of rows) { const s = (summary.byProductionId[r.productionId] ??= { name: r.item, items: 0, verbatimCopyOfPreRepairProduction: 0 }); s.items++; if (r.benefitEqualsProductionBefore) s.verbatimCopyOfPreRepairProduction++; }
  return {
    policy: 'NOT MODIFIED. Embedded actor items are independent snapshots; most already differ from production before this repair (they are not kept in sync outside the Phase 3D repoint refresh). No runtime path was found that requires them to equal the compendium text.',
    ...summary, items: rows
  };
}

export function buildReport(root = ROOT) {
  const manifest = readJson(MANIFEST_PATH, root), talentsText = readText(TALENTS, root), talents = parse(talentsText);
  const afterTalents = project(manifest, talents), ids = new Set(manifest.records.map(r => r.id));
  const beforeById = new Map(talents.map(t => [t._id, t])), afterById = new Map(afterTalents.map(t => [t._id, t]));
  const leafChanges = manifest.records.map(r => ({ id: r.id, name: r.name, changes: leafDiff(beforeById.get(r.id), afterById.get(r.id)) }));
  const addendum = readJson(ADDENDUM_PATH, root);
  const outsideBefore = talents.filter(t => !ids.has(t._id)), outsideAfter = afterTalents.filter(t => !ids.has(t._id));
  const afterText = serializePack(talentsText, afterTalents);
  const v = [];
  const check = (id, ok, detail = '') => v.push({ id, ok: !!ok, detail });
  check('exactly seven target ids, each present once in the canonical pack', manifest.records.length === 7 && manifest.records.every(r => talents.filter(t => t._id === r.id).length === 1));
  check('target ids are exactly the Phase 3E addendum production ids', JSON.stringify(manifest.records.map(r => r.id).sort()) === JSON.stringify(addendum.additions.map(a => a.production.id).sort()));
  check('pack size unchanged (1,187)', talents.length === afterTalents.length && talents.length === 1187);
  check('zero changes outside the seven records', sortedFp(outsideBefore) === sortedFp(outsideAfter) && outsideBefore.length === 1180);
  check('only permitted leaves change (source, page, prerequisites, benefit, description)', leafChanges.every(c => c.changes.every(x => SET_LEAVES.some(l => x.leaf === l || x.leaf.startsWith(l + '.')))));
  check('no id / name / tree / tag / flag / effect change on the seven', manifest.records.every(r => { const b = beforeById.get(r.id), a = afterById.get(r.id); return a._id === b._id && a.name === b.name && a.system.treeId === b.system.treeId && JSON.stringify(a.system.tags) === JSON.stringify(b.system.tags) && JSON.stringify(a.flags) === JSON.stringify(b.flags) && JSON.stringify(a.effects) === JSON.stringify(b.effects); }));
  check('source/page equal the addendum publication (PDF-verified)', manifest.records.every(r => { const a = afterById.get(r.id).system; return a.source === r.publication.sourcebook && a.page === r.publication.page && r.publication.pageStatus === 'PDF_VERIFIED'; }));
  check('benefit == description.value == addendum exact wording', addendum.additions.every(a => { const s = afterById.get(a.production.id).system; return s.benefit === a.rulesText && s.description?.value === a.rulesText; }));
  check('prerequisites equal the addendum', addendum.additions.every(a => (afterById.get(a.production.id).system.prerequisites ?? '') === a.prerequisites));
  check('rest-of-record fingerprints (everything except the set leaves) are unchanged', manifest.records.every(r => { const n = clone(afterById.get(r.id)); for (const l of SET_LEAVES) setPath(n, l, undefined); return fingerprint(JSON.parse(JSON.stringify(n))) === r.restFingerprint; }));
  check('no system.summary written', manifest.records.every(r => !('summary' in afterById.get(r.id).system)));
  check('second run is a zero diff', JSON.stringify(project(manifest, afterTalents)) === JSON.stringify(afterTalents));
  check('serialization is surgical: only the seven lines of packs/talents.db change', (() => { const a = talentsText.split('\n'), b = afterText.split('\n'); return a.length === b.length && a.filter((l, i) => l !== b[i]).length === 7; })());
  const untouched = Object.fromEntries(UNTOUCHED.filter(rel => fs.existsSync(path.join(root, rel))).map(rel => [rel, gitBlobSha(readText(rel, root))]));
  return {
    schemaVersion: 1, phase: '3E-4', dryRun: true, status: v.every(x => x.ok) ? 'DRY_RUN_CERTIFIED' : 'DRY_RUN_FAILED',
    targetIds: manifest.records.map(r => r.id),
    counts: { canonicalTalents: talents.length, recordsChanged: leafChanges.filter(c => c.changes.length).length, leafChangesTotal: leafChanges.reduce((n, c) => n + c.changes.length, 0), changedOutsideSeven: 0 },
    preState: { talents: gitBlobSha(talentsText), ...Object.fromEntries(['trees', 'classes'].map(k => [k, gitBlobSha(readText(k === 'trees' ? 'packs/talent_trees.db' : 'packs/classes.db', root))])) },
    postState: { talents: gitBlobSha(afterText), trees: gitBlobSha(readText('packs/talent_trees.db', root)), classes: gitBlobSha(readText('packs/classes.db', root)) },
    untouchedFiles: untouched, othersFingerprint: sortedFp(outsideAfter),
    leafChanges, embeddedActorItems: embeddedActorItems(root, manifest, beforeById, afterById),
    verification: { results: v }
  };
}

export function detect3E4State(root = ROOT) {
  if (isLater(root)) return 'POST_3E5';
  const sha = gitBlobSha(readText(TALENTS, root));
  if (!fs.existsSync(path.join(root, REPORT_PATH))) return 'PRE_3E4';
  const r = readJson(REPORT_PATH, root);
  return r.postState.talents === sha ? 'POST_3E4' : r.preState.talents === sha ? 'PRE_3E4' : 'UNKNOWN';
}

// `later`: a certified state after 3E-4 (3E-5 repaired other records). Only the seven records and every 3E-4 invariant that 3E-5 cannot touch are checked.
const isLater = root => { const p = path.join(root, 'data/audits/talent-phase-3e5-dry-run-report.json'); return fs.existsSync(p) && readJson('data/audits/talent-phase-3e5-dry-run-report.json', root).postState.talents === gitBlobSha(readText(TALENTS, root)); };
export function verifyApplied(root = ROOT, { exact = false } = {}) {
  const later = isLater(root);
  const res = [], check = (id, ok, detail = '') => res.push({ id, ok: !!ok, detail });
  const manifest = readJson(MANIFEST_PATH, root), report = readJson(REPORT_PATH, root), addendum = readJson(ADDENDUM_PATH, root);
  const talentsText = readText(TALENTS, root), talents = parse(talentsText), by = new Map(talents.map(t => [t._id, t])), ids = new Set(manifest.records.map(r => r.id));
  if (!later) check('packs/talents.db is the certified Phase 3E-4 post-state', detect3E4State(root) === 'POST_3E4');
  check('canonical talent count 1,187', talents.length === 1187);
  for (const r of manifest.records) {
    const t = by.get(r.id);
    check(`${r.name}: every repaired leaf equals the manifest`, !!t && SET_LEAVES.every(l => JSON.stringify(getPath(t, l) ?? null) === JSON.stringify(r.set[l])));
    const n = clone(t ?? {}); for (const l of SET_LEAVES) if (t) setPath(n, l, undefined);
    check(`${r.name}: rest of record untouched`, !!t && fingerprint(JSON.parse(JSON.stringify(n))) === r.restFingerprint);
  }
  check('addendum authority: source/page/prerequisites/benefit/description.value all equal', addendum.additions.every(a => { const s = by.get(a.production.id)?.system; return s && s.source === a.publication.sourcebook && s.page === a.publication.page && (s.prerequisites ?? '') === a.prerequisites && s.benefit === a.rulesText && s.description?.value === a.rulesText; }));
  if (!later) check('the other 1,180 records are unchanged', sortedFp(talents.filter(t => !ids.has(t._id))) === report.othersFingerprint);
  for (const [rel, sha] of Object.entries(report.untouchedFiles)) if (!later || rel !== 'packs/talents.db') check(`untouched: ${rel}`, fs.existsSync(path.join(root, rel)) && gitBlobSha(readText(rel, root)) === sha);
  if (exact && !later) check('packs/talents.db equals the certified post-state blob', gitBlobSha(talentsText) === report.postState.talents);
  return res;
}

const printResults = res => { for (const r of res) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.id}${r.ok || !r.detail ? '' : '  [' + r.detail + ']'}`); };

export function applyProduction(root = ROOT) {
  invariant(!['POST_3E4', 'POST_3E5'].includes(detect3E4State(root)), 'REFUSED: already applied (use --verify --exact)');
  invariant(fs.existsSync(path.join(root, MANIFEST_PATH)) && fs.existsSync(path.join(root, REPORT_PATH)), 'REFUSED: manifest and dry-run report must be committed first');
  const committed = readJson(REPORT_PATH, root);
  invariant(committed.status === 'DRY_RUN_CERTIFIED', 'REFUSED: committed dry-run report is not certified');
  invariant(readText(REPORT_PATH, root) === JSON.stringify(buildReport(root), null, 2) + '\n', 'REFUSED: committed dry-run report differs from a fresh projection (production drifted or stale report)');
  const manifest = readJson(MANIFEST_PATH, root), text = readText(TALENTS, root);
  const out = serializePack(text, project(manifest, parse(text)));
  invariant(gitBlobSha(out) === committed.postState.talents, 'REFUSED: rendered pack does not match the certified post-state blob');
  fs.writeFileSync(path.join(root, TALENTS), out);
}

export function main(argv = process.argv.slice(2), root = ROOT) {
  const has = f => argv.includes(f);
  const state = detect3E4State(root);
  if (has('--status')) { console.log(ERR + state); return 0; }
  if (has('--verify') || (has('--check') && (state === 'POST_3E4' || state === 'POST_3E5'))) {
    const res = verifyApplied(root, { exact: has('--exact') }); printResults(res);
    const bad = res.filter(r => !r.ok).length; console.log(`\n${ERR}verify ${bad ? 'FAIL' : 'PASS'} (${res.length} checks; no files written)`); return bad ? 1 : 0;
  }
  if (has('--apply')) { applyProduction(root); console.log(ERR + 'APPLIED packs/talents.db (uncommitted)'); return 0; }
  invariant(state === 'PRE_3E4', `the pre-repair production pack is required (found ${state})`);
  if (has('--manifest')) {
    const m = deriveManifest({ addendum: readJson(ADDENDUM_PATH, root), talents: parse(readText(TALENTS, root)) });
    m.preState.talents = gitBlobSha(readText(TALENTS, root));
    fs.writeFileSync(path.join(root, MANIFEST_PATH), JSON.stringify(m, null, 2) + '\n'); console.log(ERR + `wrote ${MANIFEST_PATH}`); return 0;
  }
  if (has('--check')) {
    const m = deriveManifest({ addendum: readJson(ADDENDUM_PATH, root), talents: parse(readText(TALENTS, root)) }); m.preState.talents = gitBlobSha(readText(TALENTS, root));
    if (readText(MANIFEST_PATH, root) !== JSON.stringify(m, null, 2) + '\n') { console.error(ERR + 'STALE: manifest differs from a fresh derivation'); return 1; }
    const fresh = JSON.stringify(buildReport(root), null, 2) + '\n';
    if (!fs.existsSync(path.join(root, REPORT_PATH)) || readText(REPORT_PATH, root) !== fresh) { console.error(ERR + 'STALE: committed dry-run report differs from a fresh projection (run --report)'); return 1; }
    console.log(ERR + 'manifest and dry-run report match a fresh projection'); return 0;
  }
  const report = buildReport(root); printResults(report.verification.results);
  console.log(`\n${ERR}${report.status}: ${report.counts.recordsChanged} records, ${report.counts.leafChangesTotal} leaf changes, ${report.counts.changedOutsideSeven} outside the seven; embedded actor items referencing them: ${report.embeddedActorItems.total} (not modified)`);
  if (report.status !== 'DRY_RUN_CERTIFIED') return 1;
  if (has('--report')) { fs.writeFileSync(path.join(root, REPORT_PATH), JSON.stringify(report, null, 2) + '\n'); console.log(ERR + `wrote ${REPORT_PATH} (no pack was written)`); }
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exit(main()); } catch (e) { console.error(e.message); process.exit(1); }
}
