#!/usr/bin/env node
/**
 * Phase 12 final — owner adjudication: certify the two former ontology deferrals (Quick Study, Done It All) with the owner-authorized `temporary-talent` tag,
 * retire four zero-use vocabulary strings, and certify the whole 1,187-talent corpus (system.tags only, two records mutated).
 *
 * Authority : data/audits/talent-phase-12-final-ontology-adjudication.json (post-QA5 owner ruling; QA5 / 12-1 / 12-2 files stay historical evidence).
 * Active talent-semantic vocabulary (SSOT): the authority's `finalVocabulary` (181), cross-checked against Phase 11-2C's 184 certified strings − retired + new.
 * Same certified line-surgical packs/talents.db serializer as Phases 3C-12-2 (serializePack); targets resolve by canonical _id only.
 *
 *   --manifest --report --check --status --apply --verify [--exact] --census
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, read, readJson, parse, TALENTS, HOMEBREW } from './talent-tag-io.mjs';
import { serializePack, gitBlobSha, fingerprint } from './apply-talent-phase-3c.mjs';
import { loadIdentityOf } from './apply-talent-phase-3g.mjs';
import { reconcile, loadInput } from './reconcile-talent-publication-corpus.mjs';
import { createProbe } from './talent-tag-probes.mjs';
import { corpusChecks, loadAuthority as loadAuthority12_2 } from './apply-talent-phase-12-2-tags.mjs';

export const AUTH = 'data/audits/talent-phase-12-final-ontology-adjudication.json';
export const MANIFEST_PATH = 'data/audits/talent-phase-12-final-cleanup-manifest.json', REPORT_PATH = 'data/audits/talent-phase-12-final-dry-run-report.json', DOC_PATH = 'docs/audits/talent-phase-12-final-dry-run.md';
export const NEW_TAG = 'temporary-talent', RETIRED = ['skill-mastery', 'balance', 'natural_weapon', 'entangle'], DEFERRED_IDS = ['d376f165f1a47281', 'fd37b68c6fb620f6'];
const PRE_12_2_VOCAB_SOURCE = 'data/audits/talent-phase-11-2c-dry-run-report.json';
const ERR = '[talent-phase-12-final] ';
const invariant = (ok, m) => { if (!ok) throw new Error(ERR + m); };
const tagsOf = t => (Array.isArray(t?.system?.tags) ? t.system.tags : []);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sortedFp = arr => fingerprint(arr.slice().sort((x, y) => x._id.localeCompare(y._id)));
const withoutTags = t => { const c = structuredClone(t); delete c.system.tags; return c; };
const census = talents => { const c = {}; for (const t of talents) for (const x of tagsOf(t)) c[x] = (c[x] ?? 0) + 1; return { unique: Object.keys(c).length, instances: Object.values(c).reduce((a, b) => a + b, 0), zero: talents.filter(t => !tagsOf(t).length).length, byTag: c }; };
const byId = talents => { const m = new Map(); for (const t of talents) { invariant(!m.has(t._id), `duplicate canonical _id ${t._id}`); m.set(t._id, t); } return m; };

/** Fail-closed validation of the owner authority. */
export function validateAuthority(a) {
  invariant(a.status === 'FINAL_FOR_EXECUTION' && a.ownerAuthorized === true && a.executionEnabled === true, 'authority is not FINAL_FOR_EXECUTION / owner-authorized / execution-enabled');
  const v = a.vocabulary, c = a.corpus;
  invariant(a.ownerRuling?.newTag?.machineTag === NEW_TAG && same(v.newTags, [NEW_TAG]), `the only new tag must be exactly "${NEW_TAG}"`);
  invariant(same([...v.retiredTags].sort(), [...RETIRED].sort()) && same([...a.ownerRuling.retiredTags].sort(), [...RETIRED].sort()), 'retired tags must be exactly skill-mastery, balance, natural_weapon, entangle');
  invariant(v.previousVocabularyCount === 184 && v.finalVocabularyCount === 181 && v.finalVocabulary.length === 181 && new Set(v.finalVocabulary).size === 181, 'vocabulary counts must be 184 -> 181 with 181 unique strings');
  invariant(v.finalVocabulary.includes(NEW_TAG) && v.finalVocabulary.includes('skill_mastery') && RETIRED.every(t => !v.finalVocabulary.includes(t)), 'final vocabulary must contain temporary-talent and skill_mastery and none of the retired tags');
  const prev = Object.keys(readJson(PRE_12_2_VOCAB_SOURCE).postCensus.byTag);
  invariant(prev.length === 184 && same([...v.finalVocabulary].sort(), [...prev.filter(t => !RETIRED.includes(t)), NEW_TAG].sort()), 'final vocabulary must equal the certified 184 strings - retired + temporary-talent');
  invariant(c.canonicalTalents === 1187 && c.previousCertifiedTalents === 1185 && c.previousDeferredTalents === 2 && c.finalCertifiedTalents === 1187 && c.finalDeferredTalents === 0, 'corpus counts must be 1185+2 -> 1187+0');
  invariant(a.assignments.length === 2 && same(a.assignments.map(x => x.canonicalId).sort(), DEFERRED_IDS), 'assignments must be exactly the two former deferrals');
  const vocab = new Set(v.finalVocabulary);
  for (const x of a.assignments) {
    invariant(Array.isArray(x.finalTags) && x.finalTags.length > 0 && new Set(x.finalTags).size === x.finalTags.length, `${x.auditKey}: finalTags must be non-empty and duplicate-free`);
    invariant(x.finalTags.includes(NEW_TAG) && x.finalTags.every(t => vocab.has(t)), `${x.auditKey}: finalTags must include ${NEW_TAG} and stay inside the final vocabulary`);
    const imp = [['force_point_spend', 'resource_spend'], ['reaction', 'action_economy'], ['swift_action', 'action_economy'], ['move_action', 'action_economy'], ['standard_action', 'action_economy'], ['use_the_force', 'force'], ['force_power_synergy', 'force'], ['ally_support', 'support'], ['reroll', 'reliability'], ['condition_removal', 'recovery']];
    for (const [p, q] of imp) invariant(!x.finalTags.includes(p) || x.finalTags.includes(q), `${x.auditKey}: ${p} requires ${q}`);
  }
  return { auth: a, vocab, vocabList: [...v.finalVocabulary], assignments: a.assignments };
}
export const loadAuthority = () => validateAuthority(readJson(AUTH));
/** The active approved talent-semantic vocabulary (SSOT = the final adjudication authority). */
export const activeVocabulary = () => new Set(loadAuthority().vocabList);

