#!/usr/bin/env node
// Deterministic Pass 2 SUPPORT input: candidate feat families/chains and corpus statistics from the Pass 1 authority.
// Evidence only. It never adjudicates, corrects, or writes tags. Family membership is not semantic proof; flagged
// differences are PASS2_OWNER_REVIEW items, not errors. Pass 1 is PASS1_COMPLETE / INPUT_TO_PASS2.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AUTHORITY_PATH, PASS2_AUTHORITY_PATH, ROOT, loadContext, validateAuthority } from './validate-feat-tags-semantic-authority.mjs';

const PASS2 = process.argv.includes('--pass2');
export const OUT_JSON = PASS2 ? 'data/audits/feat-tags-pass2-family-analysis-post-adjudication.json' : 'data/audits/feat-tags-pass2-family-analysis.json';
export const OUT_MD = PASS2 ? 'docs/audits/feat-tags-pass2-family-analysis-post-adjudication.md' : 'docs/audits/feat-tags-pass2-family-analysis.md';
const OVERLAY_PATH = 'data/audits/feat-tags-pass2-owner-adjudication.json';
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// Owner-named chains from the Pass 2 command. Names only; unresolved names are reported, never invented.
export const OWNER_NAMED_CHAINS = [
  ['Double Attack -> Triple Attack', ['Double Attack', 'Triple Attack']],
  ['Cleave -> Great Cleave', ['Cleave', 'Great Cleave']],
  ['Grapple family (Pin / Crush / Throw / Trip)', ['Pin', 'Crush', 'Throw', 'Trip']],
  ['Ranged precision family', ['Point-Blank Shot', 'Precise Shot', 'Sniper', 'Careful Shot', 'Deadeye', 'Far Shot']],
  ['Power Attack / Powerful Charge / Bantha Rush', ['Power Attack', 'Powerful Charge', 'Bantha Rush']],
  ['Rapid Shot / Improved Rapid Shot', ['Rapid Shot', 'Improved Rapid Shot']],
  ['Rapid Strike / Improved Rapid Strike', ['Rapid Strike', 'Improved Rapid Strike']],
  ['Tech Specialist family', ['Tech Specialist', 'Superior Tech', 'Signature Device', 'Hasty Modification']]
];
// Name-pattern families (explicit regexes; membership is a candidate grouping only).
export const NAME_PATTERN_FAMILIES = [
  ['Second Wind feats', /second wind/i],
  ['Military Training feats', /military training|republic training/i],
  ['Mounted / riding feats', /\bmounted\b|\bride\b|riding|trample|spirited charge/i]
];
// Text-keyed families: members chosen by rules-text evidence; expected tag candidates are advisory.
export const TEXT_KEYED_FAMILIES = [
  ['Reroll text', /\breroll/i, ['reroll', 'reliability']],
  ['Attack of opportunity text', /attacks? of opportunity/i, ['attack_of_opportunity']],
  ['Force Point text', /force points?\b/i, ['force_point_spend', 'force-point', 'resource_recovery']],
  ['Skill substitution text', /\binstead of\b[^.]*\b(?:skill|check|modifier)\b|\bsubstitut/i, ['skill_substitution']]
];
const CATEGORY_FAMILIES = ['MARTIAL_ARTS_FEAT', 'TEAM_FEAT', 'RIDING_FEAT', 'SPECIES_FEAT', 'SKILL_CHALLENGE_FEAT'];
const HUB_CHILD_THRESHOLD = 12;

function loadEvidence(auth) {
  const src = ['data/audits/feat-provenance-canonical-authority.json', 'data/audits/feat-content-canonical-authority.json'].find(exists);
  const prereq = new Map(), rules = new Map();
  if (src) {
    const j = readJson(src);
    for (const f of [...Object.values(j.books).flatMap(b => b.feats), ...(j.officialWebSources?.feats || [])]) {
      if (!f.canonicalId || /^FULL_REPRINT/.test(f.identityRole)) continue;
      prereq.set(f.canonicalId, f.content?.canonicalPrerequisites ?? null);
      rules.set(f.canonicalId, [...(f.content?.canonicalRulesShape || []), ...(f.content?.starshipsReprintRulesShape || []), f.content?.quickSummary || ''].join(' '));
    }
  }
  for (const a of auth.assignments) { const t = rules.get(a.canonicalId); rules.set(a.canonicalId, [t || '', a.canonicalMechanicSummary || ''].join(' ').trim()); }
  return { source: src || null, prereq, rules };
}

