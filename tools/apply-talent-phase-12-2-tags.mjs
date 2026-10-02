#!/usr/bin/env node
/**
 * Phase 12-2 — apply the owner-certified semantic tags to the 876 already-tagged (non-orphan) canonical talents (system.tags only).
 *
 * Direct authority : data/audits/talent-phase-12-2-existing-tag-authority.json   (the 12-2 GLOBAL_QA authority, owner-authorized)
 * Cross-check      : data/audits/talent-phase-12-global-semantic-authority-qa5.json (QA5 full-corpus authority, verbatim)
 * Deterministic manifest application: system.tags := finalTags EXACTLY (add/delete/sort/normalize nothing, authored order kept). Targets resolve by canonical _id
 * only (name/page are stop-guards, never a fallback). UR-022 / GOI-002 stay untouched. The 309 Phase 12-1 talents are not touched. Same certified line-surgical
 * packs/talents.db serializer as Phases 3C-12-1 (serializePack); no parallel pack-writing mechanism.
 *
 * Every add/delete diff is DERIVED from existingTags -> finalTags. The supplied addTags/deleteTags/disposition labels are stale for the 13 records the global QA
 * sweep revised; finalTags (which agrees with QA5 for all 876) is authoritative, and the stale labels are reported, not applied.
 *
 *   --manifest --report --check --status --apply --verify [--exact]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, read, readJson, parse, TALENTS, HOMEBREW } from './talent-tag-io.mjs';
import { serializePack, gitBlobSha, fingerprint } from './apply-talent-phase-3c.mjs';
import { loadIdentityOf } from './apply-talent-phase-3g.mjs';
import { reconcile, loadInput } from './reconcile-talent-publication-corpus.mjs';
import { createProbe } from './talent-tag-probes.mjs';
import { detect12_1State, finalAdjudicationApplied, loadAuthority as loadAuthority12_1 } from './apply-talent-phase-12-1-tags.mjs';

export const AUTH = 'data/audits/talent-phase-12-2-existing-tag-authority.json', QA5 = 'data/audits/talent-phase-12-global-semantic-authority-qa5.json';
export const MANIFEST_PATH = 'data/audits/talent-phase-12-2-cleanup-manifest.json', REPORT_PATH = 'data/audits/talent-phase-12-2-dry-run-report.json', DOC_PATH = 'docs/audits/talent-phase-12-2-dry-run.md';
const ERR = '[talent-phase-12-2] ';
const invariant = (ok, m) => { if (!ok) throw new Error(ERR + m); };
const sortedFp = arr => fingerprint(arr.slice().sort((x, y) => x._id.localeCompare(y._id)));
const withoutTags = t => { const c = structuredClone(t); delete c.system.tags; return c; };
const tagsOf = t => (Array.isArray(t?.system?.tags) ? t.system.tags : []);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const census = talents => { const c = {}; for (const t of talents) for (const x of tagsOf(t)) c[x] = (c[x] ?? 0) + 1; return { unique: Object.keys(c).length, instances: Object.values(c).reduce((a, b) => a + b, 0), zero: talents.filter(t => !tagsOf(t).length).length, byTag: c }; };
const byId = talents => { const m = new Map(); for (const t of talents) { invariant(!m.has(t._id), `duplicate canonical _id ${t._id} in packs/talents.db`); m.set(t._id, t); } return m; };
const diffTags = (before, after) => ({ added: after.filter(x => !before.includes(x)), removed: before.filter(x => !after.includes(x)) });
const dispositionOf = ({ added, removed }) => (added.length && removed.length ? 'ADD_AND_DELETE' : added.length ? 'ADD' : removed.length ? 'DELETE' : 'KEEP');

/** The 12-2 authority cross-checked against QA5: every structural invariant asserted; fail-closed on any finalTags disagreement. */
export function validateAuthority(a, q5) {
  invariant(a.status === 'FINAL_FOR_EXECUTION' && a.ownerAuthorized === true && a.executionEnabled === true && a.claudeExecutionContract?.enabled === true, 'the 12-2 authority is not marked FINAL_FOR_EXECUTION / owner-authorized');
  const all = Object.values(a.batches).flatMap(b => b.assignments);
  invariant(all.length === 876 && a.phase12Corpus?.phase12_2AlreadyTagged === 876, `expected 876 Phase 12-2 assignments (found ${all.length})`);
  invariant(new Set(all.map(x => x.canonicalId)).size === 876 && new Set(all.map(x => x.auditKey)).size === 876, 'canonicalId and auditKey must each be unique across the 876 assignments');
  invariant(q5.corpus.certified === 1185 && q5.corpus.deferred === 2 && q5.corpus.phase12_1Certified === 309 && q5.corpus.phase12_2Certified === 876 && q5.certifiedAssignments.length === 1185, 'QA5 corpus summary is not the expected 1185 + 2');
  const defIds = new Set(q5.deferred.map(d => d.canonicalId));
  invariant(defIds.size === 2 && [...defIds].sort().join() === ['d376f165f1a47281', 'fd37b68c6fb620f6'].join(), 'QA5 deferrals must be exactly UR-022 and GOI-002');
  const qa = new Map(q5.certifiedAssignments.map(x => [x.canonicalId, x])); invariant(qa.size === 1185, 'QA5 certified ids must be unique');
  const vocab = new Set(q5.vocabulary.tags); invariant(vocab.size === 184 && q5.vocabulary.approvedTagCount === 184, 'QA5 vocabulary must be the 184 surviving tags');
  for (const x of all) {
    invariant(!defIds.has(x.canonicalId), `${x.auditKey}: a deferred id is in the mutation set`);
    invariant(Array.isArray(x.finalTags) && x.finalTags.length > 0 && x.finalTags.every(t => typeof t === 'string' && t), `${x.auditKey}: finalTags must be a non-empty string array`);
    invariant(new Set(x.finalTags).size === x.finalTags.length, `${x.auditKey}: duplicate tag inside finalTags`);
    invariant(x.finalTags.every(t => vocab.has(t)), `${x.auditKey}: tag outside the 184-tag vocabulary`);
    const q = qa.get(x.canonicalId); invariant(q, `${x.auditKey}: ${x.canonicalId} is missing from QA5`);
    invariant(same(q.finalTags, x.finalTags), `${x.auditKey} ${x.canonicalId}: 12-2 GLOBAL_QA and QA5 disagree on finalTags (12-2 ${JSON.stringify(x.finalTags)} vs QA5 ${JSON.stringify(q.finalTags)}) — fail closed`);
  }
  return { auth: a, q5, certified: all, deferred: q5.deferred, defIds, qa, vocab };
}
export const loadAuthority = () => validateAuthority(readJson(AUTH), readJson(QA5));

