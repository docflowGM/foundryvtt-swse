#!/usr/bin/env node
/**
 * Phase 12-1 — apply the owner-certified semantic tags to the 309 CERTIFIED orphan talents (system.tags only).
 *
 * Authority: data/audits/talent-phase-12-1-semantic-tag-authority.json (QA3, FINAL_FOR_EXECUTION, owner-authorized). Deterministic manifest application:
 * system.tags := finalTags EXACTLY (no merge, no union, no reorder). Targets resolve by canonical _id only (names/source/page are validation guards, never a fallback).
 * UR-022 Quick Study and GOI-002 Done It All are explicit ontology deferrals and must stay untouched. The other 876 canonical talents are Phase 12-2 and out of scope.
 * Write path: the same certified packs/talents.db line-surgical serializer used by Phases 3C-11-2C (serializePack); no parallel database.
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
import { detect11_2cState } from './apply-talent-phase-11-2c.mjs';

export const AUTH = 'data/audits/talent-phase-12-1-semantic-tag-authority.json';
export const MANIFEST_PATH = 'data/audits/talent-phase-12-1-cleanup-manifest.json', REPORT_PATH = 'data/audits/talent-phase-12-1-dry-run-report.json', DOC_PATH = 'docs/audits/talent-phase-12-1-dry-run.md';
const ERR = '[talent-phase-12-1] ';
const invariant = (ok, m) => { if (!ok) throw new Error(ERR + m); };
const sortedFp = arr => fingerprint(arr.slice().sort((x, y) => x._id.localeCompare(y._id)));
const withoutTags = t => { const c = structuredClone(t); delete c.system.tags; return c; };
const tagsOf = t => (Array.isArray(t?.system?.tags) ? t.system.tags : []);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const census = talents => { const c = {}; for (const t of talents) for (const x of tagsOf(t)) c[x] = (c[x] ?? 0) + 1; return { unique: Object.keys(c).length, instances: Object.values(c).reduce((a, b) => a + b, 0), zero: talents.filter(t => !tagsOf(t).length).length, byTag: c }; };
const byId = talents => { const m = new Map(); for (const t of talents) { invariant(!m.has(t._id), `duplicate canonical _id ${t._id} in packs/talents.db`); m.set(t._id, t); } return m; };

/** The QA3 authority: exactly the CERTIFIED assignments and the two deferrals, with every structural invariant asserted. */
export const loadAuthority = () => validateAuthority(readJson(AUTH));
export function validateAuthority(a) {
  invariant(a.status === 'FINAL_FOR_EXECUTION' && a.ownerAuthorized === true && a.executionEnabled === true && a.claudeExecutionContract?.enabled === true, 'the authority is not marked FINAL_FOR_EXECUTION / owner-authorized');
  invariant(a.finalSemanticPayload === 'QA3', 'QA3 must be the final semantic payload');
  const all = Object.values(a.batches).flatMap(b => b.assignments), certified = all.filter(x => x.status === 'CERTIFIED'), deferred = a.unresolvedTagConcepts;
  invariant(all.length === certified.length, 'every batch assignment must be CERTIFIED (deferrals live only in unresolvedTagConcepts)');
  invariant(certified.length === 309, `expected 309 certified assignments (found ${certified.length})`);
  invariant(deferred.length === 2 && deferred.map(d => d.canonicalId).sort().join() === ['d376f165f1a47281', 'fd37b68c6fb620f6'].join(), 'the deferrals must be exactly UR-022 fd37b68c6fb620f6 and GOI-002 d376f165f1a47281');
  invariant(certified.length + deferred.length === a.baseline.phase12OrphanCount, 'certified + deferred must equal the 311-orphan census');
  invariant(new Set(certified.map(x => x.canonicalId)).size === 309 && new Set(certified.map(x => x.auditKey)).size === 309, 'canonicalId and auditKey must each be unique across certified assignments');
  const defIds = new Set(deferred.map(d => d.canonicalId));
  for (const x of certified) {
    invariant(!defIds.has(x.canonicalId), `${x.auditKey}: a certified id overlaps a deferred id`);
    invariant(Array.isArray(x.finalTags) && x.finalTags.length > 0 && x.finalTags.every(t => typeof t === 'string' && t), `${x.auditKey}: finalTags must be a non-empty string array`);
    invariant(new Set(x.finalTags).size === x.finalTags.length, `${x.auditKey}: duplicate tag inside finalTags`);
  }
  return { auth: a, certified, deferred, defIds };
}

