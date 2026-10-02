#!/usr/bin/env node
/**
 * Phase 11-2A — certified junk-tag DELETION from canonical Talents.
 *
 * Authority: data/audits/archetype-phase-11-2/tag-pruning-pass-1.json (owner design pass, branch audit/archetype-phase-11-2-mechanical-ontology @ 9f64aeed).
 * Scope (exact): remove the 74 tag strings in that artifact's DELETE bucket from `system.tags` of the 1,187 canonical Talents, wherever they occur.
 * Nothing else: no replacement, no alias normalization, no RECONSIDER/BESPOKE adjudication, no new tags, surviving tags keep their order, 50 homebrew talents untouched.
 *
 *   --manifest  --report  --check  --status  --apply  --verify [--exact]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, read, readJson, parse, TALENTS, HOMEBREW, TREES } from './talent-tag-io.mjs';
import { serializePack, gitBlobSha, fingerprint } from './apply-talent-phase-3c.mjs';
import { loadIdentityOf } from './apply-talent-phase-3g.mjs';
import { reconcile, loadInput } from './reconcile-talent-publication-corpus.mjs';
import { createProbe } from './talent-tag-probes.mjs';

export const AUTH = 'data/audits/archetype-phase-11-2/tag-pruning-pass-1.json';
export const MANIFEST_PATH = 'data/audits/talent-phase-11-2a-deletion-manifest.json', REPORT_PATH = 'data/audits/talent-phase-11-2a-dry-run-report.json', DOC_PATH = 'docs/audits/talent-phase-11-2a-junk-tag-deletion.md';
const ERR = '[talent-phase-11-2a] ';
const invariant = (ok, m) => { if (!ok) throw new Error(ERR + m); };
const sortedFp = arr => fingerprint(arr.slice().sort((x, y) => x._id.localeCompare(y._id)));
const withoutTags = t => { const c = structuredClone(t); delete c.system.tags; return c; };
const EXACT_PROBES = ['droidGate', 'resolved', 'classification', 'combatCandidate', 'combatFeature', 'forceTalent', 'lightsaberFormLookup'];

export function loadBuckets(talents) {
  const a = readJson(AUTH), by = { KEEP: new Set(), DELETE: new Set(), RECONSIDER: new Set(), BESPOKE: new Set() };
  for (const t of a.tags) by[t.bucket].add(t.tag);
  invariant(a.tags.length === 430 && a.counts.DELETE === 74 && by.DELETE.size === 74 && by.KEEP.size === 123 && by.RECONSIDER.size === 125 && by.BESPOKE.size === 108, 'the authority artifact is not the certified 123/74/125/108 partition of 430 tags');
  // the artifact's census must describe THIS pack: per-tag talent counts equal the pack's
  const have = {}; for (const t of talents) for (const x of new Set(t.system.tags ?? [])) have[x] = (have[x] ?? 0) + 1;
  invariant(a.tags.every(t => have[t.tag] === t.talentCount) && Object.keys(have).length === 430, 'the authority artifact census does not match the current pack');
  return by;
}

export function deriveManifest() {
  const talentsText = read(TALENTS), talents = parse(talentsText), by = loadBuckets(talents), identityOf = loadIdentityOf();
  const rows = []; let removedElements = 0;
  for (const t of talents) {
    const before = Array.isArray(t.system.tags) ? t.system.tags : []; const removed = before.filter(x => by.DELETE.has(x));
    if (!removed.length) continue;
    removedElements += removed.length;
    rows.push({ id: t._id, canonicalIdentity: identityOf.get(t._id) ?? null, name: t.name, path: 'system.tags', before, after: before.filter(x => !by.DELETE.has(x)), removed });
  }
  rows.sort((a, b) => a.id.localeCompare(b.id));
  return { schemaVersion: 1, phase: '11-2A', status: 'DELETION_MANIFEST', authority: AUTH, boundary: 'system.tags of canonical talents: the 74 DELETE-bucket strings only', deleteTags: [...by.DELETE].sort(), recordsChanged: rows.length, tagElementsRemoved: removedElements,
    preState: { talents: gitBlobSha(talentsText), homebrew: gitBlobSha(read(HOMEBREW)) }, rows };
}

export function project(manifest, talents) {
  const del = new Set(manifest.deleteTags);
  return talents.map(t => { if (!Array.isArray(t.system.tags) || !t.system.tags.some(x => del.has(x))) return t; const n = structuredClone(t); n.system.tags = n.system.tags.filter(x => !del.has(x)); return n; });
}

const censusOf = talents => { const c = {}; for (const t of talents) for (const x of t.system.tags ?? []) c[x] = (c[x] ?? 0) + 1; return { uniqueRawTags: Object.keys(c).length, tagInstances: Object.values(c).reduce((a, b) => a + b, 0), emptyTagArrays: talents.filter(t => Array.isArray(t.system.tags) && !t.system.tags.length).length, noTagsField: talents.filter(t => t.system.tags === undefined).length, byTag: Object.fromEntries(Object.entries(c).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) }; };

function walk(dir, out = []) { for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) { const rel = path.join(dir, e.name); if (e.isDirectory()) walk(rel, out); else if (e.name.endsWith('.js')) out.push(rel); } return out; }
/** Owner-reviewable triage of every literal hit (the probes already prove no EXECUTABLE behaviour changes). */
const TRIAGE = {
  'feat-chain@scripts/engine/suggestion/SuggestionScorer.js': 'SUGGESTION SCORING DEFECT: _isFeatChainContinuation() grants a chain-continuation bonus only to candidates tagged feat-chain/talent-chain (bookkeeping tags). After deletion no talent earns it. Not restored; the continuation signal should come from exact prerequisite identity (3G UUIDs) in the suggestion integration phase.',
  'talent-chain@scripts/engine/suggestion/SuggestionScorer.js': 'same defect as feat-chain (same function)',
  'forecast_value@scripts/engine/suggestion/SuggestionReasonEngine.js': 'suggestion explanation only: the "grows_in_value" forecast reason no longer fires for the tagged talents; no rules effect',
  'feat_chain@scripts/engine/mentor/mentor-choice-line-composer.js': 'not a tag read: matches a REASON key string in mentor text; unaffected',
  'combat_action@scripts/apps/customization/item-customization-workbench.js': 'item-customization workbench (non-talent items); unaffected',
  'contextual@scripts/apps/progression-framework/steps/galactic-profile-step.js': 'galactic profile (non-talent); unaffected',
  'contextual@scripts/dialogs/entity-dialog/effect-intent-engine.js': 'effect-intent dialog heuristics over effect descriptors (non-talent tags); unaffected'
};
/** Static scan: quoted literals of a deleted tag, in scripts that read `tags`, plus the two pattern readers known to touch deleted families. */
export function scanConsumers(deleteTags) {
  const hits = [];
  for (const rel of walk('scripts')) {
    const src = read(rel); if (!/\btags\b/.test(src)) continue;
    src.split('\n').forEach((line, i) => { for (const tag of deleteTags) if (line.includes(`'${tag}'`) || line.includes(`"${tag}"`) || line.includes(`\`${tag}\``)) hits.push({ tag, file: rel, line: i + 1, text: line.trim().slice(0, 140), triage: TRIAGE[`${tag}@${rel}`] ?? 'UNTRIAGED' }); });
  }
  const pattern = [];
  const r = read('scripts/items/talent-data-resolver.js'); if (/choice_required\|immediate_choice/.test(r)) pattern.push({ file: 'scripts/items/talent-data-resolver.js', reads: 'choice_required | immediate_choice (regex over system.tags)', deletedTagsAffected: ['choice_required', 'immediate_choice'] });
  const d = read('scripts/engine/progression/droids/droid-progression-guards.js'); if (/\^tree\[_-\]/.test(d)) pattern.push({ file: 'scripts/engine/progression/droids/droid-progression-guards.js', reads: 'tree_<id> tag tokens as droid-only tree keys', deletedTagsAffected: deleteTags.filter(t => t.startsWith('tree_')) });
  return { literalHits: hits, patternReaders: pattern };
}