export function deriveManifest() {
  invariant(detect12_1State() === 'POST_12_1', 'the Phase 12-1 post-state is the required pre-state (found ' + detect12_1State() + ')');
  const { auth, certified, deferred, defIds } = loadAuthority(), text = read(TALENTS), talents = parse(text), idx = byId(talents), identityOf = loadIdentityOf(), c = census(talents);
  invariant(talents.length === 1187, `canonical talent count drifted (${talents.length})`);
  const rows = [], alreadyAtFinal = [], staleLabels = [];
  for (const x of certified) {
    const t = idx.get(x.canonicalId); invariant(t, `${x.auditKey}: canonicalId ${x.canonicalId} does not resolve`);
    invariant(t.name === x.name && t.system.page === x.page, `${x.auditKey}: identity guard failed (${x.canonicalId} resolves to "${t.name}" p.${t.system.page})`);
    const before = tagsOf(t), d = diffTags(x.existingTags, x.finalTags), disposition = dispositionOf(d);
    if (disposition !== x.disposition || !same([...d.added].sort(), [...(x.addTags ?? [])].sort()) || !same([...d.removed].sort(), [...(x.deleteTags ?? [])].sort())) staleLabels.push({ auditKey: x.auditKey, id: x.canonicalId, suppliedDisposition: x.disposition, derivedDisposition: disposition });
    if (same(before, x.finalTags)) { alreadyAtFinal.push(x.canonicalId); continue; } // an intervening legitimate change: report, no artificial churn
    invariant(same(before, x.existingTags), `${x.auditKey}: production tags differ from the authority's existingTags — repository drift, stop`);
    const { added, removed } = diffTags(before, x.finalTags);
    rows.push({ id: t._id, auditKey: x.auditKey, canonicalIdentity: identityOf.get(t._id) ?? null, name: t.name, path: 'system.tags', before, after: [...x.finalTags], added, removed, disposition: dispositionOf({ added, removed }) });
  }
  for (const d of deferred) { const t = idx.get(d.canonicalId); invariant(t && t.name === d.name && tagsOf(t).length === 0, `${d.auditKey}: deferred record must resolve once and carry no tags`); }
  rows.sort((a, b) => a.id.localeCompare(b.id));
  const dc = {}; for (const r of rows) dc[r.disposition] = (dc[r.disposition] ?? 0) + 1;
  return { schemaVersion: 1, phase: '12-2', status: 'CLEANUP_MANIFEST', authority: AUTH, crossCheck: QA5, boundary: 'system.tags of the 876 Phase 12-2 canonical talents: exact finalTags only',
    counts: { assignments: certified.length, recordsChanged: rows.length, alreadyAtFinal: alreadyAtFinal.length, dispositions: dc, tagElementsRemoved: rows.reduce((n, r) => n + r.removed.length, 0), tagElementsAdded: rows.reduce((n, r) => n + r.added.length, 0), staleSuppliedLabels: staleLabels.length },
    suppliedLabelDiscrepancies: { note: 'finalTags is authoritative and agrees with QA5 for all 876; these records are the global-QA revisions whose supplied addTags/deleteTags/disposition labels predate the revision. Diffs below are derived from existingTags -> finalTags.', records: staleLabels },
    alreadyAtFinal, deferred: deferred.map(d => ({ auditKey: d.auditKey, id: d.canonicalId, name: d.name })),
    preState: { talents: gitBlobSha(text), homebrew: gitBlobSha(read(HOMEBREW)), zeroTagTalents: c.zero, rawTags: c.unique }, rows };
}