export function deriveManifest() {
  invariant(detect11_2cState() === 'POST_11_2C', 'the Phase 11-2C post-state is the required pre-state (found ' + detect11_2cState() + ')');
  const { auth, certified, deferred, defIds } = loadAuthority(), text = read(TALENTS), talents = parse(text), idx = byId(talents), identityOf = loadIdentityOf(), c = census(talents);
  invariant(talents.length === auth.baseline.canonicalTalentCount, `canonical talent count drifted (${talents.length} vs ${auth.baseline.canonicalTalentCount})`);
  invariant(c.unique === auth.baseline.survivingVocabularyCount, `surviving vocabulary drifted (${c.unique} vs ${auth.baseline.survivingVocabularyCount})`);
  invariant(gitBlobSha(text) === auth.baseline.talentPackSha, `packs/talents.db drifted from the frozen baseline ${auth.baseline.talentPackSha}`);
  const vocab = new Set(Object.keys(c.byTag)), rows = [];
  for (const x of certified) {
    const t = idx.get(x.canonicalId); invariant(t, `${x.auditKey}: canonicalId ${x.canonicalId} does not resolve`);
    invariant(t.name === x.name && t.system.source === x.sourcebook && t.system.page === x.page, `${x.auditKey}: identity guard failed (${x.canonicalId} resolves to "${t.name}" / ${t.system.source} p.${t.system.page})`);
    invariant(tagsOf(t).length === 0, `${x.auditKey}: target already carries tags — repository drift, stop`);
    const bad = x.finalTags.filter(g => !vocab.has(g)); invariant(!bad.length, `${x.auditKey}: tag(s) outside the surviving vocabulary: ${bad.join(', ')}`);
    rows.push({ id: t._id, auditKey: x.auditKey, canonicalIdentity: identityOf.get(t._id) ?? null, name: t.name, sourcebook: x.sourcebook, path: 'system.tags', before: tagsOf(t), after: [...x.finalTags] });
  }
  for (const d of deferred) { const t = idx.get(d.canonicalId); invariant(t && t.name === d.name && tagsOf(t).length === 0, `${d.auditKey}: deferred record must resolve once and carry no tags`); }
  const zeroIds = talents.filter(t => !tagsOf(t).length).map(t => t._id);
  invariant(zeroIds.length === auth.baseline.phase12OrphanCount && zeroIds.every(id => defIds.has(id) || rows.some(r => r.id === id)), 'the zero-tag census does not reconcile to the 311-orphan baseline');
  rows.sort((a, b) => a.id.localeCompare(b.id));
  return { schemaVersion: 1, phase: '12-1', status: 'CLEANUP_MANIFEST', authority: AUTH, boundary: 'system.tags of the 309 CERTIFIED Phase 12-1 orphan talents: exact finalTags only',
    counts: { reviewed: certified.length + deferred.length, certified: certified.length, deferred: deferred.length, recordsChanged: rows.length, tagElementsAdded: rows.reduce((n, r) => n + r.after.length, 0), vocabularySize: vocab.size },
    deferred: deferred.map(d => ({ auditKey: d.auditKey, id: d.canonicalId, name: d.name })),
    preState: { talents: gitBlobSha(text), homebrew: gitBlobSha(read(HOMEBREW)), zeroTagTalents: c.zero }, rows };
}

export function project(manifest, talents) {
  const by = new Map(manifest.rows.map(r => [r.id, r]));
  return talents.map(t => { const r = by.get(t._id); if (!r) return t; const n = structuredClone(t); n.system.tags = [...r.after]; return n; });
}