function analyze(auth, ctx, talentTagCounts, recon, overlay = null) {
  const A = [...auth.assignments].sort((a, b) => cmp(a.canonicalId, b.canonicalId));
  const byId = new Map(A.map(a => [a.canonicalId, a]));
  const manifest = new Map(ctx.manifest.records.map(r => [r.canonicalId, r]));
  const ev = loadEvidence(auth);
  const nameCount = {};
  for (const a of A) nameCount[a.name] = (nameCount[a.name] || 0) + 1;
  const sameNameFeats = new Set(Object.keys(nameCount).filter(n => nameCount[n] > 1));
  const crossDomain = new Set(ctx.manifest.certifiedCrossDomainNameCollisions.map(c => c.displayName));

  // Prerequisite edges (rules evidence): a prerequisite string that names another canonical feat. Name evidence only; ambiguity flagged.
  const names = [...new Set(A.map(a => a.name))].sort((x, y) => y.length - x.length || cmp(x, y));
  const edges = [];
  for (const a of A) {
    const text = ev.prereq.get(a.canonicalId);
    if (!text) continue;
    for (const nm of names) {
      if (nm === a.name) continue;
      if (new RegExp(`(?<![\\w-])${esc(nm)}(?![\\w-])`, 'i').test(text)) {
        const targets = A.filter(b => b.name === nm);
        edges.push({ child: a.canonicalId, childName: a.name, parentName: nm, parentIds: targets.map(t => t.canonicalId).sort(), evidence: 'PREREQUISITE_TEXT_NAME_REFERENCE',
          ambiguity: targets.length > 1 ? 'SAME_NAME_DISTINCT_FEAT_IDENTITIES' : crossDomain.has(nm) ? 'SAME_NAME_DIFFERENT_DOMAIN_POSSIBLE' : null });
      }
    }
  }
  edges.sort((x, y) => cmp(x.child, y.child) || cmp(x.parentName, y.parentName));
  const prereqUnavailable = A.filter(a => !ev.prereq.has(a.canonicalId) || ev.prereq.get(a.canonicalId) === null).map(a => a.canonicalId);

  const member = (id) => { const a = byId.get(id); return { canonicalId: id, name: a.name, source: a.primaryPublication.source, tags: [...a.finalTags] }; };
  const familyBody = (kind, label, ids, extra = {}) => {
    const members = ids.map(member);
    const sets = members.map(m => new Set(m.tags));
    const inter = members.length ? [...sets[0]].filter(t => sets.every(s => s.has(t))).sort() : [];
    const union = [...new Set(members.flatMap(m => m.tags))].sort();
    const unique = {};
    for (const m of members) { const others = members.filter(o => o !== m); const u = m.tags.filter(t => !others.some(o => o.tags.includes(t))); if (u.length) unique[m.canonicalId] = u; }
    const memberSet = new Set(ids);
    const internalEdges = edges.filter(e => memberSet.has(e.child) && e.parentIds.some(p => memberSet.has(p)));
    const differs = union.length !== inter.length;
    return { kind, label, memberCount: members.length, members, prerequisiteEdges: internalEdges, intersectionTags: inter, unionTags: union, uniqueTagsByMember: unique, tagSetsIdentical: !differs, ...extra };
  };

  const families = [];
  // 1. Certified tier families (Phase 1A PHASE0_CERTIFIED structure).
  const tiers = {};
  for (const r of ctx.manifest.records) if (r.structure.structuralStatus === 'PHASE0_CERTIFIED') (tiers[r.structure.familyKey] ||= []).push(r);
  for (const [key, recs] of Object.entries(tiers).sort(([x], [y]) => cmp(x, y))) {
    recs.sort((x, y) => x.structure.tier - y.structure.tier);
    families.push({ ...familyBody('CERTIFIED_TIER_FAMILY', key, recs.map(r => r.canonicalId)), tiers: Object.fromEntries(recs.map(r => [r.canonicalId, r.structure.tier])), flagBasis: 'same certified tier family; mechanics of tiers may legitimately differ' });
  }
  // 2. Owner-named chains.
  const unresolved = [];
  for (const [label, list] of OWNER_NAMED_CHAINS) {
    const ids = [], missingNames = [];
    for (const nm of list) { const hit = A.filter(a => a.name === nm); if (!hit.length) missingNames.push(nm); else ids.push(...hit.map(h => h.canonicalId)); }
    if (missingNames.length) unresolved.push({ family: label, unresolvedNames: missingNames, note: 'Not a canonical feat identity in the 353 (reported, not invented).' });
    if (ids.length >= 2) families.push({ ...familyBody('OWNER_NAMED_CHAIN', label, ids), unresolvedNames: missingNames });
  }
  // 3. Name-pattern families.
  for (const [label, re] of NAME_PATTERN_FAMILIES) { const ids = A.filter(a => re.test(a.name) || (label.startsWith('Mounted') && a.publicationCategory === 'RIDING_FEAT')).map(a => a.canonicalId); if (ids.length >= 2) families.push(familyBody('NAME_PATTERN_FAMILY', label, ids, { pattern: re.source })); }
  // 4. Publication-category families (identity manifest category; not semantic proof).
  for (const cat of CATEGORY_FAMILIES) { const ids = ctx.manifest.records.filter(r => r.publicationCategory === cat).map(r => r.canonicalId).sort(); if (ids.length >= 2) families.push(familyBody('PUBLICATION_CATEGORY_FAMILY', cat, ids, { note: 'Publication category is not semantic behavior; no uniformity is expected.' })); }
  // 5. Prerequisite parent groups (parent + direct dependents).
  const kids = {};
  for (const e of edges) for (const p of e.parentIds) (kids[p] ||= new Set()).add(e.child);
  for (const [pid, set] of Object.entries(kids).sort(([x], [y]) => cmp(x, y))) {
    if (!byId.has(pid) || set.size < 1) continue;
    const ids = [pid, ...[...set].sort()];
    families.push(familyBody('PREREQUISITE_PARENT_GROUP', `${byId.get(pid).name} and direct dependents`, ids, { parentCanonicalId: pid, hubParent: set.size > HUB_CHILD_THRESHOLD, note: set.size > HUB_CHILD_THRESHOLD ? 'HUB_PARENT_NOT_A_FAMILY: many unrelated dependents; informational only.' : 'Prerequisite relationship does not imply child tags.' }));
  }
  // 6. Text-keyed families (rules-text evidence vs expected tag candidates).
  for (const [label, re, expected] of TEXT_KEYED_FAMILIES) {
    const ids = A.filter(a => re.test(ev.rules.get(a.canonicalId) || '')).map(a => a.canonicalId);
    if (ids.length < 2) continue;
    const lacking = ids.filter(id => !expected.some(t => byId.get(id).finalTags.includes(t)));
    const tagWithoutText = A.filter(a => a.finalTags.some(t => expected.includes(t)) && !ids.includes(a.canonicalId)).map(a => a.canonicalId);
    families.push(familyBody('TEXT_KEYED_FAMILY', label, ids, { pattern: re.source, expectedTagCandidates: expected, membersWithoutAnyExpectedTag: lacking, membersWithExpectedTagButNoTextMatch: tagWithoutText.length, note: 'Membership from rules-text evidence; a missing candidate tag is a review prompt, not an error.' }));
  }

  // PASS2_OWNER_REVIEW flags (deterministic, neutral): only for families where equivalent mechanics are expected.
  for (const f of families) {
    const reasons = [];
    if (['CERTIFIED_TIER_FAMILY', 'OWNER_NAMED_CHAIN'].includes(f.kind) && !f.tagSetsIdentical) reasons.push(`member tag sets differ (${f.unionTags.length - f.intersectionTags.length} non-shared tag(s))`);
    if (f.kind === 'TEXT_KEYED_FAMILY' && f.membersWithoutAnyExpectedTag.length) reasons.push(`${f.membersWithoutAnyExpectedTag.length} member(s) lack every expected candidate tag`);
    if (f.kind === 'OWNER_NAMED_CHAIN' && f.unresolvedNames.length) reasons.push(`unresolved chain name(s): ${f.unresolvedNames.join(', ')}`);
    f.pass2OwnerReview = reasons.length ? 'PASS2_OWNER_REVIEW' : null;
    f.pass2ReviewReasons = reasons;
  }
  // Owner adjudication dispositions (Pass 2 mode). Evidence and the original flag reasons are kept; the open flag is cleared only by a recorded ruling.
  if (overlay) {
    const rank = (r) => ['PASS2_OWNER_CORRECTED', 'PASS2_OWNER_APPROVED'].indexOf(r);
    for (const f of families) {
      let disp = null, basis = null;
      const fr = overlay.familyReviews.find(x => x.label === f.label);
      const inv = overlay.invalidFamilyReferences.find(x => x.label === f.label);
      const changed = overlay.tagChanges.filter(c => c.family === f.label);
      const changedRulings = overlay.tagChanges.filter(c => c.family === f.label).map(c => `${c.name}: ${c.ruling}`);
      f.pass2MemberRulings = changedRulings;
      const rej = overlay.rejectedFindings.filter(r => r.source === `${f.label.toLowerCase()} family`);
      if (inv) { disp = inv.ruling; basis = inv.reason; }
      else if (fr) { disp = fr.ruling; basis = fr.reason; }
      else if (changed.length) { disp = changed.map(c => c.ruling).sort((x, y) => rank(x) - rank(y))[0]; basis = changed.map(c => `${c.name}: ${c.reason}`).join(' | '); }
      else if (rej.length) { disp = rej[0].ruling; basis = rej.map(r => `${r.name}: ${r.reason}`).join(' | '); }
      f.pass2Disposition = disp;
      f.pass2DispositionBasis = basis;
      if (disp && f.pass2OwnerReview) { f.pass2PriorFlag = 'PASS2_OWNER_REVIEW'; f.pass2OwnerReview = null; }
    }
    // Residual asymmetry: a family with a disposition whose post-change evidence still shows an unadjudicated difference.
    for (const f of families) {
      if (!f.pass2Disposition) continue;
      const residual = [];
      if (['CERTIFIED_TIER_FAMILY', 'OWNER_NAMED_CHAIN'].includes(f.kind) && !f.tagSetsIdentical && f.pass2Disposition !== 'PASS2_INVALID_FAMILY_REFERENCE') residual.push(`member tag sets still differ (${f.unionTags.length - f.intersectionTags.length} non-shared tag(s))`);
      if (f.kind === 'TEXT_KEYED_FAMILY' && f.membersWithoutAnyExpectedTag.length && f.pass2Disposition !== 'PASS2_FALSE_POSITIVE') residual.push(`${f.membersWithoutAnyExpectedTag.length} member(s) still lack every expected candidate tag (text-match evidence; not adjudicated)`);
      f.pass2ResidualEvidence = residual;
      f.pass2ResidualEvidenceClosed = residual.length > 0 && f.pass2Disposition === 'PASS2_INTENTIONAL_DIVERGENCE';
    }
  }
  families.sort((a, b) => cmp(a.kind, b.kind) || cmp(a.label, b.label));

  // Statistics.
  const usage = {};
  for (const a of A) for (const t of a.finalTags) usage[t] = (usage[t] || 0) + 1;
  const vocab = [...ctx.vocabulary].sort();
  const ranked = Object.entries(usage).sort((x, y) => y[1] - x[1] || cmp(x[0], y[0]));
  const combo = {};
  for (const a of A) { const k = [...a.finalTags].sort().join(' + '); combo[k] = (combo[k] || 0) + 1; }
  const pair = {};
  for (const a of A) { const t = [...a.finalTags].sort(); for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) { const k = `${t[i]} + ${t[j]}`; pair[k] = (pair[k] || 0) + 1; } }
  const six = ['acrobatics', 'climb', 'endurance', 'gather_information', 'jump', 'swim'];
  const stats = {
    assignments: A.length, approvedVocabulary: vocab.length, tagsUsed: ranked.length, tagUsage: ranked.map(([tag, uses]) => ({ tag, uses })),
    featOnlyTags: ranked.map(([t]) => t).filter(t => !talentTagCounts[t]).sort(),
    talentOnlyTags: Object.keys(talentTagCounts).filter(t => ctx.vocabulary.has(t) && !usage[t]).sort(),
    newSkillTagUsage: Object.fromEntries(six.map(t => [t, usage[t] || 0])),
    mostCommonTagCombinations: Object.entries(combo).sort((x, y) => y[1] - x[1] || cmp(x[0], y[0])).slice(0, 15).map(([tags, feats]) => ({ tags, feats })),
    mostCommonTagPairs: Object.entries(pair).sort((x, y) => y[1] - x[1] || cmp(x[0], y[0])).slice(0, 15).map(([tags, feats]) => ({ tags, feats })),
    singletonTags: ranked.filter(([, u]) => u === 1).map(([t]) => t).sort(), zeroUseApprovedTags: vocab.filter(t => !usage[t]),
    tagsPerFeat: { min: Math.min(...A.map(a => a.finalTags.length)), max: Math.max(...A.map(a => a.finalTags.length)), mean: Number((A.reduce((n, a) => n + a.finalTags.length, 0) / A.length).toFixed(3)) },
    ...(overlay ? { dispositions: Object.fromEntries(['PASS2_OWNER_APPROVED', 'PASS2_OWNER_CORRECTED', 'PASS2_FALSE_POSITIVE', 'PASS2_INTENTIONAL_DIVERGENCE', 'PASS2_INVALID_FAMILY_REFERENCE'].map(d => [d, families.filter(f => f.pass2Disposition === d).length + (d === 'PASS2_INVALID_FAMILY_REFERENCE' ? unresolved.filter(u => overlay.invalidFamilyReferences.some(x => x.label === u.family)).length : 0)])), residualEvidenceFamilies: families.filter(f => f.pass2ResidualEvidence?.length && !f.pass2ResidualEvidenceClosed).map(f => ({ label: f.label, kind: f.kind, evidence: f.pass2ResidualEvidence })) } : {}),
    familyAsymmetry: { familiesTotal: families.length, byKind: Object.fromEntries([...new Set(families.map(f => f.kind))].sort().map(k => [k, { families: families.filter(f => f.kind === k).length, flaggedPass2OwnerReview: families.filter(f => f.kind === k && f.pass2OwnerReview).length, tagSetsIdentical: families.filter(f => f.kind === k && f.tagSetsIdentical).length }])), flaggedTotal: families.filter(f => f.pass2OwnerReview).length },
    productionVsAuthorityDelta: recon ? Object.fromEntries(['canonicalPresentInProduction', 'canonicalMissingFromProduction', 'recordsExactlyMatching', 'tagsToAddTotal', 'tagsToRemoveTotal', 'tagsToRemoveOutsideVocabulary', 'tagsAlreadyMatchingTotal'].map(k => [k, recon.totals[k]])) : null
  };
  return {
    schemaVersion: '1.0', kind: 'FEAT_TAGS_PASS2_FAMILY_ANALYSIS', status: 'EVIDENCE_ONLY_NO_ADJUDICATION',
    authority: { file: PASS2 ? PASS2_AUTHORITY_PATH : AUTHORITY_PATH, status: auth.status, label: PASS2 ? 'Pass 2 working authority, owner adjudication Batch 1' : 'PASS1_COMPLETE / INPUT_TO_PASS2' },
    note: 'Candidate families from certified evidence. Family membership is not semantic proof; prerequisite relationships do not imply tags; same weapon family or publication category does not imply identical tags. PASS2_OWNER_REVIEW marks a difference to review, never an automatic correction.',
    evidence: { rulesAndPrerequisiteTextSource: ev.source, prerequisiteTextUnavailableFor: prereqUnavailable.length, prerequisiteEdgeCount: edges.length, hubChildThreshold: HUB_CHILD_THRESHOLD },
    unresolvedOwnerNamedChainMembers: unresolved.map(u => { const inv = overlay?.invalidFamilyReferences.find(x => x.label === u.family); return inv ? { ...u, pass2Disposition: inv.ruling, pass2DispositionBasis: inv.reason } : u; }), statistics: stats, prerequisiteEdges: edges, families
  };
}

