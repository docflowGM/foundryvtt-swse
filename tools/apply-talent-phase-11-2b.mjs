#!/usr/bin/env node
/**
 * Phase 11-2B — execute the certified Phase 11-2 RECONSIDER tag actions on canonical Talents (system.tags only).
 *
 * Authority: the six owner design artifacts under data/audits/archetype-phase-11-2/ (alias-normalization-set-1, role-class-adjudication, category-decomposition,
 * structural-adjudication, conceptual-adjudication, final-reconsider-resolution). Nothing is redesigned here.
 *
 *   SAFE_NORMALIZE      rename an exact alias in place (target not duplicated); order preserved
 *   DELETE              remove the tag
 *   DELETE_DECOMPOSE    remove the tag; the decomposition list is GUIDANCE ONLY and is never applied
 *   HOLD_NOISY_MAPPING  controller / defender / leader: remove the legacy label, do NOT add control / defense / leadership
 * KEEP decisions and every BESPOKE tag are untouched. No tag is inferred from class, tree, category, archetype, source or neighbouring tags.
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
import { detect11_2aState } from './apply-talent-phase-11-2a.mjs';

const DIR = 'data/audits/archetype-phase-11-2/';
export const MANIFEST_PATH = 'data/audits/talent-phase-11-2b-cleanup-manifest.json', REPORT_PATH = 'data/audits/talent-phase-11-2b-dry-run-report.json', DOC_PATH = 'docs/audits/talent-phase-11-2b-reconsider-cleanup.md';
const ERR = '[talent-phase-11-2b] ';
const invariant = (ok, m) => { if (!ok) throw new Error(ERR + m); };
const sortedFp = arr => fingerprint(arr.slice().sort((x, y) => x._id.localeCompare(y._id)));
const withoutTags = t => { const c = structuredClone(t); delete c.system.tags; return c; };
const EXACT_PROBES = ['droidGate', 'resolved', 'classification', 'combatCandidate', 'combatFeature', 'forceTalentCount', 'lightsaberFormLookup'];
const HOLD = { controller: 'control', defender: 'defense', leader: 'leadership' };

/** The complete action table, derived from the owner artifacts. */
export function loadActions() {
  const L = n => readJson(DIR + n + '.json'), normalize = {}, remove = {}, keep = new Set(), hold = {};
  for (const d of L('alias-normalization-set-1').decisions) if (d.source !== 'force-item') normalize[d.source] = d.target; // force-item is superseded by the final resolution (delete both spellings)
  for (const d of L('role-class-adjudication').decisions) {
    if (d.decision === 'DELETE') remove[d.tag] = 'DELETE'; else if (d.decision === 'KEEP') keep.add(d.tag);
    else if (d.decision === 'NORMALIZE') { invariant(HOLD[d.tag] === d.canonical, `unexpected role normalization ${d.tag}`); remove[d.tag] = 'HOLD_NOISY_MAPPING'; hold[d.tag] = d.canonical; }
  }
  for (const d of L('category-decomposition').decisions) { invariant(d.decision === 'DELETE_DECOMPOSE', 'category decision'); remove[d.tag] = 'DELETE_DECOMPOSE'; }
  for (const f of ['structural-adjudication', 'conceptual-adjudication']) for (const d of L(f).decisions) {
    if (d.decision === 'NORMALIZE') normalize[d.tag] = d.canonical; else if (d.decision === 'KEEP') keep.add(d.tag); else remove[d.tag] = d.decision;
  }
  for (const d of L('final-reconsider-resolution').decisions) { invariant(d.decision === 'DELETE_DECOMPOSE', 'final decision'); for (const t of d.tagPair) remove[t] = 'DELETE_DECOMPOSE'; }
  for (const k of Object.keys(normalize)) invariant(!remove[k], `${k} both normalized and removed`);
  return { normalize, remove, hold, keep };
}