export async function buildReport() {
  const manifest = readJson(MANIFEST_PATH), { auth, certified, deferred, defIds } = loadAuthority(), text = read(TALENTS), talents = parse(text), hbText = read(HOMEBREW);
  const after = project(manifest, talents), afterText = serializePack(text, after), tb = byId(talents), ta = byId(after), ids = new Set(manifest.rows.map(r => r.id));
  const v = [], check = (id, ok, detail = '') => v.push({ id, ok: !!ok, detail });
  const b = census(talents), a = census(after), vocab = new Set(Object.keys(b.byTag));
  const probe = await createProbe(); const delta = {}, treeDelta = [];
  for (const t of talents) { const x = probe.signature(t, tagsOf(t)), y = probe.signature(ta.get(t._id), tagsOf(ta.get(t._id))); for (const k of probe.diff(x, y)) { if (k === 'treeIdentity') treeDelta.push(t.name); (delta[k] ??= new Set()).add(t._id); } }
  probe.restore();

  check('authority: 311 reviewed = 309 certified + 2 deferred; ids/auditKeys unique; no overlap; no empty or duplicated finalTags', certified.length === 309 && deferred.length === 2 && manifest.counts.reviewed === 311);
  check('every certified id resolves exactly once in packs/talents.db and passes the name/source/page identity guard (no name fallback)', certified.every(x => { const t = tb.get(x.canonicalId); return t && t.name === x.name && t.system.source === x.sourcebook && t.system.page === x.page; }));
  check('both deferred ids resolve exactly once', deferred.every(d => tb.get(d.canonicalId)?.name === d.name));
  check('pre-state zero-tag census (311) = 309 certified targets + 2 deferred', b.zero === 311 && talents.filter(t => !tagsOf(t).length).every(t => ids.has(t._id) || defIds.has(t._id)));
  check('every certified target has an empty tag array before (no legacy tag to merge or lose)', manifest.rows.every(r => !r.before.length));
  check('A. coverage: 309/309 targets carry EXACTLY their finalTags (deep equality, authored order)', certified.every(x => same(tagsOf(ta.get(x.canonicalId)), x.finalTags)));
  check('B. deferred safety: UR-022 and GOI-002 keep their exact pre-state tags', deferred.every(d => same(ta.get(d.canonicalId), tb.get(d.canonicalId))));
  check('C. orphan closeout: 311 - 309 = 2 zero-tag talents remain and they are exactly the deferrals', a.zero === 2 && after.filter(t => !tagsOf(t).length).every(t => defIds.has(t._id)));
  check('D. non-target immutability: the other 878 canonical records (876 non-orphans + 2 deferred) are unchanged', after.length === 1187 && after.every(t => ids.has(t._id) || same(t, tb.get(t._id))) && after.filter(t => !ids.has(t._id)).length === 878);
  check('E. field immutability: with system.tags removed every one of the 1,187 records is identical', talents.every(t => same(withoutTags(t), withoutTags(ta.get(t._id)))));
  check('F. identity: 1,187 records, same ids, same names, same order, no id created/deleted/changed/duplicated', after.length === 1187 && after.every((t, i) => t._id === talents[i]._id && t.name === talents[i].name) && ta.size === 1187);
  check('G. vocabulary: every tag on every canonical talent is one of the 184 surviving strings; no new string created', Object.keys(a.byTag).every(k => vocab.has(k)) && a.unique <= 184 && certified.every(x => x.finalTags.every(g => vocab.has(g))));
  check('no tree_* tag exists on any canonical talent (tree identity stays structured)', Object.keys(a.byTag).every(k => !k.startsWith('tree_')));
  check('homebrew pack is byte-for-byte unchanged and untouched by the manifest', gitBlobSha(hbText) === manifest.preState.homebrew && !parse(hbText).some(h => ids.has(h._id)));
  check('tree identity/credit is tag-free: the treeIdentity probe is identical for all 1,187 talents', treeDelta.length === 0, treeDelta.slice(0, 5).join('; '));
  const rec = reconcile({ ...loadInput(), production: after });
  check('H. convergence: Phase 3E corpus/text, 3F tree identity and 3G prerequisite gates stay clean (reconciler: 0 blocking findings)', rec.blockingFindings.length === 0, JSON.stringify(rec.findingCounts));
  check('second dry-run is a zero diff', same(project(manifest, after), after));
  check(`serialization is surgical: exactly ${ids.size} lines of packs/talents.db change`, (() => { const x = text.split('\n'), y = afterText.split('\n'); return x.length === y.length && x.filter((l, i) => l !== y[i]).length === ids.size; })());
  check('manifest counts equal the projection', manifest.counts.recordsChanged === ids.size && a.instances - b.instances === manifest.counts.tagElementsAdded);
  const names = k => [...(delta[k] ?? [])].map(id => tb.get(id).name).sort();
  return {
    schemaVersion: 1, phase: '12-1', dryRun: true, status: v.every(x => x.ok) ? 'DRY_RUN_CERTIFIED' : 'DRY_RUN_FAILED',
    counts: { ...manifest.counts, rawTagsBefore: b.unique, rawTagsAfter: a.unique, tagInstancesBefore: b.instances, tagInstancesAfter: a.instances, zeroTagBefore: b.zero, zeroTagAfter: a.zero, nonTargetRecordsChanged: 0, nonTagFieldChanges: 0, vocabularyViolations: 0, qa: { revised: auth.qualitySweep.revisedTalentCount, retained: auth.qualitySweep.unchangedCertifiedTalentCount } },
    runtimeConsumers: { note: 'Tags are now present on 309 previously untagged talents, so the runtime functions that read system.tags (droid gate, force-talent count, Mystic Mastery regex, Sith lightsaber-form lookup, combat-feature classification) can legitimately classify these talents differently. Tree identity/credit does not read tags and is unchanged. Reported for follow-up; no consumer was altered.',
      treeIdentityChanged: treeDelta.length, probeChangeCounts: Object.fromEntries(Object.keys(delta).sort().map(k => [k, delta[k].size])), changedTalents: Object.fromEntries(Object.keys(delta).sort().filter(k => k !== 'treeIdentity').map(k => [k, names(k)])) },
    postCensus: { uniqueRawTags: a.unique, tagInstances: a.instances, zeroTagTalents: a.zero, byTag: Object.fromEntries(Object.entries(a.byTag).sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))) },
    preState: manifest.preState, postState: { talents: gitBlobSha(afterText) }, othersFingerprint: sortedFp(after.filter(t => !ids.has(t._id))), records: [...ids], verification: { results: v }
  };
}

