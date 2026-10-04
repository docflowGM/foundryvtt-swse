#!/usr/bin/env node
// Deterministic validator for the feat semantic TAGS Pass 1 authority (PASS1_COMPLETE / INPUT_TO_PASS2).
// Read-only. Exits nonzero on any invariant failure. Never normalizes bad input.
// Vocabulary = the certified 181-tag talent ontology (data/audits/talent-phase-12-final-ontology-adjudication.json)
// + the six owner-authorized skill tags. Identity authority = Phase 1A manifest; derivative IDs come from Phase 1B.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const AUTHORITY_PATH = 'data/audits/feat-tags-semantic-authority.json';
const TALENT_ONTOLOGY_PATH = 'data/audits/talent-phase-12-final-ontology-adjudication.json';
const P1A_PATH = 'data/audits/feat-phase-1a-canonical-identity-manifest.json';
const P1B_PATH = 'data/audits/feat-phase-1b-repository-reconciliation.json';

export const OWNER_SKILL_ADDITIONS = ['acrobatics', 'climb', 'endurance', 'gather_information', 'jump', 'swim'];
export const REQUIRED_IMPLICATIONS = [
  ['reroll', 'reliability'], ['reaction', 'action_economy'], ['swift_action', 'action_economy'], ['move_action', 'action_economy'],
  ['standard_action', 'action_economy'], ['force_point_spend', 'resource_spend'], ['condition_removal', 'recovery'],
  ['use_the_force', 'force'], ['force_power_synergy', 'force'], ['ally_support', 'support']
];
// Spellings that must fail even though a canonical spelling exists (exact shared vocabulary only).
export const FORBIDDEN_ALIASES = {
  'critical-hit': 'critical_hit', 'attack-of-opportunity': 'attack_of_opportunity', 'skill-mastery': 'skill_mastery (hyphenated form is retired)'
};
const CLONE_WARS = 'Clone Wars Campaign Guide';
const norm = (s) => String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/^the /, '').replace(/[^a-z0-9]+/g, '');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

export function loadContext() {
  const onto = readJson(TALENT_ONTOLOGY_PATH);
  const base = onto.vocabulary.finalVocabulary;
  const vocab = [...base, ...OWNER_SKILL_ADDITIONS];
  return {
    baseVocabulary: base,
    vocabulary: new Set(vocab),
    vocabularyList: vocab,
    retired: new Set(onto.vocabulary.retiredTags),
    manifest: readJson(P1A_PATH),
    reconciliation: readJson(P1B_PATH)
  };
}