export function transform(tags, A) {
  const out = [];
  for (const x of tags) {
    if (A.remove[x]) continue;
    const t = A.normalize[x];
    if (t) { if (!tags.includes(t) && !out.includes(t)) out.push(t); continue; } // in place; a pre-existing or already-placed canonical tag is not duplicated
    if (!out.includes(x)) out.push(x); else out.push(x);
  }
  return out;
}
const census = talents => { const c = {}; for (const t of talents) for (const x of t.system.tags ?? []) c[x] = (c[x] ?? 0) + 1; return { unique: Object.keys(c).length, instances: Object.values(c).reduce((a, b) => a + b, 0), empty: talents.filter(t => Array.isArray(t.system.tags) && !t.system.tags.length).length, noField: talents.filter(t => t.system.tags === undefined).length, byTag: c }; };

export function deriveManifest() {
  invariant(detect11_2aState() === 'POST_11_2A', 'the Phase 11-2A post-state is the required baseline');
  const text = read(TALENTS), talents = parse(text), A = loadActions(), identityOf = loadIdentityOf(), rows = [];
  let removed = 0, normalized = 0, duplicatesAvoided = 0;
  for (const t of talents) {
    const before = Array.isArray(t.system.tags) ? t.system.tags : []; if (!before.length) continue;
    const after = [], rem = [], ren = [], dup = [];
    for (const x of before) {
      if (A.remove[x]) { rem.push({ tag: x, action: A.remove[x] }); continue; }
      const tg = A.normalize[x];
      if (tg) { if (before.includes(tg) || after.includes(tg)) { dup.push({ from: x, to: tg }); continue; } after.push(tg); ren.push({ from: x, to: tg }); continue; }
      after.push(x);
    }
    if (JSON.stringify(after) === JSON.stringify(before)) continue;
    removed += rem.length; normalized += ren.length; duplicatesAvoided += dup.length;
    rows.push({ id: t._id, canonicalIdentity: identityOf.get(t._id) ?? null, name: t.name, path: 'system.tags', before, after, removed: rem, normalized: ren, canonicalAlreadyPresent: dup });
  }
  rows.sort((a, b) => a.id.localeCompare(b.id));
  return { schemaVersion: 1, phase: '11-2B', status: 'CLEANUP_MANIFEST', authority: DIR, boundary: 'system.tags of canonical talents: certified RECONSIDER actions only',
    actions: { normalize: A.normalize, remove: A.remove, holdNoisyMapping: A.hold, keep: [...A.keep].sort() },
    counts: { normalizeRules: Object.keys(A.normalize).length, removeRules: Object.keys(A.remove).length, recordsChanged: rows.length, tagElementsRemoved: removed, tagElementsNormalized: normalized, duplicateCanonicalTagsAvoided: duplicatesAvoided },
    preState: { talents: gitBlobSha(text), homebrew: gitBlobSha(read(HOMEBREW)) }, rows };
}

export function project(manifest, talents) {
  const by = new Map(manifest.rows.map(r => [r.id, r]));
  return talents.map(t => { const r = by.get(t._id); if (!r) return t; const n = structuredClone(t); n.system.tags = [...r.after]; return n; });
}

