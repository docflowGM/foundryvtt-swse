#!/usr/bin/env node
// Pass 3B.1 owner packet: EVIDENCE EXTRACTION ONLY for the mechanical-primitive detectors (action economy, reroll/reliability, resource mechanics).
// Lists only findings that are currently PASS3B_OWNER_REVIEW in the committed Pass 3B discovery report (no convergent records unless used as a comparator,
// nothing already closed by a prior owner ruling). Clause labels describe wording/syntax only; they are not semantic rulings.
// The owner makes every decision. No recommendations, no proposed dispositions, no tag changes, no overlay. Deterministic.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, REQUIRED_IMPLICATIONS } from './validate-feat-tags-semantic-authority.mjs';
import { BASELINE3B_PATH } from './build-talent-feat-pass3b-mechanic-baseline.mjs';
import { buildOutputs as buildDiscovery, REPORT_JSON } from './report-talent-feat-pass3b-exact-mechanic-convergence.mjs';
import { DETECTORS, BUNDLES } from './talent-feat-pass3b-detectors.mjs';

export const PACKET_JSON = 'data/audits/talent-feat-pass3b-1-mechanical-primitives-owner-packet.json';
export const PACKET_MD = 'docs/audits/talent-feat-pass3b-1-mechanical-primitives-owner-packet.md';
export const SCOPE = ['A.cost_reaction', 'A.cost_swift', 'A.cost_move', 'A.cost_standard', 'A.grants_action', 'A.any_action_cost',
  'B.reroll', 'B.roll_twice_keep', 'B.take_10_20', 'B.automatic_success',
  'C.force_point_spend', 'C.resource_spend', 'C.resource_recovery', 'C.once_per_encounter', 'C.force_capacity'];
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// ---- Clause extraction (sentence level) ----
const splitSentences = (text) => String(text).replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+(?=[A-Z("“])/).filter(Boolean);
const ACTION_TYPE = /\b(swift|move|standard|full-round|free) action\b/i;
const ACTION_RES = {
  GRANTS_ACTION_TO_NAMED_OTHER: /\b(?:grant|grants|allow|allows|give|gives|let|lets)\b[^.]{0,60}\b(?:ally|allies|target|creature|droid|opponent|enemy|character|another|him|her|them|its|his)\b[^.]{0,60}\b(?:swift|move|standard|full-round|extra|additional)\b[^.]{0,15}action/i,
  GRANTS_ACTION_RECIPIENT_NOT_NAMED: /\b(?:grant|grants|allow|allows|give|gives)\b[^.]{0,60}\b(?:swift|move|standard|full-round|extra|additional)\b[^.]{0,15}action/i,
  CHARACTER_SPENDS_OR_COSTS_ACTION: /\b(?:spend|spends|spent|use|uses|using|take|takes|taking|costs?|requires?|expend|expends)\s+(?:an?\s+)?(?:\w+\s+)?(?:swift|move|standard|full-round|free)\s+action\b/i,
  CHARACTER_MAY_TAKE_ACTION: /\b(?:can|may|could|are able to)\s+(?:\w+\s+){0,3}(?:take|make|perform|use)\s+an?\s+(?:extra\s+|additional\s+|immediate\s+)?(?:swift|move|standard|full-round|free)\s+action\b/i,
  ACTION_TYPE_STATED_AS_ACTIVATION: /\b(?:as|at the cost of)\s+an?\s+(?:swift|move|standard|full-round|free)\s+action\b|\bas a reaction\b/i,
  ACTION_TYPE_MODIFIES_TIMING: /\b(?:instead of|rather than|becomes?|becoming|reduce[sd]?|changes?|changed to|converted? to|only a|no more than a)\b[^.]{0,40}\b(?:swift|move|standard|full-round|free)\s+action\b/i,
  COMPARISON_OR_REFERENCE_ONLY: /\b(?:normally|usually|as normal|would (?:normally )?(?:be|require|take|cost)|which (?:is|takes) an?|that (?:is|takes) an?|(?:same|longer|shorter|faster) (?:as|than))\b[^.]{0,50}\b(?:swift|move|standard|full-round|free)\s+action\b|\b(?:swift|move|standard|full-round|free)\s+action\b[^.]{0,30}\b(?:normally|usually|as normal)\b/i,
  FULL_ROUND_ACTION_WORDING: /\bfull-round action\b/i
};
const RESOURCE_TERM = /\b(?:Force Points?|Force Powers?|Destiny Points?|uses? of|daily uses?|hit points|Force Power suite)\b/i;
const RES = {
  RESOURCE_SPENT: /\b(?:spend|spends|spent|spending|expend|expends|expended|expending|sacrifice|sacrifices)\b/i,
  EFFECT_WITHOUT_SPENDING_THE_RESOURCE: /\bwithout (?:spending|expending|using up)\b|\bwithout (?:the )?(?:cost|expense) of\b/i,
  SPENDING_PREVENTED_OR_REDUCED: /\b(?:does(?:n't| not)|do(?:n't| not)|need(?:s)? not|no need to|never|no longer)\s+(?:have to\s+|need to\s+)?(?:spend|expend|cost|require|use up)\b|\b(?:reduce|reduces|reduced|lowers?)\b[^.]{0,30}\b(?:cost|number of Force Points|Force Points?)\b|\binstead of spending\b|\bnot (?:be )?(?:spent|expended)\b/i,
  RESOURCE_RECOVERED_OR_REGAINED: /\b(?:regain|regains|recover|recovers|replenish|replenishes|restore|restores|refresh|refreshes|returns? to your)\b/i,
  CAPACITY_OR_MAXIMUM_INCREASED: /\b(?:additional|extra|more|maximum|increase[sd]?)\b[^.]{0,30}\b(?:Force Points?|Force Powers?|uses|capacity|suite)\b/i
};
export function classifyClause(sentence, family) {
  const labels = [];
  if (family === 'A') { for (const [k, re] of Object.entries(ACTION_RES)) if (re.test(sentence)) labels.push(k); if (!labels.length && ACTION_TYPE.test(sentence)) labels.push('ACTION_TYPE_MENTIONED_NO_STRUCTURE_MATCHED'); }
  else if (family === 'C') { for (const [k, re] of Object.entries(RES)) if (re.test(sentence)) labels.push(k); if (!labels.length) labels.push(RESOURCE_TERM.test(sentence) ? 'RESOURCE_MERELY_MENTIONED' : 'NO_RESOURCE_STRUCTURE_MATCHED'); }
  return labels;
}
const clausesFor = (text, re, family) => {
  const out = [];
  for (const s of splitSentences(text)) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    const phrases = [...s.matchAll(g)].map(m => m[0]);
    if (phrases.length) out.push({ sentence: s, matchedPhrases: phrases, syntaxLabels: classifyClause(s, family) });
  }
  return out;
};

export function buildPacket(discovery, baseline) {
  const det = new Map(DETECTORS.map(d => [d.id, d]));
  const byKey = new Map(baseline.records.map(r => [`${r.domain}:${r.canonicalId}`, r]));
  for (const id of SCOPE) if (!det.has(id)) throw new Error(`scope detector ${id} missing`);
  const scopeTags = new Set(SCOPE.map(id => det.get(id).tag));
  // Bundle-channel items are attributed to their bundle; they are in scope when the bundle names an in-scope detector and the compared tag is an in-scope tag.
  const bundleScope = (i) => {
    if (!i.mechanic.startsWith('bundle:')) return null;
    const b = BUNDLES.find(x => x.id === i.mechanic.slice(7).split('>')[0]);
    const d = b && [...b.all, ...(b.any || [])].find(x => SCOPE.includes(x));
    return d && scopeTags.has(i.comparedTag) ? { bundle: b.id, detectorId: d } : null;
  };
  const inScope = discovery.ownerReviewItems.filter(i => i.state === 'PASS3B_OWNER_REVIEW' && (SCOPE.includes(i.mechanic) || bundleScope(i)));
  const matchesOf = (detId) => baseline.records.filter(r => r.evidence && det.get(detId).re.test(r.evidence));
  const entries = inScope.map(i => {
    const via = bundleScope(i), detectorId = via ? via.detectorId : i.mechanic;
    const d = det.get(detectorId), rec = byKey.get(`${i.domain}:${i.canonicalId}`);
    const fam = d.family;
    const clauses = clausesFor(rec.evidence, d.re, fam);
    const myLabels = new Set(clauses.flatMap(c => c.syntaxLabels));
    const other = i.domain === 'FEAT' ? 'TALENT' : 'FEAT';
    const pool = matchesOf(detectorId).filter(r => r.domain === other && r.tags.includes(i.comparedTag));
    const scored = pool.map(r => { const cl = clausesFor(r.evidence, d.re, fam); return { r, cl, overlap: cl.flatMap(c => c.syntaxLabels).filter(l => myLabels.has(l)).length }; })
      .sort((a, b) => b.overlap - a.overlap || cmp(a.r.canonicalId, b.r.canonicalId)).slice(0, 2);
    const impl = REQUIRED_IMPLICATIONS.filter(([a]) => a === i.comparedTag).map(([a, b]) => ({ rule: `${a} -> ${b}`, requiredTag: b, requiredTagCurrentlyPresent: rec.tags.includes(b) }));
    return {
      detectorId, reportedViaBundle: via ? via.bundle : null, comparedTag: i.comparedTag, detectorConfidence: d.confidence, domain: i.domain, canonicalId: i.canonicalId, name: i.name, source: i.source, page: i.page,
      evidenceTier: rec.evidenceTier, comparedTagCurrentlyPresent: rec.tags.includes(i.comparedTag), currentTags: [...rec.tags],
      canonicalMechanicText: rec.evidence, clauses, distinctClauseCount: clauses.length,
      impliedRequirementsIfOwnerLaterAuthorizesTag: impl,
      oppositeDomainComparators: scored.map(({ r, cl }) => ({ domain: r.domain, canonicalId: r.canonicalId, name: r.name, source: r.source, page: r.page, evidenceTier: r.evidenceTier, tags: [...r.tags], relevantClauses: cl, canonicalMechanicText: r.evidence })),
      comparatorSelectionRule: 'opposite domain, matches the same detector, carries the compared tag; ordered by number of shared clause syntax labels, then canonical ID; first two',
      discoveryReference: `${i.domain}:${i.canonicalId}|${i.comparedTag}|${i.mechanic}`
    };
  }).sort((a, b) => SCOPE.indexOf(a.detectorId) - SCOPE.indexOf(b.detectorId) || cmp(a.comparedTag, b.comparedTag) || cmp(a.domain, b.domain) || cmp(a.canonicalId, b.canonicalId));
  const countBy = (k) => entries.reduce((m, e) => (m[e[k]] = (m[e[k]] || 0) + 1, m), {});
  const excludedByDiscovery = SCOPE.map(id => ({ detectorId: id,
    resolvedByPriorOwnerRuling: discovery.resolvedByPriorRuling.filter(i => i.mechanic === id).length,
    evidenceOnlyNoComparator: discovery.evidenceOnly.filter(e => e.mechanic === id && e.class === 'NO_CROSS_DOMAIN_COMPARATOR').length,
    detectedAndAlreadyCarryingTag: discovery.detectorStats.find(s => s.id === id).convergent }));
  return {
    schemaVersion: '1.0', kind: 'TALENT_FEAT_PASS3B1_MECHANICAL_PRIMITIVES_OWNER_PACKET', status: 'EVIDENCE_PACKET_ONLY_NO_RECOMMENDATIONS',
    note: 'Facts only. Clause syntax labels describe wording structure and are not semantic rulings. Presence of a record here is not a statement that it should change. Every decision is the owner\'s.',
    source: { discoveryReport: REPORT_JSON, baseline: BASELINE3B_PATH }, scope: SCOPE,
    totals: { unresolvedEntries: entries.length, uniqueRecords: new Set(entries.map(e => `${e.domain}:${e.canonicalId}`)).size, byDetector: countBy('detectorId'), byDomain: countBy('domain'), byComparedTag: countBy('comparedTag'), recordsWithMultipleDistinctClauses: entries.filter(e => e.distinctClauseCount > 1).length },
    notIncludedFromDiscovery: excludedByDiscovery, entries
  };
}

const L = (t) => `\`${t}\``;
function renderMd(p) {
  const T = p.totals;
  const out = ['# Pass 3B.1 — Mechanical Primitives: Owner Evidence Packet', '',
    'Evidence extraction only. No recommendation, interpretation, proposed disposition, tag change or overlay is made. Clause labels describe wording structure only. Every decision belongs to the owner.', '',
    '## Totals', '', `- Unresolved entries (record × detector): **${T.unresolvedEntries}**; unique records: **${T.uniqueRecords}**; records with more than one distinct matching clause: ${T.recordsWithMultipleDistinctClauses}`,
    `- By domain: ${Object.entries(T.byDomain).map(([k, v]) => `${k} ${v}`).join(', ')}`, `- By compared tag: ${Object.entries(T.byComparedTag).map(([k, v]) => `${L(k)} ${v}`).join(', ')}`, '',
    '| Detector | Compared tag | Unresolved | Feats | Talents | Not included: prior-ruled | Not included: no comparator | Detected and already carrying tag |', '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...p.scope.map(id => { const es = p.entries.filter(e => e.detectorId === id); const ex = p.notIncludedFromDiscovery.find(x => x.detectorId === id); const tag = DETECTORS.find(d => d.id === id).tag; return `| ${id} | ${L(tag)} | ${es.length} | ${es.filter(e => e.domain === 'FEAT').length} | ${es.filter(e => e.domain === 'TALENT').length} | ${ex.resolvedByPriorOwnerRuling} | ${ex.evidenceOnlyNoComparator} | ${ex.detectedAndAlreadyCarryingTag} |`; }), ''];
  for (const id of p.scope) {
    const es = p.entries.filter(e => e.detectorId === id);
    if (!es.length) { out.push(`## ${id}`, '', 'No unresolved entries.', ''); continue; }
    out.push(`## ${id} → ${L(es[0].comparedTag)} (${es.length})`, '');
    for (const e of es) {
      out.push(`### ${e.name} — ${e.domain} \`${e.canonicalId}\``, '',
        `- Detector: ${e.detectorId} (${e.detectorConfidence}); compared tag ${L(e.comparedTag)}; compared tag currently present: **${e.comparedTagCurrentlyPresent}**`,
        `- Source: ${e.source} p.${e.page ?? '—'}; evidence tier: ${e.evidenceTier}; discovery ref: \`${e.discoveryReference}\`${e.reportedViaBundle ? `; surfaced by cross-domain bundle \`${e.reportedViaBundle}\`` : ''}`,
        `- Current tags: ${e.currentTags.map(L).join(', ')}`,
        `- Implication rule(s) that would apply if the owner later authorizes the tag: ${e.impliedRequirementsIfOwnerLaterAuthorizesTag.length ? e.impliedRequirementsIfOwnerLaterAuthorizesTag.map(x => `${x.rule} (${L(x.requiredTag)} currently ${x.requiredTagCurrentlyPresent ? 'present' : 'absent'})`).join('; ') : 'none'}`, '',
        `Complete canonical mechanic text used by the detector:`, '', `> ${e.canonicalMechanicText.replace(/\n+/g, ' ')}`, '', `Matching clause(s) (${e.distinctClauseCount}):`, '');
      e.clauses.forEach((c, k) => out.push(`${k + 1}. Matched: ${c.matchedPhrases.map(m => `"${m}"`).join(', ')} — syntax labels: ${c.syntaxLabels.join(', ') || '—'}`, `   > ${c.sentence}`));
      out.push('', 'Opposite-domain comparator(s) carrying the tag:', '');
      if (!e.oppositeDomainComparators.length) out.push('- none');
      for (const c of e.oppositeDomainComparators) {
        out.push(`- **${c.name}** — ${c.domain} \`${c.canonicalId}\` (${c.source} p.${c.page ?? '—'}, ${c.evidenceTier}); tags: ${c.tags.map(L).join(', ')}`);
        for (const cl of c.relevantClauses) out.push(`  - labels: ${cl.syntaxLabels.join(', ') || '—'} — "${cl.sentence}"`);
      }
      out.push('');
    }
  }
  return out.join('\n');
}

export function buildOutputs() {
  const discovery = buildDiscovery();
  if (fs.readFileSync(path.join(ROOT, REPORT_JSON), 'utf8') !== discovery.json) throw new Error('PASS3B.1 PACKET FAILED: committed discovery report differs from a fresh run');
  const packet = buildPacket(discovery.rep, readJson(BASELINE3B_PATH));
  return { packet, json: JSON.stringify(packet, null, 2) + '\n', md: renderMd(packet) };
}
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const out = buildOutputs();
  if (process.argv.includes('--check')) {
    if (fs.readFileSync(path.join(ROOT, PACKET_JSON), 'utf8') !== out.json || fs.readFileSync(path.join(ROOT, PACKET_MD), 'utf8') !== out.md) { console.error('Committed Pass 3B.1 packet differs from a fresh run'); process.exit(1); }
    console.log('PASS 3B.1 PACKET MATCHES A FRESH RUN');
  } else {
    fs.writeFileSync(path.join(ROOT, PACKET_JSON), out.json); fs.writeFileSync(path.join(ROOT, PACKET_MD), out.md);
    const T = out.packet.totals;
    console.log(`PASS 3B.1 PACKET: ${T.unresolvedEntries} entries / ${T.uniqueRecords} unique records; by detector ${JSON.stringify(T.byDetector)}; by domain ${JSON.stringify(T.byDomain)}`);
  }
}
