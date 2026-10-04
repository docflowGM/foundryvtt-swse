#!/usr/bin/env node
// Pass 3B.2B owner packet: EVIDENCE EXTRACTION ONLY for Battlefield control (G) and Reactive combat (H) record-level findings.
// Lists only currently unresolved record-level discovery findings. H.counterattack / H.overwatch tag-convention questions are not expanded into record adjudication.
// Structural labels organize wording only; they are not semantic rulings. The owner decides everything. No recommendations, no overlay entries, no tag changes. Deterministic.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, REQUIRED_IMPLICATIONS } from './validate-feat-tags-semantic-authority.mjs';
import { BASELINE3B_PATH } from './build-talent-feat-pass3b-mechanic-baseline.mjs';
import { buildOutputs as buildDiscovery, REPORT_JSON } from './report-talent-feat-pass3b-exact-mechanic-convergence.mjs';
import { DETECTORS, BUNDLES } from './talent-feat-pass3b-detectors.mjs';
import { OWNER_OVERLAY_PATH } from './build-talent-feat-pass3b-semantic-authority.mjs';

export const PACKET_JSON = 'data/audits/talent-feat-pass3b-2b-control-reactive-owner-packet.json';
export const PACKET_MD = 'docs/audits/talent-feat-pass3b-2b-control-reactive-owner-packet.md';
export const SCOPE = ['G.grab', 'G.grapple', 'G.restrain', 'G.forced_movement', 'G.speed_change', 'G.mobility', 'G.pursuit', 'G.positioning', 'H.attack_of_opportunity', 'H.counterattack', 'H.overwatch'];
export const OUT_OF_SCOPE_NOTED = ['H.counterattack and H.overwatch tag-convention questions (untagged matches are not individual findings)', 'findings already closed by a prior owner ruling or owner decision', 'weapon-mode and other families (later batches)'];
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const splitSentences = (text) => String(text).replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+(?=[A-Z("“])/).filter(Boolean);

// ---- Structural clause labels (wording only; not semantic rulings) ----
const CTL = {
  INITIATES_A_GRAB: /\b(?:make|makes|attempt|attempts|use|uses|can|may)\b[^.]{0,40}\bgrab\b|\bgrab(?:s)?\s+(?:the |a |an |your |that |one |an? opponent|a creature|an enemy)/i,
  MODIFIES_A_GRAB: /\bgrab\b[^.]{0,50}\b(?:bonus|penalty|check|modifier|\+\d|-\d|instead|reroll|automatic)|(?:\+\d|bonus|penalty)[^.]{0,30}\bgrab\b/i,
  INITIATES_A_GRAPPLE: /\b(?:make|makes|attempt|attempts|initiate|initiates|start|starts|use|uses|can|may)\b[^.]{0,40}\bgrappl(?:e|es|ing)\b|\bgrapple (?:attack|check)\b/i,
  MODIFIES_A_GRAPPLE_CHECK: /\bgrapple\b[^.]{0,50}\b(?:check|bonus|penalty|modifier|\+\d|-\d|reroll|instead)|(?:\+\d|bonus|penalty)[^.]{0,30}\bgrapple\b/i,
  PINS_OR_RESTRAINS: /\bpin(?:s|ned|ning)\b|\brestrain|\bimmobiliz|\bentangle/i,
  PREVENTS_ESCAPE: /\b(?:escape|break free|break the grapple|break out)\b|\bcannot (?:move|escape|be moved)\b|\bcan't (?:move|escape)\b/i,
  FORCIBLY_MOVES_ANOTHER_CREATURE: /\b(?:push(?:es|ed)?|pull(?:s|ed)?|knock(?:s|ed)? (?:back|prone|away)|slides?|drag(?:s|ged)?)\b|\bmoves? (?:the|that|an?) (?:target|opponent|enemy|creature)\b|\bthrows? (?:the|that|an?) (?:target|opponent|enemy|creature)/i,
  CHANGES_ANOTHER_CREATURES_MOVEMENT_OR_SPEED: /\b(?:target|opponent|enemy|creature|ally|allies|affected)'?s?\b[^.]{0,40}\b(?:speed|movement|moves?)\b|\breduce(?:s)? (?:the |its |his |her )?(?:target's )?speed\b/i,
  CHANGES_THE_USERS_OWN_MOVEMENT_OR_SPEED: /\b(?:your|you)\b[^.]{0,30}\b(?:speed|movement)\b|\byou (?:can |may )?(?:move|shift|run|charge)\b|\bincreases? your speed\b/i,
  POSITION_CHANGES_WITHOUT_FORCED_MOVEMENT: /\bswap(?:s)? places|\bchange(?:s)? places|\bshift(?:s)? \d|\breposition|\bswitch(?:es)? places/i
};
const REA = {
  GENERATES_AN_ATTACK_OF_OPPORTUNITY: /\b(?:you|can|may|allows?|grants?|gives?|makes?|make)\b[^.]{0,40}\b(?:an?|extra|additional|one)\s+attacks? of opportunity\b|\bthreaten(?:s|ed)?\b/i,
  MODIFIES_AN_ATTACK_OF_OPPORTUNITY: /\battacks? of opportunity\b[^.]{0,50}\b(?:bonus|penalty|\+\d|-\d|damage|instead|reroll|additional|extra)\b|\b(?:\+\d|bonus|penalty|extra|additional)\b[^.]{0,30}\battacks? of opportunity\b/i,
  PREVENTS_AN_ATTACK_OF_OPPORTUNITY: /\bwithout provoking\b|\bdoes(?:n't| not) provoke\b|\bdo(?:es)? not provoke\b|\bno attacks? of opportunity\b|\bcannot make attacks? of opportunity\b|\bnot provoke\b|\bavoids? attacks? of opportunity\b|\bimmune to attacks? of opportunity\b/i,
  TRIGGERS_FROM_AN_ATTACK_OF_OPPORTUNITY: /\b(?:when|if|whenever|after)\b[^.]{0,50}\b(?:make|makes|made|provoke|provokes|provoked|take|takes|taken)\b[^.]{0,30}\battacks? of opportunity\b/i,
  GRANTS_AN_IMMEDIATE_OR_COUNTER_ATTACK: /\b(?:immediate(?:ly)?|counter-?attack|in response|retaliat\w*)\b[^.]{0,60}\battack\b|\battack\b[^.]{0,40}\b(?:immediately|in response|in return)\b/i,
  ATTACK_OCCURS_AS_A_REACTION: /\b(?:as a reaction|reaction)\b[^.]{0,60}\battack\b|\battack\b[^.]{0,60}\bas a reaction\b/i,
  MODIFIES_AN_EXISTING_REACTION_ATTACK: /\b(?:ready|readied|reaction)\b[^.]{0,50}\battack\b[^.]{0,40}\b(?:bonus|penalty|\+\d|-\d|damage|additional|extra|instead)\b/i,
  MERELY_REFERENCES_AN_ATTACK_OF_OPPORTUNITY: /\battacks? of opportunity\b/i
};
const TABLE = Object.fromEntries(SCOPE.map(id => [id, id.startsWith('G.') ? [CTL, 'CONTROL_WORDING_NO_STRUCTURE_MATCHED'] : [REA, 'REACTIVE_WORDING_NO_STRUCTURE_MATCHED']]));
export const LABELS = [...new Set([...Object.values(TABLE).flatMap(([t, f]) => [...Object.keys(t), f]), 'MOVEMENT_WORDING_PRESENT_NO_OTHER_STRUCTURE_MATCHED'])];
export function classifyClause(sentence, detectorId) {
  const [table, fallback] = TABLE[detectorId]; const out = [];
  for (const [k, re] of Object.entries(table)) if (re.test(sentence)) out.push(k);
  if (out.length > 1 && out.includes('MERELY_REFERENCES_AN_ATTACK_OF_OPPORTUNITY')) out.splice(out.indexOf('MERELY_REFERENCES_AN_ATTACK_OF_OPPORTUNITY'), 1);
  if (!out.length && detectorId.startsWith('G.') && /\b(?:move|moves|moved|movement|squares?)\b/i.test(sentence)) return ['MOVEMENT_WORDING_PRESENT_NO_OTHER_STRUCTURE_MATCHED'];
  return out.length ? out : [fallback];
}
const clausesFor = (text, re, detectorId) => {
  const out = [];
  for (const s of splitSentences(text)) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    const phrases = [...s.matchAll(g)].map(m => m[0]);
    if (phrases.length) out.push({ sentence: s, matchedPhrases: phrases, structuralLabels: classifyClause(s, detectorId) });
  }
  return out;
};

export function buildPacket(discovery, baseline, overlay) {
  const det = new Map(DETECTORS.map(d => [d.id, d]));
  const byKey = new Map(baseline.records.map(r => [`${r.domain}:${r.canonicalId}`, r]));
  for (const id of SCOPE) if (!det.has(id)) throw new Error(`scope detector ${id} missing`);
  const scopeTags = new Set(SCOPE.map(id => det.get(id).tag));
  const bundleScope = (i) => {
    if (!i.mechanic.startsWith('bundle:')) return null;
    const b = BUNDLES.find(x => x.id === i.mechanic.slice(7).split('>')[0]);
    const d = b && [...b.all, ...(b.any || [])].find(x => SCOPE.includes(x));
    return d && scopeTags.has(i.comparedTag) ? { bundle: b.id, detectorId: d } : null;
  };
  // Open findings, plus findings that later receive a 3B.2B owner decision (keeps this historical packet stable; no decision data is written).
  const pool = [...discovery.ownerReviewItems, ...(discovery.ownerDecidedItems || []).filter(i => ['3B.2B', '3B.BULK'].includes(i.ownerDecision?.batch))];
  const inScope = pool.filter(i => SCOPE.includes(i.mechanic) || bundleScope(i));
  const precedents = discovery.precedentRules;
  const grapplePrecedent = precedents.find(p => /Pin \/ Crush/.test(p));
  const aooPrecedent = precedents.find(p => /Martial Arts I/.test(p));
  const generalPrecedent = precedents.find(p => /^Prerequisite inheritance/.test(p));
  const entries = inScope.map(i => {
    const via = bundleScope(i), detectorId = via ? via.detectorId : i.mechanic;
    const d = det.get(detectorId), rec = byKey.get(`${i.domain}:${i.canonicalId}`);
    const clauses = clausesFor(rec.evidence, d.re, detectorId);
    const mine = new Set(clauses.flatMap(c => c.structuralLabels));
    const other = i.domain === 'FEAT' ? 'TALENT' : 'FEAT';
    const comps = baseline.records.filter(r => r.domain === other && r.evidence && d.re.test(r.evidence) && r.tags.includes(i.comparedTag))
      .map(r => { const cl = clausesFor(r.evidence, d.re, detectorId); return { r, cl, overlap: cl.flatMap(c => c.structuralLabels).filter(l => mine.has(l)).length }; })
      .sort((a, b) => b.overlap - a.overlap || cmp(a.r.canonicalId, b.r.canonicalId)).slice(0, 2);
    const priorOnRecord = [
      ...discovery.resolvedByPriorRuling.filter(x => x.domain === i.domain && x.canonicalId === i.canonicalId).map(x => ({ source: x.priorOwnerPrecedent?.source, comparedTag: x.comparedTag, ruling: x.priorOwnerPrecedent?.ruling })),
      ...overlay.decisions.filter(x => x.domain === i.domain && x.canonicalId === i.canonicalId && x.batch !== '3B.2B' && x.batch !== '3B.BULK').map(x => ({ source: `Pass 3B ${x.batch} owner decision`, comparedTag: x.tag, ruling: x.ownerAction, policy: x.ownerPolicyApplied }))
    ];
    return {
      family: d.family, familyName: detectorId.startsWith('G.') ? 'Battlefield control' : 'Reactive combat', detectorId, reportedViaBundle: via ? via.bundle : null, comparedTag: i.comparedTag, detectorConfidence: d.confidence,
      domain: i.domain, canonicalId: i.canonicalId, name: i.name, source: i.source, page: i.page, evidenceTier: rec.evidenceTier, comparedTagCurrentlyPresent: rec.tags.includes(i.comparedTag), currentTags: [...rec.tags],
      canonicalMechanicText: rec.evidence, clauses, distinctClauseCount: clauses.length,
      impliedRequirementsIfOwnerLaterAuthorizesTag: REQUIRED_IMPLICATIONS.filter(([a]) => a === i.comparedTag).map(([a, b]) => ({ rule: `${a} -> ${b}`, requiredTag: b, requiredTagCurrentlyPresent: rec.tags.includes(b) })),
      oppositeDomainComparators: comps.map(({ r, cl }) => ({ domain: r.domain, canonicalId: r.canonicalId, name: r.name, source: r.source, page: r.page, evidenceTier: r.evidenceTier, tags: [...r.tags], relevantClauses: cl, canonicalMechanicText: r.evidence })),
      comparatorSelectionRule: 'opposite domain, matches the same detector, carries the compared tag; ordered by number of shared structural labels, then canonical ID; first two',
      applicablePriorOwnerPolicies: [generalPrecedent, ...(i.comparedTag === 'attack_of_opportunity' ? [aooPrecedent] : [grapplePrecedent])].filter(Boolean),
      priorOwnerRulingsOnThisRecord: priorOnRecord, discoveryReference: `${i.domain}:${i.canonicalId}|${i.comparedTag}|${i.mechanic}`
    };
  }).sort((a, b) => SCOPE.indexOf(a.detectorId) - SCOPE.indexOf(b.detectorId) || cmp(a.domain, b.domain) || cmp(a.canonicalId, b.canonicalId));
  const countBy = (k) => entries.reduce((m, e) => (m[e[k]] = (m[e[k]] || 0) + 1, m), {});
  return {
    schemaVersion: '1.0', kind: 'TALENT_FEAT_PASS3B2B_DAMAGE_CRITICAL_OWNER_PACKET', status: 'EVIDENCE_PACKET_ONLY_NO_RECOMMENDATIONS',
    note: 'Facts only. Structural labels describe wording and are not semantic rulings. Presence of a record here is not a statement that it should change. Every decision is the owner\'s.',
    source: { discoveryReport: REPORT_JSON, baseline: BASELINE3B_PATH, ownerOverlay: OWNER_OVERLAY_PATH }, scope: SCOPE, notIncluded: OUT_OF_SCOPE_NOTED, structuralLabelVocabulary: LABELS,
    totals: { entries: entries.length, uniqueRecords: new Set(entries.map(e => `${e.domain}:${e.canonicalId}`)).size, byFamily: { G: entries.filter(e => e.family === 'G').length, H: entries.filter(e => e.family === 'H').length }, byDetector: countBy('detectorId'), byDomain: countBy('domain'), byComparedTag: countBy('comparedTag'), recordsWithMultipleDistinctClauses: entries.filter(e => e.distinctClauseCount > 1).length },
    entries
  };
}

const L = (t) => `\`${t}\``;
function renderMd(p) {
  const T = p.totals;
  const out = ['# Pass 3B.2B — Battlefield Control + Reactive Combat: Owner Evidence Packet', '',
    'Evidence extraction only. No recommendation, proposed change, semantic conclusion or disposition is made. Structural labels describe wording only. Every decision belongs to the owner.', '',
    '## Totals', '', `- Entries (record × detector): **${T.entries}** (G ${T.byFamily.G}, H ${T.byFamily.H}); unique records: **${T.uniqueRecords}**; records with more than one distinct matching clause: ${T.recordsWithMultipleDistinctClauses}`,
    `- By detector: ${Object.entries(T.byDetector).map(([k, v]) => `${k} ${v}`).join(', ')}`, `- By domain: ${Object.entries(T.byDomain).map(([k, v]) => `${k} ${v}`).join(', ')}`, `- Not in this packet: ${p.notIncluded.join('; ')}`, ''];
  for (const id of p.scope) {
    const es = p.entries.filter(e => e.detectorId === id);
    out.push(`## ${id} → ${es.length ? L(es[0].comparedTag) : ''} (${es.length})`, '');
    for (const e of es) {
      out.push(`### ${e.name} — ${e.domain} \`${e.canonicalId}\``, '',
        `- Family: ${e.family}. ${e.familyName}; detector ${e.detectorId} (${e.detectorConfidence}); compared tag ${L(e.comparedTag)}; compared tag currently present: **${e.comparedTagCurrentlyPresent}**`,
        `- Source: ${e.source} p.${e.page ?? '—'}; evidence tier: ${e.evidenceTier}; discovery ref: \`${e.discoveryReference}\`${e.reportedViaBundle ? `; surfaced by bundle \`${e.reportedViaBundle}\`` : ''}`,
        `- Current tags: ${e.currentTags.map(L).join(', ')}`,
        `- Implication rule(s) that would apply if the owner later authorizes the tag: ${e.impliedRequirementsIfOwnerLaterAuthorizesTag.length ? e.impliedRequirementsIfOwnerLaterAuthorizesTag.map(x => `${x.rule} (${L(x.requiredTag)} currently ${x.requiredTagCurrentlyPresent ? 'present' : 'absent'})`).join('; ') : 'none'}`,
        `- Applicable prior owner policies: ${e.applicablePriorOwnerPolicies.join(' | ') || 'none'}`,
        `- Prior owner rulings on this record: ${e.priorOwnerRulingsOnThisRecord.length ? e.priorOwnerRulingsOnThisRecord.map(x => `${x.source} — ${L(x.comparedTag)} ${x.ruling}`).join('; ') : 'none'}`, '',
        'Complete canonical mechanic text used by the detector:', '', `> ${e.canonicalMechanicText.replace(/\n+/g, ' ')}`, '', `Matching clause(s) (${e.distinctClauseCount}):`, '');
      e.clauses.forEach((c, k) => out.push(`${k + 1}. Matched: ${c.matchedPhrases.map(m => `"${m}"`).join(', ')} — structural labels: ${c.structuralLabels.join(', ')}`, `   > ${c.sentence}`));
      out.push('', 'Opposite-domain comparator(s) carrying the tag:', '');
      if (!e.oppositeDomainComparators.length) out.push('- none');
      for (const c of e.oppositeDomainComparators) {
        out.push(`- **${c.name}** — ${c.domain} \`${c.canonicalId}\` (${c.source} p.${c.page ?? '—'}, ${c.evidenceTier}); tags: ${c.tags.map(L).join(', ')}`);
        for (const cl of c.relevantClauses) out.push(`  - labels: ${cl.structuralLabels.join(', ')} — "${cl.sentence}"`);
      }
      out.push('');
    }
  }
  return out.join('\n');
}
export function buildOutputs() {
  const discovery = buildDiscovery();
  if (fs.readFileSync(path.join(ROOT, REPORT_JSON), 'utf8') !== discovery.json) throw new Error('PASS3B.2B PACKET FAILED: committed discovery report differs from a fresh run');
  const packet = buildPacket(discovery.rep, readJson(BASELINE3B_PATH), readJson(OWNER_OVERLAY_PATH));
  return { packet, json: JSON.stringify(packet, null, 2) + '\n', md: renderMd(packet) };
}
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const out = buildOutputs();
  if (process.argv.includes('--check')) {
    if (fs.readFileSync(path.join(ROOT, PACKET_JSON), 'utf8') !== out.json || fs.readFileSync(path.join(ROOT, PACKET_MD), 'utf8') !== out.md) { console.error('Committed Pass 3B.2B packet differs from a fresh run'); process.exit(1); }
    console.log('PASS 3B.2B PACKET MATCHES A FRESH RUN');
  } else {
    fs.writeFileSync(path.join(ROOT, PACKET_JSON), out.json); fs.writeFileSync(path.join(ROOT, PACKET_MD), out.md);
    const T = out.packet.totals;
    console.log(`PASS 3B.2B PACKET: ${T.entries} entries / ${T.uniqueRecords} unique records; by detector ${JSON.stringify(T.byDetector)}; by domain ${JSON.stringify(T.byDomain)}`);
  }
}