export function project(manifest, talents) {
  const by = new Map(manifest.rows.map(r => [r.id, r]));
  return talents.map(t => { const r = by.get(t._id); if (!r) return t; const n = structuredClone(t); n.system.tags = [...r.after]; return n; });
}

/** The QA5 full-corpus contract on a talent list. Returns [{id, ok, detail}]. Used by the report, --verify and the regression test. */
export function corpusChecks(talents, { q5, defIds, qa, vocab }) {
  const res = [], check = (id, ok, detail = '') => res.push({ id, ok: !!ok, detail }), by = new Map(talents.map(t => [t._id, t]));
  const cert = [...qa.keys()], missing = cert.filter(id => !by.has(id)), extra = talents.filter(t => !qa.has(t._id) && !defIds.has(t._id));
  check('corpus identity: 1,187 canonical talents = 1,185 certified (309 Phase 12-1 + 876 Phase 12-2) + exactly 2 deferred', talents.length === 1187 && cert.length === 1185 && q5.certifiedAssignments.filter(a => a.origin === '12-1').length === 309 && q5.certifiedAssignments.filter(a => a.origin === '12-2').length === 876 && [...defIds].every(id => by.has(id)));
  check('0 missing certified ids, 0 extra certified ids, 0 duplicate canonical ids', missing.length === 0 && extra.length === 0 && new Set(talents.map(t => t._id)).size === talents.length);
  const mismatched = cert.filter(id => by.has(id) && !same(tagsOf(by.get(id)), qa.get(id).finalTags));
  check('1,185 / 1,185 certified talents carry system.tags EXACTLY equal to the QA5 finalTags (matched by canonical id)', mismatched.length === 0, mismatched.slice(0, 5).join(','));
  check('both deferred talents are untouched (no tags)', [...defIds].every(id => tagsOf(by.get(id)).length === 0));
  const sets = cert.map(id => ({ id, tags: tagsOf(by.get(id)) }));
  check('every certified record has a non-empty, duplicate-free tag array within the 184-tag vocabulary', sets.every(s => s.tags.length > 0 && new Set(s.tags).size === s.tags.length && s.tags.every(t => vocab.has(t))));
  const imp = (a, b) => sets.filter(s => s.tags.includes(a) && !s.tags.includes(b)).map(s => s.id);
  for (const [a, b] of [['reroll', 'reliability'], ['force_point_spend', 'resource_spend'], ['condition_removal', 'recovery'], ['use_the_force', 'force'], ['force_power_synergy', 'force'], ['ally_support', 'support']]) check(`every ${a} talent also carries ${b}`, imp(a, b).length === 0, imp(a, b).slice(0, 3).join(','));
  const noEco = sets.filter(s => ['reaction', 'swift_action', 'move_action', 'standard_action'].some(a => s.tags.includes(a)) && !s.tags.includes('action_economy')).map(s => s.id);
  check('every explicit reaction/swift_action/move_action/standard_action talent also carries action_economy', noEco.length === 0, noEco.slice(0, 3).join(','));
  const named = n => talents.filter(t => t.name === n && qa.has(t._id)), setKey = t => [...tagsOf(t)].sort().join('|');
  for (const n of ['Charm Beast', 'Notorious', 'Force Treatment', 'Multiattack Proficiency (advanced melee weapons)', 'Multiattack Proficiency (rifles)']) { const f = named(n); check(`family convergence: ${n} (${f.length} records) share one semantic tag set`, f.length >= 2 && new Set(f.map(setKey)).size === 1); }
  const fam = (names) => names.map(n => named(n)).flat();
  const shift = fam(['Shift Defense I', 'Shift Defense II', 'Shift Defense III']); check('family convergence: Shift Defense I-III share one mechanical tag profile', shift.length === 3 && new Set(shift.map(setKey)).size === 1);
  const dev = fam(['Devastating Attack', 'Greater Devastating Attack']); check('family convergence: Devastating Attack / Greater Devastating Attack share one mechanical tag profile', dev.length === 2 && new Set(dev.map(setKey)).size === 1);
  return res;
}