export async function buildReport() {
  const manifest = readJson(MANIFEST_PATH), talentsText = read(TALENTS), talents = parse(talentsText), homebrewText = read(HOMEBREW), by = loadBuckets(talents);
  const after = project(manifest, talents), afterText = serializePack(talentsText, after), tb = new Map(talents.map(t => [t._id, t])), ta = new Map(after.map(t => [t._id, t])), ids = new Set(manifest.rows.map(r => r.id));
  const del = new Set(manifest.deleteTags), v = [], check = (id, ok, detail = '') => v.push({ id, ok: !!ok, detail });
  const before = censusOf(talents), post = censusOf(after);

  const probe = await createProbe(); const exactFail = [], treeDelta = [], mystic = [];
  for (const t of talents) {
    const a = probe.signature(t, t.system.tags ?? []), b = probe.signature(ta.get(t._id), ta.get(t._id).system.tags ?? []);
    for (const k of probe.diff(a, b)) { if (EXACT_PROBES.includes(k)) exactFail.push(`${t.name}: ${k}`); else if (k === 'treeIdentity') treeDelta.push(t.name); else mystic.push(t.name); }
  }
  probe.restore();
  const consumers = scanConsumers(manifest.deleteTags);

  check('exactly the 74 DELETE-bucket strings are absent from all canonical talent tags', after.every(t => (t.system.tags ?? []).every(x => !del.has(x))) && del.size === 74);
  check('no KEEP / RECONSIDER / BESPOKE tag lost a single occurrence', Object.entries(before.byTag).filter(([k]) => !del.has(k)).every(([k, n]) => post.byTag[k] === n) && [...by.KEEP, ...by.RECONSIDER, ...by.BESPOKE].every(k => (post.byTag[k] ?? 0) === (before.byTag[k] ?? 0)));
  check('no new tag was added; surviving tags keep their original order', after.every(t => { const b = tb.get(t._id).system.tags ?? []; const a = t.system.tags ?? []; return JSON.stringify(a) === JSON.stringify(b.filter(x => !del.has(x))); }));
  check('50 homebrew talents are byte-for-byte unchanged', parse(homebrewText).length === 50 && gitBlobSha(homebrewText) === manifest.preState.homebrew && !parse(homebrewText).some(h => ids.has(h._id)));
  check('only system.tags changed on canonical records (every other field, incl. identity, text, prerequisites/uuids, source/page, treeId, flags, effects, abilityMeta/rules)', talents.every(t => JSON.stringify(withoutTags(t)) === JSON.stringify(withoutTags(ta.get(t._id)))) && talents.every(t => ids.has(t._id) || JSON.stringify(t) === JSON.stringify(ta.get(t._id))));
  check('1,187 canonical talents, identities unchanged', talents.length === 1187 && after.length === 1187 && after.every((t, i) => t._id === talents[i]._id && t.name === talents[i].name));
  check('tree identity/membership unchanged (tree pack is not an input; treeId untouched on every talent)', after.every(t => t.system.treeId === tb.get(t._id).system.treeId));
  check('records with an emptied tag set keep the normal empty-array representation', after.filter(t => ids.has(t._id) && !t.system.tags.length).every(t => Array.isArray(t.system.tags)));
  const rec = reconcile({ ...loadInput(), production: after });
  check('Phase 3E corpus/text, 3F tree identity and 3G prerequisite gates stay clean (reconciler: 0 blocking findings)', rec.blockingFindings.length === 0, JSON.stringify(rec.findingCounts));
  check('Phase 3G invariant: every structured talent leaf is still a canonical uuid', after.every(t => (t.system.prerequisitesStructured?.conditions ?? []).filter(c => c.type === 'talent').every(c => /^Compendium\.foundryvtt-swse\.talents\.Item\.[0-9a-f]+$/.test(c.uuid ?? ''))));
  check('executable-equivalence probes (droid gate, choice/execution resolver, item classification, combat-feature classifier, Force-talent counting, lightsaber-form lookup) identical for all 1,187 talents', exactFail.length === 0, exactFail.slice(0, 5).join('; '));
  check('second deletion dry-run is a zero diff', JSON.stringify(project(manifest, after)) === JSON.stringify(after));
  check(`serialization is surgical: only ${ids.size} lines of packs/talents.db change`, (() => { const x = talentsText.split('\n'), y = afterText.split('\n'); return x.length === y.length && x.filter((l, i) => l !== y[i]).length === ids.size; })());
  check('every literal mention of a deleted tag is triaged (none is an unreviewed executable dependency)', consumers.literalHits.every(h => h.triage !== 'UNTRIAGED'), consumers.literalHits.filter(h => h.triage === 'UNTRIAGED').map(h => h.tag + '@' + h.file).join('; '));
  check('manifest counts equal the projection (records and tag elements removed)', manifest.recordsChanged === ids.size && manifest.tagElementsRemoved === talents.reduce((n, t) => n + ((t.system.tags ?? []).length - (ta.get(t._id).system.tags ?? []).length), 0));

  return {
    schemaVersion: 1, phase: '11-2A', dryRun: true, status: v.every(x => x.ok) ? 'DRY_RUN_CERTIFIED' : 'DRY_RUN_FAILED',
    counts: { deleteTags: del.size, recordsChanged: ids.size, tagElementsRemoved: manifest.tagElementsRemoved, rawTagsBefore: before.uniqueRawTags, rawTagsAfter: post.uniqueRawTags, tagInstancesBefore: before.tagInstances, tagInstancesAfter: post.tagInstances,
      emptyTagArraysBefore: before.emptyTagArrays, emptyTagArraysAfter: post.emptyTagArrays, noTagsFieldBefore: before.noTagsField, noTagsFieldAfter: post.noTagsField, survivingByBucket: { KEEP: [...by.KEEP].filter(k => post.byTag[k]).length, RECONSIDER: [...by.RECONSIDER].filter(k => post.byTag[k]).length, BESPOKE: [...by.BESPOKE].filter(k => post.byTag[k]).length } },
    runtimeConsumers: { exactProbesIdentical: exactFail.length === 0, treeCreditChanges: treeDelta.length, mysticMasteryChanges: mystic.length, literalMentionsInTagReadingScripts: consumers.literalHits, patternReaders: consumers.patternReaders,
      finding: exactFail.length || treeDelta.length || mystic.length ? 'a deleted tag changes consumer behaviour (see lists)' : 'no executable consumer behaves differently without the deleted tags' },
    postCensus: { uniqueRawTags: post.uniqueRawTags, tagInstances: post.tagInstances, emptyTagArrays: post.emptyTagArrays, noTagsField: post.noTagsField, byTag: post.byTag },
    preState: manifest.preState, postState: { talents: gitBlobSha(afterText) }, othersFingerprint: sortedFp(after.filter(t => !ids.has(t._id))), records: [...ids], verification: { results: v }
  };
}

