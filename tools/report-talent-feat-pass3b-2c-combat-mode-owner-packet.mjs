#!/usr/bin/env node
// Pass 3B.2C owner packet: EVIDENCE EXTRACTION ONLY for combat-mode primitives: full_attack, dual_wield and stun record-level findings.
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

export const PACKET_JSON = 'data/audits/talent-feat-pass3b-2c-combat-mode-owner-packet.json';
export const PACKET_MD = 'docs/audits/talent-feat-pass3b-2c-combat-mode-owner-packet.md';
export const SCOPE = ['O.full_attack', 'O.dual_wield', 'O.stun'];
export const OUT_OF_SCOPE_NOTED = ['O.melee, O.ranged, O.lightsaber, O.pistol, O.unarmed (weapon-scope batch)', 'O.heavy_weapon and O.exotic_weapon tag-convention questions (not expanded)', 'findings already closed by a prior owner ruling or owner decision'];
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const splitSentences = (text) => String(text).replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+(?=[A-Z("“])/).filter(Boolean);

// ---- Structural clause labels (wording only; not semantic rulings) ----
const FA = {
  DIRECTLY_PERFORMS_A_FULL_ATTACK: /\b(?:make|makes|making|take|takes|use|uses|perform|performs|during|as part of)\s+(?:a |an |your |the )?full attack\b|\bfull attack\b[^.]{0,30}\b(?:you|can|may|when)\b/i,
  MODIFIES_FULL_ATTACK_PENALTIES: /\bfull attack\b[^.]{0,60}\b(?:penalty|penalties|-\d|reduce|reduces|reduced|ignore|ignores)\b|\b(?:penalt\w+|-\d)[^.]{0,40}\bfull attack\b/i,
  CHANGES_THE_NUMBER_OF_ATTACKS_IN_A_FULL_ATTACK: /\bfull attack\b[^.]{0,60}\b(?:additional|extra|second|third|number of|more|another|each)\b[^.]{0,20}attacks?|\b(?:additional|extra|one more|another) attacks?\b[^.]{0,40}\bfull attack\b/i,
  SUBSTITUTES_ANOTHER_ACTION_FOR_A_FULL_ATTACK: /\binstead of (?:a |making a |taking a )?full attack\b|\bin place of (?:a )?full attack\b|\bas a (?:standard|swift|move) action\b[^.]{0,40}\bfull attack\b|\bfull attack\b[^.]{0,40}\b(?:as a|using a) (?:standard|swift|move) action\b/i,
  MERELY_REFERENCES_A_NORMAL_FULL_ATTACK: /\bfull attack\b/i
};
const DW = {
  DIRECTLY_USES_TWO_WEAPONS: /\b(?:two|both|dual|a second|second) (?:weapons?|hands?)\b|\bwield(?:s|ing)? two\b|\bdual[- ]wield/i,
  MODIFIES_TWO_WEAPON_ATTACKS_OR_PENALTIES: /\btwo[- ]weapon\b[^.]{0,50}\b(?:penalty|penalties|attack|-\d|reduce)|\b(?:penalty|penalties|-\d)\b[^.]{0,50}\btwo weapons?\b/i,
  REQUIRES_ONE_WEAPON_IN_EACH_HAND: /\b(?:one|a) (?:\w+ )?(?:weapon|lightsaber|blade)\b[^.]{0,30}\b(?:in each|in both|in either) hand\b|\beach hand\b|\bboth hands\b|\boff[- ]hand\b|\bsecond hand\b/i,
  PRODUCES_MULTIPLE_ATTACKS_WITHOUT_TWO_WEAPON_MECHANICS: /\b(?:two|multiple|additional|extra|second) attacks?\b/i
};
const ST = {
  APPLIES_A_STUNNED_OR_STUNNING_EFFECT: /\b(?:is|are|becomes?|becoming|be|remain|remains|left|leaves?|renders?|makes?|causes?|inflicts?|applies?)\b[^.]{0,30}\bstunned\b|\bstunning (?:attack|effect|blow|strike)\b|\bstuns? (?:the |that |a |an |your |one )?(?:target|opponent|enemy|creature|droid)/i,
  MODIFIES_STUN_DAMAGE_OR_STUN_MODE: /\bstun (?:damage|setting|mode|weapon|baton)\b[^.]{0,40}\b(?:bonus|\+\d|-\d|instead|reduce|increase|extra|additional)\b|\b(?:\+\d|bonus|extra|additional|reduce|increase)\b[^.]{0,40}\bstun (?:damage|setting|mode)\b|\bset (?:to|on) stun\b|\bstun setting\b/i,
  RESISTS_OR_REMOVES_A_STUN_EFFECT: /\b(?:immune|immunity|resist(?:s|ance)?|ignores?|removes?|ends?|recovers?|cures?|negates?)\b[^.]{0,40}\bstun(?:ned|ning)?\b|\bstun(?:ned)?\b[^.]{0,40}\b(?:immune|immunity|resist|removed|ends|recovers)\b/i,
  REFERENCES_A_STUN_WEAPON_OR_EFFECT_ONLY_AS_AN_EXCEPTION: /\b(?:except|unless|other than|not (?:including|affected)|excluding|regardless of|does(?:n't| not) (?:apply|affect|work))\b[^.]{0,50}\bstun\w*\b|\bstun\w*\b[^.]{0,40}\b(?:excepted|does not apply|doesn't apply|not affected)\b/i
};
const TABLE = { 'O.full_attack': [FA, 'FULL_ATTACK_WORDING_NO_STRUCTURE_MATCHED'], 'O.dual_wield': [DW, 'DUAL_WIELD_WORDING_NO_STRUCTURE_MATCHED'], 'O.stun': [ST, 'STUN_WORDING_NO_OTHER_STRUCTURE_MATCHED'] };
export const LABELS = [...new Set(Object.values(TABLE).flatMap(([t, f]) => [...Object.keys(t), f]))];
export function classifyClause(sentence, detectorId) {
  const [table, fallback] = TABLE[detectorId]; const out = [];
  for (const [k, re] of Object.entries(table)) if (re.test(sentence)) out.push(k);
  const drop = (l) => { const k = out.indexOf(l); if (k >= 0) out.splice(k, 1); };
  if (out.length > 1) { drop('MERELY_REFERENCES_A_NORMAL_FULL_ATTACK'); if (out.some(l => l !== 'PRODUCES_MULTIPLE_ATTACKS_WITHOUT_TWO_WEAPON_MECHANICS')) drop('PRODUCES_MULTIPLE_ATTACKS_WITHOUT_TWO_WEAPON_MECHANICS'); }
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
  // Open findings, plus findings that later receive a 3B.2C owner decision (keeps this historical packet stable; no decision data is written).
  const pool = [...discovery.ownerReviewItems, ...(discovery.ownerDecidedItems || []).filter(i => i.ownerDecision?.batch === '3B.2C')];
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
      ...overlay.decisions.filter(x => x.domain === i.domain && x.canonicalId === i.canonicalId && x.batch !== '3B.2C').map(x => ({ source: `Pass 3B ${x.batch} owner decision`, comparedTag: x.tag, ruling: x.ownerAction, policy: x.ownerPolicyApplied }))
    ];
    return {
      family: d.family, familyName: 'Weapon / combat mode', detectorId, reportedViaBundle: via ? via.bundle : null, comparedTag: i.comparedTag, detectorConfidence: d.confidence,
      domain: i.domain, canonicalId: i.canonicalId, name: i.name, source: i.source, page: i.page, evidenceTier: rec.evidenceTier, comparedTagCurrentlyPresent: rec.tags.includes(i.comparedTag), currentTags: [...rec.tags],
      canonicalMechanicText: rec.evidence, clauses, distinctClauseCount: clauses.length,
      impliedRequirementsIfOwnerLaterAuthorizesTag: REQUIRED_IMPLICATIONS.filter(([a]) => a === i.comparedTag).map(([a, b]) => ({ rule: `${a} -> ${b}`, requiredTag: b, requiredTagCurrentlyPresent: rec.tags.includes(b) })),
      oppositeDomainComparators: comps.map(({ r, cl }) => ({ domain: r.domain, canonicalId: r.canonicalId, name: r.name, source: r.source, page: r.page, evidenceTier: r.evidenceTier, tags: [...r.tags], relevantClauses: cl, canonicalMechanicText: r.evidence })),
      comparatorSelectionRule: 'opposite domain, matches the same detector, carries the compared tag; ordered by number of shared structural labels, then canonical ID; first two',
      applicablePriorOwnerPolicies: [generalPrecedent].filter(Boolean),
      priorOwnerRulingsOnThisRecord: priorOnRecord, discoveryReference: `${i.domain}:${i.canonicalId}|${i.comparedTag}|${i.mechanic}`
    };
  }).sort((a, b) => SCOPE.indexOf(a.detectorId) - SCOPE.indexOf(b.detectorId) || cmp(a.domain, b.domain) || cmp(a.canonicalId, b.canonicalId));
  const countBy = (k) => entries.reduce((m, e) => (m[e[k]] = (m[e[k]] || 0) + 1, m), {});
  return {
    schemaVersion: '1.0', kind: 'TALENT_FEAT_PASS3B2C_DAMAGE_CRITICAL_OWNER_PACKET', status: 'EVIDENCE_PACKET_ONLY_NO_RECOMMENDATIONS',
    note: 'Facts only. Structural labels describe wording and are not semantic rulings. Presence of a record here is not a statement that it should change. Every decision is the owner\'s.',
    source: { discoveryReport: REPORT_JSON, baseline: BASELINE3B_PATH, ownerOverlay: OWNER_OVERLAY_PATH }, scope: SCOPE, notIncluded: OUT_OF_SCOPE_NOTED, structuralLabelVocabulary: LABELS,
    totals: { entries: entries.length, uniqueRecords: new Set(entries.map(e => `${e.domain}:${e.canonicalId}`)).size, byFamily: { O: entries.filter(e => e.family === 'O').length }, byDetector: countBy('detectorId'), byDomain: countBy('domain'), byComparedTag: countBy('comparedTag'), recordsWithMultipleDistinctClauses: entries.filter(e => e.distinctClauseCount > 1).length },
    entries
  };
}

const L = (t) => `\`${t}\``;
function renderMd(p) {
  const T = p.totals;
  const out = ['# Pass 3B.2C — Combat Mode Primitives: Owner Evidence Packet', '',
    'Evidence extraction only. No recommendation, proposed change, semantic conclusion or disposition is made. Structural labels describe wording only. Every decision belongs to the owner.', '',
    '## Totals', '', `- Entries (record × detector): **${T.entries}** (O ${T.byFamily.O}); unique records: **${T.uniqueRecords}**; records with more than one distinct matching clause: ${T.recordsWithMultipleDistinctClauses}`,
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
  if (fs.readFileSync(path.join(ROOT, REPORT_JSON), 'utf8') !== discovery.json) throw new Error('PASS3B.2C PACKET FAILED: committed discovery report differs from a fresh run');
  const packet = buildPacket(discovery.rep, readJson(BASELINE3B_PATH), readJson(OWNER_OVERLAY_PATH));
  return { packet, json: JSON.stringify(packet, null, 2) + '\n', md: renderMd(packet) };
}
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const out = buildOutputs();
  if (process.argv.includes('--check')) {
    if (fs.readFileSync(path.join(ROOT, PACKET_JSON), 'utf8') !== out.json || fs.readFileSync(path.join(ROOT, PACKET_MD), 'utf8') !== out.md) { console.error('Committed Pass 3B.2C packet differs from a fresh run'); process.exit(1); }
    console.log('PASS 3B.2C PACKET MATCHES A FRESH RUN');
  } else {
    fs.writeFileSync(path.join(ROOT, PACKET_JSON), out.json); fs.writeFileSync(path.join(ROOT, PACKET_MD), out.md);
    const T = out.packet.totals;
    console.log(`PASS 3B.2C PACKET: ${T.entries} entries / ${T.uniqueRecords} unique records; by detector ${JSON.stringify(T.byDetector)}; by domain ${JSON.stringify(T.byDomain)}`);
  }
}