export async function buildReport() {
  const manifest = readJson(MANIFEST_PATH), L = loadAuthority(), { certified, deferred, defIds } = L, text = read(TALENTS), talents = parse(text), hbText = read(HOMEBREW);
  const after = project(manifest, talents), afterText = serializePack(text, after), tb = byId(talents), ta = byId(after), ids = new Set(manifest.rows.map(r => r.id));
  const phase121 = loadAuthority12_1().certified, ids121 = new Set(phase121.map(x => x.canonicalId));
  const v = [], check = (id, ok, detail = '') => v.push({ id, ok: !!ok, detail });
  const b = census(talents), a = census(after), vocab = L.vocab;
  const probe = await createProbe(); const delta = {}, treeDelta = [];
  for (const t of talents) { const x = probe.signature(t, tagsOf(t)), y = probe.signature(ta.get(t._id), tagsOf(ta.get(t._id))); for (const k of probe.diff(x, y)) { if (k === 'treeIdentity') treeDelta.push(t.name); (delta[k] ??= new Set()).add(t._id); } }
  probe.restore();

  check('authority: exactly 876 assignments, unique ids and audit keys, all non-empty/duplicate-free finalTags within the 184-tag vocabulary, no deferred id', certified.length === 876 && manifest.counts.assignments === 876);
  check('the 12-2 GLOBAL_QA authority and the consolidated QA5 authority agree on finalTags for every one of the 876 ids (fail-closed otherwise)', certified.every(x => same(L.qa.get(x.canonicalId)?.finalTags, x.finalTags)));
  check('every authority id resolves exactly once in packs/talents.db and passes the name/page identity guard (no name fallback)', certified.every(x => { const t = tb.get(x.canonicalId); return t && t.name === x.name && t.system.page === x.page; }));
  check('the mutation set is exactly the 876 Phase 12-2 talents: disjoint from the 309 Phase 12-1 talents and the 2 deferrals', manifest.rows.length + manifest.alreadyAtFinal.length === 876 && [...ids].every(id => !ids121.has(id) && !defIds.has(id)));
  check('every mutated talent carried exactly the authority existingTags before (no drift)', manifest.rows.every(r => same(r.before, certified.find(x => x.canonicalId === r.id).existingTags)));
  check('coverage: every Phase 12-2 target carries EXACTLY its finalTags after (deep equality, authored order)', certified.every(x => same(tagsOf(ta.get(x.canonicalId)), x.finalTags)));
  check('deferred safety: UR-022 and GOI-002 are unchanged', deferred.every(d => same(ta.get(d.canonicalId), tb.get(d.canonicalId))));
  check('the 309 Phase 12-1 talents and the 2 deferrals are unchanged (311 records)', after.filter(t => !ids.has(t._id)).length === 311 && after.every(t => ids.has(t._id) || same(t, tb.get(t._id))));
  check('field immutability: with system.tags removed every one of the 1,187 records is identical', talents.every(t => same(withoutTags(t), withoutTags(ta.get(t._id)))));
  check('identity: 1,187 records, same ids, names and order; no id created, deleted, changed or duplicated', after.length === 1187 && after.every((t, i) => t._id === talents[i]._id && t.name === talents[i].name) && ta.size === 1187);
  check('vocabulary: every tag on every canonical talent is one of the 184 approved strings; no new string', Object.keys(a.byTag).every(k => vocab.has(k)) && Object.keys(b.byTag).every(k => vocab.has(k)));
  check('no tree_* tag exists on any canonical talent', Object.keys(a.byTag).every(k => !k.startsWith('tree_')));
  check('zero-tag census unchanged: exactly the 2 deferrals', a.zero === 2 && after.filter(t => !tagsOf(t).length).every(t => defIds.has(t._id)));
  check('homebrew pack is byte-for-byte unchanged and untouched by the manifest', gitBlobSha(hbText) === manifest.preState.homebrew && !parse(hbText).some(h => ids.has(h._id)));
  check('tree identity/credit is tag-free: the treeIdentity probe is identical for all 1,187 talents', treeDelta.length === 0, treeDelta.slice(0, 5).join('; '));
  const corpus = corpusChecks(after, L); for (const c of corpus) check('post-state ' + c.id, c.ok, c.detail);
  const rec = reconcile({ ...loadInput(), production: after });
  check('convergence: Phase 3E corpus/text, 3F tree identity and 3G prerequisite gates stay clean (reconciler: 0 blocking findings)', rec.blockingFindings.length === 0, JSON.stringify(rec.findingCounts));
  check('second dry-run is a zero diff', same(project(manifest, after), after));
  check(`serialization is surgical: exactly ${ids.size} lines of packs/talents.db change`, (() => { const x = text.split('\n'), y = afterText.split('\n'); return x.length === y.length && x.filter((l, i) => l !== y[i]).length === ids.size; })());
  check('manifest counts equal the projection', manifest.counts.recordsChanged === ids.size && a.instances - b.instances === manifest.counts.tagElementsAdded - manifest.counts.tagElementsRemoved);
  const names = k => [...(delta[k] ?? [])].map(id => tb.get(id).name).sort();
  return {
    schemaVersion: 1, phase: '12-2', dryRun: true, status: v.every(x => x.ok) ? 'DRY_RUN_CERTIFIED' : 'DRY_RUN_FAILED',
    counts: { ...manifest.counts, rawTagsBefore: b.unique, rawTagsAfter: a.unique, tagInstancesBefore: b.instances, tagInstancesAfter: a.instances, zeroTagBefore: b.zero, zeroTagAfter: a.zero, nonTargetRecordsChanged: 0, nonTagFieldChanges: 0, vocabularyViolations: 0 },
    runtimeConsumers: { note: 'Existing tags were added to and deleted from 876 talents, so the runtime functions that read system.tags (droid gate, force-talent count, Mystic Mastery regex, Sith lightsaber-form lookup, combat-feature classification, talent-data resolver) can classify these talents differently. Tree identity/credit does not read tags and is unchanged. Reported for follow-up; no consumer was altered.',
      treeIdentityChanged: treeDelta.length, probeChangeCounts: Object.fromEntries(Object.keys(delta).sort().map(k => [k, delta[k].size])), changedTalents: Object.fromEntries(Object.keys(delta).sort().filter(k => k !== 'treeIdentity').map(k => [k, names(k)])) },
    postCensus: { uniqueRawTags: a.unique, tagInstances: a.instances, zeroTagTalents: a.zero, byTag: Object.fromEntries(Object.entries(a.byTag).sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))) },
    preState: manifest.preState, postState: { talents: gitBlobSha(afterText) }, othersFingerprint: sortedFp(after.filter(t => !ids.has(t._id))), records: [...ids], verification: { results: v }
  };
}