export function deriveManifest(pre) {
  const { assignments } = loadAuthority(), text = pre ?? read(TALENTS), talents = parse(text), idx = byId(talents), identityOf = loadIdentityOf();
  invariant(talents.length === 1187, `canonical talent count drifted (${talents.length})`);
  const rows = assignments.map(x => {
    const t = idx.get(x.canonicalId); invariant(t, `${x.auditKey}: ${x.canonicalId} does not resolve`);
    invariant(t.name === x.name && t.system.page === x.page && t.system.source === x.sourcebook, `${x.auditKey}: identity guard failed`);
    invariant(tagsOf(t).length === 0 && same(tagsOf(t), x.previousTags), `${x.auditKey}: record is not in its deferred (untagged) pre-state`);
    return { id: t._id, auditKey: x.auditKey, canonicalIdentity: identityOf.get(t._id) ?? null, name: t.name, path: 'system.tags', before: [], after: [...x.finalTags] };
  }).sort((p, q) => p.id.localeCompare(q.id));
  return { schemaVersion: 1, phase: '12-final', status: 'CLEANUP_MANIFEST', authority: AUTH, boundary: 'system.tags of the two former deferrals: exact finalTags only',
    counts: { assignments: 2, recordsChanged: rows.length, tagElementsAdded: rows.reduce((n, r) => n + r.after.length, 0) },
    preState: { talents: gitBlobSha(text), homebrew: gitBlobSha(read(HOMEBREW)) }, rows };
}
export function project(manifest, talents) {
  const by = new Map(manifest.rows.map(r => [r.id, r]));
  return talents.map(t => { const r = by.get(t._id); if (!r) return t; const n = structuredClone(t); n.system.tags = [...r.after]; return n; });
}