const renderDoc = r => { const c = r.counts, x = r.runtimeConsumers; return ['# Phase 12-1 — certified orphan semantic tags (Talents) — dry run', '',
  `Status: **${r.status}**. **${c.recordsChanged} records** change (\`system.tags\` only): ${c.tagElementsAdded} tag elements added from an empty array (no merge, no union). Reviewed ${c.reviewed} = ${c.certified} certified + ${c.deferred} deferred (UR-022 Quick Study, GOI-002 Done It All — untouched). Zero-tag talents ${c.zeroTagBefore} → ${c.zeroTagAfter}; raw tag strings ${c.rawTagsBefore} → ${c.rawTagsAfter} (no new string); tag instances ${c.tagInstancesBefore} → ${c.tagInstancesAfter}. QA history: ${c.qa.revised} arrays revised across QA2 + QA3, ${c.qa.retained} retained.`, '',
  '## Verification', '', ...r.verification.results.map(y => `- ${y.ok ? 'PASS' : 'FAIL'} ${y.id}${y.detail ? ' — ' + y.detail : ''}`), '',
  '## Runtime consumers of system.tags', '', x.note, '', `Tree identity changed: **${x.treeIdentityChanged}**. Probe change counts (talents whose runtime classification differs): ${JSON.stringify(x.probeChangeCounts)}.`, ''].join('\n'); };

export function detect12_1State() {
  if (!fs.existsSync(path.join(ROOT, REPORT_PATH))) return 'PRE_12_1';
  const r = readJson(REPORT_PATH), sha = gitBlobSha(read(TALENTS));
  return r.postState.talents === sha ? 'POST_12_1' : r.preState.talents === sha ? 'PRE_12_1' : 'UNKNOWN';
}

export async function verifyApplied({ exact = false } = {}) {
  const res = [], check = (id, ok, detail = '') => res.push({ id, ok: !!ok, detail });
  const report = readJson(REPORT_PATH), manifest = readJson(MANIFEST_PATH), { auth, certified, deferred, defIds } = loadAuthority(), text = read(TALENTS), talents = parse(text), by = byId(talents), ids = new Set(manifest.rows.map(r => r.id)), c = census(talents);
  check('packs/talents.db is the certified Phase 12-1 post-state', detect12_1State() === 'POST_12_1');
  check('talent count unchanged (1,187); ids unique', talents.length === 1187 && by.size === 1187);
  check('A. 309/309 certified ids resolve and carry EXACTLY the authority finalTags (derived from the authority file, not the manifest)', certified.length === 309 && certified.every(x => same(by.get(x.canonicalId)?.system.tags, x.finalTags)));
  check('manifest rows equal the authority (ids, auditKeys, after-tags)', manifest.rows.length === 309 && manifest.rows.every(r => { const x = certified.find(y => y.canonicalId === r.id); return x && x.auditKey === r.auditKey && same(r.after, x.finalTags); }));
  check('B. deferred UR-022 / GOI-002 still carry their pre-state tags (empty)', deferred.every(d => tagsOf(by.get(d.canonicalId)).length === 0 && by.get(d.canonicalId).name === d.name));
  check('C. exactly the 2 deferred identities remain zero-tag; no other zero-tag talent exists', c.zero === 2 && talents.filter(t => !tagsOf(t).length).every(t => defIds.has(t._id)));
  check('D. the other 878 canonical records are unchanged from the certified pre-state', sortedFp(talents.filter(t => !ids.has(t._id))) === report.othersFingerprint);
  check('G. every tag string is within the surviving vocabulary (<= 184 strings, none new)', c.unique <= auth.baseline.survivingVocabularyCount && Object.keys(c.byTag).every(k => report.postCensus.byTag[k] !== undefined));
  check('post census equals the certified census', Object.keys(c.byTag).length === Object.keys(report.postCensus.byTag).length && Object.entries(c.byTag).every(([k, n]) => report.postCensus.byTag[k] === n));
  check('homebrew pack unchanged', gitBlobSha(read(HOMEBREW)) === report.preState.homebrew);
  const rec = reconcile(loadInput()); check('H. reconciler: zero blocking findings', rec.blockingFindings.length === 0, JSON.stringify(rec.findingCounts));
  if (exact) check('packs/talents.db equals the certified blob', gitBlobSha(text) === report.postState.talents);
  return res;
}

