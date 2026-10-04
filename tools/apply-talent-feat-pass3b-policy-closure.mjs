#!/usr/bin/env node
// Pass 3B bulk policy-driven closure. EXECUTION of existing owner policy only; no new semantic policy is created here.
// For every remaining PASS3B_OWNER_REVIEW record-level finding, a decision is derived ONLY when the matched clauses fall into structural forms that an owner
// policy names explicitly (NEGATIVE_EXCLUSION / REFERENCE_ONLY / OPEN_GENERIC_SCOPE -> NO_CHANGE; CLOSED_SCOPE + DIRECT_OPERATIVE_MECHANIC -> ADD) and exactly one
// result follows. Everything else is left unresolved and grouped into consolidated policy gaps (no recommendation, no proposed answer).
// Derived decisions carry decisionSource OWNER_POLICY_DERIVED, cite the controlling policy ID(s) and the derivation rule, and are written to the cumulative overlay.
// Idempotent: derivation depends only on the evidence text, never on prior decision state. No production mutation.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, REQUIRED_IMPLICATIONS } from './validate-feat-tags-semantic-authority.mjs';
import { BASELINE3B_PATH } from './build-talent-feat-pass3b-mechanic-baseline.mjs';
import { OWNER_OVERLAY_PATH } from './build-talent-feat-pass3b-semantic-authority.mjs';
import { buildOutputs as buildDiscovery } from './report-talent-feat-pass3b-exact-mechanic-convergence.mjs';
import { DETECTORS, BUNDLES } from './talent-feat-pass3b-detectors.mjs';
import { classifyClause as classify2D } from './report-talent-feat-pass3b-2d-weapon-scope-owner-packet.mjs';

