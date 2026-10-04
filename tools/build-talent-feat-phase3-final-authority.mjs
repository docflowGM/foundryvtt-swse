#!/usr/bin/env node
// Phase 3 Final Owner Adjudication and Freeze (AUDIT AUTHORITY ONLY; no production mutation).
// Applies the owner's final definitions: 196 former unresolved findings, force-point retirement/migration, four new-tag population sweeps,
// hard-implication closure, and the existing-tag compliance REMOVEs. Deterministic and byte-stable (no timestamps).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ROOT, REQUIRED_IMPLICATIONS } from './validate-feat-tags-semantic-authority.mjs';
import { FINAL_DEFINITIONS, FINAL_CLASSIFICATION_RULE, EXACT_SKILL_POLICY_TEXT, NEW_TAGS, RETIRED_TAG, PREVIOUSLY_RETIRED_TAGS, NEW_HARD_IMPLICATION } from './talent-feat-phase3-final-definitions.mjs';
import { FINDING_ADDS, ADD_BASIS, NO_CHANGE_BASIS, COMPLIANCE_REMOVES } from './talent-feat-phase3-final-decisions.mjs';
import { RELATED_DISTINCT } from './talent-feat-owner-policy-map.mjs';

export const OUT = {
  rulingsJson: 'data/audits/talent-feat-phase3-final-owner-rulings.json', rulingsMd: 'docs/audits/talent-feat-phase3-final-owner-rulings.md',
  authJson: 'data/audits/talent-feat-phase3-final-semantic-authority.json', authMd: 'docs/audits/talent-feat-phase3-final-semantic-authority.md',
  ontJson: 'data/audits/talent-feat-phase3-final-ontology.json', ontMd: 'docs/audits/talent-feat-phase3-final-ontology.md',
  closeJson: 'data/audits/talent-feat-phase3-closeout.json', closeMd: 'docs/audits/talent-feat-phase3-closeout.md'
};
const SRC = {
  baseline: 'data/audits/talent-feat-pass3b-mechanic-baseline.json', auth3b: 'data/audits/talent-feat-pass3b-semantic-authority.json', gaps: 'data/audits/talent-feat-pass3b-policy-gaps.json',
  overlay: 'data/audits/talent-feat-pass3b-owner-adjudication.json', packet: 'data/audits/talent-feat-phase3-final-owner-policy-packet.json', ont3d: 'data/audits/talent-feat-phase3d-ontology-authority.json'
};
export const PRODUCTION_FILES = ['packs/talents.db', 'packs/feats.db', 'data/feat-catalog.json'];
export const SOURCE_FINDING = 'PHASE3_FINAL_OWNER_POLICY_DERIVED';
export const SOURCE_REMOVE = 'PHASE3_FINAL_OWNER_POLICY_DERIVED_REMOVE';
export const HARD_IMPLICATIONS = [...REQUIRED_IMPLICATIONS, NEW_HARD_IMPLICATION];
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const J = (o) => JSON.stringify(o, null, 2) + '\n';
const c = (x) => '`' + x + '`';
const sentences = (text) => String(text).replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+(?=[A-Z("“])/).filter(Boolean);
const sha256 = (rel) => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex');
const k = (r) => `${r.domain}:${r.canonicalId}`;

// ---------------- deterministic new-tag scanners (owner definitions, sections 6-8 and 4) ----------------
const CT_WORD = /\bcondition tracks?\b|\bCT\b/i;
const CT_EXCLUDE = /\bsummary table\b|\bcontradict|\berrata\b|\bincorrect/i;
const CT_PATTERNS = [
  /\bmov(?:e|es|ed|ing)\b[^.]{0,90}?(?:[+\-−–]\s?\d+|\b(?:one|two|three|\d+)\b)(?: or more)?\s*(?:persistent\s+)?steps?\b/i,
  /\bmov(?:e|es|ed|ing)\b[^.]{0,40}\b(?:one|an?|1)\s+(?:fewer|additional|extra|less)\s+(?:persistent\s+)?steps?\b/i,
  /\bmov(?:e|es)\b[^.]{0,20}[+\-−–]\d+\s+CT\b/i,
  /\b(?:instead of|rather than)\s+mov(?:e|es|ing)\b[^.]{0,30}\bdown\b/i,
  /\b(?:do|does|did) not(?:,? in fact,?)?\s+mov(?:e|es)\b[^.]{0,40}\b(?:down|along)\b/i,
  /\bavoids? moving\b|\bnegate that movement\b|\bpreventing [^.]{0,30}from moving\b|\bchoose not to move\b|\breduce the number of steps\b|\bnot moved one extra step\b|\bstop at the -?\d+ step\b/i,
  /\bmoves? (?:the target|it|them|an opponent) down the condition track\b/i,
  /\buntil [^.]{0,40}\bmoves? to the normal state on the condition track\b/i
];
const FRA_PATTERNS = [/\bfull[- ]round actions?\b/i, /\bfull-round\s*(?:→|->)/i, /\bfull-round (?:designate|melee area attack)\b/i];
const ION_PATTERN = /\bion\b/i;
const FP_NOT_ROLL = String.raw`(?!\s+(?:roll|die|dice|total|result))`;
const RG_GAIN_FP = new RegExp(String.raw`\b(?:gain|gains|receive|receives)\s+(?:one |1 |a |an |another )?(?:temporary |bonus )?Force Points?\b${FP_NOT_ROLL}`, 'i');
const RG_GRANT_FP = new RegExp(String.raw`\bgrants?\b[^.]{0,50}?\b(?:a |an |one )(?:temporary |bonus )?Force Point\b${FP_NOT_ROLL}`, 'i');
const RG_EXTRA_USE = /\b(?:add|adds|gain|gains|grants?)\b[^.]{0,30}\b(?:an? )?(?:extra|additional) use\b/i;
const RG_TRANSFER = /\badds? \d+ to the Force Point total\b/i;
// persistent-allotment wording is capacity, not gain; "per encounter" marks a standing change to uses only for the extra-use form
const RG_CAPACITY_EXCLUDE = /\badditional Force Points\b|\beach day\b|\beach level\b|\bgain a level\b/i;
const rgHit = (s) => !RG_CAPACITY_EXCLUDE.test(s) && (RG_GAIN_FP.test(s) || RG_GRANT_FP.test(s) || RG_TRANSFER.test(s) || (RG_EXTRA_USE.test(s) && !/\bper encounter\b/i.test(s)));
const RECOVERY_PATTERN = /\b(?:regain\w*|return\w*|restor\w*|refund\w*|recover\w*|replenish\w*)\b[^.]{0,80}\b(?:Force Points?|Force powers?|spent|expended|uses?)\b/i;
const CAPACITY_PATTERN = /\badditional Force Points?\b|\bextra Force Points?\b|\beach level\b|\bper level\b|\bForce power suite\b|\bnumber of Force powers\b|\badditional Force powers?\b/i;
const FP_SPEND = /\bspend(?:s|ing)?\b[^.]{0,20}\bForce Points?\b/i;
const FP_CAPACITY_GAIN = /\badditional Force Points?\b[^.]{0,40}\b(?:each|every|per) (?:level|day)\b|\b(?:each|every|per) level\b[^.]{0,40}\badditional Force Points?\b/i;

export const SCANNERS = {
  condition_track: (s) => CT_WORD.test(s) && !CT_EXCLUDE.test(s) && CT_PATTERNS.some(re => re.test(s)),
  full_round_action: (s) => FRA_PATTERNS.some(re => re.test(s)),
  ion: (s) => ION_PATTERN.test(s.replace(/\bnon-ion\b/gi, '')),
  resource_gain: rgHit
};

function resolvePrefix(findings, letter, prefix, tag) {
  const m = findings.filter(f => f.domain[0] === letter && f.canonicalId.startsWith(prefix) && f.tag === tag);
  if (m.length !== 1) throw new Error(`PHASE3 FINAL BUILD FAILED: ${letter}:${prefix}|${tag} resolved to ${m.length} findings`);
  return m[0];
}

export function buildAll() {
  const baseline = readJson(SRC.baseline), a3b = readJson(SRC.auth3b), gaps = readJson(SRC.gaps), overlay = readJson(SRC.overlay), ont3d = readJson(SRC.ont3d), pkt = readJson(SRC.packet);
  const err = (m) => { throw new Error(`PHASE3 FINAL BUILD FAILED: ${m}`); };
  // ---- vocabulary (187 - force-point + 4) ----
  const vocab3b = baseline.sharedVocabulary;
  if (vocab3b.length !== 187 || !vocab3b.includes(RETIRED_TAG)) err('unexpected 3B vocabulary');
  const vocab = [...vocab3b.filter(t => t !== RETIRED_TAG), ...NEW_TAGS];
  if (vocab.length !== 190 || new Set(vocab).size !== 190) err('final vocabulary is not 190 unique tags');
  const vset = new Set(vocab);
  for (const t of vocab) if (!FINAL_DEFINITIONS[t]) err(`no owner definition for ${t}`);
  // ---- records ----
  const text = new Map(baseline.records.map(r => [k(r), r]));
  const recs = a3b.records.map(r => ({ ...r, tags: [...r.finalTags], pass3bTags: [...r.finalTags], ops: [] }));
  const byKey = new Map(recs.map(r => [k(r), r]));
  if (recs.length !== 1540) err('record count');
  const ownerAdd = new Set(overlay.decisions.filter(d => d.ownerAction === 'ADD').map(d => d.decisionId));
  const protectedTag = (r, tag) => ownerAdd.has(`${k(r)}|${tag}`);
  const add = (r, tag, source, extra = {}) => { if (!vset.has(tag)) err(`ADD of unknown tag ${tag}`); if (r.tags.includes(tag)) return false; r.tags.push(tag); r.ops.push({ op: 'ADD', tag, source, ...extra }); return true; };
  const remove = (r, tag, source, extra = {}) => { if (!r.tags.includes(tag)) return false; r.tags.splice(r.tags.indexOf(tag), 1); r.ops.push({ op: 'REMOVE', tag, source, ...extra }); return true; };

  // ---- 1. the 196 former unresolved findings ----
  const findings = [], seen = new Set();
  for (const g of gaps.gaps) for (const r of g.records) {
    const id = `${r.domain}:${r.canonicalId}|${g.tag}`;
    if (seen.has(id)) continue; seen.add(id);
    findings.push({ id, domain: r.domain, canonicalId: r.canonicalId, name: r.name, tag: g.tag, detector: r.detector, clauses: r.matchedClauses.map(m => m.sentence) });
  }
  if (findings.length !== 196 || pkt.counts.unresolvedRecordFindings !== 196) err(`unresolved findings ${findings.length}`);
  const addSet = new Set(FINDING_ADDS.map(([l, p, t]) => resolvePrefix(findings, l, p, t).id));
  if (addSet.size !== FINDING_ADDS.length) err('duplicate finding ADD entries');
  const findingDecisions = findings.map(f => {
    const rec = byKey.get(`${f.domain}:${f.canonicalId}`), act = addSet.has(f.id) ? 'ADD' : 'NO_CHANGE';
    if (!text.get(k(rec))?.evidence) err(`SOURCE_EVIDENCE_BLOCKER ${f.id}`);
    if (rec.tags.includes(f.tag)) err(`finding ${f.id} tag already present`);
    if (act === 'ADD') add(rec, f.tag, SOURCE_FINDING, { decisionId: f.id });
    const def = FINAL_DEFINITIONS[f.tag];
    return { decisionId: f.id, domain: f.domain, canonicalId: f.canonicalId, name: f.name, tag: f.tag, ownerAction: act, decisionSource: SOURCE_FINDING, detectorEvidenceReference: [f.detector],
      controllingDefinition: { tag: f.tag, policies: def.policies }, ownerRationale: act === 'ADD' ? ADD_BASIS[f.tag] : NO_CHANGE_BASIS[f.tag], evidence: f.clauses };
  });
  for (const d of findingDecisions) if (!d.ownerRationale || d.ownerRationale === 'n/a') err(`no rationale basis for ${d.tag} ${d.ownerAction}`);
  findingDecisions.sort((x, y) => cmp(x.tag, y.tag) || cmp(x.domain, y.domain) || cmp(x.name, y.name) || cmp(x.canonicalId, y.canonicalId));

  // ---- 2. force-point retirement / migration (before sweeps so resource_gain interacts correctly) ----
  const fpMigration = [];
  const pendingFp = recs.filter(r => r.tags.includes(RETIRED_TAG));
  // ---- 3. four new-tag population sweeps ----
  const sweeps = Object.fromEntries(NEW_TAGS.map(t => [t, { scanned: recs.length, hits: [], added: 0, alreadyHadTag: 0 }]));
  for (const r of recs) {
    const rec = text.get(k(r));
    for (const t of NEW_TAGS) {
      const hit = sentences(rec.evidence).filter(SCANNERS[t]);
      if (!hit.length) continue;
      const had = r.tags.includes(t);
      sweeps[t].hits.push({ domain: r.domain, canonicalId: r.canonicalId, name: r.name, evidence: hit });
      if (had) sweeps[t].alreadyHadTag++; else { add(r, t, 'NEW_TAG_SWEEP'); sweeps[t].added++; }
    }
  }
  // ---- 2 (cont). force-point migration onto the precise resource semantics ----
  for (const r of pendingFp) {
    const rec = text.get(k(r)), before = [...r.tags], fpSentences = sentences(rec.evidence).filter(s => /Force Points?/i.test(s));
    remove(r, RETIRED_TAG, 'FORCE_POINT_RETIRED');
    const rep = [];
    if (FP_SPEND.test(rec.evidence)) { if (add(r, 'force_point_spend', 'FORCE_POINT_MIGRATION')) rep.push('force_point_spend'); }
    if (r.tags.includes('force_point_spend')) rep.push('force_point_spend+resource_spend');
    if (FP_CAPACITY_GAIN.test(rec.evidence)) { add(r, 'force_capacity', 'FORCE_POINT_MIGRATION'); rep.push('force_capacity'); }
    if (r.tags.includes('resource_gain')) rep.push('resource_gain');
    fpMigration.push({ domain: r.domain, canonicalId: r.canonicalId, name: r.name, before, evidence: fpSentences, representation: [...new Set(rep)] });
  }
  // ---- 4. resource semantics are four distinct concepts: gain-only records cannot keep recovery/capacity (RESOURCE_RECOVERY_POLICY, FORCE_CAPACITY_POLICY) ----
  const policyRemovals = [];
  for (const r of recs) {
    if (!r.ops.some(o => o.tag === 'resource_gain' && o.op === 'ADD') && !pendingFp.includes(r)) continue;
    if (!r.tags.includes('resource_gain') && !pendingFp.includes(r)) continue;
    const ev = text.get(k(r)).evidence;
    if (r.tags.includes('resource_recovery') && !RECOVERY_PATTERN.test(ev) && !protectedTag(r, 'resource_recovery')) { remove(r, 'resource_recovery', SOURCE_REMOVE, { controllingPolicies: ['RESOURCE_RECOVERY_POLICY'] }); policyRemovals.push({ domain: r.domain, canonicalId: r.canonicalId, name: r.name, tag: 'resource_recovery', controllingPolicies: ['RESOURCE_RECOVERY_POLICY'], reason: 'The mechanic restores no previously spent or expended resource; resource_recovery excludes creating a new temporary resource and increasing capacity.' }); }
    if (r.tags.includes('force_capacity') && !CAPACITY_PATTERN.test(ev) && !protectedTag(r, 'force_capacity')) { remove(r, 'force_capacity', SOURCE_REMOVE, { controllingPolicies: ['FORCE_CAPACITY_POLICY'] }); policyRemovals.push({ domain: r.domain, canonicalId: r.canonicalId, name: r.name, tag: 'force_capacity', controllingPolicies: ['FORCE_CAPACITY_POLICY'], reason: 'The mechanic grants a temporary spendable resource only; no persistent/additional Force-resource capacity is increased.' }); }
  }
  // ---- 5. existing-tag compliance REMOVEs ----
  const complianceRemovals = COMPLIANCE_REMOVES.map(([l, p, tag, pols, reason]) => {
    const m = recs.filter(r => r.domain[0] === l && r.canonicalId.startsWith(p));
    if (m.length !== 1) err(`compliance target ${l}:${p} resolved to ${m.length}`);
    const r = m[0];
    if (protectedTag(r, tag)) err(`compliance REMOVE of ${tag} on ${r.name} contradicts a prior owner ADD decision`);
    if (!r.tags.includes(tag)) err(`compliance REMOVE: ${r.name} does not carry ${tag}`);
    remove(r, tag, SOURCE_REMOVE, { controllingPolicies: pols });
    return { domain: r.domain, canonicalId: r.canonicalId, name: r.name, tag, decisionSource: SOURCE_REMOVE, controllingDefinition: { tag, policies: FINAL_DEFINITIONS[tag].policies }, controllingPolicies: pols, reason };
  });
  // ---- 6. hard-implication closure (explicit owner implications only) ----
  const implicationAdds = [];
  for (let changed = true; changed;) {
    changed = false;
    for (const r of recs) for (const [a, b] of HARD_IMPLICATIONS) if (r.tags.includes(a) && !r.tags.includes(b)) { add(r, b, 'HARD_IMPLICATION', { implication: `${a}->${b}` }); implicationAdds.push({ domain: r.domain, canonicalId: r.canonicalId, name: r.name, implied: b, because: a }); changed = true; }
  }
  // ---- validation ----
  const violations = [];
  const V = (rule, r, detail) => violations.push({ state: 'PASS3C_POLICY_VIOLATION', rule, domain: r.domain, canonicalId: r.canonicalId, name: r.name, detail });
  const retiredAll = [RETIRED_TAG, ...PREVIOUSLY_RETIRED_TAGS];
  for (const r of recs) {
    if (new Set(r.tags).size !== r.tags.length) V('NO_DUPLICATE_TAGS', r, 'duplicate tag');
    for (const t of r.tags) { if (!vset.has(t)) V('SHARED_VOCABULARY_ONLY', r, `unknown tag ${t}`); if (retiredAll.includes(t)) V('RETIRED_TAG_ABSENT', r, t); }
    for (const [a, b] of HARD_IMPLICATIONS) if (r.tags.includes(a) && !r.tags.includes(b)) V('HARD_IMPLICATION', r, `${a} requires ${b}`);
    const removed = new Set(r.ops.filter(o => o.op === 'REMOVE').map(o => o.tag));
    for (const t of r.baselineTags) if (!r.tags.includes(t) && !removed.has(t)) V('BASELINE_PRESERVED', r, `${t} lost without a recorded REMOVE`);
  }
  for (const d of overlay.decisions) {
    const r = byKey.get(`${d.domain}:${d.canonicalId}`);
    if (d.ownerAction === 'ADD' && !r.tags.includes(d.tag)) V('PRIOR_OWNER_ADD_PRESERVED', r, `${d.tag} missing`);
    if (d.ownerAction === 'NO_CHANGE' && r.tags.includes(d.tag) && !r.baselineTags.includes(d.tag) && !r.ops.some(o => o.tag === d.tag)) V('PRIOR_OWNER_NO_CHANGE_RESPECTED', r, `${d.tag} present`);
  }
  for (const d of findingDecisions) { const r = byKey.get(`${d.domain}:${d.canonicalId}`); if (d.ownerAction === 'NO_CHANGE' && r.ops.some(o => o.op === 'ADD' && o.tag === d.tag && o.source === SOURCE_FINDING)) V('FINDING_NO_CHANGE_RESPECTED', r, d.tag); }
  violations.sort((x, y) => cmp(x.rule, y.rule) || cmp(x.domain, y.domain) || cmp(x.canonicalId, y.canonicalId));
  return { vocab, vocab3b, recs, text, findingDecisions, fpMigration, sweeps, policyRemovals, complianceRemovals, implicationAdds, violations, overlay, ont3d, pkt, baseline, a3b, gaps };
}

const usage = (recs, vocab) => {
  const u = Object.fromEntries(vocab.map(t => [t, { feats: 0, talents: 0 }]));
  for (const r of recs) for (const t of r.tags) if (u[t]) u[t][r.domain === 'FEAT' ? 'feats' : 'talents']++;
  return u;
};

export function buildOutputs() {
  const B = buildAll(), { recs, vocab } = B, feats = recs.filter(r => r.domain === 'FEAT'), talents = recs.filter(r => r.domain === 'TALENT');
  const u = usage(recs, vocab);
  const addsFromBaseline = recs.reduce((a, r) => a + r.tags.filter(t => !r.baselineTags.includes(t)).length, 0);
  const removesFromBaseline = recs.reduce((a, r) => a + r.baselineTags.filter(t => !r.tags.includes(t)).length, 0);
  const changed = recs.filter(r => r.tags.length !== r.baselineTags.length || r.tags.some(t => !r.baselineTags.includes(t)) || r.baselineTags.some(t => !r.tags.includes(t)));
  const instBefore = recs.reduce((a, r) => a + r.baselineTags.length, 0), instAfter = recs.reduce((a, r) => a + r.tags.length, 0);
  const instPass3b = recs.reduce((a, r) => a + r.pass3bTags.length, 0);
  const fd = B.findingDecisions, fAdd = fd.filter(d => d.ownerAction === 'ADD').length, fNo = fd.length - fAdd;
  const ops = (src) => recs.reduce((a, r) => a + r.ops.filter(o => src(o)).length, 0);
  const counts = {
    feats: feats.length, talents: talents.length, identities: recs.length, vocabulary: vocab.length, tagInstancesBaseline3B: instBefore, tagInstancesBeforePhase3Final: instPass3b, tagInstancesFinal: instAfter,
    addsFromBaseline, removesFromBaseline, recordsChangedFromBaseline: changed.length, recordsChangedByPhase3Final: recs.filter(r => r.ops.length).length,
    phase3FinalAdds: ops(o => o.op === 'ADD'), phase3FinalRemoves: ops(o => o.op === 'REMOVE'),
    findingAdds: fAdd, findingNoChange: fNo, findingRemove: 0, sourceEvidenceBlocker: 0, complianceRemovals: B.complianceRemovals.length, policyConsequenceRemovals: B.policyRemovals.length,
    forcePointRecords: B.fpMigration.length, forcePointFinalUse: u['force-point'] ? u['force-point'].feats + u['force-point'].talents : 0,
    implicationAdds: B.implicationAdds.length, newTagAddsFromSweeps: NEW_TAGS.reduce((a, t) => a + B.sweeps[t].added, 0)
  };
  const rulings = {
    schemaVersion: '1.0', kind: 'TALENT_FEAT_PHASE3_FINAL_OWNER_RULINGS', status: 'OWNER_FINAL_RULINGS_APPLIED_AUDIT_ONLY', productionMutated: false,
    note: 'Owner final adjudication, applied deterministically. Decision sources: PHASE3_FINAL_OWNER_POLICY_DERIVED (ADD/NO_CHANGE) and PHASE3_FINAL_OWNER_POLICY_DERIVED_REMOVE. SOURCE_EVIDENCE_BLOCKER is the only allowed unresolved state; none occurred.',
    finalClassificationRule: FINAL_CLASSIFICATION_RULE,
    ontologyChange: { before: 187, added: NEW_TAGS, retired: [RETIRED_TAG], after: 190, noOtherCreationOrRetirementAuthorized: true },
    newHardImplication: { if: NEW_HARD_IMPLICATION[0], requires: NEW_HARD_IMPLICATION[1] }, noAutomaticImplicationsFor: ['condition_track', 'ion', 'resource_gain'],
    ownerPolicyAdded: { id: 'EXACT_SKILL_POLICY', text: EXACT_SKILL_POLICY_TEXT },
    resourceDistinctions: { resource_spend: 'consumes', resource_recovery: 'restores previously spent', force_capacity: 'persistent/max allotment', resource_gain: 'creates/grants new spendable resource now' },
    counts,
    tagQuestionDisposition: { tagDefinitionQuestionsBefore: B.ont3d.counts.ownerDefinitionRequired + B.ont3d.counts.partiallyOwnerDefined, tagDefinitionQuestionsOpenAfter: 0, tagConventionQuestionsBefore: 14, tagConventionQuestionsOpenAfter: 0, ontologyGapsBefore: 3, ontologyGapsAfter: 0,
      conventionResolution: 'Resolved by the final definitions; the owner authorizes no corpus-wide search for missing tags, so untagged detector matches remain NO_CHANGE.', ontologyGapResolution: { condition_track: 'condition_track', full_round_action: 'full_round_action', recurring_ion_mechanics: 'ion' } },
    findingDecisions: fd, complianceRemovals: B.complianceRemovals, policyConsequenceRemovals: B.policyRemovals, forcePointMigration: B.fpMigration,
    newTagSweeps: Object.fromEntries(NEW_TAGS.map(t => [t, { definition: FINAL_DEFINITIONS[t].text, scanned: B.sweeps[t].scanned, matchedRecords: B.sweeps[t].hits.length, newlyAdded: B.sweeps[t].added, finalRecords: u[t].feats + u[t].talents, hits: B.sweeps[t].hits }])),
    hardImplicationAdds: B.implicationAdds
  };
  const authRecords = recs.map(r => ({ domain: r.domain, canonicalId: r.canonicalId, name: r.name, source: r.source, page: r.page, baselineTags: r.baselineTags, pass3bWorkingTags: r.pass3bTags, finalTags: r.tags,
    added: r.tags.filter(t => !r.baselineTags.includes(t)), removed: r.baselineTags.filter(t => !r.tags.includes(t)), phase3FinalOperations: r.ops, certified: true }));
  const authObj = { schemaVersion: '1.0', kind: 'TALENT_FEAT_PHASE3_FINAL_SEMANTIC_AUTHORITY', status: 'PHASE3_FINAL_AUDIT_AUTHORITY_NOT_APPLIED_TO_PRODUCTION', productionMutated: false,
    derivedFrom: { pass3bAuthority: SRC.auth3b, ownerRulings: OUT.rulingsJson, ontology: OUT.ontJson }, vocabulary: vocab, counts, tagUsage: Object.fromEntries(vocab.map(t => [t, u[t].feats + u[t].talents])), records: authRecords };
  // ---- ontology ----
  const ontTags = vocab.map(t => {
    const d = FINAL_DEFINITIONS[t], tot = u[t].feats + u[t].talents;
    return { tag: t, definitionStatus: 'OWNER_DEFINED', newInPhase3: NEW_TAGS.includes(t), definition: d.text, controllingPolicyIds: d.policies, relatedDistinctTags: RELATED_DISTINCT.filter(p => p.includes(t)).map(p => p.find(x => x !== t)).sort(cmp),
      hardImplications: { implies: HARD_IMPLICATIONS.filter(([a]) => a === t).map(([, b]) => b), impliedBy: HARD_IMPLICATIONS.filter(([, b]) => b === t).map(([a]) => a) }, usage: { records: tot, feats: u[t].feats, talents: u[t].talents, domainStatus: tot === 0 ? 'UNUSED' : u[t].feats === 0 ? 'TALENT_ONLY' : u[t].talents === 0 ? 'FEAT_ONLY' : 'BOTH_DOMAINS' } };
  });
  const ontObj = { schemaVersion: '1.0', kind: 'TALENT_FEAT_PHASE3_FINAL_ONTOLOGY', status: 'PHASE3_FINAL_ONTOLOGY_ALL_TAGS_OWNER_DEFINED', counts: { vocabulary: 190, ownerDefined: ontTags.length, partiallyOwnerDefined: 0, ownerDefinitionRequired: 0, ontologyGaps: 0, hardImplications: HARD_IMPLICATIONS.length, tagsAdded: NEW_TAGS.length, tagsRetired: 1 },
    tagsAdded: NEW_TAGS, tagsRetired: [RETIRED_TAG], previouslyRetiredTagsStillAtZero: PREVIOUSLY_RETIRED_TAGS, hardImplications: HARD_IMPLICATIONS.map(([a, b]) => ({ if: a, requires: b })), ownerPolicies: { EXACT_SKILL_POLICY: EXACT_SKILL_POLICY_TEXT }, tags: ontTags };
  // ---- closeout / exit gate ----
  const viol = B.violations;
  const retiredUse = Object.fromEntries([RETIRED_TAG, ...PREVIOUSLY_RETIRED_TAGS].map(t => [t, recs.filter(r => r.tags.includes(t)).length]));
  const unknown = recs.reduce((a, r) => a + r.tags.filter(t => !vocab.includes(t)).length, 0);
  const implViol = viol.filter(v => v.rule === 'HARD_IMPLICATION').length;
  const gate = {
    'feats certified (353/353)': feats.length === 353 && viol.length === 0, 'talents certified (1,187/1,187)': talents.length === 1187 && viol.length === 0, 'identities certified (1,540/1,540)': recs.length === 1540 && viol.length === 0,
    'final vocabulary = 190': vocab.length === 190, 'PASS3B_OWNER_REVIEW = 0': fd.every(d => ['ADD', 'NO_CHANGE'].includes(d.ownerAction)) && fd.length === 196, 'PASS3C_POLICY_VIOLATION = 0': viol.length === 0,
    'PHASE3D_OWNER_DEFINITION_REQUIRED = 0': ontObj.counts.ownerDefinitionRequired === 0, 'PARTIALLY_OWNER_DEFINED = 0': ontObj.counts.partiallyOwnerDefined === 0, 'SOURCE_EVIDENCE_BLOCKER = 0': counts.sourceEvidenceBlocker === 0,
    'unknown tags = 0': unknown === 0, 'active retired tags = 0': Object.values(retiredUse).every(x => x === 0), 'hard implication violations = 0': implViol === 0, 'ontology gaps = 0': ontObj.counts.ontologyGaps === 0,
    'hard implications include the prior 10 plus full_round_action -> action_economy': HARD_IMPLICATIONS.length === 11 && REQUIRED_IMPLICATIONS.length === 10
  };
  const pass = Object.values(gate).every(Boolean);
  const closeObj = { schemaVersion: '1.0', kind: 'TALENT_FEAT_PHASE3_CLOSEOUT', status: pass ? 'PHASE3_EXIT_GATE_PASSED' : 'PHASE3_EXIT_GATE_FAILED', productionMutated: false, exitGate: gate, exitGatePassed: pass, counts, retiredTagUse: retiredUse,
    policyViolations: viol, newTagPopulations: Object.fromEntries(NEW_TAGS.map(t => [t, u[t].feats + u[t].talents])),
    productionFilesSha256: Object.fromEntries(PRODUCTION_FILES.map(f => [f, sha256(f)])), productionBoundaryNote: 'No production file is modified by this pass; the test suite compares these files with main.' };
  // ---- markdown ----
  const gateRows = Object.entries(gate).map(([n, v]) => `| ${n} | ${v ? 'PASS' : 'FAIL'} |`);
  const L = {};
  L.rulings = ['# Phase 3 — Final Owner Rulings (applied)', '', `Status: ${c(rulings.status)}. Audit authority only; production untouched.`, '',
    `Ontology: 187 → **190** (added ${NEW_TAGS.map(c).join(', ')}; retired ${c(RETIRED_TAG)}). New hard implication: ${c('full_round_action')} → ${c('action_economy')}. Owner policy added: ${c('EXACT_SKILL_POLICY')}.`, '',
    '## Former unresolved findings (196)', '', `- ADD: **${fAdd}**; NO_CHANGE: **${fNo}**; REMOVE: 0; SOURCE_EVIDENCE_BLOCKER: 0.`, '', '| Tag | ADD | NO_CHANGE |', '| --- | --- | --- |',
    ...[...new Set(fd.map(d => d.tag))].sort(cmp).map(t => `| ${c(t)} | ${fd.filter(d => d.tag === t && d.ownerAction === 'ADD').length} | ${fd.filter(d => d.tag === t && d.ownerAction === 'NO_CHANGE').length} |`), '',
    '### ADD decisions', '', ...fd.filter(d => d.ownerAction === 'ADD').map(d => `- ${d.name} (${d.domain} ${c(d.canonicalId)}): ADD ${c(d.tag)} — ${d.ownerRationale}`), '',
    '### NO_CHANGE decisions', '', ...[...new Set(fd.map(d => d.tag))].sort(cmp).map(t => `- ${c(t)}: ${fd.filter(d => d.tag === t && d.ownerAction === 'NO_CHANGE').map(d => d.name).join('; ') || '—'} — ${NO_CHANGE_BASIS[t] === 'n/a' ? '' : NO_CHANGE_BASIS[t]}`), '',
    '## Existing-tag compliance REMOVEs', '', ...[...B.complianceRemovals, ...B.policyRemovals].map(x => `- ${x.name} (${x.domain} ${c(x.canonicalId)}): REMOVE ${c(x.tag)} — ${x.reason}`), '',
    `## ${c(RETIRED_TAG)} migration (${B.fpMigration.length} records, final use 0)`, '', '| Record | Before | Final representation |', '| --- | --- | --- |', ...B.fpMigration.map(m => { const r = recs.find(x => x.canonicalId === m.canonicalId && x.domain === m.domain); return `| ${m.name} (${m.domain}) | ${m.before.filter(t => /force|resource/.test(t)).join(', ')} | ${r.tags.filter(t => /force_point|force_capacity|resource|force_multiplier/.test(t)).join(', ')} |`; }), '',
    '## New-tag populations', '', '| Tag | Matched | Newly added | Final records |', '| --- | --- | --- | --- |', ...NEW_TAGS.map(t => `| ${c(t)} | ${B.sweeps[t].hits.length} | ${B.sweeps[t].added} | ${u[t].feats + u[t].talents} |`), '', `Hard-implication closure added ${B.implicationAdds.length} tag instances. Full lists are in the JSON.`, ''].join('\n');
  L.auth = ['# Phase 3 — Final Semantic Authority', '', `Status: ${c(authObj.status)}. Vocabulary 190. **Not applied to production.**`, '', ...Object.entries(counts).map(([n, v]) => `- ${n}: ${v}`), '',
    '## Records changed from the 3B baseline', '', '| Record | Added | Removed |', '| --- | --- | --- |', ...authRecords.filter(r => r.added.length || r.removed.length).map(r => `| ${r.name} (${r.domain}) | ${r.added.map(c).join(', ') || '—'} | ${r.removed.map(c).join(', ') || '—'} |`), ''].join('\n');
  L.ont = ['# Phase 3 — Final Ontology', '', `Status: ${c(ontObj.status)}. 190 tags, all ${c('OWNER_DEFINED')}.`, '', `Added: ${NEW_TAGS.map(c).join(', ')}. Retired: ${c(RETIRED_TAG)}.`, '', '## Hard implications', '', ...HARD_IMPLICATIONS.map(([a, b]) => `- ${c(a)} → ${c(b)}`), '',
    '| Tag | Records | Definition |', '| --- | --- | --- |', ...ontTags.map(t => `| ${c(t.tag)}${t.newInPhase3 ? ' (new)' : ''} | ${t.usage.records} | ${t.controllingPolicyIds.length ? `[${t.controllingPolicyIds.join(' + ')}] ` : ''}${t.definition.replace(/\|/g, '/')} |`), ''].join('\n');
  L.close = ['# Phase 3 — Closeout', '', `Status: **${closeObj.status}**.`, '', '## Exit gate', '', '| Condition | Result |', '| --- | --- |', ...gateRows, '', '## Counts', '', ...Object.entries(counts).map(([n, v]) => `- ${n}: ${v}`), '', '## Retired tag use', '', ...Object.entries(retiredUse).map(([t, n]) => `- ${c(t)}: ${n}`), '',
    '## Literal policy violations', '', ...(viol.length ? viol.map(v => `- ${v.rule}: ${v.name} — ${v.detail}`) : ['- none']), ''].join('\n');
  return { [OUT.rulingsJson]: J(rulings), [OUT.rulingsMd]: L.rulings, [OUT.authJson]: J(authObj), [OUT.authMd]: L.auth, [OUT.ontJson]: J(ontObj), [OUT.ontMd]: L.ont, [OUT.closeJson]: J(closeObj), [OUT.closeMd]: L.close, _counts: counts, _gate: gate, _pass: pass };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const out = buildOutputs(), files = Object.keys(out).filter(x => !x.startsWith('_'));
  if (process.argv.includes('--check')) { for (const f of files) if (fs.readFileSync(path.join(ROOT, f), 'utf8') !== out[f]) { console.error(`Phase 3 final output differs: ${f}`); process.exit(1); } console.log('PHASE 3 FINAL OUTPUTS MATCH A FRESH BUILD'); }
  else { for (const f of files) fs.writeFileSync(path.join(ROOT, f), out[f]); console.log('PHASE 3 FINAL', JSON.stringify(out._counts), out._pass ? 'EXIT GATE PASSED' : 'EXIT GATE FAILED', JSON.stringify(Object.entries(out._gate).filter(([, v]) => !v).map(([n]) => n))); }
}