function render(rep) {
  const s = rep.statistics;
  const L = ['# Feat Tags — Pass 2 Family / Chain Analysis (evidence only)', '', `Authority: \`${rep.authority.file}\` — ${rep.authority.label}. ${rep.note}`, '',
    `Text evidence: \`${rep.evidence.rulesAndPrerequisiteTextSource}\`; prerequisite text unavailable for ${rep.evidence.prerequisiteTextUnavailableFor} feats; ${rep.evidence.prerequisiteEdgeCount} prerequisite name-reference edges.`, '',
    '## Statistics', '', `- Assignments: ${s.assignments}; approved vocabulary: ${s.approvedVocabulary}; tags used: ${s.tagsUsed}; zero-use approved tags: ${s.zeroUseApprovedTags.length}; singleton tags: ${s.singletonTags.length}`,
    `- Tags per feat: min ${s.tagsPerFeat.min}, max ${s.tagsPerFeat.max}, mean ${s.tagsPerFeat.mean}`,
    `- Tags used in feats but not in talents: ${s.featOnlyTags.length}; used in talents but not in feats: ${s.talentOnlyTags.length}`,
    `- New skill tags: ${Object.entries(s.newSkillTagUsage).map(([t, u]) => `${t} ${u}`).join(', ')}`,
    s.productionVsAuthorityDelta ? `- Production vs authority delta: ${Object.entries(s.productionVsAuthorityDelta).map(([k, v]) => `${k} ${v}`).join('; ')}` : '', '',
    '### Top 25 tags', '', '| Tag | Feats |', '| --- | ---: |', ...s.tagUsage.slice(0, 25).map(r => `| \`${r.tag}\` | ${r.uses} |`), '',
    '### Most common tag combinations', '', '| Feats | Tags |', '| ---: | --- |', ...s.mostCommonTagCombinations.map(r => `| ${r.feats} | ${r.tags.split(' + ').map(t => `\`${t}\``).join(', ')} |`), '',
    `### Singleton tags (${s.singletonTags.length})`, '', s.singletonTags.map(t => `\`${t}\``).join(', '), '',
    `### Zero-use approved tags (${s.zeroUseApprovedTags.length})`, '', s.zeroUseApprovedTags.map(t => `\`${t}\``).join(', '), '',
    '### Feat-only tags', '', s.featOnlyTags.map(t => `\`${t}\``).join(', ') || '—', '',
    '### Talent-only tags (approved, used by talents, not by feats)', '', s.talentOnlyTags.map(t => `\`${t}\``).join(', ') || '—', '',
    ...(s.dispositions ? ['## Owner dispositions', '', '| Status | Families |', '| --- | ---: |', ...Object.entries(s.dispositions).map(([k, v]) => `| ${k} | ${v} |`), '', `Residual unadjudicated evidence: ${s.residualEvidenceFamilies.length ? s.residualEvidenceFamilies.map(r => `${r.label} (${r.evidence.join('; ')})`).join(' | ') : 'none'}.`, ''] : []),
    '## Family asymmetry counts', '', '| Kind | Families | PASS2_OWNER_REVIEW | Identical tag sets |', '| --- | ---: | ---: | ---: |',
    ...Object.entries(s.familyAsymmetry.byKind).map(([k, v]) => `| ${k} | ${v.families} | ${v.flaggedPass2OwnerReview} | ${v.tagSetsIdentical} |`), '',
    '## Owner-named chain members that are not canonical feats', '', ...(rep.unresolvedOwnerNamedChainMembers.length ? rep.unresolvedOwnerNamedChainMembers.map(u => `- ${u.family}: ${u.unresolvedNames.join(', ')}${u.pass2Disposition ? ` — **${u.pass2Disposition}**` : ''}`) : ['—']), '',
    '## Families', ''];
  for (const f of rep.families) {
    if (f.kind === 'PREREQUISITE_PARENT_GROUP' && f.hubParent) continue;
    L.push(`### ${f.label} — ${f.kind}${f.pass2OwnerReview ? ' — **PASS2_OWNER_REVIEW**' : ''}${f.pass2Disposition ? ` — **${f.pass2Disposition}**` : ''}`, '');
    if (f.pass2Disposition) L.push(`Owner ruling basis: ${f.pass2DispositionBasis}`, '');
    if (f.pass2PriorFlag) L.push(`Prior flag: ${f.pass2PriorFlag}; evidence retained: ${f.pass2ReviewReasons.join('; ')}.`, '');
    if (f.pass2ResidualEvidence?.length) L.push(`Residual evidence (${f.pass2ResidualEvidenceClosed ? 'closed by owner ruling, retained' : 'not adjudicated'}): ${f.pass2ResidualEvidence.join('; ')}.`, '');
    if (f.pass2ReviewReasons.length) L.push(`Review reasons: ${f.pass2ReviewReasons.join('; ')}.`, '');
    L.push(`Members: ${f.memberCount}; intersection: ${f.intersectionTags.map(t => `\`${t}\``).join(', ') || '—'}`, '');
    if (f.memberCount <= 14) L.push('| Member | Tags |', '| --- | --- |', ...f.members.map(m => `| ${m.name} (\`${m.canonicalId}\`) | ${m.tags.map(t => `\`${t}\``).join(', ')} |`), '');
    else L.push('Member list and per-member tags are in the JSON.', '');
  }
  L.push('Hub prerequisite groups, full member tag arrays, and every prerequisite edge are in the JSON.', '');
  return L.filter(x => x !== undefined).join('\n');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const auth = readJson(PASS2 ? PASS2_AUTHORITY_PATH : AUTHORITY_PATH);
  const ctx = loadContext();
  const v = validateAuthority(auth, ctx, { pass: PASS2 ? 2 : 1 });
  if (v.failures.length) { console.error('authority validation failed; refusing to analyze'); process.exit(1); }
  const talentCounts = {};
  for (const l of fs.readFileSync(path.join(ROOT, 'packs/talents.db'), 'utf8').split('\n').filter(Boolean)) for (const t of (JSON.parse(l).system?.tags || [])) talentCounts[t] = (talentCounts[t] || 0) + 1;
  const reconPath = PASS2 ? 'data/audits/feat-tags-pass2-production-reconciliation.json' : 'data/audits/feat-tags-production-reconciliation.json';
  const recon = exists(reconPath) ? readJson(reconPath) : null;
  const rep = analyze(auth, ctx, talentCounts, recon, PASS2 ? readJson(OVERLAY_PATH) : null);
  fs.writeFileSync(path.join(ROOT, OUT_JSON), JSON.stringify(rep, null, 2) + '\n');
  fs.writeFileSync(path.join(ROOT, OUT_MD), render(rep));
  const k = rep.statistics.familyAsymmetry;
  console.log(`PASS 2 FAMILY ANALYSIS (evidence only): ${k.familiesTotal} candidate families; ${k.flaggedTotal} flagged PASS2_OWNER_REVIEW; ${rep.evidence.prerequisiteEdgeCount} prerequisite edges`);
  console.log(`  kinds: ${Object.entries(k.byKind).map(([a, b]) => `${a}=${b.families}`).join(', ')}`);
  console.log(`  unresolved owner-named chain members: ${rep.unresolvedOwnerNamedChainMembers.map(u => u.unresolvedNames.join('/')).join('; ') || 'none'}`);
}
export { analyze };
