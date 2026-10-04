#!/usr/bin/env node
// Pass 3B.2D owner packet: EVIDENCE EXTRACTION ONLY for weapon-scope primitives: full_attack, dual_wield and stun record-level findings.
// Lists only currently unresolved record-level discovery findings. Weapon-scope detectors (melee, ranged, lightsaber, pistol, unarmed, heavy/exotic weapon) are not in this packet.
// Structural labels organize wording only; they are not semantic rulings. The owner decides everything. No recommendations, no overlay entries, no tag changes. Deterministic.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, REQUIRED_IMPLICATIONS } from './validate-feat-tags-semantic-authority.mjs';
import { BASELINE3B_PATH } from './build-talent-feat-pass3b-mechanic-baseline.mjs';
import { buildOutputs as buildDiscovery, REPORT_JSON } from './report-talent-feat-pass3b-exact-mechanic-convergence.mjs';
import { DETECTORS, BUNDLES } from './talent-feat-pass3b-detectors.mjs';
import { OWNER_OVERLAY_PATH } from './build-talent-feat-pass3b-semantic-authority.mjs';

export const PACKET_JSON = 'data/audits/talent-feat-pass3b-2d-weapon-scope-owner-packet.json';
export const PACKET_MD = 'docs/audits/talent-feat-pass3b-2d-weapon-scope-owner-packet.md';
export const SCOPE = ['O.melee', 'O.ranged', 'O.lightsaber', 'O.pistol', 'O.unarmed'];
export const OUT_OF_SCOPE_NOTED = ['O.heavy_weapon and O.exotic_weapon tag-convention questions (not expanded)', 'full_attack, dual_wield, stun, double_weapon, martial_arts, fighting_defensively, flanking, nonlethal (not reopened)', 'already-convergent weapon-mode records and findings closed by a prior owner ruling or owner decision'];
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const splitSentences = (text) => String(text).replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+(?=[A-Z("“])/).filter(Boolean);

// ---- Structural clause labels (wording only; not semantic rulings) ----
const MEL = {
  DIRECTLY_MODIFIES_MELEE_ATTACKS: /\bmelee attacks?\b[^.]{0,60}(?:\+\d|-\d|\b(?:bonus|penalty|damage|reroll|additional|extra|instead)\b)|(?:\+\d|\b(?:bonus|penalty|extra|additional)\b)[^.]{0,40}\bmelee attacks?\b/i,
  DIRECTLY_PERMITS_OR_REQUIRES_A_MELEE_ATTACK: /\b(?:make|makes|made|making|take|can|may|must|requires?|requiring|with)\b[^.]{0,30}\b(?:a |an |your |the )?melee attacks?\b|\bmelee attacks? (?:against|on)\b/i,
  CHANGES_DEFENSE_AGAINST_MELEE_ATTACKS: /\bmelee attacks? (?:made )?against you\b|\bagainst melee attacks?\b|\bmelee attacks?\b[^.]{0,30}\b(?:Reflex Defense|miss|fail)\b/i,
  MELEE_APPEARS_IN_AN_OPEN_MELEE_OR_RANGED_SCOPE: /\b(?:melee or ranged|ranged or melee|melee and ranged|ranged and melee)\b/i,
  MELEE_APPEARS_ONLY_AS_EXAMPLE_PREREQUISITE_OR_REFERENCE: /\b(?:such as|for example|e\.g\.|including|prerequisite)\b[^.]{0,60}\bmelee\b|\bmelee\b[^.]{0,30}\b(?:such as|for example|e\.g\.)\b/i,
  MECHANIC_CONCERNS_A_MELEE_WEAPON: /\bmelee weapons?\b/i
};
const RNG = {
  DIRECTLY_MODIFIES_RANGED_ATTACKS: /\branged attacks?\b[^.]{0,60}(?:\+\d|-\d|\b(?:bonus|penalty|damage|reroll|additional|extra|instead)\b)|(?:\+\d|\b(?:bonus|penalty|extra|additional)\b)[^.]{0,40}\branged attacks?\b/i,
  DIRECTLY_PERMITS_OR_REQUIRES_A_RANGED_ATTACK: /\b(?:make|makes|made|making|take|can|may|must|requires?|requiring|with)\b[^.]{0,30}\b(?:a |an |your |the )?ranged attacks?\b|\branged attacks? (?:against|on)\b/i,
  CHANGES_DEFENSE_AGAINST_RANGED_ATTACKS: /\branged attacks? (?:made )?against you\b|\bagainst ranged attacks?\b|\branged attacks?\b[^.]{0,30}\b(?:Reflex Defense|miss|fail)\b/i,
  RANGED_APPEARS_IN_AN_OPEN_MELEE_OR_RANGED_SCOPE: /\b(?:melee or ranged|ranged or melee|melee and ranged|ranged and melee)\b/i,
  RANGED_APPEARS_ONLY_AS_EXAMPLE_PREREQUISITE_OR_REFERENCE: /\b(?:such as|for example|e\.g\.|including|prerequisite)\b[^.]{0,60}\branged\b|\branged\b[^.]{0,30}\b(?:such as|for example|e\.g\.)\b/i,
  MECHANIC_CONCERNS_A_RANGED_WEAPON: /\branged weapons?\b/i
};
const LSB = {
  MECHANIC_REQUIRES_A_LIGHTSABER: /\b(?:wielding|wield|wields|holding|hold|armed with|using|use|uses|with|requires?|requiring|must (?:be )?(?:wielding|using|holding))\b[^.]{0,25}\ba lightsaber\b|\bwhile (?:wielding|using) (?:a |your )?lightsabers?\b/i,
  DIRECTLY_MODIFIES_LIGHTSABER_ATTACKS_DAMAGE_DEFENSE_OR_USE: /\blightsabers?\b[^.]{0,50}(?:\+\d|-\d|\b(?:attack|damage|bonus|penalty|defense|deflect|block|ignite|damage reduction)\b)|(?:\+\d|\b(?:bonus|penalty|extra)\b)[^.]{0,40}\blightsabers?\b/i,
  APPLIES_TO_A_LIGHTSABER_SPECIFIC_POWER_OR_FORM: /\blightsaber (?:form|forms|combat|technique|power|crystal)\b|\bform\b[^.]{0,30}\blightsaber\b/i,
  LIGHTSABER_APPEARS_ONLY_AS_AN_EXAMPLE: /\b(?:such as|for example|e\.g\.|including)\b[^.]{0,60}\blightsabers?\b/i,
  LIGHTSABER_APPEARS_ONLY_AS_PREREQUISITE_WORDING: /\b(?:prerequisite|proficien\w+|trained|Weapon Proficiency)\b[^.]{0,40}\blightsabers?\b/i,
  LIGHTSABER_IS_ONE_POSSIBLE_GENERIC_WEAPON_SELECTION: /\b(?:choose|select|any|one of|each)\b[^.]{0,60}\b(?:weapon group|weapons?|simple weapons?|advanced melee)\b[^.]{0,80}\blightsabers?\b/i,
  MERELY_REFERENCES_INTERACTION_WITH_LIGHTSABERS: /\blightsabers?\b/i
};
const PST = {
  EXPLICITLY_REQUIRES_OR_USES_A_PISTOL: /\b(?:with|wield|wielding|using|use|uses|requires?|holding)\b[^.]{0,20}\bpistols?\b|\bpistol attack\b/i,
  MODIFIES_PISTOL_ATTACKS_OR_USE: /\bpistols?\b[^.]{0,50}(?:\+\d|-\d|\b(?:attack|damage|bonus|penalty|range|reload|fire|firing)\b)|(?:\+\d|\b(?:bonus|penalty|extra)\b)[^.]{0,40}\bpistols?\b/i,
  APPLIES_TO_A_PISTOL_SPECIFIC_COMBAT_MODE: /\b(?:pistol|gunslinger) (?:style|combat|mode|technique|stance)\b|\bpistol-?fighting\b/i,
  PISTOL_APPEARS_ONLY_AS_AN_EXAMPLE: /\b(?:such as|for example|e\.g\.|including)\b[^.]{0,60}\bpistols?\b/i,
  PISTOL_IS_ONE_GENERIC_SELECTABLE_WEAPON_GROUP: /\b(?:choose|select|any|one of|each)\b[^.]{0,80}\bpistols?\b/i
};
const UNA = {
  DIRECTLY_REQUIRES_AN_UNARMED_ATTACK: /\b(?:make|makes|made|making|requires?|requiring|must (?:make|use)|only (?:when|while)|while)\b[^.]{0,30}\bunarmed\b/i,
  MODIFIES_UNARMED_ATTACKS_OR_DAMAGE: /\bunarmed (?:attacks?|damage|strikes?)\b[^.]{0,50}(?:\+\d|-\d|\b(?:bonus|penalty|instead|extra|additional|increase|die|dice)\b)|(?:\+\d|\b(?:bonus|penalty|extra|additional|increase)\b)[^.]{0,40}\bunarmed\b/i,
  DIRECTLY_MODIFIES_UNARMED_COMBAT: /\bunarmed (?:combat|fighting|style)\b|\bunarmed (?:attacks?|strikes?) (?:can|may|are|is|do|does|deal|count)\b/i,
  UNARMED_STRIKE_IS_ONE_SELECTABLE_WEAPON_OR_GROUP_OPTION: /\b(?:choose|select|any|one of|each)\b[^.]{0,80}\bunarmed\b/i,
  UNARMED_APPEARS_ONLY_AS_PREREQUISITE_OR_REFERENCE: /\b(?:prerequisite|proficien\w+|trained|armed or unarmed|unarmed or armed)\b[^.]{0,40}\bunarmed\b/i
};
const TABLE = { 'O.melee': [MEL, 'MELEE_WORDING_NO_STRUCTURE_MATCHED'], 'O.ranged': [RNG, 'RANGED_WORDING_NO_STRUCTURE_MATCHED'], 'O.lightsaber': [LSB, 'LIGHTSABER_WORDING_NO_STRUCTURE_MATCHED'], 'O.pistol': [PST, 'PISTOL_WORDING_NO_STRUCTURE_MATCHED'], 'O.unarmed': [UNA, 'UNARMED_WORDING_NO_STRUCTURE_MATCHED'] };
const WORD = { 'O.melee': 'melee', 'O.ranged': 'ranged', 'O.lightsaber': 'lightsabers?', 'O.pistol': 'pistols?', 'O.unarmed': 'unarmed' };
// Structural scope evidence per clause. OPEN_GENERIC_SCOPE: the named scope is one possible member/example of a broad generic choice.
// CLOSED_SCOPE: the clause directly and deliberately applies to that specific scope. Otherwise not determinable from wording. Evidence only.
const NON_DIRECT = /EXAMPLE|PREREQUISITE|REFERENCE|MERELY|NO_STRUCTURE|ONE_POSSIBLE|ONE_GENERIC|ONE_SELECTABLE|OPEN_MELEE|CONCERNS_A_/;
export function scopeOf(sentence, detectorId, labels) {
  const w = WORD[detectorId];
  const open = /\b(?:melee or ranged|ranged or melee|melee and ranged|ranged and melee)\b/i.test(sentence)
    || /\b(?:choose|select|any|one of|each of|every)\b[^.]{0,100}\b(?:weapon groups?|weapon proficienc\w+|weapons?|exotic weapons?|simple weapons?|advanced melee weapons?)\b/i.test(sentence)
    || new RegExp(`\\b(?:including|such as|for example|e\\.g\\.)\\b[^.]{0,80}\\b${w}\\b`, 'i').test(sentence)
    || labels.some(l => /ONE_POSSIBLE|ONE_GENERIC|ONE_SELECTABLE|OPEN_MELEE|EXAMPLE/.test(l));
  if (open) return 'OPEN_GENERIC_SCOPE';
  if (labels.some(l => !NON_DIRECT.test(l))) return 'CLOSED_SCOPE';
  return 'SCOPE_NOT_DETERMINABLE_FROM_WORDING';
}
export const LABELS = [...new Set(Object.values(TABLE).flatMap(([t, f]) => [...Object.keys(t), f]))];
export function classifyClause(sentence, detectorId) {
  const [table, fallback] = TABLE[detectorId]; const out = [];
  for (const [k, re] of Object.entries(table)) if (re.test(sentence)) out.push(k);
  if (out.length > 1) { const k = out.indexOf('MERELY_REFERENCES_INTERACTION_WITH_LIGHTSABERS'); if (k >= 0) out.splice(k, 1); }
  return out.length ? out : [fallback];
}
const clausesFor = (text, re, detectorId) => {
  const out = [];
  for (const s of splitSentences(text)) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    const phrases = [...s.matchAll(g)].map(m => m[0]);
    if (phrases.length) { const structuralLabels = classifyClause(s, detectorId); out.push({ sentence: s, matchedPhrases: phrases, structuralLabels, scopeEvidence: scopeOf(s, detectorId, structuralLabels) }); }
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
  // Open findings, plus findings that later receive a 3B.2D owner decision (keeps this historical packet stable; no decision data is written).
  const pool = [...discovery.ownerReviewItems, ...(discovery.ownerDecidedItems || []).filter(i => ['3B.2D', '3B.BULK'].includes(i.ownerDecision?.batch))];
  const inScope = pool.filter(i => SCOPE.includes(i.mechanic) || bundleScope(i));
  const precedents = discovery.precedentRules;
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
      ...overlay.decisions.filter(x => x.domain === i.domain && x.canonicalId === i.canonicalId && x.batch !== '3B.2D' && x.batch !== '3B.BULK').map(x => ({ source: `Pass 3B ${x.batch} owner decision`, comparedTag: x.tag, ruling: x.ownerAction, policy: x.ownerPolicyApplied }))
    ];
    return {
      family: d.family, familyName: 'Weapon / combat mode', detectorId, reportedViaBundle: via ? via.bundle : null, comparedTag: i.comparedTag, detectorConfidence: d.confidence,
      domain: i.domain, canonicalId: i.canonicalId, name: i.name, source: i.source, page: i.page, evidenceTier: rec.evidenceTier, comparedTagCurrentlyPresent: rec.tags.includes(i.comparedTag), currentTags: [...rec.tags],
      canonicalMechanicText: rec.evidence, clauses, distinctClauseCount: clauses.length,
      entryScopeSummary: { CLOSED_SCOPE: clauses.filter(c => c.scopeEvidence === 'CLOSED_SCOPE').length, OPEN_GENERIC_SCOPE: clauses.filter(c => c.scopeEvidence === 'OPEN_GENERIC_SCOPE').length, SCOPE_NOT_DETERMINABLE_FROM_WORDING: clauses.filter(c => c.scopeEvidence === 'SCOPE_NOT_DETERMINABLE_FROM_WORDING').length },
      impliedRequirementsIfOwnerLaterAuthorizesTag: REQUIRED_IMPLICATIONS.filter(([a]) => a === i.comparedTag).map(([a, b]) => ({ rule: `${a} -> ${b}`, requiredTag: b, requiredTagCurrentlyPresent: rec.tags.includes(b) })),
      oppositeDomainComparators: comps.map(({ r, cl }) => ({ domain: r.domain, canonicalId: r.canonicalId, name: r.name, source: r.source, page: r.page, evidenceTier: r.evidenceTier, tags: [...r.tags], relevantClauses: cl, canonicalMechanicText: r.evidence })),
      comparatorSelectionRule: 'opposite domain, matches the same detector, carries the compared tag; ordered by number of shared structural labels, then canonical ID; first two',
      applicablePriorOwnerPolicies: [generalPrecedent].filter(Boolean),
      priorOwnerRulingsOnThisRecord: priorOnRecord, discoveryReference: `${i.domain}:${i.canonicalId}|${i.comparedTag}|${i.mechanic}`
    };
  }).sort((a, b) => SCOPE.indexOf(a.detectorId) - SCOPE.indexOf(b.detectorId) || cmp(a.domain, b.domain) || cmp(a.canonicalId, b.canonicalId));
  const countBy = (k) => entries.reduce((m, e) => (m[e[k]] = (m[e[k]] || 0) + 1, m), {});
  return {
    schemaVersion: '1.0', kind: 'TALENT_FEAT_PASS3B2D_DAMAGE_CRITICAL_OWNER_PACKET', status: 'EVIDENCE_PACKET_ONLY_NO_RECOMMENDATIONS',
    note: 'Facts only. Structural labels describe wording and are not semantic rulings. Presence of a record here is not a statement that it should change. Every decision is the owner\'s.',
    source: { discoveryReport: REPORT_JSON, baseline: BASELINE3B_PATH, ownerOverlay: OWNER_OVERLAY_PATH }, scope: SCOPE, notIncluded: OUT_OF_SCOPE_NOTED, structuralLabelVocabulary: LABELS,
    totals: { entries: entries.length, uniqueRecords: new Set(entries.map(e => `${e.domain}:${e.canonicalId}`)).size, byFamily: { O: entries.filter(e => e.family === 'O').length }, byDetector: countBy('detectorId'), byDomain: countBy('domain'), byComparedTag: countBy('comparedTag'), recordsWithMultipleDistinctClauses: entries.filter(e => e.distinctClauseCount > 1).length,
      entriesWithAClosedScopeClause: entries.filter(e => e.entryScopeSummary.CLOSED_SCOPE > 0).length, entriesWithAnOpenGenericScopeClause: entries.filter(e => e.entryScopeSummary.OPEN_GENERIC_SCOPE > 0).length, entriesWithOnlyNotDeterminableClauses: entries.filter(e => e.entryScopeSummary.CLOSED_SCOPE + e.entryScopeSummary.OPEN_GENERIC_SCOPE === 0).length,
      clauseScopeTally: entries.flatMap(e => e.clauses).reduce((m, c) => (m[c.scopeEvidence] = (m[c.scopeEvidence] || 0) + 1, m), {}) },
    entries
  };
}