const renderDoc = r => { const c = r.counts, x = r.runtimeConsumers; return ['# Phase 12-2 — certified existing-tag semantics (Talents) — dry run', '',
  `Status: **${r.status}**. **${c.recordsChanged} of ${c.assignments} records** change (\`system.tags\` only; ${c.alreadyAtFinal} already at their final array): ${c.tagElementsAdded} tag elements added, ${c.tagElementsRemoved} removed. Derived dispositions: ${JSON.stringify(c.dispositions)}. ${c.staleSuppliedLabels} records carry stale supplied add/delete/disposition labels (global-QA revisions; finalTags is authoritative and agrees with QA5). Zero-tag talents ${c.zeroTagBefore} → ${c.zeroTagAfter}; raw tag strings ${c.rawTagsBefore} → ${c.rawTagsAfter} (no new string); tag instances ${c.tagInstancesBefore} → ${c.tagInstancesAfter}.`, '',
  '## Verification', '', ...r.verification.results.map(y => `- ${y.ok ? 'PASS' : 'FAIL'} ${y.id}${y.detail ? ' — ' + y.detail : ''}`), '',
  '## Runtime consumers of system.tags', '', x.note, '', `Tree identity changed: **${x.treeIdentityChanged}**. Probe change counts (talents whose runtime classification differs): ${JSON.stringify(x.probeChangeCounts)}.`, ''].join('\n'); };

