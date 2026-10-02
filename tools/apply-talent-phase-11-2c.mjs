#!/usr/bin/env node
/**
 * Phase 11-2C — finish the BESPOKE tag adjudication on canonical Talents (system.tags only).
 *
 * Authority: data/audits/archetype-phase-11-2/bespoke-adjudication.json (owner ruling recorded from the Phase 11-2C instruction).
 *   delete    : 33 remaining singleton tree_<id> aliases, 33 structural/class/tree/implementation singletons, 8 source-reviewed singletons (no replacement, no decomposition applied)
 *   normalize : 9 exact singleton spellings -> canonical snake_case (in place, never duplicated)
 *   promote   : 31 singleton-derived concepts certified KEEP (membership retained)
 * State-aware: Phase 11-2B already removed force_item and normalized critical-success; nothing already removed is recreated.
 *
 *   --manifest --report --check --status --apply --verify [--exact]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, read, readJson, parse, TALENTS, HOMEBREW, TREES } from './talent-tag-io.mjs';
import { serializePack, gitBlobSha, fingerprint } from './apply-talent-phase-3c.mjs';
import { loadIdentityOf } from './apply-talent-phase-3g.mjs';
import { reconcile, loadInput } from './reconcile-talent-publication-corpus.mjs';
import { createProbe } from './talent-tag-probes.mjs';
import { detect11_2bState, transform } from './apply-talent-phase-11-2b.mjs';

const DIR = 'data/audits/archetype-phase-11-2/', AUTH = DIR + 'bespoke-adjudication.json';
export const MANIFEST_PATH = 'data/audits/talent-phase-11-2c-cleanup-manifest.json', REPORT_PATH = 'data/audits/talent-phase-11-2c-dry-run-report.json', DOC_PATH = 'docs/audits/talent-phase-11-2c-bespoke-cleanup.md';
const ERR = '[talent-phase-11-2c] ';
const invariant = (ok, m) => { if (!ok) throw new Error(ERR + m); };
const sortedFp = arr => fingerprint(arr.slice().sort((x, y) => x._id.localeCompare(y._id)));
const withoutTags = t => { const c = structuredClone(t); delete c.system.tags; return c; };
const EXACT_PROBES = ['droidGate', 'resolved', 'classification', 'combatCandidate', 'combatFeature', 'forceTalentCount', 'lightsaberFormLookup'];

export function loadActions() {
  const a = readJson(AUTH).actions, remove = {};
  for (const t of a.deleteTreeIdAliases) remove[t] = 'DELETE_TREE_ID_ALIAS';
  for (const t of a.deleteStructuralClassTreeImplementation) remove[t] = 'DELETE';
  for (const t of a.deleteDecomposeSourceReviewed) remove[t] = 'DELETE_DECOMPOSE';
  invariant(Object.keys(remove).length === 74 && Object.keys(a.safeNormalize).length === 9 && a.promoteBespokeToKeep.length === 31, 'unexpected action table size');
  for (const k of Object.keys(a.safeNormalize)) invariant(!remove[k], `${k} both deleted and normalized`);
  for (const k of a.promoteBespokeToKeep) invariant(!remove[k] && !a.safeNormalize[k], `${k} promoted but also acted on`);
  return { normalize: a.safeNormalize, remove, keep: a.promoteBespokeToKeep };
}
const census = talents => { const c = {}; for (const t of talents) for (const x of t.system.tags ?? []) c[x] = (c[x] ?? 0) + 1; return { unique: Object.keys(c).length, instances: Object.values(c).reduce((a, b) => a + b, 0), empty: talents.filter(t => Array.isArray(t.system.tags) && !t.system.tags.length).length, noField: talents.filter(t => t.system.tags === undefined).length, byTag: c }; };

export function deriveManifest() {
  invariant(detect11_2bState() === 'POST_11_2B', 'the Phase 11-2B post-state is the required baseline');
  const text = read(TALENTS), talents = parse(text), A = loadActions(), identityOf = loadIdentityOf(), rows = [], c = census(talents);
  // state-aware partition of the ORIGINAL 108 bespoke singletons
  const pr = readJson(DIR + 'tag-pruning-pass-1.json'), bespoke = pr.tags.filter(t => t.bucket === 'BESPOKE').map(t => t.tag);
  const decided = k => A.remove[k] || A.normalize[k] || A.keep.includes(k);
  const alreadyResolved = bespoke.filter(k => !c.byTag[k]), undecided = bespoke.filter(k => c.byTag[k] && !decided(k));
  invariant(undecided.length === 0, `bespoke tags without a decision: ${undecided.join(', ')}`);
  let removed = 0, normalized = 0, dup = 0;
  for (const t of talents) {
    const before = Array.isArray(t.system.tags) ? t.system.tags : []; if (!before.length) continue;
    const rem = [], ren = [], dups = [], after = [];
    for (const x of before) {
      if (A.remove[x]) { rem.push({ tag: x, action: A.remove[x] }); continue; }
      const tg = A.normalize[x];
      if (tg) { if (before.includes(tg) || after.includes(tg)) { dups.push({ from: x, to: tg }); continue; } after.push(tg); ren.push({ from: x, to: tg }); continue; }
      after.push(x);
    }
    if (JSON.stringify(after) === JSON.stringify(before)) continue;
    removed += rem.length; normalized += ren.length; dup += dups.length;
    rows.push({ id: t._id, canonicalIdentity: identityOf.get(t._id) ?? null, name: t.name, path: 'system.tags', before, after, removed: rem, normalized: ren, canonicalAlreadyPresent: dups });
  }
  rows.sort((a, b) => a.id.localeCompare(b.id));
  return { schemaVersion: 1, phase: '11-2C', status: 'CLEANUP_MANIFEST', authority: AUTH, boundary: 'system.tags of canonical talents: certified BESPOKE actions only',
    actions: { normalize: A.normalize, remove: A.remove, promotedKeep: A.keep }, bespokeAlreadyResolvedBefore11_2C: alreadyResolved,
    counts: { deleteRules: Object.keys(A.remove).length, normalizeRules: Object.keys(A.normalize).length, promotedKeep: A.keep.length, recordsChanged: rows.length, tagElementsRemoved: removed, tagElementsNormalized: normalized, duplicateTargetsAvoided: dup },
    preState: { talents: gitBlobSha(text), homebrew: gitBlobSha(read(HOMEBREW)) }, rows };
}

export function project(manifest, talents) {
  const by = new Map(manifest.rows.map(r => [r.id, r]));
  return talents.map(t => { const r = by.get(t._id); if (!r) return t; const n = structuredClone(t); n.system.tags = [...r.after]; return n; });
}

export async function buildReport() {
  const manifest = readJson(MANIFEST_PATH), A = { normalize: manifest.actions.normalize, remove: manifest.actions.remove }, text = read(TALENTS), talents = parse(text), hbText = read(HOMEBREW);
  const after = project(manifest, talents), afterText = serializePack(text, after), tb = new Map(talents.map(t => [t._id, t])), ta = new Map(after.map(t => [t._id, t])), ids = new Set(manifest.rows.map(r => r.id));
  const v = [], check = (id, ok, detail = '') => v.push({ id, ok: !!ok, detail });
  const b = census(talents), a = census(after), targets = new Set(Object.values(A.normalize)), sources = Object.keys(A.normalize), removeSet = new Set(Object.keys(A.remove));
  const keepAll = new Set([...manifest.actions.promotedKeep]);
  // previously certified KEEP concepts: KEEP bucket of the original pruning pass + the Phase 11-2B keep decisions
  const m2b = readJson('data/audits/talent-phase-11-2b-cleanup-manifest.json'), pr = readJson(DIR + 'tag-pruning-pass-1.json');
  const certKeep = new Set([...pr.tags.filter(t => t.bucket === 'KEEP').map(t => t.tag), ...m2b.actions.keep, ...Object.values(m2b.actions.normalize)]);

  const probe = await createProbe(); const exactFail = [], treeDelta = [], mystic = [];
  for (const t of talents) { const x = probe.signature(t, t.system.tags ?? []), y = probe.signature(ta.get(t._id), ta.get(t._id).system.tags ?? []); for (const k of probe.diff(x, y)) { if (EXACT_PROBES.includes(k)) exactFail.push(`${t.name}: ${k}`); else if (k === 'treeIdentity') treeDelta.push(t.name); else mystic.push(t.name); } }
  probe.restore();
  const expectTarget = {}; for (const tg of targets) expectTarget[tg] = talents.filter(t => (t.system.tags ?? []).includes(tg) || sources.some(s => A.normalize[s] === tg && (t.system.tags ?? []).includes(s))).length;

  check('all authorized deletion strings are absent from canonical talent tags', [...removeSet].every(k => !a.byTag[k]) && removeSet.size === 74);
  check('all nine normalization source strings are absent', sources.length === 9 && sources.every(s => !a.byTag[s]));
  check('each normalization target holds exactly pre-members ∪ source-members', [...targets].every(tg => (a.byTag[tg] ?? 0) === expectTarget[tg]));
  check('duplicate target tags were avoided (no talent carries a tag twice)', after.every(t => new Set(t.system.tags ?? []).size === (t.system.tags ?? []).length));
  check('every promoted KEEP concept retains all its pre-pass members (only exact normalization targets may grow)', manifest.actions.promotedKeep.every(k => (a.byTag[k] ?? 0) === (targets.has(k) ? expectTarget[k] : (b.byTag[k] ?? 0))));
  check('no previously certified KEEP concept lost a member (only exact alias targets may grow)', [...certKeep].filter(k => b.byTag[k]).every(k => (a.byTag[k] ?? 0) >= (b.byTag[k] ?? 0) && ((a.byTag[k] ?? 0) === b.byTag[k] || targets.has(k))));
  check('no unapproved new tag was created (every new string is a certified normalization target)', Object.keys(a.byTag).filter(k => !b.byTag[k]).every(k => targets.has(k)));
  check('every tag that is neither deleted nor normalized keeps its exact membership', Object.keys(b.byTag).filter(k => !removeSet.has(k) && !A.normalize[k] && !targets.has(k)).every(k => a.byTag[k] === b.byTag[k]));
  check('no tree_* tag remains on any canonical talent', Object.keys(a.byTag).every(k => !k.startsWith('tree_')));
  check('50 homebrew talents are byte-for-byte unchanged', parse(hbText).length === 50 && gitBlobSha(hbText) === manifest.preState.homebrew && !parse(hbText).some(h => ids.has(h._id)));
  check('only system.tags changed on canonical records (identity, uuids, text, source/page, prerequisites, flags, effects, rules untouched)', talents.every(t => JSON.stringify(withoutTags(t)) === JSON.stringify(withoutTags(ta.get(t._id)))) && talents.every(t => ids.has(t._id) || JSON.stringify(t) === JSON.stringify(ta.get(t._id))));
  check('surviving tag order is deterministic (original order; renames in place)', after.every(t => JSON.stringify(t.system.tags ?? []) === JSON.stringify(transform(tb.get(t._id).system.tags ?? [], A))));
  check('1,187 canonical talents, ids and names unchanged; emptied sets stay arrays', after.length === 1187 && after.every((t, i) => t._id === talents[i]._id && t.name === talents[i].name) && after.every(t => t.system.tags === undefined || Array.isArray(t.system.tags)));
  const rec = reconcile({ ...loadInput(), production: after });
  check('Phase 3E corpus/text, 3F tree identity and 3G prerequisite gates stay clean (reconciler: 0 blocking findings)', rec.blockingFindings.length === 0, JSON.stringify(rec.findingCounts));
  check('executable-equivalence probes identical for all 1,187 talents', exactFail.length === 0, exactFail.slice(0, 5).join('; '));
  check('second dry-run is a zero diff', JSON.stringify(project(manifest, after)) === JSON.stringify(after) && after.every(t => JSON.stringify(transform(t.system.tags ?? [], A)) === JSON.stringify(t.system.tags ?? [])));
  check(`serialization is surgical: only ${ids.size} lines of packs/talents.db change`, (() => { const x = text.split('\n'), y = afterText.split('\n'); return x.length === y.length && x.filter((l, i) => l !== y[i]).length === ids.size; })());
  check('manifest counts equal the projection', manifest.counts.recordsChanged === ids.size && b.instances - a.instances === manifest.counts.tagElementsRemoved + manifest.counts.duplicateTargetsAvoided);
  return {
    schemaVersion: 1, phase: '11-2C', dryRun: true, status: v.every(x => x.ok) ? 'DRY_RUN_CERTIFIED' : 'DRY_RUN_FAILED',
    counts: { ...manifest.counts, rawTagsBefore: b.unique, rawTagsAfter: a.unique, tagInstancesBefore: b.instances, tagInstancesAfter: a.instances, emptyTagArraysBefore: b.empty, emptyTagArraysAfter: a.empty, noTagsField: a.noField, treeUnderscoreTagsRemaining: Object.keys(a.byTag).filter(k => k.startsWith('tree_')).length, newRawStringsFromNormalization: Object.keys(a.byTag).filter(k => !b.byTag[k]).sort(), bespokeAlreadyResolvedBefore11_2C: manifest.bespokeAlreadyResolvedBefore11_2C },
    runtimeConsumers: { exactProbesIdentical: exactFail.length === 0, talentsWhosePrerequisiteTreeCreditChangesBeforeTreeAuthorityRepair: new Set(treeDelta).size, talentsWhoseMysticMasteryEstimateChanges: new Set(mystic).size },
    postCensus: { uniqueRawTags: a.unique, tagInstances: a.instances, emptyTagArrays: a.empty, noTagsField: a.noField, byTag: Object.fromEntries(Object.entries(a.byTag).sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))) },
    preState: manifest.preState, postState: { talents: gitBlobSha(afterText) }, othersFingerprint: sortedFp(after.filter(t => !ids.has(t._id))), records: [...ids], verification: { results: v }
  };
}

const renderDoc = r => { const c = r.counts, x = r.runtimeConsumers; return ['# Phase 11-2C — BESPOKE tag adjudication completed (Talents)', '',
  `Status: **${r.status}**. **${c.recordsChanged} records** change (\`system.tags\` only): **${c.tagElementsRemoved}** tag elements removed, **${c.tagElementsNormalized}** renamed, ${c.duplicateTargetsAvoided} duplicate targets avoided. Raw tag strings **${c.rawTagsBefore} → ${c.rawTagsAfter}**; instances ${c.tagInstancesBefore} → ${c.tagInstancesAfter}; talents with an empty tag array ${c.emptyTagArraysBefore} → ${c.emptyTagArraysAfter}; \`tree_*\` tags remaining: ${c.treeUnderscoreTagsRemaining}.`, '',
  `Rules: ${c.deleteRules} deletions (33 singleton tree-ID aliases, 33 structural/class/tree/implementation singletons, 8 source-reviewed singletons; no replacement, no decomposition applied), ${c.normalizeRules} exact normalizations, ${c.promotedKeep} singleton-derived concepts promoted to KEEP. Already resolved by Phase 11-2B and not recreated: ${c.bespokeAlreadyResolvedBefore11_2C.join(', ') || 'none'}. New raw strings (certified normalization targets only): ${c.newRawStringsFromNormalization.join(', ') || 'none'}.`, '',
  '## Verification', '', ...r.verification.results.map(y => `- ${y.ok ? 'PASS' : 'FAIL'} ${y.id}${y.detail ? ' — ' + y.detail : ''}`), '',
  '## Runtime consumers', '', `Exact probes identical: **${x.exactProbesIdentical}**. Prerequisite tree credit still read from tags before the separate tree-authority repair commit: ${x.talentsWhosePrerequisiteTreeCreditChangesBeforeTreeAuthorityRepair} talents; Mystic Mastery estimate: ${x.talentsWhoseMysticMasteryEstimateChanges}. See docs/audits/talent-phase-11-2c-consumer-findings.md.`, ''].join('\n'); };

export function detect11_2cState() {
  if (!fs.existsSync(path.join(ROOT, REPORT_PATH))) return 'PRE_11_2C';
  const r = readJson(REPORT_PATH), sha = gitBlobSha(read(TALENTS));
  if (r.postState.talents === sha) return 'POST_11_2C';
  if (r.preState.talents === sha) return 'PRE_11_2C';
  const h = 'data/audits/talent-phase-12-1-dry-run-report.json'; // Phase 12-1 (later) tagged the 309 certified orphans: this report's tag sets, census and fingerprint are superseded
  return fs.existsSync(path.join(ROOT, h)) && readJson(h).postState.talents === sha ? 'POST_LATER' : 'UNKNOWN';
}

export async function verifyApplied({ exact = false } = {}) {
  const res = [], check = (id, ok, detail = '') => res.push({ id, ok: !!ok, detail });
  const report = readJson(REPORT_PATH), manifest = readJson(MANIFEST_PATH), text = read(TALENTS), talents = parse(text), by = new Map(talents.map(t => [t._id, t])), ids = new Set(manifest.rows.map(r => r.id)), c = census(talents), A = manifest.actions;
  const later = detect11_2cState() === 'POST_LATER'; // Phase 12-1 tagged 309 previously untagged talents: the census, the "other talents" fingerprint and the blob are superseded
  check('packs/talents.db is the certified Phase 11-2C post-state (or a later certified state)', ['POST_11_2C', 'POST_LATER'].includes(detect11_2cState()));
  check('talent count unchanged (1,187)', talents.length === 1187);
  check('no deleted or normalized-source tag remains; no tree_* tag remains', [...Object.keys(A.normalize), ...Object.keys(A.remove)].every(k => !c.byTag[k]) && Object.keys(c.byTag).every(k => !k.startsWith('tree_')));
  check('every manifest record carries exactly its certified tags', manifest.rows.every(r => JSON.stringify(by.get(r.id)?.system.tags) === JSON.stringify(r.after)));
  if (!later) check('post census equals the certified census', Object.keys(c.byTag).length === Object.keys(report.postCensus.byTag).length && Object.entries(c.byTag).every(([k, n]) => report.postCensus.byTag[k] === n));
  if (!later) check('other talents unchanged', sortedFp(talents.filter(t => !ids.has(t._id))) === report.othersFingerprint);
  check('homebrew pack unchanged', gitBlobSha(read(HOMEBREW)) === report.preState.homebrew);
  const rec = reconcile(loadInput()); check('reconciler: zero blocking findings', rec.blockingFindings.length === 0, JSON.stringify(rec.findingCounts));
  if (exact && !later) check('packs/talents.db equals the certified blob', gitBlobSha(text) === report.postState.talents);
  return res;
}

export function applyProduction() {
  invariant(detect11_2cState() === 'PRE_11_2C', 'REFUSED: packs are not the pre-cleanup state (already applied or drifted)');
  const committed = readJson(REPORT_PATH); invariant(committed.status === 'DRY_RUN_CERTIFIED', 'REFUSED: dry-run report is not certified');
  const texts = read(TALENTS), out = serializePack(texts, project(readJson(MANIFEST_PATH), parse(texts)));
  invariant(gitBlobSha(out) === committed.postState.talents, 'REFUSED: rendered output does not match the certified post-state blob');
  fs.writeFileSync(path.join(ROOT, TALENTS), out);
}

export async function main(argv = process.argv.slice(2)) {
  const has = f => argv.includes(f), state = detect11_2cState();
  const pr = res => { for (const x of res) console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.id}${x.ok || !x.detail ? '' : '  [' + x.detail + ']'}`); return res.filter(x => !x.ok).length; };
  if (has('--status')) { console.log(ERR + state); return 0; }
  if (has('--verify') || (has('--check') && (state === 'POST_11_2C' || state === 'POST_LATER'))) { const bad = pr(await verifyApplied({ exact: has('--exact') })); console.log(`\n${ERR}verify ${bad ? 'FAIL' : 'PASS'}`); return bad ? 1 : 0; }
  if (has('--apply')) { const fresh = await buildReport(); invariant(read(REPORT_PATH) === JSON.stringify(fresh, null, 1) + '\n', 'REFUSED: committed dry-run report differs from a fresh projection'); applyProduction(); console.log(ERR + 'APPLIED packs/talents.db (uncommitted)'); return 0; }
  invariant(state === 'PRE_11_2C', `the pre-cleanup pack is required (found ${state})`);
  if (has('--manifest')) { fs.writeFileSync(path.join(ROOT, MANIFEST_PATH), JSON.stringify(deriveManifest(), null, 1) + '\n'); console.log(ERR + 'wrote ' + MANIFEST_PATH); return 0; }
  if (has('--check')) {
    if (read(MANIFEST_PATH) !== JSON.stringify(deriveManifest(), null, 1) + '\n') { console.error(ERR + 'STALE: manifest differs from a fresh derivation'); return 1; }
    const r = await buildReport(); if (read(REPORT_PATH) !== JSON.stringify(r, null, 1) + '\n' || read(DOC_PATH) !== renderDoc(r)) { console.error(ERR + 'STALE: dry-run report differs from a fresh projection'); return 1; }
    console.log(ERR + 'manifest and dry-run report match a fresh derivation'); return 0;
  }
  const r = await buildReport(); pr(r.verification.results);
  console.log(`\n${ERR}${r.status}: ${r.counts.recordsChanged} records, ${r.counts.tagElementsRemoved} removed, ${r.counts.tagElementsNormalized} normalized, raw tags ${r.counts.rawTagsBefore} -> ${r.counts.rawTagsAfter}`);
  if (r.status !== 'DRY_RUN_CERTIFIED') return 1;
  if (has('--report')) { fs.writeFileSync(path.join(ROOT, REPORT_PATH), JSON.stringify(r, null, 1) + '\n'); fs.writeFileSync(path.join(ROOT, DOC_PATH), renderDoc(r)); console.log(ERR + `wrote ${REPORT_PATH} and ${DOC_PATH} (no pack was written)`); }
  return 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().then(code => process.exit(code), e => { console.error(e.message ?? e); process.exit(1); });
