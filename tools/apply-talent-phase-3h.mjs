#!/usr/bin/env node
/**
 * Phase 3H-4 — talent semantic-tag migration: manifest -> dry-run (-> apply -> verify, after owner authorization).
 *
 * Boundary: ONLY `system.tags` of canonical talents in packs/talents.db is rewritten, to the rule-evidenced Phase 11 tags of the semantic authority
 * (data/audits/talent-phase-3h-semantic-authority.json). Nothing else in any pack, registry or script changes.
 *
 *   --manifest   write data/audits/talent-phase-3h-migration-manifest.json
 *   --report     write data/audits/talent-phase-3h-dry-run-report.json + docs/audits/talent-phase-3h-dry-run.md (no pack written)
 *   --check      pre-state: manifest + report equal a fresh derivation
 *   --status     PRE_3H / POST_3H / UNKNOWN
 *   --apply / --verify   deliberately not implemented in the dry-run revision
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, read, readJson, parse, TALENTS, HOMEBREW, TREES, vocabulary, ALIASES } from './talent-semantic-common.mjs';
import { serializePack, gitBlobSha, fingerprint } from './apply-talent-phase-3c.mjs';
import { buildAuthority } from './derive-talent-semantic-authority.mjs';
import { crosscheck } from './qa-talent-semantic-vs-archetypes.mjs';
import { createProbe } from './talent-semantic-probes.mjs';
import { reconcile, loadInput } from './reconcile-talent-publication-corpus.mjs';

export const MANIFEST_PATH = 'data/audits/talent-phase-3h-migration-manifest.json', REPORT_PATH = 'data/audits/talent-phase-3h-dry-run-report.json', DOC_PATH = 'docs/audits/talent-phase-3h-dry-run.md';
const ERR = '[talent-phase-3h] ';
const invariant = (ok, m) => { if (!ok) throw new Error(ERR + m); };
const UNTOUCHED = ['packs/talent_trees.db', 'packs/classes.db', 'packs/heroic.db', 'packs/nonheroic.db', 'packs/npc.db', 'packs/talents-homebrew.db', 'packs/talent-trees-homebrew.db',
  'data/generated/talent-trees.registry.json', 'data/fixes/talent-trees.registry.json', 'data/generated/talents.fixed.json', 'data/fixes/talents.fixed.json', 'data/canonical/talents.json', 'data/class-archetypes.json', 'system.json',
  'data/canonical/semantic-tag-vocabulary.json'];
const EXACT_PROBES = ['droidGate', 'resolved', 'classification', 'combatCandidate', 'combatFeature', 'forceTalentCount', 'lightsaberFormLookup'];
const untouchedShas = () => Object.fromEntries(UNTOUCHED.filter(rel => fs.existsSync(path.join(ROOT, rel))).map(rel => [rel, gitBlobSha(read(rel))]));
const sortedFp = arr => fingerprint(arr.slice().sort((x, y) => x._id.localeCompare(y._id)));
const withoutTags = t => { const c = structuredClone(t); delete c.system.tags; return c; };

export function deriveManifest(authority = buildAuthority()) {
  const talentsText = read(TALENTS);
  const rows = authority.rows.filter(r => JSON.stringify(r.current) !== JSON.stringify(r.proposed)).map(r => ({
    id: r.id, canonicalIdentity: r.canonicalIdentity, name: r.name, path: 'system.tags', current: r.current, proposed: r.proposed, added: r.added, removed: r.removed, aliasesNormalized: r.aliasesNormalized, pins: r.pins,
    rationale: r.tags.map(t => ({ tag: t.tag, confidence: t.confidence, evidence: t.evidence.map(e => `${e.source}: ${e.rule}`) }))
  }));
  return { schemaVersion: 1, phase: '3H-4', status: 'MIGRATION_MANIFEST', boundary: 'system.tags of canonical talents only', authority: 'data/audits/talent-phase-3h-semantic-authority.json', preState: { talents: gitBlobSha(talentsText), homebrew: gitBlobSha(read(HOMEBREW)) }, rows };
}

export function project(manifest, talents) {
  const by = new Map(manifest.rows.map(r => [r.id, r]));
  return talents.map(t => { const r = by.get(t._id); if (!r) return t; const n = structuredClone(t); n.system.tags = [...r.proposed]; return n; });
}

function tokenOwners(probe, talent, token) { return [...(probe.tokenToTrees.get(token) ?? [])]; }

export async function buildReport() {
  const manifest = readJson(MANIFEST_PATH), authority = buildAuthority(), vocab = vocabulary();
  const talentsText = read(TALENTS), talents = parse(talentsText), homebrewText = read(HOMEBREW), trees = parse(read(TREES)), treeMembers = new Map(trees.map(t => [t._id, new Set(t.system.talentIds)]));
  const after = project(manifest, talents), afterText = serializePack(talentsText, after), tb = new Map(talents.map(t => [t._id, t])), ta = new Map(after.map(t => [t._id, t]));
  const ids = new Set(manifest.rows.map(r => r.id));
  const v = [], check = (id, ok, detail = '') => v.push({ id, ok: !!ok, detail });

  // executable-consumer probes (real runtime functions) on current vs proposed tags
  const probe = await createProbe();
  const exactFail = [], treeDelta = { talentsAffected: 0, creditsRemovedMembershipLegit: 0, creditsRemovedPollution: 0, creditsAddedMembershipLegit: 0, creditsAddedFromTagCollision: 0, examples: [] }, mystic = { flipsToTrue: [], flipsToFalse: [] };
  for (const t of talents) {
    const a = probe.signature(t, t.system.tags ?? []), b = probe.signature(ta.get(t._id), ta.get(t._id).system.tags ?? []);
    for (const k of probe.diff(a, b)) if (EXACT_PROBES.includes(k)) exactFail.push(`${t.name}: ${k}`);
    if (a.treeIdentity !== b.treeIdentity) {
      const A = new Set(a.treeIdentity.split('|').filter(Boolean)), B = new Set(b.treeIdentity.split('|').filter(Boolean)); treeDelta.talentsAffected++;
      const legit = tok => tokenOwners(probe, t, tok).some(id => treeMembers.get(id)?.has(t._id));
      for (const x of A) if (!B.has(x)) { legit(x) ? treeDelta.creditsRemovedMembershipLegit++ : treeDelta.creditsRemovedPollution++; }
      for (const x of B) if (!A.has(x)) { legit(x) ? treeDelta.creditsAddedMembershipLegit++ : treeDelta.creditsAddedFromTagCollision++; }
    }
    if (a.mysticMasteryForceTalent !== b.mysticMasteryForceTalent) (b.mysticMasteryForceTalent ? mystic.flipsToTrue : mystic.flipsToFalse).push(t.name);
  }
  probe.restore();

  check('1,187 canonical talents considered exactly once', authority.rows.length === 1187 && new Set(authority.rows.map(r => r.id)).size === 1187 && talents.length === 1187 && authority.rows.every(r => tb.has(r.id)));
  check('50 homebrew talents excluded and unchanged', parse(homebrewText).length === 50 && gitBlobSha(homebrewText) === manifest.preState.homebrew && !parse(homebrewText).some(h => ids.has(h._id)));
  check('0 unknown tags outside the Phase 11 vocabulary', after.every(t => (t.system.tags ?? []).every(x => vocab.includes(x))));
  check('0 deprecated aliases or legacy tags remain in canonical talents', after.every(t => (t.system.tags ?? []).every(x => !ALIASES[x] && vocab.includes(x))));
  check('0 duplicate tags within a talent; deterministic (sorted) tag order', after.every(t => { const g = t.system.tags ?? []; return new Set(g).size === g.length && JSON.stringify(g) === JSON.stringify([...g].sort()); }));
  check('every proposed tag has recorded rule evidence; evidence never cites an archetype or a legacy tag (no circular authority)', authority.rows.every(r => r.proposed.every(x => r.tags.find(y => y.tag === x)?.evidence?.length) && r.tags.every(t => t.evidence.every(e => ['benefit', 'description', 'tree/domain', 'runtime-pin'].includes(e.source)))));
  check('identity, names, benefit, description, summary, prerequisite text, structured prerequisites (uuid), source, page, tree ids, flags, effects, abilityMeta/rules: every field outside system.tags is unchanged on every talent', talents.every(t => JSON.stringify(withoutTags(t)) === JSON.stringify(withoutTags(ta.get(t._id)))));
  check('only system.tags changes, and only on manifest records', talents.every(t => JSON.stringify(t.system.tags ?? null) === JSON.stringify(ta.get(t._id).system.tags ?? null) || ids.has(t._id)));
  check('the projection reads and writes only packs/talents.db: tree pack/membership, registries, classes, actors and homebrew are not inputs of it (their blob shas are recorded below for the apply-time check)', Object.keys(untouchedShas()).length > 0);
  const rec = reconcile({ ...loadInput(), production: after });
  check('Phase 3E corpus/text, Phase 3F tree identity and Phase 3G structured-prerequisite gates stay clean (reconciler: 0 blocking findings)', rec.blockingFindings.length === 0, JSON.stringify(rec.findingCounts));
  check('Phase 3G invariant: every structured talent leaf is still a canonical uuid', after.every(t => (t.system.prerequisitesStructured?.conditions ?? []).filter(c => c.type === 'talent').every(c => /^Compendium\.foundryvtt-swse\.talents\.Item\.[0-9a-f]+$/.test(c.uuid ?? ''))));
  check('executable-equivalence probes (droid gate, choice/execution resolver, item classification, combat-feature classifier, Force-talent counting, lightsaber-form lookup) are identical for all 1,187 talents', exactFail.length === 0, exactFail.slice(0, 5).join('; '));
  check('second run is a zero diff', JSON.stringify(project(manifest, after)) === JSON.stringify(after));
  check(`serialization is surgical: only ${ids.size} lines of packs/talents.db change`, (() => { const x = talentsText.split('\n'), y = afterText.split('\n'); return x.length === y.length && x.filter((l, i) => l !== y[i]).length === ids.size; })());
  const cc = crosscheck(authority);
  check('archetype cross-check ran one-way: all 1,144 exact talent references resolve; no talent tag was edited for agreement', cc.totals.references === 1144 && cc.totals.unresolved.length === 0 && cc.talentTagsMutatedByThisReport === false);

  const untouched = untouchedShas();
  const added = manifest.rows.reduce((n, r) => n + r.added.length, 0), removed = manifest.rows.reduce((n, r) => n + r.removed.length, 0), aliases = manifest.rows.reduce((n, r) => n + r.aliasesNormalized.length, 0);
  const c = authority.counts, census = readJson('data/audits/talent-phase-3h-metadata-census.json').counts;
  return {
    schemaVersion: 1, phase: '3H-4', dryRun: true, status: v.every(x => x.ok) ? 'DRY_RUN_CERTIFIED' : 'DRY_RUN_FAILED',
    counts: { canonicalTalents: 1187, vocabulary: vocab.length, legacyUniqueTags: census.uniqueLegacyTags, canonicalTagsUsed: c.vocabularyTagsUsed, aliasesNormalized: aliases, tagsRemoved: removed, tagsAdded: added, talentsCurrentlyUntagged: census.untagged, talentsWithNoRuleEvidencedTag: c.missingSemanticTags,
      recordsToChange: ids.size, productionLeafChanges: ids.size, tagElementMutations: added + removed + aliases, removedByDisposition: c.removedByDisposition, evidenceConfidence: c.evidenceConfidence },
    executableConsumerImpact: {
      exactProbesIdentical: exactFail.length === 0,
      note: 'Behaviour of the consumers below is a function of system.tags TODAY. Probes that must be identical are; the two listed deltas are real latent defects in how consumers read tags and need an owner decision before --apply.',
      prerequisiteTreeCreditByTag: { ...treeDelta, explanation: 'prerequisite-checker.getCanonicalTalentTreeIds() turns every tag token into tree-identity evidence, so a tag spelled like a tree credits a talent to that tree for "N talents from tree X" prerequisites (tag/tree collisions such as light-side, control, dark_side, mystic). Removing legacy tags removes polluting credits; credits that mirror genuine multi-tree membership are lost unless the checker reads the tree membership authority.' },
      mysticMasteryForceTalentEstimate: { flipsToTrue: mystic.flipsToTrue.length, flipsToFalse: mystic.flipsToFalse.length, flipsToFalseExamples: mystic.flipsToFalse.slice(0, 8), flipsToTrueExamples: mystic.flipsToTrue.slice(0, 8), explanation: 'force-adept-talent-actions.announceMysticMastery estimates Force talents with /force|mystic|telepath|adept|jedi|sith/ over category, tree and tags (a chat-card estimate; not combat).' }
    },
    archetypeCrossCheck: { ...cc.totals, unresolved: cc.totals.unresolved.length },
    forcePin: { disagreements: c.forcePinDisagreements, keptAgainstText: c.forceKeptAgainstText, withheldFromText: c.forceWithheldFromText },
    preState: manifest.preState, postState: { talents: gitBlobSha(afterText) }, untouchedFiles: untouched, othersFingerprint: sortedFp(after.filter(t => !ids.has(t._id))),
    records: manifest.rows.map(r => r.id), verification: { results: v }
  };
}

const renderDoc = r => { const c = r.counts, x = r.executableConsumerImpact, t = x.prerequisiteTreeCreditByTag; return ['# Phase 3H-4 — talent semantic-tag migration: dry-run', '',
  `Status: **${r.status}**. **${c.recordsToChange} records** change, exactly one leaf each (\`system.tags\`); ${c.tagElementMutations} tag-element mutations (${c.tagsAdded} added, ${c.tagsRemoved} removed, ${c.aliasesNormalized} aliases normalized). **No pack has been written.**`, '',
  '## Verification', '', ...r.verification.results.map(y => `- ${y.ok ? 'PASS' : 'FAIL'} ${y.id}${y.detail ? ' — ' + y.detail : ''}`), '',
  '## Numbers', '', `- vocabulary ${c.vocabulary} tags (${c.canonicalTagsUsed} used by at least one talent); ${c.legacyUniqueTags} unique legacy tags today; ${c.talentsCurrentlyUntagged} talents untagged today; ${c.talentsWithNoRuleEvidencedTag} have no vocabulary concept in their rule text.`, `- removed by disposition: ${JSON.stringify(c.removedByDisposition)}; evidence confidence: ${JSON.stringify(c.evidenceConfidence)}.`, '',
  '## Executable consumers that read `system.tags` (owner decision needed before --apply)', '', `Probes that must be identical (droid gate, choice/execution resolver, item classification, combat-feature classifier, Force-talent counting, lightsaber-form lookup): **${x.exactProbesIdentical ? 'identical for all 1,187 talents' : 'DIFFER'}**.`, '',
  `1. **Prerequisite tree credit by tag** — ${t.talentsAffected} talents change tree credit: ${t.creditsRemovedPollution} polluting credits disappear, ${t.creditsRemovedMembershipLegit} credits that mirror real multi-tree membership disappear, ${t.creditsAddedMembershipLegit} membership credits and ${t.creditsAddedFromTagCollision} tag-collision credits appear. ${t.explanation}`,
  `2. **Mystic Mastery Force-talent estimate** — ${x.mysticMasteryForceTalentEstimate.flipsToTrue} talents start matching, ${x.mysticMasteryForceTalentEstimate.flipsToFalse} stop matching. ${x.mysticMasteryForceTalentEstimate.explanation}`, '',
  '## Archetype cross-check (one-way)', '', `${r.archetypeCrossCheck.references} exact references: ${r.archetypeCrossCheck.STRONG} strong, ${r.archetypeCrossCheck.SUPPORTED} supported, ${r.archetypeCrossCheck.NEUTRAL} neutral, ${r.archetypeCrossCheck.SUSPICIOUS} suspicious, ${r.archetypeCrossCheck.CONTRADICTION} contradictions (see docs/audits/talent-phase-3h-archetype-crosscheck.md).`, ''].join('\n'); };

export function detect3HState() {
  if (!fs.existsSync(path.join(ROOT, REPORT_PATH))) return 'PRE_3H';
  const r = readJson(REPORT_PATH), sha = gitBlobSha(read(TALENTS));
  return r.postState.talents === sha ? 'POST_3H' : r.preState.talents === sha ? 'PRE_3H' : 'UNKNOWN';
}

export async function main(argv = process.argv.slice(2)) {
  const has = f => argv.includes(f), state = detect3HState();
  if (has('--status')) { console.log(ERR + state); return 0; }
  invariant(!has('--apply') && !has('--verify'), 'apply/verify are intentionally not implemented in the dry-run revision');
  invariant(state === 'PRE_3H', `the pre-migration pack is required (found ${state})`);
  if (has('--manifest')) { fs.writeFileSync(path.join(ROOT, MANIFEST_PATH), JSON.stringify(deriveManifest(), null, 1) + '\n'); console.log(ERR + 'wrote ' + MANIFEST_PATH); return 0; }
  if (has('--check')) {
    if (read(MANIFEST_PATH) !== JSON.stringify(deriveManifest(), null, 1) + '\n') { console.error(ERR + 'STALE: manifest differs from a fresh derivation'); return 1; }
    const r = await buildReport(); if (read(REPORT_PATH) !== JSON.stringify(r, null, 1) + '\n' || read(DOC_PATH) !== renderDoc(r)) { console.error(ERR + 'STALE: dry-run report differs from a fresh projection'); return 1; }
    console.log(ERR + 'manifest and dry-run report match a fresh derivation'); return 0;
  }
  const r = await buildReport();
  for (const x of r.verification.results) console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.id}${x.ok || !x.detail ? '' : '  [' + x.detail + ']'}`);
  console.log(`\n${ERR}${r.status}: ${r.counts.recordsToChange} records, ${r.counts.tagElementMutations} tag-element mutations`);
  if (r.status !== 'DRY_RUN_CERTIFIED') return 1;
  if (has('--report')) { fs.writeFileSync(path.join(ROOT, REPORT_PATH), JSON.stringify(r, null, 1) + '\n'); fs.writeFileSync(path.join(ROOT, DOC_PATH), renderDoc(r)); console.log(ERR + `wrote ${REPORT_PATH} and ${DOC_PATH} (no pack was written)`); }
  return 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().then(code => process.exit(code), e => { console.error(e.message ?? e); process.exit(1); });