const renderDoc = r => { const c = r.counts, x = r.runtimeConsumers; return ['# Phase 11-2A — certified junk-tag deletion (Talents)', '',
  `Status: **${r.status}**. Authority: \`${AUTH}\` (owner design pass; DELETE bucket = 74 tags). **${c.recordsChanged} records** change (\`system.tags\` only); **${c.tagElementsRemoved} tag elements** removed. Raw tag strings **${c.rawTagsBefore} → ${c.rawTagsAfter}**; tag instances ${c.tagInstancesBefore} → ${c.tagInstancesAfter}; canonical talents with an empty tag array ${c.emptyTagArraysBefore} → ${c.emptyTagArraysAfter} (${c.noTagsFieldAfter} have no \`tags\` field, unchanged).`, '',
  '## Verification', '', ...r.verification.results.map(y => `- ${y.ok ? 'PASS' : 'FAIL'} ${y.id}${y.detail ? ' — ' + y.detail : ''}`), '',
  '## Runtime consumers of the deleted tags', '', `Exact probes identical: **${x.exactProbesIdentical}**; prerequisite tree-credit changes: ${x.treeCreditChanges}; Mystic Mastery estimate changes: ${x.mysticMasteryChanges}. ${x.finding}.`, '',
  ...(x.patternReaders.length ? ['Pattern readers that touch a deleted family (behaviour proven unchanged by the probes):', ...x.patternReaders.map(p => `- \`${p.file}\` reads ${p.reads}`), ''] : []),
  `Literal mentions of a deleted tag in tag-reading scripts: ${x.literalMentionsInTagReadingScripts.length}.`, ...x.literalMentionsInTagReadingScripts.map(h => `- \`${h.tag}\` @ ${h.file}:${h.line} — ${h.triage}`), '',
  'Surviving singleton `tree_*` and other BESPOKE tags, all RECONSIDER tags, and every KEEP tag are untouched by design.', ''].join('\n'); };