export async function buildReport() {
  const manifest = readJson(MANIFEST_PATH), A = { normalize: manifest.actions.normalize, remove: manifest.actions.remove }, text = read(TALENTS), talents = parse(text), hbText = read(HOMEBREW);
  const pr = readJson(DIR + 'tag-pruning-pass-1.json'), bucket = Object.fromEntries(pr.tags.map(t => [t.tag, t.bucket]));
  const after = project(manifest, talents), afterText = serializePack(text, after), tb = new Map(talents.map(t => [t._id, t])), ta = new Map(after.map(t => [t._id, t])), ids = new Set(manifest.rows.map(r => r.id));
  const v = [], check = (id, ok, detail = '') => v.push({ id, ok: !!ok, detail });
  const b = census(talents), a = census(after);
  const targets = new Set(Object.values(A.normalize)), sources = Object.keys(A.normalize), removeSet = new Set(Object.keys(A.remove));

  const probe = await createProbe(); const exactFail = [], treeDelta = [], mystic = [];
  const members = new Map(parse(read(TREES)).map(t => [t._id, new Set(t.system.talentIds)])), credit = { removedPolluting: 0, removedMembershipMirroring: 0, added: 0 };
  for (const t of talents) {
    const x = probe.signature(t, t.system.tags ?? []), y = probe.signature(ta.get(t._id), ta.get(t._id).system.tags ?? []);
    for (const k of probe.diff(x, y)) { if (EXACT_PROBES.includes(k)) exactFail.push(`${t.name}: ${k}`); else if (k === 'treeIdentity') { treeDelta.push(t.name); const X = new Set(x.treeIdentity.split('|').filter(Boolean)), Y = new Set(y.treeIdentity.split('|').filter(Boolean)); for (const tok of X) if (!Y.has(tok)) ([...(probe.tokenToTrees.get(tok) ?? [])].some(id => members.get(id)?.has(t._id)) ? credit.removedMembershipMirroring++ : credit.removedPolluting++); for (const tok of Y) if (!X.has(tok)) credit.added++; } else mystic.push(t.name); }
  }
  probe.restore();

  // expected membership of every normalization target: pre-members union source-members
  const expectTarget = {}; for (const tg of targets) expectTarget[tg] = talents.filter(t => (t.system.tags ?? []).includes(tg) || sources.some(s => A.normalize[s] === tg && (t.system.tags ?? []).includes(s))).length;
  const keepConcepts = manifest.actions.keep;
  const survivingRecon = Object.keys(b.byTag).filter(k => bucket[k] === 'RECONSIDER' && !A.remove[k] && !A.normalize[k] && !manifest.actions.keep.includes(k));
  check('every authorized SAFE_NORMALIZE source string is gone from canonical talent tags', sources.every(s => !a.byTag[s]));
  check('normalization targets hold exactly pre-members ∪ source-members (records already carrying both variants counted once)', [...targets].every(tg => (a.byTag[tg] ?? 0) === expectTarget[tg]));
  check('every DELETE / DELETE_DECOMPOSE / HOLD_NOISY_MAPPING string is gone', [...removeSet].every(k => !a.byTag[k]));
  check('HOLD_NOISY_MAPPING: controller / defender / leader removed and control / defense / leadership NOT bulk-added', ['control', 'defense', 'leadership'].every(tg => (a.byTag[tg] ?? 0) === (b.byTag[tg] ?? 0)));
  check('every KEEP concept retains all pre-pass memberships (only exact alias targets may grow)', keepConcepts.filter(k => !targets.has(k)).every(k => (a.byTag[k] ?? 0) === (b.byTag[k] ?? 0)) && Object.keys(b.byTag).filter(k => bucket[k] === 'KEEP' && !targets.has(k) && !removeSet.has(k) && !A.normalize[k]).every(k => a.byTag[k] === b.byTag[k]));
  const finalPair = new Set(readJson(DIR + 'final-reconsider-resolution.json').decisions.flatMap(d => d.tagPair)); // force_item is a singleton the owner explicitly named for removal
  check('no BESPOKE tag was adjudicated: the only BESPOKE memberships that change are a certified alias target (critical_success) and the explicitly named force_item', Object.keys(b.byTag).filter(k => bucket[k] === 'BESPOKE').every(k => a.byTag[k] === b.byTag[k] || targets.has(k) || finalPair.has(k)), Object.keys(b.byTag).filter(k => bucket[k] === 'BESPOKE' && a.byTag[k] !== b.byTag[k] && !targets.has(k) && !finalPair.has(k)).join(', '));
  check('no new semantic tag was invented: every tag that appears is a certified normalization target', Object.keys(a.byTag).filter(k => !b.byTag[k]).every(k => targets.has(k)));
  check('no decomposition guidance was bulk-applied (no replacement concept gained a member except by exact alias normalization)', Object.keys(a.byTag).filter(k => (a.byTag[k] ?? 0) > (b.byTag[k] ?? 0)).every(k => targets.has(k)));
  check('no RECONSIDER tag is left without a certified decision', survivingRecon.length === 0, survivingRecon.join(', '));
  check('50 homebrew talents are byte-for-byte unchanged', parse(hbText).length === 50 && gitBlobSha(hbText) === manifest.preState.homebrew && !parse(hbText).some(h => ids.has(h._id)));
  check('only system.tags changed on canonical records (identity, uuids, source/page, tree, text, prerequisites, flags, abilityMeta/rules, effects untouched)', talents.every(t => JSON.stringify(withoutTags(t)) === JSON.stringify(withoutTags(ta.get(t._id)))) && talents.every(t => ids.has(t._id) || JSON.stringify(t) === JSON.stringify(ta.get(t._id))));
  check('surviving tag order is deterministic (original order; renames in place; no duplicates)', after.every(t => { const g = t.system.tags ?? []; return new Set(g).size === g.length && JSON.stringify(g) === JSON.stringify(transform(tb.get(t._id).system.tags ?? [], A)); }));
  check('1,187 canonical talents, ids and names unchanged; emptied sets stay arrays', after.length === 1187 && after.every((t, i) => t._id === talents[i]._id && t.name === talents[i].name) && after.every(t => t.system.tags === undefined || Array.isArray(t.system.tags)));
  const rec = reconcile({ ...loadInput(), production: after });
  check('Phase 3E corpus/text, 3F tree identity and 3G prerequisite gates stay clean (reconciler: 0 blocking findings)', rec.blockingFindings.length === 0, JSON.stringify(rec.findingCounts));
  check('Phase 3G invariant: every structured talent leaf is still a canonical uuid', after.every(t => (t.system.prerequisitesStructured?.conditions ?? []).filter(c => c.type === 'talent').every(c => /^Compendium\.foundryvtt-swse\.talents\.Item\.[0-9a-f]+$/.test(c.uuid ?? ''))));
  check('executable-equivalence probes (droid gate, choice/execution resolver, item classification, combat-feature classifier, Force-talent counting, lightsaber-form lookup) identical for all 1,187 talents', exactFail.length === 0, exactFail.slice(0, 5).join('; '));
  check('second dry-run is a zero diff', JSON.stringify(project(manifest, after)) === JSON.stringify(after) && after.every(t => JSON.stringify(transform(t.system.tags ?? [], A)) === JSON.stringify(t.system.tags ?? [])));
  check(`serialization is surgical: only ${ids.size} lines of packs/talents.db change`, (() => { const x = text.split('\n'), y = afterText.split('\n'); return x.length === y.length && x.filter((l, i) => l !== y[i]).length === ids.size; })());
  check('manifest counts equal the projection', manifest.counts.recordsChanged === ids.size && b.instances - a.instances === manifest.counts.tagElementsRemoved + manifest.counts.duplicateCanonicalTagsAvoided);

  const treeSet = new Set(treeDelta), mysticSet = new Set(mystic);
  return {
    schemaVersion: 1, phase: '11-2B', dryRun: true, status: v.every(x => x.ok) ? 'DRY_RUN_CERTIFIED' : 'DRY_RUN_FAILED',
    counts: { ...manifest.counts, rawTagsBefore: b.unique, rawTagsAfter: a.unique, tagInstancesBefore: b.instances, tagInstancesAfter: a.instances, emptyTagArraysBefore: b.empty, emptyTagArraysAfter: a.empty, noTagsField: a.noField,
      newRawStringsFromNormalization: Object.keys(a.byTag).filter(k => !b.byTag[k]).sort(), bespokeTargetsThatGrew: [...targets].filter(k => bucket[k] === 'BESPOKE').map(k => ({ tag: k, before: b.byTag[k] ?? 0, after: a.byTag[k] ?? 0 })), bespokeRemovedByExplicitOwnerResolution: [...finalPair].filter(k => bucket[k] === 'BESPOKE').map(k => ({ tag: k, before: b.byTag[k] ?? 0, after: a.byTag[k] ?? 0 })) },
    runtimeConsumers: { exactProbesIdentical: exactFail.length === 0, talentsWhosePrerequisiteTreeCreditChanges: treeSet.size, treeCreditsRemovedPolluting: credit.removedPolluting, treeCreditsRemovedMirroringRealMembership: credit.removedMembershipMirroring, treeCreditsAdded: credit.added, talentsWhoseMysticMasteryEstimateChanges: mysticSet.size,
      note: 'tree-credit / Mystic Mastery changes are the known tag-as-tree-identity and tag-regex readers (see Phase 3H audit): removing role/class/tree-label tags removes polluting credits. Not restored.' },
    postCensus: { uniqueRawTags: a.unique, tagInstances: a.instances, emptyTagArrays: a.empty, noTagsField: a.noField, byTag: Object.fromEntries(Object.entries(a.byTag).sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))) },
    preState: manifest.preState, postState: { talents: gitBlobSha(afterText) }, othersFingerprint: sortedFp(after.filter(t => !ids.has(t._id))), records: [...ids], verification: { results: v }
  };
}

