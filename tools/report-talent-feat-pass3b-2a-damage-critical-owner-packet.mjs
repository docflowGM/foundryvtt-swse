#!/usr/bin/env node
// Pass 3B.2A owner packet: EVIDENCE EXTRACTION ONLY for Damage mechanics (damage_threshold, damage_bonus, sustained_damage) and Critical mechanics (natural 20).
// Lists only currently unresolved record-level discovery findings. D.burst_damage (tag-convention question) and the LOW-confidence generic damage detector are not in scope.
// Structural labels organize wording only; they are not semantic rulings. The owner decides everything. No recommendations, no overlay entries, no tag changes. Deterministic.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, REQUIRED_IMPLICATIONS } from './validate-feat-tags-semantic-authority.mjs';
import { BASELINE3B_PATH } from './build-talent-feat-pass3b-mechanic-baseline.mjs';
import { buildOutputs as buildDiscovery, REPORT_JSON } from './report-talent-feat-pass3b-exact-mechanic-convergence.mjs';
import { DETECTORS, BUNDLES } from './talent-feat-pass3b-detectors.mjs';
import { OWNER_OVERLAY_PATH } from './build-talent-feat-pass3b-semantic-authority.mjs';

export const PACKET_JSON = 'data/audits/talent-feat-pass3b-2a-damage-critical-owner-packet.json';
export const PACKET_MD = 'docs/audits/talent-feat-pass3b-2a-damage-critical-owner-packet.md';
export const SCOPE = ['D.damage_threshold', 'D.damage_bonus', 'D.sustained_damage', 'E.natural_20'];
export const OUT_OF_SCOPE_NOTED = ['D.burst_damage (tag-convention question; later policy review)', 'D.damage_generic (LOW confidence; evidence only)', 'D.precision', 'D.precision_damage', 'E.critical_hit (already convergent; not reopened)'];
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const splitSentences = (text) => String(text).replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+(?=[A-Z("“])/).filter(Boolean);

// ---- Structural clause labels (wording only; not semantic rulings) ----
const DT = {
  DAMAGE_THRESHOLD_COMPARED_TO_DAMAGE: /\b(?:damage (?:equals?|exceeds?|equal to or exceeds|is (?:less|greater|equal)|does not exceed|exceeded|less than)|exceed(?:s|ed|ing)?|equal(?:s)?|less than)\b[^.]{0,60}\bdamage threshold\b|\bdamage threshold\b[^.]{0,40}\b(?:exceed|equal|compare)/i,
  DAMAGE_THRESHOLD_MODIFIED: /\b(?:increase|increases|reduce|reduces|decrease|decreases|lower|lowers|raise|raises|bonus|penalty|ignore|ignores|halve|halves|\+\d+|-\d+)\b[^.]{0,40}\bdamage threshold\b|\bdamage threshold\b[^.]{0,20}\b(?:by \d|is (?:increased|reduced|halved|lowered))/i,
  CONSEQUENCE_OF_EXCEEDING_THRESHOLD_CHANGED: /\b(?:exceed|equal)[^.]{0,60}\bdamage threshold\b[^.]{0,80}\b(?:move|condition track|knocked|prone|instead|no additional|rather than)|\bdamage threshold\b[^.]{0,60}\b(?:instead|rather than|moves?\b)/i,
  THRESHOLD_EXCEPTION_OR_REFERENCE_ONLY: /\b(?:regardless of|ignor(?:e|es|ing)|even if|does not apply|doesn't apply|unless|not (?:subject to|affected by))\b[^.]{0,60}\bdamage threshold\b|\bdamage threshold\b[^.]{0,40}\b(?:does not|doesn't|unless|regardless)\b/i,
  THRESHOLD_BELONGS_TO_ANOTHER_REFERENCED_MECHANIC: /\b(?:vehicle|starship|droid|object|creature|target|opponent|enemy|device)'?s? damage threshold\b|\bdamage threshold of (?:the|a|an|that)\b|\b(?:its|his|her|their) damage threshold\b/i
};
const DB = {
  ADDS_NUMERIC_OR_DICE_DAMAGE: /(?:\+|plus |add(?:s)? |extra |additional |bonus )\d*(?:d\d+)?[^.]{0,20}\bdamage\b|\b\d+d\d+ (?:points of )?(?:extra |additional |bonus )?damage\b|\b(?:extra|additional|bonus) damage\b/i,
  MULTIPLIES_OR_SCALES_DAMAGE: /\b(?:double(?:s|d)?|triple(?:s|d)?|multipl(?:y|ies|ied)|twice|half)\b[^.]{0,30}\bdamage\b|\bdamage\b[^.]{0,30}\b(?:doubled|tripled|multiplied|halved)\b/i,
  CHANGES_BASE_WEAPON_OR_UNARMED_DAMAGE: /\bdamage (?:die|dice) (?:increases?|becomes?|changes?)|\b(?:increase|increases|change|changes)\b[^.]{0,30}(?:damage die|base damage|weapon's damage|unarmed damage|damage dice)|\b(?:unarmed|weapon) damage (?:is|becomes|increases)\b/i,
  BONUS_APPLIES_ONLY_CONDITIONALLY: /\b(?:if|when|while|whenever|against|only (?:if|when|against)|provided|on a (?:hit|critical)|until)\b/i,
  DAMAGE_AMOUNT_AS_COST_PENALTY_OR_REFERENCE: /\btakes? (?:\d+ )?damage\b|\bsuffers?\b[^.]{0,30}\bdamage\b|\btakes? \d+d?\d* (?:points of )?damage\b|(?:-|minus )\d+ (?:penalty )?(?:to |on )?damage\b|penalty to damage|\bcosts? [^.]{0,20}hit points|\bdamage (?:from|caused by)\b/i
};
const SD = {
  REPEATED_OR_MULTIPLE_ATTACKS: /\b(?:each|every|all|both|multiple|additional|second|subsequent|two|three) attacks?\b|\bmultiple attacks\b|\bstrikes? (?:twice|again)\b|\brepeated(?:ly)? attack/i,
  REPEATED_OR_ONGOING_DAMAGE_ACROSS_TURNS: /(?:each|every) (?:subsequent |following |additional )?(?:round|turn)\b[^.]{0,80}\bdamage\b|\bdamage\b[^.]{0,40}(?:each|every) (?:round|turn)\b|\bongoing damage\b|\bpersistent damage\b|\bat the (?:start|end) of (?:each|every|your|its|the)\b[^.]{0,60}\bdamage\b|\bsubsequent rounds?\b/i,
  FULL_ATTACK_OR_MULTIATTACK_WORDING: /\bfull attack\b|\bmultiattack\b|\bdouble attack\b|\btriple attack\b/i,
  SINGLE_ENHANCED_ATTACK: /\b(?:a|one|single|your next|the next) (?:single )?attack\b[^.]{0,60}\b(?:extra|additional|bonus|\+\d)/i
};
const N20 = {
  NAT20_TRIGGERS_THE_RECORDS_BENEFIT: /\b(?:on|if|when|whenever|each time)\b[^.]{0,40}\bnatural (?:20|twenty)\b[^.]{0,60}\b(?:you|gain|regain|can|may|the target|deal|score|trigger|add)\b/i,
  NAT20_CHANGES_THE_RECORDS_BENEFIT: /\bnatural (?:20|twenty)\b[^.]{0,50}\b(?:instead|additional|extra|increases?|improves?|upgrade|becomes?|double)\b|\bnatural (?:20|twenty)\b[^.]{0,30}\+\d/i,
  NAT20_AUTOMATIC_HIT_OR_BASIC_RULES_REMINDER: /\bnatural (?:20|twenty)\b[^.]{0,30}\b(?:automatic(?:ally)? hit|always hit|hits? (?:regardless|automatically))|\bautomatic hit\b[^.]{0,30}\bnatural (?:20|twenty)\b|\bonly a natural (?:20|twenty)\b|\bnatural (?:20|twenty) (?:is|remains?) an automatic\b/i,
  NAT20_EXCEPTION_PREVENTING_OR_ALLOWING_ANOTHER_EFFECT: /\b(?:except|unless|other than|cannot|can't|does(?:n't| not)|prevents?|not on a)\b[^.]{0,50}\bnatural (?:20|twenty)\b|\bnatural (?:20|twenty)\b[^.]{0,40}\b(?:does(?:n't| not)|cannot|can't|prevents?|ignored)\b/i,
  NAT20_APPEARS_IN_REFERENCED_OR_BASE_MECHANIC: /\b(?:as normal|normally|as usual|standard rules|a critical hit occurs|scores? a critical hit|threat range)\b[^.]{0,80}\bnatural (?:20|twenty)\b|\bnatural (?:20|twenty)\b[^.]{0,80}\b(?:as normal|normally|critical hit)\b/i,
  NAT20_RESTORES_OR_SPENDS_ANOTHER_RESOURCE: /\bnatural (?:20|twenty)\b[^.]{0,80}\b(?:regain|recover|spend|restore|refresh|return|Force Point|Force Power)\b|\b(?:regain|recover|spend|restore|Force Point|Force Power)\b[^.]{0,80}\bnatural (?:20|twenty)\b/i,
  NAT20_DIRECTLY_MODIFIES_A_CHECK_OR_ATTACK_RESULT: /\bnatural (?:20|twenty)\b[^.]{0,50}\b(?:treated|counts? as|considered|result|check|attack roll)\b|\btreat (?:the )?(?:result|roll)\b[^.]{0,40}\bnatural (?:20|twenty)\b|\b(?:check|attack roll)s?\b[^.]{0,40}\bnatural (?:20|twenty)\b/i
};
const TABLE = { 'D.damage_threshold': [DT, 'DAMAGE_THRESHOLD_MENTIONED_NO_STRUCTURE_MATCHED'], 'D.damage_bonus': [DB, 'DAMAGE_BONUS_MENTIONED_NO_STRUCTURE_MATCHED'], 'D.sustained_damage': [SD, 'SUSTAINED_DAMAGE_OTHER_LITERAL_STRUCTURE'], 'E.natural_20': [N20, 'NAT20_MENTIONED_NO_STRUCTURE_MATCHED'] };
export const LABELS = Object.values(TABLE).flatMap(([t, f]) => [...Object.keys(t), f]);
export function classifyClause(sentence, detectorId) {
  const [table, fallback] = TABLE[detectorId]; const out = [];
  for (const [k, re] of Object.entries(table)) if (re.test(sentence)) out.push(k);
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
  // Open findings, plus findings that later receive a 3B.2A owner decision (keeps this historical packet stable; no decision data is written).
  const pool = [...discovery.ownerReviewItems, ...(discovery.ownerDecidedItems || []).filter(i => ['3B.2A', '3B.BULK'].includes(i.ownerDecision?.batch))];
  const inScope = pool.filter(i => SCOPE.includes(i.mechanic) || bundleScope(i));
  const precedents = discovery.precedentRules;
  const natural20Precedent = precedents.find(p => /natural-20/i.test(p));
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
      ...overlay.decisions.filter(x => x.domain === i.domain && x.canonicalId === i.canonicalId && x.batch !== '3B.2A' && x.batch !== '3B.BULK').map(x => ({ source: `Pass 3B ${x.batch} owner decision`, comparedTag: x.tag, ruling: x.ownerAction, policy: x.ownerPolicyApplied }))
    ];
    return {
      family: d.family, familyName: detectorId.startsWith('D.') ? 'Damage mechanics' : 'Critical mechanics', detectorId, reportedViaBundle: via ? via.bundle : null, comparedTag: i.comparedTag, detectorConfidence: d.confidence,
      domain: i.domain, canonicalId: i.canonicalId, name: i.name, source: i.source, page: i.page, evidenceTier: rec.evidenceTier, comparedTagCurrentlyPresent: rec.tags.includes(i.comparedTag), currentTags: [...rec.tags],
      canonicalMechanicText: rec.evidence, clauses, distinctClauseCount: clauses.length,
      impliedRequirementsIfOwnerLaterAuthorizesTag: REQUIRED_IMPLICATIONS.filter(([a]) => a === i.comparedTag).map(([a, b]) => ({ rule: `${a} -> ${b}`, requiredTag: b, requiredTagCurrentlyPresent: rec.tags.includes(b) })),
      oppositeDomainComparators: comps.map(({ r, cl }) => ({ domain: r.domain, canonicalId: r.canonicalId, name: r.name, source: r.source, page: r.page, evidenceTier: r.evidenceTier, tags: [...r.tags], relevantClauses: cl, canonicalMechanicText: r.evidence })),
      comparatorSelectionRule: 'opposite domain, matches the same detector, carries the compared tag; ordered by number of shared structural labels, then canonical ID; first two',
      applicablePriorOwnerPolicies: [generalPrecedent, ...(i.comparedTag === 'critical_success' ? [natural20Precedent] : [])].filter(Boolean),
      priorOwnerRulingsOnThisRecord: priorOnRecord, discoveryReference: `${i.domain}:${i.canonicalId}|${i.comparedTag}|${i.mechanic}`
    };
  }).sort((a, b) => SCOPE.indexOf(a.detectorId) - SCOPE.indexOf(b.detectorId) || cmp(a.domain, b.domain) || cmp(a.canonicalId, b.canonicalId));
  const countBy = (k) => entries.reduce((m, e) => (m[e[k]] = (m[e[k]] || 0) + 1, m), {});
  return {
    schemaVersion: '1.0', kind: 'TALENT_FEAT_PASS3B2A_DAMAGE_CRITICAL_OWNER_PACKET', status: 'EVIDENCE_PACKET_ONLY_NO_RECOMMENDATIONS',
    note: 'Facts only. Structural labels describe wording and are not semantic rulings. Presence of a record here is not a statement that it should change. Every decision is the owner\'s.',
    source: { discoveryReport: REPORT_JSON, baseline: BASELINE3B_PATH, ownerOverlay: OWNER_OVERLAY_PATH }, scope: SCOPE, notIncluded: OUT_OF_SCOPE_NOTED, structuralLabelVocabulary: LABELS,
    totals: { entries: entries.length, uniqueRecords: new Set(entries.map(e => `${e.domain}:${e.canonicalId}`)).size, byFamily: { D: entries.filter(e => e.family === 'D').length, E: entries.filter(e => e.family === 'E').length }, byDetector: countBy('detectorId'), byDomain: countBy('domain'), byComparedTag: countBy('comparedTag'), recordsWithMultipleDistinctClauses: entries.filter(e => e.distinctClauseCount > 1).length },
    entries
  };
}

const L = (t) => `\`${t}\``;
function renderMd(p) {
  const T = p.totals;
  const out = ['# Pass 3B.2A — Damage + Critical Mechanics: Owner Evidence Packet', '',
    'Evidence extraction only. No recommendation, proposed change, semantic conclusion or disposition is made. Structural labels describe wording only. Every decision belongs to the owner.', '',
    '## Totals', '', `- Entries (record × detector): **${T.entries}** (D ${T.byFamily.D}, E ${T.byFamily.E}); unique records: **${T.uniqueRecords}**; records with more than one distinct matching clause: ${T.recordsWithMultipleDistinctClauses}`,
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
  if (fs.readFileSync(path.join(ROOT, REPORT_JSON), 'utf8') !== discovery.json) throw new Error('PASS3B.2A PACKET FAILED: committed discovery report differs from a fresh run');
  const packet = buildPacket(discovery.rep, readJson(BASELINE3B_PATH), readJson(OWNER_OVERLAY_PATH));
  return { packet, json: JSON.stringify(packet, null, 2) + '\n', md: renderMd(packet) };
}
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const out = buildOutputs();
  if (process.argv.includes('--check')) {
    if (fs.readFileSync(path.join(ROOT, PACKET_JSON), 'utf8') !== out.json || fs.readFileSync(path.join(ROOT, PACKET_MD), 'utf8') !== out.md) { console.error('Committed Pass 3B.2A packet differs from a fresh run'); process.exit(1); }
    console.log('PASS 3B.2A PACKET MATCHES A FRESH RUN');
  } else {
    fs.writeFileSync(path.join(ROOT, PACKET_JSON), out.json); fs.writeFileSync(path.join(ROOT, PACKET_MD), out.md);
    const T = out.packet.totals;
    console.log(`PASS 3B.2A PACKET: ${T.entries} entries / ${T.uniqueRecords} unique records; by detector ${JSON.stringify(T.byDetector)}; by domain ${JSON.stringify(T.byDomain)}`);
  }
}