const L = (t) => `\`${t}\``;
function renderMd(p) {
  const T = p.totals;
  const out = ['# Pass 3B.2D — Weapon-Scope Semantics: Owner Evidence Packet', '',
    'Evidence extraction only. No recommendation, proposed change, semantic conclusion or disposition is made. Structural labels describe wording only. Every decision belongs to the owner.', '',
    '## Totals', '', `- Entries (record × detector): **${T.entries}** (O ${T.byFamily.O}); unique records: **${T.uniqueRecords}**; records with more than one distinct matching clause: ${T.recordsWithMultipleDistinctClauses}`,
    `- Scope evidence (structural only): entries with a CLOSED_SCOPE clause ${T.entriesWithAClosedScopeClause}; with an OPEN_GENERIC_SCOPE clause ${T.entriesWithAnOpenGenericScopeClause}; only not-determinable ${T.entriesWithOnlyNotDeterminableClauses}; clause tally ${JSON.stringify(T.clauseScopeTally)}`,
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
      e.clauses.forEach((c, k) => out.push(`${k + 1}. Matched: ${c.matchedPhrases.map(m => `"${m}"`).join(', ')} — structural labels: ${c.structuralLabels.join(', ')}; scope evidence: ${c.scopeEvidence}`, `   > ${c.sentence}`));
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
  if (fs.readFileSync(path.join(ROOT, REPORT_JSON), 'utf8') !== discovery.json) throw new Error('PASS3B.2D PACKET FAILED: committed discovery report differs from a fresh run');
  const packet = buildPacket(discovery.rep, readJson(BASELINE3B_PATH), readJson(OWNER_OVERLAY_PATH));
  return { packet, json: JSON.stringify(packet, null, 2) + '\n', md: renderMd(packet) };
}
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const out = buildOutputs();
  if (process.argv.includes('--check')) {
    if (fs.readFileSync(path.join(ROOT, PACKET_JSON), 'utf8') !== out.json || fs.readFileSync(path.join(ROOT, PACKET_MD), 'utf8') !== out.md) { console.error('Committed Pass 3B.2D packet differs from a fresh run'); process.exit(1); }
    console.log('PASS 3B.2D PACKET MATCHES A FRESH RUN');
  } else {
    fs.writeFileSync(path.join(ROOT, PACKET_JSON), out.json); fs.writeFileSync(path.join(ROOT, PACKET_MD), out.md);
    const T = out.packet.totals;
    console.log(`PASS 3B.2D PACKET: ${T.entries} entries / ${T.uniqueRecords} unique records; by detector ${JSON.stringify(T.byDetector)}; by domain ${JSON.stringify(T.byDomain)}`);
  }
}