const renderDoc = r => { const c = r.counts, x = r.runtimeConsumers; return ['# Phase 11-2B — certified RECONSIDER tag actions (Talents)', '',
  `Status: **${r.status}**. **${c.recordsChanged} records** change (\`system.tags\` only): **${c.tagElementsRemoved}** tag elements removed, **${c.tagElementsNormalized}** renamed (exact aliases), ${c.duplicateCanonicalTagsAvoided} duplicate canonical tags avoided. Raw tag strings **${c.rawTagsBefore} → ${c.rawTagsAfter}**; instances ${c.tagInstancesBefore} → ${c.tagInstancesAfter}; talents with an empty tag array ${c.emptyTagArraysBefore} → ${c.emptyTagArraysAfter}.`, '',
  `Rules executed (${c.normalizeRules} exact normalizations, ${c.removeRules} removals incl. DELETE_DECOMPOSE and the three HOLD_NOISY_MAPPING role labels). Decomposition lists are guidance only and were not applied; \`control\` / \`defense\` / \`leadership\` were not bulk-added.`, '',
  `New raw strings created only by certified normalization: ${c.newRawStringsFromNormalization.join(', ') || 'none'}. BESPOKE tags touched: alias target grew — ${c.bespokeTargetsThatGrew.map(b => `${b.tag} ${b.before}→${b.after}`).join(', ') || 'none'}; removed by the explicit owner resolution — ${c.bespokeRemovedByExplicitOwnerResolution.map(b => `${b.tag} ${b.before}→${b.after}`).join(', ') || 'none'}.`, '',
  '## Verification', '', ...r.verification.results.map(y => `- ${y.ok ? 'PASS' : 'FAIL'} ${y.id}${y.detail ? ' — ' + y.detail : ''}`), '',
  '## Runtime consumers', '', `Exact probes identical: **${x.exactProbesIdentical}**. Talents whose prerequisite tree credit changes: ${x.talentsWhosePrerequisiteTreeCreditChanges} (${x.treeCreditsRemovedPolluting} polluting credits removed, ${x.treeCreditsRemovedMirroringRealMembership} credits that mirrored real tree membership removed, ${x.treeCreditsAdded} added); Mystic Mastery estimate: ${x.talentsWhoseMysticMasteryEstimateChanges}. ${x.note}`, ''].join('\n'); };