export function detect12_2State() {
  if (!fs.existsSync(path.join(ROOT, REPORT_PATH))) return 'PRE_12_2';
  const r = readJson(REPORT_PATH), sha = gitBlobSha(read(TALENTS));
  return r.postState.talents === sha ? 'POST_12_2' : r.preState.talents === sha ? 'PRE_12_2' : finalAdjudicationApplied() ? 'POST_LATER' : 'UNKNOWN'; // POST_LATER: the final owner adjudication certified the two deferrals
}

export async function verifyApplied({ exact = false } = {}) {
  const res = [], check = (id, ok, detail = '') => res.push({ id, ok: !!ok, detail });
  const report = readJson(REPORT_PATH), manifest = readJson(MANIFEST_PATH), L = loadAuthority(), { certified, deferred } = L, text = read(TALENTS), talents = parse(text), by = byId(talents), ids = new Set(manifest.rows.map(r => r.id)), c = census(talents);
  const later = detect12_2State() === 'POST_LATER'; // whole-corpus census/fingerprint/blob and the deferral checks belong to the later final adjudication
  check('packs/talents.db is the certified Phase 12-2 post-state (or the later final-adjudication state)', ['POST_12_2', 'POST_LATER'].includes(detect12_2State()));
  check('A. every Phase 12-2 target carries EXACTLY the authority finalTags (derived from the authority file, not the manifest)', certified.length === 876 && certified.every(x => same(by.get(x.canonicalId)?.system.tags, x.finalTags)));
  check('manifest rows equal the authority (ids, audit keys, after-tags)', manifest.rows.every(r => { const x = certified.find(y => y.canonicalId === r.id); return x && x.auditKey === r.auditKey && same(r.after, x.finalTags); }) && manifest.rows.length + manifest.alreadyAtFinal.length === 876);
  if (!later) check('B. deferred UR-022 / GOI-002 are untouched', deferred.every(d => tagsOf(by.get(d.canonicalId)).length === 0 && by.get(d.canonicalId).name === d.name));
  if (!later) check('D. the 311 other canonical records (309 Phase 12-1 + 2 deferred) are unchanged from the certified pre-state', sortedFp(talents.filter(t => !ids.has(t._id))) === report.othersFingerprint);
  if (!later) check('post census equals the certified census', Object.keys(c.byTag).length === Object.keys(report.postCensus.byTag).length && Object.entries(c.byTag).every(([k, n]) => report.postCensus.byTag[k] === n));
  check('homebrew pack unchanged', gitBlobSha(read(HOMEBREW)) === report.preState.homebrew);
  for (const x of corpusChecks(talents, L)) if (!(later && x.id.startsWith('both deferred'))) check('full-corpus ' + x.id, x.ok, x.detail);
  const rec = reconcile(loadInput()); check('reconciler: zero blocking findings', rec.blockingFindings.length === 0, JSON.stringify(rec.findingCounts));
  if (exact && !later) check('packs/talents.db equals the certified blob', gitBlobSha(text) === report.postState.talents);
  return res;
}