/** Final corpus contract: 1,187 / 1,187 certified, vocabulary utilization 181/181, retired tags gone, QA5 contract for the 1,185 earlier records. */
export function finalCorpusChecks(talents) {
  const L = loadAuthority(), res = [], check = (id, ok, detail = '') => res.push({ id, ok: !!ok, detail }), by = new Map(talents.map(t => [t._id, t]));
  const c = census(talents), vocab = L.vocab, used = Object.keys(c.byTag);
  const unknown = used.filter(t => !vocab.has(t)), unused = L.vocabList.filter(t => !c.byTag[t]);
  check('corpus: 1,187 canonical talents, unique ids', talents.length === 1187 && by.size === 1187);
  check('1,187 / 1,187 canonical talents certified: 0 deferred, 0 untagged, 0 empty arrays', talents.every(t => Array.isArray(t.system?.tags) && t.system.tags.length > 0) && c.zero === 0);
  check('0 duplicate tags within any talent', talents.every(t => new Set(tagsOf(t)).size === tagsOf(t).length));
  check('vocabulary utilization: 181 approved, 181 used, 0 unused, 0 unknown', vocab.size === 181 && used.length === 181 && unused.length === 0 && unknown.length === 0, `approved ${vocab.size} used ${used.length} unused [${unused}] unknown [${unknown}]`);
  check('the four retired tags have zero production uses and are not approved', RETIRED.every(t => !c.byTag[t] && !vocab.has(t)));
  check('skill_mastery (underscore) survives: approved and used', vocab.has('skill_mastery') && c.byTag.skill_mastery > 0 && !vocab.has('skill-mastery'));
  check('no unauthorized temporary-talent alias exists', ['temporary_talent_access', 'temporary-talent-access', 'temporary_talent', 'Temporary-Talent'].every(t => !c.byTag[t] && !vocab.has(t)));
  check('temporary-talent = 2 (Quick Study, Done It All)', c.byTag[NEW_TAG] === 2 && L.assignments.every(x => tagsOf(by.get(x.canonicalId)).includes(NEW_TAG)));
  check('both former deferrals carry EXACTLY the owner-adjudicated finalTags', L.assignments.every(x => same(tagsOf(by.get(x.canonicalId)), x.finalTags)));
  const q5 = readJson('data/audits/talent-phase-12-global-semantic-authority-qa5.json'), L2 = loadAuthority12_2();
  for (const x of corpusChecks(talents, { q5, defIds: new Set(DEFERRED_IDS), qa: L2.qa, vocab: L2.vocab })) if (!x.id.startsWith('both deferred')) check('full-corpus ' + x.id, x.ok, x.detail);
  return res;
}