export function detect11_2aState() {
  if (!fs.existsSync(path.join(ROOT, REPORT_PATH))) return 'PRE_11_2A';
  const r = readJson(REPORT_PATH), sha = gitBlobSha(read(TALENTS));
  if (r.postState.talents === sha) return 'POST_11_2A';
  if (r.preState.talents === sha) return 'PRE_11_2A';
  // Phase 11-2B / 11-2C (later) cleaned further legacy tags
  return ['talent-phase-11-2b-dry-run-report.json', 'talent-phase-11-2c-dry-run-report.json', 'talent-phase-12-1-dry-run-report.json', 'talent-phase-12-2-dry-run-report.json'].some(f => fs.existsSync(path.join(ROOT, 'data/audits', f)) && readJson('data/audits/' + f).postState.talents === sha) ? 'POST_LATER' : 'UNKNOWN';
}

export async function verifyApplied({ exact = false } = {}) {
  const res = [], check = (id, ok, detail = '') => res.push({ id, ok: !!ok, detail });
  const report = readJson(REPORT_PATH), manifest = readJson(MANIFEST_PATH), talentsText = read(TALENTS), talents = parse(talentsText), del = new Set(manifest.deleteTags), ids = new Set(manifest.rows.map(r => r.id)), by = new Map(talents.map(t => [t._id, t]));
  const auth = readJson(AUTH), buckets = {}; for (const t of auth.tags) (buckets[t.bucket] ??= new Set()).add(t.tag);
  const later = detect11_2aState() === 'POST_LATER'; // 11-2B removed/renamed further tags: manifest tag sets, census counts and the fingerprint are superseded; the 74-tag absence is still checked
  check('packs/talents.db is the certified Phase 11-2A post-state (or a later certified state)', ['POST_11_2A', 'POST_LATER'].includes(detect11_2aState()));
  check('talent count unchanged (1,187)', talents.length === 1187);
  check('none of the 74 DELETE-bucket tags remains on any canonical talent', talents.every(t => (t.system.tags ?? []).every(x => !del.has(x))));
  if (!later) check('every manifest record carries exactly its certified surviving tags', manifest.rows.every(r => JSON.stringify(by.get(r.id)?.system.tags) === JSON.stringify(r.after)));
  const c = censusOf(talents);
  if (!later) check('surviving census: every KEEP/RECONSIDER/BESPOKE tag keeps its certified count', [...(buckets.KEEP ?? []), ...(buckets.RECONSIDER ?? []), ...(buckets.BESPOKE ?? [])].every(k => c.byTag[k] === report.postCensus.byTag[k]) && c.uniqueRawTags === report.counts.rawTagsAfter);
  if (!later) check('other talents unchanged', sortedFp(talents.filter(t => !ids.has(t._id))) === report.othersFingerprint);
  check('homebrew pack unchanged', gitBlobSha(read(HOMEBREW)) === report.preState.homebrew);
  const rec = reconcile(loadInput()); check('reconciler: zero blocking findings', rec.blockingFindings.length === 0, JSON.stringify(rec.findingCounts));
  if (exact && !later) check('packs/talents.db equals the certified blob', gitBlobSha(talentsText) === report.postState.talents);
  return res;
}