export function applyProduction() {
  invariant(detect12_2State() === 'PRE_12_2', 'REFUSED: packs are not the pre-apply state (already applied or drifted)');
  const committed = readJson(REPORT_PATH); invariant(committed.status === 'DRY_RUN_CERTIFIED', 'REFUSED: dry-run report is not certified');
  const texts = read(TALENTS), out = serializePack(texts, project(readJson(MANIFEST_PATH), parse(texts)));
  invariant(gitBlobSha(out) === committed.postState.talents, 'REFUSED: rendered output does not match the certified post-state blob');
  fs.writeFileSync(path.join(ROOT, TALENTS), out);
}

export async function main(argv = process.argv.slice(2)) {
  const has = f => argv.includes(f), state = detect12_2State();
  const pr = res => { for (const x of res) console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.id}${x.ok || !x.detail ? '' : '  [' + x.detail + ']'}`); return res.filter(x => !x.ok).length; };
  if (has('--status')) { console.log(ERR + state); return 0; }
  if (has('--verify') || (has('--check') && state === 'POST_12_2')) { const bad = pr(await verifyApplied({ exact: has('--exact') })); console.log(`\n${ERR}verify ${bad ? 'FAIL' : 'PASS'}`); return bad ? 1 : 0; }
  if (has('--apply')) { const fresh = await buildReport(); invariant(read(REPORT_PATH) === JSON.stringify(fresh, null, 1) + '\n', 'REFUSED: committed dry-run report differs from a fresh projection'); applyProduction(); console.log(ERR + 'APPLIED packs/talents.db (uncommitted)'); return 0; }
  invariant(state === 'PRE_12_2', `the pre-apply pack is required (found ${state})`);
  if (has('--manifest')) { fs.writeFileSync(path.join(ROOT, MANIFEST_PATH), JSON.stringify(deriveManifest(), null, 1) + '\n'); console.log(ERR + 'wrote ' + MANIFEST_PATH); return 0; }
  if (has('--check')) {
    if (read(MANIFEST_PATH) !== JSON.stringify(deriveManifest(), null, 1) + '\n') { console.error(ERR + 'STALE: manifest differs from a fresh derivation'); return 1; }
    const r = await buildReport(); if (read(REPORT_PATH) !== JSON.stringify(r, null, 1) + '\n' || read(DOC_PATH) !== renderDoc(r)) { console.error(ERR + 'STALE: dry-run report differs from a fresh projection'); return 1; }
    console.log(ERR + 'manifest and dry-run report match a fresh derivation'); return 0;
  }
  const r = await buildReport(); pr(r.verification.results);
  console.log(`\n${ERR}${r.status}: ${r.counts.recordsChanged} records, +${r.counts.tagElementsAdded} / -${r.counts.tagElementsRemoved} tag elements, ${JSON.stringify(r.counts.dispositions)}`);
  if (r.status !== 'DRY_RUN_CERTIFIED') return 1;
  if (has('--report')) { fs.writeFileSync(path.join(ROOT, REPORT_PATH), JSON.stringify(r, null, 1) + '\n'); fs.writeFileSync(path.join(ROOT, DOC_PATH), renderDoc(r)); console.log(ERR + `wrote ${REPORT_PATH} and ${DOC_PATH} (no pack was written)`); }
  return 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().then(code => process.exit(code), e => { console.error(e.message ?? e); process.exit(1); });