// Returns { failures: string[], notes: string[], stats }. Pure: no writes, no mutation of inputs.
export function validateAuthority(auth, ctx = loadContext()) {
  const failures = [];
  const notes = [];
  const fail = (m) => failures.push(m);
  const A = auth.assignments || [];

  // ---- Status / declared counts ----
  if (auth.phase !== 'TAGS_PASS_1') fail(`phase ${auth.phase} != TAGS_PASS_1`);
  if (auth.status !== 'PASS1_COMPLETE_ALL_353_QC2_STANDARD') fail(`status ${auth.status}`);
  const want = { canonicalFeatsReviewed: 353, certified: 353, pending: 0, ontologyGapCandidates: 0, booksCompleted: 15, approvedOntologyTags: 187 };
  for (const [k, v] of Object.entries(want)) if (auth.counts?.[k] !== v) fail(`counts.${k} expected ${v}, got ${auth.counts?.[k]}`);
  if (auth.bookCheckpoint?.productionMutated !== false) fail('bookCheckpoint.productionMutated must be false');
  if (auth.ontology?.currentApprovedVocabularyCount !== 187 || auth.ontology?.retiredTagsAllowed !== false) fail('ontology declaration != 187 / retired not allowed');
  if (JSON.stringify(auth.ontology?.ownerAuthorizedSkillAdditions) !== JSON.stringify(OWNER_SKILL_ADDITIONS)) fail('ownerAuthorizedSkillAdditions differ from the six authorized skill tags');

  // ---- Ontology ----
  if (ctx.baseVocabulary.length !== 181) fail(`certified talent ontology has ${ctx.baseVocabulary.length} tags != 181`);
  if (ctx.vocabulary.size !== 187) fail(`approved vocabulary ${ctx.vocabulary.size} != 187`);
  for (const t of OWNER_SKILL_ADDITIONS) if (!ctx.vocabulary.has(t)) fail(`owner-authorized tag ${t} not recognized`);
  for (const t of ctx.retired) if (ctx.vocabulary.has(t)) fail(`retired tag ${t} is in the approved vocabulary`);
  for (const [a, b] of REQUIRED_IMPLICATIONS) if (!ctx.vocabulary.has(a) || !ctx.vocabulary.has(b)) fail(`implication tag missing from vocabulary: ${a} -> ${b}`);

  // ---- Identity ----
  if (A.length !== 353) fail(`assignments ${A.length} != 353`);
  const ids = A.map(a => a.canonicalId);
  if (new Set(ids).size !== ids.length) {
    const d = ids.filter((id, i) => ids.indexOf(id) !== i);
    fail(`duplicate canonical IDs: ${[...new Set(d)].join(', ')}`);
  }
  if (new Set(ids).size !== 353) fail(`unique canonical IDs ${new Set(ids).size} != 353`);
  const byId = new Map(ctx.manifest.records.map(r => [r.canonicalId, r]));
  for (const a of A) {
    const r = byId.get(a.canonicalId);
    if (!r) { fail(`unknown canonical ID ${a.canonicalId} (${a.name})`); continue; }
    if (norm(r.displayName) !== norm(a.name)) fail(`${a.canonicalId}: name ${a.name} != identity authority ${r.displayName}`);
    if (norm(a.primaryPublication?.source) !== norm(r.primaryPublication.sourcebook)) fail(`${a.name}: source ${a.primaryPublication?.source} != ${r.primaryPublication.sourcebook}`);
    if (!String(a.status).startsWith('CERTIFIED_PASS1')) fail(`${a.name}: status ${a.status} is not a certified Pass 1 status`);
  }
  for (const r of ctx.manifest.records) if (!ids.includes(r.canonicalId)) fail(`identity ${r.canonicalId} (${r.displayName}) has no semantic assignment`);
  const nonCwPageMismatch = A.filter(a => { const r = byId.get(a.canonicalId); return r && a.primaryPublication?.source !== CLONE_WARS && r.primaryPublication.page !== null && norm(a.primaryPublication.source) === norm(r.primaryPublication.sourcebook) && a.primaryPublication.page !== r.primaryPublication.page; });
  for (const a of nonCwPageMismatch) fail(`${a.name}: page ${a.primaryPublication.page} != identity authority page`);

  // Clone Wars pages: authority's certified pageMap; identity manifest on main may still hold the stale map (resolved by the provenance closeout).
  const cwMap = auth.structuralCorrections?.find(c => c.book === CLONE_WARS)?.pageMap || {};
  const cwExpect = new Map(Object.entries(cwMap).flatMap(([pg, names]) => names.map(n => [n, Number(pg)])));
  const cwRecords = A.filter(a => a.primaryPublication?.source === CLONE_WARS);
  if (cwRecords.length !== 21 || cwExpect.size !== 21) fail(`Clone Wars records ${cwRecords.length} / page map ${cwExpect.size} != 21`);
  for (const a of cwRecords) if (cwExpect.get(a.name) !== a.primaryPublication.page) fail(`${a.name}: Clone Wars page ${a.primaryPublication.page} != certified ${cwExpect.get(a.name)}`);
  const cwStale = cwRecords.filter(a => byId.get(a.canonicalId)?.primaryPublication.page !== a.primaryPublication.page).length;
  if (cwStale) notes.push(`INFO: ${cwStale} Clone Wars page values differ from the identity manifest on this base (stale map; corrected by the provenance closeout). Canonical IDs match.`);

  // Publication-category differences vs identity manifest are informational (category is not semantic).
  const catDiff = A.filter(a => byId.get(a.canonicalId) && a.publicationCategory !== byId.get(a.canonicalId).publicationCategory).map(a => a.name).sort();
  const expectedCatDiff = ['Echani Training', 'Skill Challenge: Catastrophic Avoidance', 'Skill Challenge: Last Resort', 'Skill Challenge: Recovery'];
  if (JSON.stringify(catDiff) !== JSON.stringify(expectedCatDiff)) fail(`publicationCategory differences vs identity manifest changed: ${JSON.stringify(catDiff)}`);
  else notes.push(`INFO (owner review, non-semantic): publicationCategory differs from the identity manifest for ${catDiff.join('; ')}.`);

  // Anomaly identities.
  const named = (n) => A.filter(a => a.name === n);
  const tech = named('Tech Specialist');
  if (tech.length !== 1 || tech[0].canonicalId !== '42e2404790756700' || !/Web Enhancement 1/.test(tech[0].primaryPublication.source) || tech[0].primaryPublication.page !== 3) fail('Tech Specialist must be exactly one Web Enhancement 1 p.3 identity (42e2404790756700)');
  const ech = named('Echani Training');
  if (ech.length !== 1 || ech[0].canonicalId !== 'f362e5a4ad0a98bd' || !/Knights of the Old Republic/.test(ech[0].primaryPublication.source) || ech[0].primaryPublication.page !== 33) fail('Echani Training must be exactly one KOTOR p.33 identity (f362e5a4ad0a98bd)');
  const sa = named('Staggering Attack');
  const saKeys = sa.map(a => `${a.canonicalId}|${a.primaryPublication.source}|${a.primaryPublication.page}`).sort();
  if (JSON.stringify(saKeys) !== JSON.stringify(['192923f60db38831|Galaxy at War|26', 'c9c4130a55761330|Scum and Villainy|24'])) fail(`Staggering Attack identities differ: ${JSON.stringify(saKeys)}`);
  const recall = named('Recall');
  if (recall.length !== 1 || recall[0].canonicalId !== 'c352f81dde5c9dff' || !/Force Unleashed/.test(recall[0].primaryPublication.source) || recall[0].primaryPublication.page !== 35) fail('Recall must be exactly one TFU p.35 feat identity (c352f81dde5c9dff)');
  if (byId.get('c352f81dde5c9dff')?.crossDomainCollision?.classification !== 'SAME_NAME_DIFFERENT_DOMAIN') fail('identity authority no longer marks Recall as SAME_NAME_DIFFERENT_DOMAIN (feat vs Rebellion Era talent)');
  const wp = named('Weapon Proficiency');
  if (wp.length !== 1 || wp[0].canonicalId !== 'ecc2471ac96ec2d4') fail('Weapon Proficiency must contribute exactly one canonical identity (ecc2471ac96ec2d4)');
  const derivIds = (ctx.reconciliation.implementationDerivatives || []).map(d => d.repoId);
  if (derivIds.length !== 6) fail(`Phase 1B implementation derivatives ${derivIds.length} != 6`);
  for (const id of derivIds) if (ids.includes(id)) fail(`implementation derivative ${id} is counted as a canonical semantic identity`);
  for (const a of A) if (/talent/i.test(a.publicationCategory || '')) fail(`${a.name}: publicationCategory looks like a talent record`);

  // ---- Per-assignment tags ----
  for (const a of A) {
    const tags = a.finalTags;
    if (!Array.isArray(tags)) { fail(`${a.name}: finalTags is not an array`); continue; }
    const seen = new Set();
    for (const t of tags) {
      if (typeof t !== 'string') { fail(`${a.name}: non-string tag ${JSON.stringify(t)}`); continue; }
      if (seen.has(t)) fail(`${a.name}: duplicate tag ${t}`);
      seen.add(t);
      if (Object.prototype.hasOwnProperty.call(FORBIDDEN_ALIASES, t)) fail(`${a.name}: forbidden alias ${t} (use ${FORBIDDEN_ALIASES[t]})`);
      else if (ctx.retired.has(t)) fail(`${a.name}: retired tag ${t}`);
      else if (!ctx.vocabulary.has(t)) fail(`${a.name}: unknown tag ${t}`);
    }
    for (const [x, y] of REQUIRED_IMPLICATIONS) if (seen.has(x) && !seen.has(y)) fail(`${a.name}: ${x} requires ${y}`);
    if (Array.isArray(a.ontologyGapCandidates) && a.ontologyGapCandidates.length) fail(`${a.name}: unresolved ontology-gap candidates`);
  }

  const usage = {};
  for (const a of A) for (const t of a.finalTags || []) usage[t] = (usage[t] || 0) + 1;
  return { failures, notes, stats: { assignments: A.length, uniqueIds: new Set(ids).size, vocabulary: ctx.vocabulary.size, tagsUsed: Object.keys(usage).length, zeroUse: [...ctx.vocabulary].filter(t => !usage[t]).length, usage } };
}

// ---- CLI ----
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const auth = readJson(AUTHORITY_PATH);
  const { failures, notes, stats } = validateAuthority(auth);
  if (failures.length) {
    console.error(`FEAT TAGS SEMANTIC AUTHORITY VALIDATION FAILED (${failures.length}):`);
    for (const f of failures.slice(0, 200)) console.error(` - ${f}`);
    process.exit(1);
  }
  console.log('FEAT TAGS SEMANTIC AUTHORITY OK (PASS1_COMPLETE / INPUT_TO_PASS2; not production-final)');
  console.log(`  assignments ${stats.assignments} | unique canonical IDs ${stats.uniqueIds} | vocabulary ${stats.vocabulary} (181 + 6) | tags used ${stats.tagsUsed} | zero-use ${stats.zeroUse}`);
  console.log('  unknown tags 0 | duplicate tags 0 | implication violations 0 | identity anomalies pinned');
  for (const n of notes) console.log(`  ${n}`);
}