export const BULK_BATCH = '3B.BULK';
export const GAPS_JSON = 'data/audits/talent-feat-pass3b-policy-gaps.json';
export const GAPS_MD = 'docs/audits/talent-feat-pass3b-policy-gaps.md';
export const CLOSURE_JSON = 'data/audits/talent-feat-pass3b-policy-closure.json';
export const CLOSURE_MD = 'docs/audits/talent-feat-pass3b-policy-closure.md';
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const splitSentences = (text) => String(text).replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+(?=[A-Z("“])/).filter(Boolean);

// ---- General owner policies authorized for the bulk sweep (verbatim substance of the owner command) ----
export const GENERAL_POLICIES = [
  { id: 'DIRECT_OPERATIVE_MECHANIC_POLICY', text: "A semantic tag applies when the record's own operative Benefit directly creates the mechanic, modifies it, improves or penalizes it, requires it, changes its resolution, grants it, prevents/suppresses it, removes/recovers it, or changes another creature's direct use of it. The user of the feat/talent does not have to be the actor receiving the effect; direct manipulation of another creature's mechanic can still qualify." },
  { id: 'REFERENCE_ONLY_POLICY', text: 'Do not add a positive semantic tag when the mechanic appears only as explanatory text, a basic-rules reminder, a comparison, an example, a prerequisite, an exception, an excluded target/state, an unaffected state, ordinary-English wording, or flavor text. A record must interact with the actual mechanic, not merely mention it.' },
  { id: 'OPEN_GENERIC_SCOPE_POLICY', text: 'When a record allows an open generic choice (any weapon, any weapon group, any skill, any Force power, one of many selectable categories), do not automatically add every possible specific scope tag (for example Weapon Focus allowing grapple as one possible choice does not gain grapple; a generic weapon selection does not gain pistol, heavy_weapon, lightsaber, exotic_weapon; a generic skill mechanic does not gain every skill tag). Specific semantic tags require direct operative interaction with that specific scope.' },
  { id: 'CLOSED_SCOPE_POLICY', text: 'When the operative mechanic explicitly and deliberately applies to a named closed scope, that scope may receive its semantic tag: "melee attacks" -> melee; "ranged attacks" -> ranged; "melee or ranged attacks" -> both are explicit closed scopes; "while using a pistol" -> pistol; "when wielding a lightsaber" -> lightsaber; "unarmed attacks" -> unarmed. This policy does not override the reference-only or generic-selection policies.' },
  { id: 'NEGATIVE_EXCLUSION_POLICY', text: 'A mechanic does not receive a positive tag merely because that mechanic prevents the effect from working: "cannot affect a grappled target" does not create grapple; "except stun gauntlets" does not create stun; "does not work against X" does not positively represent X.' },
  { id: 'SPECIFIC_OVER_BROAD_POLICY', text: 'When a certified specific mechanical tag already precisely expresses the rule, do not automatically infer every broad neighboring semantic tag. These distinctions must remain meaningful: movement != mobility; movement != positioning; control != battlefield_control; critical_hit != critical_success; ion != stun; resource creation != resource recovery; force capacity != resource recovery; access != semantic identity. Broad tags require their own direct owner-defined meaning.' }
];

// ---- Structural forms (lexical only). Each maps to exactly one owner policy. Tested PER OCCURRENCE of the matched phrase, never per sentence. ----
const NEG_PRE = [
  /\b(?:cannot|can't|can not|may not|unable to)\s+(?:\w+\s+){0,4}(?:affect|target|be used on|be used against|apply to|work (?:on|against))\b[^.]{0,60}$/i,
  /\b(?:does not|doesn't|do not|don't)\s+(?:affect|work (?:on|against)|apply to|target)\b[^.]{0,60}$/i,
  /\b(?:except|unless|excluding|other than)\b[^.]{0,60}$/i,
  /\b(?:immune to|unaffected by|not affected by)\b[^.]{0,40}$/i
];
const NEG_POST = /^[^.]{0,40}\b(?:is|are) (?:not eligible|ineligible|excluded|immune)\b/i;
const REF_PRE = /\b(?:such as|for example|e\.g\.|for instance|including|like)\b[^.]{0,80}$/i;
const OPEN = (w) => new RegExp(`\\b(?:choose|select|one of|each of)\\b[^.]{0,100}\\b${w}\\b|\\bany (?:weapon groups?|weapon proficienc\\w+|exotic weapons?|simple weapons?|advanced melee weapons?)\\b[^.]{0,100}\\b${w}\\b`, 'i');
const WEAPON_WORD = { 'O.melee': 'melee', 'O.ranged': 'ranged', 'O.lightsaber': 'lightsabers?', 'O.pistol': 'pistols?', 'O.unarmed': 'unarmed' };
const CLOSED_DIRECT = {
  'O.melee': ['DIRECTLY_MODIFIES_MELEE_ATTACKS', 'DIRECTLY_PERMITS_OR_REQUIRES_A_MELEE_ATTACK', 'CHANGES_DEFENSE_AGAINST_MELEE_ATTACKS'],
  'O.ranged': ['DIRECTLY_MODIFIES_RANGED_ATTACKS', 'DIRECTLY_PERMITS_OR_REQUIRES_A_RANGED_ATTACK', 'CHANGES_DEFENSE_AGAINST_RANGED_ATTACKS'],
  'O.lightsaber': ['MECHANIC_REQUIRES_A_LIGHTSABER', 'DIRECTLY_MODIFIES_LIGHTSABER_ATTACKS_DAMAGE_DEFENSE_OR_USE'],
  'O.pistol': ['EXPLICITLY_REQUIRES_OR_USES_A_PISTOL', 'MODIFIES_PISTOL_ATTACKS_OR_USE'],
  'O.unarmed': ['DIRECTLY_REQUIRES_AN_UNARMED_ATTACK', 'MODIFIES_UNARMED_ATTACKS_OR_DAMAGE', 'DIRECTLY_MODIFIES_UNARMED_COMBAT']
};
// ADD is only derived for the exact example forms in CLOSED_SCOPE_POLICY; hypotheticals ("as though", "as if") are never derived.
const CLOSED_FORM = {
  'O.melee': /\bmelee(?: or ranged)? attacks?\b|\bmelee or ranged\b/i,
  'O.ranged': /\b(?:melee or )?ranged attacks?\b/i,
  'O.unarmed': /\bunarmed (?:attacks?|strikes?)\b/i,
  'O.lightsaber': /\b(?:wield(?:ing|s)?|using|uses?|with|hold(?:ing)?)\b[^.]{0,40}\blightsabers?\b/i,
  'O.pistol': /\b(?:using|with|wield(?:ing|s)?|holding)\s+(?:a |an |your )?(?:standard |blaster |slugthrower |sporting )?pistols?\b/i
};
export const TAG_FOR = Object.fromEntries(DETECTORS.map(d => [d.id, d.tag]));
const POLICY_OF_KIND = { NEGATIVE_EXCLUSION: 'NEGATIVE_EXCLUSION_POLICY', REFERENCE_ONLY: 'REFERENCE_ONLY_POLICY', OPEN_GENERIC_SCOPE: 'OPEN_GENERIC_SCOPE_POLICY', CLOSED_DIRECT: 'CLOSED_SCOPE_POLICY' };

function occurrenceKind(sentence, m) {
  const end = m.index + m[0].length, pre = sentence.slice(0, end), post = sentence.slice(end);
  if (NEG_PRE.some(re => re.test(pre)) || NEG_POST.test(post)) return 'NEGATIVE_EXCLUSION';
  if (REF_PRE.test(pre)) return 'REFERENCE_ONLY';
  return null;
}
export function clauseKind(sentence, matches, detectorId) {
  const occ = matches.map(m => occurrenceKind(sentence, m));
  if (occ.every(Boolean)) return occ.every(k => k === occ[0]) ? occ[0] : 'NEGATIVE_EXCLUSION+REFERENCE_ONLY';
  const weapon = WEAPON_WORD[detectorId];
  if (weapon && !occ.some(Boolean)) {
    const labels = classify2D(sentence, detectorId);
    if (OPEN(weapon).test(sentence) || labels.some(l => /ONE_POSSIBLE|ONE_GENERIC|ONE_SELECTABLE/.test(l))) return 'OPEN_GENERIC_SCOPE';
    if (labels.some(l => CLOSED_DIRECT[detectorId].includes(l)) && CLOSED_FORM[detectorId].test(sentence) && !/\b(?:as though|as if)\b/i.test(sentence)) return 'CLOSED_DIRECT';
  }
  return 'OTHER';
}
export function derive(clauses, detectorId) {
  const kinds = clauses.map(c => c.kind);
  const isWeapon = !!WEAPON_WORD[detectorId];
  if (!kinds.length) return { result: 'GAP', reason: 'no matching clause could be isolated' };
  if (kinds.includes('OTHER')) return { result: 'GAP', reason: 'at least one matched occurrence has a form that no owner policy names structurally' };
  const nonDirect = (k) => ['NEGATIVE_EXCLUSION', 'REFERENCE_ONLY', 'OPEN_GENERIC_SCOPE', 'NEGATIVE_EXCLUSION+REFERENCE_ONLY'].includes(k);
  const policyOf = (k) => k === 'NEGATIVE_EXCLUSION+REFERENCE_ONLY' ? ['NEGATIVE_EXCLUSION_POLICY', 'REFERENCE_ONLY_POLICY'] : [POLICY_OF_KIND[k]];
  if (kinds.every(nonDirect)) return { result: 'NO_CHANGE', rule: [...new Set(kinds)].sort().join('+'), policies: [...new Set(kinds.flatMap(policyOf))].sort() };
  if (isWeapon && kinds.includes('CLOSED_DIRECT') && kinds.every(k => k === 'CLOSED_DIRECT' || ['NEGATIVE_EXCLUSION', 'REFERENCE_ONLY', 'NEGATIVE_EXCLUSION+REFERENCE_ONLY'].includes(k))) return { result: 'ADD', rule: 'CLOSED_DIRECT' + (kinds.some(k => k !== 'CLOSED_DIRECT') ? '+non-qualifying clauses ignored' : ''), policies: ['CLOSED_SCOPE_POLICY', 'DIRECT_OPERATIVE_MECHANIC_POLICY'] };
  return { result: 'GAP', reason: 'clauses mix a direct closed-scope form with an open/other form; more than one result is possible' };
}

const detectorForItem = (i) => {
  if (!i.mechanic.startsWith('bundle:')) return DETECTORS.find(d => d.id === i.mechanic);
  const b = BUNDLES.find(x => x.id === i.mechanic.slice(7).split('>')[0]);
  return DETECTORS.find(d => d.id === b.all[0]);
};

export function sweep(discovery, baseline) {
  const byKey = new Map(baseline.records.map(r => [`${r.domain}:${r.canonicalId}`, r]));
  const pool = [...discovery.ownerReviewItems, ...discovery.ownerDecidedItems.filter(i => i.ownerDecision?.batch === BULK_BATCH)];
  const rows = pool.map(i => {
    const d = detectorForItem(i), rec = byKey.get(`${i.domain}:${i.canonicalId}`);
    const clauses = [];
    for (const s of splitSentences(rec.evidence)) {
      const g = new RegExp(d.re.source, d.re.flags.includes('g') ? d.re.flags : d.re.flags + 'g');
      const matches = [...s.matchAll(g)];
      if (matches.length) clauses.push({ sentence: s, matchedPhrases: matches.map(m => m[0]), kind: clauseKind(s, matches, d.id) });
    }
    return { item: i, detector: d, record: rec, clauses, derived: derive(clauses, d.id) };
  }).sort((a, b) => cmp(a.detector.id, b.detector.id) || cmp(a.item.comparedTag, b.item.comparedTag) || cmp(a.item.domain, b.item.domain) || cmp(a.item.canonicalId, b.item.canonicalId));
  return rows;
}

export function buildDecisions(rows) {
  return rows.filter(r => r.derived.result !== 'GAP').map(r => {
    const act = r.derived.result, i = r.item;
    return {
      decisionId: `${i.domain}:${i.canonicalId}|${i.comparedTag}`, batch: BULK_BATCH, domain: i.domain, canonicalId: i.canonicalId, name: i.name, tag: i.comparedTag, ownerAction: act,
      decisionSource: 'OWNER_POLICY_DERIVED', derivationRule: r.derived.rule, ownerPoliciesApplied: r.derived.policies, ownerPolicyApplied: r.derived.policies[0],
      detectorEvidenceReference: [`${i.mechanic}`], clauseEvidence: r.clauses.map(c => ({ kind: c.kind, sentence: c.sentence, matchedPhrases: c.matchedPhrases })),
      ownerRationale: `Policy-derived (execution of existing owner policy, not a new ruling): every matched clause falls in a structural form named by ${r.derived.policies.join(' + ')}; rule ${r.derived.rule}.`
    };
  });
}

// ================= overlay write, tag-question resolution, gaps, closure =================
import { POLICY_DEFINES, POLICY_PARTIAL } from './talent-feat-owner-policy-map.mjs';

// Tag-definition / convention questions that an EXISTING full owner policy already defines are marked PASS3B_POLICY_RESOLVED; all others stay open.
export function tagQuestionResolutions(discovery) {
  const out = [];
  for (const a of discovery.tagDefinitionAudit.filter(x => x.state === 'PASS3B_OWNER_REVIEW' || x.state === 'PASS3B_POLICY_RESOLVED')) {
    const pol = POLICY_DEFINES[a.tag]; if (pol) out.push({ kind: 'TAG_DEFINITION', key: a.tag, state: 'PASS3B_POLICY_RESOLVED', controllingPolicies: pol, source: 'OWNER_POLICY_DERIVED' });
  }
  for (const q of discovery.tagConventionQuestions) {
    const pol = POLICY_DEFINES[q.comparedTag]; if (pol) out.push({ kind: 'TAG_CONVENTION', key: q.mechanic, tag: q.comparedTag, state: 'PASS3B_POLICY_RESOLVED', controllingPolicies: pol, source: 'OWNER_POLICY_DERIVED' });
  }
  return out;
}

export function writeOverlay(rows, discovery) {
  const o = readJson(OWNER_OVERLAY_PATH);
  const before = o.decisions.filter(d => d.batch !== BULK_BATCH);
  const decisions = buildDecisions(rows);
  o.decisions = [...before, ...decisions];
  for (const gp of GENERAL_POLICIES) if (!o.ownerPolicies.some(p => p.id === gp.id)) o.ownerPolicies.push(gp);
  o.batches = o.batches.filter(b => b.batch !== BULK_BATCH);
  const addRec = new Set(decisions.filter(d => d.ownerAction === 'ADD').map(d => `${d.domain}:${d.canonicalId}`));
  const noOnly = new Set(decisions.filter(d => d.ownerAction === 'NO_CHANGE').map(d => `${d.domain}:${d.canonicalId}`)); for (const k of addRec) noOnly.delete(k);
  o.batches.push({ batch: BULK_BATCH, title: 'Policy-driven bulk closure (OWNER_POLICY_DERIVED)', expected: { recordsWithAdd: addRec.size, tagAdditions: decisions.filter(d => d.ownerAction === 'ADD').length, recordsWithOnlyNoChange: noOnly.size, removals: 0, newTags: 0 } });
  const all = o.decisions, adds = all.filter(d => d.ownerAction === 'ADD');
  const priorAddRec = new Set(adds.map(d => `${d.domain}:${d.canonicalId}`));
  o.cumulativeExpected = { decisions: all.length, addDecisions: adds.length, noChangeDecisions: all.length - adds.length, recordsWithAdd: priorAddRec.size, tagAdditions: adds.length, removals: 0, tagInstancesBefore: 11218, tagInstancesAfter: 11218 + adds.length };
  o.tagQuestionResolutions = tagQuestionResolutions(discovery);
  return o;
}

const policyMentions = (tag) => POLICY_DEFINES[tag] || POLICY_PARTIAL[tag] || [];
export function buildGaps(rows, discovery, baseline) {
  const unresolved = rows.filter(r => r.derived.result === 'GAP');
  const byTag = new Map();
  const ensure = (tag) => byTag.get(tag) || byTag.set(tag, { tag, detectors: new Set(), records: [], tagQuestions: [] }).get(tag);
  for (const r of unresolved) { const g = ensure(r.item.comparedTag); g.detectors.add(r.detector.id); g.records.push(r); }
  const resolved = new Set(tagQuestionResolutions(discovery).map(x => `${x.kind}|${x.key}`));
  for (const a of discovery.tagDefinitionAudit.filter(x => x.state === 'PASS3B_OWNER_REVIEW' && !resolved.has(`TAG_DEFINITION|${x.tag}`))) ensure(a.tag).tagQuestions.push({ kind: 'TAG_DEFINITION', note: a.note, feats: a.feats, talents: a.talents, cooccurrenceCosine: a.cooccurrenceCosine });
  for (const q of discovery.tagConventionQuestions.filter(x => x.state === 'PASS3B_OWNER_REVIEW' && !resolved.has(`TAG_CONVENTION|${x.mechanic}`))) { const g = ensure(q.comparedTag); g.detectors.add(q.mechanic); g.tagQuestions.push({ kind: 'TAG_CONVENTION', mechanic: q.mechanic, detected: q.detected, carrying: q.carrying, untagged: q.untagged, untaggedByDomain: q.untaggedByDomain, untaggedRecordIds: q.untaggedRecordIds }); }
  const gaps = [...byTag.values()].map(g => {
    const recs = g.records.map(r => ({ domain: r.item.domain, canonicalId: r.item.canonicalId, name: r.item.name, source: r.item.source, page: r.item.page, detector: r.detector.id, existingTags: r.record.tags, clauseForms: [...new Set(r.clauses.map(c => c.kind))].sort(), reasonUnresolved: r.derived.reason, matchedClauses: r.clauses.map(c => ({ sentence: c.sentence, matchedPhrases: c.matchedPhrases })), canonicalMechanicText: r.record.evidence }));
    const convIds = g.tagQuestions.filter(q => q.kind === 'TAG_CONVENTION').flatMap(q => q.untaggedRecordIds);
    const mention = policyMentions(g.tag);
    return {
      gapId: `GAP-${g.tag}`, tag: g.tag, detectors: [...g.detectors].sort(),
      recordLevelUnresolved: recs.length, feats: recs.filter(r => r.domain === 'FEAT').length, talents: recs.filter(r => r.domain === 'TALENT').length,
      hasTagDefinitionQuestion: g.tagQuestions.some(q => q.kind === 'TAG_DEFINITION'), hasTagConventionQuestion: g.tagQuestions.some(q => q.kind === 'TAG_CONVENTION'),
      conventionQuestionUntaggedMatches: convIds.length, conventionQuestionUntaggedRecordIds: convIds.sort(),
      canonicalRecordIds: recs.map(r => `${r.domain}:${r.canonicalId}`).sort(), clauseFormTally: recs.reduce((m, r) => { for (const f of r.clauseForms) m[f] = (m[f] || 0) + 1; return m; }, {}),
      existingOwnerPoliciesTouchingTheTag: mention, ownerPolicyStatus: POLICY_DEFINES[g.tag] ? 'FULLY_DEFINED_BUT_CASES_NOT_MECHANICALLY_GOVERNED' : (mention.length ? 'PARTIAL' : 'NO_TAG_SPECIFIC_OWNER_POLICY'),
      insufficiencyStatement: POLICY_DEFINES[g.tag] ? `Owner policy ${POLICY_DEFINES[g.tag].join(', ')} defines the tag, but ${recs.length} record-level clause(s) matched forms the policy does not name structurally.` : `${mention.length ? `Existing policies (${mention.join(', ')}) touch the tag without defining it. ` : 'No tag-specific owner policy defines the tag. '}The general policies (DIRECT_OPERATIVE_MECHANIC, REFERENCE_ONLY, NEGATIVE_EXCLUSION, OPEN_GENERIC_SCOPE, CLOSED_SCOPE) could not mechanically classify the matched clauses${recs.length ? ` (${recs.length} record-level finding(s) unresolved)` : ''}.`,
      ownerQuestion: `Define when \`${g.tag}\` applies. State whether records whose canonical text matches ${[...g.detectors].sort().join(' / ')} in the observed wording forms qualify.`,
      records: recs, tagQuestions: g.tagQuestions.map(q => ({ ...q, untaggedRecordIds: undefined }))
    };
  }).sort((a, b) => cmp(a.tag, b.tag));
  return gaps;
}

const OWNER_GAP_NOTE = 'No recommendation, proposed answer or interpretation is made. Gap groups are organized by missing semantic policy (tag), not by record.';
function renderGapsMd(rep) {
  const L = ['# Pass 3B — Consolidated Owner Policy Gaps', '', OWNER_GAP_NOTE, '',
    `- Policy gaps: **${rep.counts.policyGaps}** (tags). Record-level findings unresolved: **${rep.counts.recordLevelUnresolved}**. Tag-definition questions unresolved: ${rep.counts.tagDefinitionQuestions}. Tag-convention questions unresolved: ${rep.counts.tagConventionQuestions}.`, '',
    '| Gap | Tag | Detector(s) | Records | Feats | Talents | Tag-def? | Convention? | Owner policy status |', '| --- | --- | --- | ---: | ---: | ---: | --- | --- | --- |',
    ...rep.gaps.map(g => `| ${g.gapId} | \`${g.tag}\` | ${g.detectors.join(', ')} | ${g.recordLevelUnresolved} | ${g.feats} | ${g.talents} | ${g.hasTagDefinitionQuestion ? 'yes' : '—'} | ${g.hasTagConventionQuestion ? `yes (${g.conventionQuestionUntaggedMatches})` : '—'} | ${g.ownerPolicyStatus} |`), ''];
  for (const g of rep.gaps) {
    L.push(`## ${g.gapId}`, '', `- Tag: \`${g.tag}\`; detector(s): ${g.detectors.join(', ')}; record-level unresolved ${g.recordLevelUnresolved} (feat ${g.feats} / talent ${g.talents}); convention-question untagged matches ${g.conventionQuestionUntaggedMatches}`,
      `- Owner policy status: ${g.ownerPolicyStatus}; policies touching the tag: ${g.existingOwnerPoliciesTouchingTheTag.join(', ') || 'none'}`, `- Why existing policy is insufficient: ${g.insufficiencyStatement}`,
      `- Clause forms observed: ${Object.entries(g.clauseFormTally).map(([k, v]) => `${k} ${v}`).join(', ') || '—'}`, `- Owner question: ${g.ownerQuestion}`, '');
    for (const r of g.records.slice(0, 5)) L.push(`  - ${r.name} (${r.domain} \`${r.canonicalId}\`, ${r.source} p.${r.page ?? '—'}) tags: ${r.existingTags.map(t => `\`${t}\``).join(', ')}`, `    > ${r.matchedClauses.map(c => c.sentence).join(' … ').slice(0, 420)}`);
    for (const q of g.tagQuestions) L.push(`  - ${q.kind}${q.mechanic ? ` ${q.mechanic}: detected ${q.detected}, carrying ${q.carrying}, untagged ${q.untagged}` : `: ${q.note ?? ''} (feats ${q.feats}, talents ${q.talents})`}`);
    L.push('');
  }
  L.push('All canonical IDs per gap are in the JSON.', '');
  return L.join('\n');
}
function renderClosureMd(c) {
  const k = c.counts;
  return ['# Pass 3B — Policy-Driven Bulk Closure', '', 'Execution of existing owner policy only. Every derived decision cites its controlling policy ID and carries decisionSource `OWNER_POLICY_DERIVED`. Findings the policies do not mechanically govern remain unresolved and are grouped in the consolidated policy-gap report.', '',
    `- Starting unresolved record-level findings: **${k.startingUnresolvedRecordLevel}**`, `- Resolved through existing owner policy: **${k.resolvedByPolicy}** (ADD ${k.policyDerivedAdd}, NO_CHANGE ${k.policyDerivedNoChange})`, `- Unresolved record-level findings: **${k.unresolvedRecordLevel}**`,
    `- Consolidated policy gaps: **${k.policyGaps}**`, `- Tag-definition questions: ${k.tagDefinitionQuestionsStarting} starting, ${k.tagDefinitionPolicyResolved} policy-resolved, ${k.tagDefinitionRemaining} remaining`, `- Tag-convention questions: ${k.tagConventionStarting} starting, ${k.tagConventionPolicyResolved} policy-resolved, ${k.tagConventionRemaining} remaining`,
    `- Ontology gaps recorded (PHASE3_ONTOLOGY_GAP): ${k.ontologyGaps}`, `- Cumulative owner overlay: ${k.overlayDecisions} decisions (${k.overlayAdd} ADD, ${k.overlayNoChange} NO_CHANGE)`, `- Working authority: ${k.recordsWithAdditions} records with additions, ${k.tagAdditions} additions, ${k.removals} removals, tag instances ${k.tagInstances}`, '',
    '## Policy-derived decisions', '', '| Action | Domain | Name | ID | Tag | Policies | Rule |', '| --- | --- | --- | --- | --- | --- | --- |',
    ...c.decisions.map(d => `| ${d.ownerAction} | ${d.domain} | ${d.name} | \`${d.canonicalId}\` | \`${d.tag}\` | ${d.ownerPoliciesApplied.join(' + ')} | ${d.derivationRule} |`), '',
    '## Tag questions resolved by existing policy', '', ...(c.tagQuestionResolutions.length ? c.tagQuestionResolutions.map(r => `- ${r.kind} \`${r.tag ?? r.key}\`: PASS3B_POLICY_RESOLVED by ${r.controllingPolicies.join(', ')}`) : ['—']), '',
    '## Ontology gaps (PHASE3_ONTOLOGY_GAP, preserved for Phase 3D)', '', ...c.ontologyGaps.map(g => `- ${g.label}: ${g.feats} feats / ${g.talents} talents mention the wording; no tag is created.`), ''].join('\n');
}
export function ontologyGaps(discovery, baseline) {
  const out = discovery.ontologyGapScreen.filter(g => g.state === 'PASS3B_ONTOLOGY_GAP_CANDIDATE').map(g => ({ id: g.id, label: g.wording, state: 'PHASE3_ONTOLOGY_GAP', feats: g.feats, talents: g.talents }));
  const ion = (dom) => baseline.records.filter(r => r.domain === dom && /\bion\b/i.test(r.evidence)).length;
  out.push({ id: 'recurring_ion_mechanics', label: 'Recurring ion mechanics (no ion tag; ion != stun)', state: 'PHASE3_ONTOLOGY_GAP', feats: ion('FEAT'), talents: ion('TALENT') });
  return out.sort((a, b) => cmp(a.id, b.id));
}

export function buildReports(rows, discovery, baseline) {
  const decisions = buildDecisions(rows), gaps = buildGaps(rows, discovery, baseline), res = tagQuestionResolutions(discovery);
  const auth = readJson('data/audits/talent-feat-pass3b-semantic-authority.json'), overlay = readJson(OWNER_OVERLAY_PATH);
  const unresolved = rows.filter(r => r.derived.result === 'GAP');
  const tagDefStart = discovery.tagDefinitionAudit.filter(a => a.state === 'PASS3B_OWNER_REVIEW' || a.state === 'PASS3B_POLICY_RESOLVED').length;
  const convStart = discovery.tagConventionQuestions.length;
  const og = ontologyGaps(discovery, baseline);
  const counts = {
    startingUnresolvedRecordLevel: rows.length, resolvedByPolicy: decisions.length, policyDerivedAdd: decisions.filter(d => d.ownerAction === 'ADD').length, policyDerivedNoChange: decisions.filter(d => d.ownerAction === 'NO_CHANGE').length,
    unresolvedRecordLevel: unresolved.length, policyGaps: gaps.length, tagDefinitionQuestionsStarting: tagDefStart, tagDefinitionPolicyResolved: res.filter(r => r.kind === 'TAG_DEFINITION').length, tagDefinitionRemaining: discovery.dashboard.ownerReviewTagDefinitionItems,
    tagConventionStarting: convStart, tagConventionPolicyResolved: res.filter(r => r.kind === 'TAG_CONVENTION').length, tagConventionRemaining: discovery.dashboard.ownerReviewTagConventionQuestions,
    ontologyGaps: og.length, overlayDecisions: overlay.decisions.length, overlayAdd: overlay.decisions.filter(d => d.ownerAction === 'ADD').length, overlayNoChange: overlay.decisions.filter(d => d.ownerAction === 'NO_CHANGE').length,
    recordsWithAdditions: auth.counts.recordsChanged, tagAdditions: auth.counts.tagAdditions, removals: auth.counts.removals, tagInstances: auth.counts.tagInstancesAfter
  };
  const gapsRep = { schemaVersion: '1.0', kind: 'TALENT_FEAT_PASS3B_POLICY_GAPS', status: 'OWNER_POLICY_GAPS_NO_RECOMMENDATIONS', note: OWNER_GAP_NOTE, counts: { policyGaps: gaps.length, recordLevelUnresolved: unresolved.length, tagDefinitionQuestions: discovery.dashboard.ownerReviewTagDefinitionItems, tagConventionQuestions: discovery.dashboard.ownerReviewTagConventionQuestions }, gaps };
  const closureRep = { schemaVersion: '1.0', kind: 'TALENT_FEAT_PASS3B_POLICY_CLOSURE', status: 'POLICY_DERIVED_CLOSURE_APPLIED_TO_OVERLAY', counts, decisions: decisions.map(d => ({ ...d })), tagQuestionResolutions: res, ontologyGaps: og, derivationRules: { NO_CHANGE: ['NEGATIVE_EXCLUSION', 'REFERENCE_ONLY', 'OPEN_GENERIC_SCOPE'], ADD: ['CLOSED_DIRECT (weapon scopes melee, ranged, unarmed, lightsaber, pistol only)'], gapRule: 'any other form, or a mix of closed and open/other forms, stays unresolved' }, generalPolicies: GENERAL_POLICIES.map(p => p.id) };
  return { gaps: gapsRep, closure: closureRep, gapsMd: renderGapsMd(gapsRep), closureMd: renderClosureMd(closureRep) };
}

import { fileURLToPath } from 'node:url';
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const mode = process.argv[2] || '--check';
  const discovery = buildDiscovery().rep, baseline = readJson(BASELINE3B_PATH);
  const rows = sweep(discovery, baseline);
  const w = (rel, txt) => fs.writeFileSync(path.join(ROOT, rel), txt);
  if (mode === '--write-overlay') {
    w(OWNER_OVERLAY_PATH, JSON.stringify(writeOverlay(rows, discovery), null, 2) + '\n');
    const d = buildDecisions(rows); console.log(`BULK CLOSURE OVERLAY WRITTEN: ${d.length} policy-derived decisions (${d.filter(x => x.ownerAction === 'ADD').length} ADD / ${d.filter(x => x.ownerAction === 'NO_CHANGE').length} NO_CHANGE); ${rows.length - d.length} unresolved`);
  } else if (mode === '--write-reports') {
    const out = buildReports(rows, discovery, baseline);
    w(GAPS_JSON, JSON.stringify(out.gaps, null, 2) + '\n'); w(GAPS_MD, out.gapsMd); w(CLOSURE_JSON, JSON.stringify(out.closure, null, 2) + '\n'); w(CLOSURE_MD, out.closureMd);
    const k = out.closure.counts; console.log(`BULK CLOSURE REPORTS: start ${k.startingUnresolvedRecordLevel}; derived ${k.resolvedByPolicy} (ADD ${k.policyDerivedAdd} / NC ${k.policyDerivedNoChange}); unresolved ${k.unresolvedRecordLevel}; policy gaps ${k.policyGaps}; tag-def remaining ${k.tagDefinitionRemaining}; convention remaining ${k.tagConventionRemaining}; ontology gaps ${k.ontologyGaps}`);
  } else {
    const ov = readJson(OWNER_OVERLAY_PATH), want = writeOverlay(rows, discovery);
    const out = buildReports(rows, discovery, baseline);
    const same = JSON.stringify(ov) === JSON.stringify(want) && fs.readFileSync(path.join(ROOT, GAPS_JSON), 'utf8') === JSON.stringify(out.gaps, null, 2) + '\n' && fs.readFileSync(path.join(ROOT, GAPS_MD), 'utf8') === out.gapsMd && fs.readFileSync(path.join(ROOT, CLOSURE_JSON), 'utf8') === JSON.stringify(out.closure, null, 2) + '\n' && fs.readFileSync(path.join(ROOT, CLOSURE_MD), 'utf8') === out.closureMd;
    if (!same) { console.error('Committed bulk-closure overlay/reports differ from a fresh derivation'); process.exit(1); }
    console.log('PASS 3B POLICY CLOSURE MATCHES A FRESH DERIVATION');
  }
}