export function applyProduction() {
  invariant(detect12_1State() === 'PRE_12_1', 'REFUSED: packs are not the pre-apply state (already applied or drifted)');
  const committed = readJson(REPORT_PATH); invariant(committed.status === 'DRY_RUN_CERTIFIED', 'REFUSED: dry-run report is not certified');
  const texts = read(TALENTS), out = serializePack(texts, project(readJson(MANIFEST_PATH), parse(texts)));
  invariant(gitBlobSha(out) === committed.postState.talents, 'REFUSED: rendered output does not match the certified post-state blob');
  fs.writeFileSync(path.join(ROOT, TALENTS), out);
}

export async function main(argv = process.argv.slice(2)) {
  const has = f => argv.includes(f), state = detect12_1State();
  const pr = res => { for (const x of res) console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.id}${x.ok || !x.detail ? '' : '  [' + x.detail + ']'}`); return res.filter(x => !x.ok).length; };
  if (has('--status')) { console.log(ERR + state); return 0; }
  if (has('--verify') || (has('--check') && state === 'POST_12_1')) { const bad = pr(await verifyApplied({ exact: has('--exact') })); console.log(`\n${ERR}verify ${bad ? 'FAIL' : 'PASS'}`); return bad ? 1 : 0; }
  if (has('--apply')) { const fresh = await buildReport(); invariant(read(REPORT_PATH) === JSON.stringify(fresh, null, 1) + '\n', 'REFUSED: committed dry-run report differs from a fresh projection'); applyProduction(); console.log(ERR + 'APPLIED packs/talents.db (uncommitted)'); return 0; }
  invariant(state === 'PRE_12_1', `the pre-apply pack is required (found ${state})`);
  if (has('--manifest')) { fs.writeFileSync(path.join(ROOT, MANIFEST_PATH), JSON.stringify(deriveManifest(), null, 1) + '\n'); console.log(ERR + 'wrote ' + MANIFEST_PATH); return 0; }
  if (has('--check')) {
    if (read(MANIFEST_PATH) !== JSON.stringify(deriveManifest(), null, 1) + '\n') { console.error(ERR + 'STALE: manifest differs from a fresh derivation'); return 1; }
    const r = await buildReport(); if (read(REPORT_PATH) !== JSON.stringify(r, null, 1) + '\n' || read(DOC_PATH) !== renderDoc(r)) { console.error(ERR + 'STALE: dry-run report differs from a fresh projection'); return 1; }
    console.log(ERR + 'manifest and dry-run report match a fresh derivation'); return 0;
  }
  const r = await buildReport(); pr(r.verification.results);
  console.log(`\n${ERR}${r.status}: ${r.counts.recordsChanged} records, ${r.counts.tagElementsAdded} tag elements added, zero-tag ${r.counts.zeroTagBefore} -> ${r.counts.zeroTagAfter}`);
  if (r.status !== 'DRY_RUN_CERTIFIED') return 1;
  if (has('--report')) { fs.writeFileSync(path.join(ROOT, REPORT_PATH), JSON.stringify(r, null, 1) + '\n'); fs.writeFileSync(path.join(ROOT, DOC_PATH), renderDoc(r)); console.log(ERR + `wrote ${REPORT_PATH} and ${DOC_PATH} (no pack was written)`); }
  return 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().then(code => process.exit(code), e => { console.error(e.message ?? e); process.exit(1); });