export function detect11_2bState() {
  if (!fs.existsSync(path.join(ROOT, REPORT_PATH))) return 'PRE_11_2B';
  const r = readJson(REPORT_PATH), sha = gitBlobSha(read(TALENTS));
  if (r.postState.talents === sha) return 'POST_11_2B';
  if (r.preState.talents === sha) return 'PRE_11_2B';
  // Phase 11-2C (later) finished the Bespoke cleanup; Phase 12-1 (later still) added the certified orphan tags
  return ['talent-phase-11-2c-dry-run-report.json', 'talent-phase-12-1-dry-run-report.json'].some(f => fs.existsSync(path.join(ROOT, 'data/audits', f)) && readJson('data/audits/' + f).postState.talents === sha) ? 'POST_LATER' : 'UNKNOWN';
}

export async function verifyApplied({ exact = false } = {}) {
  const res = [], check = (id, ok, detail = '') => res.push({ id, ok: !!ok, detail });
  const report = readJson(REPORT_PATH), manifest = readJson(MANIFEST_PATH), text = read(TALENTS), talents = parse(text), by = new Map(talents.map(t => [t._id, t])), ids = new Set(manifest.rows.map(r => r.id));
  const c = census(talents), A = manifest.actions;
  const later = detect11_2bState() === 'POST_LATER'; // 11-2C removed/renamed further tags: manifest tag sets, census and fingerprint are superseded
  check('packs/talents.db is the certified Phase 11-2B post-state (or a later certified state)', ['POST_11_2B', 'POST_LATER'].includes(detect11_2bState()));
  check('talent count unchanged (1,187)', talents.length === 1187);
  check('no normalized source, removed tag or HOLD_NOISY_MAPPING label remains on any canonical talent', [...Object.keys(A.normalize), ...Object.keys(A.remove)].every(k => !c.byTag[k]));
  if (!later) check('every manifest record carries exactly its certified tags', manifest.rows.every(r => JSON.stringify(by.get(r.id)?.system.tags) === JSON.stringify(r.after)));
  if (!later) check('post census equals the certified census', Object.keys(c.byTag).length === Object.keys(report.postCensus.byTag).length && Object.entries(c.byTag).every(([k, n]) => report.postCensus.byTag[k] === n));
  if (!later) check('other talents unchanged', sortedFp(talents.filter(t => !ids.has(t._id))) === report.othersFingerprint);
  check('homebrew pack unchanged', gitBlobSha(read(HOMEBREW)) === report.preState.homebrew);
  const rec = reconcile(loadInput()); check('reconciler: zero blocking findings', rec.blockingFindings.length === 0, JSON.stringify(rec.findingCounts));
  if (exact && !later) check('packs/talents.db equals the certified blob', gitBlobSha(text) === report.postState.talents);
  return res;
}