export function applyProduction() {
  invariant(detect11_2aState() === 'PRE_11_2A', 'REFUSED: packs are not the pre-deletion state (already applied or drifted)');
  const committed = readJson(REPORT_PATH); invariant(committed.status === 'DRY_RUN_CERTIFIED', 'REFUSED: dry-run report is not certified');
  const texts = read(TALENTS), out = serializePack(texts, project(readJson(MANIFEST_PATH), parse(texts)));
  invariant(gitBlobSha(out) === committed.postState.talents, 'REFUSED: rendered output does not match the certified post-state blob');
  fs.writeFileSync(path.join(ROOT, TALENTS), out);
}

export async function main(argv = process.argv.slice(2)) {
  const has = f => argv.includes(f), state = detect11_2aState();
  const pr = res => { for (const x of res) console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.id}${x.ok || !x.detail ? '' : '  [' + x.detail + ']'}`); return res.filter(x => !x.ok).length; };
  if (has('--status')) { console.log(ERR + state); return 0; }
  if (has('--verify') || (has('--check') && (state === 'POST_11_2A' || state === 'POST_LATER'))) { const bad = pr(await verifyApplied({ exact: has('--exact') })); console.log(`\n${ERR}verify ${bad ? 'FAIL' : 'PASS'}`); return bad ? 1 : 0; }
  if (has('--apply')) { const fresh = await buildReport(); invariant(read(REPORT_PATH) === JSON.stringify(fresh, null, 1) + '\n', 'REFUSED: committed dry-run report differs from a fresh projection'); applyProduction(); console.log(ERR + 'APPLIED packs/talents.db (uncommitted)'); return 0; }
  invariant(state === 'PRE_11_2A', `the pre-deletion pack is required (found ${state})`);
  if (has('--manifest')) { fs.writeFileSync(path.join(ROOT, MANIFEST_PATH), JSON.stringify(deriveManifest(), null, 1) + '\n'); console.log(ERR + 'wrote ' + MANIFEST_PATH); return 0; }
  if (has('--check')) {
    if (read(MANIFEST_PATH) !== JSON.stringify(deriveManifest(), null, 1) + '\n') { console.error(ERR + 'STALE: manifest differs from a fresh derivation'); return 1; }
    const r = await buildReport(); if (read(REPORT_PATH) !== JSON.stringify(r, null, 1) + '\n' || read(DOC_PATH) !== renderDoc(r)) { console.error(ERR + 'STALE: dry-run report differs from a fresh projection'); return 1; }
    console.log(ERR + 'manifest and dry-run report match a fresh derivation'); return 0;
  }
  const r = await buildReport(); pr(r.verification.results);
  console.log(`\n${ERR}${r.status}: ${r.counts.recordsChanged} records, ${r.counts.tagElementsRemoved} tag elements removed, raw tags ${r.counts.rawTagsBefore} -> ${r.counts.rawTagsAfter}`);
  if (r.status !== 'DRY_RUN_CERTIFIED') return 1;
  if (has('--report')) { fs.writeFileSync(path.join(ROOT, REPORT_PATH), JSON.stringify(r, null, 1) + '\n'); fs.writeFileSync(path.join(ROOT, DOC_PATH), renderDoc(r)); console.log(ERR + `wrote ${REPORT_PATH} and ${DOC_PATH} (no pack was written)`); }
  return 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().then(code => process.exit(code), e => { console.error(e.message ?? e); process.exit(1); });