export async function buildReport() {
  const manifest = readJson(MANIFEST_PATH), text = read(TALENTS), talents = parse(text), after = project(manifest, talents), outText = serializePack(text, after);
  const res = [], check = (id, ok, detail = '') => res.push({ id, ok: !!ok, detail });
  const ids = new Set(manifest.rows.map(r => r.id)), ta = byId(talents), tb = byId(parse(outText)), L = loadAuthority();
  check('authority: owner-final, the two former deferrals, temporary-talent only new tag, 4 retired, 184 -> 181', true);
  check('the retired tags have 0 production uses before the change (verified at current HEAD)', RETIRED.every(t => !census(talents).byTag[t]), JSON.stringify(RETIRED.map(t => census(talents).byTag[t] ?? 0)));
  check('mutation set is exactly the two former deferrals', manifest.rows.length === 2 && [...ids].sort().join() === DEFERRED_IDS.join());
  check('non-target immutability: all 1,185 other canonical records are byte-identical', sortedFp(talents.filter(t => !ids.has(t._id))) === sortedFp(parse(outText).filter(t => !ids.has(t._id))));
  check('field immutability: with system.tags removed, all 1,187 records are identical', sortedFp(talents.map(withoutTags)) === sortedFp(parse(outText).map(withoutTags)));
  check('identity: same ids, names, order', talents.map(t => t._id + t.name).join() === parse(outText).map(t => t._id + t.name).join());
  check('both targets carry exactly the authority finalTags', L.assignments.every(x => same(tagsOf(tb.get(x.canonicalId)), x.finalTags)));
  for (const x of finalCorpusChecks(parse(outText))) check('projected ' + x.id, x.ok, x.detail);
  const probe = await createProbe(); const sigDelta = []; for (const t of talents) { const x = probe.signature(t, tagsOf(t)), y = probe.signature(tb.get(t._id), tagsOf(tb.get(t._id))); for (const k of probe.diff(x, y)) sigDelta.push(`${t.name}:${k}`); }
  probe.restore();
  check('structural classification (Force-talent identity, tree identity) is tag-independent: unchanged for all 1,187', !sigDelta.some(s => /:(forceTalent|treeIdentity)$/.test(s)), sigDelta.filter(s => /:(forceTalent|treeIdentity)$/.test(s)).join(';'));
  const rec = reconcile(loadInput()); check('reconciler: zero blocking findings', rec.blockingFindings.length === 0, JSON.stringify(rec.findingCounts));
  const b = census(talents), a = census(parse(outText));
  return { schemaVersion: 1, phase: '12-final', status: res.every(x => x.ok) ? 'DRY_RUN_CERTIFIED' : 'DRY_RUN_FAILED', authority: AUTH,
    counts: { ...manifest.counts, zeroTagBefore: b.zero, zeroTagAfter: a.zero, rawTagsBefore: b.unique, rawTagsAfter: a.unique, tagInstancesBefore: b.instances, tagInstancesAfter: a.instances, approvedVocabulary: L.vocab.size, nonTargetRecordsChanged: 0, nonTagFieldChanges: 0 },
    probeSignatureChanges: sigDelta.sort(), verification: { results: res },
    preState: { talents: gitBlobSha(text), homebrew: gitBlobSha(read(HOMEBREW)) }, postState: { talents: gitBlobSha(outText) }, othersFingerprint: sortedFp(parse(outText).filter(t => !ids.has(t._id))), postCensus: { byTag: Object.fromEntries(Object.entries(a.byTag).sort(([x], [y]) => x.localeCompare(y))) } };
}
const renderDoc = r => ['# Phase 12 final — ontology adjudication (Quick Study, Done It All) — dry run', '', `Status: **${r.status}**. Mutated records: **${r.counts.recordsChanged}** (system.tags only); zero-tag talents ${r.counts.zeroTagBefore} -> ${r.counts.zeroTagAfter}; tag strings in use ${r.counts.rawTagsBefore} -> ${r.counts.rawTagsAfter}; approved vocabulary ${r.counts.approvedVocabulary}.`, '', '## Checks', '', ...r.verification.results.map(x => `- ${x.ok ? 'PASS' : 'FAIL'} — ${x.id}`), ''].join('\n');

export function detectFinalState() {
  if (!fs.existsSync(path.join(ROOT, REPORT_PATH))) return 'PRE_FINAL';
  const r = readJson(REPORT_PATH), sha = gitBlobSha(read(TALENTS));
  return r.postState.talents === sha ? 'POST_FINAL' : r.preState.talents === sha ? 'PRE_FINAL' : 'UNKNOWN';
}

export async function verifyApplied({ exact = false } = {}) {
  const res = [], check = (id, ok, detail = '') => res.push({ id, ok: !!ok, detail });
  const report = readJson(REPORT_PATH), manifest = readJson(MANIFEST_PATH), L = loadAuthority(), text = read(TALENTS), talents = parse(text), ids = new Set(manifest.rows.map(r => r.id));
  check('packs/talents.db is the certified Phase 12 final post-state', detectFinalState() === 'POST_FINAL');
  check('manifest rows equal the authority (ids, audit keys, after-tags)', manifest.rows.length === 2 && manifest.rows.every(r => { const x = L.assignments.find(y => y.canonicalId === r.id); return x && x.auditKey === r.auditKey && same(r.after, x.finalTags); }));
  for (const x of finalCorpusChecks(talents)) check(x.id, x.ok, x.detail);
  check('the 1,185 other canonical records are unchanged from the certified pre-state', sortedFp(talents.filter(t => !ids.has(t._id))) === report.othersFingerprint);
  check('post census equals the certified census', JSON.stringify(census(talents).byTag) === JSON.stringify(report.postCensus.byTag) || Object.entries(census(talents).byTag).every(([k, n]) => report.postCensus.byTag[k] === n));
  check('homebrew pack unchanged', gitBlobSha(read(HOMEBREW)) === report.preState.homebrew);
  const rec = reconcile(loadInput()); check('reconciler: zero blocking findings', rec.blockingFindings.length === 0, JSON.stringify(rec.findingCounts));
  if (exact) check('packs/talents.db equals the certified blob', gitBlobSha(text) === report.postState.talents);
  return res;
}