export function applyProduction() {
  invariant(detect11_2bState() === 'PRE_11_2B', 'REFUSED: packs are not the pre-cleanup state (already applied or drifted)');
  const committed = readJson(REPORT_PATH); invariant(committed.status === 'DRY_RUN_CERTIFIED', 'REFUSED: dry-run report is not certified');
  const texts = read(TALENTS), out = serializePack(texts, project(readJson(MANIFEST_PATH), parse(texts)));
  invariant(gitBlobSha(out) === committed.postState.talents, 'REFUSED: rendered output does not match the certified post-state blob');
  fs.writeFileSync(path.join(ROOT, TALENTS), out);
}

export async function main(argv = process.argv.slice(2)) {
  const has = f => argv.includes(f), state = detect11_2bState();
  const pr = res => { for (const x of res) console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.id}${x.ok || !x.detail ? '' : '  [' + x.detail + ']'}`); return res.filter(x => !x.ok).length; };
  if (has('--status')) { console.log(ERR + state); return 0; }
  if (has('--verify') || (has('--check') && (state === 'POST_11_2B' || state === 'POST_LATER'))) { const bad = pr(await verifyApplied({ exact: has('--exact') })); console.log(`\n${ERR}verify ${bad ? 'FAIL' : 'PASS'}`); return bad ? 1 : 0; }
  if (has('--apply')) { const fresh = await buildReport(); invariant(read(REPORT_PATH) === JSON.stringify(fresh, null, 1) + '\n', 'REFUSED: committed dry-run report differs from a fresh projection'); applyProduction(); console.log(ERR + 'APPLIED packs/talents.db (uncommitted)'); return 0; }
  invariant(state === 'PRE_11_2B', `the pre-cleanup pack is required (found ${state})`);
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
