#!/usr/bin/env node
// Phase 3D freeze preparation: per-tag ontology authority CANDIDATE (definitions synthesized mechanically from existing owner policy text only)
// and the single consolidated final owner policy packet. No new policy, no recommendation, no tag created/retired, no production mutation.
// Deterministic and byte-stable.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, REQUIRED_IMPLICATIONS } from './validate-feat-tags-semantic-authority.mjs';
import { POLICY_DEFINES, POLICY_PARTIAL, SKILL_TAGS, PARTIAL_AUTHORITY_REFS, RELATED_DISTINCT } from './talent-feat-owner-policy-map.mjs';
import { BROAD_TAGS } from './talent-feat-pass3b-detectors.mjs';

export const OUT = {
  ontJson: 'data/audits/talent-feat-phase3d-ontology-authority.json', ontMd: 'docs/audits/talent-feat-phase3d-ontology-authority.md',
  pktJson: 'data/audits/talent-feat-phase3-final-owner-policy-packet.json', pktMd: 'docs/audits/talent-feat-phase3-final-owner-policy-packet.md'
};
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const J = (o) => JSON.stringify(o, null, 2) + '\n';
const c = (x) => '`' + x + '`';

export function buildOutputs() {
  const census = readJson('data/audits/talent-feat-pass3c-tag-census.json'), close = readJson('data/audits/talent-feat-pass3c-closeout.json');
  const overlay = readJson('data/audits/talent-feat-pass3b-owner-adjudication.json'), gaps = readJson('data/audits/talent-feat-pass3b-policy-gaps.json');
  const clos = readJson('data/audits/talent-feat-pass3b-policy-closure.json'), disc = readJson('data/audits/talent-feat-pass3b-exact-mechanic-convergence.json');
  const pol = new Map(overlay.ownerPolicies.map(p => [p.id, p.text]));
  const gapByTag = new Map(gaps.gaps.map(g => [g.tag, g]));
  const broad = new Set(BROAD_TAGS);
  const base = readJson('data/audits/talent-feat-pass3b-mechanic-baseline.json').records;
  const finalTags = new Map(readJson('data/audits/talent-feat-pass3b-semantic-authority.json').records.map(r => [`${r.domain}:${r.canonicalId}`, r.finalTags]));
  // Deterministic examples: lowest canonical IDs carrying the tag, up to 3 feats then 2 talents; excerpt is the first 220 characters of the canonical evidence text.
  const sampleFor = (tag) => {
    const has = base.filter(r => (finalTags.get(`${r.domain}:${r.canonicalId}`) || []).includes(tag)).sort((x, y) => cmp(x.canonicalId, y.canonicalId));
    return [...has.filter(r => r.domain === 'FEAT').slice(0, 3), ...has.filter(r => r.domain === 'TALENT').slice(0, 2)].slice(0, 5)
      .map(r => ({ domain: r.domain, canonicalId: r.canonicalId, name: r.name, source: r.source, page: r.page, existingTags: finalTags.get(`${r.domain}:${r.canonicalId}`), excerpt: String(r.evidence).replace(/\s+/g, ' ').slice(0, 220) }));
  };
  const ontGapTags = new Set();
  const entries = census.tags.map(t => {
    const full = POLICY_DEFINES[t.tag] || [], part = POLICY_PARTIAL[t.tag] || [], skill = SKILL_TAGS.includes(t.tag);
    const status = full.length ? 'OWNER_DEFINED' : (part.length || skill) ? 'PARTIALLY_OWNER_DEFINED' : 'OWNER_DEFINITION_REQUIRED';
    const cites = [...full, ...part];
    const g = gapByTag.get(t.tag);
    return {
      tag: t.tag, definitionStatus: status, broadTag: broad.has(t.tag),
      synthesizedDefinition: status === 'OWNER_DEFINED' ? full.map(id => ({ policyId: id, text: pol.get(id) })) : null,
      partialAuthority: status === 'PARTIALLY_OWNER_DEFINED' ? { policies: part.map(id => ({ policyId: id, text: pol.get(id) })), ownerRulingFiles: skill ? PARTIAL_AUTHORITY_REFS.skill : [] } : null,
      relatedDistinctTags: RELATED_DISTINCT.filter(p => p.includes(t.tag)).map(p => p.find(x => x !== t.tag)).sort(cmp),
      hardImplications: t.implicationParticipation, controllingPolicyIds: cites.sort(cmp),
      usage: { records: t.records, feats: t.feats, talents: t.talents, pctOfCorpus: t.pctOfCorpus, domainStatus: t.domainStatus, rareStatus: t.rareStatus },
      detectorCoverage: t.detectorCoverage, openPolicyGap: g ? { gapId: g.gapId, unresolvedRecords: g.recordLevelUnresolved, hasTagDefinitionQuestion: g.hasTagDefinitionQuestion, hasTagConventionQuestion: g.hasTagConventionQuestion } : null
    };
  });
  const cnt = (s) => entries.filter(e => e.definitionStatus === s).length;
  const ontObj = { schemaVersion: '1.0', kind: 'TALENT_FEAT_PHASE3D_ONTOLOGY_AUTHORITY_CANDIDATE', status: 'CANDIDATE_PENDING_OWNER_RULINGS', note: 'Definitions are mechanically synthesized from existing owner policy text only. No tag created or retired.',
    counts: { tags: entries.length, ownerDefined: cnt('OWNER_DEFINED'), partiallyOwnerDefined: cnt('PARTIALLY_OWNER_DEFINED'), ownerDefinitionRequired: cnt('OWNER_DEFINITION_REQUIRED'), ontologyGaps: clos.ontologyGaps.length, hardImplicationRules: REQUIRED_IMPLICATIONS.length },
    hardImplications: REQUIRED_IMPLICATIONS.map(([a, b]) => ({ if: a, requires: b })), ontologyGaps: clos.ontologyGaps.map(g => ({ ...g, state: 'PHASE3_ONTOLOGY_GAP' })), tags: entries };
  // final packet: one group per tag that is not fully owner-defined OR has an open policy gap; plus the ontology gaps
  const groups = [];
  for (const e of entries) {
    const g = gapByTag.get(e.tag);
    if (e.definitionStatus === 'OWNER_DEFINED' && !g) continue;
    const examples = g && g.records.length ? g.records.slice(0, 5).map(r => ({ domain: r.domain, canonicalId: r.canonicalId, name: r.name, source: r.source, page: r.page, existingTags: r.existingTags, detector: r.detector, clauseForms: r.clauseForms })) : sampleFor(e.tag);
    groups.push({
      tag: e.tag, definitionStatus: e.definitionStatus, broadTag: e.broadTag, usage: e.usage, controllingPolicyIds: e.controllingPolicyIds,
      ownerQuestions: [...(e.definitionStatus !== 'OWNER_DEFINED' && !(g && /^Define when/.test(g.ownerQuestion)) ? [`Define when ${e.tag} applies.`] : []), ...(g ? [g.ownerQuestion] : [])].filter((x, i, arr) => arr.indexOf(x) === i),
      unresolvedRecordCount: g ? g.recordLevelUnresolved : 0, unresolvedRecordIds: g ? g.records.map(r => `${r.domain}:${r.canonicalId}`) : [], conventionQuestionUntaggedRecordIds: g ? g.conventionQuestionUntaggedRecordIds || [] : [],
      gapId: g ? g.gapId : null, examples
    });
  }
  const ontGaps = clos.ontologyGaps.map(x => ({ id: x.id, label: x.label, ownerQuestion: `State whether ${x.label} requires a vocabulary tag; no tag exists or is authorized.`, evidence: x }));
  const pktObj = { schemaVersion: '1.0', kind: 'TALENT_FEAT_PHASE3_FINAL_OWNER_POLICY_PACKET', status: 'AWAITING_OWNER_FINAL_PHASE3_RULINGS', note: 'Single consolidated packet. Grouped by tag. No recommendation or proposed answer. Rulings are applied by Claude only after the owner issues them.',
    counts: { tagGroups: groups.length, tagsOwnerDefinitionRequired: groups.filter(x => x.definitionStatus === 'OWNER_DEFINITION_REQUIRED').length, tagsPartiallyDefined: groups.filter(x => x.definitionStatus === 'PARTIALLY_OWNER_DEFINED').length, tagsFullyDefinedWithOpenRecordGap: groups.filter(x => x.definitionStatus === 'OWNER_DEFINED').length, unresolvedRecordFindings: groups.reduce((a, x) => a + x.unresolvedRecordCount, 0), ontologyGaps: ontGaps.length },
    ontologyGapQuestions: ontGaps, groups };
  const L1 = ['# Phase 3D — Ontology Authority Candidate', '', `Status: ${c(ontObj.status)}. Definitions are quoted from existing owner policy text; nothing is invented.`, '',
    ...Object.entries(ontObj.counts).map(([k, v]) => `- ${k}: ${v}`), '', '## Ontology gaps (no tags created)', '', ...ontObj.ontologyGaps.map(g => `- ${c(g.id)} — ${g.label}`), '',
    '| Tag | Status | Records | Controlling policies | Open gap |', '| --- | --- | --- | --- | --- |', ...entries.map(e => `| ${c(e.tag)} | ${e.definitionStatus} | ${e.usage.records} | ${e.controllingPolicyIds.join(', ') || '—'} | ${e.openPolicyGap ? `${e.openPolicyGap.unresolvedRecords} records` : '—'} |`), ''];
  const L2 = ['# Phase 3 — Final Owner Policy Packet', '', `Status: ${c(pktObj.status)}. One consolidated packet, grouped by tag. No recommendation is made; full ID lists are in the JSON.`, '',
    ...Object.entries(pktObj.counts).map(([k, v]) => `- ${k}: ${v}`), '', '## Ontology-gap questions', '', ...ontGaps.map(g => `- ${c(g.id)}: ${g.ownerQuestion}`), ''];
  for (const g of groups) {
    L2.push(`## ${c(g.tag)} — ${g.definitionStatus}${g.broadTag ? ' (broad)' : ''}`, '', `Usage: ${g.usage.records} records (${g.usage.feats} feats / ${g.usage.talents} talents). Existing policies: ${g.controllingPolicyIds.join(', ') || 'none'}. Unresolved records: ${g.unresolvedRecordCount}.`, '', ...g.ownerQuestions.map(q => `- Q: ${q}`), '', 'Examples:');
    for (const x of g.examples) L2.push(`- ${x.name} (${x.domain} ${c(x.canonicalId)}, ${x.source} p.${x.page}); tags ${(x.existingTags || []).join(', ')}${x.clauseForms ? `; forms ${x.clauseForms.join('/')}` : ''}${x.excerpt ? `; “${x.excerpt}”` : ''}`);
    L2.push('');
  }
  return { [OUT.ontJson]: J(ontObj), [OUT.ontMd]: L1.join('\n'), [OUT.pktJson]: J(pktObj), [OUT.pktMd]: L2.join('\n'), _ont: ontObj, _pkt: pktObj, _close: close };
}
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const out = buildOutputs(); const files = Object.keys(out).filter(k => !k.startsWith('_'));
  if (process.argv.includes('--check')) { for (const f of files) if (fs.readFileSync(path.join(ROOT, f), 'utf8') !== out[f]) { console.error(`Phase 3D output differs: ${f}`); process.exit(1); } console.log('PHASE 3D OUTPUTS MATCH A FRESH RUN'); }
  else { for (const f of files) fs.writeFileSync(path.join(ROOT, f), out[f]); console.log('PHASE 3D', JSON.stringify(out._ont.counts), JSON.stringify(out._pkt.counts)); }
}