export function applyProduction() {
  invariant(detectFinalState() === 'PRE_FINAL', 'REFUSED: packs are not the pre-apply state (already applied or drifted)');
  const committed = readJson(REPORT_PATH); invariant(committed.status === 'DRY_RUN_CERTIFIED', 'REFUSED: dry-run report is not certified');
  const texts = read(TALENTS), out = serializePack(texts, project(readJson(MANIFEST_PATH), parse(texts)));
  invariant(gitBlobSha(out) === committed.postState.talents, 'REFUSED: rendered output does not match the certified post-state blob');
  fs.writeFileSync(path.join(ROOT, TALENTS), out);
}

/** Deterministic tag-utilization census over the production pack: tag, usage count, least-used tags. */
export function utilizationCensus(talents = parse(read(TALENTS))) {
  const c = census(talents).byTag, vocab = loadAuthority().vocabList, rows = vocab.map(tag => ({ tag, uses: c[tag] ?? 0 })).sort((x, y) => y.uses - x.uses || x.tag.localeCompare(y.tag));
  return { approved: vocab.length, used: rows.filter(r => r.uses > 0).length, unused: rows.filter(r => r.uses === 0).map(r => r.tag), unknown: Object.keys(c).filter(t => !vocab.includes(t)), leastUsed: rows.slice(-15).reverse(), rows };
}

export async function main(argv = process.argv.slice(2)) {
  const has = f => argv.includes(f), state = detectFinalState();
  const pr = res => { for (const x of res) console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.id}${x.ok || !x.detail ? '' : '  [' + x.detail + ']'}`); return res.filter(x => !x.ok).length; };
  if (has('--status')) { console.log(ERR + state); return 0; }
  if (has('--census')) { const u = utilizationCensus(); console.log(JSON.stringify({ approved: u.approved, used: u.used, unused: u.unused, unknown: u.unknown, leastUsed: u.leastUsed }, null, 1)); return u.used === u.approved && !u.unknown.length ? 0 : 1; }
  if (has('--verify') || (has('--check') && state === 'POST_FINAL')) { const bad = pr(await verifyApplied({ exact: has('--exact') })); console.log(`\n${ERR}verify ${bad ? 'FAIL' : 'PASS'}`); return bad ? 1 : 0; }
  if (has('--apply')) { const fresh = await buildReport(); invariant(read(REPORT_PATH) === JSON.stringify(fresh, null, 1) + '\n', 'REFUSED: committed dry-run report differs from a fresh projection'); applyProduction(); console.log(ERR + 'APPLIED packs/talents.db (uncommitted)'); return 0; }
  invariant(state === 'PRE_FINAL', `the pre-apply pack is required (found ${state})`);
  if (has('--manifest')) { fs.writeFileSync(path.join(ROOT, MANIFEST_PATH), JSON.stringify(deriveManifest(), null, 1) + '\n'); console.log(ERR + 'wrote ' + MANIFEST_PATH); return 0; }
  if (has('--check')) {
    if (read(MANIFEST_PATH) !== JSON.stringify(deriveManifest(), null, 1) + '\n') { console.error(ERR + 'STALE: manifest differs from a fresh derivation'); return 1; }
    const r = await buildReport(); if (read(REPORT_PATH) !== JSON.stringify(r, null, 1) + '\n' || read(DOC_PATH) !== renderDoc(r)) { console.error(ERR + 'STALE: dry-run report differs from a fresh projection'); return 1; }
    console.log(ERR + 'manifest and dry-run report match a fresh derivation'); return 0;
  }
  const r = await buildReport(); pr(r.verification.results);
  console.log(`\n${ERR}${r.status}: ${r.counts.recordsChanged} records`);
  if (r.status !== 'DRY_RUN_CERTIFIED') return 1;
  if (has('--report')) { fs.writeFileSync(path.join(ROOT, REPORT_PATH), JSON.stringify(r, null, 1) + '\n'); fs.writeFileSync(path.join(ROOT, DOC_PATH), renderDoc(r)); console.log(ERR + `wrote ${REPORT_PATH} and ${DOC_PATH} (no pack was written)`); }
  return 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().then(code => process.exit(code), e => { console.error(e.message ?? e); process.exit(1); });
